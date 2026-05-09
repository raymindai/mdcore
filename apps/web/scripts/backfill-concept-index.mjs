// One-shot backfill: rebuild concept_index + concept_relations from
// every owned bundle that already has graph_data. Safe to re-run.

import { createClient } from "@supabase/supabase-js";

function normalize(label) {
  return (label || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("env missing"); process.exit(1); }
const s = createClient(url, key);

const { data: bundles } = await s
  .from("bundles")
  .select("id, user_id, graph_data")
  .not("graph_data", "is", null)
  .not("user_id", "is", null);
console.log(`Bundles with graph_data: ${bundles.length}`);

let totalConcepts = 0;
let totalRelations = 0;
for (const b of bundles) {
  const { data: bds } = await s.from("bundle_documents").select("document_id").eq("bundle_id", b.id);
  const bundleDocIds = (bds || []).map((r) => r.document_id);
  const graph = b.graph_data || {};
  const conceptNodes = (graph.nodes || []).filter((n) => n.type !== "document" && !n.id?.startsWith("doc:") && !n.id?.startsWith("analysis:"));
  if (conceptNodes.length === 0) continue;

  const idMap = new Map();
  for (const n of conceptNodes) {
    const norm = normalize(n.label);
    if (!norm) continue;
    const conceptType = n.type === "entity" || n.type === "tag" ? n.type : "concept";

    const { data: existing } = await s
      .from("concept_index")
      .select("id, doc_ids, bundle_ids, weight, occurrence_count")
      .eq("user_id", b.user_id)
      .eq("normalized_label", norm)
      .maybeSingle();

    const newDocIds = Array.from(new Set([...(existing?.doc_ids || []), ...bundleDocIds]));
    const newBundleIds = Array.from(new Set([...(existing?.bundle_ids || []), b.id]));
    const newWeight = (existing?.weight || 0) + (n.weight || 1);
    const newOcc = (existing?.occurrence_count || 0) + 1;

    if (existing) {
      await s.from("concept_index").update({
        label: n.label,
        concept_type: conceptType,
        description: n.description || null,
        doc_ids: newDocIds, bundle_ids: newBundleIds,
        weight: newWeight, occurrence_count: newOcc,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      idMap.set(n.id, existing.id);
      totalConcepts++;
    } else {
      const { data: ins } = await s.from("concept_index").insert({
        user_id: b.user_id, label: n.label, normalized_label: norm,
        concept_type: conceptType, weight: n.weight || 1,
        description: n.description || null,
        doc_ids: bundleDocIds, bundle_ids: [b.id], occurrence_count: 1,
      }).select("id").single();
      if (ins) { idMap.set(n.id, ins.id); totalConcepts++; }
    }
  }

  for (const e of graph.edges || []) {
    const sId = idMap.get(e.source);
    const tId = idMap.get(e.target);
    if (!sId || !tId || sId === tId) continue;
    const relLabel = (e.label || "related").trim().toLowerCase();
    const { data: srcRow } = await s.from("concept_index").select("doc_ids").eq("id", sId).single();
    const { data: tgtRow } = await s.from("concept_index").select("doc_ids").eq("id", tId).single();
    const evidence = (srcRow?.doc_ids || []).filter((d) => (tgtRow?.doc_ids || []).includes(d));
    const { data: existRel } = await s.from("concept_relations").select("id, weight, evidence_doc_ids")
      .eq("user_id", b.user_id).eq("source_concept_id", sId).eq("target_concept_id", tId).eq("relation_label", relLabel).maybeSingle();
    if (existRel) {
      const merged = Array.from(new Set([...(existRel.evidence_doc_ids || []), ...evidence]));
      await s.from("concept_relations").update({
        weight: (existRel.weight || 0) + (e.weight || 1),
        evidence_doc_ids: merged,
        updated_at: new Date().toISOString(),
      }).eq("id", existRel.id);
    } else {
      await s.from("concept_relations").insert({
        user_id: b.user_id, source_concept_id: sId, target_concept_id: tId,
        relation_label: relLabel, weight: e.weight || 1, evidence_doc_ids: evidence,
      });
    }
    totalRelations++;
  }
}

console.log(`\nUpserted: ${totalConcepts} concepts, ${totalRelations} relations\n`);

const { data: byUserRows } = await s.from("concept_index").select("user_id");
const counts = {};
for (const r of byUserRows || []) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
console.log("concept_index counts by user:");
for (const [u, n] of Object.entries(counts)) console.log(`  ${u.slice(0, 8)}…  ${n}`);
