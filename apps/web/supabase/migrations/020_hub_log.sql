-- v6 Hub log (the second of Karpathy's two supporting files alongside
-- index.md). Append-only chronological record of every meaningful
-- mutation in a user's hub: doc created/edited/deleted, bundle
-- created, synthesis recompiled, schema changed.
--
-- Read by:
--   - GET /api/user/hub/log          (raw JSON for the in-app feed)
--   - /hub/<slug>/log.md             (Karpathy-shaped markdown URL
--                                     so any AI can fetch it as
--                                     context alongside the hub)
--   - W5c lint pass                  (detects orphan / stale rows)
--
-- Additive and production-safe.

CREATE TABLE IF NOT EXISTS hub_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  target_type TEXT,                   -- 'document' | 'bundle' | 'hub' | 'schema' | null
  target_id TEXT,                     -- nanoid for documents/bundles, null for hub-level events
  summary TEXT,                       -- one-line human-readable summary
  metadata JSONB,                     -- structured detail (title, source, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only by convention: the API never updates or deletes rows.
-- If we ever need to redact something, we'll add a `redacted_at`
-- column rather than mutate.

CREATE INDEX IF NOT EXISTS idx_hub_log_user_created
  ON hub_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hub_log_target
  ON hub_log (target_type, target_id);

-- RLS: users only see their own log. Service role bypasses for the
-- backend writers.
ALTER TABLE hub_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'hub_log_owner_read'
  ) THEN
    CREATE POLICY hub_log_owner_read ON hub_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;
