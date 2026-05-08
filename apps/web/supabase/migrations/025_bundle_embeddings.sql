-- Phase 3 RAG: bundle-level embeddings.
--
-- A bundle is a curated grouping of docs around a topic. Its identity
-- is the topic itself ("AI Memory Stack", "Project Acme — Full Context")
-- not the union of its members. Embedding the bundle's title +
-- description + member titles gives the schema layer a way to surface
-- the right *bundle* (not just a single member doc) when a query matches
-- the topic.

ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_source_hash TEXT,
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Partial HNSW index — most bundles will eventually have an embedding,
-- but skip rows where it's still null so the index doesn't carry empty
-- placeholders during the rollout.
CREATE INDEX IF NOT EXISTS idx_bundles_embedding_hnsw
  ON bundles
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Public-bundle vector search, mirroring match_public_hub_docs but for
-- bundles. Used by /api/hub/<slug>/recall?level=bundle (and by the
-- combined `level=mixed` mode that interleaves bundles + chunks).
CREATE OR REPLACE FUNCTION match_public_hub_bundles(
  query_embedding vector(1536),
  p_hub_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  title text,
  description text,
  updated_at timestamptz,
  document_count bigint,
  distance float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    b.id,
    b.title,
    b.description,
    b.updated_at,
    (SELECT count(*) FROM bundle_documents bd WHERE bd.bundle_id = b.id) AS document_count,
    (b.embedding <=> query_embedding)::float AS distance
  FROM bundles b
  WHERE b.embedding IS NOT NULL
    AND b.user_id = p_hub_user_id
    AND b.is_draft = FALSE
    AND b.password_hash IS NULL
    AND (b.allowed_emails IS NULL OR array_length(b.allowed_emails, 1) IS NULL)
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_public_hub_bundles(vector, uuid, int) TO anon, authenticated;

COMMENT ON FUNCTION match_public_hub_bundles IS
  'Phase 3 RAG: cosine search over public bundles. Used by /api/hub/<slug>/recall?level=bundle.';
