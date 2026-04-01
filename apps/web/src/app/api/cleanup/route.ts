import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Cleanup orphaned draft documents.
 * Deletes drafts that:
 * - have is_draft = true
 * - have no user_id (anonymous)
 * - were last updated more than 7 days ago
 *
 * Intended to be called by a cron job (e.g., Vercel Cron).
 * Protected by a secret key in the Authorization header.
 */
export async function POST(req: NextRequest) {
  // Simple auth: check for cleanup secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CLEANUP_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Delete orphaned anonymous drafts older than 7 days
  const { data: orphanedDrafts, error: fetchError } = await supabase
    .from("documents")
    .select("id")
    .eq("is_draft", true)
    .is("user_id", null)
    .lt("updated_at", sevenDaysAgo);

  if (fetchError) {
    return NextResponse.json({ error: "Failed to query" }, { status: 500 });
  }

  const ids = (orphanedDrafts || []).map((d) => d.id);
  if (ids.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .in("id", ids);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length, ids });
}
