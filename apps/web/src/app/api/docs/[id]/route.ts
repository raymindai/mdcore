import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, markdown, title, created_at, updated_at, view_count, password_hash, expires_at, edit_mode, user_id, anonymous_id, is_draft, allowed_emails, allowed_editors")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Document expired" }, { status: 410 });
  }

  // Draft documents: only accessible by owner
  if (data.is_draft) {
    const requesterId = _req.headers.get("x-user-id");
    const requesterAnonId = _req.headers.get("x-anonymous-id");
    const isDraftOwner =
      !!(requesterId && data.user_id && requesterId === data.user_id) ||
      !!(requesterAnonId && data.anonymous_id && requesterAnonId === data.anonymous_id);
    if (!isDraftOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Email-restricted access: if allowed_emails is set, only those emails (+ owner) can access
  const allowedEmails: string[] = data.allowed_emails || [];
  if (allowedEmails.length > 0) {
    const requesterId = _req.headers.get("x-user-id");
    const requesterEmail = _req.headers.get("x-user-email") || "";
    const isOwner = !!(requesterId && data.user_id && requesterId === data.user_id);
    const isAllowed = allowedEmails.some(e => e.toLowerCase() === requesterEmail.toLowerCase());
    if (!isOwner && !isAllowed) {
      return NextResponse.json({ error: "Access restricted", restricted: true, message: "This document is restricted to specific people." }, { status: 403 });
    }
  }

  // Check password
  const hasPassword = !!data.password_hash;
  if (hasPassword) {
    const providedPassword = _req.headers.get("x-document-password") || "";
    if (!providedPassword) {
      return NextResponse.json({ error: "Password required", passwordRequired: true }, { status: 401 });
    }
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(providedPassword));
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    if (hash !== data.password_hash) {
      return NextResponse.json({ error: "Wrong password", passwordRequired: true }, { status: 403 });
    }
  }

  // Increment view count (fire-and-forget)
  supabase
    .from("documents")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", id)
    .then(() => {});

  // Check ownership: by user_id or anonymous_id
  const requesterId = _req.headers.get("x-user-id");
  const requesterAnonId = _req.headers.get("x-anonymous-id");
  const isOwnedByRequester =
    !!(requesterId && data.user_id && requesterId === data.user_id) ||
    !!(requesterAnonId && data.anonymous_id && requesterAnonId === data.anonymous_id);

  // Don't expose sensitive fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _ph, user_id: _uid, anonymous_id: _aid, allowed_emails: _ae, allowed_editors: _aed, ...safeData } = data;

  // Check if requester is an allowed editor (for non-owner edit access)
  const requesterEmail = _req.headers.get("x-user-email") || "";
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
    ...(isOwnedByRequester ? { allowedEmails: data.allowed_emails || [], allowedEditors: data.allowed_editors || [] } : {}),
    ...(ownerEmail ? { ownerEmail } : {}),
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve email → userId if provided
  if (!body.userId && body.userEmail) {
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
    if (!newEditMode || !["owner", "account", "token", "view", "public"].includes(newEditMode)) {
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
      updates.allowed_emails = allowedEmails.map((e: string) => e.trim().toLowerCase()).filter((e: string) => e.includes("@"));
    }
    if (Array.isArray(allowedEditors)) {
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
      change_summary: changeSummary || "Session snapshot",
    });

    return NextResponse.json({ ok: true, version: nextVersion });
  }

  // ─── Action: auto-save (no version history) ───
  if (body.action === "auto-save") {
    const { markdown, title, userId, anonymousId, editToken } = body;

    const { data: doc } = await supabase
      .from("documents")
      .select("edit_token, user_id, anonymous_id, edit_mode, expires_at, allowed_editors")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check expiry
    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      return NextResponse.json({ error: "Document expired" }, { status: 410 });
    }

    // Permission check: respects edit_mode + allowed_editors
    const isOwner =
      !!(userId && doc.user_id && userId === doc.user_id) ||
      !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
    const hasToken = !!(editToken && doc.edit_token === editToken);
    const userEmail = body.userEmail || "";
    const isAllowedEditor = (doc.allowed_editors || []).some((e: string) => e.toLowerCase() === userEmail.toLowerCase());
    const editModeVal = doc.edit_mode || "token";

    if (!isOwner && !hasToken && !isAllowedEditor) {
      if (editModeVal === "owner" || editModeVal === "account" || editModeVal === "view") {
        return NextResponse.json({ error: "Only the owner can edit this document" }, { status: 403 });
      } else if (editModeVal === "token") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      // editMode === "public" → anyone can auto-save
    }

    // Update without creating version history
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (markdown !== undefined) updates.markdown = markdown;
    if (title !== undefined) updates.title = title;

    const { error } = await supabase.from("documents").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

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
  const { editToken, markdown, title, userId, anonymousId, changeSummary } = body;

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

  // Permission check
  const isDocOwner =
    !!(userId && doc.user_id && userId === doc.user_id) ||
    !!(anonymousId && doc.anonymous_id && anonymousId === doc.anonymous_id);
  const editMode = doc.edit_mode || "token";

  if (!isDocOwner) {
    if (editMode === "owner" || editMode === "account" || editMode === "view") {
      return NextResponse.json({ error: "Only the owner can edit this document" }, { status: 403 });
    } else if (editMode === "token") {
      if (!editToken || doc.edit_token !== editToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }
    // editMode === "public" → anyone can edit
  }

  // Save current version to history
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
    change_summary: changeSummary || null,
  });

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

  // Resolve email → userId
  if (!body.userId && body.userEmail) {
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
