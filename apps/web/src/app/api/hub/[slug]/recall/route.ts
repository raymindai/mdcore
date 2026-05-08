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
  /** Retrieval granularity:
   *    "doc"    — whole-doc matches (default, Phase 1)
   *    "chunk"  — paragraph-level matches (Phase 2)
   *    "bundle" — curated bundle matches (Phase 3) */
  level?: "doc" | "chunk" | "bundle";
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
  const level: "doc" | "chunk" | "bundle" =
    body.level === "chunk" || body.level === "bundle" ? body.level : "doc";

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

  let results: unknown[];

  if (level === "bundle") {
    const { data: rows, error } = await supabase.rpc("match_public_hub_bundles", {
      query_embedding: vectorToSql(queryVec),
      p_hub_user_id: profile.id,
      match_count: k,
    });
    if (error) {
      return NextResponse.json({ error: "search_failed", detail: error.message }, { status: 500 });
    }

    type BundleRow = {
      id: string;
      title: string | null;
      description: string | null;
      updated_at: string;
      document_count: number;
      distance: number;
    };

    results = (rows as BundleRow[] | null || []).map((r) => ({
      id: r.id,
      title: r.title || "Untitled Bundle",
      description: r.description || "",
      url: `https://mdfy.app/b/${r.id}`,
      raw_url: `https://mdfy.app/raw/bundle/${r.id}`,
      document_count: Number(r.document_count),
      distance: Number(r.distance.toFixed(4)),
      updated_at: r.updated_at,
    }));
  } else if (level === "chunk") {
    const { data: rows, error } = await supabase.rpc("match_public_hub_chunks", {
      query_embedding: vectorToSql(queryVec),
      p_hub_user_id: profile.id,
      match_count: k,
    });
    if (error) {
      return NextResponse.json({ error: "search_failed", detail: error.message }, { status: 500 });
    }

    type ChunkRow = {
      chunk_id: number;
      doc_id: string;
      chunk_idx: number;
      heading: string | null;
      heading_path: string | null;
      markdown: string;
      doc_title: string | null;
      doc_updated_at: string;
      distance: number;
    };

    results = (rows as ChunkRow[] | null || []).map((r) => ({
      chunk_id: r.chunk_id,
      doc_id: r.doc_id,
      chunk_idx: r.chunk_idx,
      heading: r.heading,
      heading_path: r.heading_path,
      markdown: r.markdown,
      doc_title: r.doc_title || "Untitled",
      doc_url: `https://mdfy.app/${r.doc_id}`,
      raw_url: `https://mdfy.app/raw/${r.doc_id}`,
      distance: Number(r.distance.toFixed(4)),
      updated_at: r.doc_updated_at,
    }));
  } else {
    const { data: rows, error } = await supabase.rpc("match_public_hub_docs", {
      query_embedding: vectorToSql(queryVec),
      p_hub_user_id: profile.id,
      match_count: k,
    });
    if (error) {
      return NextResponse.json({ error: "search_failed", detail: error.message }, { status: 500 });
    }

    type DocRow = {
      id: string;
      title: string | null;
      markdown: string;
      updated_at: string;
      source: string | null;
      distance: number;
    };

    results = (rows as DocRow[] | null || []).map((r) => {
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
  }

  return NextResponse.json(
    {
      hub: { slug, display_name: profile.display_name || slug },
      question,
      level,
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
