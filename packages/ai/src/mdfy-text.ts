/* ========================================
   @mdcore/ai — Raw Text to Structured Markdown
   Extracted from apps/web/src/app/api/import/mdfy/route.ts
   ======================================== */

import type { AIConfig } from "./types.js";
import { callAI } from "./providers/index.js";

/**
 * Convert raw/unformatted text into well-structured Markdown using AI.
 *
 * This is the "mdfy" core feature — takes messy text (e.g., from a PDF extraction,
 * a pasted email, or a raw text file) and reconstructs proper Markdown structure.
 *
 * @param text - Raw text to convert
 * @param config - AI provider configuration
 * @param filename - Optional source filename (helps the AI understand context)
 * @returns Structured Markdown text
 *
 * @example
 * ```ts
 * const markdown = await mdfyText(rawText, {
 *   provider: "gemini",
 *   apiKey: "...",
 * });
 * ```
 */
export async function mdfyText(
  text: string,
  config: AIConfig,
  filename?: string
): Promise<string> {
  // Limit input to ~30k chars to avoid token limits
  const trimmed = text.slice(0, 30000);

  const prompt = `You are an expert at converting raw text into well-structured Markdown.

The following text was extracted from a file${filename ? ` named "${filename}"` : ""}. The extraction process lost all formatting — headings, bold, lists, tables, code blocks, etc. are all flattened into plain text.

Your job is to reconstruct the original document structure as clean Markdown:

Rules:
- Detect headings from context (titles, section names) and use # ## ### appropriately
- Detect lists (bullet points, numbered steps) and format as - or 1. 2. 3.
- Detect tables and format as Markdown tables
- Detect code snippets and wrap in \`\`\` code blocks with language hints
- Detect emphasis (key terms, important phrases) and use **bold** or *italic*
- Detect blockquotes and use >
- Preserve all original content — do NOT summarize, skip, or rephrase
- Output ONLY the Markdown — no explanations, no wrapping, no \`\`\`markdown fences
- If the text is already well-structured, just clean it up minimally
- For non-English text, preserve the original language

Raw text:
---
${trimmed}
---

Structured Markdown:`;

  const result = await callAI(prompt, config);

  if (!result.trim()) {
    throw new Error("AI returned empty result");
  }

  return result;
}
