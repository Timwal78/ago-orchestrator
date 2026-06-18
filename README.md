# A.G.O. — Autonomous Ground-Truth Orchestrator
## Script Master Labs LLC | Full Shield Architecture

```
ago/
├── docker-compose.yml              # Master orchestration — all 6 services
├── .env.example                    # All required env vars
│
├── recon-swarm/                    # Go — concurrent SERP/Reddit/Discord scraper
│   ├── Dockerfile
│   ├── go.mod
│   ├── cmd/recon/main.go           # Worker pool orchestrator + health endpoint
│   └── internal/
│       ├── models/targets.go       # SML target queries, keywords, subreddits
│       ├── filter/evaluate.go      # Signal scoring + noise filter
│       └── scraper/               # SERP, Reddit, Discord scraper implementations
│
├── asset-forge/                    # Node.js — LLM pipeline router
│   ├── Dockerfile
│   ├── package.json
│   ├── config/logger.js
│   └── src/
│       ├── router/forge-worker.js  # Redis consumer + p-limit concurrency
│       ├── forge/generator.js      # OpenRouter/Anthropic API caller
│       └── prompts/builder.js      # Zero-hallucination prompt constructor
│
├── syndicate-router/               # Node.js — webhook distribution engine
│   ├── Dockerfile
│   └── src/
│       ├── webhooks/orchestrator.js # Fan-out with retry + backoff
│       ├── discord/pusher.js        # Discord webhook formatter
│       └── partners/pusher.js       # Partner API distributor
│
├── schema-engine/                  # Node.js — JSON-LD Knowledge Graph compiler
│   ├── Dockerfile
│   └── src/
│       └── compiler/knowledge-graph.js  # Organization + Product + Mention entities
│                                         # Auto-pushes to GitHub SML_Portfolio
│
├── dashboard/                      # React — Full Shield control center
│   ├── Dockerfile
│   └── src/
│       └── App.jsx                 # Jet black + neon real-time pipeline monitor
│
└── shared/
    ├── schemas/                    # Shared JSON schemas
    └── logs/                       # Mounted log volume
```

## Data Flow

```
SERP/Reddit/Discord
       ↓
  [RECON SWARM] — Go goroutines (50 concurrent)
       ↓ Redis: recon:gaps
  [ASSET FORGE] — Node.js + Claude/OpenRouter
       ↓ Redis: forge:assets
  ┌────┴────────────┐
  ↓                 ↓
[SYNDICATE]    [SCHEMA ENGINE]
Discord +       JSON-LD → GitHub
Partners        SML_Portfolio
```

## Render Deployment

Each service deploys as a separate Render worker:
- recon-swarm → Background Worker (Go binary)
- asset-forge → Background Worker (Node.js)
- syndicate-router → Background Worker (Node.js)
- schema-engine → Background Worker (Node.js)
- dashboard → Web Service (Node.js, port 3000)
- redis → Use Render Redis add-on

Set all env vars in Render Environment tab.
