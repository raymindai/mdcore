import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { computeLintReport } from "@/lib/hub-lint";

/**
 * GET /api/user/hub/lint
 *
 * Returns the lint report for the authenticated user's hub. Owner-only.
 * Lint is computed on demand; the response is not cached server-side.
 * Callers that want to display "the same report later" should snapshot
 * the response themselves.
 *
 * Karpathy-shaped public surface lives at /raw/hub/<slug>/lint.md for
 * AI fetchers.
 */
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  try {
    const report = await computeLintReport(supabase, userId);
    return NextResponse.json(report);
  } catch (err) {
    console.error("Lint compute error:", err);
    return NextResponse.json({ error: "Lint failed" }, { status: 500 });
  }
}
