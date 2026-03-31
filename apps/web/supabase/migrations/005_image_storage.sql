-- Track user storage usage for image uploads
ALTER TABLE profiles ADD COLUMN storage_used_bytes BIGINT NOT NULL DEFAULT 0;

-- Note: Supabase Storage bucket 'document-images' must be created via Dashboard:
-- Storage → New bucket → Name: "document-images" → Public: ON
