// Builder for the hub-level ontology (concept_index + concept_relations).
//
// Called after a bundle's aiGraph is regenerated. Reads the graph's
// nodes/edges and UPSERTs them into the concept_index / concept_relations
// tables, keyed on the user + normalized label so re-running merges
// instead of duplicating.
//
// Idempotent — safe to call from the bundle Analyze flow on every run.

import type { SupabaseClient } from "@supabase/supabase-js";

interface AIGraphNode {
  id: string;
  label: string;
  type?: string;
  weight?: number;
  description?: string;
  documentId?: string;
}
interface AIGraphEdge {
  source: string;
  target: string;
  label?: string;
  weight?: number;
}
interface AIGraphData {
  nodes?: AIGraphNode[];
  edges?: AIGraphEdge[];
}

export function normalizeConceptLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export interface BuildArgs {
  supabase: SupabaseClient;
  userId: string;
  bundleId: string;
  graph: AIGraphData;
  /** All doc IDs in the bundle so we can attribute concepts to them. */
  bundleDocIds: string[];
}

/**
 * Build / update concept_index + concept_relations for one bundle's
 * aiGraph. Concept nodes from the graph map to concept_index rows;
 * concept↔concept edges (excluding doc:* nodes) map to concept_relations.
 */
export async function buildConceptIndex({ supabase, userId, bundleId, graph, bundleDocIds }: BuildArgs): Promise<{ concepts: number; relations: number }> {
  const conceptNodes = (graph.nodes || []).filter((n) => n.type !== "document" && !n.id.startsWith("doc:") && !n.id.startsWith("analysis:"));
  if (conceptNodes.length === 0) return { concepts: 0, relations: 0 };

  // 1. UPSERT each concept node into concept_index.
  // Map graph node.id → concept_index.id so we can wire relations next.
  const idMap = new Map<string, number>();
  let conceptsWritten = 0;
  for (const n of conceptNodes) {
    const norm = normalizeConceptLabel(n.label || "");
    if (!norm) continue;
    const conceptType = n.type === "entity" || n.type === "tag" ? n.type : "concept";

    // Read existing row if any
    const { data: existing } = await supabase
      .from("concept_index")
      .select("id, doc_ids, bundle_ids, weight, occurrence_count")
      .eq("user_id", userId)
      .eq("normalized_label", norm)
      .maybeSingle();

    const newDocIds = Array.from(new Set([...(existing?.doc_ids || []), ...bundleDocIds]));
    const newBundleIds = Array.from(new Set([...(existing?.bundle_ids || []), bundleId]));
    const newWeight = (existing?.weight || 0) + (n.weight || 1);
    const newOccurrence = (existing?.occurrence_count || 0) + 1;

    if (existing) {
      const { error } = await supabase
        .from("concept_index")
        .update({
          label: n.label, // refresh display label to latest extraction
          concept_type: conceptType,
          description: n.description || undefined,
          doc_ids: newDocIds,
          bundle_ids: newBundleIds,
          weight: newWeight,
          occurrence_count: newOccurrence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (!error) {
        idMap.set(n.id, existing.id);
        conceptsWritten++;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("concept_index")
        .insert({
          user_id: userId,
          label: n.label,
          normalized_label: norm,
          concept_type: conceptType,
          weight: n.weight || 1,
          description: n.description || null,
          doc_ids: bundleDocIds,
          bundle_ids: [bundleId],
          occurrence_count: 1,
        })
        .select("id")
        .single();
      if (!error && inserted) {
        idMap.set(n.id, inserted.id);
        conceptsWritten++;
      }
    }
  }

  // 2. UPSERT relations between concepts. Doc-to-concept edges are
  //    represented by doc_ids on the concept row already, so we only
  //    persist concept↔concept edges here.
  let relationsWritten = 0;
  for (const e of graph.edges || []) {
    const srcId = idMap.get(e.source);
    const tgtId = idMap.get(e.target);
    if (!srcId || !tgtId || srcId === tgtId) continue;
    const relLabel = (e.label || "related").trim().toLowerCase();
    // Find evidence: docs that contain BOTH source and target concept.
    const { data: srcRow } = await supabase.from("concept_index").select("doc_ids").eq("id", srcId).single();
    const { data: tgtRow } = await supabase.from("concept_index").select("doc_ids").eq("id", tgtId).single();
    const evidence = (srcRow?.doc_ids || []).filter((d: string) => (tgtRow?.doc_ids || []).includes(d));

    const { data: existingRel } = await supabase
      .from("concept_relations")
      .select("id, weight, evidence_doc_ids")
      .eq("user_id", userId)
      .eq("source_concept_id", srcId)
      .eq("target_concept_id", tgtId)
      .eq("relation_label", relLabel)
      .maybeSingle();

    if (existingRel) {
      const mergedEvidence = Array.from(new Set([...(existingRel.evidence_doc_ids || []), ...evidence]));
      await supabase
        .from("concept_relations")
        .update({
          weight: (existingRel.weight || 0) + (e.weight || 1),
          evidence_doc_ids: mergedEvidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRel.id);
      relationsWritten++;
    } else {
      await supabase.from("concept_relations").insert({
        user_id: userId,
        source_concept_id: srcId,
        target_concept_id: tgtId,
        relation_label: relLabel,
        weight: e.weight || 1,
        evidence_doc_ids: evidence,
      });
      relationsWritten++;
    }
  }

  return { concepts: conceptsWritten, relations: relationsWritten };
}
