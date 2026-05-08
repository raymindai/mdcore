import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: profile } = await s.from("profiles").select("id, email").eq("hub_slug","yc-demo").single();
const userId = profile.id;

const ALLOWED_EMAIL = "alice@example.com";

// Always create fresh, isolated test resources so we know exactly what
// the allow-list looks like.
const docId = "yc" + Math.random().toString(36).slice(2, 9);
const editToken = "et_" + Math.random().toString(36).slice(2, 20);
const { error: insDocErr } = await s.from("documents").insert({
  id: docId, user_id: userId, title: "W11 perm test (delete me)",
  markdown: "# Restricted test doc body\n\nOnly alice@example.com should see this.\n",
  is_draft: false, allowed_emails: [ALLOWED_EMAIL], edit_token: editToken,
});
if (insDocErr) { console.error("insert doc failed", insDocErr); process.exit(1); }

const bundleId = "ycb" + Math.random().toString(36).slice(2, 8);
const bundleEditToken = "et_" + Math.random().toString(36).slice(2, 20);
const { error: insBunErr } = await s.from("bundles").insert({
  id: bundleId, user_id: userId, title: "W11 perm test bundle (delete me)",
  description: "Restricted to alice@example.com",
  is_draft: false, allowed_emails: [ALLOWED_EMAIL], edit_token: bundleEditToken,
});
if (insBunErr) { console.error("insert bundle failed", insBunErr); process.exit(1); }

// Also pick or create a fully public doc to verify the happy path still works.
// Filter out our own restricted fixture (just inserted) and any other doc
// with allowed_emails set — those would 403 the "public doc" assertion.
const { data: docs } = await s.from("documents")
  .select("id, allowed_emails")
  .eq("user_id", userId).eq("is_draft", false).is("deleted_at", null)
  .is("password_hash", null).limit(50);
const publicDoc = docs.find(
  (d) => d.id !== docId && (!Array.isArray(d.allowed_emails) || d.allowed_emails.length === 0),
);
if (!publicDoc) { console.error("no fully public doc found in hub"); process.exit(1); }
const { data: publicBundles } = await s.from("bundles")
  .select("id, allowed_emails, password_hash")
  .eq("user_id", userId).eq("is_draft", false).limit(50);
const publicBundle = publicBundles.find(b => (!b.allowed_emails || b.allowed_emails.length === 0) && !b.password_hash);

console.log("test fixtures:", { docId, bundleId, publicDocId: publicDoc.id, publicBundleId: publicBundle.id });

const cases = [
  { name: "public doc",                       url: `http://localhost:3002/raw/${publicDoc.id}`, headers: {}, expectStatus: 200, expectPerm: null },
  { name: "restricted doc, no auth",          url: `http://localhost:3002/raw/${docId}`, headers: {}, expectStatus: 403, expectPerm: "email_restricted" },
  { name: "restricted doc, wrong email",      url: `http://localhost:3002/raw/${docId}`, headers: { "X-User-Email": "bob@example.com" }, expectStatus: 403, expectPerm: "email_restricted" },
  { name: "restricted doc, right email",      url: `http://localhost:3002/raw/${docId}`, headers: { "X-User-Email": ALLOWED_EMAIL }, expectStatus: 200, expectPerm: null },
  { name: "restricted doc, mixed-case email", url: `http://localhost:3002/raw/${docId}`, headers: { "X-User-Email": "Alice@Example.COM" }, expectStatus: 200, expectPerm: null },
  { name: "missing doc",                      url: "http://localhost:3002/raw/zzz999nope", headers: {}, expectStatus: 404, expectPerm: "not_found" },
  { name: "public bundle",                    url: `http://localhost:3002/raw/bundle/${publicBundle.id}`, headers: {}, expectStatus: 200, expectPerm: null },
  { name: "restricted bundle, no auth",       url: `http://localhost:3002/raw/bundle/${bundleId}`, headers: {}, expectStatus: 403, expectPerm: "email_restricted" },
  { name: "restricted bundle, right email",   url: `http://localhost:3002/raw/bundle/${bundleId}`, headers: { "X-User-Email": ALLOWED_EMAIL }, expectStatus: 200, expectPerm: null },
  { name: "missing bundle",                   url: "http://localhost:3002/raw/bundle/zzz999nope", headers: {}, expectStatus: 404, expectPerm: "not_found" },
];

let passed = 0, failed = 0;
for (const c of cases) {
  const res = await fetch(c.url, { headers: c.headers });
  const body = await res.text();
  const perm = res.headers.get("x-mdfy-permission");
  const ct = res.headers.get("content-type") || "";
  const okStatus = res.status === c.expectStatus;
  const okPerm = c.expectPerm === null ? perm === null : perm === c.expectPerm;
  const okMd = ct.includes("text/markdown");
  // Error responses must include frontmatter starting with ---
  const okFrontmatter = c.expectPerm === null || body.startsWith("---");
  const ok = okStatus && okPerm && okMd && okFrontmatter;
  if (ok) passed++; else failed++;
  console.log(ok ? "✓" : "✗", c.name, "→", res.status, "perm=", perm);
  if (!ok) {
    console.log("  expected", c.expectStatus, c.expectPerm, "got", res.status, perm);
    console.log("  body[0..160]:", body.slice(0, 160));
  }
}
console.log(`\n${passed}/${cases.length} passed`);

// Cleanup.
await s.from("documents").delete().eq("id", docId);
await s.from("bundles").delete().eq("id", bundleId);

if (failed > 0) process.exit(1);
