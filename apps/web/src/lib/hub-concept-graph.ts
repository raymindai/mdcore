import type { SupabaseClient } from "@supabase/supabase-js";

// Hub-level CONCEPT graph builder.
//
// The doc/bundle hub graph already lives in lib/hub-graph.ts. This is
// its semantic twin: nodes are concepts (concept_index) and edges are
// the user's ontology relations (concept_relations). Used by
// /hub/<slug>/graph?view=concepts to render the user's whole knowledge
// graph at once.
//
// Position is precomputed server-side so the client renders without a
// force simulation. Layout: spring-relaxed concentric — high-weight
// (most-mentioned) concepts get pulled toward the centre, neighbors
// pull each other in, and the result is a constellation where
// densely-connected groups visibly cluster.

const MAX_CONCEPTS = 200;
const MAX_RELATIONS = 800;
const ITERATIONS = 260;
const REPULSION = 6500;
const SPRING_K = 0.06;
const SPRING_LEN = 110;
const CENTER_PULL = 0.0055;
// Hard bounds so a runaway force pass can't shoot nodes off-canvas.
// Viewer's viewBox is -600..600 / -500..500; clamp slightly inside.
const BOUND_X = 460;
const BOUND_Y = 360;
// Default rendering policy: ONLY show concepts with at least one
// relation. Isolated concepts (occurrence in just one doc, no cross-
// doc edges) dominated the canvas as fireworks of unrelated points
// and made the graph unreadable. Owners can still see them in the
// list views; the graph is for showing STRUCTURE.
const HIDE_ISOLATED = true;

export interface HubConceptNode {
  id: number;
  label: string;
  conceptType: string | null;
  description: string | null;
  weight: number;
  occurrenceCount: number;
  docIds: string[];
  bundleIds: string[];
  x: number;
  y: number;
  /** rank-based size hint, 1.0 = smallest visible, ~3.0 = largest. */
  size: number;
}

export interface HubConceptEdge {
  source: number;
  target: number;
  relationLabel: string;
  weight: number;
}

export interface HubConceptGraph {
  nodes: HubConceptNode[];
  edges: HubConceptEdge[];
  totals: {
    /** Concepts shown on the canvas (= structural ones with at least one relation). */
    concepts: number;
    /** Concepts that exist in the user's hub but were filtered out for being isolated. */
    hiddenIsolated: number;
    relations: number;
    docs: number;
  };
  computedAt: string;
}

interface ConceptRow {
  id: number;
  label: string;
  concept_type: string | null;
  description: string | null;
  weight: number;
  occurrence_count: number;
  doc_ids: string[] | null;
  bundle_ids: string[] | null;
}

interface RelationRow {
  source_concept_id: number;
  target_concept_id: number;
  relation_label: string;
  weight: number;
}

