// Owner-only AI curation suggestions for the hub. Computed
// heuristically from concept_index + concept_relations + bundle
// membership — no LLM call, runs in milliseconds.
//
// Three buckets:
//   - promote:    drafts that share concepts with already-public docs
//   - bundle:     concepts mentioned in ≥3 unbundled docs (cluster)
//   - thin:       concepts mentioned in only 1 doc that have rich
//                 neighbors elsewhere (signal: this idea is
//                 underexplored, expand it)
//
// All three are actionable from the Hub view: Promote → publish doc;
// Bundle → open BundleCreator pre-filled; Thin → open the sole doc
// + show the related concepts inline.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getServerUserId } from "@/lib/supabase-server";

type RouteParams = { params: Promise<{ slug: string }> };

interface PromoteSuggestion {
  type: "promote";
  docId: string;
  title: string;
  sharedConcepts: string[];
}
interface BundleSuggestion {
  type: "bundle";
  concept: string;
  docIds: string[];
  docTitles: string[];
}
interface ThinSuggestion {
  type: "thin";
  concept: string;
  docId: string;
  docTitle: string;
  neighbors: string[];
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "service unavailable" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const callerUserId = verified?.userId || req.headers.get("x-user-id") || (await getServerUserId());
  if (!callerUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("hub_slug", slug)
    .single();
  if (!profile || profile.id !== callerUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [conceptsRes, relationsRes, docsRes, bundleDocsRes] = await Promise.all([
    supabase
      .from("concept_index")
      .select("id, label, doc_ids, occurrence_count")
      .eq("user_id", profile.id)
      .limit(500),
    supabase
      .from("concept_relations")
      .select("source_concept_id, target_concept_id")
      .eq("user_id", profile.id)
      .limit(2000),
    supabase
      .from("documents")
      .select("id, title, is_draft")
      .eq("user_id", profile.id)
      .is("deleted_at", null)
      .limit(1000),
    supabase
      .from("bundle_documents")
      .select("document_id"),
  ]);

  const concepts = conceptsRes.data || [];
  const relations = relationsRes.data || [];
  const docs = docsRes.data || [];
  const bundleDocs = bundleDocsRes.data || [];

  const docMap = new Map<string, { id: string; title: string; isDraft: boolean }>();
  for (const d of docs) docMap.set(d.id, { id: d.id, title: d.title || "Untitled", isDraft: !!d.is_draft });
  const bundledDocIds = new Set(bundleDocs.map((b) => b.document_id));

  // Build label index for relations → neighbor lookup.
  const conceptById = new Map<number, { id: number; label: string; doc_ids: string[]; occurrence_count: number }>();
  for (const c of concepts) conceptById.set(c.id, c);
  const neighborMap = new Map<number, Set<number>>();
  for (const r of relations) {
    if (!neighborMap.has(r.source_concept_id)) neighborMap.set(r.source_concept_id, new Set());
    if (!neighborMap.has(r.target_concept_id)) neighborMap.set(r.target_concept_id, new Set());
    neighborMap.get(r.source_concept_id)!.add(r.target_concept_id);
    neighborMap.get(r.target_concept_id)!.add(r.source_concept_id);
  }

  // ── Suggestion: Promote drafts sharing concepts with published docs.
  const publishedConceptsByDoc = new Map<string, string[]>();
  const draftConceptsByDoc = new Map<string, string[]>();
  for (const c of concepts) {
    for (const docId of c.doc_ids || []) {
      const doc = docMap.get(docId);
      if (!doc) continue;
      const target = doc.isDraft ? draftConceptsByDoc : publishedConceptsByDoc;
      if (!target.has(docId)) target.set(docId, []);
      target.get(docId)!.push(c.label);
    }
  }
  const allPublishedConceptLabels = new Set<string>();
  for (const labels of publishedConceptsByDoc.values()) for (const l of labels) allPublishedConceptLabels.add(l);

  const promote: PromoteSuggestion[] = [];
  for (const [draftId, labels] of draftConceptsByDoc) {
    const overlap = labels.filter((l) => allPublishedConceptLabels.has(l));
    if (overlap.length >= 2) {
      const doc = docMap.get(draftId);
      if (doc) promote.push({ type: "promote", docId: draftId, title: doc.title, sharedConcepts: overlap.slice(0, 3) });
    }
  }
  promote.sort((a, b) => b.sharedConcepts.length - a.sharedConcepts.length);

  // ── Suggestion: Bundle clusters of unbundled docs sharing a concept.
  const bundleSuggestions: BundleSuggestion[] = [];
  const seenBundleConcepts = new Set<string>();
  const sortedConcepts = [...concepts].sort((a, b) => b.occurrence_count - a.occurrence_count);
  for (const c of sortedConcepts) {
    if (seenBundleConcepts.has(c.label.toLowerCase())) continue;
    const conceptDocIds = (c.doc_ids || []).filter((id) => docMap.has(id));
    if (conceptDocIds.length < 3) continue;
    const unbundled = conceptDocIds.filter((id) => !bundledDocIds.has(id));
    if (unbundled.length < 3) continue;
    bundleSuggestions.push({
      type: "bundle",
      concept: c.label,
      docIds: unbundled.slice(0, 8),
      docTitles: unbundled.slice(0, 3).map((id) => docMap.get(id)?.title || "Untitled"),
    });
    seenBundleConcepts.add(c.label.toLowerCase());
    if (bundleSuggestions.length >= 5) break;
  }

  // ── Suggestion: Thin concepts (1-doc) with rich neighbors.
  const thin: ThinSuggestion[] = [];
  for (const c of sortedConcepts) {
    if ((c.doc_ids || []).length !== 1) continue;
    const docId = c.doc_ids![0];
    const doc = docMap.get(docId);
    if (!doc) continue;
    const neighbors = neighborMap.get(c.id);
    if (!neighbors || neighbors.size < 2) continue;
    const neighborLabels: string[] = [];
    for (const nid of neighbors) {
      const n = conceptById.get(nid);
      if (n && (n.doc_ids || []).length >= 2) neighborLabels.push(n.label);
      if (neighborLabels.length >= 3) break;
    }
    if (neighborLabels.length < 2) continue;
    thin.push({ type: "thin", concept: c.label, docId, docTitle: doc.title, neighbors: neighborLabels });
    if (thin.length >= 4) break;
  }

  return NextResponse.json({
    promote: promote.slice(0, 5),
    bundles: bundleSuggestions,
    thin,
  });
}
