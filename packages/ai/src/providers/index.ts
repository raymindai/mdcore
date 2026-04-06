/* ========================================
   @mdcore/ai — Provider Factory
   ======================================== */

import type { AIConfig } from "../types.js";
import { callGemini } from "./gemini.js";
import { callOpenAI } from "./openai.js";
import { callAnthropic } from "./anthropic.js";

export { callGemini } from "./gemini.js";
export { callOpenAI } from "./openai.js";
export { callAnthropic } from "./anthropic.js";

/**
 * Call any AI provider based on config.provider.
 *
 * @param prompt - The prompt text
 * @param config - AI configuration with provider, apiKey, and optional overrides
 * @returns Generated text response
 *
 * @example
 * ```ts
 * const text = await callAI("Summarize this", {
 *   provider: "gemini",
 *   apiKey: "...",
 * });
 * ```
 */
export async function callAI(
  prompt: string,
  config: AIConfig
): Promise<string> {
  switch (config.provider) {
    case "gemini":
      return callGemini(prompt, config);
    case "openai":
      return callOpenAI(prompt, config);
    case "anthropic":
      return callAnthropic(prompt, config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}
