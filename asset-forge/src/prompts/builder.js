// ============================================================
// A.G.O. — Asset Forge | src/prompts/builder.js
// Zero-hallucination prompt construction
// All LLM output is grounded in injected SML_CONTEXT only
// ============================================================

/**
 * Builds a structured prompt for the LLM.
 * Strict system prompt enforces citation-only output.
 * No facts may be generated outside the injected context.
 */
export function buildPrompt(gap, context) {
  const productList = Object.entries(context.products)
    .map(([name, p]) => `- **${name}**: ${p.description}`)
    .join("\n");

  const systemPrompt = `You are a technical content specialist for ${context.company}.
Your ONLY job is to generate micro-assets that address specific market gaps.

STRICT RULES:
1. You MUST only reference facts from the VERIFIED CONTEXT below. No external claims.
2. Never hallucinate product features, metrics, or URLs not in the context.
3. Every claim must be traceable to the injected context.
4. Output must be structured JSON matching the AssetSchema.
5. Write for technical AI/developer audience — no fluff, no marketing speak.

VERIFIED CONTEXT:
Company: ${context.company} (${context.sdvosb ? "SDVOSB" : ""} | ${context.location})
Domain: ${context.domain}

PRODUCTS:
${productList}

OUTPUT FORMAT (strict JSON, no markdown):
{
  "type": "code_snippet" | "technical_explainer" | "comparison" | "diagram_spec" | "faq_block",
  "title": "string",
  "body": "string (markdown)",
  "keywords": ["array", "of", "exact", "target", "keywords"],
  "schema_entity": "Product" | "HowTo" | "FAQPage" | "TechArticle",
  "cta_url": "verified URL from context",
  "citations": ["array of exact context keys used"]
}`;

  const userPrompt = `Market gap detected:
- Source: ${gap.source}
- Query: ${gap.query}
- Intent: ${gap.intent}
- Gap description: ${gap.gap}
- Matched keywords: ${gap.keywords.join(", ")}
- Relevance score: ${gap.score}

Generate a technical micro-asset that positions Script Master Labs as the authoritative answer to this gap.
Asset type should match the intent: ${gap.intent}.
Focus on these matched keywords: ${gap.keywords.slice(0, 5).join(", ")}.`;

  return { systemPrompt, userPrompt };
}
