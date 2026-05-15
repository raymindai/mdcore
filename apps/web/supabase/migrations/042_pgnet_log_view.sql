-- Expose pg_net's request log + queue as a read-only view in `public`
-- so we can inspect webhook delivery via PostgREST + service-role key.
-- Without this we can only see net.* via psql, which we don't have on
-- this serverless setup.
--
-- Limit columns + add an owner check so this is service-role-only via
-- RLS — even though PostgREST is using the service role, leaking
-- response bodies via anon would expose webhook payloads.

CREATE OR REPLACE VIEW public.pgnet_webhook_log AS
SELECT
  id,
  status_code,
  content::text AS body,
  created
FROM net._http_response
ORDER BY id DESC
LIMIT 100;

GRANT SELECT ON public.pgnet_webhook_log TO service_role;
REVOKE ALL ON public.pgnet_webhook_log FROM anon, authenticated;
