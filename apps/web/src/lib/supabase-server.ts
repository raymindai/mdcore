import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-aware Supabase client for server components / server actions.
// Used by /d/[id] and /b/[id] page.tsx to identify the requesting user
// from the Supabase session cookie at SSR time, so owner redirects can
// happen before the viewer ever renders (no client-side flash).
//
// Read-only by default — server components shouldn't be writing back to
// the cookie store anyway, and Next throws if you try from inside one.
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op in read-only contexts. Server components can't mutate
        // cookies; auth refreshes happen on the client.
      },
    },
  });
}

// Returns the user_id of the currently signed-in caller, or null when
// the request has no Supabase session cookie. Used as the SSR side of
// owner-vs-visitor decisions.
export async function getServerUserId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  } catch {
    return null;
  }
}
