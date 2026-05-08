/**
 * Line-level markdown diff utilities used by the synthesis diff/accept flow.
 *
 * We don't try to be a fancy semantic markdown differ — line-by-line diff
 * works well for synthesis pages because the LLM generates clearly
 * delineated structural blocks (headings, list items, paragraphs separated
 * by blank lines), and reviewers want to scan changes at the block level.
 *
 * For tighter visual rendering, callers can group consecutive removed
 * lines and the matching added lines into a single change hunk.
 */

import * as Diff from "diff";

export type DiffOp = "equal" | "added" | "removed";

export interface DiffLine {
  op: DiffOp;
  /** Trailing newline stripped; render as a paragraph in your UI. */
  text: string;
}

export interface DiffSummary {
  lines: DiffLine[];
  added: number;
  removed: number;
  totalLines: number;
  /** True if the two strings are byte-equal after normalization. */
  identical: boolean;
}

const PARAGRAPH_NORMALIZE_RE = /\r\n/g;

function normalize(s: string): string {
  // jsdiff treats unterminated final lines as part of the previous line,
  // which collapses pure-add/pure-remove cases into a single replace hunk.
  // Force a trailing newline so the line boundary is unambiguous.
  const s1 = s.replace(PARAGRAPH_NORMALIZE_RE, "\n");
  return s1.endsWith("\n") || s1.length === 0 ? s1 : s1 + "\n";
}

export function diffMarkdown(current: string, proposed: string): DiffSummary {
  const a = normalize(current);
  const b = normalize(proposed);
  if (a === b) {
    return {
      lines: [{ op: "equal", text: a }],
      added: 0,
      removed: 0,
      totalLines: a.split("\n").length,
      identical: true,
    };
  }
  const parts = Diff.diffLines(a, b);
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  for (const part of parts) {
    const op: DiffOp = part.added ? "added" : part.removed ? "removed" : "equal";
    // Each part may contain multiple lines. Split so the caller can render
    // line-by-line.
    const text = part.value.endsWith("\n") ? part.value.slice(0, -1) : part.value;
    const segments = text.split("\n");
    for (const seg of segments) {
      lines.push({ op, text: seg });
      if (op === "added") added++;
      if (op === "removed") removed++;
    }
  }
  return {
    lines,
    added,
    removed,
    totalLines: lines.length,
    identical: false,
  };
}
