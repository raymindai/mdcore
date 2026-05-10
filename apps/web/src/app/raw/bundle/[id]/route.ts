import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { permissionResponse } from "@/lib/permission-response";
import { compactMarkdown, estimateTokens, isCompactRequested, tokenEconomyHeaders } from "@/lib/markdown-compact";
import { extractRequestSignals, logRawFetch } from "@/lib/raw-telemetry";

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canonicalUrl = `https://mdfy.app/b/${id}`;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return permissionResponse({ reason: "service_unavailable", canonicalUrl, resourceKind: "bundle", resourceId: id });
  }

  // bundles table doesn't have a deleted_at column. Soft-delete is
  // handled via is_draft + the absence from /api/bundles listings. So
  // we only need draft/password/allowed_emails gating here.
  const { data: bundle } = await supabase
    .from("bundles")
    .select("id, title, description, is_draft, password_hash, allowed_emails, updated_at, user_id")
    .eq("id", id)
    .single();

  if (!bundle) return permissionResponse({ reason: "not_found", canonicalUrl, resourceKind: "bundle", resourceId: id });
  if (bundle.is_draft) return permissionResponse({ reason: "draft", canonicalUrl, resourceKind: "bundle", resourceId: id });
  if (bundle.password_hash) {
    return permissionResponse({ reason: "password_protected", canonicalUrl, resourceKind: "bundle", resourceId: id });
  }

  // W7 shared bundles. allowed_emails on a bundle means: only people in
  // the list (or the owner) can fetch it. AI agents acting on behalf of
  // a person should pass that person's email via the X-User-Email header.
  // Owner is identified separately via JWT (Authorization).
  if (Array.isArray(bundle.allowed_emails) && bundle.allowed_emails.length > 0) {
    const verified = await verifyAuthToken(request.headers.get("authorization"));
    const requesterEmail = (verified?.email || request.headers.get("x-user-email") || "").toLowerCase();
    const allowed = (bundle.allowed_emails as string[]).map((e) => e.toLowerCase());
    const isOwner = verified?.userId && verified.userId === bundle.user_id;
    if (!isOwner && (!requesterEmail || !allowed.includes(requesterEmail))) {
      return permissionResponse({ reason: "email_restricted", canonicalUrl, resourceKind: "bundle", resourceId: id });
    }
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

  const compact = isCompactRequested(request.url);

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
    const docMd = d!.markdown || "";
    sections.push(compact ? compactMarkdown(docMd) : docMd);
  }

  if (visibleIdx === 0) {
    sections.push("_This bundle currently exposes no public documents._");
  }

  const joined = `${frontmatter}\n${sections.join("\n\n")}`;
  const body = compact ? compactMarkdown(joined) : joined;

  const sig = extractRequestSignals(request);
  logRawFetch({
    route: "bundle",
    resource: bundle.id,
    compact,
    bytes: Buffer.byteLength(body, "utf8"),
    tokens: estimateTokens(body),
    status: 200,
    ua: sig.ua,
    referer: sig.referer,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      "Link": `<https://mdfy.app/b/${bundle.id}>; rel="canonical"`,
      "X-Bundle-ID": bundle.id,
      "X-Document-Count": String(includedCount),
      ...tokenEconomyHeaders(body, { compact }),
    },
  });
}
