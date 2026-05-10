// Pure-function tests for the title invariant — non-mutating
// enforceTitleInvariant + spliceH1 round-trip + extractTitleFromMd.

import { extractTitleFromMd, enforceTitleInvariant, spliceH1 } from "../src/lib/extract-title";

let pass = 0; let fail = 0;
const expect = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

// extractTitleFromMd
expect("H1 present → returns its text",        extractTitleFromMd("# Hello world\n\nbody") === "Hello world");
expect("H1 with trailing whitespace trimmed",   extractTitleFromMd("#   Spaced   \n\nbody") === "Spaced");
expect("no H1 → 'Untitled'",                    extractTitleFromMd("just body, no heading") === "Untitled");
expect("empty markdown → 'Untitled'",           extractTitleFromMd("") === "Untitled");
expect("H1 not at top still picked up",         extractTitleFromMd("para\n\n# Mid\n\nrest") === "Mid");
expect("H2 alone is NOT a title",               extractTitleFromMd("## Subhead\n\nbody") === "Untitled");

// enforceTitleInvariant — MUST be non-mutating
const realBody = "# Real Title\n\nBody.\n\nMore body.";
const r1 = enforceTitleInvariant(realBody, "ignored hint");
expect("body with H1: markdown unchanged",     r1.markdown === realBody);
expect("body with H1: title from H1",          r1.title === "Real Title");

const noH1 = "Body without any heading.";
const r2 = enforceTitleInvariant(noH1, "Hint Ignored");
expect("body without H1: markdown unchanged",  r2.markdown === noH1);
expect("body without H1: title 'Untitled'",    r2.title === "Untitled");

const r3 = enforceTitleInvariant("", "Hint Ignored");
expect("empty body: markdown stays empty",     r3.markdown === "");
expect("empty body: title 'Untitled'",         r3.title === "Untitled");

// spliceH1 — replaces existing H1 in place
const sp1 = spliceH1("# Old name\n\nBody", "New name");
expect("spliceH1 replaces H1 line",            sp1 === "# New name\n\nBody");
expect("spliceH1 H1 round-trip",               extractTitleFromMd(sp1) === "New name");

const sp2 = spliceH1("Body without H1", "First");
expect("spliceH1 prepends when no H1",         sp2.startsWith("# First\n\n"));
expect("spliceH1 prepended title round-trip",  extractTitleFromMd(sp2) === "First");

const sp3 = spliceH1("", "Brand New");
expect("spliceH1 empty body becomes # Brand New\\n", sp3 === "# Brand New\n");

// Property: enforceTitleInvariant is idempotent
const inputs = [realBody, noH1, "", "# Foo\n\n## Bar\n\nbaz"];
for (const md of inputs) {
  const a = enforceTitleInvariant(md);
  const b = enforceTitleInvariant(a.markdown);
  expect(`idempotent on ${JSON.stringify(md.slice(0, 20))}`, a.markdown === b.markdown && a.title === b.title);
}

// Property: enforceTitleInvariant preserves byte-equal body
for (const md of inputs) {
  const r = enforceTitleInvariant(md, "fake hint that should never appear in body");
  expect(`body byte-equal preserved for ${JSON.stringify(md.slice(0, 20))}`, r.markdown === md);
  expect(`hint never leaks into body for ${JSON.stringify(md.slice(0, 20))}`, !r.markdown.includes("fake hint"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
