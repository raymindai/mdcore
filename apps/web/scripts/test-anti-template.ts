// Pure-function tests for the anti-template guard.
// No DB dependency — verifies the decision matrix we want enforced.

import { evaluateAntiTemplateGuard, looksLikeTemplate } from "../src/lib/anti-template-guard";

interface Case {
  name: string;
  incoming: string;
  existing: string | null;
  expectRefuse: boolean;
}

const SAMPLE = "# Welcome to mdfy.app\n\n> **The Markdown Hub.** Collect from anywhere. Edit with AI. Publish with a permanent URL.\n\n## Get Started\n\nFoo bar baz.";
const TIPTAP_SAMPLE = "# Welcome to [mdfy.app](http://mdfy.app)\n\n> **The Markdown Hub.** Collect from anywhere. Edit with AI. Publish with a permanent URL.\n\n## Get Started\n\nFoo bar baz.";

const REAL_BODY = `# Project Acme — Architecture

## Overview

Acme is a post-call sales intelligence layer. Components include
ingestion, transcription, extraction, and a CRM bridge.`;

const cases: Case[] = [
  { name: "real → real (no-op)",                       incoming: REAL_BODY,      existing: REAL_BODY,      expectRefuse: false },
  { name: "real → other real (legit edit)",            incoming: REAL_BODY,      existing: "# Old\n\nold body content here that is long enough.", expectRefuse: false },
  { name: "template overwriting real ⇒ REFUSE",        incoming: SAMPLE,         existing: REAL_BODY,      expectRefuse: true  },
  { name: "Tiptap autolinked template overwriting ⇒ REFUSE", incoming: TIPTAP_SAMPLE, existing: REAL_BODY,  expectRefuse: true  },
  { name: "template → empty doc (legit first save)",   incoming: SAMPLE,         existing: "",             expectRefuse: false },
  { name: "template → null body",                      incoming: SAMPLE,         existing: null,           expectRefuse: false },
  { name: "template → very short body (≤120 chars)",   incoming: SAMPLE,         existing: "# tiny",       expectRefuse: false },
  { name: "template → identical template (re-save)",   incoming: SAMPLE,         existing: SAMPLE,         expectRefuse: false },
  { name: "template → tiptap-template (still template)", incoming: SAMPLE,       existing: TIPTAP_SAMPLE,  expectRefuse: false },
  { name: "real → real (different content same length)", incoming: REAL_BODY.replace("Acme", "Bravo"), existing: REAL_BODY, expectRefuse: false },
];

let pass = 0; let fail = 0;
for (const c of cases) {
  const result = evaluateAntiTemplateGuard({ incomingMarkdown: c.incoming, existingMarkdown: c.existing });
  const refuse = result.refuse === true;
  const ok = refuse === c.expectRefuse;
  console.log(ok ? "PASS" : "FAIL", "—", c.name, ok ? "" : `(expected refuse=${c.expectRefuse}, got ${refuse})`);
  if (ok) pass++; else fail++;
}

// looksLikeTemplate spot-checks
const fpCases: Array<[string, boolean]> = [
  [SAMPLE, true],
  [TIPTAP_SAMPLE, true],
  [REAL_BODY, false],
  ["", false],
  ["# Welcome to my notes\n\nNothing about The Markdown Hub here.", false],
];
for (const [md, expected] of fpCases) {
  const got = looksLikeTemplate(md);
  const ok = got === expected;
  console.log(ok ? "PASS" : "FAIL", "— looksLikeTemplate:", JSON.stringify(md.slice(0, 40)), "→", got);
  if (ok) pass++; else fail++;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
