-- Phase 1: public Recall API
--
-- match_public_hub_docs: vector cosine search restricted to a single
-- hub's PUBLIC documents — published, undeleted, no password, no
-- allowed_emails restriction. Used by /api/hub/<slug>/recall so any
-- AI agent can fetch a question-targeted top-N from a public hub
-- without needing the owner's auth.
--
-- The owner-scoped match_documents_by_embedding RPC stays untouched
-- (used by /api/search/semantic + /api/bundles/ai-generate). This
-- new function is a parallel route specifically for public retrieval.

CREATE OR REPLACE FUNCTION match_public_hub_docs(
  query_embedding vector(1536),
  p_hub_user_id uuid,
  match_count int DEFAULT 5
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
    AND d.user_id = p_hub_user_id
    AND d.is_draft = FALSE
    AND d.deleted_at IS NULL
    AND d.password_hash IS NULL
    AND (d.allowed_emails IS NULL OR array_length(d.allowed_emails, 1) IS NULL)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_public_hub_docs(vector, uuid, int) TO anon, authenticated;

COMMENT ON FUNCTION match_public_hub_docs IS
  'Phase 1 RAG: cosine search restricted to a single hub''s public docs. Used by POST /api/hub/<slug>/recall for AI-fetcher-friendly retrieval.';
