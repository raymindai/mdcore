-- Avatar style picker — let the user choose between their OAuth
-- photo and a handful of DiceBear styles. Style id is stored as
-- a text key (e.g. "identicon", "avataaars", "oauth"); the
-- client maps it to a URL. Nullable so existing accounts keep
-- whatever resolveAvatar() picks by default.

alter table profiles
  add column if not exists avatar_style text default null;
