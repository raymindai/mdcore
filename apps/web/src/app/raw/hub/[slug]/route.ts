import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { compactMarkdown, estimateTokens, isCompactRequested, isDigestRequested, tokenEconomyHeaders } from "@/lib/markdown-compact";
import { extractRequestSignals, logRawFetch } from "@/lib/raw-telemetry";

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
  request: Request,
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

  const compact = isCompactRequested(request.url);
  const digest = isDigestRequested(request.url);

  // Digest mode bypasses the index entirely — produces a concept-clustered
  // summary from concept_index that's an order of magnitude denser than
  // the per-doc listing for "what does this person know about X" queries.
  if (digest) {
    const body = await renderDigest({
      supabase,
      profile,
      slug,
      compact,
    });
    const sig = extractRequestSignals(request);
    logRawFetch({
      route: "hub",
      resource: slug,
      compact,
      digest: true,
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
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=900",
        "Link": `<https://mdfy.app/hub/${slug}>; rel="canonical"`,
        "X-Hub-Slug": slug,
        ...tokenEconomyHeaders(body, { compact, digest: true }),
      },
    });
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

  const joined = `${frontmatter}\n${sections.join("\n\n")}\n`;
  const body = compact ? compactMarkdown(joined) : joined;

  const sig = extractRequestSignals(request);
  logRawFetch({
    route: "hub",
    resource: slug,
    compact,
    digest: false,
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
      "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=600",
      "Link": `<https://mdfy.app/hub/${slug}>; rel="canonical"`,
      "X-Hub-Slug": slug,
      ...tokenEconomyHeaders(body, { compact }),
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

// ── Digest mode renderer ─────────────────────────────────────────────
// Concept-clustered summary derived from concept_index. Massively denser
// than the per-doc index for "what does this hub know about X" queries.
// Fallback to a stub when concept_index is empty so the AI sees a clear
// pointer to the full index rather than nothing.

interface DigestProfile {
  id: string;
  display_name: string | null;
  hub_slug: string | null;
  hub_description: string | null;
}

interface ConceptRow {
  id: number;
  label: string;
  concept_type: string | null;
  description: string | null;
  weight: number | null;
  occurrence_count: number | null;
  doc_ids: string[] | null;
}

interface DigestArgs {
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>;
  profile: DigestProfile;
  slug: string;
  compact: boolean;
}

async function renderDigest({ supabase, profile, slug, compact }: DigestArgs): Promise<string> {
  const author = (profile.display_name || slug).replace(/"/g, '\\"');
  const description = (profile.hub_description || "").trim();

  // Top concepts by weight × occurrence — central themes first. Capped
  // at 40 so a 500-doc hub still fits comfortably under 4k tokens.
  const { data: rawConcepts } = await supabase
    .from("concept_index")
    .select("id, label, concept_type, description, weight, occurrence_count, doc_ids")
    .eq("user_id", profile.id)
    .order("weight", { ascending: false })
    .limit(40);
  const concepts = (rawConcepts as ConceptRow[] | null) || [];

  // Resolve doc titles in one round-trip, only for the docs referenced
  // by the top concepts AND visible to the public (no draft, no
  // password, no email allow-list).
  const docIdSet = new Set<string>();
  for (const c of concepts) for (const id of c.doc_ids || []) docIdSet.add(id);
  let docTitleById = new Map<string, string>();
  if (docIdSet.size > 0) {
    const { data: docRows } = await supabase
      .from("documents")
      .select("id, title, is_draft, password_hash, allowed_emails, deleted_at")
      .in("id", Array.from(docIdSet));
    docTitleById = new Map(
      (docRows || [])
        .filter((d) => !d.is_draft && !d.deleted_at && !d.password_hash &&
          !(Array.isArray(d.allowed_emails) && d.allowed_emails.length > 0))
        .map((d) => [d.id, d.title || "Untitled"]),
    );
  }

  const updatedAt = new Date().toISOString();

  const frontmatter = [
    "---",
    "mdfy_bundle: 1",
    "type: hub_digest",
    `slug: ${slug}`,
    `author: "${author}"`,
    `url: https://mdfy.app/hub/${slug}`,
    `concept_count: ${concepts.length}`,
    `updated: ${updatedAt}`,
    'source: "mdfy.app"',
    "---",
    "",
  ].join("\n");

  const sections: string[] = [];
  sections.push(`# ${profile.display_name || slug}'s knowledge — concept digest`);
  if (description) sections.push(`> ${description.split("\n").join("\n> ")}`);

  if (concepts.length === 0) {
    sections.push(
      "_The ontology for this hub hasn't been built yet. Ask the owner to run **Build ontology** in their hub view, " +
      `or fetch [the full index](https://mdfy.app/raw/hub/${slug}?compact=1) instead._`,
    );
  } else {
    sections.push(
      `_${concepts.length} concept${concepts.length === 1 ? "" : "s"} extracted across this hub. Each entry links to the supporting documents — fetch any of them as \`https://mdfy.app/raw/<id>?compact=1\` for the dense full text._`,
    );

    sections.push("## Concepts");
    for (const c of concepts) {
      const visibleDocs = (c.doc_ids || []).filter((id) => docTitleById.has(id)).slice(0, 6);
      if (visibleDocs.length === 0) continue;
      const meta = [
        c.concept_type || "concept",
        `weight ${Math.round(c.weight || 0)}`,
        `${visibleDocs.length} doc${visibleDocs.length === 1 ? "" : "s"}`,
      ].join(" • ");
      sections.push(`### ${c.label}\n*${meta}*`);
      if (c.description) sections.push(`> ${c.description.split("\n")[0]}`);
      sections.push(visibleDocs.map((id) => `- [${docTitleById.get(id)}](https://mdfy.app/${id})`).join("\n"));
    }
  }

  sections.push(
    `---\n\n_Need everything? [Full hub index](https://mdfy.app/raw/hub/${slug}?compact=1) lists every public document. [llms.txt manifest](https://mdfy.app/hub/${slug}/llms.txt) explains how to crawl this hub._`,
  );

  const body = `${frontmatter}\n${sections.join("\n\n")}\n`;
  return compact ? compactMarkdown(body) : body;
}
