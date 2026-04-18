import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { verifyAuthToken } from "@/lib/verify-auth";

export async function POST(req: NextRequest) {
  // Rate limit by IP (x-real-ip and x-forwarded-for are set by Vercel's proxy in production)
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } }
    );
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  let body: {
    markdown?: string;
    title?: string;
    password?: string;
    expiresIn?: number;
    userId?: string;
    userEmail?: string;
    anonymousId?: string;
    editMode?: string;
    isDraft?: boolean;
    source?: string;
    folderId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { markdown = "", title, password, expiresIn, anonymousId, editMode, isDraft, source, folderId } = body;
  let { userId } = body;

  // Verify JWT from Authorization header (VS Code extension, MCP, etc.)
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  if (!userId && verified?.userId) {
    userId = verified.userId;
  }

  // Resolve email → userId: check body.userEmail, then x-user-email header
  const resolvedEmail = body.userEmail || verified?.email || req.headers.get("x-user-email") || "";
  if (!userId && resolvedEmail) {
    if (supabase) {
      try {
        const { data } = await supabase.auth.admin.listUsers();
        const user = data?.users?.find(u => u.email?.toLowerCase() === resolvedEmail.toLowerCase());
        if (user) userId = user.id;
      } catch { /* ignore */ }
    }
  }

  // Also check x-user-id header as final fallback (web app)
  if (!userId) {
    userId = req.headers.get("x-user-id") || undefined;
  }

  // Allow empty markdown for auto-save (draft creation)
  if (typeof markdown !== "string") {
    return NextResponse.json({ error: "markdown must be a string" }, { status: 400 });
  }
  if (markdown.length > 500_000) {
    return NextResponse.json({ error: "Document too large (max 500KB)" }, { status: 413 });
  }

  const id = nanoid(8);
  const editToken = nanoid(32);

  // Salted password hash (salt:base64-SHA-256)
  let passwordHash: string | null = null;
  if (password) {
    const salt = crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    passwordHash = `${salt}:${hash}`;
  }

  // Expiration: expiresIn is in hours (user-specified only)
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()
    : null;

  // Determine edit mode:
  // - logged in user → "account" (only owner edits)
  // - anonymous → "token" (edit_token = ownership proof)
  const resolvedEditMode = editMode || (userId ? "account" : "token");

  const { error } = await supabase.from("documents").insert({
    id,
    markdown,
    title: title || null,
    edit_token: editToken,
    password_hash: passwordHash,
    expires_at: expiresAt,
    user_id: userId || null,
    anonymous_id: (!userId && anonymousId) ? anonymousId : null,
    edit_mode: resolvedEditMode,
    is_draft: isDraft ?? true,
    source: source || null,
    folder_id: folderId || null,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ id, editToken, created_at: new Date().toISOString() });
}
