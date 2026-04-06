/* ========================================
   @mdcore/ai — OpenAI Provider
   ======================================== */

import type { AIConfig } from "../types.js";
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../config.js";

/**
 * Call OpenAI Chat Completions API.
 *
 * @param prompt - The prompt text
 * @param config - AI configuration (must include apiKey)
 * @returns Generated text response
 */
export async function callOpenAI(
  prompt: string,
  config: AIConfig
): Promise<string> {
  const model = config.model || DEFAULT_MODELS.openai;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `OpenAI API error (${res.status}): ${errText.substring(0, 200)}`
    );
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
