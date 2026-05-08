import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hub-level graph builder (W9).
 *
 * Bundle-level graphs already exist via /api/bundles/[id]/graph.
 * This is the hub overview: every doc and every bundle the user
 * owns, joined by membership edges (bundle -> docs) and semantic
 * edges (doc <-> doc when their embeddings are close enough that
 * the user is likely thinking about related material).
 *
 * Nodes carry a precomputed (x, y) so the client can render the
 * graph immediately without running a force simulation. We use a
 * spring layout that anchors bundles in a ring and lets docs orbit
 * the bundle they belong to (or the centre when orphaned).
 */

const SEMANTIC_THRESHOLD = 0.42;
const SEMANTIC_NEIGHBOR_FETCH = 6;
const MAX_DOC_NODES = 200;
const MAX_BUNDLE_NODES = 30;

export interface HubGraphNode {
  id: string;
  type: "doc" | "bundle";
  label: string;
  /** When type=doc, the bundle this doc belongs to (first match) for layout grouping. */
  groupBundleId?: string | null;
  url: string;
  x: number;
  y: number;
  weight: number;
}

export interface HubGraphEdge {
  source: string;
  target: string;
  type: "bundle_member" | "semantic";
  weight: number;
}

export interface HubGraph {
  nodes: HubGraphNode[];
  edges: HubGraphEdge[];
  totals: { docs: number; bundles: number; semanticEdges: number };
  computedAt: string;
}

interface DocRow {
  id: string;
  title: string | null;
  embedding: number[] | string | null;
}

interface BundleRow {
  id: string;
  title: string | null;
}

interface BundleDocRow {
  bundle_id: string;
  document_id: string;
}

interface MatchRow {
  id: string;
  distance: number;
}

export async function computeHubGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<HubGraph> {
  const [docsRes, bundlesRes, bundleDocsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, embedding")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("is_draft", false)
      .order("updated_at", { ascending: false })
      .limit(MAX_DOC_NODES),
    supabase
      .from("bundles")
      .select("id, title")
      .eq("user_id", userId)
      .eq("is_draft", false)
      .order("updated_at", { ascending: false })
      .limit(MAX_BUNDLE_NODES),
    supabase
      .from("bundle_documents")
      .select("bundle_id, document_id"),
  ]);

  const docs = (docsRes.data as DocRow[] | null) ?? [];
  const bundles = (bundlesRes.data as BundleRow[] | null) ?? [];
  const allBundleDocs = (bundleDocsRes.data as BundleDocRow[] | null) ?? [];

  const bundleIdSet = new Set(bundles.map((b) => b.id));
  const docIdSet = new Set(docs.map((d) => d.id));
  const bundleDocs = allBundleDocs.filter(
    (bd) => bundleIdSet.has(bd.bundle_id) && docIdSet.has(bd.document_id),
  );

  // First-bundle membership for layout grouping. A doc that's in
  // multiple bundles still gets one anchor; the membership edges
  // capture all of its bundle relationships.
  const firstBundleByDoc = new Map<string, string>();
  for (const bd of bundleDocs) {
    if (!firstBundleByDoc.has(bd.document_id)) firstBundleByDoc.set(bd.document_id, bd.bundle_id);
  }

  // Layout: bundles distributed on an outer ring, docs orbiting
  // their bundle (or the centre when orphaned).
  const RING_R = 380;
  const ORBIT_R = 110;
  const N_B = Math.max(bundles.length, 1);
  const bundlePos = new Map<string, { x: number; y: number; angle: number }>();
  bundles.forEach((b, i) => {
    const angle = (i / N_B) * Math.PI * 2;
    bundlePos.set(b.id, { x: Math.cos(angle) * RING_R, y: Math.sin(angle) * RING_R, angle });
  });

  const docsPerBundle = new Map<string, number>();
  for (const d of docs) {
    const b = firstBundleByDoc.get(d.id);
    docsPerBundle.set(b ?? "__orphan", (docsPerBundle.get(b ?? "__orphan") ?? 0) + 1);
  }
  const docIndexInBundle = new Map<string, number>();
  const orphanCount = docsPerBundle.get("__orphan") ?? 0;

  const nodes: HubGraphNode[] = [];
  for (const b of bundles) {
    const p = bundlePos.get(b.id)!;
    nodes.push({
      id: b.id,
      type: "bundle",
      label: b.title || "Untitled bundle",
      url: `/b/${b.id}`,
      x: p.x,
      y: p.y,
      weight: docsPerBundle.get(b.id) ?? 0,
    });
  }

  let orphanIdx = 0;
  for (const d of docs) {
    const bId = firstBundleByDoc.get(d.id);
    let x = 0, y = 0;
    if (bId && bundlePos.has(bId)) {
      const p = bundlePos.get(bId)!;
      const seen = docIndexInBundle.get(bId) ?? 0;
      const total = docsPerBundle.get(bId) ?? 1;
      // Spread orbits around the bundle anchor; offset by bundle angle so
      // orbits don't all share the same arc.
      const orbitAngle = p.angle + (seen / Math.max(total, 1)) * Math.PI * 2;
      x = p.x + Math.cos(orbitAngle) * ORBIT_R;
      y = p.y + Math.sin(orbitAngle) * ORBIT_R;
      docIndexInBundle.set(bId, seen + 1);
    } else {
      // Orphan ring inside the bundle ring.
      const a = (orphanIdx / Math.max(orphanCount, 1)) * Math.PI * 2;
      x = Math.cos(a) * 90;
      y = Math.sin(a) * 90;
      orphanIdx++;
    }
    nodes.push({
      id: d.id,
      type: "doc",
      label: d.title || "Untitled",
      groupBundleId: bId ?? null,
      url: `/${d.id}`,
      x,
      y,
      weight: 1,
    });
  }

  const edges: HubGraphEdge[] = [];
  for (const bd of bundleDocs) {
    edges.push({ source: bd.bundle_id, target: bd.document_id, type: "bundle_member", weight: 2 });
  }

  // Semantic edges between docs. Iterate per doc, pull nearest
  // neighbors, accept the closest few that pass threshold and
  // aren't already linked through a bundle membership we just added.
  let semanticEdges = 0;
  const seenPairs = new Set<string>();
  for (const d of docs) {
    if (!d.embedding) continue;
    const embeddingLiteral = Array.isArray(d.embedding)
      ? `[${d.embedding.join(",")}]`
      : (d.embedding as string);
    const { data: matches } = await supabase.rpc("match_documents_by_embedding", {
      query_embedding: embeddingLiteral,
      match_count: SEMANTIC_NEIGHBOR_FETCH + 1,
      p_user_id: userId,
      p_anonymous_id: null,
    });
    for (const m of (matches as MatchRow[] | null) ?? []) {
      if (m.id === d.id) continue;
      if (m.distance > SEMANTIC_THRESHOLD) continue;
      if (!docIdSet.has(m.id)) continue;
      const pair = [d.id, m.id].sort().join("|");
      if (seenPairs.has(pair)) continue;
      seenPairs.add(pair);
      const [a, b] = [d.id, m.id].sort();
      edges.push({ source: a, target: b, type: "semantic", weight: 1 - m.distance });
      semanticEdges++;
    }
  }

  return {
    nodes,
    edges,
    totals: { docs: docs.length, bundles: bundles.length, semanticEdges },
    computedAt: new Date().toISOString(),
  };
}
