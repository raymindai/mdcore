/** Extract title from markdown (first # heading, or "Untitled" fallback). */
export function extractTitleFromMd(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}

/**
 * Title invariant: title column must equal the body's first H1.
 *
 * NON-MUTATING. Returns `{ markdown, title }` where:
 *  - `markdown` is returned UNCHANGED (no H1 ever prepended)
 *  - `title === extractTitleFromMd(markdown)` ("Untitled" when the
 *    body has no H1)
 *
 * Earlier this helper used to silently prepend `# <fallback>` when
 * the body lacked an H1. That mutated user content on every save —
 * a doc that had been captured from an AI without an H1 would gain
 * an unwanted heading line on its very next autosave. Body
 * mutation now requires explicit caller intent (rename via
 * spliceH1, or import paths that prepend before calling).
 *
 * `fallbackTitle` is accepted for source-compat only; it has no
 * effect on the returned markdown or title. Callers that want a
 * fallback name embedded in the body should prepend `# <name>\n\n`
 * themselves before invoking this helper.
 */
export function enforceTitleInvariant(
  markdown: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fallbackTitle?: string | null,
): { markdown: string; title: string } {
  const md = markdown || "";
  const title = extractTitleFromMd(md);
  return { markdown: md, title };
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
