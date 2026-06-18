// ============================================================
// A.G.O. — Recon Swarm | internal/models/targets.go
// SML-specific signal targets and domain models
// ============================================================

package models

// MarketGap represents a validated gap payload pushed to Redis
type MarketGap struct {
	ID          string    `json:"id"`
	Source      string    `json:"source"`       // serp | reddit | discord
	Query       string    `json:"query"`        // original query that triggered
	Intent      string    `json:"intent"`       // informational | transactional | navigational
	Gap         string    `json:"gap"`          // inferred content/product gap
	Keywords    []string  `json:"keywords"`     // extracted high-intent keywords
	URL         string    `json:"url"`          // source URL if available
	Subreddit   string    `json:"subreddit,omitempty"`
	DiscordSrv  string    `json:"discord_server,omitempty"`
	Score       float64   `json:"score"`        // relevance score 0-1
	Timestamp   string    `json:"timestamp"`
}

// RawSignal is the unfiltered output from a scraper worker
type RawSignal struct {
	Source    string
	Content   string
	URL       string
	Context   string
	Subreddit string
	DiscordSrv string
}

// SMLTargetQueries are high-intent SERP queries where SML products are the answer
var SMLTargetQueries = []string{
	"x402 payment rails AI agents",
	"HTTP 402 micropayments autonomous agents",
	"XRPL RLUSD payment gateway API",
	"Xahau hooks payment settlement",
	"MCP server payment gating",
	"ghost layer ephemeral AI agent",
	"agent native blockchain payments",
	"USDC Base micropayments API agents",
	"Pine Script v6 squeeze indicator",
	"quantitative trading signal API",
	"FTD cycle analysis tool",
	"institutional Pine Script indicators",
	"autonomous AI agent marketplace",
	"RAG orchestration XRPL",
	"x402 protocol implementation Python",
	"HTTP 402 paywall middleware FastAPI",
	"NEXUS 402 agent marketplace",
	"CRAWLTOLL x402 signal feed",
	"SqueezeOS trading signals",
	"MCP paywall npm package",
}

// SMLTargetSubreddits are subreddits with high-intent queries
var SMLTargetSubreddits = []string{
	"algotrading",
	"xrpl",
	"artificial",
	"MachineLearning",
	"LocalLLaMA",
	"ChatGPT",
	"GPT4",
	"webdev",
	"node",
	"golang",
	"programming",
	"CryptoCurrency",
	"defi",
	"RippleSpark",
	"xrp",
}

// SMLDiscordChannels are Discord channel IDs to monitor
// (populated from env at runtime for security)
var SMLDiscordChannels = []string{
	// Injected at runtime via DISCORD_CHANNEL_IDS env
}

// SMLKeywords trigger a positive relevance match
var SMLKeywords = []string{
	"x402", "http 402", "402 payment", "micropayment",
	"xrpl", "xah", "xahau", "rlusd",
	"ai agent", "autonomous agent", "agent native",
	"mcp server", "mcp paywall",
	"pine script", "squeeze", "ftd cycle",
	"ghost layer", "ephemeral agent",
	"crawltoll", "squeezeos", "nexus-402",
	"signal api", "trading signal",
	"blockchain payment", "usdc base",
}

// SMLCompetitorNames are flagged for gap analysis
var SMLCompetitorNames = []string{
	"stripe", "paymanai", "nevermined",
	"coinbase commerce", "tradingview premium",
	"quantconnect", "alpaca markets",
	"helius", "moralis",
}
