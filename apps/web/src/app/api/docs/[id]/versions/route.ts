import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

// GET /api/docs/{id}/versions — list version history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  // Verify parent document exists and requester has access (same checks as docs/[id] GET)
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, password_hash, expires_at, is_draft, user_id, anonymous_id, allowed_emails, deleted_at")
    .eq("id", id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft-deleted check
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const requesterId = verified?.userId || req.headers.get("x-user-id");
  const requesterAnonId = req.headers.get("x-anonymous-id");

  if (doc.deleted_at) {
    const isOwner = !!(requesterId && doc.user_id && requesterId === doc.user_id);
    if (!isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Expiration check
  if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
    return NextResponse.json({ error: "Document expired" }, { status: 410 });
  }

  // Draft check: only owner can access
  if (doc.is_draft) {
    const isDraftOwner =
      !!(requesterId && doc.user_id && requesterId === doc.user_id) ||
      !!(requesterAnonId && doc.anonymous_id && requesterAnonId === doc.anonymous_id);
    if (!isDraftOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Email-restricted access
  const allowedEmails: string[] = doc.allowed_emails || [];
  if (allowedEmails.length > 0) {
    const requesterEmail = verified?.email || req.headers.get("x-user-email") || "";
    const isOwner = !!(requesterId && doc.user_id && requesterId === doc.user_id);
    const isAllowed = allowedEmails.some(e => e.toLowerCase() === requesterEmail.toLowerCase());
    if (!isOwner && !isAllowed) {
      return NextResponse.json({ error: "Access restricted", restricted: true }, { status: 403 });
    }
  }

  // Password check (supports both salted "salt:hash" and legacy unsalted formats)
  if (doc.password_hash) {
    const providedPassword = req.headers.get("x-document-password") || "";
    if (!providedPassword) {
      return NextResponse.json({ error: "Password required", passwordRequired: true }, { status: 401 });
    }
    const encoder = new TextEncoder();
    let passwordMatch = false;
    if (doc.password_hash.includes(":")) {
      const [salt, storedHash] = doc.password_hash.split(":", 2);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(salt + providedPassword));
      const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      passwordMatch = hash === storedHash;
    } else {
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(providedPassword));
      const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      passwordMatch = hash === doc.password_hash;
    }
    if (!passwordMatch) {
      return NextResponse.json({ error: "Wrong password", passwordRequired: true }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("document_versions")
    .select("id, version_number, title, created_at, created_by, change_summary")
    .eq("document_id", id)
    .order("version_number", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }

  return NextResponse.json({ versions: data });
}
