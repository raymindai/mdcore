/* ========================================
   @mdcore/ai — Gemini Provider
   ======================================== */

import type { AIConfig } from "../types.js";
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../config.js";

/**
 * Call Google Gemini API.
 *
 * @param prompt - The prompt text
 * @param config - AI configuration (must include apiKey)
 * @returns Generated text response
 */
export async function callGemini(
  prompt: string,
  config: AIConfig
): Promise<string> {
  const model = config.model || DEFAULT_MODELS.gemini;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini API error (${res.status}): ${errText.substring(0, 200)}`
    );
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
