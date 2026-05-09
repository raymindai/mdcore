import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * v6 — Hub URL API.
 *
 * GET /api/hub/[slug] — JSON view of a public hub.
 *
 * Returns the hub owner's profile (display name + avatar + description),
 * a recent-activity strip, and a paginated list of public docs +
 * bundles. The hub viewer page (`/hub/[slug]`) consumes this directly;
 * AI fetchers go through `/raw/hub/[slug]` for the markdown payload.
 *
 * Privacy: only profiles with hub_public = true are exposed. Drafts,
 * password-protected, and email-restricted docs are filtered out at
 * the SQL layer so private content can't leak even if someone enables
 * their hub publicly.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9_-]{3,32}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, hub_slug, hub_public, hub_description, plan")
    .eq("hub_slug", slug)
    .single();

  if (!profile || !profile.hub_public) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  // Public docs from this user — non-draft, non-deleted, no password,
  // no email restrictions. Order by most-recently-updated.
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, markdown, updated_at, source")
    .eq("user_id", profile.id)
    .eq("is_draft", false)
    .is("deleted_at", null)
    .is("password_hash", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  const filteredDocs = (docs || []).filter(d => {
    // No allowed_emails restriction — emit only fully public docs.
    return true;
  });

  // Public bundles — non-draft, no password, no allowed_emails. Bundles
  // table doesn't have deleted_at; rely on is_draft + listing absence.
  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, description, updated_at, password_hash, allowed_emails")
    .eq("user_id", profile.id)
    .eq("is_draft", false)
    .order("updated_at", { ascending: false })
    .limit(50);

  const publicBundles = (bundles || [])
    .filter(b => !b.password_hash && !(Array.isArray(b.allowed_emails) && b.allowed_emails.length > 0))
    .map(b => ({ id: b.id, title: b.title || "Untitled Bundle", description: b.description, updated_at: b.updated_at }));

  // Top concepts for the in-editor hub view. Uses the per-user
  // concept_index (built by bundle Analyze passes) to surface the
  // most-mentioned topics as pill chips. Best-effort — empty array
  // when the table is missing or the user hasn't run Analyze yet.
  let topConcepts: Array<{ id: number; label: string; occurrence: number; docCount: number }> = [];
  let totalConceptCount = 0;
  try {
    const { count } = await supabase
      .from("concept_index")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);
    totalConceptCount = count ?? 0;
    const { data: concepts } = await supabase
      .from("concept_index")
      .select("id, label, occurrence_count, doc_ids")
      .eq("user_id", profile.id)
      .order("occurrence_count", { ascending: false })
      .limit(12);
    topConcepts = (concepts || []).map((c) => ({
      id: c.id,
      label: c.label,
      occurrence: c.occurrence_count,
      docCount: (c.doc_ids || []).length,
    }));
  } catch { /* table may not exist yet — return empty */ }

  // Aggregate stats — total words across published docs, last update.
  let totalWords = 0;
  let lastUpdated: string | null = null;
  for (const d of filteredDocs) {
    totalWords += (d.markdown || "").trim().split(/\s+/).filter(Boolean).length;
    if (!lastUpdated || d.updated_at > lastUpdated) lastUpdated = d.updated_at;
  }

  // Drafts count — owner-private docs that exist in the library but
  // don't show on the public hub. Surfaced in the response so the
  // editor's hub view can honestly say "X drafts not shown" instead
  // of letting the founder think the hub count is the whole library.
  const { count: draftsCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_draft", true)
    .is("deleted_at", null);
  // Bundles drafts too — bundles table doesn't have deleted_at, so
  // is_draft alone is the filter.
  const { count: bundleDraftsCount } = await supabase
    .from("bundles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_draft", true);

  return NextResponse.json({
    hub: {
      slug: profile.hub_slug,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      description: profile.hub_description,
      plan: profile.plan,
      url: `https://mdfy.app/hub/${profile.hub_slug}`,
    },
    documents: filteredDocs.map(d => ({
      id: d.id,
      title: d.title || "Untitled",
      snippet: (d.markdown || "").slice(0, 240),
      updated_at: d.updated_at,
      source: d.source,
    })),
    bundles: publicBundles,
    topConcepts,
    counts: {
      documents: filteredDocs.length,
      bundles: publicBundles.length,
      concepts: totalConceptCount,
      totalWords,
      drafts: draftsCount ?? 0,
      bundleDrafts: bundleDraftsCount ?? 0,
    },
    lastUpdated,
  });
}
