/* ========================================
   @mdcore/ai — Configuration & Defaults
   ======================================== */

import type { AIProvider } from "./types.js";

/** Default models per provider */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: "gemini-3.1-flash-lite",
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-4-5",
};

/** Default temperature for all providers */
export const DEFAULT_TEMPERATURE = 0.1;

/** Default max output tokens */
export const DEFAULT_MAX_TOKENS = 8192;
