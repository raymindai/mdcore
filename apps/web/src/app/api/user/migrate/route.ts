import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

export async function POST(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let body: { anonymousId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { anonymousId } = body;
  if (!anonymousId) {
    return NextResponse.json({ error: "anonymousId required" }, { status: 400 });
  }

  // Migrate all documents from anonymous_id to user_id
  const { data, error } = await supabase
    .from("documents")
    .update({
      user_id: userId,
      anonymous_id: null,
      edit_mode: "account",
    })
    .eq("anonymous_id", anonymousId)
    .select("id");

  if (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Failed to migrate" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    migrated: data?.length || 0,
  });
}
