/**
 * Build a mapping from rendered HTML elements to Markdown source lines.
 * Scans the markdown source for block-level elements and assigns line numbers
 * that can be matched against rendered DOM elements.
 */

export interface SourceBlock {
  type: "heading" | "paragraph" | "code" | "table" | "blockquote" | "list" | "hr" | "math" | "mermaid";
  startLine: number; // 0-indexed
  endLine: number;
  text: string; // first line content for matching
}

/**
 * Parse markdown source into blocks with line numbers.
 */
export function parseSourceBlocks(markdown: string): SourceBlock[] {
  const lines = markdown.split("\n");
  const blocks: SourceBlock[] = [];
  let i = 0;

  // Skip frontmatter
  if (lines[0]?.trim() === "---") {
    i++;
    while (i < lines.length && lines[i]?.trim() !== "---") i++;
    i++; // skip closing ---
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) { i++; continue; }

    // Heading
    if (/^#{1,6}\s/.test(trimmed)) {
      blocks.push({ type: "heading", startLine: i, endLine: i, text: trimmed });
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      const fence = trimmed.slice(0, 3);
      const lang = trimmed.slice(3).trim();
      const start = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) i++;
      const type = lang === "mermaid" ? "mermaid" as const : "code" as const;
      blocks.push({ type, startLine: start, endLine: i, text: trimmed });
      i++;
      continue;
    }

    // Table (starts with |)
    if (trimmed.startsWith("|")) {
      const start = i;
      while (i < lines.length && lines[i].trim().startsWith("|")) i++;
      blocks.push({ type: "table", startLine: start, endLine: i - 1, text: trimmed });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const start = i;
      while (i < lines.length && (lines[i].trim().startsWith(">") || (lines[i].trim() && i > start))) {
        if (!lines[i].trim()) break;
        i++;
      }
      blocks.push({ type: "blockquote", startLine: start, endLine: i - 1, text: trimmed });
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr", startLine: i, endLine: i, text: trimmed });
      i++;
      continue;
    }

    // List
    if (/^[-*+]\s|^\d+\.\s/.test(trimmed)) {
      const start = i;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; break; }
        if (/^[-*+]\s|^\d+\.\s/.test(t) || lines[i].startsWith("  ") || lines[i].startsWith("\t")) {
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", startLine: start, endLine: i - 1, text: trimmed });
      continue;
    }

    // Display math
    if (trimmed === "$$") {
      const start = i;
      i++;
      while (i < lines.length && lines[i].trim() !== "$$") i++;
      blocks.push({ type: "math", startLine: start, endLine: i, text: "$$" });
      i++;
      continue;
    }

    // Paragraph (default)
    const start = i;
    while (i < lines.length && lines[i].trim()) i++;
    blocks.push({ type: "paragraph", startLine: start, endLine: i - 1, text: trimmed });
  }

  return blocks;
}

/**
 * Match a rendered DOM element to its source block index.
 * Returns the block index or -1 if not found.
 */
export function matchElementToBlock(
  el: HTMLElement,
  blocks: SourceBlock[]
): number {
  const tag = el.tagName.toLowerCase();

  // Map tag to block type
  let targetType: SourceBlock["type"] | null = null;
  if (/^h[1-6]$/.test(tag)) targetType = "heading";
  else if (tag === "p") targetType = "paragraph";
  else if (tag === "pre") targetType = "code";
  else if (tag === "table") targetType = "table";
  else if (tag === "blockquote") targetType = "blockquote";
  else if (tag === "ul" || tag === "ol") targetType = "list";
  else if (tag === "hr") targetType = "hr";

  if (!targetType) return -1;

  // Check for mermaid container
  if (el.closest(".mermaid-container") || el.closest(".mermaid-rendered")) {
    targetType = "mermaid";
  }

  // Check for katex display
  if (el.closest(".katex-display")) {
    targetType = "math";
  }

  // Find the nth element of this type in DOM
  const parent = el.closest(".mdcore-rendered");
  if (!parent) return -1;

  const sameTypeElements = Array.from(
    parent.querySelectorAll(
      targetType === "heading" ? "h1,h2,h3,h4,h5,h6"
        : targetType === "code" ? "pre"
        : targetType === "mermaid" ? ".mermaid-container,.mermaid-rendered"
        : targetType === "math" ? ".katex-display"
        : tag
    )
  );

  const domIndex = sameTypeElements.indexOf(
    targetType === "mermaid" ? (el.closest(".mermaid-container") || el.closest(".mermaid-rendered") || el)
    : targetType === "math" ? (el.closest(".katex-display") || el)
    : el
  );

  if (domIndex === -1) return -1;

  // Find the nth block of this type in source
  const sameTypeBlocks = blocks
    .map((b, i) => ({ ...b, idx: i }))
    .filter((b) => b.type === targetType);

  if (domIndex < sameTypeBlocks.length) {
    return sameTypeBlocks[domIndex].idx;
  }

  return -1;
}
