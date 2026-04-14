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

  // Code blocks: preserve language from pre[lang] attribute
  turndown.addRule("fenced-code-with-lang", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        !!node.getAttribute("lang")
      );
    },
    replacement: (_content, node) => {
      const lang = (node as HTMLElement).getAttribute("lang") || "";
      const code = (node as HTMLElement).querySelector("code");
      const text = code ? code.textContent || "" : (node as HTMLElement).textContent || "";
      return `\n\n\`\`\`${lang}\n${text.replace(/\n$/, "")}\n\`\`\`\n\n`;
    },
  });

  // Code blocks: <pre> without lang attribute (handles copy button inside pre)
  turndown.addRule("fenced-code-no-lang", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        !node.getAttribute("lang") &&
        !!node.querySelector("code")
      );
    },
    replacement: (_content, node) => {
      const code = (node as HTMLElement).querySelector("code");
      const text = code ? code.textContent || "" : (node as HTMLElement).textContent || "";
      return `\n\n\`\`\`\n${text.replace(/\n$/, "")}\n\`\`\`\n\n`;
    },
  });

  // Mermaid: preserve mermaid code from rendered containers
  turndown.addRule("mermaid-container", {
    filter: (node) => {
      return (
        node.classList.contains("mermaid-container") ||
        node.classList.contains("mermaid-rendered")
      );
    },
    replacement: (_content, node) => {
      // Try to find original code from data attribute or pre element
      const el = node as HTMLElement;
      const originalCode = el.getAttribute("data-original-code") ||
        el.querySelector("pre")?.textContent ||
        el.querySelector(".mermaid")?.getAttribute("data-original-code") ||
        el.textContent || "";
      return `\n\n\`\`\`mermaid\n${originalCode.trim()}\n\`\`\`\n\n`;
    },
  });

  // ASCII rendered diagrams: preserve original code
  turndown.addRule("ascii-rendered", {
    filter: (node) => {
      return node.classList.contains("ascii-rendered");
    },
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const originalCode = el.getAttribute("data-original-code") || "";
      if (originalCode) return `\n\n\`\`\`\n${originalCode.trim()}\n\`\`\`\n\n`;
      return "";
    },
  });

  // Math: convert .math-rendered back to $...$ or $$...$$
  turndown.addRule("math-inline", {
    filter: (node) => {
      return (
        node.nodeName === "SPAN" &&
        node.classList.contains("math-rendered") &&
        node.getAttribute("data-math-mode") === "inline"
      );
    },
    replacement: (_content, node) => {
      const src = (node as HTMLElement).getAttribute("data-math-src");
      if (src) return `$${decodeURIComponent(src)}$`;
      return `$${(node as HTMLElement).textContent || ""}$`;
    },
  });

  turndown.addRule("math-display", {
    filter: (node) => {
      return (
        (node.nodeName === "DIV" || node.nodeName === "SPAN") &&
        node.classList.contains("math-rendered") &&
        node.getAttribute("data-math-mode") === "display"
      );
    },
    replacement: (_content, node) => {
      const src = (node as HTMLElement).getAttribute("data-math-src");
      if (src) return `\n\n$$${decodeURIComponent(src)}$$\n\n`;
      return `\n\n$$${(node as HTMLElement).textContent || ""}$$\n\n`;
    },
  });

  // Math: handle raw data-math-style spans (before KaTeX processing)
  turndown.addRule("math-raw", {
    filter: (node) => {
      return (
        node.nodeName === "SPAN" &&
        !!node.getAttribute("data-math-style")
      );
    },
    replacement: (_content, node) => {
      const style = (node as HTMLElement).getAttribute("data-math-style");
      const tex = (node as HTMLElement).textContent || "";
      if (style === "display") return `\n\n$$${tex}$$\n\n`;
      return `$${tex}$`;
    },
  });

  let md = turndown.turndown(html);
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

/**
 * Detect if text content is HTML (not plain markdown).
 */
export function isHtmlContent(text: string): boolean {
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
