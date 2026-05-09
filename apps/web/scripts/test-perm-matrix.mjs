// Permission contract test matrix.
//
// Hits the LIVE API (default http://localhost:3002) with every
// (subject, resource) pair we care about and asserts the response
// status code. Catches regressions like the owner-vs-password gate
// drift that 401'd yc on their own doc, or the publish-cascade
// missing that 404'd public bundle viewers.
//
// Subjects:
//   - owner            → ownerUserId via x-user-id
//   - otherUser        → another user's id (must NOT see private)
//   - anon-cookie      → a fresh anonymous_id via x-anonymous-id
//   - anon-no-auth     → no auth at all (public-stranger)
//   - edit-token       → edit_token via PATCH actions only
//   - allowed-email    → email in allowed_emails
//   - non-allowed-email→ email NOT in allowed_emails
//   - correct-password → x-document-password = correct
//   - wrong-password   → x-document-password = wrong
//   - no-password      → password-required doc with no password header
//
// Resources are CREATED fresh per run so we know exact state, then
// hard-deleted at the end. Resource matrix:
//   doc:public, doc:draft, doc:restricted, doc:password,
//   doc:expired, doc:soft-deleted
//   bundle:public, bundle:draft, bundle:restricted, bundle:password
//
// Run:
//   npm run dev   (in another terminal)
//   node --env-file=.env.local scripts/test-perm-matrix.mjs

import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const BASE = process.env.MDFY_BASE_URL || "http://localhost:3002";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("env missing"); process.exit(1); }
const s = createClient(url, key);

const PASSWORD = "test-pw-" + nanoid(6);
const ALLOWED_EMAIL = `allowed-${nanoid(4)}@test.local`;
const NON_ALLOWED_EMAIL = `other-${nanoid(4)}@test.local`;
const ANON_COOKIE = nanoid(16);

// Pick two distinct user IDs from existing auth users (or fall back).
const { data: usersList } = await s.auth.admin.listUsers();
const yc = usersList.users.find((u) => u.email?.toLowerCase() === "yc@mdfy.app");
const hi = usersList.users.find((u) => u.email?.toLowerCase() === "hi@raymind.ai");
if (!yc || !hi) { console.error("need yc@mdfy.app + hi@raymind.ai users"); process.exit(1); }
const OWNER_ID = yc.id;
const OTHER_ID = hi.id;
const OWNER_EMAIL = "yc@mdfy.app";

console.log(`Testing against ${BASE}`);
console.log(`Owner: yc (${OWNER_ID.slice(0, 8)}...) / Other: hi (${OTHER_ID.slice(0, 8)}...)`);

// ─── Fixtures ──────────────────────────────────────────────────────
async function hashPwd(plain) {
  const salt = crypto.randomUUID();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + plain));
  const hash = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `${salt}:${hash}`;
}
const passwordHash = await hashPwd(PASSWORD);

const fx = {}; // fixture ids
async function makeDoc(label, attrs) {
  const id = "perm" + nanoid(6);
  const editToken = nanoid(32);
  const insert = {
    id, user_id: OWNER_ID, anonymous_id: null,
    title: `perm-test ${label}`, markdown: `# ${label}\n\nbody`,
    edit_token: editToken, edit_mode: "account",
    is_draft: false, ...attrs,
  };
  const { error } = await s.from("documents").insert(insert);
  if (error) { console.error("makeDoc", label, error.message); process.exit(1); }
  fx[`doc:${label}`] = { id, editToken };
  return id;
}
async function makeBundle(label, attrs, memberId) {
  const id = "perm" + nanoid(6);
  const editToken = nanoid(32);
  const { error } = await s.from("bundles").insert({
    id, user_id: OWNER_ID, anonymous_id: null,
    title: `perm-test ${label}`, edit_token: editToken,
    is_draft: false, ...attrs,
  });
  if (error) { console.error("makeBundle", label, error.message); process.exit(1); }
  if (memberId) {
    await s.from("bundle_documents").insert({ bundle_id: id, document_id: memberId, sort_order: 0 });
  }
  fx[`bundle:${label}`] = { id, editToken };
  return id;
}

await makeDoc("public", {});
await makeDoc("draft", { is_draft: true });
await makeDoc("restricted", { allowed_emails: [ALLOWED_EMAIL] });
await makeDoc("password", { password_hash: passwordHash });
await makeDoc("expired", { expires_at: new Date(Date.now() - 60_000).toISOString() });
await makeDoc("softdel", { deleted_at: new Date().toISOString() });
await makeBundle("public", {});
await makeBundle("draft", { is_draft: true });
await makeBundle("restricted", { allowed_emails: [ALLOWED_EMAIL] });
await makeBundle("password", { password_hash: passwordHash });

console.log("Fixtures created. Running tests...\n");

