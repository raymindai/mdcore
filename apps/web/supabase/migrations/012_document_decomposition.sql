-- AI semantic decomposition cache for documents.
-- `semantic_chunks` stores the result of /api/docs/[id]/decompose:
--   {
--     "chunks": [{ id, type, label, content, weight }, ...],
--     "edges":  [{ source, target, type, label, weight }, ...],
--     "version": 1
--   }
-- `decomposed_at` is bumped whenever the cache is regenerated.
-- Both nullable — old documents simply have no cached decomposition until
-- the user explicitly clicks "Decompose into sections" on the canvas.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS semantic_chunks JSONB,
  ADD COLUMN IF NOT EXISTS decomposed_at TIMESTAMPTZ;
