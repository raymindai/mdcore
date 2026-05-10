// Unit + validation tests for the Notion import surface.
//
// The full happy path needs a live Notion integration token + a page
// the token has access to — that's user-side config, not something
// CI can supply. We assert:
//   - parseNotionPageId handles the canonical URL/UUID shapes
//   - /api/import/notion validates inputs (auth, token, pageId)
//
// The happy path (real Notion fetch) runs only when MDFY_NOTION_TEST_TOKEN
// + MDFY_NOTION_TEST_PAGE_URL are set in env.

import { parseNotionPageId } from "../src/lib/notion-import";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const TEST_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0; let fail = 0; let skipped = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};
const skip = (label: string, reason: string) => { console.log("SKIP —", label, "(", reason, ")"); skipped++; };

(async () => {
  // ─── parseNotionPageId ───
  check(
    "hyphenated UUID passes through",
    parseNotionPageId("abcdef01-2345-6789-abcd-ef0123456789") === "abcdef01-2345-6789-abcd-ef0123456789",
  );
  check(
    "bare 32-char id → hyphenated UUID",
    parseNotionPageId("abcdef0123456789abcdef0123456789") === "abcdef01-2345-6789-abcd-ef0123456789",
  );
  check(
    "URL with hyphenated id parses",
    parseNotionPageId("https://www.notion.so/My-Page-abcdef01-2345-6789-abcd-ef0123456789") === "abcdef01-2345-6789-abcd-ef0123456789",
  );
  check(
    "URL with bare-32 id parses",
    parseNotionPageId("https://www.notion.so/My-Page-abcdef0123456789abcdef0123456789") === "abcdef01-2345-6789-abcd-ef0123456789",
  );
  check("empty input → null", parseNotionPageId("") === null);
  check("non-id URL → null", parseNotionPageId("https://example.com/foo") === null);

  // ─── /api/import/notion validation ───
  const noAuth = await fetch(`${baseUrl}/api/import/notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "secret_xxx", pageUrl: "https://www.notion.so/Some-abcdef0123456789abcdef0123456789" }),
  });
  check("no auth → 401", noAuth.status === 401, `got ${noAuth.status}`);

  const noToken = await fetch(`${baseUrl}/api/import/notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
    body: JSON.stringify({ pageUrl: "abc" }),
  });
  check("missing token → 400", noToken.status === 400);

  const noPage = await fetch(`${baseUrl}/api/import/notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
    body: JSON.stringify({ token: "secret_test" }),
  });
  check("missing pageUrl/pageId → 400", noPage.status === 400);

  const badPage = await fetch(`${baseUrl}/api/import/notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
    body: JSON.stringify({ token: "secret_test", pageUrl: "https://example.com/not-a-notion-url" }),
  });
  check("unparseable page input → 400", badPage.status === 400);

  // Bad token shape but valid-looking pageId → Notion API will 401.
  // We just verify we proxy the upstream status sensibly.
  const badToken = await fetch(`${baseUrl}/api/import/notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
    body: JSON.stringify({
      token: "secret_definitely-not-a-real-token",
      pageUrl: "https://www.notion.so/Page-abcdef0123456789abcdef0123456789",
    }),
  });
  check("upstream auth failure → 4xx (not 500)", badToken.status >= 400 && badToken.status < 500, `got ${badToken.status}`);

  // ─── Live happy path (only if user provided creds) ───
  const liveToken = process.env.MDFY_NOTION_TEST_TOKEN;
  const livePage = process.env.MDFY_NOTION_TEST_PAGE_URL;
  if (!liveToken || !livePage) {
    skip("happy-path Notion fetch", "MDFY_NOTION_TEST_TOKEN or MDFY_NOTION_TEST_PAGE_URL not set");
  } else {
    const created: string[] = [];
    try {
      const first = await fetch(`${baseUrl}/api/import/notion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
        body: JSON.stringify({ token: liveToken, pageUrl: livePage }),
      });
      const firstJson = await first.json().catch(() => ({}));
      check("happy-path responds 200", first.status === 200, `got ${first.status}: ${JSON.stringify(firstJson).slice(0, 200)}`);
      check(
        "imported + deduplicated >= 1",
        ((firstJson.imported ?? 0) + (firstJson.deduplicated ?? 0)) >= 1,
        `imp=${firstJson.imported} dedup=${firstJson.deduplicated}`,
      );
      for (const d of (firstJson.docs || []) as Array<{ id: string; deduplicated?: boolean }>) {
        if (!d.deduplicated && d.id) created.push(d.id);
      }

      // Idempotency
      const second = await fetch(`${baseUrl}/api/import/notion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": TEST_USER_ID },
        body: JSON.stringify({ token: liveToken, pageUrl: livePage }),
      });
      const secondJson = await second.json().catch(() => ({}));
      check("second import deduplicated >= 1", (secondJson.deduplicated ?? 0) >= 1);
      check("second import imported === 0", (secondJson.imported ?? 0) === 0);
    } finally {
      if (created.length > 0) {
        await supabase.from("documents").delete().in("id", created);
        console.log(`\nCleaned up ${created.length} test doc${created.length === 1 ? "" : "s"}.`);
      }
    }
  }

  console.log(`\n${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped` : ""}`);
  if (fail > 0) process.exit(1);
})();

export {};
