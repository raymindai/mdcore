// PATCH /api/docs/{id} { intent } round-trip test.
//
// Seeds a doc, sets intent to each allowed value, asserts GET reads
// it back. Then sets an invalid value (server should silently ignore)
// and clears via null. Cleans up.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const TEST_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";

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

async function patch(docId: string, body: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${baseUrl}/api/docs/${docId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
    body: JSON.stringify({ ...body, userId: TEST_USER_ID }),
  });
  return res.status;
}

async function getIntent(docId: string): Promise<string | null> {
  const { data } = await supabase.from("documents").select("intent").eq("id", docId).single();
  return (data?.intent as string | null) || null;
}

(async () => {
  const docId = `intent-${nanoid()}`;
  const editToken = nanoid(32);
  const body = `# Intent Test Doc

This is real content. Has some prose to clear the anti-template gate and
exceed the minimum length the dedup contract expects. Lorem ipsum dolor
sit amet, consectetur adipiscing elit, sed do eiusmod tempor.`;

  const { error: insertErr } = await supabase.from("documents").insert({
    id: docId, markdown: body, title: "Intent Test Doc",
    user_id: TEST_USER_ID, edit_token: editToken, edit_mode: "account",
    is_draft: true, source: "intent-test",
  });
  if (insertErr) { console.error("seed insert failed:", insertErr); process.exit(1); }

  try {
    const ALLOWED = ["note", "definition", "comparison", "decision", "question", "reference"] as const;
    for (const v of ALLOWED) {
      const status = await patch(docId, { editToken, markdown: body, intent: v });
      check(`PATCH intent=${v} → 200`, status === 200, `got ${status}`);
      const read = await getIntent(docId);
      check(`DB row intent === ${v}`, read === v, `got ${read}`);
    }

    // Invalid value: server should ignore (not 400). The existing intent
    // stays unchanged.
    const before = await getIntent(docId);
    const badStatus = await patch(docId, { editToken, markdown: body, intent: "junk-value-not-allowed" });
    check(`PATCH intent=junk-value → 200 (silently ignored)`, badStatus === 200);
    const after = await getIntent(docId);
    check("intent unchanged after invalid PATCH", after === before, `before=${before} after=${after}`);

    // Clear via null
    const clearStatus = await patch(docId, { editToken, markdown: body, intent: null });
    check("PATCH intent=null → 200", clearStatus === 200);
    const cleared = await getIntent(docId);
    check("intent is now null", cleared === null, `got ${cleared}`);

    // Verify GET /api/docs/{id} surfaces intent
    await patch(docId, { editToken, markdown: body, intent: "comparison" });
    const getRes = await fetch(`${baseUrl}/api/docs/${docId}`, {
      headers: { "x-user-id": TEST_USER_ID },
    });
    const getJson = await getRes.json().catch(() => ({}));
    check("GET response includes intent === 'comparison'", getJson.intent === "comparison", `got ${getJson.intent}`);
  } finally {
    await supabase.from("documents").delete().eq("id", docId);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();

export {};
