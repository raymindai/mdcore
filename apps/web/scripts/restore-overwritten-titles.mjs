// Restore titles that the H1 backfill collapsed onto a generic template
// title (e.g., "Welcome to mdfy.app") when the user's INTENT was a custom
// name that lived only in the title field.
//
// Strategy:
//   1. Find docs whose current title looks like the Welcome template
//      ("Welcome to mdfy.app" / "Welcome to [mdfy.app]...").
//   2. Look up the doc's history in document_versions.
//   3. Pick the most-recent historical title that is NOT a Welcome
//      template variant and not "Untitled" — that's the user's intent.
//   4. Apply: documents.title = old, documents.markdown's first H1 also
//      rewritten to the old title so the loadTab invariant
//      (title === H1) holds going forward.
//
// Dry-run by default. --apply to commit. --user <email> to scope.

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const userIdx = args.indexOf("--user");
const userEmail = userIdx >= 0 ? args[userIdx + 1] : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("env missing"); process.exit(1); }
const s = createClient(url, key);

function isWelcomeTemplate(title) {
  if (!title) return false;
  const t = title.trim().toLowerCase();
  return t === "welcome to mdfy.app" ||
         t === "welcome to [mdfy.app](http://mdfy.app)" ||
         t.startsWith("welcome to mdfy") ||
         t.startsWith("welcome to [mdfy");
}

function isMeaningful(title) {
  if (!title) return false;
  const t = title.trim();
  if (t.length === 0) return false;
  if (t.toLowerCase() === "untitled") return false;
  if (isWelcomeTemplate(t)) return false;
  return true;
}

// Replace the first H1 line in markdown with `# {newTitle}`. Preserves
// the rest of the doc verbatim. If no H1 exists, prepends one.
function rewriteH1(md, newTitle) {
  if (!md) return `# ${newTitle}\n`;
  const lines = md.split("\n");
  const idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (idx >= 0) {
    lines[idx] = `# ${newTitle}`;
    return lines.join("\n");
  }
  return `# ${newTitle}\n\n${md}`;
}

let scopeUserId = null;
if (userEmail) {
  const { data } = await s.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email?.toLowerCase() === userEmail.toLowerCase());
  if (!u) { console.error(`No user ${userEmail}`); process.exit(1); }
  scopeUserId = u.id;
  console.log(`Scoped to ${userEmail}`);
}

// Fetch live docs whose current title is a Welcome template variant
let q = s
  .from("documents")
  .select("id, user_id, title, markdown, created_at")
  .is("deleted_at", null);
if (scopeUserId) q = q.eq("user_id", scopeUserId);
const { data: liveDocs } = await q;
const candidates = (liveDocs || []).filter((d) => isWelcomeTemplate(d.title));
console.log(`Candidate docs (current title = Welcome template): ${candidates.length}`);

if (candidates.length === 0) {
  console.log("Nothing to recover.");
  process.exit(0);
}

const docIds = candidates.map((d) => d.id);
const { data: versions } = await s
  .from("document_versions")
  .select("document_id, title, created_at")
  .in("document_id", docIds)
  .order("created_at", { ascending: false }); // newest first

// Best historical title per doc = most-recent meaningful one
const bestByDoc = new Map();
for (const v of versions || []) {
  if (bestByDoc.has(v.document_id)) continue;
  if (isMeaningful(v.title)) bestByDoc.set(v.document_id, v.title);
}

// Build the action list: only docs that have a recoverable historical title
const recovers = [];
for (const d of candidates) {
  const target = bestByDoc.get(d.id);
  if (!target) continue;
  recovers.push({ id: d.id, owner: d.user_id, currentTitle: d.title, targetTitle: target, markdown: d.markdown });
}

console.log(`Recoverable: ${recovers.length}`);
console.log(`Unrecoverable (no meaningful history): ${candidates.length - recovers.length}`);
console.log("");
console.log("Plan:");
for (const r of recovers) {
  const cur = (r.currentTitle || "").slice(0, 40).padEnd(40);
  console.log(`  ${r.id}  "${cur}" → "${r.targetTitle.slice(0, 50)}"`);
}

if (!apply) {
  console.log("");
  console.log(`(dry-run) Re-run with --apply to commit.`);
  process.exit(0);
}

console.log("");
console.log(`Applying ${recovers.length} restorations...`);
let done = 0, failed = 0;
for (const r of recovers) {
  const newMd = rewriteH1(r.markdown || "", r.targetTitle);
  const { error } = await s
    .from("documents")
    .update({ title: r.targetTitle, markdown: newMd })
    .eq("id", r.id);
  if (error) {
    failed++;
    console.error(`  ✗ ${r.id}: ${error.message}`);
    continue;
  }
  done++;
}
console.log("");
console.log(`Done. Restored ${done}. Failed ${failed}.`);
