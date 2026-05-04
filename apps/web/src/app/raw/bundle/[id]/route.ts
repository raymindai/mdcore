import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * v6 — Bundle URL → Bundle Spec v1.0 conformant markdown payload.
 *
 * One URL paste, full bundle context. Hit by:
 *   - "Copy as context" button in Bundle viewer (fetches → clipboard)
 *   - /b/{id}.md and /b/{id}.txt suffix URLs
 *   - middleware-rewritten /b/{id} requests where the caller signaled
 *     "I want markdown" (Accept: text/markdown / text/plain, or known
 *     AI bot UA)
 *
 * Output (Bundle Spec v1.0 draft):
 *
 *   ---
 *   mdfy_bundle: 1
 *   id: <bundleId>
 *   title: "..."
 *   url: https://mdfy.app/b/<id>
 *   document_count: N
 *   updated: <ISO>
 *   source: "mdfy.app"
 *   ---
 *
 *   # <bundle title>
 *
 *   > <bundle description, if any>
 *
 *   ## 1. <doc title>  (https://mdfy.app/<docId>)
 *
 *   <doc markdown body>
 *
 *   ## 2. <next doc title>  ...
 *
 * Restricted bundles (draft / soft-deleted / password / restricted)
 * intentionally 404 here so the AI never receives content the user
 * didn't make public.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  // bundles table doesn't have a deleted_at column — soft-delete is
  // handled via is_draft + the absence from /api/bundles listings. So
  // we only need draft/password/allowed_emails gating here.
  const { data: bundle } = await supabase
    .from("bundles")
    .select("id, title, description, is_draft, password_hash, allowed_emails, updated_at")
    .eq("id", id)
    .single();

  if (!bundle) return new NextResponse("Not found", { status: 404 });
  if (bundle.is_draft) return new NextResponse("Not found", { status: 404 });
  if (bundle.password_hash) {
    return new NextResponse("This bundle is password-protected and cannot be fetched as raw markdown.", { status: 401 });
  }
  if (Array.isArray(bundle.allowed_emails) && bundle.allowed_emails.length > 0) {
    return new NextResponse("This bundle is restricted to specific people.", { status: 403 });
  }

  // Resolve bundle's documents in sort_order. Fetch only the columns we
  // need; titles + markdown bodies are the payload, the rest is metadata.
  const { data: bundleDocs } = await supabase
    .from("bundle_documents")
    .select("document_id, sort_order, annotation")
    .eq("bundle_id", id)
    .order("sort_order", { ascending: true });

  const docIds = (bundleDocs || []).map(d => d.document_id);

  type DocRow = { id: string; title: string | null; markdown: string; updated_at: string; is_draft: boolean | null; deleted_at: string | null; password_hash: string | null; allowed_emails: string[] | null };
  let docs: DocRow[] = [];
  if (docIds.length > 0) {
    const res = await supabase
      .from("documents")
      .select("id, title, markdown, updated_at, is_draft, deleted_at, password_hash, allowed_emails")
      .in("id", docIds);
    docs = (res.data as DocRow[] | null) || [];
  }
  const byId = new Map(docs.map(d => [d.id, d]));

  // Filter out docs that shouldn't be exposed via the raw fetch path.
  // Mirrors the per-doc /raw/[id] gating: protected/restricted/draft/
  // deleted docs are hidden from the AI fetch payload even when included
  // in a public bundle. Replaces the body with a neutral notice so the
  // bundle structure stays intact.
  const isFetchable = (d: DocRow | undefined): boolean =>
    !!d && !d.deleted_at && !d.is_draft && !d.password_hash &&
    !(Array.isArray(d.allowed_emails) && d.allowed_emails.length > 0);

  const title = (bundle.title || "Untitled Bundle").replace(/"/g, '\\"');
  const updated = bundle.updated_at ? new Date(bundle.updated_at).toISOString() : "";
  const description = (bundle.description || "").trim();

  const includedCount = (bundleDocs || []).filter(bd => isFetchable(byId.get(bd.document_id))).length;

  const frontmatter = [
    "---",
    "mdfy_bundle: 1",
    `id: ${bundle.id}`,
    `title: "${title}"`,
    `url: https://mdfy.app/b/${bundle.id}`,
    `document_count: ${includedCount}`,
    updated ? `updated: ${updated}` : null,
    'source: "mdfy.app"',
    "---",
    "",
  ].filter(Boolean).join("\n");

  const sections: string[] = [];
  sections.push(`# ${bundle.title || "Untitled Bundle"}`);
  if (description) sections.push(`> ${description.split("\n").join("\n> ")}`);

  let visibleIdx = 0;
  for (const bd of bundleDocs || []) {
    const d = byId.get(bd.document_id);
    if (!isFetchable(d)) continue;
    visibleIdx++;
    const docTitle = d!.title || "Untitled";
    const docUrl = `https://mdfy.app/${d!.id}`;
    const annotation = (bd.annotation || "").trim();
    sections.push(`## ${visibleIdx}. ${docTitle}`);
    sections.push(`*Source: ${docUrl}*`);
    if (annotation) sections.push(`> ${annotation.split("\n").join("\n> ")}`);
    sections.push(d!.markdown || "");
  }

  if (visibleIdx === 0) {
    sections.push("_This bundle currently exposes no public documents._");
  }

  const body = `${frontmatter}\n${sections.join("\n\n")}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      "Link": `<https://mdfy.app/b/${bundle.id}>; rel="canonical"`,
      "X-Bundle-ID": bundle.id,
      "X-Document-Count": String(includedCount),
    },
  });
}
