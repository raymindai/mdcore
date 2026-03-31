import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// GET /api/docs/{id}/versions/{versionId} — get a specific version's content
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", id)
    .eq("id", versionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({ version: data });
}
