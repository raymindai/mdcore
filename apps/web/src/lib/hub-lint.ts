import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hub lint v1. Karpathy's pattern names lint as one of the three
 * core operations alongside ingest and query. We surface two signals
 * to start with:
 *
 *   1. Orphan docs. Published docs that aren't in any bundle AND
 *      aren't referenced by any other doc's markdown. They sit alone
 *      in the hub with no path to discovery.
 *   2. Semantic duplicates. Pairs of docs whose embeddings are close
 *      enough that the user probably meant to merge or supersede one.
 *
 * Other Karpathy lint signals (contradictions, stale claims, missing
 * cross-references) require fresh AI analysis per doc; they're heavier
 * and follow up post-launch.
 *
 * Read by /api/user/hub/lint and surfaced as
 * /raw/hub/<slug>/lint.md for AI fetchers that want to see the
 * health snapshot alongside the hub.
 */

export interface OrphanDoc {
  id: string;
  title: string | null;
  updatedAt: string | null;
}

export interface DuplicatePair {
  /** Older / superseded doc. */
  a: { id: string; title: string | null };
  /** Newer / canonical doc. */
  b: { id: string; title: string | null };
  /** Cosine distance (0 = identical, 2 = opposite). Lower = more similar. */
  distance: number;
}

export interface LintReport {
  computedAt: string;
  totalDocs: number;
  orphans: OrphanDoc[];
  duplicates: DuplicatePair[];
}

const DUPLICATE_DISTANCE_THRESHOLD = 0.18; // cosine; tuned for "likely-overlapping content"
const DUPLICATE_NEIGHBORS = 3; // check top-N neighbors per doc

interface DocRow {
  id: string;
  title: string | null;
  updated_at: string | null;
  is_draft: boolean | null;
}

interface BundleDocRow {
  document_id: string;
}

interface DocMarkdownRow {
  id: string;
  markdown: string | null;
}

interface MatchRow {
  id: string;
  title: string | null;
  distance: number;
}

