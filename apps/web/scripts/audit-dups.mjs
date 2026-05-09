import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = "hi@raymind.ai";
const { data: usersList } = await s.auth.admin.listUsers();
const user = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
const userId = user.id;

const { data: docs } = await s
  .from("documents")
  .select("id, title, markdown, created_at, is_draft")
  .eq("user_id", userId)
  .is("deleted_at", null)
  .order("created_at", { ascending: true });

console.log(`Total live docs: ${docs.length}\n`);

// Group by title alone
const byTitle = new Map();
for (const d of docs) {
  const key = (d.title || "(untitled)").trim();
  if (!byTitle.has(key)) byTitle.set(key, []);
  byTitle.get(key).push(d);
}
const titleDups = [...byTitle.entries()].filter(([_, arr]) => arr.length > 1);
console.log(`Title-only dup groups: ${titleDups.length}`);
let titleRedundant = 0;
for (const [t, arr] of titleDups) {
  titleRedundant += arr.length - 1;
  console.log(`  "${t.slice(0, 60)}" — ${arr.length} rows`);
}
console.log(`Title-only redundant rows: ${titleRedundant}\n`);

// Check first-100-chars-of-markdown match
const byPrefix = new Map();
for (const d of docs) {
  const t = (d.title || "").trim();
  const md = (d.markdown || "").slice(0, 200).trim();
  if (md.length < 20) continue; // skip very short / empty
  const key = `${t}::${md}`;
  if (!byPrefix.has(key)) byPrefix.set(key, []);
  byPrefix.get(key).push(d);
}
const prefixDups = [...byPrefix.entries()].filter(([_, arr]) => arr.length > 1);
console.log(`Title + first-200-md-chars dup groups: ${prefixDups.length}`);
let prefixRedundant = 0;
for (const [_, arr] of prefixDups) {
  prefixRedundant += arr.length - 1;
}
console.log(`Title + prefix redundant rows: ${prefixRedundant}\n`);

// Show distribution of doc creation by week to see if there's a burst
const byMonth = new Map();
for (const d of docs) {
  const m = d.created_at.slice(0, 7);
  byMonth.set(m, (byMonth.get(m) || 0) + 1);
}
console.log("Docs per month:");
for (const [m, n] of [...byMonth.entries()].sort()) {
  console.log(`  ${m}: ${n}`);
}

// Also check soft-deleted
const { data: deletedDocs } = await s
  .from("documents")
  .select("id, title, created_at")
  .eq("user_id", userId)
  .not("deleted_at", "is", null);
console.log(`\nSoft-deleted docs: ${deletedDocs?.length || 0}`);
