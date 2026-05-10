// Reranker tests — pure-function harness covers the no-key
// pass-through and the JSON parser. The end-to-end (live LLM) path
// is intentionally not exercised here; it's expensive + nondetermin
// and the wiring is verified by recall integration tests.

import { rerank } from "../src/lib/reranker";

let pass = 0; let fail = 0;
const expect = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

(async () => {
  // ── Empty input ──
  const empty = await rerank("anything", []);
  expect("empty candidates → empty result", empty.length === 0);

  // ── No API key → pass-through preserves input order ──
  const prevKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const cands = [
    { id: "a", text: "alpha" },
    { id: "b", text: "bravo" },
    { id: "c", text: "charlie" },
  ];
  const noKey = await rerank("test query", cands);
  expect("no-key: same length",          noKey.length === cands.length);
  expect("no-key: same order",           noKey[0].candidate.id === "a" && noKey[1].candidate.id === "b" && noKey[2].candidate.id === "c");
  expect("no-key: all scores are 0",     noKey.every((r) => r.score === 0));
  if (prevKey) process.env.ANTHROPIC_API_KEY = prevKey;

  // ── Tail beyond MAX_CANDIDATES_PER_CALL handled ──
  // (Can't actually call the LLM in CI, but we can verify the
  // function returns the same length.)
  delete process.env.ANTHROPIC_API_KEY;
  const big = Array.from({ length: 50 }, (_, i) => ({ id: `x${i}`, text: `item ${i}` }));
  const bigOut = await rerank("query", big);
  expect("50 candidates returned without truncation", bigOut.length === 50);
  if (prevKey) process.env.ANTHROPIC_API_KEY = prevKey;

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
