-- 030_doc_intent.sql
--
-- Hermes-inspired doc-type tagging. Each document carries an optional
-- `intent` (note / definition / comparison / decision / question /
-- reference) that the owner sets manually for now. v2 will infer it
-- from content on ingest, but the column is the prerequisite.
--
-- Why optional + text (not enum):
--   - the vocabulary will grow (e.g. "playbook", "interview"), and
--     adding values to a Postgres enum needs a migration + table lock;
--   - existing rows stay valid with NULL meaning "uncategorised".
--
-- The index is partial: most rows won't have an intent for a while,
-- and we only ever filter `WHERE intent IS NOT NULL AND user_id = $1`
-- in the sidebar's typed-bucket query.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS intent TEXT
    CHECK (intent IS NULL OR intent IN (
      'note', 'definition', 'comparison', 'decision', 'question', 'reference'
    ));

CREATE INDEX IF NOT EXISTS idx_documents_user_intent
  ON documents (user_id, intent)
  WHERE intent IS NOT NULL;

COMMENT ON COLUMN documents.intent IS
  'Optional doc type. note|definition|comparison|decision|question|reference. Null = uncategorised.';
