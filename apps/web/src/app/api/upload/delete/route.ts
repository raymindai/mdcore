import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

export const runtime = "nodejs";

const QUOTA_FREE = 20 * 1024 * 1024;   // 20MB
const QUOTA_PRO = 1024 * 1024 * 1024;  // 1GB

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // Validate filename (prevent path traversal)
  if (name.includes("/") || name.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const storagePath = `${userId}/${name}`;

  // Get file size before deletion for quota update
  const { data: fileList } = await supabase.storage
    .from("document-images")
    .list(userId, { search: name });
  const fileSize = fileList?.find(f => f.name === name)?.metadata?.size || 0;

  // Delete from storage
  const { error } = await supabase.storage
    .from("document-images")
    .remove([storagePath]);

  if (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  // Update storage usage
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, storage_used_bytes")
    .eq("id", userId)
    .single();

  const newUsage = Math.max(0, (profile?.storage_used_bytes || 0) - fileSize);
  await supabase.from("profiles").update({ storage_used_bytes: newUsage }).eq("id", userId);

  const plan = profile?.plan || "free";
  const quota = plan === "pro" ? QUOTA_PRO : QUOTA_FREE;

  return NextResponse.json({
    ok: true,
    quota: { used: newUsage, total: quota, plan },
  });
}
