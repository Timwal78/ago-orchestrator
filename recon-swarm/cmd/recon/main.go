// ============================================================
// A.G.O. — Recon Swarm | cmd/recon/main.go
// Concurrent goroutine scraper engine
// ScriptMaster Labs — Full Shield Architecture
// ============================================================

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/Timwal78/ago/recon-swarm/internal/filter"
	"github.com/Timwal78/ago/recon-swarm/internal/models"
	"github.com/Timwal78/ago/recon-swarm/internal/scraper"
	"github.com/go-redis/redis/v8"
)

// Config holds all runtime configuration loaded from env
type Config struct {
	SerpAPIKey          string
	RedditClientID      string
	RedditClientSecret  string
	DiscordBotToken     string
	RedisURL            string
	ReconIntervalSecs   int
	WorkerPoolSize      int
	OutputQueue         string
}

// Orchestrator is the top-level recon controller
type Orchestrator struct {
	cfg    Config
	redis  *redis.Client
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

func main() {
	cfg := loadConfig()

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisURL})
	ctx, cancel := context.WithCancel(context.Background())

	orch := &Orchestrator{
		cfg:    cfg,
		redis:  rdb,
		ctx:    ctx,
		cancel: cancel,
	}

	// Health check endpoint for Docker/Render
	go func() {
		http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok","service":"recon-swarm"}`))
		})
		log.Println("[RECON] Health endpoint live on :8081")
		http.ListenAndServe(":8081", nil)
	}()

	// Graceful shutdown on SIGTERM/SIGINT (Render sends SIGTERM)
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		<-sigCh
		log.Println("[RECON] Shutdown signal received — draining workers...")
		cancel()
	}()

	log.Printf("[RECON] Starting with %d workers, interval %ds", cfg.WorkerPoolSize, cfg.ReconIntervalSecs)
	orch.run()
}

// run executes the main recon loop on a ticker
func (o *Orchestrator) run() {
	ticker := time.NewTicker(time.Duration(o.cfg.ReconIntervalSecs) * time.Second)
	defer ticker.Stop()

	// Fire immediately on start
	o.executeReconCycle()

	for {
		select {
		case <-ticker.C:
			o.executeReconCycle()
		case <-o.ctx.Done():
			o.wg.Wait()
			log.Println("[RECON] Clean shutdown complete.")
			return
		}
	}
}

// executeReconCycle runs all scrapers concurrently via worker pool
func (o *Orchestrator) executeReconCycle() {
	log.Println("[RECON] Cycle start — dispatching scraper workers...")

	// Define all scraper targets
	targets := []scraper.Target{
		{Source: "serp", Queries: models.SMLTargetQueries},
		{Source: "reddit", Subreddits: models.SMLTargetSubreddits},
		{Source: "discord", ChannelIDs: models.SMLDiscordChannels},
	}

	// Semaphore channel limits concurrency to WorkerPoolSize
	sem := make(chan struct{}, o.cfg.WorkerPoolSize)
	resultsCh := make(chan models.RawSignal, 500)

	// Launch all scrapers concurrently
	for _, target := range targets {
		o.wg.Add(1)
		go func(t scraper.Target) {
			defer o.wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			results, err := scraper.Execute(o.ctx, t, o.cfg.SerpAPIKey, o.cfg.DiscordBotToken)
			if err != nil {
				log.Printf("[RECON] Scraper error (%s): %v", t.Source, err)
				return
			}
			for _, r := range results {
				resultsCh <- r
			}
		}(target)
	}

	// Close results channel when all goroutines finish
	go func() {
		o.wg.Wait()
		close(resultsCh)
	}()

	// Filter signals and push to Redis queue
	var pushed int
	for raw := range resultsCh {
		gap, ok := filter.Evaluate(raw, models.SMLKeywords, models.SMLCompetitorNames)
		if !ok {
			continue
		}

		payload, err := json.Marshal(gap)
		if err != nil {
			log.Printf("[RECON] Marshal error: %v", err)
			continue
		}

		if err := o.redis.RPush(o.ctx, o.cfg.OutputQueue, payload).Err(); err != nil {
			log.Printf("[RECON] Redis push error: %v", err)
			continue
		}
		pushed++
	}

	log.Printf("[RECON] Cycle complete — %d market gaps queued", pushed)
}

func loadConfig() Config {
	interval, _ := strconv.Atoi(getEnv("RECON_INTERVAL_SECONDS", "300"))
	poolSize, _ := strconv.Atoi(getEnv("WORKER_POOL_SIZE", "50"))
	return Config{
		SerpAPIKey:         requireEnv("SERP_API_KEY"),
		RedditClientID:     requireEnv("REDDIT_CLIENT_ID"),
		RedditClientSecret: requireEnv("REDDIT_CLIENT_SECRET"),
		DiscordBotToken:    requireEnv("DISCORD_BOT_TOKEN"),
		RedisURL:           getEnv("REDIS_URL", "localhost:6379"),
		ReconIntervalSecs:  interval,
		WorkerPoolSize:     poolSize,
		OutputQueue:        getEnv("OUTPUT_QUEUE", "recon:gaps"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("[RECON] Missing required env var: %s", key)
	}
	return v
}

// Suppress unused import warning
var _ = fmt.Sprintf
