import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { embedText, prepareEmbeddingInput, vectorToSql } from "@/lib/embeddings";

// Phase 1 — public Recall API.
//
// POST /api/hub/<slug>/recall
//   body: { question: string, k?: number }
//   → { hub: { slug, display_name }, results: [{ id, title, url, snippet, distance, updated_at }] }
//
// Owner-aware semantic search but PUBLIC — anyone with the hub URL can
// ask a question against that hub's public docs and get the top-k
// matches. Designed for AI agents that paste the hub URL today: instead
// of fetching the entire markdown index, they call this endpoint with
// their actual question and get a fraction of the tokens with much
// better precision.
//
// Privacy: the underlying RPC restricts to is_draft=false +
// password_hash IS NULL + no allowed_emails. Drafts, password-protected,
// and email-restricted docs never leak via this surface.

const MAX_K = 20;
const DEFAULT_K = 5;
const SLUG_RE = /^[a-z0-9_-]{3,32}$/;

interface PublicHubRecallBody {
  question?: string;
  k?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  let body: PublicHubRecallBody;
  try {
    body = (await request.json()) as PublicHubRecallBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const question = (body.question || "").trim();
  if (!question) {
    return NextResponse.json({ error: "question_required" }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "question_too_long" }, { status: 400 });
  }

  const k = Math.min(Math.max(body.k ?? DEFAULT_K, 1), MAX_K);

  // Resolve hub → owner user_id; only public hubs are eligible.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, hub_slug, display_name, hub_public")
    .eq("hub_slug", slug)
    .single();
  if (!profile || !profile.hub_public) {
    return NextResponse.json({ error: "hub_not_public" }, { status: 404 });
  }

  // Embed the question. Best-effort; if the embedding provider is
  // unreachable we fail loud so the caller can decide what to do.
  let queryVec: number[];
  try {
    queryVec = await embedText(prepareEmbeddingInput(null, question));
  } catch (err) {
    return NextResponse.json(
      { error: "embedding_failed", detail: (err as Error).message },
      { status: 502 },
    );
  }

  const { data: rows, error } = await supabase.rpc("match_public_hub_docs", {
    query_embedding: vectorToSql(queryVec),
    p_hub_user_id: profile.id,
    match_count: k,
  });
  if (error) {
    return NextResponse.json({ error: "search_failed", detail: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    title: string | null;
    markdown: string;
    updated_at: string;
    source: string | null;
    distance: number;
  };

  const results = (rows as Row[] | null || []).map((r) => {
    // 200-char snippet from the markdown body (without leading code fences),
    // good enough for a preview without paying the full-doc token cost.
    const cleaned = (r.markdown || "")
      .replace(/^---[\s\S]*?---\s*/m, "")
      .replace(/^#+\s+.*$/gm, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return {
      id: r.id,
      title: r.title || "Untitled",
      url: `https://mdfy.app/${r.id}`,
      raw_url: `https://mdfy.app/raw/${r.id}`,
      snippet: cleaned.slice(0, 200),
      distance: Number(r.distance.toFixed(4)),
      updated_at: r.updated_at,
    };
  });

  return NextResponse.json(
    {
      hub: { slug, display_name: profile.display_name || slug },
      question,
      results,
      meta: {
        retrieval: "vector",
        model: "text-embedding-3-small",
        dim: 1536,
        k,
      },
    },
    {
      headers: {
        // No edge cache — the response is question-specific and cheap to recompute.
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return NextResponse.json(
    {
      message: "POST { question, k? } to query this hub semantically",
      example: {
        method: "POST",
        url: `https://mdfy.app/api/hub/${slug}/recall`,
        body: { question: "How does X work?", k: 5 },
      },
    },
    { headers: { Allow: "POST, GET" } },
  );
}
