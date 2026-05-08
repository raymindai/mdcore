import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// W11b — public discovery feed for bundles whose owners opted in.
// Returns the most recently updated discoverable bundles, with the
// owner's hub slug + display name so the consumer can attribute them
// without doing a second profile lookup per row.
export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const limitRaw = parseInt(url.searchParams.get("limit") || "30", 10);
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 30 : limitRaw, 1), 100);
  const cursor = url.searchParams.get("cursor"); // ISO updated_at timestamp

  let query = supabase
    .from("bundles")
    .select("id, title, description, updated_at, allowed_emails, password_hash, is_discoverable, is_draft, user_id")
    .eq("is_discoverable", true)
    .eq("is_draft", false)
    .is("password_hash", null)
    .order("updated_at", { ascending: false })
    .limit(limit + 1);
  if (cursor) query = query.lt("updated_at", cursor);

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  // Bundles can have an empty allowed_emails array but the column type
  // permits any[] so be defensive. Reject any that slipped through.
  const visible = (rows || []).filter(b =>
    !Array.isArray(b.allowed_emails) || b.allowed_emails.length === 0
  );
  const hasMore = visible.length > limit;
  const page = visible.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1].updated_at : null;

  const userIds = Array.from(new Set(page.map(b => b.user_id)));
  const profilesById = new Map<string, { hub_slug: string | null; display_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, hub_slug, display_name, hub_public")
      .in("id", userIds);
    for (const p of profiles || []) {
      // Only surface hub attribution when the owner's hub is public.
      profilesById.set(p.id, {
        hub_slug: p.hub_public ? p.hub_slug : null,
        display_name: p.display_name,
      });
    }
  }

  return NextResponse.json({
    bundles: page.map(b => {
      const owner = profilesById.get(b.user_id) || { hub_slug: null, display_name: null };
      return {
        id: b.id,
        title: b.title,
        description: b.description,
        updated_at: b.updated_at,
        owner: {
          hub_slug: owner.hub_slug,
          display_name: owner.display_name,
        },
      };
    }),
    nextCursor,
  });
}
