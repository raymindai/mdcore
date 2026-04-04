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

  // Auth check — allow anonymous with lower limits
  const userId = req.headers.get("x-user-id");
  const anonymousId = req.headers.get("x-anonymous-id");
  if (!userId && !anonymousId) {
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
  let currentUsage = 0;
  let quota = QUOTA_FREE;
  const ownerId = userId || `anon-${anonymousId}`;

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, storage_used_bytes")
      .eq("id", userId)
      .single();

    if (profile) {
      quota = profile.plan === "pro" ? QUOTA_PRO : QUOTA_FREE;
      currentUsage = profile.storage_used_bytes || 0;
    }
  } else {
    // Anonymous: 20MB quota, no profile needed
    quota = 20 * 1024 * 1024;
  }

  if (currentUsage + file.size > quota) {
    const usedMB = Math.round(currentUsage / 1024 / 1024);
    const quotaMB = Math.round(quota / 1024 / 1024);
    return NextResponse.json(
      {
        error: `Storage limit reached (${usedMB}MB / ${quotaMB}MB). ${!userId ? "Sign in for 100MB free storage." : quota < QUOTA_PRO ? "Upgrade to Pro for 10GB." : ""}`,
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
  const storagePath = `${ownerId}/${hash}.${ext}`;

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

  // Update storage usage (only for authenticated users with profile)
  if (userId) {
    await supabase
      .from("profiles")
      .update({ storage_used_bytes: currentUsage + file.size })
      .eq("id", userId);
  }

  return NextResponse.json({
    url: urlData.publicUrl,
    size: file.size,
    hash,
  });
}
