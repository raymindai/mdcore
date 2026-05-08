// Unit tests for the cross-reference extractor.
// Run via: npx tsx scripts/test-cross-refs.ts

import { extractCrossRefs, rankCitations } from "../src/lib/cross-refs";

let passed = 0;
let failed = 0;

function assert(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}` + (detail ? ` — ${detail}` : ""));
  }
}

console.log("\nbasic doc/bundle/hub link extraction");
{
  const sources = [
    {
      id: "ycdAAAAA",
      user_id: "u1",
      markdown: "See [my note](https://mdfy.app/ycdBBBBB) and [bundle](https://mdfy.app/b/ycb12345). Also [hub](https://mdfy.app/hub/yc-demo).",
    },
  ];
  const known = {
    docs: new Set(["ycdAAAAA", "ycdBBBBB"]),
    bundles: new Set(["ycb12345"]),
    hubs: new Set(["yc-demo"]),
  };
  const r = extractCrossRefs(sources, known.docs, known.bundles, known.hubs);
  assert("doc citation found", r.docCitations.get("ycdBBBBB")?.has("ycdAAAAA") === true);
  assert("bundle citation found", r.bundleCitations.get("ycb12345")?.has("ycdAAAAA") === true);
  assert("hub citation found", r.hubCitations.get("yc-demo")?.has("ycdAAAAA") === true);
  assert("self-reference excluded", !r.docCitations.has("ycdAAAAA"));
}

console.log("\nstaging.mdfy.app host accepted");
{
  const sources = [{
    id: "ycdsourc",
    user_id: "u1",
    markdown: "Staging link https://staging.mdfy.app/ycdtarge1 and bare /ycdtarge2 too.",
  }];
  const known = {
    docs: new Set(["ycdsourc", "ycdtarge1", "ycdtarge2"]),
    bundles: new Set<string>(),
    hubs: new Set<string>(),
  };
  const r = extractCrossRefs(sources, known.docs, known.bundles, known.hubs);
  assert("staging URL counted", r.docCitations.get("ycdtarge1")?.has("ycdsourc") === true);
  assert("bare /id URL counted", r.docCitations.get("ycdtarge2")?.has("ycdsourc") === true);
}

console.log("\nbundle URL doesn't double-count as doc");
{
  const sources = [{
    id: "ycdsourc",
    user_id: "u1",
    markdown: "Bundle: /b/abc12345",
  }];
  const known = {
    docs: new Set(["ycdsourc", "abc12345"]),
    bundles: new Set(["abc12345"]),
    hubs: new Set<string>(),
  };
  const r = extractCrossRefs(sources, known.docs, known.bundles, known.hubs);
  assert("bundle id counted as bundle", r.bundleCitations.get("abc12345")?.has("ycdsourc") === true);
  assert("bundle id NOT counted as doc", !r.docCitations.has("abc12345"));
}

console.log("\nunknown targets dropped");
{
  const sources = [{
    id: "ycdsourc",
    user_id: "u1",
    markdown: "Refs: /ycdghost9 /b/ghostbun /hub/ghost-hub /ycdrealxx",
  }];
  const known = {
    docs: new Set(["ycdsourc", "ycdrealxx"]),
    bundles: new Set<string>(),
    hubs: new Set<string>(),
  };
  const r = extractCrossRefs(sources, known.docs, known.bundles, known.hubs);
  assert("known target counted", r.docCitations.get("ycdrealxx")?.has("ycdsourc") === true);
  assert("unknown doc id dropped", !r.docCitations.has("ycdghost9"));
  assert("unknown bundle dropped", !r.bundleCitations.has("ghostbun"));
  assert("unknown hub dropped", !r.hubCitations.has("ghost-hub"));
}

console.log("\nmultiple sources roll up by unique source");
{
  const sources = [
    { id: "src01", user_id: "u1", markdown: "Read /ycdtarget twice: /ycdtarget" },
    { id: "src02", user_id: "u1", markdown: "Also /ycdtarget" },
    { id: "src03", user_id: "u1", markdown: "no relevant link" },
  ];
  const known = {
    docs: new Set(["src01", "src02", "src03", "ycdtarget"]),
    bundles: new Set<string>(),
    hubs: new Set<string>(),
  };
  const r = extractCrossRefs(sources, known.docs, known.bundles, known.hubs);
  const set = r.docCitations.get("ycdtarget");
  assert("two unique sources counted", set?.size === 2);
  assert("set members are correct", set?.has("src01") === true && set?.has("src02") === true);
  const ranked = rankCitations(r.docCitations, 5);
  assert("rankCitations sorted by count", ranked[0].targetId === "ycdtarget" && ranked[0].citationCount === 2);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
