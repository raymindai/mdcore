import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// Public, AI-deployable representation of a single mdfy document.
// Hit by:
//   - explicit /raw/{id} requests
//   - middleware-rewritten /{id} requests where the caller signaled "I want
//     markdown" (Accept: text/markdown / text/plain, or known AI bot UA)
//   - /{id}.md and /{id}.txt suffix URLs (also handled by middleware)
//
// Output is plain markdown with a YAML frontmatter block carrying the bits
// an AI reader needs to attribute and reuse the doc:
//   - title  — human title
//   - url    — canonical mdfy URL (so the LLM can cite it back)
//   - updated — ISO timestamp
//   - source  — always "mdfy.app" so the LLM knows the origin
//
// Restricted documents (draft / soft-deleted / password-protected /
// expired / email-restricted) intentionally 404 here so the AI never
// receives content the user didn't make public.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const { data } = await supabase
    .from("documents")
    .select("id, markdown, title, is_draft, deleted_at, password_hash, expires_at, allowed_emails, updated_at, source")
    .eq("id", id)
    .single();

  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (data.deleted_at) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (data.is_draft) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (data.password_hash) {
    // Don't expose protected content via the AI fetch path.
    return new NextResponse("This document is password-protected and cannot be fetched as raw markdown.", { status: 401 });
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new NextResponse("Document expired", { status: 410 });
  }
  if (Array.isArray(data.allowed_emails) && data.allowed_emails.length > 0) {
    return new NextResponse("This document is restricted to specific people.", { status: 403 });
  }

  const title = (data.title || "Untitled").replace(/"/g, '\\"');
  const updated = data.updated_at ? new Date(data.updated_at).toISOString() : "";
  const source = data.source ? String(data.source).replace(/"/g, '\\"') : "mdfy.app";

  // Frontmatter first, then the raw markdown body. The body usually starts
  // with its own H1; we don't repeat the title to avoid duplicate headings.
  const frontmatter = [
    "---",
    `title: "${title}"`,
    `url: https://mdfy.app/${id}`,
    updated ? `updated: ${updated}` : null,
    `source: "${source}"`,
    "---",
    "",
  ].filter(Boolean).join("\n");

  const body = `${frontmatter}\n${data.markdown || ""}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // Short edge cache + revalidate so renames / edits propagate within a
      // minute. AIs that re-fetch on subsequent prompts pick up new content
      // without forcing them to bust caches.
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      // Tell crawlers the canonical browser URL so search ranks the human
      // page, not the raw markdown.
      "Link": `<https://mdfy.app/${id}>; rel="canonical"`,
      "X-Document-ID": id,
    },
  });
}
