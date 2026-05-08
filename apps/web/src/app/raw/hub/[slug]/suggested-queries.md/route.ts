import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { computeSuggestedQueries, formatSuggestedQueriesMarkdown } from "@/lib/hub-suggested-queries";

/**
 * GET /raw/hub/<slug>/suggested-queries.md
 *
 * Karpathy-shaped public surface. Five productive questions to ask
 * with this hub as context, in plain markdown. Public hubs only.
 *
 * 5-minute cache: the queries are stable enough between LLM calls
 * that recomputing per-fetch wastes money.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return new NextResponse("Storage not configured", { status: 503 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, hub_public")
    .eq("hub_slug", slug)
    .single();
  if (!profile || !profile.hub_public) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const report = await computeSuggestedQueries(supabase, profile.id);
    const md = formatSuggestedQueriesMarkdown(report);
    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
      },
    });
  } catch (err) {
    console.error("suggested-queries.md error:", err);
    return new NextResponse("Failed", { status: 500 });
  }
}