export async function computeHubConceptGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<HubConceptGraph> {
  const [conceptsRes, relationsRes] = await Promise.all([
    supabase
      .from("concept_index")
      .select("id, label, concept_type, description, weight, occurrence_count, doc_ids, bundle_ids")
      .eq("user_id", userId)
      .order("weight", { ascending: false })
      .limit(MAX_CONCEPTS),
    supabase
      .from("concept_relations")
      .select("source_concept_id, target_concept_id, relation_label, weight")
      .eq("user_id", userId)
      .order("weight", { ascending: false })
      .limit(MAX_RELATIONS),
  ]);

  const concepts = (conceptsRes.data as ConceptRow[] | null) ?? [];
  const relations = (relationsRes.data as RelationRow[] | null) ?? [];

  const conceptIds = new Set(concepts.map((c) => c.id));
  const validRelations = relations.filter(
    (r) => conceptIds.has(r.source_concept_id) && conceptIds.has(r.target_concept_id) && r.source_concept_id !== r.target_concept_id,
  );

  // Precompute size buckets — log-scaled so a few hot concepts don't
  // dwarf the rest.
  const maxOcc = Math.max(...concepts.map((c) => c.occurrence_count || 1), 1);
  const sizeFor = (occ: number) => 1 + Math.log2((occ || 1) + 1) / Math.log2(maxOcc + 1) * 2;

  // Build adjacency. Concepts with at least one relation are the
  // "structural" set we render. Isolated concepts are dropped from
  // the graph entirely (default policy) — they live in the list
  // views, the graph shows STRUCTURE, not inventory.
  const neighborMap = new Map<number, Array<{ other: number; weight: number }>>();
  for (const r of validRelations) {
    if (!neighborMap.has(r.source_concept_id)) neighborMap.set(r.source_concept_id, []);
    if (!neighborMap.has(r.target_concept_id)) neighborMap.set(r.target_concept_id, []);
    neighborMap.get(r.source_concept_id)!.push({ other: r.target_concept_id, weight: r.weight || 1 });
    neighborMap.get(r.target_concept_id)!.push({ other: r.source_concept_id, weight: r.weight || 1 });
  }
  const visibleConcepts = HIDE_ISOLATED
    ? concepts.filter((c) => neighborMap.has(c.id))
    : concepts;
  const visibleConceptIdSet = new Set(visibleConcepts.map((c) => c.id));
  const visibleRelations = validRelations.filter(
    (r) => visibleConceptIdSet.has(r.source_concept_id) && visibleConceptIdSet.has(r.target_concept_id),
  );

  // Initial positions: gentle spiral seeded near the centre, ordered
  // by occurrence_count desc so high-signal concepts start closest to
  // origin where they'll settle as the cluster's anchors.
  const positions: Record<number, { x: number; y: number; vx: number; vy: number }> = {};
  const golden = Math.PI * (3 - Math.sqrt(5));
  const seedOrder = [...visibleConcepts].sort((a, b) => b.occurrence_count - a.occurrence_count);
  seedOrder.forEach((c, i) => {
    const r = 25 + i * 5;
    const a = i * golden;
    positions[c.id] = { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 };
  });

  // Force simulation. Repulsion is pairwise n² which is fine at the
  // visible-concept counts we're dealing with (typically <50 once
  // isolated nodes are filtered out).
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const damping = 0.88 - (iter / ITERATIONS) * 0.45;
    for (let i = 0; i < visibleConcepts.length; i++) {
      const a = visibleConcepts[i];
      const pa = positions[a.id];
      for (let j = i + 1; j < visibleConcepts.length; j++) {
        const b = visibleConcepts[j];
        const pb = positions[b.id];
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist2 = Math.max(dx * dx + dy * dy, 25);
        const force = REPULSION / dist2;
        const dist = Math.sqrt(dist2);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        pa.vx += fx; pa.vy += fy;
        pb.vx -= fx; pb.vy -= fy;
      }
    }
    // Spring attraction along edges, scaled by relation weight.
    for (const r of visibleRelations) {
      const pa = positions[r.source_concept_id];
      const pb = positions[r.target_concept_id];
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const force = (dist - SPRING_LEN) * SPRING_K * Math.min(r.weight || 1, 3);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      pa.vx += fx; pa.vy += fy;
      pb.vx -= fx; pb.vy -= fy;
    }
    // Centre pull + integrate + clamp to canvas bounds so no node ever
    // shoots off-screen even with high-velocity pairs.
    for (const c of visibleConcepts) {
      const p = positions[c.id];
      p.vx -= p.x * CENTER_PULL;
      p.vy -= p.y * CENTER_PULL;
      p.x += p.vx * damping;
      p.y += p.vy * damping;
      p.vx *= damping;
      p.vy *= damping;
      if (p.x > BOUND_X) { p.x = BOUND_X; p.vx = 0; }
      if (p.x < -BOUND_X) { p.x = -BOUND_X; p.vx = 0; }
      if (p.y > BOUND_Y) { p.y = BOUND_Y; p.vy = 0; }
      if (p.y < -BOUND_Y) { p.y = -BOUND_Y; p.vy = 0; }
    }
  }

  const allDocs = new Set<string>();
  for (const c of visibleConcepts) for (const id of c.doc_ids || []) allDocs.add(id);

  const nodes: HubConceptNode[] = visibleConcepts.map((c) => ({
    id: c.id,
    label: c.label,
    conceptType: c.concept_type,
    description: c.description,
    weight: c.weight,
    occurrenceCount: c.occurrence_count,
    docIds: c.doc_ids || [],
    bundleIds: c.bundle_ids || [],
    x: positions[c.id].x,
    y: positions[c.id].y,
    size: sizeFor(c.occurrence_count),
  }));

  const edges: HubConceptEdge[] = visibleRelations.map((r) => ({
    source: r.source_concept_id,
    target: r.target_concept_id,
    relationLabel: r.relation_label,
    weight: r.weight,
  }));

  return {
    nodes,
    edges,
    totals: {
      concepts: visibleConcepts.length,
      hiddenIsolated: concepts.length - visibleConcepts.length,
      relations: edges.length,
      docs: allDocs.size,
    },
    computedAt: new Date().toISOString(),
  };
}
