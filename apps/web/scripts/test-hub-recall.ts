// End-to-end test for POST /api/hub/[slug]/recall.
//
// Validation-only tests run unconditionally (no Supabase fixtures
// needed). The happy-path test runs ONLY if a public hub exists —
// we query the profiles table for one and skip with a notice if
// none is set up. We don't seed a public hub from the test because
// that requires real OpenAI embeddings on real docs, which would
// burn API credits every CI run.
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for the lookup,
// and the dev server (or staging) reachable at MDFY_BASE_URL
// (default http://localhost:3002).

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
const skip = (label: string, reason: string) => {
  console.log("SKIP —", label, "(", reason, ")"); skipped++;
};

async function post(slug: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}/api/hub/${slug}/recall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  // ─── Validation tests (no fixture needed) ───

  // 1) GET endpoint returns example payload
  const getRes = await fetch(`${baseUrl}/api/hub/some-slug/recall`);
  const getJson = await getRes.json().catch(() => ({}));
  check("GET responds 200 with usage example",
    getRes.status === 200 && typeof getJson.message === "string" && getJson.example?.method === "POST",
    `got ${getRes.status}: ${JSON.stringify(getJson).slice(0,200)}`);

  // 2) Invalid slug → 400
  const badSlug = await post("X", { question: "hi" });
  check("invalid_slug → 400", badSlug.status === 400 && badSlug.json.error === "invalid_slug",
    `got ${badSlug.status}: ${JSON.stringify(badSlug.json)}`);

  // 3) Slug with uppercase → 400 (SLUG_RE is lowercase-only)
  const upperSlug = await post("HASCAPS", { question: "hi" });
  check("uppercase slug → 400", upperSlug.status === 400 && upperSlug.json.error === "invalid_slug");

  // 4) Missing question → 400
  const noQ = await post("valid-slug", {});
  check("missing question → 400", noQ.status === 400 && noQ.json.error === "question_required",
    `got ${noQ.status}: ${JSON.stringify(noQ.json)}`);

  // 5) Empty question → 400
  const emptyQ = await post("valid-slug", { question: "   " });
  check("empty question → 400", emptyQ.status === 400 && emptyQ.json.error === "question_required");

  // 6) Question too long → 400
  const longQ = await post("valid-slug", { question: "x".repeat(2001) });
  check("question > 2000 chars → 400", longQ.status === 400 && longQ.json.error === "question_too_long",
    `got ${longQ.status}: ${JSON.stringify(longQ.json)}`);

  // 7) Invalid JSON body → 400 (sent raw)
  const rawRes = await fetch(`${baseUrl}/api/hub/valid-slug/recall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json {{",
  });
  const rawJson = await rawRes.json().catch(() => ({}));
  check("invalid JSON body → 400", rawRes.status === 400 && (rawJson as { error?: string }).error === "invalid_json",
    `got ${rawRes.status}`);

  // 8) Unknown hub → 404
  const unknownHub = await post("nonexistent-hub-xyz-test", { question: "hi" });
  check("unknown hub → 404", unknownHub.status === 404 && unknownHub.json.error === "hub_not_public",
    `got ${unknownHub.status}: ${JSON.stringify(unknownHub.json)}`);

  // ─── Happy path (only if a public hub exists with at least one indexed doc) ───

  const { data: publicHub } = await supabase
    .from("profiles")
    .select("hub_slug")
    .eq("hub_public", true)
    .not("hub_slug", "is", null)
    .limit(1)
    .single();

  if (!publicHub?.hub_slug) {
    skip("happy-path query against public hub", "no public hub exists in this database");
  } else {
    const slug = publicHub.hub_slug;

    // 9) Doc-level retrieval (default)
    const docLevel = await post(slug, { question: "what is this about", k: 3 });
    check(`doc-level recall (${slug}) responds 200`, docLevel.status === 200,
      `got ${docLevel.status}: ${JSON.stringify(docLevel.json).slice(0,300)}`);
    check("response has hub.slug",
      ((docLevel.json.hub as { slug?: string } | undefined)?.slug) === slug);
    check("response has results array", Array.isArray(docLevel.json.results));
    check("meta.retrieval === 'vector' (no hybrid)",
      ((docLevel.json.meta as { retrieval?: string } | undefined)?.retrieval) === "vector");
    check("meta.k === 3",
      ((docLevel.json.meta as { k?: number } | undefined)?.k) === 3);
    check("meta.reranked === false (no rerank flag)",
      ((docLevel.json.meta as { reranked?: boolean } | undefined)?.reranked) === false);

    const timing = (docLevel.json.meta as { timing_ms?: { embed?: number; search?: number; rerank?: number; total?: number } } | undefined)?.timing_ms;
    check("meta.timing_ms has embed/search/rerank/total numbers",
      !!timing && [timing.embed, timing.search, timing.rerank, timing.total].every(v => typeof v === "number"),
      `got ${JSON.stringify(timing)}`);
    check("meta.timing_ms.total ≥ embed + search (sanity)",
      !!timing && typeof timing.total === "number" && typeof timing.embed === "number" && typeof timing.search === "number"
        && timing.total >= (timing.embed + timing.search) - 5, // 5ms slack for jitter
      `total=${timing?.total} embed=${timing?.embed} search=${timing?.search}`);

    // 10) k is clamped to [1, 20]
    const overK = await post(slug, { question: "test", k: 999 });
    check("k clamped to MAX_K (20)",
      overK.status === 200 && ((overK.json.meta as { k?: number } | undefined)?.k) === 20,
      `got ${((overK.json.meta as { k?: number } | undefined)?.k)}`);

    const negativeK = await post(slug, { question: "test", k: 0 });
    check("k floored to 1",
      negativeK.status === 200 && ((negativeK.json.meta as { k?: number } | undefined)?.k) === 1);

    // 11) Hybrid only applies at chunk level
    const docHybrid = await post(slug, { question: "test", k: 3, level: "doc", hybrid: true });
    check("hybrid:true at doc level → meta.hybrid === false (silently ignored)",
      docHybrid.status === 200 && ((docHybrid.json.meta as { hybrid?: boolean } | undefined)?.hybrid) === false);

    // 12) Rerank flag bubbles to meta.reranked when ANTHROPIC_API_KEY exists AND we have >1 result
    const reranked = await post(slug, { question: "test", k: 3, rerank: true });
    const r = (reranked.json.results as unknown[] | undefined) || [];
    if (process.env.ANTHROPIC_API_KEY && r.length > 1) {
      check("rerank:true + results > 1 + ANTHROPIC_API_KEY set → meta.reranked === true",
        ((reranked.json.meta as { reranked?: boolean } | undefined)?.reranked) === true,
        `got reranked=${((reranked.json.meta as { reranked?: boolean } | undefined)?.reranked)}`);
    } else {
      skip("rerank true-path",
        process.env.ANTHROPIC_API_KEY ? "hub has ≤1 public doc — can't reorder a singleton" : "ANTHROPIC_API_KEY not set");
    }
  }

  console.log(`\n${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped` : ""}`);
  if (fail > 0) process.exit(1);
})();

export {};
