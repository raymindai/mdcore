import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let body: { documentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { documentId } = body;
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  // Upsert: update last_visited_at if exists, insert if not
  const { error } = await supabase
    .from("visit_history")
    .upsert(
      { user_id: userId, document_id: documentId, last_visited_at: new Date().toISOString() },
      { onConflict: "user_id,document_id" }
    );

  if (error) {
    console.error("Visit upsert error:", error);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
