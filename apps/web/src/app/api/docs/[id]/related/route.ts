// GET /api/docs/[id]/related
//
// Returns up to N other docs from the same hub that share the most
// concepts with this doc, with the list of shared concept labels.
// Powers the "Related in your hub" widget rendered below the doc
// body — the AI-era replacement for hand-typed backlinks. The
// concept graph is built by the AI from the user's prose, and
// every doc that shares concepts is a "backlink" without anyone
// typing [[wikilink]].
//
// Why concept overlap (not vector similarity): the hub's concept
// graph is the user's authored signal — what THEY think this doc
// is about — and overlap maps cleanly to "you've written more
// here, here's where else." Vector similarity surfaces lexically
// near content even when it's a different topic; not what the
// widget needs.
//
// Privacy: two paths.
//   1. Owner (signed-in caller id matches doc.user_id): sees
//      everything — drafts, restricted, password-protected docs
//      all surface in the related list. Used by the editor.
//   2. Public visitor (anon or different signed-in user): only
//      allowed when BOTH the doc itself is fully public (published,
//      no password, no allowed_emails) AND its hub_public=true.
//      Results are then filtered to only public docs in the same
//      hub. Used by the public viewer's "Related" panel.
// Anything else returns 403 — cross-user "related" would leak
// strangers' titles via concept overlap.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getServerUserId } from "@/lib/supabase-server";
import { logRelated } from "@/lib/recall-telemetry";

type RouteParams = { params: Promise<{ id: string }> };

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

interface ConceptRow {
  label: string;
  doc_ids: string[] | null;
  weight: number | null;
}

interface DocStub {
  id: string;
  title: string | null;
  updated_at: string | null;
  is_draft: boolean | null;
  allowed_emails: string[] | null;
}

