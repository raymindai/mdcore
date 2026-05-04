-- Bundles can live inside folders (same folders table, distinguished by section).
-- folders.section can now be 'my' | 'shared' | 'bundles'. No constraint on the
-- column so this migration is forward-compatible without a check constraint update.
alter table public.bundles
  add column if not exists folder_id text references public.folders(id) on delete set null;

create index if not exists bundles_folder_id_idx
  on public.bundles(folder_id)
  where folder_id is not null;
