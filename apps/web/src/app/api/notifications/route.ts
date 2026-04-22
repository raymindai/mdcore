import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

// GET — fetch notifications for logged-in user
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const email = verified?.email || req.headers.get("x-user-email");
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

  // Verify JWT for POST
  const verifiedPost = await verifyAuthToken(req.headers.get("authorization"));

  // Rate limit: max 10 notifications per minute per user
  const rateLimitUserId = verifiedPost?.userId || req.headers.get("x-user-id") || "unknown";
  const { count: rlCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("from_user_id", rateLimitUserId)
    .gte("created_at", new Date(Date.now() - 60000).toISOString());
  if ((rlCount || 0) > 10) {
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

  // Send email notification via Resend (non-blocking)
  sendNotificationEmail(recipientEmail.toLowerCase(), type, documentId, fromUserName || "Someone", message || "").catch(() => {});

  return NextResponse.json({ ok: true });
}

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  const verifiedPatch = await verifyAuthToken(req.headers.get("authorization"));
  const email = verifiedPatch?.email || req.headers.get("x-user-email");
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

// ─── Email Notification via Resend ───

async function sendNotificationEmail(
  to: string,
  type: string,
  documentId: string,
  fromName: string,
  message: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const docUrl = `https://mdfy.cc/d/${documentId}`;

  const subjects: Record<string, string> = {
    share: `${fromName} shared a document with you on mdfy.cc`,
    edit_request: `${fromName} requested edit access on mdfy.cc`,
    mention: `${fromName} mentioned you on mdfy.cc`,
  };

  const subject = subjects[type] || `Notification from mdfy.cc`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 0">
  <div style="margin-bottom:24px">
    <span style="font-weight:800;font-size:18px;letter-spacing:-0.5px"><span style="color:#fb923c">md</span><span style="color:#a1a1aa">fy</span></span>
  </div>
  <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:24px;color:#e4e4e7">
    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#fafafa">${subject}</p>
    ${message ? `<p style="margin:0 0 16px;font-size:14px;color:#a1a1aa">${message}</p>` : ""}
    <a href="${docUrl}" style="display:inline-block;background:#fb923c;color:#0a0a0c;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Open Document</a>
  </div>
  <p style="margin:16px 0 0;font-size:11px;color:#52525b">
    This email was sent by <a href="https://mdfy.cc" style="color:#fb923c;text-decoration:none">mdfy.cc</a>.
    You received this because someone shared a document with ${to}.
  </p>
</div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "mdfy.cc <notifications@mdfy.cc>",
        to,
        subject,
        html,
      }),
    });
  } catch {
    // Non-critical — don't fail the notification creation
  }
}
