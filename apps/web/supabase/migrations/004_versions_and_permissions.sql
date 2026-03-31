-- Document version history
CREATE TABLE document_versions (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  markdown TEXT NOT NULL,
  title TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary TEXT  -- optional: "Updated intro section"
);

CREATE INDEX idx_versions_document ON document_versions (document_id, version_number DESC);

-- Document permissions
-- edit_mode: 'owner' (only owner), 'token' (anyone with editToken), 'public' (anyone can edit)
ALTER TABLE documents ADD COLUMN edit_mode TEXT NOT NULL DEFAULT 'token';

-- RLS for versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read versions" ON document_versions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert versions" ON document_versions FOR INSERT WITH CHECK (true);
