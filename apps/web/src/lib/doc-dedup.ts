// Owner-scoped dedup for document creation.
//
// Every server-side path that ends in `INSERT INTO documents` should
// pre-check via `findRecentDuplicateDoc()`. If an existing doc owned by
// the same caller has identical (markdown, title), the caller should
// return THAT row instead of inserting a sibling.
//
// Why two windows:
//   - Authenticated user: UNBOUNDED. A logged-in user creating a second
//     doc with byte-identical content under the same title is *almost
//     always* an unintentional duplicate (multi-window migration races,
//     re-imports, sign-out/sign-in cycles re-firing local→cloud
//     migration, multi-tab localStorage divergence, etc.). On 2026-05-10
//     we shipped this strict mode after observing duplicates HOURS or
//     DAYS apart in production — none of which the original 30-second
//     window could catch. The Duplicate UI flow appends " (copy)" to
//     the title, so intentional duplication still works.
//   - Anonymous user: 30-SECOND window. Anonymous sessions sometimes
//     genuinely want fresh sibling docs with similar starter content
//     during quick experimentation, so we only collapse races there.
//
// Owner is keyed on (user_id) when present, otherwise (anonymous_id).

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEDUP_WINDOW_MS = 30_000;

export interface DedupOwner {
  userId?: string | null;
  anonymousId?: string | null;
}

export interface DedupHit {
  id: string;
  edit_token: string;
  created_at: string;
}

/**
 * Look for an existing doc owned by the same caller with identical
 * (markdown, title). Returns the row if found, else null. Best-effort —
 * a thrown error resolves to null so a hit-failure never blocks
 * insertion.
 *
 * For authenticated users (userId set), the lookup is UNBOUNDED in
 * time. For anonymous users the lookup is restricted to the last
 * 30 seconds. Pass `unbounded: false` to force the time window even
 * for authenticated users (rare — used by the "force new doc" flow).
 */
export async function findRecentDuplicateDoc(
  supabase: SupabaseClient,
  owner: DedupOwner,
  markdown: string,
  title: string | null | undefined,
  options?: { unbounded?: boolean },
): Promise<DedupHit | null> {
  if (!owner.userId && !owner.anonymousId) return null;
  if (!markdown || markdown.length === 0) return null;
  try {
    const filterCol = owner.userId ? "user_id" : "anonymous_id";
    const filterVal = (owner.userId || owner.anonymousId)!;
    // Default: unbounded for authenticated users, 30-second window for anon.
    const unbounded = options?.unbounded ?? !!owner.userId;
    let q = supabase
      .from("documents")
      .select("id, edit_token, markdown, title, created_at, deleted_at")
      .eq(filterCol, filterVal)
      .is("deleted_at", null);
    if (!unbounded) {
      const sinceIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
      q = q.gte("created_at", sinceIso);
    }
    // Filter by title server-side to narrow the result set quickly.
    // Title can be null in the DB; eq("title", null) doesn't work in
    // PostgREST so use is/null in that case.
    if (title) q = q.eq("title", title);
    else q = q.is("title", null);

    // Oldest first — when there's an existing hit we want the canonical
    // (original) row, not the newest near-duplicate.
    q = q.order("created_at", { ascending: true }).limit(20);
    const { data: rows } = await q;
    const hit = (rows || []).find((row) => row.markdown === markdown);
    if (!hit) return null;
    return { id: hit.id, edit_token: hit.edit_token, created_at: hit.created_at };
  } catch {
    return null;
  }
}
