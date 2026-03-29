-- Link documents to authenticated users (optional — anonymous docs still work)
ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX idx_documents_user_id ON documents (user_id) WHERE user_id IS NOT NULL;

-- Profiles table (synced from auth.users via trigger)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Documents: public read (for shared docs), owners can manage
CREATE POLICY "Anyone can read documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update own documents" ON documents FOR UPDATE USING (
  user_id = auth.uid() OR edit_token IS NOT NULL
);
CREATE POLICY "Owners can delete own documents" ON documents FOR DELETE USING (
  user_id = auth.uid() OR edit_token IS NOT NULL
);

-- Service role bypasses RLS, so existing API routes continue to work
