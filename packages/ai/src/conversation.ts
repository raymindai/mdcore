/* ========================================
   @mdcore/ai — AI Conversation Formatting
   Utilities for detecting and formatting AI conversation outputs.
   ======================================== */

import type { ConversationMessage } from "./types.js";

/**
 * Detect if text looks like an AI conversation
 * (ChatGPT, Claude, Gemini output format).
 *
 * Looks for patterns like:
 * - "User:" / "Assistant:" prefixes
 * - "Human:" / "AI:" prefixes
 * - ChatGPT-style "You said:" / "ChatGPT said:"
 *
 * @param text - Text to check
 * @returns true if the text appears to be an AI conversation
 */
export function isAiConversation(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;

  const conversationPatterns = [
    /^(User|Human|You|Question|Q)\s*[:：]/im,
    /^(Assistant|AI|ChatGPT|Claude|Gemini|GPT|Answer|A)\s*[:：]/im,
    /^(You said|ChatGPT said|Claude said)\s*[:：]/im,
  ];

  let matches = 0;
  for (const pattern of conversationPatterns) {
    if (pattern.test(text)) matches++;
  }

  return matches >= 2;
}

/**
 * Parse an AI conversation into structured messages.
 *
 * @param text - Raw conversation text
 * @returns Array of parsed messages
 */
export function parseConversation(text: string): ConversationMessage[] {
  const messages: ConversationMessage[] = [];

  // Patterns that indicate a role prefix
  const rolePattern =
    /^(User|Human|You|Question|Q|You said|Assistant|AI|ChatGPT|Claude|Gemini|GPT|Answer|A|ChatGPT said|Claude said)\s*[:：]\s*/im;

  const userRoles = new Set([
    "user",
    "human",
    "you",
    "question",
    "q",
    "you said",
  ]);

  const lines = text.split("\n");
  let currentRole: "user" | "assistant" | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(rolePattern);
    if (match) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join("\n").trim(),
        });
      }

      const roleName = match[1].toLowerCase();
      currentRole = userRoles.has(roleName) ? "user" : "assistant";
      const remainder = line.slice(match[0].length).trim();
      currentContent = remainder ? [remainder] : [];
    } else {
      currentContent.push(line);
    }
  }

  // Push final message
  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join("\n").trim(),
    });
  }

  return messages;
}

/**
 * Format parsed conversation messages into clean Markdown.
 *
 * @param messages - Parsed conversation messages
 * @returns Formatted Markdown string
 */
export function formatConversation(messages: ConversationMessage[]): string {
  return messages
    .map((msg) => {
      const label = msg.role === "user" ? "**You**" : "**Assistant**";
      return `${label}\n\n${msg.content}`;
    })
    .join("\n\n---\n\n");
}
