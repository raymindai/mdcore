import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/user/hub/pulse
//
// The data layer behind the Start screen's Hub Pulse panel. Returns
// 365 daily activity buckets (captures + edits), the user's current
// + longest streak, and aggregate totals (docs / views) used in the
// header strip.
//
// "Activity on day D" = at least one of:
//   - document created with created_at::date = D
//   - document updated with updated_at::date = D (and != created_at)
//   - bundle created on D
// Pull from documents + bundles tables directly (cheap aggregation,
// no need to scan hub_log which is broader and noisier).

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  return verified?.userId || req.headers.get("x-user-id") || null;
}

function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  // 365-day window ending today (UTC). Heatmap fixes orientation by
  // day-of-week, so we build the array oldest → newest.
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 364));
  const startIso = start.toISOString();

  // Fetch user's docs (created + last update) within the window.
  // Order doesn't matter — we aggregate by day in JS.
  const { data: docs, error: docErr } = await supabase
    .from("documents")
    .select("id, created_at, updated_at, view_count, deleted_at")
    .eq("user_id", userId)
    .gte("created_at", startIso);

  if (docErr) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Also catch edits to older docs (created before the window) that
  // still landed in the window — that's the user actually working
  // today even if the doc itself is months old.
  const { data: editedOlder } = await supabase
    .from("documents")
    .select("id, updated_at")
    .eq("user_id", userId)
    .lt("created_at", startIso)
    .gte("updated_at", startIso);

  // Bundles: a created-day counts as activity too. (bundle_documents
  // links don't carry their own activity date worth showing.)
  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, created_at")
    .eq("user_id", userId)
    .gte("created_at", startIso);

  // Build day → count map.
  const counts = new Map<string, number>();
  const bump = (iso: string | null | undefined) => {
    if (!iso) return;
    const day = iso.slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  };

  for (const d of docs || []) {
    bump(d.created_at);
    // Edit on a different day than creation also counts.
    if (d.updated_at && d.updated_at.slice(0, 10) !== d.created_at?.slice(0, 10)) {
      bump(d.updated_at);
    }
  }
  for (const d of editedOlder || []) bump(d.updated_at);
  for (const b of bundles || []) bump(b.created_at);

  // Materialise the 365 day array (oldest first, today last).
  const days: { date: string; count: number }[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const key = ymd(d);
    days.push({ date: key, count: counts.get(key) || 0 });
  }

  // Streaks: walk back from today.
  const today = ymd(now);
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak++;
    else if (days[i].date !== today) break; // today blank doesn't break; yesterday blank does
    else continue;
  }
  // Re-derive longest streak across the window.
  let longestStreak = 0;
  let run = 0;
  for (const day of days) {
    if (day.count > 0) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // Aggregate totals — used for the header strip + thesis-validation
  // surface ("your docs were viewed N times").
  const { count: totalDocs } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  const totalViews = (docs || []).reduce((s, d) => s + (d.view_count || 0), 0);

  return NextResponse.json({
    days,
    currentStreak,
    longestStreak,
    totalDocs: totalDocs || 0,
    totalViews,
    windowStart: ymd(start),
    windowEnd: today,
  });
}
