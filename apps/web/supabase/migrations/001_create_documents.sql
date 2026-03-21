CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  markdown TEXT NOT NULL,
  title TEXT,
  edit_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_documents_created_at ON documents (created_at DESC);
