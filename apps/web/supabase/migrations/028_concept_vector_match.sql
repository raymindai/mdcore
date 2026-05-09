-- HNSW vector recall over concept_index — used by /api/hub/<slug>/chat
-- to find the user's concepts that semantically match a free-form query
-- ("memory across docs" → matches "AI Memory Stack", "Context
-- Management" etc. even without exact-substring overlap).
--
-- Mirrors the doc/chunk/bundle match RPCs already in 015/024/025.

CREATE OR REPLACE FUNCTION match_user_concepts(
  query_embedding vector(1536),
  p_user_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  label text,
  concept_type text,
  description text,
  weight real,
  occurrence_count int,
  doc_ids text[],
  bundle_ids text[],
  distance float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.label,
    c.concept_type,
    c.description,
    c.weight,
    c.occurrence_count,
    c.doc_ids,
    c.bundle_ids,
    (c.embedding <=> query_embedding) AS distance
  FROM concept_index c
  WHERE c.user_id = p_user_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
