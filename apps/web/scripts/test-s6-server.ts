// E2E checks for the server-side parts of S6:
//   S6.1 — allowed_editors actually grants edit on PATCH
//   S6.3 — auto-synthesis dup-lock no longer 500s on race
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + a running dev
// server at MDFY_BASE_URL.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const OWNER_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";
const OWNER_EMAIL = process.env.MDFY_TEST_OWNER_EMAIL || "owner@example.com";
const EDITOR_EMAIL = "tester+s6-editor@mdfy.app";
const STRANGER_EMAIL = "tester+s6-stranger@mdfy.app";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const REAL_BODY = `# S6 Editor Permission Test\n\nThis body crosses the 120-char floor the anti-template guard cares about. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;

function nano(n = 8) {
  const a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let s = ""; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s;
}

let pass = 0; let fail = 0;
const expect = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

(async () => {
  // ── S6.1 — allowed_editors PATCH gating ────────────────────────
  console.log("\n[S6.1] allowed_editors gating");
  const docId = `s6e-${nano()}`;
  const editToken = nano(32);
  await supabase.from("documents").insert({
    id: docId,
    markdown: REAL_BODY,
    title: "S6 Editor Permission Test",
    user_id: OWNER_USER_ID,
    edit_token: editToken,
    edit_mode: "owner",
    is_draft: false,
    allowed_emails: [EDITOR_EMAIL],
    allowed_editors: [EDITOR_EMAIL],
  });

  try {
    // (a) Stranger email — should be refused.
    const strangerRes = await fetch(`${baseUrl}/api/docs/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-email": STRANGER_EMAIL },
      body: JSON.stringify({
        action: "auto-save",
        markdown: REAL_BODY + "\n\nstranger edit",
        userEmail: STRANGER_EMAIL,
      }),
    });
    expect("(a) stranger email refused (403)", strangerRes.status === 403, `got ${strangerRes.status}`);

    // (b) Editor email — should succeed.
    const editorRes = await fetch(`${baseUrl}/api/docs/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-email": EDITOR_EMAIL },
      body: JSON.stringify({
        action: "auto-save",
        markdown: REAL_BODY + "\n\nallowed-editor wrote this",
        userEmail: EDITOR_EMAIL,
      }),
    });
    expect("(b) allowed_editors email accepted (200)", editorRes.status === 200, `got ${editorRes.status}`);
    const { data: after } = await supabase.from("documents").select("markdown").eq("id", docId).single();
    expect("(b) editor's body persisted", (after?.markdown || "").includes("allowed-editor wrote this"));

    // (c) After demotion (remove from allowed_editors), edit should be refused.
    await supabase.from("documents").update({ allowed_editors: [] }).eq("id", docId);
    const demotedRes = await fetch(`${baseUrl}/api/docs/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-email": EDITOR_EMAIL },
      body: JSON.stringify({
        action: "auto-save",
        markdown: REAL_BODY + "\n\nshould-not-stick",
        userEmail: EDITOR_EMAIL,
      }),
    });
    expect("(c) demoted editor refused (403)", demotedRes.status === 403, `got ${demotedRes.status}`);
  } finally {
    await supabase.from("document_versions").delete().eq("document_id", docId);
    await supabase.from("documents").delete().eq("id", docId);
  }

  // ── S6.3 — dup-lock idempotency ────────────────────────────────
  console.log("\n[S6.3] documents_owner_strict_dup_lock idempotency");
  const synthId1 = `s6s-${nano()}`;
  const SYN_TITLE = `S6 dup-lock test ${nano(4)}`;
  const SYN_BODY = `# ${SYN_TITLE}\n\nSynthesised body, plenty of bytes to clear the floor.`;
  await supabase.from("documents").insert({
    id: synthId1,
    markdown: SYN_BODY,
    title: SYN_TITLE,
    user_id: OWNER_USER_ID,
    edit_token: nano(32),
    edit_mode: "account",
    is_draft: false,
    source: "auto-synthesis",
    compile_kind: "wiki",
  });
  // Try to insert a second row with byte-identical (user_id, title, md5(markdown)) — UNIQUE should refuse.
  const synthId2 = `s6s-${nano()}`;
  const { error: dupErr } = await supabase.from("documents").insert({
    id: synthId2,
    markdown: SYN_BODY,
    title: SYN_TITLE,
    user_id: OWNER_USER_ID,
    edit_token: nano(32),
    edit_mode: "account",
    is_draft: false,
    source: "auto-synthesis",
    compile_kind: "wiki",
  });
  expect("(a) DB UNIQUE blocks identical second insert", !!dupErr && dupErr.code === "23505" && (dupErr.message || "").includes("documents_owner_strict_dup_lock"));

  // Verify isStrictDupLockError helper recognises the shape.
  const { isStrictDupLockError } = await import("../src/lib/doc-dedup");
  expect("(b) isStrictDupLockError matches the error", isStrictDupLockError(dupErr));

  // Verify findRecentDuplicateDoc returns the surviving canonical row.
  const { findRecentDuplicateDoc } = await import("../src/lib/doc-dedup");
  const survivor = await findRecentDuplicateDoc(supabase, { userId: OWNER_USER_ID }, SYN_BODY, SYN_TITLE);
  expect("(c) findRecentDuplicateDoc surfaces canonical id", survivor?.id === synthId1, `got ${survivor?.id}`);

  await supabase.from("documents").delete().eq("id", synthId1);
  await supabase.from("documents").delete().eq("id", synthId2);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
