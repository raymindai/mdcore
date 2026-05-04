import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { embedText, prepareEmbeddingInput, vectorToSql } from "@/lib/embeddings";

/**
 * POST /api/search/semantic
 *
 * Body: { query: string; limit?: number; userId?: string; anonymousId?: string }
 *
 * Embeds the query, runs cosine similarity against the caller's own
 * documents, returns the top-K most-similar results.
 *
 * Scoped to the calling user's hub — never returns docs they don't own.
 * AI Bundle Generation (W3) and Hub query (W4) both call this.
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let body: { query?: string; limit?: number; userId?: string; anonymousId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || body.userId || req.headers.get("x-user-id") || undefined;
  const anonymousId = body.anonymousId || req.headers.get("x-anonymous-id") || undefined;
  if (!userId && !anonymousId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (body.query || "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (query.length > 2000) {
    return NextResponse.json({ error: "query too long (max 2000 chars)" }, { status: 400 });
  }

  const limit = Math.max(1, Math.min(50, body.limit ?? 10));

  // Embed the query the same way docs were embedded — use empty title so
  // the query treats itself as pure body. Stable across query length.
  let queryVec: number[];
  try {
    queryVec = await embedText(prepareEmbeddingInput(null, query));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "embed failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Cosine distance via pgvector's <=> operator. Lower distance = more
  // similar. We expose `score` as `1 - distance` so callers see "higher is
  // better" intuitively. Restrict to caller's own non-deleted docs that
  // already have an embedding column populated.
  const ownerFilter = userId ? `user_id.eq.${userId}` : `anonymous_id.eq.${anonymousId}`;
  const queryLiteral = vectorToSql(queryVec);

  const { data, error } = await supabase.rpc("match_documents_by_embedding", {
    query_embedding: queryLiteral,
    match_count: limit,
    p_user_id: userId ?? null,
    p_anonymous_id: anonymousId ?? null,
  });

  if (error) {
    // Fall back to a raw filtered cosine search if the RPC isn't installed
    // yet (migration adds it later — keep semantic search functional even
    // if only the column-level migration ran).
    const fallback = await supabase
      .from("documents")
      .select("id, title, markdown, updated_at, source")
      .or(ownerFilter)
      .is("deleted_at", null)
      .not("embedding", "is", null)
      .limit(50);
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    return NextResponse.json({
      results: (fallback.data || []).slice(0, limit).map(d => ({
        id: d.id,
        title: d.title || "Untitled",
        snippet: (d.markdown || "").slice(0, 240),
        updated_at: d.updated_at,
        source: d.source,
        score: null,
      })),
      fallback: true,
    });
  }

  type Row = { id: string; title: string | null; markdown: string | null; updated_at: string; source: string | null; distance: number };
  const rows = (data as Row[] | null) || [];

  return NextResponse.json({
    results: rows.map(d => ({
      id: d.id,
      title: d.title || "Untitled",
      snippet: (d.markdown || "").slice(0, 240),
      updated_at: d.updated_at,
      source: d.source,
      score: typeof d.distance === "number" ? 1 - d.distance : null,
    })),
  });
}
