import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { verifyAuthToken } from "@/lib/verify-auth";
import { corsHeaders, ensureAnonymousCookie, readAnonymousCookie } from "@/lib/anonymous-cookie";
import { appendHubLog } from "@/lib/hub-log";
import { maybeRefreshSuggestions } from "@/lib/hub-suggestions";

/**
 * CORS preflight for cross-origin capture (bookmarklet on chatgpt.com,
 * claude.ai, gemini.google.com → mdfy.app/api/docs). Trusted origins
 * defined in lib/anonymous-cookie.ts; everything else gets a no-op.
 */
export async function OPTIONS(req: NextRequest) {
  const headers = corsHeaders(req);
  return new NextResponse(null, { status: 204, headers });
}

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
    // Compile-as-first-class — when this doc is created as the output of
    // /api/bundles/:id/synthesize, these fields persist its provenance so
    // the user can recompile and we can detect when it goes stale.
    compileKind?: "memo" | "faq" | "brief";
    compileFrom?: { bundleId?: string; docIds?: string[]; intent?: string | null };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { markdown = "", title, password, expiresIn, editMode, isDraft, source, folderId, compileKind, compileFrom } = body;
  let { userId } = body;
  let { anonymousId } = body;

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

  // x-anonymous-id header fallback (extension and bookmarklet may pass it)
  if (!anonymousId) {
    anonymousId = req.headers.get("x-anonymous-id") || undefined;
  }

  // Cookie fallback: when neither body, header, nor user is provided, group
  // this capture under the browser's mdfy_anon cookie so the user can claim
  // every captured doc on sign-in.
  if (!userId && !anonymousId) {
    anonymousId = readAnonymousCookie(req) || undefined;
  }
  // If still nothing AND no auth, mint a fresh id now so the inserted row
  // has it. The Set-Cookie at the end of the handler persists it for next time.
  if (!userId && !anonymousId) {
    anonymousId = crypto.randomUUID();
  }

  // Allow empty markdown for auto-save (draft creation)
  if (typeof markdown !== "string") {
    return NextResponse.json({ error: "markdown must be a string" }, { status: 400 });
  }
  if (markdown.length > 500_000) {
    return NextResponse.json({ error: "Document too large (max 500KB)" }, { status: 413 });
  }

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

  // Retry nanoid generation on unique constraint violation (up to 3 attempts)
  let id: string = "";
  let insertError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    id = nanoid(8);
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
      compile_kind: compileKind || null,
      compile_from: compileFrom || null,
      compiled_at: compileKind ? new Date().toISOString() : null,
    });
    if (!error) { insertError = null; break; }
    if (error.code === "23505") { insertError = error; continue; } // unique violation, retry
    insertError = error; break; // other error, don't retry
  }

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // Best-effort hub log entry. Anonymous docs aren't logged because
  // there's no user to attribute them to until claim time.
  if (userId) {
    void appendHubLog({
      userId,
      event: source === "auto-synthesis" ? "synthesis.created" : "doc.created",
      targetType: "document",
      targetId: id,
      summary: title || null,
      metadata: { source: source || null, isDraft: isDraft ?? true },
    });

    // W6 proactive bundle suggestions. Throttled per-user to once per
    // 12h inside maybeRefreshSuggestions, so frequent doc bursts
    // don't hammer the LLM. Skip auto-synthesis docs (they shouldn't
    // trigger their own clustering pass).
    if (source !== "auto-synthesis" && !isDraft) {
      const ownerId = userId;
      after(async () => {
        try {
          await maybeRefreshSuggestions(supabase, ownerId);
        } catch (err) {
          console.warn("Suggestion refresh failed:", err);
        }
      });
    }
  }

  const res = NextResponse.json({ id, editToken, created_at: new Date().toISOString() });
  // CORS for cross-origin captures
  for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
  // Issue / refresh the anonymous cookie so subsequent captures from this
  // browser group together. Skip when authenticated.
  ensureAnonymousCookie(req, res, {
    skip: !!userId,
    explicitId: anonymousId ?? readAnonymousCookie(req),
  });
  return res;
}
