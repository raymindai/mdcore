import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  if (verified?.userId) return verified.userId;
  const headerId = req.headers.get("x-user-id");
  if (headerId) return headerId;
  // Resolve email → userId
  const email = verified?.email || req.headers.get("x-user-email");
  if (email) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.auth.admin.listUsers();
        const user = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (user) return user.id;
      } catch { /* ignore */ }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("folders")
    .select("id, name, section, sort_order, collapsed, created_at, updated_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });

  return NextResponse.json({ folders: data || [] });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const body = await req.json();
  const { id, name, section, sortOrder } = body;

  const { error } = await supabase.from("folders").insert({
    id: id || `folder-${Date.now()}`,
    name: name || "New Folder",
    user_id: userId,
    section: section || "my",
    sort_order: sortOrder ?? 0,
  });

  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing folder id" }, { status: 400 });

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.section !== undefined) dbUpdates.section = updates.section;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.collapsed !== undefined) dbUpdates.collapsed = updates.collapsed;

  const { error } = await supabase
    .from("folders")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing folder id" }, { status: 400 });

  // Unset folder_id on documents in this folder
  await supabase.from("documents").update({ folder_id: null }).eq("folder_id", id);

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
