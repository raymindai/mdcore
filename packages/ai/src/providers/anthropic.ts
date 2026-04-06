/* ========================================
   @mdcore/ai — Anthropic Provider
   ======================================== */

import type { AIConfig } from "../types.js";
import { DEFAULT_MODELS, DEFAULT_MAX_TOKENS } from "../config.js";

/**
 * Call Anthropic Messages API.
 *
 * Note: Anthropic does not support temperature < 1.0 in the same way
 * as other providers, but the parameter is passed through.
 *
 * @param prompt - The prompt text
 * @param config - AI configuration (must include apiKey)
 * @returns Generated text response
 */
export async function callAnthropic(
  prompt: string,
  config: AIConfig
): Promise<string> {
  const model = config.model || DEFAULT_MODELS.anthropic;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Anthropic API error (${res.status}): ${errText.substring(0, 200)}`
    );
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}
