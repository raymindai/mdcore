import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { readHubLog, formatHubLogMarkdown } from "@/lib/hub-log";

/**
 * GET /raw/hub/<slug>/log.md
 *
 * Karpathy-shaped append-only log for AI fetchers. Returns plain
 * markdown so a model can pull it alongside /raw/hub/<slug> and see
 * the chronology of how the hub got built.
 *
 * Surface rules mirror /raw/hub/<slug>: only public hubs respond. We
 * never expose log entries that reference draft / private docs by
 * leaking their titles; the helper passes everything through, but
 * private targets just appear with a generic summary or nothing.
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

  const rows = await readHubLog(profile.id, 200);
  const md = formatHubLogMarkdown(rows);

  return new NextResponse(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
