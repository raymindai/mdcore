-- v6 Hub URL — third URL scope.
--
-- A Hub URL exposes a user's entire public knowledge as one address
-- (mdfy.app/hub/<slug>). Same primitive as Document and Bundle URLs:
-- versioned, deployable, addressable. Default-private — user opts in
-- by setting hub_public = true via Settings.
--
-- All additive (production-safe). The handle_new_user trigger keeps
-- creating profiles with these defaults so new signups get a slot
-- but no exposure until they choose to enable.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hub_slug TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hub_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hub_description TEXT;

-- Slug is the public identifier. Lowercase letters, digits, hyphens,
-- underscores, 3-32 chars. Uniqueness is enforced when set; NULL is
-- always allowed (user hasn't picked a slug yet).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_hub_slug
  ON profiles (hub_slug)
  WHERE hub_slug IS NOT NULL;

-- Soft check at the SQL layer; the API also validates before write.
-- Postgres lacks ADD CONSTRAINT IF NOT EXISTS, so guard via DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_hub_slug_format'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_hub_slug_format
      CHECK (hub_slug IS NULL OR hub_slug ~ '^[a-z0-9_-]{3,32}$');
  END IF;
END
$$;

-- RLS: anyone can read (id, display_name, avatar_url, hub_slug,
-- hub_description) when hub_public is true. Existing "users can read
-- own profile" policy stays as-is. Public hub read is a new policy
-- so it doesn't expand the surface for anything else (plan, email,
-- storage_used_bytes remain owner-only).
DROP POLICY IF EXISTS "Public hub read" ON profiles;
CREATE POLICY "Public hub read" ON profiles
  FOR SELECT
  USING (hub_public = TRUE);
