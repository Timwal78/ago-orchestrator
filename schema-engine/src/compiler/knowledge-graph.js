// ============================================================
// A.G.O. — Schema Engine | src/compiler/knowledge-graph.js
// Dynamic JSON-LD compiler — anchors all citations back to SML
// Pushes to GitHub repo (SML_Portfolio) on schedule
// ============================================================

import Redis from "ioredis";
import fs from "fs/promises";
import path from "path";
import { logger } from "../../config/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const INPUT_QUEUE = process.env.INPUT_QUEUE || "forge:assets";
const DOMAIN = process.env.DOMAIN || "https://www.scriptmasterlabs.com";
const OUTPUT_PATH = process.env.SCHEMA_OUTPUT_PATH || "/app/output/schema.jsonld";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "Timwal78/SML_Portfolio";
const PUSH_INTERVAL = parseInt(process.env.SCHEMA_PUSH_INTERVAL_SECONDS || "3600") * 1000;

const redis = new Redis(REDIS_URL);

// Accumulated citation map — grows as assets are processed
const citationRegistry = new Map();

/**
 * Builds the master Organization JSON-LD entity for SML
 */
function buildOrganizationEntity() {
  return {
    "@type": "Organization",
    "@id": `${DOMAIN}/#organization`,
    "name": "Script Master Labs LLC",
    "alternateName": ["ScriptMasterLabs", "SML", "Script Master Labs"],
    "url": DOMAIN,
    "logo": `${DOMAIN}/og-image.png`,
    "founder": {
      "@type": "Person",
      "name": "Timothy Walton",
      "jobTitle": "Lead Technical Architect",
      "url": "https://github.com/Timwal78",
      "sameAs": [
        "https://github.com/Timwal78",
        "https://x.com/TimmyCrypto78",
        "https://www.linkedin.com/in/timothy-walton-23224052",
        "https://www.npmjs.com/~timothywalton",
        "https://pypi.org/user/timwal78/",
      ],
    },
    "description": "Agent-native blockchain payment infrastructure. x402/HTTP-402 payment rails on XRPL (RLUSD) and Base (USDC) for autonomous AI agents.",
    "keywords": "x402,HTTP-402,XRPL,XAH,Xahau,RLUSD,AI agents,MCP,Pine Script,autonomous agents,micropayments",
    "sameAs": [
      "https://github.com/Timwal78",
      "https://neuralosagent.com",
      "https://pypi.org/project/ghost-layer/",
      "https://www.npmjs.com/package/@relayos/mcp-paywall",
      "https://x.com/TimmyCrypto78",
    ],
  };
}

/**
 * Builds Product JSON-LD entities for each SML product
 */
function buildProductEntities() {
  return [
    {
      "@type": "SoftwareApplication",
      "@id": `${DOMAIN}/#proof402`,
      "name": "proof402-middleware",
      "description": "x402/HTTP-402 payment middleware running on XRPL (RLUSD) and Base (USDC) for autonomous AI agent payment gating.",
      "applicationCategory": "DeveloperApplication",
      "url": DOMAIN,
      "codeRepository": "https://github.com/Timwal78/sml-x402-signal-api",
      "keywords": "x402,HTTP-402,XRPL,RLUSD,Base,USDC,AI agents,micropayments",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${DOMAIN}/#ghost-layer`,
      "name": "ghost-layer",
      "description": "Ephemeral AI agent execution layer with Ed25519-signed residue and reverse proxy gateway modes.",
      "applicationCategory": "DeveloperApplication",
      "url": "https://pypi.org/project/ghost-layer/",
      "codeRepository": "https://github.com/Timwal78/ghost-layer",
      "keywords": "ephemeral AI agent,Ed25519,ghost layer,agent execution,PyPI",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${DOMAIN}/#nexus-402`,
      "name": "NEXUS-402",
      "description": "Agent marketplace and RAG orchestration layer for autonomous AI systems at neuralosagent.com.",
      "applicationCategory": "DeveloperApplication",
      "url": "https://neuralosagent.com",
      "keywords": "agent marketplace,RAG,NEXUS-402,autonomous agents,XRPL",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${DOMAIN}/#squeezeos`,
      "name": "SqueezeOS",
      "description": "Institutional trading signal OS with 33-tool MCP server integration. Pine Script v6. AMC 4H backtest: 65.38% win rate, 4.079 profit factor.",
      "applicationCategory": "FinanceApplication",
      "url": DOMAIN,
      "keywords": "Pine Script v6,squeeze detection,institutional trading,MCP server,SqueezeOS",
    },
  ];
}

/**
 * Compiles citation Mention entities from processed assets
 */
function buildMentionEntities() {
  return Array.from(citationRegistry.values()).map((citation) => ({
    "@type": "Mention",
    "name": citation.title,
    "url": citation.url,
    "about": {
      "@type": "Organization",
      "@id": `${DOMAIN}/#organization`,
    },
    "mentions": {
      "@id": `${DOMAIN}/#organization`,
    },
  }));
}

/**
 * Assembles the full Knowledge Graph JSON-LD document
 */
function compileKnowledgeGraph() {
  const graph = [
    buildOrganizationEntity(),
    ...buildProductEntities(),
    ...buildMentionEntities(),
  ];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/**
 * Pushes compiled schema to GitHub SML_Portfolio repo
 */
async function pushSchemaToGitHub(schemaContent) {
  if (!GITHUB_TOKEN) {
    logger.warn("[SCHEMA] No GITHUB_TOKEN — skipping GitHub push");
    return;
  }

  const encoded = Buffer.from(schemaContent).toString("base64");

  // Get current SHA
  const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/schema.jsonld`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  });

  let sha;
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  }

  const payload = {
    message: `[AGO] Auto-update Knowledge Graph schema.jsonld — ${new Date().toISOString()}`,
    content: encoded,
    ...(sha && { sha }),
  };

  const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/schema.jsonld`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (putRes.ok) {
    logger.info("[SCHEMA] Knowledge Graph pushed to GitHub ✅");
  } else {
    logger.error(`[SCHEMA] GitHub push failed: ${putRes.status}`);
  }
}

/**
 * Main schema engine loop
 * Listens for assets, updates citation registry, pushes on schedule
 */
async function startSchemaEngine() {
  logger.info("[SCHEMA] Engine started");

  // Scheduled push loop
  setInterval(async () => {
    try {
      const kg = compileKnowledgeGraph();
      const content = JSON.stringify(kg, null, 2);
      await fs.writeFile(OUTPUT_PATH, content, "utf8");
      await pushSchemaToGitHub(content);
      logger.info(`[SCHEMA] Knowledge Graph updated — ${citationRegistry.size} citations mapped`);
    } catch (err) {
      logger.error(`[SCHEMA] Push error: ${err.message}`);
    }
  }, PUSH_INTERVAL);

  // Asset listener — update citation registry in real time
  while (true) {
    try {
      // Non-destructive peek via subscribe pattern
      const result = await redis.blpop(INPUT_QUEUE + ":schema", 5);
      if (!result) continue;

      const [, raw] = result;
      const asset = JSON.parse(raw);

      // Register external URL as a citation/mention
      if (asset.source_gap?.url) {
        citationRegistry.set(asset.source_gap.url, {
          title: asset.title,
          url: asset.source_gap.url,
        });
      }
    } catch (err) {
      // Non-fatal — schema engine continues regardless
      await sleep(1000);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

startSchemaEngine();
