// Permission-system invariant audit.
//
// Scans the live database for rows that violate the permission contracts
// the editor + API enforce in code. Reports per-violation with row IDs
// so you can reproduce in the UI / fix manually.
//
// Invariants checked (each maps to a code path that should already
// guarantee it; a failure means the code path was bypassed):
//
//  1. doc.user_id XOR doc.anonymous_id     (mutex — owner identity)
//  2. bundle.user_id XOR bundle.anonymous_id
//  3. doc.deleted_at not null → no live bundle_documents pointing at it
//     (soft-delete cascade — earlier orphans came from this gap)
//  4. published bundle (is_draft=false) → all live members published too
//     (publish cascade — yc-demo had this gap)
//  5. bundle.allowed_emails non-empty → all live members carry the same
//     allowed_emails (sharing cascade)
//  6. bundle.allowed_editors non-empty → same as above for editors
//  7. password-protected bundle (password_hash != null) AND
//     is_discoverable=true → impossible (endpoint enforces; data check)
//  8. bundle.allowed_emails non-empty AND is_discoverable=true →
//     impossible (same)
//  9. doc.edit_mode in {account, token, view, public}
// 10. orphan bundle_documents (bundle_id or document_id missing)
//
// Read-only. No --apply. To fix violations, run the targeted scripts
// (dedupe-user-documents, restore-overwritten-titles, or write a new
// one for any new class of violation).
//
// Usage: node --env-file=.env.local scripts/audit-permissions.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("env missing"); process.exit(1); }
const s = createClient(url, key);

const violations = [];
function flag(rule, payload) {
  violations.push({ rule, ...payload });
}

// Pull the corpus
const [{ data: docs }, { data: bundles }, { data: bds }] = await Promise.all([
  s.from("documents").select("id, user_id, anonymous_id, is_draft, deleted_at, edit_mode, allowed_emails, allowed_editors, password_hash"),
  s.from("bundles").select("id, user_id, anonymous_id, is_draft, allowed_emails, allowed_editors, password_hash, is_discoverable"),
  s.from("bundle_documents").select("bundle_id, document_id"),
]);

const docById = new Map((docs || []).map((d) => [d.id, d]));
const bundleById = new Map((bundles || []).map((b) => [b.id, b]));
const validEditModes = new Set(["account", "token", "view", "public"]);

// 1. doc owner mutex
for (const d of docs || []) {
  if (d.user_id && d.anonymous_id) flag("1-doc-mutex", { id: d.id });
  if (!d.user_id && !d.anonymous_id) flag("1-doc-owner-missing", { id: d.id });
}

// 2. bundle owner mutex
for (const b of bundles || []) {
  if (b.user_id && b.anonymous_id) flag("2-bundle-mutex", { id: b.id });
  if (!b.user_id && !b.anonymous_id) flag("2-bundle-owner-missing", { id: b.id });
}

// 3. soft-deleted docs with live bundle_documents
for (const r of bds || []) {
  const d = docById.get(r.document_id);
  if (d && d.deleted_at) flag("3-orphan-soft-deleted", { bundle_id: r.bundle_id, document_id: r.document_id });
}

// 4-6. cascade invariants — for each published / shared bundle, verify members match
const memberMap = new Map(); // bundle_id → [doc rows]
for (const r of bds || []) {
  const d = docById.get(r.document_id);
  if (!d) continue;
  if (!memberMap.has(r.bundle_id)) memberMap.set(r.bundle_id, []);
  memberMap.get(r.bundle_id).push(d);
}
for (const b of bundles || []) {
  const members = (memberMap.get(b.id) || []).filter((d) => !d.deleted_at);
  // 4. publish cascade
  if (b.is_draft === false) {
    const draftMembers = members.filter((d) => d.is_draft);
    for (const d of draftMembers) {
      flag("4-publish-cascade-missing", { bundle_id: b.id, document_id: d.id });
    }
  }
  // 5. allowed_emails cascade
  const bundleEmails = (b.allowed_emails || []).map((e) => e.toLowerCase()).sort();
  if (bundleEmails.length > 0) {
    for (const d of members) {
      const docEmails = (d.allowed_emails || []).map((e) => e.toLowerCase()).sort();
      if (docEmails.join("|") !== bundleEmails.join("|")) {
        flag("5-allowed-emails-cascade-missing", { bundle_id: b.id, document_id: d.id });
      }
    }
  }
  // 6. allowed_editors cascade
  const bundleEditors = (b.allowed_editors || []).map((e) => e.toLowerCase()).sort();
  if (bundleEditors.length > 0) {
    for (const d of members) {
      const docEditors = (d.allowed_editors || []).map((e) => e.toLowerCase()).sort();
      if (docEditors.join("|") !== bundleEditors.join("|")) {
        flag("6-allowed-editors-cascade-missing", { bundle_id: b.id, document_id: d.id });
      }
    }
  }
}

// 7. password + discoverable
for (const b of bundles || []) {
  if (b.password_hash && b.is_discoverable) flag("7-password-and-discoverable", { id: b.id });
}

// 8. allowed_emails + discoverable
for (const b of bundles || []) {
  if (Array.isArray(b.allowed_emails) && b.allowed_emails.length > 0 && b.is_discoverable) {
    flag("8-allowed-emails-and-discoverable", { id: b.id });
  }
}

// 9. doc.edit_mode enum
for (const d of docs || []) {
  if (d.edit_mode && !validEditModes.has(d.edit_mode)) {
    flag("9-doc-edit-mode-invalid", { id: d.id, edit_mode: d.edit_mode });
  }
}

// 10. orphan bundle_documents (bundle or doc missing)
for (const r of bds || []) {
  if (!bundleById.has(r.bundle_id)) flag("10-orphan-bd-bundle", { bundle_id: r.bundle_id, document_id: r.document_id });
  if (!docById.has(r.document_id)) flag("10-orphan-bd-doc", { bundle_id: r.bundle_id, document_id: r.document_id });
}

// Report
const byRule = new Map();
for (const v of violations) {
  if (!byRule.has(v.rule)) byRule.set(v.rule, []);
  byRule.get(v.rule).push(v);
}
console.log(`Documents: ${docs?.length ?? 0}`);
console.log(`Bundles: ${bundles?.length ?? 0}`);
console.log(`bundle_documents rows: ${bds?.length ?? 0}`);
console.log(`Total violations: ${violations.length}`);
console.log("");

if (violations.length === 0) {
  console.log("✓ All invariants hold.");
  process.exit(0);
}

for (const [rule, items] of [...byRule.entries()].sort()) {
  console.log(`[${rule}]  ${items.length} violation(s)`);
  for (const v of items.slice(0, 8)) {
    const { rule: _r, ...rest } = v;
    console.log(`  ${JSON.stringify(rest)}`);
  }
  if (items.length > 8) console.log(`  …and ${items.length - 8} more`);
}
