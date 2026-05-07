-- v6 Hub Schema (the third Karpathy LLM-Wiki layer).
--
-- A per-hub markdown config that tells the LLM how to maintain this
-- user's wiki: what to track, what tone to summarize in, what to
-- cross-reference, what to lint for. Read by the synthesis pipeline
-- (W4) and the lint pipeline (W5).
--
-- Stored as plain markdown so the user can hand-edit it and so the
-- LLM can read it directly (no schema serialization). Default null;
-- our app code substitutes a sensible default when reading.
--
-- Additive and production-safe.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hub_schema_md TEXT;

-- Updated_at marker so synthesis can decide whether to invalidate
-- cached summaries when the schema changes.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hub_schema_updated_at TIMESTAMPTZ;
