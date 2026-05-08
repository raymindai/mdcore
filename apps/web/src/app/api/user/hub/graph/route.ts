import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { computeHubGraph } from "@/lib/hub-graph";

/**
 * GET /api/user/hub/graph
 *
 * Owner-only hub graph (nodes + edges + precomputed positions).
 * Computed on demand. The bundle-level graph still lives at
 * /api/bundles/[id]/graph; this is the hub overview.
 */
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  try {
    const graph = await computeHubGraph(supabase, userId);
    return NextResponse.json(graph);
  } catch (err) {
    console.error("hub graph error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
