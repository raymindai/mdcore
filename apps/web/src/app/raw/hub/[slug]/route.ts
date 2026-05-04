import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * v6 — Hub URL raw fetch.
 *
 * GET /raw/hub/[slug] — Bundle Spec v1.0 hub-subtype markdown payload.
 *
 * What an AI gets when the user pastes mdfy.app/hub/<slug>:
 *
 *   ---
 *   mdfy_bundle: 1
 *   type: hub
 *   slug: <slug>
 *   author: "..."
 *   url: https://mdfy.app/hub/<slug>
 *   document_count: N
 *   bundle_count: M
 *   updated: <ISO>
 *   source: "mdfy.app"
 *   ---
 *
 *   # <author>'s knowledge hub
 *   > <hub_description>
 *
 *   ## Recent (last 7 days)
 *   - [Title](https://mdfy.app/<docId>) — yesterday
 *   ...
 *
 *   ## Documents
 *   - [Title](https://mdfy.app/<docId>) — 2026-04-15
 *   ...
 *
 *   ## Bundles
 *   - [Bundle Title](https://mdfy.app/b/<bundleId>) — N docs
 *   ...
 *
 * Index-style payload, NOT a full doc concatenation. A user's hub
 * could be hundreds of docs; concatenating would blow past every AI
 * context window. The AI follows the inline links to fetch specific
 * docs/bundles when needed (each one returns its own raw markdown).
 *
 * Restricted hubs (hub_public = false) → 404. Drafts and protected
 * docs are filtered out of the listing so private content never
 * leaks via the hub aggregate.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!/^[a-z0-9_-]{3,32}$/.test(slug)) {
    return new NextResponse("Invalid slug", { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return new NextResponse("Service unavailable", { status: 503 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, hub_slug, hub_public, hub_description")
    .eq("hub_slug", slug)
    .single();

  if (!profile || !profile.hub_public) {
    return new NextResponse("Hub not found", { status: 404 });
  }

  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .eq("user_id", profile.id)
    .eq("is_draft", false)
    .is("deleted_at", null)
    .is("password_hash", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  const docsList = (docs || []).filter(() => true);

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, updated_at, password_hash, allowed_emails")
    .eq("user_id", profile.id)
    .eq("is_draft", false)
    .order("updated_at", { ascending: false })
    .limit(100);

  const bundlesList = (bundles || []).filter(b =>
    !b.password_hash && !(Array.isArray(b.allowed_emails) && b.allowed_emails.length > 0)
  );

  const author = (profile.display_name || slug).replace(/"/g, '\\"');
  const description = (profile.hub_description || "").trim();

  // Newest doc determines the hub's "updated" timestamp — that's what
  // an AI cares about for staleness checks.
  const newestDocAt = docsList[0]?.updated_at || null;
  const newestBundleAt = bundlesList[0]?.updated_at || null;
  const hubUpdated = [newestDocAt, newestBundleAt]
    .filter(Boolean)
    .sort((a, b) => (b! < a! ? -1 : 1))[0] || null;

  const frontmatter = [
    "---",
    "mdfy_bundle: 1",
    "type: hub",
    `slug: ${slug}`,
    `author: "${author}"`,
    `url: https://mdfy.app/hub/${slug}`,
    `document_count: ${docsList.length}`,
    `bundle_count: ${bundlesList.length}`,
    hubUpdated ? `updated: ${new Date(hubUpdated).toISOString()}` : null,
    'source: "mdfy.app"',
    "---",
    "",
  ].filter(Boolean).join("\n");

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = docsList.filter(d => d.updated_at && new Date(d.updated_at).getTime() >= sevenDaysAgo);

  const sections: string[] = [];
  sections.push(`# ${profile.display_name || slug}'s knowledge hub`);
  if (description) sections.push(`> ${description.split("\n").join("\n> ")}`);

  if (recent.length > 0) {
    sections.push("## Recent (last 7 days)");
    sections.push(recent.slice(0, 20).map(d =>
      `- [${d.title || "Untitled"}](https://mdfy.app/${d.id}) — ${formatRelativeDate(d.updated_at)}`
    ).join("\n"));
  }

  if (bundlesList.length > 0) {
    sections.push("## Bundles");
    sections.push(bundlesList.slice(0, 50).map(b =>
      `- [${b.title || "Untitled Bundle"}](https://mdfy.app/b/${b.id})`
    ).join("\n"));
  }

  if (docsList.length > 0) {
    sections.push("## All documents");
    sections.push(docsList.slice(0, 200).map(d =>
      `- [${d.title || "Untitled"}](https://mdfy.app/${d.id}) — ${formatDate(d.updated_at)}`
    ).join("\n"));
    if (docsList.length > 200) {
      sections.push(`_…and ${docsList.length - 200} more docs._`);
    }
  } else if (bundlesList.length === 0) {
    sections.push("_This hub doesn't have any public documents yet._");
  }

  const body = `${frontmatter}\n${sections.join("\n\n")}\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=600",
      "Link": `<https://mdfy.app/hub/${slug}>; rel="canonical"`,
      "X-Hub-Slug": slug,
    },
  });
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function formatRelativeDate(iso?: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 6) return `${days} days ago`;
  return formatDate(iso);
}
