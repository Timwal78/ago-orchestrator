// ============================================================
// A.G.O. — Recon Swarm | internal/filter/evaluate.go
// Signal noise filter — scores and validates raw signals
// ============================================================

package filter

import (
	"crypto/md5"
	"fmt"
	"strings"
	"time"

	"github.com/Timwal78/ago/recon-swarm/internal/models"
)

const MinScore = 0.35 // minimum relevance threshold to pass filter

// Evaluate scores a RawSignal against SML keywords and competitors.
// Returns a MarketGap and true if signal clears the threshold.
func Evaluate(raw models.RawSignal, keywords []string, competitors []string) (models.MarketGap, bool) {
	content := strings.ToLower(raw.Content + " " + raw.Context)

	// --- Keyword scoring ---
	var matched []string
	score := 0.0
	for _, kw := range keywords {
		if strings.Contains(content, strings.ToLower(kw)) {
			matched = append(matched, kw)
			score += 0.1
		}
	}

	// Boost if competitor is mentioned (gap opportunity)
	for _, comp := range competitors {
		if strings.Contains(content, strings.ToLower(comp)) {
			score += 0.15
		}
	}

	// Cap at 1.0
	if score > 1.0 {
		score = 1.0
	}

	if score < MinScore || len(matched) == 0 {
		return models.MarketGap{}, false
	}

	// Infer intent from content signals
	intent := inferIntent(content)

	// Derive gap description from top matched keywords
	gap := fmt.Sprintf("Gap detected: no authoritative result for [%s] in %s context",
		strings.Join(matched[:min(3, len(matched))], ", "), raw.Source)

	// Stable deduplication ID
	id := fmt.Sprintf("%x", md5.Sum([]byte(raw.URL+raw.Content[:min(100, len(raw.Content))])))

	return models.MarketGap{
		ID:         id,
		Source:     raw.Source,
		Query:      raw.Content[:min(200, len(raw.Content))],
		Intent:     intent,
		Gap:        gap,
		Keywords:   matched,
		URL:        raw.URL,
		Subreddit:  raw.Subreddit,
		DiscordSrv: raw.DiscordSrv,
		Score:      score,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}, true
}

func inferIntent(content string) string {
	transactionalSignals := []string{"how to", "tutorial", "setup", "install", "integrate", "buy", "get", "use"}
	for _, s := range transactionalSignals {
		if strings.Contains(content, s) {
			return "transactional"
		}
	}
	infoSignals := []string{"what is", "explain", "difference", "vs", "compare", "overview"}
	for _, s := range infoSignals {
		if strings.Contains(content, s) {
			return "informational"
		}
	}
	return "navigational"
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
