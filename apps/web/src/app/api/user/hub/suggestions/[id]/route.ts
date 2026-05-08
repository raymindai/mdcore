import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/user/hub/suggestions/[id]
 *
 * Mark a suggestion as dismissed. We never hard-delete so the
 * generator can avoid reproposing the same cluster.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { error } = await supabase
    .from("hub_suggestions")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "open");
  if (error) return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
