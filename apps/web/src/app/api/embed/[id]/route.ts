import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { embedText, hashEmbeddingSource, prepareEmbeddingInput, vectorToSql } from "@/lib/embeddings";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/embed/[id]
 *
 * Recompute the doc's embedding if its content changed since the last
 * embedding. Idempotent — safe to call after every auto-save; the
 * `embedding_source_hash` short-circuits when nothing changed, avoiding
 * the OpenAI roundtrip entirely.
 *
 * Authorization: caller must own the doc (user_id or anonymous_id).
 * Embedding is per-user knowledge work, not a public action.
 *
 * Returns:
 *   { skipped: true, reason: "unchanged" }  — no work done
 *   { embedded: true, tokens: ~ }           — re-embedded
 *   { skipped: true, reason: "empty" }      — body too short to embed
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const requesterId = verified?.userId || req.headers.get("x-user-id");
  const requesterAnonId = req.headers.get("x-anonymous-id");

  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("id, markdown, title, user_id, anonymous_id, deleted_at, embedding_source_hash")
    .eq("id", id)
    .single();

  if (fetchErr || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.deleted_at) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner =
    !!(requesterId && doc.user_id && requesterId === doc.user_id) ||
    !!(requesterAnonId && doc.anonymous_id && requesterAnonId === doc.anonymous_id);
  if (!isOwner) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const input = prepareEmbeddingInput(doc.title, doc.markdown);
  if (input.length < 20) {
    // Too little content to embed meaningfully — skip silently. Hub
    // search wouldn't surface it anyway.
    return NextResponse.json({ skipped: true, reason: "empty" });
  }

  const hash = hashEmbeddingSource(input);
  if (doc.embedding_source_hash === hash) {
    return NextResponse.json({ skipped: true, reason: "unchanged" });
  }

  let vec: number[];
  try {
    vec = await embedText(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "embed failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Use raw SQL via RPC since supabase-js doesn't natively serialize
  // pgvector arrays. The vectorToSql helper formats "[v1,v2,...]" which
  // pgvector parses on insert via implicit cast.
  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      embedding: vectorToSql(vec),
      embedding_source_hash: hash,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: `update failed: ${updateErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ embedded: true });
}