// ─── Subject helpers ──────────────────────────────────────────────
const subjects = {
  "owner":             { headers: { "x-user-id": OWNER_ID } },
  "otherUser":         { headers: { "x-user-id": OTHER_ID } },
  "anon-cookie":       { headers: { "x-anonymous-id": ANON_COOKIE } },
  "anon-no-auth":      { headers: {} },
  "allowed-email":     { headers: { "x-user-email": ALLOWED_EMAIL } },
  "non-allowed-email": { headers: { "x-user-email": NON_ALLOWED_EMAIL } },
  "owner+wrongPwd":    { headers: { "x-user-id": OWNER_ID, "x-document-password": "wrong" } },
  "stranger+correct":  { headers: { "x-document-password": PASSWORD } },
  "stranger+wrong":    { headers: { "x-document-password": "wrong" } },
  "stranger+no-pwd":   { headers: {} },
};

async function status(path, headers) {
  const res = await fetch(BASE + path, { headers });
  return res.status;
}

// ─── Matrix: [subject, resource, expectedStatus] ───────────────────
const cases = [
  // doc:public — anyone can GET
  ["doc:public",  "owner",            200],
  ["doc:public",  "otherUser",        200],
  ["doc:public",  "anon-no-auth",     200],

  // doc:draft — only owner
  ["doc:draft",   "owner",            200],
  ["doc:draft",   "otherUser",        404],
  ["doc:draft",   "anon-no-auth",     404],

  // doc:restricted — allowed_email or owner
  ["doc:restricted", "owner",            200],
  ["doc:restricted", "allowed-email",    200],
  ["doc:restricted", "non-allowed-email",403],
  ["doc:restricted", "anon-no-auth",     403],

  // doc:password — owner bypasses, others need x-document-password
  ["doc:password", "owner",            200], // owner-bypass (the fix)
  ["doc:password", "stranger+no-pwd",  401],
  ["doc:password", "stranger+wrong",   403],
  ["doc:password", "stranger+correct", 200],

  // doc:expired
  ["doc:expired", "owner",            410],
  ["doc:expired", "anon-no-auth",     410],

  // doc:softdel — soft-deleted is gated to owner only
  ["doc:softdel", "owner",            200],
  ["doc:softdel", "anon-no-auth",     404],

  // bundle:public
  ["bundle:public",     "owner",        200],
  ["bundle:public",     "otherUser",    200],
  ["bundle:public",     "anon-no-auth", 200],

  // bundle:draft — only owner
  ["bundle:draft",      "owner",        200],
  ["bundle:draft",      "otherUser",    404],
  ["bundle:draft",      "anon-no-auth", 404],

  // bundle:restricted
  ["bundle:restricted", "owner",            200],
  ["bundle:restricted", "allowed-email",    200],
  ["bundle:restricted", "non-allowed-email",403],
  ["bundle:restricted", "anon-no-auth",     403],

  // bundle:password
  ["bundle:password",   "owner",            200],
  ["bundle:password",   "stranger+no-pwd",  401],
  ["bundle:password",   "stranger+wrong",   403],
  ["bundle:password",   "stranger+correct", 200],
];

let passed = 0, failed = 0;
const fails = [];
for (const [resourceKey, subjectKey, expected] of cases) {
  const fixture = fx[resourceKey];
  if (!fixture) { console.warn(`(skip) ${resourceKey} not created`); continue; }
  const subject = subjects[subjectKey];
  if (!subject) { console.warn(`(skip) subject ${subjectKey} undefined`); continue; }
  const path = resourceKey.startsWith("doc:")
    ? `/api/docs/${fixture.id}`
    : `/api/bundles/${fixture.id}`;
  const got = await status(path, subject.headers);
  const ok = got === expected;
  if (ok) passed++;
  else {
    failed++;
    fails.push({ resourceKey, subjectKey, expected, got });
  }
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${resourceKey.padEnd(20)} ${subjectKey.padEnd(20)} expected=${expected} got=${got}`);
}

console.log("");
console.log(`${passed}/${cases.length} passed, ${failed} failed`);
if (failed > 0) {
  console.log("");
  console.log("FAILURES:");
  for (const f of fails) console.log(`  ${f.resourceKey} / ${f.subjectKey}: expected ${f.expected}, got ${f.got}`);
}

// ─── Cleanup ──────────────────────────────────────────────────────
console.log("\nCleaning up fixtures...");
const docIds = Object.entries(fx).filter(([k]) => k.startsWith("doc:")).map(([, v]) => v.id);
const bundleIds = Object.entries(fx).filter(([k]) => k.startsWith("bundle:")).map(([, v]) => v.id);
await s.from("bundle_documents").delete().in("bundle_id", bundleIds);
await s.from("bundles").delete().in("id", bundleIds);
await s.from("documents").delete().in("id", docIds);
console.log("Done.");

process.exit(failed > 0 ? 1 : 0);
