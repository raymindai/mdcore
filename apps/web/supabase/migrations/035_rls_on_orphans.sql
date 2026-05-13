-- 035: Enable RLS on the five tables flagged by the Supabase
-- database linter (rls_disabled_in_public, severity ERROR).
--
-- All five tables are exclusively accessed server-side through
-- `getSupabaseClient()` in @/lib/supabase.ts, which uses
-- SUPABASE_SERVICE_ROLE_KEY. The service role bypasses RLS, so
-- enabling RLS *without policies* doesn't break any code path the
-- app actually uses — it only blocks direct PostgREST access from
-- the browser anon/authenticated clients, which the linter rightly
-- considers a security gap (anyone with the publishable anon key
-- could otherwise SELECT every row).
--
-- If a future feature needs browser-side reads (e.g. realtime
-- subscriptions on bundles), add a tight policy at that point.
-- Default-deny here is the safer starting position.

ALTER TABLE public.bundles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_index      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_relations  ENABLE ROW LEVEL SECURITY;
