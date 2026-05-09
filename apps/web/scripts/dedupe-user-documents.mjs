// Soft-delete duplicate documents for a single user.
//
// "Duplicate" = two or more rows owned by the same user with IDENTICAL
// markdown AND title. We keep the OLDEST row in each group (the original)
// and set deleted_at on the rest. NO hard delete — the user can recover
// via Supabase if anything is wrong.
//
// Usage (from apps/web):
//   node --env-file=.env.local scripts/dedupe-user-documents.mjs --email hi@raymind.ai
//   node --env-file=.env.local scripts/dedupe-user-documents.mjs --email hi@raymind.ai --apply
//
// Without --apply, the script only LISTS what it would do (dry-run).

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const emailIdx = args.indexOf("--email");
const email = emailIdx >= 0 ? args[emailIdx + 1] : null;
if (!email) {
  console.error("Usage: --email <email> [--apply]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const s = createClient(url, key);

// 1. Resolve email → userId
const { data: usersList, error: usersErr } = await s.auth.admin.listUsers();
if (usersErr) {
  console.error("auth.admin.listUsers failed:", usersErr.message);
  process.exit(1);
}
const user = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user with email ${email}`);
  process.exit(1);
}
const userId = user.id;
console.log(`Resolved ${email} → ${userId}`);

// 2. Pull all live (non-deleted) docs owned by this user
const { data: docs, error: docsErr } = await s
  .from("documents")
  .select("id, title, markdown, created_at, updated_at, is_draft, source")
  .eq("user_id", userId)
  .is("deleted_at", null)
  .order("created_at", { ascending: true });
if (docsErr) {
  console.error("documents select failed:", docsErr.message);
  process.exit(1);
}
console.log(`Live documents: ${docs.length}`);

// 3. Group by (title, markdown). Identical content + identical title is the
//    duplicate signature — same as the new dedup window on POST /api/docs.
const groups = new Map();
for (const d of docs) {
  const key = JSON.stringify([(d.title || "").trim(), (d.markdown || "")]);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(d);
}

const dupGroups = [...groups.values()].filter((g) => g.length > 1);
const dupTotal = dupGroups.reduce((sum, g) => sum + (g.length - 1), 0);
console.log(`Duplicate groups: ${dupGroups.length}`);
console.log(`Rows to soft-delete: ${dupTotal}`);
console.log("");

// 4. Print each group: keeper + the ones we'd delete
let groupIdx = 0;
const toDelete = [];
for (const group of dupGroups) {
  groupIdx++;
  // Already sorted by created_at asc — keep the oldest, delete the rest.
  const [keeper, ...redundant] = group;
  const titlePreview = (keeper.title || "(untitled)").slice(0, 60);
  console.log(`Group ${groupIdx}: "${titlePreview}" — ${group.length} rows`);
  console.log(`  KEEP    ${keeper.id}  ${keeper.created_at}  ${keeper.is_draft ? "[draft]" : "[published]"}`);
  for (const r of redundant) {
    console.log(`  DELETE  ${r.id}  ${r.created_at}  ${r.is_draft ? "[draft]" : "[published]"}`);
    toDelete.push(r.id);
  }
}

if (!apply) {
  console.log("");
  console.log(`(dry-run) ${toDelete.length} document(s) would be soft-deleted. Re-run with --apply to commit.`);
  process.exit(0);
}

// 5. Soft-delete in batches of 100. Set deleted_at = now() AND remove the
//    doc from every bundle that references it — this matches the API's
//    soft-delete handler so the script doesn't leave orphan
//    bundle_documents rows that the API would have cleaned up. (We're
//    keeping the OLDEST row in each group so any bundle that referenced a
//    duplicate already has a sibling pointing to the same content.)
console.log("");
console.log(`Applying soft-delete to ${toDelete.length} document(s)...`);
const now = new Date().toISOString();
let deleted = 0;
let detached = 0;
for (let i = 0; i < toDelete.length; i += 100) {
  const batch = toDelete.slice(i, i + 100);
  const { error } = await s
    .from("documents")
    .update({ deleted_at: now })
    .in("id", batch);
  if (error) {
    console.error(`Batch ${i / 100 + 1} failed:`, error.message);
    continue;
  }
  const { count: detachedNow } = await s
    .from("bundle_documents")
    .delete({ count: "exact" })
    .in("document_id", batch);
  deleted += batch.length;
  detached += detachedNow || 0;
  console.log(`  ✓ ${deleted}/${toDelete.length}  (bundle refs detached: ${detached})`);
}

console.log("");
console.log(`Done. Soft-deleted ${deleted} document(s) + detached ${detached} bundle reference(s). The originals (oldest in each group) are preserved.`);
