// Backfill: documents.title = first H1 of documents.markdown
//
// Invariant the editor now enforces on every open:
//   "the document's title IS its first H1"
//
// loadTab now syncs at open time, but only for docs that get opened. For
// the sidebar / search / OG / hub feed to show the right title BEFORE the
// user opens each row, we need a one-time DB-wide backfill.
//
// Safety rules:
// - Only update rows where extracted H1 exists AND differs from stored title.
//   No H1 → skip (don't overwrite a user-set title with "Untitled").
// - No deletes.
// - Dry-run by default. --apply to commit.
// - Optional --user <email> to scope to one user (recommended for first
//   real run on a single account, then repeat without --user).
// - Always reports per-user impact so you see scale before committing.
//
// Usage (from apps/web):
//   node --env-file=.env.local scripts/backfill-doc-title-from-h1.mjs
//   node --env-file=.env.local scripts/backfill-doc-title-from-h1.mjs --user hi@raymind.ai
//   node --env-file=.env.local scripts/backfill-doc-title-from-h1.mjs --apply

import { createClient } from "@supabase/supabase-js";

function extractH1(md) {
  if (!md) return "";
  const m = md.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : "";
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const userIdx = args.indexOf("--user");
const userEmail = userIdx >= 0 ? args[userIdx + 1] : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const s = createClient(url, key);

let scopeUserId = null;
if (userEmail) {
  const { data } = await s.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email?.toLowerCase() === userEmail.toLowerCase());
  if (!u) { console.error(`No auth user with email ${userEmail}`); process.exit(1); }
  scopeUserId = u.id;
  console.log(`Scoped to user: ${userEmail} → ${scopeUserId}`);
}

// Pull rows in batches because some accounts have thousands.
const PAGE = 500;
let from = 0;
const updates = [];   // { id, oldTitle, newTitle, owner }
let scanned = 0;
let skippedNoH1 = 0;
let alreadyAligned = 0;
while (true) {
  let q = s
    .from("documents")
    .select("id, title, markdown, user_id, anonymous_id, source, deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .range(from, from + PAGE - 1);
  if (scopeUserId) q = q.eq("user_id", scopeUserId);
  const { data: rows, error } = await q;
  if (error) {
    console.error("select failed:", error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) break;
  for (const r of rows) {
    scanned++;
    const h1 = extractH1(r.markdown || "");
    if (!h1) { skippedNoH1++; continue; }
    if ((r.title || "") === h1) { alreadyAligned++; continue; }
    updates.push({
      id: r.id,
      oldTitle: r.title || "",
      newTitle: h1,
      owner: r.user_id || `anon:${r.anonymous_id || "?"}`,
      source: r.source || null,
    });
  }
  from += PAGE;
  if (rows.length < PAGE) break;
}

console.log("");
console.log(`Scanned: ${scanned}`);
console.log(`Already aligned (title === H1): ${alreadyAligned}`);
console.log(`Skipped (no H1): ${skippedNoH1}`);
console.log(`Will update: ${updates.length}`);
console.log("");

// Distribution by user
const byOwner = new Map();
for (const u of updates) byOwner.set(u.owner, (byOwner.get(u.owner) || 0) + 1);
const ownerRanked = [...byOwner.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Affected owners: ${ownerRanked.length}`);
for (const [owner, n] of ownerRanked.slice(0, 20)) {
  console.log(`  ${n.toString().padStart(4)}  ${owner}`);
}
if (ownerRanked.length > 20) console.log(`  …and ${ownerRanked.length - 20} more`);

// Sample diffs
console.log("");
console.log("Sample changes (first 15):");
for (const u of updates.slice(0, 15)) {
  const oldT = (u.oldTitle || "(empty)").slice(0, 50).padEnd(50);
  const newT = u.newTitle.slice(0, 50);
  console.log(`  ${u.id}  "${oldT}" → "${newT}"`);
}

if (!apply) {
  console.log("");
  console.log(`(dry-run) Re-run with --apply to commit.`);
  process.exit(0);
}

console.log("");
console.log(`Applying ${updates.length} title updates...`);
let done = 0;
let failed = 0;
// One UPDATE per row — Supabase doesn't expose a true bulk UPDATE that
// sets a different value per row, and the volume here is small enough
// (a few thousand at most). Title is the only column touched.
for (const u of updates) {
  const { error } = await s
    .from("documents")
    .update({ title: u.newTitle })
    .eq("id", u.id);
  if (error) {
    failed++;
    console.error(`  ✗ ${u.id}: ${error.message}`);
    continue;
  }
  done++;
  if (done % 50 === 0) console.log(`  ✓ ${done}/${updates.length}`);
}

console.log("");
console.log(`Done. Updated ${done}. Failed ${failed}.`);
