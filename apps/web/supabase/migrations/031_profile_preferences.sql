-- Profile preferences sync — per-account storage for client-side
-- settings that used to live in localStorage only. Keeps the user's
-- curator preferences, accent + scheme picks consistent across
-- devices and surface refreshes.
--
-- All columns are nullable; localStorage still acts as the
-- offline-first source and writes mirror to here. On profile load
-- the client merges server → local with the server winning when
-- both exist.

alter table profiles
  add column if not exists curator_settings jsonb default null;

alter table profiles
  add column if not exists accent_color text default null;

alter table profiles
  add column if not exists color_scheme text default null;

-- No indexes — these are read once per profile load, no scans
-- against them.
