import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getServerUserId } from "@/lib/supabase-server";
import { computeHubConceptGraph } from "@/lib/hub-concept-graph";

/**
 * GET /api/user/hub/concepts
 *
 * Owner-only concept graph (concept_index nodes + concept_relations
 * edges with precomputed positions). Sister endpoint to
 * /api/user/hub/graph which is the doc/bundle hub view.
 *
 * Auth fallback: Bearer → x-user-id → Supabase session cookie. The
 * cookie path lets the in-editor HubGraphCanvas (and the public
 * /hub/<slug>/graph viewer) authenticate via `credentials: "include"`
 * without threading bearer tokens explicitly.
 */
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id") || (await getServerUserId());
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  try {
    const graph = await computeHubConceptGraph(supabase, userId);
    return NextResponse.json(graph);
  } catch (err) {
    console.error("hub concept graph error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
