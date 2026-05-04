-- Bundle visibility controls — mirror documents schema so a bundle can be:
--   • private (default — owner-only)
--   • shared via public link (is_draft=false, allowed_emails empty)
--   • shared with specific people (allowed_emails populated)
--   • password-protected (password_hash existed already from migration 007)
ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS edit_mode TEXT NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS allowed_emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_editors TEXT[] NOT NULL DEFAULT '{}';
