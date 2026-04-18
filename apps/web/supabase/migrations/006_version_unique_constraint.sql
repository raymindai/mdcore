-- Add unique constraint to prevent duplicate version numbers
ALTER TABLE document_versions
ADD CONSTRAINT document_versions_document_id_version_number_key
UNIQUE (document_id, version_number);
