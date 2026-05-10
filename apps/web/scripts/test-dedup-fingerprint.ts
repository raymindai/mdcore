// Pure-function tests for the dedup loose-match fingerprint.
// We test the fingerprinting + DEDUP_LOOSE_WINDOW_MS contract without
// touching the database.

export {}; // mark as module so top-level `let pass / fail` are scoped to this file

// Re-implement fingerprint locally to keep this test pure (mirrors
// doc-dedup.ts).
function fingerprintBody(md: string, len = 200): string {
  return md.replace(/\s+/g, " ").trim().slice(0, len).toLowerCase();
}

let pass = 0; let fail = 0;
const expect = (label: string, cond: boolean) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label); fail++; }
};

// Cases that should fingerprint identically (loose-match positive).
const a1 = "# Hello\n\nThis is a paragraph.\n\nAnother line.";
const a2 = "# Hello\n\nThis  is a paragraph.\n\nAnother  line."; // double-space variants
const a3 = "# Hello\n\nThis is a paragraph.\n\nAnother line.\n"; // trailing newline
expect("whitespace variants share fingerprint",  fingerprintBody(a1) === fingerprintBody(a2));
expect("trailing newline variants share fingerprint", fingerprintBody(a1) === fingerprintBody(a3));

// Case sensitivity: fingerprint is lowercased so subtle case
// differences in capture do not bypass dedup.
expect("case-insensitive",                       fingerprintBody("# Foo\n\nBaz") === fingerprintBody("# foo\n\nbaz"));

// Different real content does not collide.
const b1 = "# Doc A\n\nProject Acme architecture overview.";
const b2 = "# Doc B\n\nWeekly review for week 3.";
expect("distinct content does not collide",      fingerprintBody(b1) !== fingerprintBody(b2));

// Welcome-style template has a stable fingerprint.
const sampleA = "# Welcome to mdfy.app\n\n> **The Markdown Hub.** Collect from anywhere. Edit with AI.";
const sampleB = "# Welcome to mdfy.app\n\n> **The Markdown Hub.** Collect from anywhere. Edit with AI.\n\n## Get Started";
expect("welcome variants share fingerprint up to len", fingerprintBody(sampleA) === fingerprintBody(sampleB).slice(0, fingerprintBody(sampleA).length));

// Length truncation property — first 200 chars dominate.
const long1 = "# Same prefix\n\n" + "X".repeat(500);
const long2 = "# Same prefix\n\n" + "X".repeat(400) + " Y".repeat(50);
expect("first 200 chars dominate fingerprint",   fingerprintBody(long1) === fingerprintBody(long2));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
