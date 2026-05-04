/**
 * Pre-render markdown normalization for AI/MCP-generated docs that have
 * structurally weird patterns. Rules are conservative — only apply when the
 * input shows clear "AI mess" signals so well-formed docs are untouched.
 *
 * Heuristics:
 *
 *  1. **Multi-H1 demotion** — if a doc has more than one H1 (`#`), demote the
 *     2nd, 3rd, ... to H3. (Pure conventional Markdown allows multiple H1s,
 *     but for a single document it almost always means the AI used `#` where
 *     it should have used `###`.)
 *
 *  2. **Heading-with-only-inline-code unwrap** — `# \`Foo\`` → `# Foo`. Inline
 *     code inside headings is rarely intentional; the AI just wrapped the
 *     section name in backticks for emphasis.
 *
 *  3. **Inline-code paragraph run → fenced code block** — three or more
 *     consecutive paragraphs that are each just a single inline-code span
 *     (`` `cmd` ``) get merged into one ```bash``` fenced block.
 *
 * Code fences (```), indented code, and tables are left untouched.
 */

const FENCE_RE = /^\s*```/;
const H1_RE = /^# (?!#)/;
const HEADING_INLINE_CODE_RE = /^(#+\s+)`([^`]+)`\s*$/;
const INLINE_CODE_PARA_RE = /^`([^`\n]+)`\s*$/;

export function normalizeMarkdown(md: string): string {
  if (!md) return md;
  const lines = md.split("\n");

  // ── Pass 1: detect H1 indices outside fences
  let inFence = false;
  const h1Indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (H1_RE.test(lines[i])) h1Indices.push(i);
  }
  // Demote 2nd+ H1 to H3 (matches `## section` heading depth — the typical
  // sub-heading the AI meant). Use H3 not H2 because the user's "main" H1
  // already contains H2-level sections; the misplaced H1s are sub-sub.
  if (h1Indices.length > 1) {
    for (let k = 1; k < h1Indices.length; k++) {
      lines[h1Indices[k]] = "###" + lines[h1Indices[k]].slice(1);
    }
  }

  // ── Pass 2: unwrap headings that contain only an inline-code span
  inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = lines[i].match(HEADING_INLINE_CODE_RE);
    if (m) lines[i] = m[1] + m[2];
  }

  // ── Pass 3: merge runs of inline-code-only paragraphs into a fenced block
  // Walk; collect consecutive matches (with blank lines between allowed).
  // 3+ in a row → merge into ```bash. 1-2 in a row → leave as-is.
  inFence = false;
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      out.push(line);
      i++;
      continue;
    }
    if (inFence) {
      out.push(line);
      i++;
      continue;
    }
    // Try to start a run from here
    if (INLINE_CODE_PARA_RE.test(line)) {
      const runStart = i;
      const run: string[] = [];
      let j = i;
      while (j < lines.length) {
        const m = lines[j].match(INLINE_CODE_PARA_RE);
        if (m) {
          run.push(m[1]);
          j++;
          // Skip blank lines after this paragraph
          while (j < lines.length && lines[j].trim() === "") j++;
          continue;
        }
        break;
      }
      if (run.length >= 3) {
        // Merge into one fenced block
        out.push("```bash", ...run, "```");
        i = j;
        continue;
      }
      // Not a long enough run — emit original lines verbatim
      for (let k = runStart; k < j; k++) out.push(lines[k]);
      i = j;
      continue;
    }
    out.push(line);
    i++;
  }

  return out.join("\n");
}
