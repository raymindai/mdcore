import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const anonymousId = req.headers.get("x-anonymous-id");

  if (!userId && !anonymousId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let query = supabase
    .from("documents")
    .select("id, title, created_at, updated_at, view_count, is_draft, edit_mode, allowed_emails")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (anonymousId) {
    query = query.eq("anonymous_id", anonymousId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}
