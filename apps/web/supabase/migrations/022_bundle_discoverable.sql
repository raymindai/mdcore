-- W11b: shared bundles discoverable mode.
--
-- A bundle owner can opt their bundle into a public listing so other
-- people can discover it. This is separate from "public" (no
-- allowed_emails / no password) — a bundle can be public without
-- being discoverable. Discoverable implies public.
--
-- The /shared listing only shows bundles where:
--   is_draft = false
--   is_discoverable = true
--   password_hash IS NULL
--   allowed_emails IS NULL OR length = 0
--
-- A new column rather than overloading existing flags so that
-- "publicly fetchable by URL" (current default for new bundles) and
-- "show up on the discovery feed" (opt-in only) stay distinguishable.

ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index — most bundles will be is_discoverable=false, so
-- skip them in the index entirely.
CREATE INDEX IF NOT EXISTS idx_bundles_discoverable
  ON bundles (updated_at DESC)
  WHERE is_discoverable = TRUE
    AND is_draft = FALSE
    AND password_hash IS NULL;

COMMENT ON COLUMN bundles.is_discoverable IS
  'When true, the bundle appears on the public /shared discovery feed. Owner-controlled, off by default.';
