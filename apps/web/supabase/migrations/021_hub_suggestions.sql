-- v6 W6 — Proactive bundle suggestions.
--
-- Karpathy's wiki pattern is reactive: the user asks, the LLM
-- synthesizes. mdfy goes one step further by watching the user's
-- activity and proposing actions ("you've added 4 docs about pricing
-- this week, want a bundle?").
--
-- Stored as one row per active suggestion. Status flips from "open"
-- to "accepted" or "dismissed" once the user decides. We never delete
-- — kept around so the user can audit suggestions later and so the
-- generator can avoid reproposing the same cluster.
--
-- Additive and production-safe.

CREATE TABLE IF NOT EXISTS hub_suggestions (
  id TEXT PRIMARY KEY,                    -- nanoid
  user_id UUID NOT NULL,
  type TEXT NOT NULL,                     -- 'bundle_topic' (only kind in v1)
  title TEXT,                             -- e.g., "Pricing strategy thread"
  reason TEXT,                            -- one-sentence rationale shown to user
  doc_ids TEXT[],                         -- docs the suggestion bundles
  status TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'accepted' | 'dismissed'
  accepted_bundle_id TEXT,                -- nanoid of the bundle if accepted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_suggestions_user_status
  ON hub_suggestions (user_id, status, created_at DESC);

-- Throttle table: one row per user with the last analysis run
-- timestamp. Prevents re-analyzing on every doc create burst.
CREATE TABLE IF NOT EXISTS hub_suggestion_runs (
  user_id UUID PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hub_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_suggestion_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hub_suggestions_owner_read') THEN
    CREATE POLICY hub_suggestions_owner_read ON hub_suggestions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hub_suggestions_owner_update') THEN
    CREATE POLICY hub_suggestions_owner_update ON hub_suggestions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END
$$;
