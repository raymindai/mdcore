import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

// Validate document ID: only alphanumeric, hyphen, underscore (nanoid charset)
function isValidDocId(id: string): boolean {
  return /^[\w-]+$/.test(id);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidDocId(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  // Verify JWT for authenticated requests
  const verified = await verifyAuthToken(_req.headers.get("authorization"));

  const { data, error } = await supabase
    .from("documents")
    .select("id, markdown, title, created_at, updated_at, view_count, password_hash, expires_at, edit_mode, user_id, anonymous_id, is_draft, allowed_emails, allowed_editors, edit_token, deleted_at, source")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft-deleted documents are not accessible (except by owner)
  if (data.deleted_at) {
    const requesterId = verified?.userId || _req.headers.get("x-user-id");
    const isOwner = !!(requesterId && data.user_id && requesterId === data.user_id);
    if (!isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Document expired" }, { status: 410 });
  }

  // Use JWT-verified userId first, then header fallback (web app uses x-user-id)
  const requesterId = verified?.userId || _req.headers.get("x-user-id");
  const requesterAnonId = _req.headers.get("x-anonymous-id");

  // Draft documents: only accessible by owner
  if (data.is_draft) {
    // Resolve email to userId for MCP and other email-only clients
    let resolvedOwnerId = requesterId;
    if (!resolvedOwnerId && !requesterAnonId) {
      const reqEmail = verified?.email || _req.headers.get("x-user-email") || "";
      if (reqEmail && data.user_id) {
        try {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(data.user_id);
          if (ownerUser?.user?.email?.toLowerCase() === reqEmail.toLowerCase()) {
            resolvedOwnerId = data.user_id;
          }
        } catch { /* ignore */ }
      }
    }
    const isDraftOwner =
      !!(resolvedOwnerId && data.user_id && resolvedOwnerId === data.user_id) ||
      !!(requesterAnonId && data.anonymous_id && requesterAnonId === data.anonymous_id);
    if (!isDraftOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Email-restricted access: if allowed_emails is set, only those emails (+ owner) can access
  const allowedEmails: string[] = data.allowed_emails || [];
  if (allowedEmails.length > 0) {
    const requesterEmail = verified?.email || _req.headers.get("x-user-email") || "";
    const isOwner = !!(requesterId && data.user_id && requesterId === data.user_id);
    const isAllowed = allowedEmails.some(e => e.toLowerCase() === requesterEmail.toLowerCase());
    if (!isOwner && !isAllowed) {
      return NextResponse.json({ error: "Access restricted", restricted: true, message: "This document is restricted to specific people." }, { status: 403 });
    }
  }

  // Check password (supports both salted "salt:hash" and legacy unsalted formats)
  const hasPassword = !!data.password_hash;
  if (hasPassword) {
    const providedPassword = _req.headers.get("x-document-password") || "";
    if (!providedPassword) {
      return NextResponse.json({ error: "Password required", passwordRequired: true }, { status: 401 });
    }
    // Rate limit password attempts
    const ip = _req.headers.get("x-real-ip") || _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = rateLimit(`pwd:${ip}:${id}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const encoder = new TextEncoder();
    let passwordMatch = false;
    if (data.password_hash.includes(":")) {
      const [salt, storedHash] = data.password_hash.split(":", 2);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(salt + providedPassword));
      const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      passwordMatch = hash === storedHash;
    } else {
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(providedPassword));
      const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      passwordMatch = hash === data.password_hash;
    }
    if (!passwordMatch) {
      return NextResponse.json({ error: "Wrong password", passwordRequired: true }, { status: 403 });
    }
  }

  // Check ownership: by user_id or anonymous_id
  const isOwnedByRequester =
    !!(requesterId && data.user_id && requesterId === data.user_id) ||
    !!(requesterAnonId && data.anonymous_id && requesterAnonId === data.anonymous_id);

  // Increment view count (fire-and-forget) — skip for document owner
  if (!isOwnedByRequester) {
    supabase
      .from("documents")
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq("id", id)
      .then(() => {});
  }

  // Don't expose sensitive fields
  const { password_hash: _ph, user_id: _uid, anonymous_id: _aid, allowed_emails: _ae, allowed_editors: _aed, edit_token: _et, deleted_at: _da, ...safeData } = data;

  // Check if requester is an allowed editor (for non-owner edit access)
  const requesterEmail = verified?.email || _req.headers.get("x-user-email") || "";
  const isAllowedEditor = (data.allowed_editors || []).some((e: string) => e.toLowerCase() === requesterEmail.toLowerCase());

  // Resolve owner email for non-owners (so they can see who owns the doc)
  let ownerEmail: string | undefined;
  if (!isOwnedByRequester && data.user_id) {
    try {
      const { data: ownerAuth } = await supabase.auth.admin.getUserById(data.user_id);
      ownerEmail = ownerAuth?.user?.email || undefined;
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    ...safeData,
    hasPassword,
    editMode: data.edit_mode || "token",
    isOwner: isOwnedByRequester,
    isEditor: isAllowedEditor,
    ...(isOwnedByRequester ? { editToken: data.edit_token, allowedEmails: data.allowed_emails || [], allowedEditors: data.allowed_editors || [] } : {}),
    ...(ownerEmail ? { ownerEmail } : {}),
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidDocId(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let body: {
    action?: string;
    editToken?: string;
    markdown?: string;
    title?: string;
    userId?: string;
    userEmail?: string;
    allowedEmails?: string[];
    allowedEditors?: string[];
    anonymousId?: string;
    changeSummary?: string;
    editMode?: string;
    isDraft?: boolean;
    source?: string;
    folderId?: string | null;
    expectedUpdatedAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify JWT — use verified identity over body values when available
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  if (verified) {
    body.userId = verified.userId;
    body.userEmail = verified.email;
  } else if (!body.userId && body.userEmail) {
    // Fallback: resolve email → userId (for non-JWT clients with editToken)
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const user = data?.users?.find(u => u.email?.toLowerCase() === body.userEmail!.toLowerCase());
      if (user) body.userId = user.id;
    } catch { /* ignore */ }
  }

  // Size limit (same as POST)
  if (body.markdown && body.markdown.length > 500_000) {
    return NextResponse.json({ error: "Document too large (max 500KB)" }, { status: 413 });
  }

  // Protect against empty content overwrite — never save blank document
  if (body.action === "auto-save" && body.markdown !== undefined && !body.markdown.trim()) {
    return NextResponse.json({ error: "Cannot save empty document" }, { status: 400 });
  }

  // ─── Action: rotate-token ───
  if (body.action === "rotate-token") {
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const { data: doc } = await supabase.from("documents").select("user_id").eq("id", id).single();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!doc.user_id || doc.user_id !== userId) {
      return NextResponse.json({ error: "Only the owner can rotate the token" }, { status: 403 });
    }
    const newToken = nanoid(32);
    const { error } = await supabase.from("documents").update({ edit_token: newToken }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to rotate token" }, { status: 500 });
    return NextResponse.json({ ok: true, editToken: newToken });
  }

  // ─── Action: change-edit-mode ───
  if (body.action === "change-edit-mode") {
    const { userId, editMode: newEditMode } = body;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (!newEditMode || !["owner", "token", "view"].includes(newEditMode)) {
      return NextResponse.json({ error: "Invalid editMode" }, { status: 400 });
    }
    const { data: doc } = await supabase.from("documents").select("user_id").eq("id", id).single();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!doc.user_id || doc.user_id !== userId) {
      return NextResponse.json({ error: "Only the owner can change edit mode" }, { status: 403 });
    }
    const { error } = await supabase.from("documents").update({ edit_mode: newEditMode }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to change edit mode" }, { status: 500 });
    return NextResponse.json({ ok: true, editMode: newEditMode });
  }

  // ─── Action: set-allowed-emails (viewers + editors) ───
  if (body.action === "set-allowed-emails") {
    const { userId, allowedEmails, allowedEditors } = body;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const { data: doc } = await supabase.from("documents").select("user_id").eq("id", id).single();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!doc.user_id || doc.user_id !== userId) {
      return NextResponse.json({ error: "Only the owner can manage access" }, { status: 403 });
    }
    const updates: Record<string, unknown> = {};
    if (Array.isArray(allowedEmails)) {
      if (allowedEmails.length > 50) return NextResponse.json({ error: "Too many allowed emails (max 50)" }, { status: 400 });
      updates.allowed_emails = allowedEmails.map((e: string) => e.trim().toLowerCase()).filter((e: string) => e.includes("@"));
    }
    if (Array.isArray(allowedEditors)) {
      if (allowedEditors.length > 50) return NextResponse.json({ error: "Too many allowed editors (max 50)" }, { status: 400 });
      updates.allowed_editors = allowedEditors.map((e: string) => e.trim().toLowerCase()).filter((e: string) => e.includes("@"));
    }
    const { error } = await supabase.from("documents").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    return NextResponse.json({ ok: true, allowedEmails: updates.allowed_emails, allowedEditors: updates.allowed_editors });
  }

  // ─── Action: snapshot (create version history entry without updating content) ───
  if (body.action === "snapshot") {
    const { userId, anonymousId, editToken, changeSummary } = body;

    const { data: doc } = await supabase
      .from("documents")
      .select("edit_token, markdown, title, user_id, anonymous_id")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Permission: owner or token holder
    const isOwner =
      !!(userId && doc.user_id && userId === doc.user_id) ||
      !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
    const hasToken = !!(editToken && doc.edit_token === editToken);
    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create version snapshot of current content
    const { data: latestVersion } = await supabase
      .from("document_versions")
      .select("version_number")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVersion?.version_number || 0) + 1;

    await supabase.from("document_versions").insert({
      document_id: id,
      markdown: doc.markdown,
      title: doc.title,
      version_number: nextVersion,
      created_by: userId || null,
      change_summary: changeSummary ? changeSummary.slice(0, 500) : "Session snapshot",
    });

    return NextResponse.json({ ok: true, version: nextVersion });
  }

  // ─── Action: soft-delete (move to trash) ───
  if (body.action === "soft-delete") {
    const { data: doc } = await supabase
      .from("documents")
      .select("user_id, anonymous_id, edit_token")
      .eq("id", id)
      .single();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = !!(body.userId && doc.user_id === body.userId) ||
      !!(body.anonymousId && doc.anonymous_id === body.anonymousId);
    const hasToken = !!(body.editToken && doc.edit_token === body.editToken);
    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase.from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to trash" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ─── Action: restore (restore from trash) ───
  if (body.action === "restore") {
    const { data: doc } = await supabase
      .from("documents")
      .select("user_id, anonymous_id, edit_token")
      .eq("id", id)
      .single();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = !!(body.userId && doc.user_id === body.userId) ||
      !!(body.anonymousId && doc.anonymous_id === body.anonymousId);
    const hasToken = !!(body.editToken && doc.edit_token === body.editToken);
    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase.from("documents")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ─── Action: auto-save (no version history) ───
  if (body.action === "auto-save") {
    const { markdown, title, userId, anonymousId, editToken, expectedUpdatedAt } = body;

    const { data: doc } = await supabase
      .from("documents")
      .select("edit_token, user_id, anonymous_id, edit_mode, expires_at, allowed_editors, updated_at, markdown, title")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check expiry
    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      return NextResponse.json({ error: "Document expired" }, { status: 410 });
    }

    // Permission check: only owner or editToken holder can save
    const isOwner =
      !!(userId && doc.user_id && userId === doc.user_id) ||
      !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
    const hasToken = !!(editToken && doc.edit_token === editToken);
    const userEmail = body.userEmail || "";

    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Only the owner can edit this document" }, { status: 403 });
    }

    // Conflict detection: if expectedUpdatedAt is provided, compare with actual updated_at
    if (expectedUpdatedAt && doc.updated_at) {
      const expected = new Date(expectedUpdatedAt).getTime();
      const actual = new Date(doc.updated_at).getTime();
      if (actual > expected) {
        return NextResponse.json({
          error: "Conflict",
          conflict: true,
          serverMarkdown: doc.markdown || "",
          serverUpdatedAt: doc.updated_at,
        }, { status: 409 });
      }
    }

    // Update without creating version history
    const updatedAt = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: updatedAt };
    if (markdown !== undefined) updates.markdown = markdown;
    if (title !== undefined) updates.title = title;
    if (body.source) updates.source = body.source;
    if (body.folderId !== undefined) updates.folder_id = body.folderId || null;
    // Track last editor
    if (userId) updates.last_editor_id = userId;
    if (userEmail) updates.last_editor_email = userEmail;

    const { error } = await supabase.from("documents").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

    // Send notification to document owner when updated from external source (CLI, MCP, Desktop)
    // Skip if the editor IS the owner (no self-notification) or if source is web auto-save
    const externalSource = body.source && body.source !== "web";
    if (externalSource && doc.user_id && userId !== doc.user_id) {
      try {
        const { data: ownerUser } = await supabase.auth.admin.getUserById(doc.user_id);
        if (ownerUser?.user?.email) {
          const editorName = userEmail || "Someone";
          await supabase.from("notifications").insert({
            recipient_email: ownerUser.user.email,
            type: "document_updated",
            document_id: id,
            document_title: title || doc.title || "Untitled",
            from_user_name: editorName,
            message: `${editorName} updated "${title || doc.title || "Untitled"}" via ${body.source}`,
          });
        }
      } catch { /* notification is best-effort */ }
    }

    return NextResponse.json({ ok: true, updated_at: updatedAt });
  }

  // ─── Action: move-to-folder ───
  if (body.action === "move-to-folder") {
    const requesterId = verified?.userId || req.headers.get("x-user-id");
    if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Verify ownership
    const { data: doc } = await supabase.from("documents").select("user_id").eq("id", id).single();
    if (!doc || doc.user_id !== requesterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { error } = await supabase
      .from("documents")
      .update({ folder_id: body.folderId || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to move" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ─── Action: unpublish (make private — flip is_draft to true, clear sharing) ───
  if (body.action === "unpublish") {
    const { userId, anonymousId, editToken } = body;

    const { data: doc } = await supabase
      .from("documents")
      .select("edit_token, user_id, anonymous_id")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner =
      !!(userId && doc.user_id && userId === doc.user_id) ||
      !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
    const hasToken = !!(editToken && doc.edit_token === editToken);

    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase.from("documents").update({
      is_draft: true,
      edit_mode: "owner",
      allowed_emails: [],
      allowed_editors: [],
    }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to unpublish" }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  // ─── Action: publish (flip is_draft to false) ───
  if (body.action === "clear-source") {
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const { error } = await supabase.from("documents").update({ source: null }).eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "publish") {
    const { userId, anonymousId, editToken } = body;

    const { data: doc } = await supabase
      .from("documents")
      .select("edit_token, user_id, anonymous_id")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner =
      !!(userId && doc.user_id && userId === doc.user_id) ||
      !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
    const hasToken = !!(editToken && doc.edit_token === editToken);

    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase.from("documents").update({ is_draft: false }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to publish" }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  // ─── Default: update with version history ───
  const { editToken, markdown, title, userId, anonymousId, changeSummary: rawChangeSummary } = body;
  const changeSummary = rawChangeSummary ? rawChangeSummary.slice(0, 500) : null;

  const { data: doc } = await supabase
    .from("documents")
    .select("edit_token, markdown, title, user_id, anonymous_id, edit_mode, expires_at")
    .eq("id", id)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check expiry
  if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
    return NextResponse.json({ error: "Document expired" }, { status: 410 });
  }

  // Permission check: only owner or editToken holder can edit
  const isDocOwner =
    !!(userId && doc.user_id && userId === doc.user_id) ||
    !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
  const hasEditToken = !!(editToken && doc.edit_token === editToken);

  if (!isDocOwner && !hasEditToken) {
    return NextResponse.json({ error: "Only the owner can edit this document" }, { status: 403 });
  }

  // Save current version to history
  const { data: latestVersion } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  let nextVersion = (latestVersion?.version_number || 0) + 1;

  const { error: versionError } = await supabase.from("document_versions").insert({
    document_id: id,
    markdown: doc.markdown,
    title: doc.title,
    version_number: nextVersion,
    created_by: userId || null,
    change_summary: changeSummary || null,
  });

  // Handle unique constraint violation (race condition) — retry once
  if (versionError?.code === "23505") {
    const { data: retryVersion } = await supabase
      .from("document_versions")
      .select("version_number")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();
    nextVersion = (retryVersion?.version_number || nextVersion) + 1;
    await supabase.from("document_versions").insert({
      document_id: id,
      markdown: doc.markdown,
      title: doc.title,
      version_number: nextVersion,
      created_by: userId || null,
      change_summary: changeSummary || null,
    });
  }

  // Update
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (markdown !== undefined) updates.markdown = markdown;
  if (title !== undefined) updates.title = title;

  const { error } = await supabase.from("documents").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ ok: true, version: nextVersion });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidDocId(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let body: { editToken?: string; userId?: string; userEmail?: string; anonymousId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify JWT — use verified identity over body values
  const verifiedDel = await verifyAuthToken(req.headers.get("authorization"));
  if (verifiedDel) {
    body.userId = verifiedDel.userId;
    body.userEmail = verifiedDel.email;
  } else if (!body.userId && body.userEmail) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const user = data?.users?.find(u => u.email?.toLowerCase() === body.userEmail!.toLowerCase());
      if (user) body.userId = user.id;
    } catch { /* ignore */ }
  }

  const { editToken, userId, anonymousId } = body;

  const { data: doc } = await supabase
    .from("documents")
    .select("edit_token, user_id, anonymous_id")
    .eq("id", id)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Permission: owner by user_id, anonymous_id, or edit_token
  const isOwner =
    !!(userId && doc.user_id && userId === doc.user_id) ||
    !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
  const hasToken = !!(editToken && doc.edit_token === editToken);

  if (!isOwner && !hasToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete visit history for this document (cleanup)
  await supabase.from("visit_history").delete().eq("document_id", id);

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function HEAD(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidDocId(id)) {
    return new Response(null, { status: 400 });
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Response(null, { status: 503 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("updated_at, expires_at, deleted_at, view_count")
    .eq("id", id)
    .single();

  if (error || !data) {
    return new Response(null, { status: 404 });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new Response(null, { status: 410 });
  }

  if (data.deleted_at) {
    return new Response(null, { status: 410 }); // Gone (trashed)
  }

  return new Response(null, {
    status: 200,
    headers: { "x-updated-at": data.updated_at || "", "x-view-count": String(data.view_count || 0) },
  });
}