interface RelatedRow {
  id: string;
  title: string;
  sharedConcepts: string[];
  overlap: number;
  updated_at: string | null;
  // Status fields so the client can render DocStatusIcon without a
  // second round-trip per row. We don't return password_hash; it
  // would be a leak vector and is no longer a real access mode.
  isDraft: boolean;
  isRestricted: boolean;
  sharedWithCount: number;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const t0 = Date.now();
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const callerId = verified?.userId || req.headers.get("x-user-id") || (await getServerUserId());
  const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(req.nextUrl.searchParams.get("limit") || "", 10) || DEFAULT_LIMIT));

  // Look up the doc once. Need user_id (for concept_index lookup),
  // visibility (for public-mode gating), and the owning hub's
  // hub_public flag (also for public mode).
  const { data: doc } = await supabase
    .from("documents")
    .select("id, user_id, is_draft, password_hash, allowed_emails")
    .eq("id", id)
    .single();
  if (!doc) {
    logRelated({ docId: id, callerIsOwner: false, conceptCount: 0, candidateCount: 0, resultCount: 0, limit, conceptFetchMs: 0, joinMs: 0, totalMs: Date.now() - t0, status: 404, errorCode: "not_found" });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Owner if signed-in id matches the doc's owner. Anonymous + non-
  // matching callers fall to the public path.
  const isOwner = !!callerId && doc.user_id === callerId;

  // Public path admission gate. The doc itself must be fully public
  // (published, no password, no email restriction) AND its hub must
  // be public — otherwise we'd leak doc existence + titles to
  // strangers. Owners always pass.
  let docIsPublic = false;
  let hubIsPublic = false;
  if (!isOwner) {
    docIsPublic = doc.is_draft === false
      && !doc.password_hash
      && (!doc.allowed_emails || (Array.isArray(doc.allowed_emails) && doc.allowed_emails.length === 0));
    if (docIsPublic && doc.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("hub_public")
        .eq("id", doc.user_id)
        .single();
      hubIsPublic = !!profile?.hub_public;
    }
    if (!docIsPublic || !hubIsPublic) {
      // Return empty 200 instead of 403 so the public viewer's
      // RelatedInHubPanel can fail silently without the browser
      // console auto-logging a "Failed to load resource (403)"
      // every doc load. Same observable behaviour for the caller
      // (no related shown), zero info leak (empty result).
      logRelated({ docId: id, callerIsOwner: false, conceptCount: 0, candidateCount: 0, resultCount: 0, limit, conceptFetchMs: 0, joinMs: 0, totalMs: Date.now() - t0, status: 200, errorCode: "private_hub" });
      return NextResponse.json({ id, related: [] });
    }
  }

  // The id under which concept_index lookups happen is always the
  // doc owner's, not the caller's. The auth gate above ensures only
  // owners + public-hub visitors get this far.
  const userId = doc.user_id;
  if (!userId) {
    return NextResponse.json({ error: "no_owner" }, { status: 404 });
  }

  // 1. Fetch every concept that includes THIS doc in its doc_ids.
  //    `cs` (contains) on text[] is the fast path for this lookup.
  const tConcept = Date.now();
  const { data: concepts } = await supabase
    .from("concept_index")
    .select("label, doc_ids, weight")
    .eq("user_id", userId)
    .contains("doc_ids", [id])
    .limit(200);
  const conceptFetchMs = Date.now() - tConcept;

  const rows = (concepts || []) as ConceptRow[];
  if (rows.length === 0) {
    logRelated({ docId: id, callerIsOwner: isOwner, conceptCount: 0, candidateCount: 0, resultCount: 0, limit, conceptFetchMs, joinMs: 0, totalMs: Date.now() - t0, status: 200 });
    return NextResponse.json({ id, related: [] });
  }

  // 2. Tally co-occurrences in JS — for each OTHER doc that
  //    appears in any of these concepts, accumulate the shared
  //    concept labels. Concept weight breaks ties so a heavy-
  //    weight concept counts more than a passing mention.
  const overlap = new Map<string, { labels: Set<string>; weight: number }>();
  for (const c of rows) {
    if (!c.doc_ids) continue;
    for (const otherId of c.doc_ids) {
      if (otherId === id) continue;
      const entry = overlap.get(otherId) || { labels: new Set<string>(), weight: 0 };
      entry.labels.add(c.label);
      entry.weight += c.weight || 1;
      overlap.set(otherId, entry);
    }
  }

  if (overlap.size === 0) {
    logRelated({ docId: id, callerIsOwner: isOwner, conceptCount: rows.length, candidateCount: 0, resultCount: 0, limit, conceptFetchMs, joinMs: 0, totalMs: Date.now() - t0, status: 200 });
    return NextResponse.json({ id, related: [] });
  }

  // 3. Sort by (overlap count desc, weight desc), keep top N
  //    candidate ids, then JOIN against documents for titles.
  const ranked = Array.from(overlap.entries())
    .map(([docId, v]) => ({ docId, count: v.labels.size, weight: v.weight, labels: [...v.labels] }))
    .sort((a, b) => b.count - a.count || b.weight - a.weight)
    .slice(0, limit * 3); // pull a wider slice — some may be deleted / drafts we filter below

  const candidateIds = ranked.map((r) => r.docId);
  const tJoin = Date.now();
  let docQuery = supabase
    .from("documents")
    .select("id, title, updated_at, deleted_at, is_draft, allowed_emails, password_hash")
    .in("id", candidateIds)
    .eq("user_id", userId)
    .is("deleted_at", null);
  // Public visitors only see public docs — filter at the query
  // level so we never serialise hidden titles. Owners see everything
  // (drafts, restricted, password-protected).
  if (!isOwner) {
    docQuery = docQuery.eq("is_draft", false).is("password_hash", null);
  }
  const { data: docRows } = await docQuery;
  const joinMs = Date.now() - tJoin;

  // Owner email so we can exclude self from sharedWithCount —
  // mirrors the sidebar's hydration logic in MdEditor.
  let ownerEmailLower = "";
  try {
    const { data: ownerUser } = await supabase.auth.admin.getUserById(userId);
    ownerEmailLower = ownerUser?.user?.email?.toLowerCase() || "";
  } catch { /* ignore */ }

  const docById = new Map<string, DocStub>(
    (docRows || []).map((d) => [d.id, {
      id: d.id,
      title: d.title,
      updated_at: d.updated_at,
      is_draft: d.is_draft ?? null,
      allowed_emails: d.allowed_emails ?? null,
    }]),
  );

  const related: RelatedRow[] = [];
  for (const r of ranked) {
    const doc = docById.get(r.docId);
    if (!doc) continue;
    const others = (doc.allowed_emails || []).filter((e) => e.toLowerCase() !== ownerEmailLower);
    // Public visitors must not see email-restricted docs even if
    // the concept overlap surfaced them. Owner already passes.
    if (!isOwner && others.length > 0) continue;
    related.push({
      id: doc.id,
      title: doc.title || "Untitled",
      sharedConcepts: r.labels.slice(0, 5),
      overlap: r.count,
      updated_at: doc.updated_at,
      isDraft: !!doc.is_draft,
      isRestricted: others.length > 0,
      sharedWithCount: others.length,
    });
    if (related.length >= limit) break;
  }

  logRelated({
    docId: id,
    callerIsOwner: isOwner,
    conceptCount: rows.length,
    candidateCount: overlap.size,
    resultCount: related.length,
    limit,
    conceptFetchMs,
    joinMs,
    totalMs: Date.now() - t0,
    status: 200,
  });
  return NextResponse.json({ id, related });
}
