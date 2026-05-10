// Live regression test for POST /api/import/url.
//
// Auth gate + validation + happy path against a stable page
// (example.com — RFC-reserved, minimal HTML, never changes shape).
// Idempotency: re-POSTing the same URL must dedup rather than
// create a second copy.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const TEST_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";
const TARGET = process.env.MDFY_URL_TEST_TARGET || "https://example.com/";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0; let fail = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

async function call(payload: Record<string, unknown>, headers: Record<string, string> = {}): Promise<{ status: number; json: { imported?: number; deduplicated?: number; docs?: Array<{ id: string; host?: string; url?: string; deduplicated?: boolean }>; error?: string } }> {
  const res = await fetch(`${baseUrl}/api/import/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID, ...headers },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  const created: string[] = [];
  try {
    // Auth gate
    const noAuthRes = await fetch(`${baseUrl}/api/import/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: TARGET }),
    });
    check("no auth → 401", noAuthRes.status === 401, `got ${noAuthRes.status}`);

    // Validation
    const noUrl = await call({});
    check("missing url → 400", noUrl.status === 400);

    const notHttp = await call({ url: "ftp://example.com/" });
    check("non-http(s) → 400", notHttp.status === 400);

    const localhost = await call({ url: "http://localhost:8080/" });
    check("localhost host → 400", localhost.status === 400);

    const privateIp = await call({ url: "http://192.168.1.1/" });
    check("private IP → 400", privateIp.status === 400);

    // Happy path
    const first = await call({ url: TARGET });
    check("first import 200", first.status === 200, `got ${first.status}: ${JSON.stringify(first.json).slice(0,200)}`);
    check("imported + deduplicated >= 1", ((first.json.imported ?? 0) + (first.json.deduplicated ?? 0)) >= 1);
    const firstDoc = first.json.docs?.[0];
    if (firstDoc) {
      if (!firstDoc.deduplicated && firstDoc.id) created.push(firstDoc.id);
      const { data: row } = await supabase.from("documents").select("source, compile_from, is_draft").eq("id", firstDoc.id).single();
      check("source starts with 'url:'", String(row?.source || "").startsWith("url:"), `got ${row?.source}`);
      check("compile_from.external.provider === 'url'",
        (row?.compile_from as { external?: { provider?: string } } | null)?.external?.provider === "url");
      check("doc is_draft === true", row?.is_draft === true);
    }

    // Idempotency
    const second = await call({ url: TARGET });
    check("second import 200", second.status === 200);
    check("second deduplicated >= 1", (second.json.deduplicated ?? 0) >= 1);
    check("second imported === 0", (second.json.imported ?? 0) === 0);
  } finally {
    if (created.length > 0) {
      await supabase.from("documents").delete().in("id", created);
      console.log(`\nCleaned up ${created.length} test doc${created.length === 1 ? "" : "s"}.`);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();

export {};
