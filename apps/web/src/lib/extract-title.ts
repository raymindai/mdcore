/** Extract title from markdown (first # heading, or "Untitled" fallback). */
export function extractTitleFromMd(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}

/**
 * STRICT title invariant: a doc's title is its first H1. Always.
 *
 * Returns `{ markdown, title }` such that:
 *  - `markdown` always contains an H1 line (prepended if missing)
 *  - `title === extractTitleFromMd(markdown)` (never "Untitled" unless
 *    the actual H1 says "Untitled")
 *
 * Use at every doc-write boundary (web POST/PATCH, MCP create/update,
 * PDF import, share import, etc.) so the invariant holds regardless
 * of which client touches the row.
 *
 * `fallbackTitle` is only used when the markdown lacks an H1. Pass
 * the user's intent (filename, supplied title, existing DB title) —
 * if it's empty too, we fall back to the literal "Untitled".
 */
export function enforceTitleInvariant(
  markdown: string,
  fallbackTitle?: string | null,
): { markdown: string; title: string } {
  const md = markdown || "";
  const detected = extractTitleFromMd(md);
  if (detected && detected !== "Untitled") {
    return { markdown: md, title: detected };
  }
  // Body has no H1 — prepend one. Trust an explicit fallback before
  // resorting to the literal placeholder so the user keeps whatever
  // name they had.
  const fallback = (fallbackTitle || "").trim() || "Untitled";
  const newMd = md.trim() ? `# ${fallback}\n\n${md}` : `# ${fallback}\n`;
  return { markdown: newMd, title: fallback };
}

/**
 * Splice a new H1 line into existing markdown. Used by rename flows
 * that change only the title without touching the body. Idempotent —
 * calling with the same title twice yields identical output.
 */
export function spliceH1(markdown: string, newTitle: string): string {
  const md = markdown || "";
  const lines = md.split("\n");
  const h1Idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (h1Idx >= 0) {
    lines[h1Idx] = `# ${newTitle}`;
    return lines.join("\n");
  }
  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    return `# ${newTitle}\n`;
  }
  return `# ${newTitle}\n\n${md}`;
}
