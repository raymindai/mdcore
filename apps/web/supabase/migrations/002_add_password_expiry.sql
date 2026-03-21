ALTER TABLE documents ADD COLUMN password_hash TEXT;
ALTER TABLE documents ADD COLUMN expires_at TIMESTAMPTZ;
