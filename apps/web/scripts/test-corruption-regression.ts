// End-to-end regression test against the live Supabase.
// Reproduces the SAMPLE_WELCOME race scenario at the API level and
// asserts the doc body is NEVER overwritten with the welcome
// template.
//
// Lifecycle:
//   1. Insert a fresh test doc with real content under the founder's
//      user_id.
//   2. Attempt to PATCH it with the SAMPLE_WELCOME body via the
//      auto-save action — what the buggy client did.
//   3. Re-fetch the doc and assert markdown still equals the
//      original real content. Anti-template guard should refuse.
//   4. Soft-delete the test doc.
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env. The dev
// server (or staging) must be reachable at MDFY_BASE_URL (default
// http://localhost:3002) for the PATCH HTTP call.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const TEST_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const REAL_BODY = `# Regression Test — Anti-Template Guard

This is real user content. The autosave race that produced the
welcome-corruption incident must not be able to clobber this body.

## Section A
Plenty of words here so the body crosses the 120-char minimum the
guard uses to distinguish "real content" from "stub/empty".

## Section B
A few more sentences. Lorem ipsum dolor sit amet, consectetur
adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
`;

const SAMPLE_WELCOME_BODY = `# Welcome to [mdfy.app](http://mdfy.app)

> **The Markdown Hub.** Collect from anywhere. Edit with AI. Publish with a permanent URL.

## Get Started

1. **Type or paste** anything — Markdown, plain text, AI output, code
2. **Import** files — PDF, Word, PowerPoint, Excel, HTML, CSV, LaTeX, and more
3. **Edit** inline in the Live view, or use Source for raw Markdown
4. **Share** with one click — generates a permanent URL like \`mdfy.app/abc123\`
`;

// Random short id so we don't collide with other test runs.
function nanoid(n = 8): string {
  const alpha = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let s = ""; for (let i = 0; i < n; i++) s += alpha[Math.floor(Math.random() * alpha.length)]; return s;
}

let pass = 0; let fail = 0;
const expect = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

(async () => {
  // 1) Seed a doc with REAL_BODY.
  const docId = `regrt-${nanoid()}`;
  const editToken = nanoid(32);
  const { error: insertErr } = await supabase.from("documents").insert({
    id: docId,
    markdown: REAL_BODY,
    title: "Regression Test — Anti-Template Guard",
    user_id: TEST_USER_ID,
    edit_token: editToken,
    edit_mode: "account",
    is_draft: true,
    source: "regression-test",
  });
  if (insertErr) { console.error("seed insert failed:", insertErr); process.exit(1); }
  console.log(`Seeded ${docId} with ${REAL_BODY.length} bytes of real content.\n`);

  try {
    // 2) Try to PATCH it with SAMPLE_WELCOME body via auto-save.
    const res = await fetch(`${baseUrl}/api/docs/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
      body: JSON.stringify({
        action: "auto-save",
        markdown: SAMPLE_WELCOME_BODY,
        title: "Welcome to [mdfy.app](http://mdfy.app)",
        userId: TEST_USER_ID,
        editToken,
      }),
    });
    const json = await res.json().catch(() => ({}));

    // The guard should produce a 409 with code "template_overwrite_blocked".
    expect("PATCH refused with 409", res.status === 409, `got ${res.status}: ${JSON.stringify(json)}`);
    expect("response carries anti-template code", json.code === "template_overwrite_blocked", `got code=${json.code}`);

    // 3) Re-fetch and assert body unchanged.
    const { data: after } = await supabase.from("documents").select("markdown, title").eq("id", docId).single();
    expect("body byte-equal to REAL_BODY", after?.markdown === REAL_BODY, `bytes after=${after?.markdown?.length}`);
    expect("title byte-equal to original", after?.title === "Regression Test — Anti-Template Guard");
    expect("body does NOT contain welcome marker", !(after?.markdown || "").includes("**The Markdown Hub.** Collect from anywhere"));

    // 4) Sanity: a normal real-content edit still goes through.
    const newBody = REAL_BODY + "\n\n## Section C\nAdded by the regression test.";
    const res2 = await fetch(`${baseUrl}/api/docs/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
      body: JSON.stringify({
        action: "auto-save",
        markdown: newBody,
        userId: TEST_USER_ID,
        editToken,
      }),
    });
    expect("normal edit succeeds (200)", res2.status === 200, `got ${res2.status}`);
    const { data: after2 } = await supabase.from("documents").select("markdown").eq("id", docId).single();
    expect("normal edit persisted", after2?.markdown === newBody);
  } finally {
    // 5) Clean up — hard delete the test row + its versions.
    await supabase.from("document_versions").delete().eq("document_id", docId);
    await supabase.from("documents").delete().eq("id", docId);
    console.log(`\nCleaned up ${docId}.`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
