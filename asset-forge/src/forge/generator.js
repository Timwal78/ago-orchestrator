// ============================================================
// A.G.O. — Asset Forge | src/forge/generator.js
// LLM API caller — OpenRouter with Claude fallback
// ============================================================

import crypto from "crypto";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4-6";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || "2000");

/**
 * Calls LLM API and returns a validated ForgedAsset
 * Falls back to Anthropic direct if OpenRouter fails
 */
export async function generateAsset(prompt, gap) {
  let raw;

  try {
    raw = await callOpenRouter(prompt);
  } catch (err) {
    console.warn(`[GENERATOR] OpenRouter failed, falling back to Anthropic: ${err.message}`);
    raw = await callAnthropic(prompt);
  }

  // Parse and validate
  const asset = parseAsset(raw, gap);
  return asset;
}

async function callOpenRouter({ systemPrompt, userPrompt }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://www.scriptmasterlabs.com",
      "X-Title": "AGO Asset Forge",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.3, // Low temp = deterministic, less hallucination
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic({ systemPrompt, userPrompt }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

function parseAsset(raw, gap) {
  // Strip markdown fences if model added them
  const clean = raw.replace(/```json\n?|```\n?/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: wrap raw text as explainer asset
    parsed = {
      type: "technical_explainer",
      title: `Answer: ${gap.keywords[0]} — Script Master Labs`,
      body: raw,
      keywords: gap.keywords,
      schema_entity: "TechArticle",
      cta_url: "https://www.scriptmasterlabs.com",
      citations: [],
    };
  }

  return {
    id: crypto.randomUUID(),
    gap_id: gap.id,
    source_gap: gap,
    timestamp: new Date().toISOString(),
    ...parsed,
  };
}
