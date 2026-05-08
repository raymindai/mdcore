import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { computeSuggestedQueries } from "@/lib/hub-suggested-queries";

/**
 * GET /api/user/hub/suggested-queries
 *
 * Returns a fresh batch of 5 suggested questions for the owner. Owner-only.
 * Computed on demand; the public Karpathy-shaped surface
 * /raw/hub/<slug>/suggested-queries.md is the cached counterpart.
 */
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  try {
    const report = await computeSuggestedQueries(supabase, userId);
    return NextResponse.json(report);
  } catch (err) {
    console.error("suggested-queries compute error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
