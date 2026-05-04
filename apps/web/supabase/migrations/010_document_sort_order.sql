-- Manual sort order for documents within a folder (or root).
-- Used when the user picks "Custom" sort mode in the sidebar; ignored for "A-Z".
-- Default 0 means "fall back to title sort" within the same sort_order bucket.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_documents_folder_sort
  ON documents (folder_id, sort_order)
  WHERE folder_id IS NOT NULL;
