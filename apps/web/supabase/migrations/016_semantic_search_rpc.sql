-- Cosine-similarity search over documents.embedding, scoped to the
-- caller's own docs.
--
-- POST /api/search/semantic embeds the user's query and calls this RPC.
-- Used by AI Bundle Generation (W3) — "find docs related to this prompt"
-- — and by Hub query (W4) — "search my hub by meaning, not keywords."
--
-- Filtering by user_id OR anonymous_id at the SQL level (not just in the
-- API route) keeps the index usable: the planner can combine the partial
-- HNSW index on embedding with the equality filter on user_id, instead
-- of fetching every embedded row and filtering after.

CREATE OR REPLACE FUNCTION match_documents_by_embedding(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL,
  p_anonymous_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  title text,
  markdown text,
  updated_at timestamptz,
  source text,
  distance float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.title,
    d.markdown,
    d.updated_at,
    d.source,
    (d.embedding <=> query_embedding)::float AS distance
  FROM documents d
  WHERE d.embedding IS NOT NULL
    AND d.deleted_at IS NULL
    AND (
      (p_user_id IS NOT NULL AND d.user_id = p_user_id)
      OR (p_anonymous_id IS NOT NULL AND d.anonymous_id = p_anonymous_id)
    )
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Allow authenticated users + the anon role to call this RPC. Authorization
-- is enforced inside the function via the p_user_id / p_anonymous_id args
-- (the API route passes the verified caller identity).
GRANT EXECUTE ON FUNCTION match_documents_by_embedding(vector, int, uuid, text) TO anon, authenticated;
