import { getSupabaseClient } from "./supabase";

export async function verifyAuthToken(
  authHeader: string | null
): Promise<{ userId: string; email: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id, email: user.email || "" };
  } catch {
    return null;
  }
}
