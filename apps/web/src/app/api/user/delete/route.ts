import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  if (!verified?.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = verified.userId;

  // Delete all user's documents (CASCADE deletes versions, visit_history)
  await supabase.from("documents").delete().eq("user_id", userId);

  // Delete user's folders
  await supabase.from("folders").delete().eq("user_id", userId);

  // Delete user's notifications
  if (verified.email) {
    await supabase.from("notifications").delete().eq("recipient_email", verified.email.toLowerCase());
  }

  // Delete user's profile
  await supabase.from("profiles").delete().eq("id", userId);

  // Delete the auth user
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
