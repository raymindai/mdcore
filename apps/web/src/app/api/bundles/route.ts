import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { verifyAuthToken } from "@/lib/verify-auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  let body: {
    title?: string;
    description?: string;
    documentIds?: string[];
    password?: string;
    userId?: string;
    userEmail?: string;
    anonymousId?: string;
    isDraft?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, documentIds, password, anonymousId, isDraft } = body;
  let { userId } = body;

  // Verify JWT
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  if (!userId && verified?.userId) userId = verified.userId;

  // Resolve email → userId
  const resolvedEmail = body.userEmail || verified?.email || req.headers.get("x-user-email") || "";
  if (!userId && resolvedEmail) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const user = data?.users?.find(u => u.email?.toLowerCase() === resolvedEmail.toLowerCase());
      if (user) userId = user.id;
    } catch { /* ignore */ }
  }
  if (!userId) userId = req.headers.get("x-user-id") || undefined;

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return NextResponse.json({ error: "documentIds must be a non-empty array" }, { status: 400 });
  }
  if (documentIds.length > 50) {
    return NextResponse.json({ error: "Too many documents (max 50)" }, { status: 400 });
  }

  const editToken = nanoid(32);

  // Password hash (same format as documents)
  let passwordHash: string | null = null;
  if (password) {
    const salt = crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    passwordHash = `${salt}:${hash}`;
  }

  // Create bundle with retry on nanoid collision
  let id = "";
  let insertError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    id = nanoid(8);
    const { error } = await supabase.from("bundles").insert({
      id,
      title: title || "Untitled Bundle",
      description: description || null,
      edit_token: editToken,
      password_hash: passwordHash,
      user_id: userId || null,
      anonymous_id: (!userId && anonymousId) ? anonymousId : null,
      is_draft: isDraft ?? true,
    });
    if (!error) { insertError = null; break; }
    if (error.code === "23505") { insertError = error; continue; }
    insertError = error; break;
  }

  if (insertError) {
    console.error("Bundle insert error:", insertError);
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
  }

  // Insert bundle_documents
  const bundleDocs = documentIds.map((docId, i) => ({
    bundle_id: id,
    document_id: docId,
    sort_order: i,
  }));
  const { error: docsError } = await supabase.from("bundle_documents").insert(bundleDocs);
  if (docsError) {
    // Clean up the bundle if documents insert fails
    await supabase.from("bundles").delete().eq("id", id);
    console.error("Bundle documents insert error:", docsError);
    return NextResponse.json({ error: "Failed to add documents to bundle" }, { status: 500 });
  }

  return NextResponse.json({ id, editToken, created_at: new Date().toISOString() });
}

export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  let userId = verified?.userId || req.headers.get("x-user-id");
  const anonymousId = req.headers.get("x-anonymous-id");
  const userEmail = verified?.email || req.headers.get("x-user-email");

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  // Resolve email → userId
  if (!userId && userEmail) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const user = data?.users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
      if (user) userId = user.id;
    } catch { /* ignore */ }
  }

  if (!userId && !anonymousId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("bundles")
    .select("id, title, description, is_draft, view_count, layout, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (anonymousId) {
    query = query.eq("anonymous_id", anonymousId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to fetch bundles" }, { status: 500 });
  }

  // Fetch document counts for each bundle
  const bundleIds = (data || []).map(b => b.id);
  const docCounts: Record<string, number> = {};
  if (bundleIds.length > 0) {
    const { data: countData } = await supabase
      .from("bundle_documents")
      .select("bundle_id")
      .in("bundle_id", bundleIds);
    if (countData) {
      for (const row of countData) {
        docCounts[row.bundle_id] = (docCounts[row.bundle_id] || 0) + 1;
      }
    }
  }

  const bundles = (data || []).map(b => ({
    ...b,
    documentCount: docCounts[b.id] || 0,
  }));

  return NextResponse.json({ bundles });
}
