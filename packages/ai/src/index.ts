/* ========================================
   @mdcore/ai — Public API
   ======================================== */

// Providers
export {
  callAI,
  callGemini,
  callOpenAI,
  callAnthropic,
} from "./providers/index.js";

// High-level functions
export { mdfyText } from "./mdfy-text.js";
export { asciiRender } from "./ascii-render.js";
export {
  isAiConversation,
  parseConversation,
  formatConversation,
} from "./conversation.js";

// Config
export { DEFAULT_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "./config.js";

// Types
export type {
  AIProvider,
  AIConfig,
  AIResult,
  ConversationMessage,
} from "./types.js";
