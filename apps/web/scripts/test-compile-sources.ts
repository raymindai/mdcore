// Pure-function tests for the compile_from sources helper.
// Verifies: legacy single-source row reads identically to new array
// shape, append dedupes by bundleId, current source is the last
// element.

import { readCompileSources, appendCompileSource, currentCompileSource } from "../src/lib/compile-sources";

let pass = 0; let fail = 0;
const expect = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

// ── Reads — legacy + new + null ───────────────────────────────────
const legacy = { bundleId: "bA", docIds: ["d1", "d2"], intent: "compare" };
const legacyRead = readCompileSources(legacy, "2026-05-01T00:00:00Z");
expect("legacy → 1-element array",   legacyRead.length === 1);
expect("legacy bundleId preserved",  legacyRead[0].bundleId === "bA");
expect("legacy docIds preserved",    JSON.stringify(legacyRead[0].docIds) === JSON.stringify(["d1", "d2"]));
expect("legacy intent preserved",    legacyRead[0].intent === "compare");
expect("legacy compiledAt fallback", legacyRead[0].compiledAt === "2026-05-01T00:00:00Z");

const newer = {
  sources: [
    { bundleId: "bA", docIds: ["d1"], intent: null, compiledAt: "2026-05-01T00:00:00Z" },
    { bundleId: "bB", docIds: ["d2", "d3"], intent: "merge", compiledAt: "2026-05-05T00:00:00Z" },
  ],
};
const newerRead = readCompileSources(newer);
expect("new shape → 2-element array",     newerRead.length === 2);
expect("new shape order preserved",       newerRead[0].bundleId === "bA" && newerRead[1].bundleId === "bB");

expect("null → empty array",              readCompileSources(null).length === 0);
expect("undefined → empty array",         readCompileSources(undefined).length === 0);
expect("legacy without bundleId → empty", readCompileSources({ docIds: ["x"] } as never).length === 0);

// ── Append — append + dedupe by bundleId ──────────────────────────
const appended = appendCompileSource(legacy, {
  bundleId: "bB",
  docIds: ["d2"],
  intent: null,
  compiledAt: "2026-05-10T00:00:00Z",
}, "2026-05-01T00:00:00Z");
expect("append onto legacy gives 2 sources", appended.sources.length === 2);
expect("append preserves first as bA",       appended.sources[0].bundleId === "bA");
expect("append puts new one last",           appended.sources[1].bundleId === "bB");

const refreshed = appendCompileSource(appended, {
  bundleId: "bA",
  docIds: ["d1", "dX"],
  intent: "refreshed",
  compiledAt: "2026-05-20T00:00:00Z",
});
expect("re-appending bA dedupes",            refreshed.sources.length === 2);
expect("re-appended bA moved to last",       refreshed.sources[1].bundleId === "bA");
expect("re-appended bA carries new docIds",  JSON.stringify(refreshed.sources[1].docIds) === JSON.stringify(["d1", "dX"]));
expect("earlier bB stays in array",          refreshed.sources[0].bundleId === "bB");

// ── currentCompileSource — last element ───────────────────────────
expect("current of legacy = bA",       currentCompileSource(legacy)?.bundleId === "bA");
expect("current of newer = bB",        currentCompileSource(newer)?.bundleId === "bB");
expect("current of refreshed = bA",    currentCompileSource(refreshed)?.bundleId === "bA");
expect("current of null is null",      currentCompileSource(null) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
