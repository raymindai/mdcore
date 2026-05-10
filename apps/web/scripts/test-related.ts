// End-to-end test for GET /api/docs/[id]/related.
//
// Lifecycle:
//   1. Seed two docs (A and B) owned by the test user under a third
//      doc id we don't want to surface (C).
//   2. Insert two concept_index rows that link A↔B (one shared label,
//      one unique-to-A) so the overlap math is non-trivial.
//   3. GET /api/docs/<A>/related and assert:
//      - B appears in `related[]`
//      - C does NOT appear (unrelated)
//      - sharedConcepts is the single overlapping label
//      - overlap === 1
//      - isDraft / isRestricted / sharedWithCount fields are present
//   4. Hit /related as a stranger (different user_id) — must 403.
//      Cross-user overlap leaks titles, so the gate is load-bearing.
//   5. Cleanup: delete the seeded docs + concept rows.
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env. Dev server
// (or staging) must be reachable at MDFY_BASE_URL (default
// http://localhost:3002) for the HTTP calls.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const TEST_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";
const STRANGER_USER_ID = "00000000-0000-0000-0000-000000000bad";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function nanoid(n = 8): string {
  const alpha = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let s = ""; for (let i = 0; i < n; i++) s += alpha[Math.floor(Math.random() * alpha.length)]; return s;
}

let pass = 0; let fail = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

(async () => {
  const aId = `rel-a-${nanoid()}`;
  const bId = `rel-b-${nanoid()}`;
  const cId = `rel-c-${nanoid()}`;
  const sharedLabel = `rel-shared-${nanoid()}`;
  const onlyALabel  = `rel-only-a-${nanoid()}`;

  // 1) Seed docs
  const seedErr = await supabase.from("documents").insert([
    { id: aId, markdown: `# Doc A\nShares ${sharedLabel} + ${onlyALabel}.`, title: "Doc A", user_id: TEST_USER_ID, edit_token: nanoid(32), edit_mode: "account", is_draft: false, source: "related-test" },
    { id: bId, markdown: `# Doc B\nShares ${sharedLabel}.`, title: "Doc B", user_id: TEST_USER_ID, edit_token: nanoid(32), edit_mode: "account", is_draft: false, source: "related-test" },
    { id: cId, markdown: `# Doc C\nUnrelated.`, title: "Doc C", user_id: TEST_USER_ID, edit_token: nanoid(32), edit_mode: "account", is_draft: false, source: "related-test" },
  ]).then(r => r.error);
  if (seedErr) { console.error("seed insert failed:", seedErr); process.exit(1); }

  // 2) Seed concept_index rows
  const conceptErr = await supabase.from("concept_index").insert([
    { user_id: TEST_USER_ID, label: sharedLabel, normalized_label: sharedLabel.toLowerCase(), concept_type: "concept", weight: 2.0, doc_ids: [aId, bId] },
    { user_id: TEST_USER_ID, label: onlyALabel,  normalized_label: onlyALabel.toLowerCase(),  concept_type: "concept", weight: 1.0, doc_ids: [aId] },
  ]).then(r => r.error);
  if (conceptErr) { console.error("concept insert failed:", conceptErr); process.exit(1); }

  try {
    // 3) Hit /related as owner
    const okRes = await fetch(`${baseUrl}/api/docs/${aId}/related?limit=5`, {
      headers: { "x-user-id": TEST_USER_ID },
    });
    const okJson = await okRes.json().catch(() => ({}));
    check("owner GET responds 200", okRes.status === 200, `got ${okRes.status}: ${JSON.stringify(okJson).slice(0,200)}`);
    check("response shape: id + related[]", okJson.id === aId && Array.isArray(okJson.related), JSON.stringify(okJson).slice(0,200));

    const related = (okJson.related || []) as Array<{ id: string; sharedConcepts: string[]; overlap: number; isDraft?: boolean; isRestricted?: boolean; sharedWithCount?: number; title?: string }>;

    const bRow = related.find(r => r.id === bId);
    check("Doc B appears in related", !!bRow, `related ids: ${related.map(r=>r.id).join(", ")}`);
    check("Doc C does NOT appear in related", !related.find(r => r.id === cId));
    check("self (A) does NOT appear in related", !related.find(r => r.id === aId));

    if (bRow) {
      check("B.overlap === 1", bRow.overlap === 1, `got ${bRow.overlap}`);
      check("B.sharedConcepts has 1 entry", bRow.sharedConcepts.length === 1, `got ${bRow.sharedConcepts.length}`);
      check("B.sharedConcepts[0] is the shared label", bRow.sharedConcepts[0] === sharedLabel, `got ${bRow.sharedConcepts[0]}`);
      check("B.title is 'Doc B'", bRow.title === "Doc B", `got ${bRow.title}`);
      check("B.isDraft is boolean", typeof bRow.isDraft === "boolean", `got ${typeof bRow.isDraft}`);
      check("B.isRestricted is boolean", typeof bRow.isRestricted === "boolean", `got ${typeof bRow.isRestricted}`);
      check("B.sharedWithCount is number", typeof bRow.sharedWithCount === "number", `got ${typeof bRow.sharedWithCount}`);
    }

    // 4) Stranger access — must 403
    const strangerRes = await fetch(`${baseUrl}/api/docs/${aId}/related?limit=5`, {
      headers: { "x-user-id": STRANGER_USER_ID },
    });
    check("stranger GET responds 403", strangerRes.status === 403, `got ${strangerRes.status}`);

    // 5) Unauthenticated — must 401 (no user_id at all)
    const anonRes = await fetch(`${baseUrl}/api/docs/${aId}/related?limit=5`);
    check("anonymous GET responds 401", anonRes.status === 401, `got ${anonRes.status}`);
  } finally {
    // Cleanup
    await supabase.from("concept_index").delete().eq("user_id", TEST_USER_ID).in("normalized_label", [sharedLabel.toLowerCase(), onlyALabel.toLowerCase()]);
    await supabase.from("documents").delete().in("id", [aId, bId, cId]);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();

export {};
