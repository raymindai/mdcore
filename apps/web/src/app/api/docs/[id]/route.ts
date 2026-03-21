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
    .select("id, markdown, title, created_at, updated_at, view_count, password_hash, expires_at")
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

  // Don't expose password_hash
  const { password_hash: _, ...safeData } = data;
  return NextResponse.json({ ...safeData, hasPassword });
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

  let body: { editToken?: string; markdown?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { editToken, markdown, title } = body;
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

  return NextResponse.json({ ok: true });
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
