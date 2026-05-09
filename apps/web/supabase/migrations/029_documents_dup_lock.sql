-- Atomic duplicate lock for owner-scoped document creation.
--
-- Why: the application-layer dedup helper (lib/doc-dedup.ts) catches
-- the vast majority of duplicate-create attempts, but a SELECT-then-
-- INSERT sequence is not atomic. Two concurrent requests can both
-- pass the pre-check and then both insert. Production saw this
-- happen during multi-tab migrations and seed scripts (sub-second
-- creates). Founder asked for a "complete" fix — this is it.
--
-- Strategy: a partial UNIQUE index on (user_id, normalized_title,
-- md5(markdown)) covering only LIVE rows owned by an authenticated
-- user. Anonymous-owned docs (no user_id) are unconstrained — anon
-- sessions intentionally allow free experimentation. Soft-deleted
-- rows (deleted_at IS NOT NULL) are excluded so the dedupe script's
-- canonical-keep policy still works: dropping the duplicate row by
-- setting deleted_at frees the slot, and the original survives.
--
-- The application route handler must catch unique-violation errors
-- (Postgres error code 23505) coming from this index and return the
-- existing row as the dedup hit, identical to the application-layer
-- helper's behaviour.

CREATE UNIQUE INDEX IF NOT EXISTS documents_owner_strict_dup_lock
ON documents (
  user_id,
  COALESCE(title, ''),
  md5(COALESCE(markdown, ''))
)
WHERE deleted_at IS NULL AND user_id IS NOT NULL;

COMMENT ON INDEX documents_owner_strict_dup_lock IS
  'Atomic guard against creating two live docs with identical (user_id, title, markdown). Partial: live + authenticated only. Application code must handle 23505 by returning the existing row.';
