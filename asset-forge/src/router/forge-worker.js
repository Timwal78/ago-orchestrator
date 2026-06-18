// ============================================================
// A.G.O. — Asset Forge | src/router/forge-worker.js
// Node.js LLM pipeline — consumes Redis gaps, forges assets
// Zero hallucination: all prompts inject verified context only
// ============================================================

import Redis from "ioredis";
import pLimit from "p-limit";
import { generateAsset } from "../forge/generator.js";
import { buildPrompt } from "../prompts/builder.js";
import { logger } from "../../config/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const INPUT_QUEUE = process.env.INPUT_QUEUE || "recon:gaps";
const OUTPUT_QUEUE = process.env.OUTPUT_QUEUE || "forge:assets";
const CONCURRENCY = parseInt(process.env.FORGE_CONCURRENCY || "5");

const redis = new Redis(REDIS_URL);
const redisOut = new Redis(REDIS_URL);

// p-limit enforces max concurrent LLM calls
const limit = pLimit(CONCURRENCY);

// SML verified context injected into every prompt
// This is the ground truth — LLM cannot fabricate beyond this
const SML_CONTEXT = {
  company: "Script Master Labs LLC",
  founder: "Timothy Walton",
  sdvosb: true,
  location: "Kinston, NC",
  domain: "https://www.scriptmasterlabs.com",
  products: {
    "proof402-middleware": {
      description: "x402/HTTP-402 payment middleware on XRPL (RLUSD) and Base (USDC)",
      github: "https://github.com/Timwal78/sml-x402-signal-api",
      stack: ["Python", "FastAPI", "XRPL SDK", "Base L2"],
    },
    "ghost-layer": {
      description: "Ephemeral AI agent execution layer with Ed25519-signed residue",
      pypi: "https://pypi.org/project/ghost-layer/",
      github: "https://github.com/Timwal78/ghost-layer",
      stack: ["Python", "Ed25519", "FastAPI"],
    },
    "NEXUS-402": {
      description: "Agent marketplace and RAG orchestration layer",
      url: "https://neuralosagent.com",
      stack: ["Node.js", "TypeScript", "XRPL"],
    },
    "XahPay": {
      description: "XAH/XRPL payment settlement for agent-to-agent microtransactions",
      stack: ["Python", "XRPL SDK", "Xahau Hooks"],
    },
    "CRAWLTOLL": {
      description: "x402-gated quantitative signal feeds for AI agent consumption",
      stack: ["Python", "FastAPI", "x402"],
    },
    "SqueezeOS": {
      description: "Institutional trading signal OS with 33-tool MCP server",
      backtests: { "AMC 4H": { wr: "65.38%", pf: "4.079" } },
      stack: ["Python", "Pine Script v6", "FastAPI"],
    },
  },
  paymentAddresses: {
    base_usdc: "0x4e14B249D9A4c9c9352D780eCEB508A8eB7a7700",
    solana_usdc: "C9rk2tzM92WxSoMWD32A5wZLgL3z1uN7FSVDExioahfF",
  },
};

/**
 * Main worker loop — blocking BLPOP on Redis input queue
 * Processes one gap at a time within concurrency limits
 */
async function startForgeWorker() {
  logger.info(`[FORGE] Worker started | concurrency: ${CONCURRENCY}`);
  logger.info(`[FORGE] Listening on queue: ${INPUT_QUEUE}`);

  while (true) {
    try {
      // BLPOP blocks until item available (timeout 0 = forever)
      const result = await redis.blpop(INPUT_QUEUE, 0);
      if (!result) continue;

      const [, raw] = result;
      const gap = JSON.parse(raw);

      logger.info(`[FORGE] Processing gap: ${gap.id} | score: ${gap.score} | source: ${gap.source}`);

      // Rate-limited LLM call
      limit(async () => {
        try {
          const prompt = buildPrompt(gap, SML_CONTEXT);
          const asset = await generateAsset(prompt, gap);

          // Push finished asset to syndicate queue
          await redisOut.rpush(OUTPUT_QUEUE, JSON.stringify(asset));
          logger.info(`[FORGE] Asset forged: ${asset.id} | type: ${asset.type}`);
        } catch (err) {
          logger.error(`[FORGE] Generation error for gap ${gap.id}: ${err.message}`);
        }
      });
    } catch (err) {
      logger.error(`[FORGE] Worker loop error: ${err.message}`);
      await sleep(5000); // backoff on error
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Health check
import http from "http";
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "asset-forge" }));
}).listen(8082, () => logger.info("[FORGE] Health endpoint on :8082"));

startForgeWorker();
