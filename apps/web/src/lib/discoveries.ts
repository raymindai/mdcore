/**
 * Cross-document discoveries — aggregate AI-decomposed chunks across all
 * documents in a bundle into the four "things the bundle wants to tell you":
 *
 *   1. Tensions    — chunks linked by `contradicts` edges (or labelled likewise)
 *   2. Questions   — every chunk of type "question"
 *   3. Action items — every chunk of type "task"
 *   4. Threads     — concepts/labels recurring across 2+ documents
 *
 * Input: a map of {docId → SemanticChunksResult} for every doc that has been
 * decomposed. Docs without decompositions are skipped (the UI surfaces a
 * "Run discovery" CTA when this happens).
 */

export interface ChunkRef {
  docId: string;
  docTitle: string;
  chunkId: string;
  chunkLabel: string;
  chunkType: string;
  chunkContent: string;
  weight: number;
}

export interface TensionItem {
  /** Stable id for React keys */
  id: string;
  source: ChunkRef;
  target: ChunkRef;
  relation: string; // edge label or "contradicts"
}

export interface ThreadItem {
  /** Normalized label key */
  id: string;
  label: string;
  occurrences: ChunkRef[]; // chunks across multiple docs sharing the same label
}

export interface DiscoveryResult {
  tensions: TensionItem[];
  questions: ChunkRef[];
  threads: ThreadItem[];
  /** Bundle-level AI insights — non-obvious cross-doc patterns. Sourced from
   *  the bundle graph's `insights` array, not per-doc chunks. */
  insights: string[];
  /** Bundle-level AI-detected gaps — what these docs don't cover. */
  gaps: string[];
  /** Bundle-level AI doc-to-doc connections, e.g. "doc-1 sets up the framing
   *  that doc-3 critiques." */
  connections: { doc1Id: string; doc2Id: string; relationship: string }[];
  /** Number of docs included (had decomposition) */
  decomposedCount: number;
}

interface ChunkLike {
  id: string;
  type: string;
  label: string;
  content: string;
  weight: number;
  found?: boolean;
}
interface EdgeLike {
  source: string;
  target: string;
  type: string;
  label?: string;
  weight: number;
}
interface DecompositionLike {
  chunks: ChunkLike[];
  edges: EdgeLike[];
}
interface DocLike {
  id: string;
  title: string | null;
}

const TENSION_EDGE_TYPES = new Set(["contradicts", "conflicts"]);
const TENSION_LABEL_HINTS = /\b(contradict|conflict|disagree|tension|mismatch|opposing)\b/i;

/**
 * Normalize a chunk label for thread grouping. Strips punctuation, collapses
 * whitespace, lowercases. Two labels that differ only by case/spacing/quotes
 * collapse to the same key.
 */
function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^\w가-힣\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface BundleGraphLike {
  insights?: string[];
  gaps?: string[];
  connections?: Array<{ doc1?: string; doc2?: string; relationship?: string }>;
}

export function aggregateDiscoveries(
  docs: DocLike[],
  decompositionByDocId: Record<string, DecompositionLike | undefined>,
  bundleGraph?: BundleGraphLike | null,
): DiscoveryResult {
  const tensions: TensionItem[] = [];
  const questions: ChunkRef[] = [];

  // Map normalized label → occurrences across docs (for threads)
  const labelGroups = new Map<string, ChunkRef[]>();

  let decomposedCount = 0;

  for (const doc of docs) {
    const decomp = decompositionByDocId[doc.id];
    if (!decomp) continue;
    decomposedCount++;

    const docTitle = doc.title || "Untitled";
    const chunkById = new Map<string, ChunkLike>();
    for (const c of decomp.chunks) chunkById.set(c.id, c);

    for (const c of decomp.chunks) {
      const ref: ChunkRef = {
        docId: doc.id,
        docTitle,
        chunkId: c.id,
        chunkLabel: c.label,
        chunkType: c.type,
        chunkContent: c.content,
        weight: c.weight,
      };
      if (c.type === "question") questions.push(ref);
      // task chunks aren't surfaced as Discoveries — too out-of-context to be
      // useful when stripped from the source. They're still visible inside
      // each doc's decompose view where the user can act on them locally.

      // Thread grouping by normalized label
      const key = normalizeLabel(c.label);
      if (!key || key.length < 2) continue;
      const list = labelGroups.get(key) || [];
      list.push(ref);
      labelGroups.set(key, list);
    }

    // Within-doc tensions (AI marked an edge as contradicts/conflicts, or the
    // edge label uses tension language)
    for (const e of decomp.edges) {
      const isTension = TENSION_EDGE_TYPES.has(e.type) || (e.label && TENSION_LABEL_HINTS.test(e.label));
      if (!isTension) continue;
      const sc = chunkById.get(e.source);
      const tc = chunkById.get(e.target);
      if (!sc || !tc) continue;
      tensions.push({
        id: `${doc.id}:${e.source}:${e.target}`,
        source: {
          docId: doc.id, docTitle,
          chunkId: sc.id, chunkLabel: sc.label, chunkType: sc.type, chunkContent: sc.content, weight: sc.weight,
        },
        target: {
          docId: doc.id, docTitle,
          chunkId: tc.id, chunkLabel: tc.label, chunkType: tc.type, chunkContent: tc.content, weight: tc.weight,
        },
        relation: e.label || "contradicts",
      });
    }
  }

  // Threads: only keep label groups appearing in 2+ DIFFERENT docs (otherwise
  // it's just internal repetition within one doc — not a cross-doc thread).
  const threads: ThreadItem[] = [];
  for (const [key, list] of labelGroups) {
    const distinctDocs = new Set(list.map(r => r.docId));
    if (distinctDocs.size < 2) continue;
    // Use the most common label form as the display label
    const labelCounts = new Map<string, number>();
    for (const r of list) labelCounts.set(r.chunkLabel, (labelCounts.get(r.chunkLabel) || 0) + 1);
    let displayLabel = list[0].chunkLabel;
    let bestCount = 0;
    for (const [l, c] of labelCounts) if (c > bestCount) { displayLabel = l; bestCount = c; }
    threads.push({ id: key, label: displayLabel, occurrences: list });
  }

  // Sort: high-weight chunks first
  tensions.sort((a, b) => (b.source.weight + b.target.weight) - (a.source.weight + a.target.weight));
  questions.sort((a, b) => b.weight - a.weight);
  threads.sort((a, b) => b.occurrences.length - a.occurrences.length);

  // Bundle-level signals — pulled from the bundle's AI graph (already cached
  // on the bundle row). These are the highest-value Discoveries because they
  // come from analyzing the bundle as a whole, not just stitching per-doc data.
  const insights = (bundleGraph?.insights || []).filter(s => typeof s === "string" && s.trim().length > 0);
  const gaps = (bundleGraph?.gaps || []).filter(s => typeof s === "string" && s.trim().length > 0);
  const connections: DiscoveryResult["connections"] = (bundleGraph?.connections || [])
    .filter(c => c.doc1 && c.doc2 && c.relationship)
    .map(c => ({
      // The bundle graph stores doc ids as `doc:<id>` — strip the prefix so
      // we can look the doc up by its raw id.
      doc1Id: String(c.doc1).replace(/^doc:/, ""),
      doc2Id: String(c.doc2).replace(/^doc:/, ""),
      relationship: String(c.relationship),
    }));

  return { tensions, questions, threads, insights, gaps, connections, decomposedCount };
}
