import { createClient } from "@supabase/supabase-js";

/**
 * Server-side only Supabase client.
 * Returns null if env vars are not configured (fallback to hash-based sharing).
 */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
