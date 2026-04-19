import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

export const runtime = "nodejs";

const QUOTA_FREE = 20 * 1024 * 1024;   // 20MB
const QUOTA_PRO = 1024 * 1024 * 1024;  // 1GB

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // List files in user's storage folder
  const { data: files, error } = await supabase.storage
    .from("document-images")
    .list(userId, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
  }

  // Get quota info
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, storage_used_bytes")
    .eq("id", userId)
    .single();

  const plan = profile?.plan || "free";
  const quota = plan === "pro" ? QUOTA_PRO : QUOTA_FREE;
  const used = profile?.storage_used_bytes || 0;

  // Build image list with public URLs
  const images = (files || [])
    .filter(f => f.name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name))
    .map(f => {
      const { data } = supabase.storage.from("document-images").getPublicUrl(`${userId}/${f.name}`);
      return {
        name: f.name,
        url: data.publicUrl,
        size: f.metadata?.size || 0,
        createdAt: f.created_at,
      };
    });

  return NextResponse.json({
    images,
    quota: { used, total: quota, plan },
  });
}
