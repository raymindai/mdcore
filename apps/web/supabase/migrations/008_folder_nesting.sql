-- Add nesting + emoji to folders
-- parent_id: self-referencing FK with ON DELETE SET NULL so deleting a parent
-- promotes its children to the deleted folder's grandparent (handled by API too).
alter table public.folders
  add column if not exists parent_id text references public.folders(id) on delete set null,
  add column if not exists emoji text;

-- Index for cheap "list children of folder X" queries
create index if not exists folders_parent_id_idx
  on public.folders(parent_id)
  where parent_id is not null;
