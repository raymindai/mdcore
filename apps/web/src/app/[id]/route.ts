import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Only handle document-like IDs (6-12 alphanumeric chars)
  if (!/^[A-Za-z0-9_-]{6,12}$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const { data } = await supabase
    .from("documents")
    .select("id, markdown, title, is_draft, deleted_at, password_hash, user_id, expires_at")
    .eq("id", id)
    .single();

  if (!data || data.deleted_at) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
  if (isExpired) {
    return new NextResponse("Document expired", { status: 410 });
  }

  // Protected/draft/restricted: redirect to viewer page (handles auth UI)
  if (data.password_hash || data.is_draft) {
    return NextResponse.redirect(new URL(`/d/${id}`, _request.url));
  }

  const title = data.title || "Untitled";
  const markdown = data.markdown || "";

  // Return HTML with:
  // 1. Full markdown visible in the DOM (LLMs read this)
  // 2. JS redirect to /d/{id} for browsers (full rendered experience)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — mdfy.cc</title>
<meta name="description" content="${escapeHtml(markdown.slice(0, 200).replace(/[#*_`\n]/g, " ").trim())}">
<meta property="og:title" content="${escapeHtml(title)} — mdfy.cc">
<meta property="og:url" content="https://mdfy.cc/${id}">
<meta property="og:site_name" content="mdfy.cc">
<meta property="og:type" content="article">
<script>window.location.replace('/d/${id}');</script>
<style>body{max-width:800px;margin:0 auto;padding:40px 24px;font-family:system-ui,sans-serif;line-height:1.7;color:#d4d4d8;background:#09090b}h1{color:#fafafa;font-size:28px;font-weight:700}pre{white-space:pre-wrap;word-wrap:break-word;font-size:14px}a{color:#fb923c}</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<pre>${escapeHtml(markdown)}</pre>
<footer style="margin-top:40px;font-size:12px;color:#71717a">
Published on <a href="https://mdfy.cc/${id}">mdfy.cc/${id}</a>
</footer>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
