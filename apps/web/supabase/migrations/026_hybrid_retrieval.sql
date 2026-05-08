-- Phase 4 RAG: hybrid retrieval (BM25 over Postgres FTS + vector cosine).
--
-- Vector search is great for semantic similarity but weak on exact-term
-- matching (model names, identifiers, acronyms like "MCP"). Postgres
-- full-text search is the opposite — strong on exact tokens, blind to
-- semantics. Reciprocal Rank Fusion combines the two ranked lists
-- without needing to calibrate score scales.
--
-- We rely on the documents.search_vector tsvector that already exists
-- (used by /search). For chunks we add a fresh tsvector since the
-- table is new.

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(markdown, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_document_chunks_search_vector
  ON document_chunks USING gin (search_vector);

-- Hybrid retrieval at chunk level. Pulls top-N from BM25 and top-N
-- from vector cosine, then merges via reciprocal rank fusion:
--   score = sum_over_lists( 1 / (rrf_k + rank_in_list) )
-- where rrf_k=60 is the canonical RRF constant. The merged score
-- ignores raw distance/ts_rank magnitudes so vector cosine and BM25
-- can be combined without normalization.
CREATE OR REPLACE FUNCTION hybrid_match_public_hub_chunks(
  query_text text,
  query_embedding vector(1536),
  p_hub_user_id uuid,
  match_count int DEFAULT 8,
  rrf_k int DEFAULT 60
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
  vector_rank int,
  fts_rank int,
  rrf_score float
)
LANGUAGE sql STABLE
AS $$
  WITH vec AS (
    SELECT
      c.id AS chunk_id,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS rk
    FROM document_chunks c
    JOIN documents d ON d.id = c.doc_id
    WHERE c.embedding IS NOT NULL
      AND d.user_id = p_hub_user_id
      AND d.is_draft = FALSE
      AND d.deleted_at IS NULL
      AND d.password_hash IS NULL
      AND (d.allowed_emails IS NULL OR array_length(d.allowed_emails, 1) IS NULL)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 4
  ),
  fts AS (
    SELECT
      c.id AS chunk_id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank(c.search_vector, websearch_to_tsquery('english', query_text)) DESC
      ) AS rk
    FROM document_chunks c
    JOIN documents d ON d.id = c.doc_id
    WHERE c.search_vector @@ websearch_to_tsquery('english', query_text)
      AND d.user_id = p_hub_user_id
      AND d.is_draft = FALSE
      AND d.deleted_at IS NULL
      AND d.password_hash IS NULL
      AND (d.allowed_emails IS NULL OR array_length(d.allowed_emails, 1) IS NULL)
    ORDER BY ts_rank(c.search_vector, websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count * 4
  ),
  merged AS (
    SELECT
      coalesce(vec.chunk_id, fts.chunk_id) AS chunk_id,
      vec.rk AS vector_rank,
      fts.rk AS fts_rank,
      coalesce(1.0 / (rrf_k + vec.rk), 0) + coalesce(1.0 / (rrf_k + fts.rk), 0) AS rrf_score
    FROM vec
    FULL OUTER JOIN fts ON vec.chunk_id = fts.chunk_id
  )
  SELECT
    c.id AS chunk_id,
    c.doc_id,
    c.chunk_idx,
    c.heading,
    c.heading_path,
    c.markdown,
    d.title AS doc_title,
    d.updated_at AS doc_updated_at,
    m.vector_rank::int,
    m.fts_rank::int,
    m.rrf_score::float
  FROM merged m
  JOIN document_chunks c ON c.id = m.chunk_id
  JOIN documents d ON d.id = c.doc_id
  ORDER BY m.rrf_score DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION hybrid_match_public_hub_chunks(text, vector, uuid, int, int) TO anon, authenticated;

COMMENT ON FUNCTION hybrid_match_public_hub_chunks IS
  'Phase 4 RAG: BM25 (Postgres FTS) + vector cosine merged via reciprocal rank fusion. Used by /api/hub/<slug>/recall?level=chunk&hybrid=1.';
