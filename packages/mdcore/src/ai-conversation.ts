/**
 * AI conversation detection and formatting.
 * Supports ChatGPT, Claude, Gemini, and generic Q&A patterns.
 */

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Detect if text looks like an AI conversation.
 */
export function isAiConversation(text: string): boolean {
  const patterns = [
    /^(You|User|Human|Me):\s/im,
    /^(ChatGPT|Assistant|AI|Claude|GPT):\s/im,
    /^\*\*(You|User|Human)\*\*:/m,
    /^\*\*(ChatGPT|Assistant|AI|Claude)\*\*:/m,
    /^(Q|Question):\s/im,
    /^(A|Answer):\s/im,
  ];

  const matches = patterns.filter((p) => p.test(text));
  return matches.length >= 2;
}

/**
 * Parse AI conversation into structured messages.
 */
export function parseConversation(
  text: string
): ConversationMessage[] | null {
  const messages: ConversationMessage[] = [];

  // Try bold marker format: **You:** / **Assistant:**
  const boldPattern =
    /\*\*(You|User|Human|Me|ChatGPT|Assistant|AI|Claude|GPT)\*\*:\s*/gi;
  const boldMatches = [...text.matchAll(boldPattern)];

  if (boldMatches.length >= 2) {
    for (let i = 0; i < boldMatches.length; i++) {
      const match = boldMatches[i];
      const role = isUserRole(match[1]) ? "user" : "assistant";
      const start = match.index! + match[0].length;
      const end =
        i + 1 < boldMatches.length ? boldMatches[i + 1].index! : text.length;
      const content = text.slice(start, end).trim();
      if (content) messages.push({ role, content });
    }
    return messages.length >= 2 ? messages : null;
  }

  // Try colon format: You: / Assistant:
  const colonPattern =
    /^(You|User|Human|Me|ChatGPT|Assistant|AI|Claude|GPT):\s*/gim;
  const colonMatches = [...text.matchAll(colonPattern)];

  if (colonMatches.length >= 2) {
    for (let i = 0; i < colonMatches.length; i++) {
      const match = colonMatches[i];
      const role = isUserRole(match[1]) ? "user" : "assistant";
      const start = match.index! + match[0].length;
      const end =
        i + 1 < colonMatches.length
          ? colonMatches[i + 1].index!
          : text.length;
      const content = text.slice(start, end).trim();
      if (content) messages.push({ role, content });
    }
    return messages.length >= 2 ? messages : null;
  }

  return null;
}

function isUserRole(role: string): boolean {
  return /^(you|user|human|me|q|question)$/i.test(role);
}

/**
 * Format conversation as a clean Markdown document.
 */
export function formatConversation(messages: ConversationMessage[]): string {
  let md = "";

  const firstUserMsg = messages.find((m) => m.role === "user");
  if (firstUserMsg) {
    const titleText = firstUserMsg.content.split("\n")[0].slice(0, 80);
    md += `# ${titleText}\n\n`;
  }

  for (const msg of messages) {
    if (msg.role === "user") {
      md += `> **You:** ${msg.content.replace(/\n/g, "\n> ")}\n\n`;
    } else {
      md += `${msg.content}\n\n---\n\n`;
    }
  }

  return md.trim();
}
