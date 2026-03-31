import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// GET /api/docs/{id}/versions — list version history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("document_versions")
    .select("id, version_number, title, created_at, created_by, change_summary")
    .eq("document_id", id)
    .order("version_number", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }

  return NextResponse.json({ versions: data });
}
