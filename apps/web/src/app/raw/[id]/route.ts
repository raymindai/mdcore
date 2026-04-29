import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const { data } = await supabase
    .from("documents")
    .select("id, markdown, title, is_draft, deleted_at, password_hash")
    .eq("id", id)
    .single();

  if (!data || data.deleted_at || data.is_draft || data.password_hash) {
    return new NextResponse("Document not found", { status: 404 });
  }

  const title = data.title || "Untitled";
  const body = `# ${title}\n\n${data.markdown}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Document-ID": id,
      "X-Document-Title": encodeURIComponent(title),
    },
  });
}
