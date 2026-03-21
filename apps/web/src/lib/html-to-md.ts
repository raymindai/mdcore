import TurndownService from "turndown";
// @ts-expect-error — no types for turndown-plugin-gfm
import { gfm } from "turndown-plugin-gfm";

/**
 * Convert HTML to Markdown using Turndown.
 * Supports GFM tables, task lists, and strikethrough.
 */
export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  turndown.use(gfm);

  // Clean up result
  let md = turndown.turndown(html);

  // Remove excessive blank lines
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

/**
 * Detect if clipboard content is HTML (not plain markdown).
 * Returns true if the text contains HTML tags that suggest it's not raw markdown.
 */
export function isHtmlContent(text: string): boolean {
  // Check for common HTML patterns that wouldn't appear in raw markdown
  const htmlPatterns = [
    /<div[\s>]/i,
    /<span[\s>]/i,
    /<p[\s>]/i,
    /<table[\s>]/i,
    /<br\s*\/?>/i,
    /<img[\s]/i,
    /<h[1-6][\s>]/i,
    /<ul[\s>]/i,
    /<ol[\s>]/i,
    /<li[\s>]/i,
    /<a\s+href/i,
    /<article[\s>]/i,
    /<section[\s>]/i,
    /<header[\s>]/i,
    /<nav[\s>]/i,
  ];

  return htmlPatterns.some((p) => p.test(text));
}
