// Lightweight concept count for the hub. Used by HubChat's empty state
// to show "<N> concepts indexed — ask anything" without loading the full
// concept list. Public — same scope as the hub itself, since the slug is
// only resolvable when the hub is reachable to the caller.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ count: 0 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("hub_slug", slug)
    .single();
  if (!profile) return NextResponse.json({ count: 0 });

  const { count } = await supabase
    .from("concept_index")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  return NextResponse.json({ count: count ?? 0 });
}
