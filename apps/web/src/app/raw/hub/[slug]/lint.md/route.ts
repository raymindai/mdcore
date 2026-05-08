import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { computeLintReport, formatLintMarkdown } from "@/lib/hub-lint";

/**
 * GET /raw/hub/<slug>/lint.md
 *
 * Karpathy-shaped lint surface for AI fetchers. Public hubs only.
 * Returns plain markdown listing orphans and likely duplicates so a
 * model can see hub health alongside the index and log.
 *
 * Caching: 60 seconds. Lint compute is N round-trips per doc for the
 * embedding RPC; we don't want every AI fetch to recompute.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new NextResponse("Storage not configured", { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, hub_public")
    .eq("hub_slug", slug)
    .single();
  if (!profile || !profile.hub_public) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const report = await computeLintReport(supabase, profile.id);
    const md = formatLintMarkdown(report);
    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("lint.md compute error:", err);
    return new NextResponse("Lint compute failed", { status: 500 });
  }
}
