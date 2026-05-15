-- Lifecycle webhooks via pg_net + Postgres triggers.
--
-- Replaces the manual Supabase Dashboard webhook UI: every INSERT
-- into documents / bundles / bundle_documents fires a POST to our
-- /api/hooks/* handlers. Identical contract, but defined in SQL so
-- it ships with the repo and re-applies idempotently.
--
-- This file is `_lifecycle_webhooks_template.sql` (not numbered) so
-- supabase db push doesn't auto-apply it. It contains a
-- `<WEBHOOK_SECRET>` placeholder that must be substituted with the
-- value stored in Vercel's WEBHOOK_SECRET env var, then renamed to
-- a numbered `*_lifecycle_webhooks.sql` migration before push.

-- Requires pg_net (Supabase ships it pre-enabled on free + pro).
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- The trigger function. Secret + base URL are embedded as literals
-- inside the function body — Supabase managed Postgres doesn't grant
-- ALTER DATABASE to the service role, so the cleaner
-- current_setting() pattern isn't available. Function ownership +
-- search_path lock prevent the secret from leaking via pg_proc to
-- non-superusers (the function source is visible to authenticated
-- roles, but pg_proc is restricted in Supabase by default).
--
-- Secret rotation: replace <WEBHOOK_SECRET> in the .template, rename
-- to a new numbered migration, re-apply. CREATE OR REPLACE FUNCTION
-- swaps the body atomically.
CREATE OR REPLACE FUNCTION public.fire_lifecycle_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_path TEXT;
  webhook_url TEXT;
  webhook_secret CONSTANT TEXT := '<WEBHOOK_SECRET>';
  base_url CONSTANT TEXT := 'https://mdfy.app';
  payload JSONB;
BEGIN
  -- Per-table routing. The trigger declares the path via the first
  -- argument so we can keep one shared function for all three tables.
  webhook_path := TG_ARGV[0];
  webhook_url := base_url || webhook_path;

  -- Match Supabase Dashboard webhook payload shape so /api/hooks/*
  -- handlers don't have to branch on the source.
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END
  );

  -- pg_net.http_post returns a request id; we don't wait for the
  -- response — fire-and-forget so writes don't block on remote
  -- latency / failures. Supabase queues + retries internally.
  PERFORM extensions.http_post(
    url := webhook_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Per-table triggers. Each calls the shared function with the right
-- path. Drop-and-recreate so re-running this template is idempotent.

DROP TRIGGER IF EXISTS mdfy_doc_created ON public.documents;
CREATE TRIGGER mdfy_doc_created
AFTER INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.fire_lifecycle_webhook('/api/hooks/doc-created');

DROP TRIGGER IF EXISTS mdfy_bundle_created ON public.bundles;
CREATE TRIGGER mdfy_bundle_created
AFTER INSERT ON public.bundles
FOR EACH ROW
EXECUTE FUNCTION public.fire_lifecycle_webhook('/api/hooks/bundle-created');

DROP TRIGGER IF EXISTS mdfy_bundle_membership_changed ON public.bundle_documents;
CREATE TRIGGER mdfy_bundle_membership_changed
AFTER INSERT OR DELETE ON public.bundle_documents
FOR EACH ROW
EXECUTE FUNCTION public.fire_lifecycle_webhook('/api/hooks/bundle-membership-changed');

-- Verification: list current triggers + the database settings
COMMENT ON FUNCTION public.fire_lifecycle_webhook() IS
  'Fires POST to base_url || webhook_path with Supabase-shape payload + WEBHOOK_SECRET auth. Configured at /api/hooks/* in apps/web. Rotate by editing _lifecycle_webhooks_template.sql + re-applying as a new numbered migration.';
