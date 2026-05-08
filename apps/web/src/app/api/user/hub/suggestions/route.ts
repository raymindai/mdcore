import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { runSuggestionPass, type SuggestionRow } from "@/lib/hub-suggestions";

/**
 * GET  /api/user/hub/suggestions       List open suggestions, newest first.
 * POST /api/user/hub/suggestions       Force a refresh (bypasses throttle).
 *
 * Auth required. Owner-only.
 */
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("hub_suggestions")
    .select("id, type, title, reason, doc_ids, status, accepted_bundle_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });

  return NextResponse.json({ suggestions: (data as SuggestionRow[] | null) ?? [] });
}

export async function POST(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const created = await runSuggestionPass(supabase, userId);
  await supabase
    .from("hub_suggestion_runs")
    .upsert({ user_id: userId, last_run_at: new Date().toISOString() });
  return NextResponse.json({ ran: true, created });
}
