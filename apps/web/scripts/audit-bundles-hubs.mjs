import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = "hi@raymind.ai";
const { data: usersList } = await s.auth.admin.listUsers();
const user = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
const userId = user.id;
console.log(`User: ${email} → ${userId}\n`);

// ─── Bundles ───────────────────────────────────────────────
const { data: bundles } = await s
  .from("bundles")
  .select("id, title, description, created_at, is_draft")
  .eq("user_id", userId)
  .order("created_at", { ascending: true });
console.log(`Live bundles: ${bundles?.length ?? 0}`);

// Group by title
const byBundleTitle = new Map();
for (const b of bundles || []) {
  const key = (b.title || "(untitled)").trim();
  if (!byBundleTitle.has(key)) byBundleTitle.set(key, []);
  byBundleTitle.get(key).push(b);
}
const bundleTitleDups = [...byBundleTitle.entries()].filter(([_, arr]) => arr.length > 1);
console.log(`Bundle title-collision groups: ${bundleTitleDups.length}`);
for (const [t, arr] of bundleTitleDups) {
  console.log(`  "${t}" — ${arr.length} rows`);
  for (const b of arr) {
    console.log(`    ${b.id}  ${b.created_at.slice(0, 19)}  ${b.is_draft ? "[draft]" : "[pub]"}`);
  }
}

// Same-title + same-description as a stricter signal
const byBundleSig = new Map();
for (const b of bundles || []) {
  const key = `${(b.title || "").trim()}::${(b.description || "").trim()}`;
  if (!byBundleSig.has(key)) byBundleSig.set(key, []);
  byBundleSig.get(key).push(b);
}
const bundleStrictDups = [...byBundleSig.values()].filter((g) => g.length > 1);
console.log(`Bundle (title+description) strict dup groups: ${bundleStrictDups.length}`);
let bundleStrictRedundant = 0;
for (const g of bundleStrictDups) bundleStrictRedundant += g.length - 1;
console.log(`Bundle strict redundant rows: ${bundleStrictRedundant}\n`);

// ─── bundle_documents ──────────────────────────────────────
// Already protected by UNIQUE(bundle_id, document_id). Verify count
// per (bundle_id, document_id) is exactly 1.
const bundleIds = (bundles || []).map((b) => b.id);
if (bundleIds.length > 0) {
  const { data: bds } = await s
    .from("bundle_documents")
    .select("bundle_id, document_id")
    .in("bundle_id", bundleIds);
  const seen = new Map();
  for (const r of bds || []) {
    const k = `${r.bundle_id}::${r.document_id}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  const dupRefs = [...seen.entries()].filter(([_, n]) => n > 1);
  console.log(`bundle_documents rows: ${bds?.length ?? 0}`);
  console.log(`bundle_documents (bundle,doc) dup refs: ${dupRefs.length}`);
}

// ─── Hubs ──────────────────────────────────────────────────
// Hub identity = profile.hub_slug. One hub per user. Verify uniqueness.
const { data: profile } = await s
  .from("profiles")
  .select("id, hub_slug")
  .eq("id", userId)
  .single();
console.log(`\nHub slug for this user: ${profile?.hub_slug || "(none)"}`);

// Check if any other profile shares this hub_slug (would be a global dup)
if (profile?.hub_slug) {
  const { data: collisions } = await s
    .from("profiles")
    .select("id, hub_slug")
    .eq("hub_slug", profile.hub_slug);
  console.log(`Profiles sharing hub_slug "${profile.hub_slug}": ${collisions?.length ?? 0}`);
  if ((collisions?.length ?? 0) > 1) {
    console.log("  ⚠ HUB SLUG COLLISION");
    for (const c of collisions) console.log(`    ${c.id}`);
  }
}
