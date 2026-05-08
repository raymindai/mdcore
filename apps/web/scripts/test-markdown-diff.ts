/**
 * Unit tests for the synthesis diff utility.
 * Run with: pnpm test:diff
 */

import { diffMarkdown } from "../src/lib/markdown-diff";

let pass = 0, fail = 0;
function assert(cond: unknown, label: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
}

console.log("\n[1] identical strings");
{
  const d = diffMarkdown("# Hello\n\nWorld", "# Hello\n\nWorld");
  assert(d.identical, "identical flag set");
  assert(d.added === 0 && d.removed === 0, "no changes counted");
}

console.log("\n[2] pure addition");
{
  const cur = "# Synthesis\n\nLine A\nLine B";
  const prop = "# Synthesis\n\nLine A\nLine B\nLine C";
  const d = diffMarkdown(cur, prop);
  assert(!d.identical, "not identical");
  assert(d.added >= 1, `something added (got ${d.added})`);
  assert(d.removed === 0, "nothing removed");
  const addedLine = d.lines.find((l) => l.op === "added" && l.text.includes("Line C"));
  assert(!!addedLine, "Line C marked added");
}

console.log("\n[3] pure removal");
{
  const cur = "Line A\nLine B\nLine C";
  const prop = "Line A\nLine B";
  const d = diffMarkdown(cur, prop);
  assert(d.added === 0, "nothing added");
  assert(d.removed >= 1, `something removed (got ${d.removed})`);
  const removed = d.lines.find((l) => l.op === "removed" && l.text.includes("Line C"));
  assert(!!removed, "Line C marked removed");
}

console.log("\n[4] mixed change");
{
  const cur = "# Old title\n\nClaim A\nClaim B";
  const prop = "# New title\n\nClaim A\nClaim B (revised)";
  const d = diffMarkdown(cur, prop);
  assert(d.added >= 1 && d.removed >= 1, `both add and remove (a=${d.added} r=${d.removed})`);
  // Equal lines must remain
  const equalA = d.lines.find((l) => l.op === "equal" && l.text.includes("Claim A"));
  assert(!!equalA, "Claim A preserved as equal");
}

console.log("\n[5] CRLF normalization");
{
  const a = "Line\r\nLine\r\n";
  const b = "Line\nLine\n";
  const d = diffMarkdown(a, b);
  assert(d.identical, "CRLF normalized to LF treated identical");
}

console.log("\n[6] empty current → all-added");
{
  const d = diffMarkdown("", "# New doc\n\nFresh content");
  assert(d.added > 0 && d.removed === 0, "fresh content all added");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
