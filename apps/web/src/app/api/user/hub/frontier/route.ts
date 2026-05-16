import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/user/hub/frontier
//
// Data for Layer 3 of the Start screen — surfaces where the user's
// hub is currently *growing*. Three sections:
//
//   1. newConcepts     — concepts that first appeared in the last 7 days,
//                        ordered by occurrence_count (faster-growing ones first).
//                        "Your hub is leaning into these topics."
//
//   2. bundleHints     — open bundle suggestions from hub_suggestions
//                        (already maintained by the suggestion pass).
//                        "These N docs share a theme — group them?"
//
//   3. gaps            — concepts mentioned in many docs but with no
//                        dedicated doc whose title matches. Surfaces
//                        the natural next-capture target.
//                        "You keep referencing X but never wrote it up."
//
// Owner-only. Pulls existing tables, no schema changes.

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  return verified?.userId || req.headers.get("x-user-id") || null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // ─── New concepts (last 7d) ───
  const { data: newConcepts } = await supabase
    .from("concept_index")
    .select("id, label, concept_type, description, occurrence_count, doc_ids, created_at")
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo)
    .order("occurrence_count", { ascending: false })
    .limit(8);

  // ─── Bundle hints (already-computed open suggestions) ───
  const { data: hints } = await supabase
    .from("hub_suggestions")
    .select("id, type, title, reason, doc_ids, created_at")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(5);

  // ─── Gaps: high-occurrence concepts without a matching doc title ───
  // "Matching" = case-insensitive substring either direction. Coarse
  // on purpose — the goal is to surface candidates, not be a SQL puzzle.
  // We pull the top-weight concepts that have not been used as a doc title.
  const { data: heavyConcepts } = await supabase
    .from("concept_index")
    .select("id, label, occurrence_count, doc_ids")
    .eq("user_id", userId)
    .gte("occurrence_count", 4)
    .order("occurrence_count", { ascending: false })
    .limit(30);

  const conceptLabels = (heavyConcepts || []).map((c) => c.label);
  let gaps: Array<{ label: string; occurrence: number; docCount: number }> = [];
  if (conceptLabels.length > 0) {
    const { data: docTitles } = await supabase
      .from("documents")
      .select("title")
      .eq("user_id", userId)
      .is("deleted_at", null);
    const titles = ((docTitles as { title: string | null }[] | null) || [])
      .map((d) => (d.title || "").toLowerCase());
    gaps = (heavyConcepts || [])
      .filter((c) => {
        const label = c.label.toLowerCase();
        return !titles.some((t) => t.includes(label) || label.includes(t));
      })
      .slice(0, 5)
      .map((c) => ({
        label: c.label,
        occurrence: c.occurrence_count,
        docCount: (c.doc_ids || []).length,
      }));
  }

  return NextResponse.json({
    newConcepts: (newConcepts || []).map((c) => ({
      id: c.id,
      label: c.label,
      type: c.concept_type,
      description: c.description,
      occurrence: c.occurrence_count,
      docCount: (c.doc_ids || []).length,
      createdAt: c.created_at,
    })),
    bundleHints: (hints || []).map((h) => ({
      id: h.id,
      type: h.type,
      title: h.title,
      reason: h.reason,
      docCount: (h.doc_ids || []).length,
    })),
    gaps,
  });
}
