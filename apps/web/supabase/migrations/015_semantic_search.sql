-- v6 Semantic search foundation
--
-- Adds pgvector + a 1536-dimensional embedding column on documents (sized
-- for OpenAI text-embedding-3-small). HNSW index for cosine similarity.
--
-- All changes here are ADDITIVE (production-safe):
--   - vector extension is idempotent and a no-op for existing rows.
--   - documents.embedding is nullable; existing prod code never reads it,
--     so it stays invisible until v6 search code is shipped.
--   - documents_embedding_meta tracks freshness (when the embedding was
--     last computed and against which markdown hash) so we don't re-embed
--     unchanged docs and can re-embed after edits without re-querying
--     the full body.
--
-- Drop / rename / type-change is intentionally avoided so prod (mdfy.app)
-- continues to function unchanged on the same Supabase project.

CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding column on documents.
-- 1536 dims = OpenAI text-embedding-3-small. If we later switch to -large
-- (3072 dims), drop the index, alter the column type, recreate the index.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Track when each row was embedded and against which content. Lets the
-- background embedder skip rows whose markdown hasn't changed.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_source_hash TEXT;

-- HNSW index for cosine similarity. ef_construction / m left at defaults
-- (efc=64, m=16) — good baseline for ~50k docs per user. Revisit if
-- recall lags at scale.
CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
  ON documents
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Hub URL: each user can opt to expose a shareable hub digest. Bundle
-- versions and AI-generated metadata are tracked separately in 016
-- (bundle versioning) so this migration stays narrowly scoped to search.
