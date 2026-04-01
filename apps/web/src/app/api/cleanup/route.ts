import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Comprehensive cleanup of orphaned data.
 *
 * 1. Anonymous drafts older than 7 days (no user_id, is_draft=true)
 * 2. Orphaned notifications (document deleted but notification remains)
 * 3. Orphaned visit_history (document deleted but visit remains)
 * 4. Empty documents (markdown is empty or just whitespace, older than 1 day)
 *
 * Protected by CLEANUP_SECRET env var.
 * Intended for cron (e.g., Vercel Cron daily).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CLEANUP_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const results: Record<string, number> = {};

  // 1. Delete orphaned anonymous drafts older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orphanedDrafts } = await supabase
    .from("documents")
    .select("id")
    .eq("is_draft", true)
    .is("user_id", null)
    .lt("updated_at", sevenDaysAgo);

  if (orphanedDrafts && orphanedDrafts.length > 0) {
    const ids = orphanedDrafts.map((d) => d.id);
    // Delete related data first
    await supabase.from("visit_history").delete().in("document_id", ids);
    await supabase.from("notifications").delete().in("document_id", ids);
    await supabase.from("document_versions").delete().in("document_id", ids);
    await supabase.from("documents").delete().in("id", ids);
    results.orphanedDrafts = ids.length;
  } else {
    results.orphanedDrafts = 0;
  }

  // 2. Delete orphaned notifications (document_id references non-existent document)
  const { data: allNotifs } = await supabase
    .from("notifications")
    .select("id, document_id, documents(id)")
    .limit(500);

  if (allNotifs) {
    const orphanedNotifIds = allNotifs
      .filter((n) => {
        const doc = n.documents as unknown as { id: string } | null;
        return !doc;
      })
      .map((n) => n.id);

    if (orphanedNotifIds.length > 0) {
      await supabase.from("notifications").delete().in("id", orphanedNotifIds);
    }
    results.orphanedNotifications = orphanedNotifIds.length;
  } else {
    results.orphanedNotifications = 0;
  }

  // 3. Delete orphaned visit_history (document_id references non-existent document)
  const { data: allVisits } = await supabase
    .from("visit_history")
    .select("id, document_id, documents(id)")
    .limit(500);

  if (allVisits) {
    const orphanedVisitIds = allVisits
      .filter((v) => {
        const doc = v.documents as unknown as { id: string } | null;
        return !doc;
      })
      .map((v) => v.id);

    if (orphanedVisitIds.length > 0) {
      await supabase.from("visit_history").delete().in("id", orphanedVisitIds);
    }
    results.orphanedVisits = orphanedVisitIds.length;
  } else {
    results.orphanedVisits = 0;
  }

  // 4. Delete empty documents older than 1 day (markdown is null, empty, or just whitespace/heading)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: emptyDocs } = await supabase
    .from("documents")
    .select("id, markdown")
    .lt("updated_at", oneDayAgo)
    .limit(200);

  if (emptyDocs) {
    const emptyIds = emptyDocs
      .filter((d) => {
        const md = (d.markdown || "").trim();
        return !md || md === "# Untitled" || md === "# Untitled\n\n" || md.length < 10;
      })
      .map((d) => d.id);

    if (emptyIds.length > 0) {
      await supabase.from("visit_history").delete().in("document_id", emptyIds);
      await supabase.from("notifications").delete().in("document_id", emptyIds);
      await supabase.from("document_versions").delete().in("document_id", emptyIds);
      await supabase.from("documents").delete().in("id", emptyIds);
    }
    results.emptyDocuments = emptyIds.length;
  } else {
    results.emptyDocuments = 0;
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);

  return NextResponse.json({ ok: true, total, ...results });
}
