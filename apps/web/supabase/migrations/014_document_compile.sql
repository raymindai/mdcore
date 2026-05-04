-- Compile-as-first-class operation.
-- A document can be "compiled" from a bundle via /api/bundles/:id/synthesize.
-- The resulting doc is no longer a one-off — it remembers its source bundle,
-- the kind of synthesis (memo/faq/brief), the intent at compile time, and
-- when it was last compiled. The UI uses this to:
--
--   • show a "Compiled · {kind} · N sources" badge
--   • detect outdated state (MAX(source.updated_at) > compiled_at)
--   • offer a one-click Recompile that re-runs the same synthesis
--
-- compile_from JSONB shape:
--   { "bundleId": "...", "docIds": ["...", "..."], "intent": "..." }

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS compile_kind TEXT,
  ADD COLUMN IF NOT EXISTS compile_from JSONB,
  ADD COLUMN IF NOT EXISTS compiled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_compile_bundle
  ON documents ((compile_from->>'bundleId'))
  WHERE compile_from IS NOT NULL;