export async function computeLintReport(
  supabase: SupabaseClient,
  userId: string,
): Promise<LintReport> {
  // Pull live docs (no drafts, no deleted).
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, updated_at, is_draft")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const liveDocs = (docs as DocRow[] | null ?? []).filter((d) => !d.is_draft);
  const liveDocIds = new Set(liveDocs.map((d) => d.id));

  // Collect set of doc ids that are members of at least one bundle.
  const { data: bd } = await supabase
    .from("bundle_documents")
    .select("document_id")
    .in("document_id", liveDocs.map((d) => d.id));
  const inBundle = new Set((bd as BundleDocRow[] | null ?? []).map((r) => r.document_id));

  // Collect set of doc ids that are referenced from other docs' markdown
  // by URL fragment. We accept either /<id> or /d/<id> shapes.
  const { data: others } = await supabase
    .from("documents")
    .select("id, markdown")
    .eq("user_id", userId)
    .is("deleted_at", null);
  const referenced = new Set<string>();
  const otherDocs = (others as DocMarkdownRow[] | null ?? []);
  for (const d of otherDocs) {
    if (!d.markdown) continue;
    for (const candidateId of liveDocIds) {
      if (candidateId === d.id) continue;
      if (referenced.has(candidateId)) continue;
      // mdfy URL shapes:
      //   mdfy.app/<id>           (canonical, AI-fetcher path)
      //   mdfy.app/d/<id>         (browser route)
      //   /<id>                   (relative link if user wrote one)
      const hay = d.markdown;
      if (
        hay.includes("/" + candidateId) ||
        hay.includes("/d/" + candidateId)
      ) {
        referenced.add(candidateId);
      }
    }
  }

  // Concept-linked: docs that share at least one concept_index row
  // with another doc. v6 thesis is that the concept index IS the
  // implicit cross-link — a doc with concepts present in other docs
  // is reachable via concept neighborhood walks, so it isn't orphan.
  // Without this gate, refresh-concepts (the Resolve action) couldn't
  // remove a doc from the orphan list, because the previous orphan
  // definition ignored concept_index entirely.
  const { data: cx } = await supabase
    .from("concept_index")
    .select("doc_ids")
    .eq("user_id", userId);
  const conceptCount = new Map<string, number>();
  for (const row of (cx as { doc_ids: string[] | null }[] | null) ?? []) {
    const ids = row.doc_ids || [];
    if (ids.length < 2) continue; // single-doc concept doesn't count as a cross-link
    for (const id of ids) {
      conceptCount.set(id, (conceptCount.get(id) || 0) + 1);
    }
  }
  const conceptLinked = new Set<string>([...conceptCount.keys()]);

  const orphans: OrphanDoc[] = liveDocs
    .filter((d) => !inBundle.has(d.id) && !referenced.has(d.id) && !conceptLinked.has(d.id))
    .map((d) => ({ id: d.id, title: d.title, updatedAt: d.updated_at }));

  // Semantic duplicates. Iterate per doc and look for close neighbors.
  // Symmetric pairs are deduped by always reporting (older, newer).
  const duplicates: DuplicatePair[] = [];
  const seenPairs = new Set<string>();

  // We need each doc's embedding to query nearest neighbors. The RPC
  // takes a query embedding, so we fetch each doc's embedding and call
  // it. For larger hubs a single SQL self-join would be cheaper; v1
  // accepts the N round-trips for clarity.
  const { data: embedded } = await supabase
    .from("documents")
    .select("id, title, embedding")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("embedding", "is", null);

  type EmbeddedRow = { id: string; title: string | null; embedding: number[] | string };
  const embeddings = (embedded as EmbeddedRow[] | null ?? []).filter((d) => d.embedding != null);

  for (const doc of embeddings) {
    const { data: matches } = await supabase.rpc("match_documents_by_embedding", {
      query_embedding: doc.embedding,
      match_count: DUPLICATE_NEIGHBORS + 1, // +1 because the doc itself returns at distance 0
      p_user_id: userId,
      p_anonymous_id: null,
    });
    for (const m of (matches as MatchRow[] | null ?? [])) {
      if (m.id === doc.id) continue;
      if (m.distance > DUPLICATE_DISTANCE_THRESHOLD) continue;
      const pairKey = [doc.id, m.id].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      // Order pair as (older, newer) by sort order of id (proxy for older
      // since nanoid is roughly time-ordered). Good enough for v1.
      const [olderId, newerId] = [doc.id, m.id].sort();
      const olderTitle = olderId === doc.id ? doc.title : m.title;
      const newerTitle = newerId === doc.id ? doc.title : m.title;
      duplicates.push({
        a: { id: olderId, title: olderTitle },
        b: { id: newerId, title: newerTitle },
        distance: m.distance,
      });
    }
  }

  duplicates.sort((p, q) => p.distance - q.distance);

  return {
    computedAt: new Date().toISOString(),
    totalDocs: liveDocs.length,
    orphans,
    duplicates,
  };
}

export function formatLintMarkdown(report: LintReport): string {
  const lines: string[] = ["# Hub lint", ""];
  lines.push(`> Computed at ${report.computedAt}. ${report.totalDocs} live docs.`);
  lines.push("");

  lines.push(`## Orphans (${report.orphans.length})`);
  lines.push("");
  if (report.orphans.length === 0) {
    lines.push("_No orphans. Every doc is either in a bundle or referenced by another doc._");
  } else {
    lines.push("Docs not in any bundle and not linked from any other doc.");
    lines.push("");
    for (const o of report.orphans) {
      const t = o.title || "Untitled";
      lines.push(`- [${t}](https://mdfy.app/${o.id})`);
    }
  }
  lines.push("");

  lines.push(`## Likely duplicates (${report.duplicates.length})`);
  lines.push("");
  if (report.duplicates.length === 0) {
    lines.push("_No close duplicates detected._");
  } else {
    lines.push("Pairs of docs with overlapping semantic content. Consider merging or marking one as the canonical version.");
    lines.push("");
    for (const p of report.duplicates) {
      const aT = p.a.title || "Untitled";
      const bT = p.b.title || "Untitled";
      lines.push(
        `- [${aT}](https://mdfy.app/${p.a.id}) and [${bT}](https://mdfy.app/${p.b.id}). Distance ${p.distance.toFixed(3)}.`,
      );
    }
  }
  lines.push("");

  return lines.join("\n");
}
