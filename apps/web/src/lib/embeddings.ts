/**
 * v6 — Embedding generation for semantic search, AI Bundle Generation,
 * and Hub query.
 *
 * Provider preference (first available wins):
 *   1. OPENAI_API_KEY → text-embedding-3-small (1536 dim, $0.02/M tokens)
 *   2. GEMINI_API_KEY → gemini-embedding-001 (configurable, 1536 dim
 *      via outputDimensionality, $0.15/M tokens)
 *
 * Both produce vectors that fit the pgvector(1536) column. Switching
 * providers is purely an env-var change — no schema migration needed.
 *
 * Server-only: never call from a browser bundle.
 */
import { createHash } from "node:crypto";

const OPENAI_MODEL = "text-embedding-3-small";
const GEMINI_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 1536;

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const GEMINI_EMBEDDINGS_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;

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

interface GeminiEmbeddingsResponse {
  embedding: { values: number[] };
}

interface GeminiBatchEmbeddingsResponse {
  embeddings: Array<{ values: number[] }>;
}

function activeProvider(): "openai" | "gemini" {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  throw new Error("No embedding provider configured (set OPENAI_API_KEY or GEMINI_API_KEY)");
}

/**
 * Embed a single string. Throws on API error so callers can decide
 * whether to retry or surface to the user. Stateless — no caching here;
 * dedupe by `embedding_source_hash` at the DB layer.
 */
export async function embedText(input: string): Promise<number[]> {
  if (!input.trim()) throw new Error("Cannot embed empty string");
  const provider = activeProvider();

  if (provider === "openai") {
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
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

  // Gemini path. Uses ?key= query param auth (matches Google's other
  // generativelanguage endpoints) and `outputDimensionality` so the
  // returned vector matches our pgvector(1536) column.
  const res = await fetch(`${GEMINI_EMBEDDINGS_URL(GEMINI_MODEL)}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: input }] },
      outputDimensionality: EMBEDDING_DIM,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini embeddings ${res.status}: ${text || "unknown error"}`);
  }
  const data = (await res.json()) as GeminiEmbeddingsResponse;
  const vec = data.embedding?.values;
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
    throw new Error(`Unexpected Gemini embedding shape (got len=${vec?.length})`);
  }
  return vec;
}

/**
 * Batch embed up to ~100 strings in a single call when supported.
 * OpenAI accepts an `input` array natively. Gemini's batch endpoint
 * (`batchEmbedContents`) takes a `requests` array.
 */
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  if (inputs.length > 100) throw new Error("embedBatch capped at 100 inputs per call");
  const provider = activeProvider();

  if (provider === "openai") {
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: inputs,
        dimensions: EMBEDDING_DIM,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings ${res.status}: ${text || "unknown error"}`);
    }
    const data = (await res.json()) as OpenAIEmbeddingsResponse;
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    return sorted.map(d => d.embedding);
  }

  // Gemini batch
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: inputs.map(text => ({
        model: `models/${GEMINI_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIM,
      })),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini embeddings ${res.status}: ${text || "unknown error"}`);
  }
  const data = (await res.json()) as GeminiBatchEmbeddingsResponse;
  return data.embeddings.map(e => e.values);
}

/**
 * Format a number[] for direct insertion into a pgvector column via
 * Supabase RPC / raw SQL. Postgres expects "[v1,v2,...]" string literal.
 */
export function vectorToSql(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
