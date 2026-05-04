import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { synthesizeBundle, type SynthesisKind } from "@/lib/synthesize";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Synthesize a bundle into a coherent narrative output.
 *
 *   POST /api/bundles/[id]/synthesize
 *   Body: { kind?: "memo" | "faq" | "brief", editToken?, userId?, anonymousId? }
 *
 * The actual synthesis logic lives in lib/synthesize.ts so /api/docs/:id/recompile
 * can reuse it. This route just handles auth + delegates.
 */

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  let body: { kind?: string; editToken?: string; userId?: string; anonymousId?: string };
  try { body = await req.json(); } catch { body = {}; }
  const kind: SynthesisKind = (body.kind === "faq" || body.kind === "brief") ? body.kind : "memo";

  const { data: bundle } = await supabase
    .from("bundles")
    .select("user_id, anonymous_id, edit_token, is_draft")
    .eq("id", id)
    .single();
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (bundle.is_draft) {
    const verified = await verifyAuthToken(req.headers.get("authorization"));
    const userId = body.userId || verified?.userId || req.headers.get("x-user-id") || undefined;
    const anonymousId = body.anonymousId || req.headers.get("x-anonymous-id") || undefined;
    const isOwner =
      !!(userId && bundle.user_id && userId === bundle.user_id) ||
      !!(anonymousId && bundle.anonymous_id && anonymousId === bundle.anonymous_id);
    const hasToken = !!(body.editToken && bundle.edit_token === body.editToken);
    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  try {
    const result = await synthesizeBundle(supabase, id, kind);
    if (!result) return NextResponse.json({ error: "AI synthesis failed" }, { status: 500 });
    return NextResponse.json({
      kind,
      markdown: result.markdown,
      sourceCount: result.sourceDocIds.length,
      sourceDocIds: result.sourceDocIds,
      intent: result.intent,
    });
  } catch (err) {
    console.error("Synthesize error:", err);
    return NextResponse.json({ error: "AI synthesis failed" }, { status: 500 });
  }
}
