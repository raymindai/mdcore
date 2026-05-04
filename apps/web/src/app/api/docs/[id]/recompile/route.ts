import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { synthesizeBundle, type SynthesisKind } from "@/lib/synthesize";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Re-run the original synthesis that produced this compiled doc.
 *
 *   POST /api/docs/[id]/recompile
 *   Body: { editToken?, userId?, anonymousId? }
 *
 * Reads the doc's compile_from + compile_kind, calls synthesizeBundle()
 * against the (possibly-updated) source bundle, then overwrites the doc's
 * markdown and bumps compiled_at.
 *
 * Returns 400 if the doc isn't a compiled entry, 404 if its source bundle
 * was deleted.
 */

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  let body: { editToken?: string; userId?: string; anonymousId?: string };
  try { body = await req.json(); } catch { body = {}; }

  const { data: doc } = await supabase
    .from("documents")
    .select("user_id, anonymous_id, edit_token, compile_kind, compile_from, edit_mode")
    .eq("id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!doc.compile_kind || !doc.compile_from) {
    return NextResponse.json({ error: "Document is not a compiled entry" }, { status: 400 });
  }

  // Auth: owner only
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = body.userId || verified?.userId || req.headers.get("x-user-id") || undefined;
  const anonymousId = body.anonymousId || req.headers.get("x-anonymous-id") || undefined;
  const isOwner =
    !!(userId && doc.user_id && userId === doc.user_id) ||
    !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
  const hasToken = !!(body.editToken && doc.edit_token === body.editToken);
  if (!isOwner && !hasToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const compileFrom = doc.compile_from as { bundleId?: string; intent?: string | null };
  if (!compileFrom?.bundleId) {
    return NextResponse.json({ error: "Source bundle missing from compile metadata" }, { status: 400 });
  }
  const kind = doc.compile_kind as SynthesisKind;

  try {
    const result = await synthesizeBundle(supabase, compileFrom.bundleId, kind, compileFrom.intent ?? undefined);
    if (!result) return NextResponse.json({ error: "Recompile failed (bundle empty or AI down)" }, { status: 500 });

    const now = new Date().toISOString();
    // Update doc with fresh markdown + bump compile metadata
    const { error: updateErr } = await supabase
      .from("documents")
      .update({
        markdown: result.markdown,
        compiled_at: now,
        compile_from: { ...compileFrom, docIds: result.sourceDocIds, intent: result.intent },
        updated_at: now,
      })
      .eq("id", id);
    if (updateErr) return NextResponse.json({ error: "Failed to persist recompile" }, { status: 500 });

    return NextResponse.json({
      kind,
      markdown: result.markdown,
      compiledAt: now,
      sourceDocIds: result.sourceDocIds,
      intent: result.intent,
    });
  } catch (err) {
    console.error("Recompile error:", err);
    return NextResponse.json({ error: "Recompile failed" }, { status: 500 });
  }
}
