import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Cleanup orphaned anonymous documents.
 * Deletes documents where:
 * - user_id IS NULL (never migrated to an account)
 * - updated_at < 7 days ago (no activity for 7 days)
 *
 * Logged-in users' documents (user_id IS NOT NULL) are NEVER deleted.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("documents")
    .delete()
    .is("user_id", null)
    .lt("updated_at", sevenDaysAgo)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: data?.length || 0,
  });
}
