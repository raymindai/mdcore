import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Only handle document-like IDs (6-12 alphanumeric chars)
  if (!/^[A-Za-z0-9_-]{6,12}$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const { data } = await supabase
    .from("documents")
    .select("id, markdown, title, is_draft, deleted_at, password_hash, expires_at")
    .eq("id", id)
    .single();

  if (!data || data.deleted_at) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (data.is_draft || data.password_hash) {
    return NextResponse.redirect(new URL(`/d/${id}`, _request.url));
  }

  const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
  if (isExpired) {
    return new NextResponse("Document expired", { status: 410 });
  }

  const title = data.title || "Untitled";
  const markdown = data.markdown || "";

  // Browsers (JS-capable): redirect to full rendered viewer
  // LLMs/crawlers (no JS): read the markdown content directly
  const body = `# ${title}\n\n${markdown}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Document-ID": id,
    },
  });
}
