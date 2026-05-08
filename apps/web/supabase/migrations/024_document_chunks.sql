-- Phase 2 RAG: chunk-level embeddings.
--
-- Doc-level embedding is good for "this doc is about X" relevance, but
-- a single 1536-dim vector for a long doc loses paragraph-level signal.
-- This table stores per-section embeddings — one row per markdown
-- heading subtree — so retrieval can return the *paragraphs* that
-- actually answer the question, not the whole containing doc.
--
-- A chunk's hash is computed from its markdown text only (heading +
-- body). Re-embedding is idempotent: when a doc is saved we recompute
-- chunks from current markdown, hash each one, and only embed the rows
-- whose hash changed. Chunks that disappeared from the doc are deleted.

CREATE TABLE IF NOT EXISTS document_chunks (
  id BIGSERIAL PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_idx INTEGER NOT NULL,
  heading TEXT,                          -- nearest enclosing heading (e.g. "## Three layers")
  heading_path TEXT,                     -- breadcrumb (e.g. "How mdfy works > Three layers > Wiki")
  markdown TEXT NOT NULL,
  hash TEXT NOT NULL,                    -- sha256 of (heading + body) — used for idempotent re-embed
  embedding vector(1536),
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_id, chunk_idx)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks (doc_id);

-- HNSW index on chunk embeddings, mirroring the doc-level setup.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Per-hub public chunk retrieval. Mirrors match_public_hub_docs but at
-- chunk granularity, with the same privacy filters applied via the
-- parent document.
CREATE OR REPLACE FUNCTION match_public_hub_chunks(
  query_embedding vector(1536),
  p_hub_user_id uuid,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  chunk_id bigint,
  doc_id text,
  chunk_idx int,
  heading text,
  heading_path text,
  markdown text,
  doc_title text,
  doc_updated_at timestamptz,
  distance float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id            AS chunk_id,
    c.doc_id        AS doc_id,
    c.chunk_idx     AS chunk_idx,
    c.heading       AS heading,
    c.heading_path  AS heading_path,
    c.markdown      AS markdown,
    d.title         AS doc_title,
    d.updated_at    AS doc_updated_at,
    (c.embedding <=> query_embedding)::float AS distance
  FROM document_chunks c
  JOIN documents d ON d.id = c.doc_id
  WHERE c.embedding IS NOT NULL
    AND d.user_id = p_hub_user_id
    AND d.is_draft = FALSE
    AND d.deleted_at IS NULL
    AND d.password_hash IS NULL
    AND (d.allowed_emails IS NULL OR array_length(d.allowed_emails, 1) IS NULL)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_public_hub_chunks(vector, uuid, int) TO anon, authenticated;

COMMENT ON TABLE document_chunks IS
  'Phase 2 RAG: per-heading chunks of each document with their own embeddings, for paragraph-level retrieval. Refreshed by /api/embed/<id> alongside doc-level embedding.';
COMMENT ON FUNCTION match_public_hub_chunks IS
  'Phase 2 RAG: cosine search over public hub chunks. Used by /api/hub/<slug>/recall?level=chunk for paragraph-level results.';
