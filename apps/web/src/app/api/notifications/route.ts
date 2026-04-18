import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// GET — fetch notifications for logged-in user
export async function GET(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, document_id, from_user_name, message, read, created_at, documents(id, title)")
    .eq("recipient_email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });

  const notifications = (data || [])
    .filter((n) => {
      // Skip notifications for deleted documents
      const doc = n.documents as unknown as { id: string } | null;
      return !!doc;
    })
    .map((n) => {
      const doc = n.documents as unknown as { id: string; title: string };
      return {
        id: n.id,
        type: n.type,
        documentId: n.document_id,
        documentTitle: doc.title || "Untitled",
        fromUserName: n.from_user_name,
        message: n.message,
        read: n.read,
        createdAt: n.created_at,
      };
    });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

// POST — create notification (called server-side when sharing)
export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  // Rate limit: max 10 notifications per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = `notif:${ip}`;
  const { data: rlData } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("from_user_id", req.headers.get("x-user-id") || ip)
    .gte("created_at", new Date(Date.now() - 60000).toISOString());
  if ((rlData as unknown as number) > 10) {
    return NextResponse.json({ error: "Too many notifications. Try again later." }, { status: 429 });
  }

  let body: {
    recipientEmail: string;
    type?: string;
    documentId: string;
    fromUserId?: string;
    fromUserName?: string;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  /* eslint-disable prefer-const */
  let { recipientEmail, type = "share", documentId, fromUserId, fromUserName, message } = body;
  /* eslint-enable prefer-const */
  if (!recipientEmail || !documentId) {
    return NextResponse.json({ error: "recipientEmail and documentId required" }, { status: 400 });
  }

  // Verify document exists and fromUserId has access
  if (fromUserId) {
    const { data: doc } = await supabase
      .from("documents")
      .select("user_id")
      .eq("id", documentId)
      .single();
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Resolve __owner__ to actual owner email
  if (recipientEmail === "__owner__") {
    const { data: doc } = await supabase
      .from("documents")
      .select("user_id")
      .eq("id", documentId)
      .single();
    if (!doc?.user_id) return NextResponse.json({ error: "Document owner not found" }, { status: 404 });
    // Get owner's email from auth.users via profiles or auth
    const { data: ownerAuth } = await supabase.auth.admin.getUserById(doc.user_id);
    if (!ownerAuth?.user?.email) return NextResponse.json({ error: "Owner email not found" }, { status: 404 });
    recipientEmail = ownerAuth.user.email;
  }

  const { error } = await supabase.from("notifications").insert({
    recipient_email: recipientEmail.toLowerCase(),
    type,
    document_id: documentId,
    from_user_id: fromUserId || null,
    from_user_name: fromUserName || null,
    message: message || null,
  });

  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  let body: { ids?: number[]; markAllRead?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.markAllRead) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_email", email.toLowerCase())
      .eq("read", false);
  } else if (body.ids && body.ids.length > 0) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", body.ids)
      .eq("recipient_email", email.toLowerCase());
  }

  return NextResponse.json({ ok: true });
}
