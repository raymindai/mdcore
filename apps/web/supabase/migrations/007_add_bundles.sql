-- 007: Add bundles and bundle_documents tables

CREATE TABLE bundles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Bundle',
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  edit_token TEXT NOT NULL,
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  graph_data JSONB,
  graph_generated_at TIMESTAMPTZ,
  layout TEXT NOT NULL DEFAULT 'graph',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bundles_user_id ON bundles(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bundles_anonymous_id ON bundles(anonymous_id) WHERE anonymous_id IS NOT NULL;

CREATE TABLE bundle_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bundle_id TEXT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, document_id)
);

CREATE INDEX idx_bundle_docs_bundle ON bundle_documents(bundle_id);
CREATE INDEX idx_bundle_docs_document ON bundle_documents(document_id);
