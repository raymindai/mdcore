import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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
    anonymousId?: string;
    editMode?: string;
    isDraft?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { markdown = "", title, password, expiresIn, userId, anonymousId, editMode, isDraft } = body;

  // Allow empty markdown for auto-save (draft creation)
  if (typeof markdown !== "string") {
    return NextResponse.json({ error: "markdown must be a string" }, { status: 400 });
  }
  if (markdown.length > 500_000) {
    return NextResponse.json({ error: "Document too large (max 500KB)" }, { status: 413 });
  }

  const id = nanoid(8);
  const editToken = nanoid(32);

  // Simple password hash (base64 of SHA-256)
  let passwordHash: string | null = null;
  if (password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    passwordHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  // Determine plan: Pro users get permanent docs, Free/anonymous get 7-day expiry
  let isPro = false;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();
    isPro = profile?.plan === "pro";
  }

  // Expiration:
  // - user-specified expiresIn (hours) takes precedence
  // - Pro users: no expiry (permanent)
  // - Free / anonymous: auto 7-day expiry (drives the viral loop + upgrades)
  // - Drafts: no expiry until they're published (handled when is_draft → false)
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  let expiresAt: string | null;
  if (expiresIn) {
    expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString();
  } else if (isDraft) {
    expiresAt = null;
  } else if (isPro) {
    expiresAt = null;
  } else {
    expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
  }

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
    is_draft: isDraft ?? false,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ id, editToken });
}
