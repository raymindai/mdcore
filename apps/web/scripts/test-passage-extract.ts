// Pure-function tests for the concept-passage extractor used by
// /raw/hub/[slug]/c/[concept]. We can't import the helper directly
// because it's defined inside the route module, so this script
// re-implements it byte-identically and tests the contract.

export {}; // mark as module so top-level `let pass / fail` are scoped to this file

function extractPassagesFor(markdown: string, conceptLabel: string, maxPassages: number, maxChars: number): string[] {
  if (!markdown) return [];
  const needle = conceptLabel.toLowerCase().trim();
  if (!needle) return [];

  const cleaned = markdown
    .replace(/^---[\s\S]*?---\n?/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*[-*+]\s+/gm, "");

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 20);

  type Scored = { text: string; mentions: number };
  const scored: Scored[] = [];
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  for (const p of paragraphs) {
    const matches = p.match(re);
    if (!matches) continue;
    scored.push({ text: p, mentions: matches.length });
  }
  scored.sort((a, b) => b.mentions - a.mentions || b.text.length - a.text.length);
  return scored.slice(0, maxPassages).map((s) =>
    s.text.length > maxChars ? s.text.slice(0, maxChars - 1) + "…" : s.text,
  );
}

let pass = 0; let fail = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

const sample = `---
title: Test
---

# Authored Memory

Authored memory is what the user writes. The user keeps control of authored memory at all times.

## Comparison

Extracted memory pulls signals automatically. Authored memory is the opposite — explicit, versioned, portable.

## Trade-offs

- ease of authoring
- audit trail

The user benefits when authored memory is the default.

\`\`\`js
// just code, ignore me
const authored = true;
\`\`\`

Random unrelated paragraph that doesn't contain the term.
`;

const out = extractPassagesFor(sample, "authored memory", 5, 400);
check("returns multiple passages",       out.length >= 2, `got ${out.length}`);
check("most-dense passage first",        out[0].toLowerCase().includes("authored memory"));
check("ignores code fences",             !out.some((p) => p.includes("const authored = true")));
check("ignores frontmatter",             !out.some((p) => p.includes("title: Test")));
check("skips paragraphs without mention", !out.some((p) => p.toLowerCase().includes("random unrelated paragraph")));

// Cap respected.
const long = "authored memory ".repeat(200) + "\n\n" + "another authored memory paragraph";
const capped = extractPassagesFor(long, "authored memory", 5, 100);
check("clipped to maxChars",             capped[0].length <= 100, `got length ${capped[0]?.length}`);
check("clipped passage ends with ellipsis", capped[0].endsWith("…"));

// maxPassages respected.
const many = Array.from({ length: 10 }, (_, i) => `paragraph ${i} authored memory matters`).join("\n\n");
const limited = extractPassagesFor(many, "authored memory", 3, 200);
check("returns only maxPassages",         limited.length === 3, `got ${limited.length}`);

// Edge: empty / null / unmatched.
check("empty markdown → []",              extractPassagesFor("", "x", 3, 200).length === 0);
check("empty needle → []",                extractPassagesFor("hello world", "  ", 3, 200).length === 0);
check("no matches → []",                  extractPassagesFor("hello world", "xyz", 3, 200).length === 0);

// Special-char concept labels are escaped, not interpreted as regex.
const special = `\nThe (auth) module. The (auth) module again. (auth) too.\n\n\nAnother paragraph mentioning (auth) once.`;
const escaped = extractPassagesFor(special, "(auth)", 5, 400);
check("regex-special concept labels match", escaped.length >= 2, `got ${escaped.length}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
