import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: profile } = await s.from("profiles").select("id, hub_slug").eq("hub_slug","yc-demo").single();
const userId = profile.id;

const sourceA = "ycxr1" + Math.random().toString(36).slice(2, 6);
const sourceB = "ycxr2" + Math.random().toString(36).slice(2, 6);
const targetDoc = "ycxr3" + Math.random().toString(36).slice(2, 6);
const tok = (n) => "et_" + Math.random().toString(36).slice(2, 2 + n);

// Create a target doc + two sources that link to it.
const { error: e1 } = await s.from("documents").insert([
  { id: targetDoc, user_id: userId, title: "X-ref test target (delete me)",
    markdown: "# I am the target\n\nNothing links from me.\n",
    is_draft: false, edit_token: tok(16) },
  { id: sourceA, user_id: userId, title: "X-ref source A (delete me)",
    markdown: `# Source A\n\nAlso see [the target](/${targetDoc}).\n`,
    is_draft: false, edit_token: tok(16) },
  { id: sourceB, user_id: userId, title: "X-ref source B (delete me)",
    markdown: `# Source B\n\nReferring to ${targetDoc} via https://staging.mdfy.app/${targetDoc} as well.\n`,
    is_draft: false, edit_token: tok(16) },
]);
if (e1) { console.error("seed insert failed", e1); process.exit(1); }

// Wait for the route's revalidation cache to bust if needed by hitting fresh.
const r = await fetch("http://localhost:3002/api/social/cross-refs", { cache: "no-store" });
const json = await r.json();
const docHit = json.docs.find(d => d.id === targetDoc);

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log("✓", name); }
  else { fail++; console.log("✗", name, detail || ""); }
}

check("api responded 200", r.status === 200);
check("target doc surfaced in /api/social/cross-refs", !!docHit);
if (docHit) {
  check("citation count >= 2", docHit.citationCount >= 2, `got ${docHit.citationCount}`);
  check("attributed to yc-demo hub", docHit.hub_slug === "yc-demo");
}
check("totals.sources includes seeded docs", json.totals.sources >= 3, `got ${json.totals.sources}`);

// Cleanup.
await s.from("documents").delete().in("id", [sourceA, sourceB, targetDoc]);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
