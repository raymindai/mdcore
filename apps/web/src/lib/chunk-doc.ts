// Phase 2 RAG — split a markdown document into chunks for chunk-level
// embedding. Splits on top-level (#, ##, ###) headings; each chunk
// holds the heading line plus everything until the next heading of
// equal or higher rank. Pre-heading text becomes chunk 0 with no
// heading. Long chunks are further split on blank-line boundaries to
// stay under EMBED_TARGET_CHARS so embeddings stay focused.
//
// Output is the minimum the indexer needs:
//   - chunk_idx        stable index inside the doc
//   - heading          nearest enclosing heading line text
//   - heading_path     breadcrumb of all enclosing headings
//   - markdown         chunk body (heading line included if present)
//   - hash             sha256 of the chunk body, for idempotent embed

import crypto from "node:crypto";

export interface DocChunk {
  chunk_idx: number;
  heading: string | null;
  heading_path: string | null;
  markdown: string;
  hash: string;
}

const HEADING_RE = /^(#{1,3})\s+(.*?)\s*$/;
// Most chunks should be a few hundred chars; cap at ~1800 chars
// (~450 tokens) to keep each embedding request small and the recall
// snippet usable. If a heading subtree is bigger, we split it on
// paragraph boundaries.
const EMBED_TARGET_CHARS = 1800;

function hashOf(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Split markdown into chunks keyed by markdown headings.
 * Pure function — no DB / network. Called from /api/embed/<id>.
 */
export function chunkDocument(markdown: string): DocChunk[] {
  if (!markdown) return [];

  const lines = markdown.split("\n");

  type Section = {
    heading: string | null;       // heading text without leading # marks
    headingLine: string | null;   // verbatim line including # marks
    level: number;                // 0 for pre-heading prelude, else 1/2/3
    parents: string[];            // enclosing heading texts (for breadcrumb)
    body: string[];               // lines (heading line excluded)
  };

  const sections: Section[] = [];
  let current: Section = {
    heading: null,
    headingLine: null,
    level: 0,
    parents: [],
    body: [],
  };
  // Stack of currently open headings, indexed by level (1..3).
  const stack: { level: number; text: string }[] = [];

  for (const line of lines) {
    const m = line.match(HEADING_RE);
    if (m) {
      // Close current section.
      if (current.body.length > 0 || current.headingLine !== null) {
        sections.push(current);
      }
      const level = m[1].length;
      const text = m[2];
      // Pop stack entries at or below this level.
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      const parents = stack.map((s) => s.text);
      stack.push({ level, text });
      current = {
        heading: text,
        headingLine: line,
        level,
        parents,
        body: [],
      };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length > 0 || current.headingLine !== null) {
    sections.push(current);
  }

  const chunks: DocChunk[] = [];
  let idx = 0;

  for (const sec of sections) {
    // Drop completely blank prelude (no heading + only whitespace).
    const bodyText = sec.body.join("\n").trimEnd();
    if (sec.headingLine === null && bodyText.trim() === "") continue;

    const headingLine = sec.headingLine ?? "";
    const fullChunkText = (headingLine ? `${headingLine}\n` : "") + bodyText;

    const headingPath =
      [...sec.parents, sec.heading].filter(Boolean).join(" > ") || null;

    if (fullChunkText.length <= EMBED_TARGET_CHARS) {
      const trimmed = fullChunkText.trim();
      if (!trimmed) continue;
      chunks.push({
        chunk_idx: idx++,
        heading: sec.heading,
        heading_path: headingPath,
        markdown: trimmed,
        hash: hashOf(trimmed),
      });
      continue;
    }

    // Section is too long — split body on blank-line boundaries,
    // re-emitting the heading at the top of each piece so each chunk
    // stays self-contained.
    const paragraphs = bodyText.split(/\n{2,}/);
    let buffer: string[] = [];
    let bufLen = 0;
    const flush = () => {
      const piece = buffer.join("\n\n").trim();
      if (!piece) return;
      const text = (headingLine ? `${headingLine}\n\n` : "") + piece;
      chunks.push({
        chunk_idx: idx++,
        heading: sec.heading,
        heading_path: headingPath,
        markdown: text,
        hash: hashOf(text),
      });
      buffer = [];
      bufLen = 0;
    };
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      // +2 for the blank-line separator and the heading line we'll
      // re-emit; close enough for the size check.
      const headerOverhead = headingLine ? headingLine.length + 2 : 0;
      if (bufLen + trimmed.length + headerOverhead > EMBED_TARGET_CHARS && buffer.length > 0) {
        flush();
      }
      buffer.push(trimmed);
      bufLen += trimmed.length + 2;
    }
    flush();
  }

  return chunks;
}
