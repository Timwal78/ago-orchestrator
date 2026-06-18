// ============================================================
// A.G.O. — Syndicate Router | src/webhooks/orchestrator.js
// Webhook distribution engine with retry + backoff
// Pushes forged assets to Discord + Partner APIs
// ============================================================

import Redis from "ioredis";
import { logger } from "../../config/logger.js";
import { pushToDiscord } from "../discord/pusher.js";
import { pushToPartners } from "../partners/pusher.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const INPUT_QUEUE = process.env.INPUT_QUEUE || "forge:assets";
const RETRY_MAX = parseInt(process.env.RETRY_MAX || "3");
const RETRY_BACKOFF_MS = parseInt(process.env.RETRY_BACKOFF_MS || "2000");

const redis = new Redis(REDIS_URL);

// Parse webhook URLs and keys from env
const DISCORD_WEBHOOKS = (process.env.DISCORD_WEBHOOK_URLS || "").split(",").filter(Boolean);
const PARTNER_URLS = (process.env.PARTNER_API_URLS || "").split(",").filter(Boolean);
const PARTNER_KEYS = (process.env.PARTNER_API_KEYS || "").split(",").filter(Boolean);

/**
 * Main distribution loop
 * Dequeues assets and fans out to all distribution targets
 */
export async function startSyndicateRouter() {
  logger.info(`[SYNDICATE] Router started`);
  logger.info(`[SYNDICATE] Discord webhooks: ${DISCORD_WEBHOOKS.length}`);
  logger.info(`[SYNDICATE] Partner APIs: ${PARTNER_URLS.length}`);

  while (true) {
    try {
      const result = await redis.blpop(INPUT_QUEUE, 0);
      if (!result) continue;

      const [, raw] = result;
      const asset = JSON.parse(raw);

      logger.info(`[SYNDICATE] Distributing asset: ${asset.id} | type: ${asset.type}`);

      // Fan out to all channels in parallel
      await Promise.allSettled([
        ...DISCORD_WEBHOOKS.map((url) =>
          withRetry(() => pushToDiscord(url, asset), RETRY_MAX, RETRY_BACKOFF_MS)
        ),
        ...PARTNER_URLS.map((url, i) =>
          withRetry(
            () => pushToPartners(url, PARTNER_KEYS[i] || "", asset),
            RETRY_MAX,
            RETRY_BACKOFF_MS
          )
        ),
      ]);

      logger.info(`[SYNDICATE] Asset ${asset.id} distributed`);
    } catch (err) {
      logger.error(`[SYNDICATE] Router error: ${err.message}`);
      await sleep(5000);
    }
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, maxRetries, baseDelayMs) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error(`[SYNDICATE] Max retries reached: ${err.message}`);
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`[SYNDICATE] Retry ${attempt}/${maxRetries} in ${delay}ms: ${err.message}`);
      await sleep(delay);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

startSyndicateRouter();
