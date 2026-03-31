import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import crypto from "crypto";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const QUOTA_FREE = 100 * 1024 * 1024;  // 100MB
const QUOTA_PRO = 10 * 1024 * 1024 * 1024; // 10GB

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  // Auth check
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to upload images", requiresAuth: true },
      { status: 401 }
    );
  }

  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate type
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported format. Allowed: JPEG, PNG, GIF, WebP, SVG` },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 413 }
    );
  }

  // Check user quota
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, storage_used_bytes")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const quota = profile.plan === "pro" ? QUOTA_PRO : QUOTA_FREE;
  const currentUsage = profile.storage_used_bytes || 0;

  if (currentUsage + file.size > quota) {
    const usedMB = Math.round(currentUsage / 1024 / 1024);
    const quotaMB = Math.round(quota / 1024 / 1024);
    return NextResponse.json(
      {
        error: `Storage limit reached (${usedMB}MB / ${quotaMB}MB). ${profile.plan !== "pro" ? "Upgrade to Pro for 10GB." : ""}`,
        quotaExceeded: true,
      },
      { status: 413 }
    );
  }

  // Read file buffer and compute content hash
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);

  // Determine extension
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  const ext = extMap[file.type] || "png";
  const storagePath = `${userId}/${hash}.${ext}`;

  // Upload to Supabase Storage (upsert — dedup by hash)
  const { error: uploadError } = await supabase.storage
    .from("document-images")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("document-images")
    .getPublicUrl(storagePath);

  // Update storage usage
  await supabase
    .from("profiles")
    .update({ storage_used_bytes: currentUsage + file.size })
    .eq("id", userId);

  return NextResponse.json({
    url: urlData.publicUrl,
    size: file.size,
    hash,
  });
}
