import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { extractCrossRefs, rankCitations } from "@/lib/cross-refs";

// W12b — public cross-reference rollup across all public hubs.
//
// Returns the most-cited docs / bundles / hubs based on links found in
// public document markdown. Citation = a unique source doc that links
// to a given target. Self-references don't count. Targets that aren't
// themselves public are skipped (the corpus and the candidate set are
// the same).
//
// Cached at the edge for 5 minutes. Cheap to recompute — the cap on
// scanned docs (300 most-recent) keeps the regex pass under a second
// even on a busy hub.

export const revalidate = 300;

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, hub_slug, display_name")
    .eq("hub_public", true)
    .not("hub_slug", "is", null);
  const publicProfiles = profiles || [];
  const userIds = publicProfiles.map(p => p.id);
  if (userIds.length === 0) {
    return NextResponse.json({ docs: [], bundles: [], hubs: [], totals: { sources: 0, targets: 0 } });
  }

  const [{ data: docs }, { data: bundles }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, user_id, markdown, updated_at")
      .in("user_id", userIds)
      .eq("is_draft", false)
      .is("deleted_at", null)
      .is("password_hash", null)
      .order("updated_at", { ascending: false })
      .limit(300),
    supabase
      .from("bundles")
      .select("id, title, user_id, password_hash, allowed_emails")
      .in("user_id", userIds)
      .eq("is_draft", false),
  ]);
  const allDocs = docs || [];
  const publicBundles = (bundles || []).filter(b =>
    !b.password_hash &&
    !(Array.isArray(b.allowed_emails) && b.allowed_emails.length > 0)
  );

  const knownDocIds = new Set(allDocs.map(d => d.id));
  const knownBundleIds = new Set(publicBundles.map(b => b.id));
  const knownHubSlugs = new Set(publicProfiles.map(p => p.hub_slug as string));

  const totals = extractCrossRefs(allDocs, knownDocIds, knownBundleIds, knownHubSlugs);

  const docMeta = new Map(allDocs.map(d => [d.id, { title: d.title, user_id: d.user_id }]));
  const bundleMeta = new Map(publicBundles.map(b => [b.id, { title: b.title, user_id: b.user_id }]));
  const hubMeta = new Map(publicProfiles.map(p => [p.hub_slug as string, { display_name: p.display_name }]));
  const userToHub = new Map(publicProfiles.map(p => [p.id, p.hub_slug as string]));

  const docResults = rankCitations(totals.docCitations, 20).map(r => {
    const meta = docMeta.get(r.targetId);
    return {
      kind: "doc" as const,
      id: r.targetId,
      title: meta?.title || "Untitled",
      url: `/${r.targetId}`,
      hub_slug: meta ? userToHub.get(meta.user_id) || null : null,
      citationCount: r.citationCount,
    };
  });

  const bundleResults = rankCitations(totals.bundleCitations, 10).map(r => {
    const meta = bundleMeta.get(r.targetId);
    return {
      kind: "bundle" as const,
      id: r.targetId,
      title: meta?.title || "Untitled Bundle",
      url: `/b/${r.targetId}`,
      hub_slug: meta ? userToHub.get(meta.user_id) || null : null,
      citationCount: r.citationCount,
    };
  });

  const hubResults = rankCitations(totals.hubCitations, 10).map(r => {
    const meta = hubMeta.get(r.targetId);
    return {
      kind: "hub" as const,
      slug: r.targetId,
      title: meta?.display_name || r.targetId,
      url: `/hub/${r.targetId}`,
      citationCount: r.citationCount,
    };
  });

  return NextResponse.json({
    docs: docResults,
    bundles: bundleResults,
    hubs: hubResults,
    totals: {
      sources: allDocs.length,
      targets: docResults.length + bundleResults.length + hubResults.length,
    },
  }, {
    headers: { "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600" },
  });
}
