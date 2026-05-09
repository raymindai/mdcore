// Shared 30-second dedup window for document creation.
//
// Every server-side path that ends in `INSERT INTO documents` should
// pre-check via `findRecentDuplicateDoc()`. If a recent doc owned by the
// same caller has identical markdown + title, the caller should return
// THAT row instead of inserting a sibling.
//
// Why per-path and not a SQL trigger:
// - We want the API layer to make the call (return existing id, not 409).
// - Some paths (auto-synthesis, MCP duplicate) intentionally want a NEW
//   row even if content matches; those simply skip the helper.
//
// Owner is keyed on (user_id) when present, otherwise (anonymous_id).
// Window is short enough that legitimate "same content again later" still
// proceeds; the only intent is to collapse double-clicks, multi-tab races,
// network retries, and StrictMode double-fires.

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
 * Look for a recently-created document owned by the same caller that has
 * the EXACT same (markdown, title). Returns the row if found, else null.
 * Best-effort — a thrown error resolves to null so a hit-failure never
 * blocks insertion.
 */
export async function findRecentDuplicateDoc(
  supabase: SupabaseClient,
  owner: DedupOwner,
  markdown: string,
  title: string | null | undefined,
): Promise<DedupHit | null> {
  if (!owner.userId && !owner.anonymousId) return null;
  if (!markdown || markdown.length === 0) return null;
  try {
    const sinceIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const filterCol = owner.userId ? "user_id" : "anonymous_id";
    const filterVal = (owner.userId || owner.anonymousId)!;
    const { data: rows } = await supabase
      .from("documents")
      .select("id, edit_token, markdown, title, created_at")
      .eq(filterCol, filterVal)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(8);
    const hit = (rows || []).find((row) =>
      row.markdown === markdown && (row.title || null) === (title || null)
    );
    if (!hit) return null;
    return { id: hit.id, edit_token: hit.edit_token, created_at: hit.created_at };
  } catch {
    return null;
  }
}
