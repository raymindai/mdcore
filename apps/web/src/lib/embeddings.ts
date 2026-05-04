/**
 * v6 — Embedding generation for semantic search, AI Bundle Generation,
 * and Hub query.
 *
 * Wraps OpenAI's text-embedding-3-small (1536-dim, $0.02/M tokens).
 * Server-only: never call from a browser bundle — uses OPENAI_API_KEY.
 */
import { createHash } from "node:crypto";

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

/**
 * Stable hash of the source text — used to skip re-embedding unchanged docs.
 * SHA-256 hex (64 chars) so it fits comfortably in a TEXT column and
 * never collides for any input we'll see in practice.
 */
export function hashEmbeddingSource(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Trim + cap a markdown body before embedding. Two reasons:
 *   1. text-embedding-3-small has an 8191-token limit; we keep well under.
 *   2. Embedding only the meaningful prefix (title + first ~3000 chars)
 *      gives semantically stable vectors even when long docs grow with
 *      noise at the tail.
 */
export function prepareEmbeddingInput(title: string | undefined | null, markdown: string): string {
  const head = (title || "").trim();
  const body = (markdown || "").slice(0, 3000).trim();
  return [head, body].filter(Boolean).join("\n\n");
}

interface OpenAIEmbeddingsResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Embed a single string. Throws on API error so callers can decide
 * whether to retry or surface to the user. Stateless — no caching here;
 * dedupe by `embedding_source_hash` at the DB layer.
 */
export async function embedText(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  if (!input.trim()) throw new Error("Cannot embed empty string");

  const res = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      // 1536 is the default for -small but pin it explicitly so future
      // OpenAI default changes don't silently shift our index dimensions.
      dimensions: EMBEDDING_DIM,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings ${res.status}: ${text || "unknown error"}`);
  }

  const data = (await res.json()) as OpenAIEmbeddingsResponse;
  const vec = data.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
    throw new Error(`Unexpected embedding shape (got len=${vec?.length})`);
  }
  return vec;
}

/**
 * Batch embed up to ~100 strings in a single call. OpenAI accepts an
 * array on `input` and returns one embedding per element. Cheaper per-doc
 * than serial calls when reindexing or seeding.
 */
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  if (inputs.length > 100) throw new Error("embedBatch capped at 100 inputs per call");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIM,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings ${res.status}: ${text || "unknown error"}`);
  }

  const data = (await res.json()) as OpenAIEmbeddingsResponse;
  // Sort by index to guarantee result order matches input order — the API
  // returns them in order today but the spec doesn't guarantee it.
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map(d => d.embedding);
}

/**
 * Format a number[] for direct insertion into a pgvector column via
 * Supabase RPC / raw SQL. Postgres expects "[v1,v2,...]" string literal.
 */
export function vectorToSql(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
