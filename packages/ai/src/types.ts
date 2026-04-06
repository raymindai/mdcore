/* ========================================
   @mdcore/ai — Shared Types
   ======================================== */

/** Supported AI provider names */
export type AIProvider = "gemini" | "openai" | "anthropic";

/** Configuration for an AI provider call */
export interface AIConfig {
  /** Which provider to use */
  provider: AIProvider;
  /** API key for the provider */
  apiKey: string;
  /** Override the default model for this provider */
  model?: string;
  /** Override temperature (default: 0.1) */
  temperature?: number;
  /** Override max output tokens (default: 8192) */
  maxTokens?: number;
}

/** A message in a conversation */
export interface ConversationMessage {
  /** Role: "user", "assistant", or "system" */
  role: "user" | "assistant" | "system";
  /** Text content */
  content: string;
}

/** Result from an AI call */
export interface AIResult {
  /** The generated text */
  text: string;
  /** Which provider was used */
  provider: AIProvider;
  /** Which model was used */
  model: string;
}
