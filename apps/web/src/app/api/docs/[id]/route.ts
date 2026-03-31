import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, markdown, title, created_at, updated_at, view_count, password_hash, expires_at, edit_mode, user_id")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Document expired" }, { status: 410 });
  }

  // Check password
  const hasPassword = !!data.password_hash;
  if (hasPassword) {
    const providedPassword = _req.headers.get("x-document-password") || "";
    if (!providedPassword) {
      return NextResponse.json(
        { error: "Password required", passwordRequired: true },
        { status: 401 }
      );
    }
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(providedPassword));
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    if (hash !== data.password_hash) {
      return NextResponse.json(
        { error: "Wrong password", passwordRequired: true },
        { status: 403 }
      );
    }
  }

  // Increment view count (fire-and-forget)
  supabase
    .from("documents")
    .update({ view_count: data.view_count + 1 })
    .eq("id", id)
    .then(() => {});

  // Don't expose password_hash or edit_token internals
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _ph, user_id: _uid, ...safeData } = data;
  return NextResponse.json({ ...safeData, hasPassword, editMode: data.edit_mode || "token" });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  let body: { editToken?: string; markdown?: string; title?: string; userId?: string; changeSummary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { editToken, markdown, title, userId, changeSummary } = body;

  // Fetch document with permissions
  const { data: doc } = await supabase
    .from("documents")
    .select("edit_token, markdown, title, user_id, edit_mode")
    .eq("id", id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Permission check based on edit_mode
  const editMode = doc.edit_mode || "token";
  if (editMode === "owner") {
    // Only the document owner can edit
    if (!userId || userId !== doc.user_id) {
      return NextResponse.json({ error: "Only the owner can edit this document" }, { status: 403 });
    }
  } else if (editMode === "token") {
    // Need valid editToken
    if (!editToken || doc.edit_token !== editToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  // editMode === "public" → anyone can edit, no check needed

  // Save current version to history before updating
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

  // Update the document
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (markdown !== undefined) updates.markdown = markdown;
  if (title !== undefined) updates.title = title;

  const { error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, version: nextVersion });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  let body: { editToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { editToken } = body;
  if (!editToken) {
    return NextResponse.json({ error: "editToken required" }, { status: 401 });
  }

  // Verify edit token
  const { data: doc } = await supabase
    .from("documents")
    .select("edit_token")
    .eq("id", id)
    .single();

  if (!doc || doc.edit_token !== editToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
