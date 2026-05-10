// Smoke test for /hub/[slug]/{index.md,log.md,SCHEMA.md}.
//
// Picks any existing public hub from `profiles` and asserts each
// manifest URL returns 200 with sensible markdown. Skips with a
// notice when no public hub exists (so CI on an empty DB doesn't
// fail for the wrong reason).
//
// Also asserts the unhappy paths: invalid slug → 400, missing hub
// → 404. Those run unconditionally.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0; let fail = 0; let skipped = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};
const skip = (label: string, reason: string) => { console.log("SKIP —", label, "(", reason, ")"); skipped++; };

async function fetchManifest(slug: string, file: string): Promise<{ status: number; body: string; ct: string | null; cache: string | null; tokenHdr: string | null }> {
  const res = await fetch(`${baseUrl}/hub/${slug}/${file}`);
  const body = await res.text();
  return {
    status: res.status,
    body,
    ct: res.headers.get("content-type"),
    cache: res.headers.get("cache-control"),
    tokenHdr: res.headers.get("x-token-estimate"),
  };
}

(async () => {
  // ─── Unhappy paths (no fixture) ───
  const badSlug = await fetchManifest("X", "index.md");
  check("invalid slug → 400 on index.md", badSlug.status === 400);

  const missing = await fetchManifest("nonexistent-hub-xyz-test", "index.md");
  check("unknown hub → 404 on index.md", missing.status === 404);

  const badSchema = await fetchManifest("X", "SCHEMA.md");
  check("invalid slug → 400 on SCHEMA.md", badSchema.status === 400);

  const badLog = await fetchManifest("X", "log.md");
  check("invalid slug → 400 on log.md", badLog.status === 400);

  // ─── Happy path ───
  const { data: publicHub } = await supabase
    .from("profiles")
    .select("hub_slug, display_name")
    .eq("hub_public", true)
    .not("hub_slug", "is", null)
    .limit(1)
    .single();

  if (!publicHub?.hub_slug) {
    skip("manifest content checks", "no public hub exists in this database");
  } else {
    const slug = publicHub.hub_slug;

    for (const file of ["index.md", "SCHEMA.md", "log.md"]) {
      const r = await fetchManifest(slug, file);
      check(`${file} responds 200`, r.status === 200, `got ${r.status}`);
      check(`${file} content-type is text/markdown`, (r.ct || "").startsWith("text/markdown"), `got ${r.ct}`);
      check(`${file} body is non-empty`, r.body.length > 0);
      check(`${file} starts with a # heading`, /^#\s/.test(r.body), `prefix: ${r.body.slice(0, 80)}`);
      check(`${file} carries X-Token-Estimate header`, !!r.tokenHdr && /^\d+$/.test(r.tokenHdr));
      check(`${file} has Cache-Control`, !!r.cache && r.cache.includes("max-age"));
    }

    // Cross-link sanity — each manifest mentions the other two.
    const index = await fetchManifest(slug, "index.md");
    check("index.md links to SCHEMA.md", index.body.includes("/SCHEMA.md"));
    check("index.md links to log.md", index.body.includes("/log.md"));
    check("index.md links to llms.txt", index.body.includes("/llms.txt"));

    const schema = await fetchManifest(slug, "SCHEMA.md");
    check("SCHEMA.md describes the recall endpoint", schema.body.includes("/api/hub/") && schema.body.includes("/recall"));
    check("SCHEMA.md mentions ?compact", schema.body.includes("?compact"));
  }

  console.log(`\n${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped` : ""}`);
  if (fail > 0) process.exit(1);
})();

export {};
