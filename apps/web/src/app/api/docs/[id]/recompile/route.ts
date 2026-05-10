import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { synthesizeBundle, type SynthesisKind } from "@/lib/synthesize";
import { readCompileSources, appendCompileSource, currentCompileSource } from "@/lib/compile-sources";

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
    .select("user_id, anonymous_id, edit_token, compile_kind, compile_from, edit_mode, compiled_at")
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

  // Resolve which source bundle to recompile from. The doc may have
  // history of multiple sources (compile_from.sources[]) — by default
  // we pick the LAST one (the one that produced the current body).
  // Caller can override via body.bundleId to regenerate from any
  // historical source bundle.
  const sources = readCompileSources(doc.compile_from, doc.compiled_at);
  const requestedBundleId = (typeof body === "object" && body && (body as { bundleId?: string }).bundleId) || undefined;
  const targetSource = requestedBundleId
    ? sources.find((s) => s.bundleId === requestedBundleId) || null
    : currentCompileSource(doc.compile_from, doc.compiled_at);
  if (!targetSource?.bundleId) {
    return NextResponse.json({ error: "Source bundle missing from compile metadata" }, { status: 400 });
  }
  const kind = doc.compile_kind as SynthesisKind;

  // Preview mode: synthesize but DON'T save. Caller can then show the user
  // a diff vs the existing doc.markdown and ask them to accept or reject.
  // The exceed-move over Karpathy's regenerate-only pattern.
  const isPreview = req.nextUrl.searchParams.get("preview") === "1";

  try {
    const result = await synthesizeBundle(supabase, targetSource.bundleId, kind, targetSource.intent ?? undefined);
    if (!result) return NextResponse.json({ error: "Recompile failed (bundle empty or AI down)" }, { status: 500 });

    if (isPreview) {
      // Return the proposed markdown alongside the existing one so the
      // client can render a diff. No DB writes.
      const { data: existing } = await supabase
        .from("documents")
        .select("markdown, compiled_at")
        .eq("id", id)
        .single();
      return NextResponse.json({
        preview: true,
        kind,
        currentMarkdown: existing?.markdown ?? "",
        proposedMarkdown: result.markdown,
        previousCompiledAt: existing?.compiled_at ?? null,
        sourceDocIds: result.sourceDocIds,
        intent: result.intent,
      });
    }

    const now = new Date().toISOString();
    // Title invariant — recompile rewrites the body, so re-derive title
    // from the new H1. Falls back to the existing doc.title if the
    // synthesizer somehow returned a body without an H1.
    const { enforceTitleInvariant } = await import("@/lib/extract-title");
    const { data: existingTitle } = await supabase.from("documents").select("title").eq("id", id).single();
    const enforced = enforceTitleInvariant(result.markdown, existingTitle?.title || "Synthesis");
    // Append (and dedupe) the source onto compile_from.sources so the
    // doc keeps a history of every bundle it's been compiled from.
    const newCompileFrom = appendCompileSource(doc.compile_from, {
      bundleId: targetSource.bundleId,
      docIds: result.sourceDocIds,
      intent: result.intent ?? null,
      compiledAt: now,
    }, doc.compiled_at);
    const { error: updateErr } = await supabase
      .from("documents")
      .update({
        markdown: enforced.markdown,
        title: enforced.title,
        compiled_at: now,
        compile_from: newCompileFrom,
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
