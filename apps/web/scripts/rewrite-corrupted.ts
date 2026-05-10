// Rewrite the five corrupted docs the founder explicitly asked for.
// Each gets a plausible draft based on the title + the surviving
// sibling content we found during the audit. Founder will edit
// after — these are starter drafts, not pretending to be the
// originals.
//
// Before writing, snapshot the current (corrupted) state into
// document_versions with a clear change_summary so the action is
// reversible.
//
// Dry-run by default. Pass --apply to write.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const apply = process.argv.includes("--apply");

// Drafts keyed by doc id. Title is enforced to match the H1 in body
// (per the title invariant) — `title` field shown for reference.
const REWRITES: Record<string, { title: string; markdown: string }> = {
  "5HCYUb9C": {
    title: "Project Acme — Full Context",
    markdown: `# Project Acme — Full Context

> _This doc was lost to the SAMPLE_WELCOME race. Recreated as a starter outline based on sibling docs (ycd09uCk Product Requirements, ycd140D0 Architecture, ycd101jA API Design v1). Edit and expand._

## What Project Acme is

A voice-intelligence layer for sales calls: record → transcribe → extract follow-ups → push to CRM. Tenant-scoped, JWT-authed, integrates with Salesforce / HubSpot via OAuth.

## Why this doc exists

Single place to point a new collaborator at when they ask "what's Acme?" Pulls from:

- **PRD** — see [Project Acme — Product Requirements Document](mdfy.app/ycd09uCk)
- **Architecture** — see [Project Acme — Architecture](mdfy.app/ycd140D0)
- **API Design v1** — see [Project Acme — API Design v1](mdfy.app/ycd101jA)

## Status snapshot

- [ ] PRD finalised
- [ ] Architecture diagram approved
- [ ] API endpoints specced
- [ ] OAuth handoff designed (Salesforce, HubSpot)
- [ ] Webhook contract drafted (call.transcribed, call.extracted, call.approved, call.synced)

## Open questions

1. Tenancy boundary for shared call recordings.
2. Retention policy for raw audio vs transcript.
3. Per-tenant model pinning vs shared inference.
4. CRM write-back conflict resolution.

## Decision log

_(append as decisions land)_
`,
  },

  "4GQ-gGqW": {
    title: "AI Memory Stack",
    markdown: `# AI Memory Stack

> _Lost to the SAMPLE_WELCOME race. Recreated from related notes (Letta vs Mem0 comparison in ycd01N9A) — edit to match what you had._

## The four layers

1. **Authored memory** — user writes it explicitly, has version history, portable. *mdfy*'s position.
2. **Extracted memory** — vendor-side LLM picks signals out of conversations. *Mem0, Letta, ChatGPT memory.*
3. **Retrieval memory** — vector search over the user's writing. *RAG-style.*
4. **Working memory** — the active context window. *Ephemeral, no persistence layer needed.*

## Comparison axes

| Axis | Authored | Extracted |
|---|---|---|
| Auditable | ✅ commits, diffs | ❌ opaque |
| Portable | ✅ markdown / URL | ❌ vendor DB |
| Cost to write | high (user types) | zero (auto) |
| Failure mode | omission | misextraction |

## Where mdfy sits

Authored, URL-addressable, cross-AI. Every doc / bundle / hub is a fetch endpoint any LLM can read.

## Related

- [Captured: Claude — Memory Layer Discussion](mdfy.app/ycd01N9A) — Letta vs Mem0 table
`,
  },

  "eEVnD3V6": {
    title: "AI Bundle Generation: Prompt Engineering Notes",
    markdown: `# AI Bundle Generation: Prompt Engineering Notes

> _Lost to the SAMPLE_WELCOME race. Recreated as a working outline — fill in what you had._

## What we're prompting for

Bundle synthesis: given N user docs + an optional intent string, produce a coherent compiled brief (memo / faq / brief flavours).

## Prompt structure that's been working

1. **System** — "You are a senior researcher synthesising a small library …"
2. **Intent block** — when present, anchor every signal to the user's question. Weight themes / insights / gaps by relevance.
3. **Document excerpts** — first 2000 chars per doc, max 10 docs, labelled "Document N: <title> (id: doc:<id>)"
4. **Schema** — strict JSON: nodes / edges / themes / insights / readingOrder / gaps / connections / documentSummaries.

## Rules that survived iteration

- Concept nodes MUST connect to at least one document node — no orphan concepts.
- Concept-to-concept edges allowed in addition to document edges.
- Edge labels short (2-4 words), describing the specific relationship.
- Insights must be NON-OBVIOUS — things a reader wouldn't notice without reading all docs together.

## Failure modes seen

- Output exceeds max_tokens mid-array — bumped Anthropic ceiling to 16K.
- Model wraps JSON in \`\`\`json fences — parser strips fences before JSON.parse.
- Model occasionally returns prose before JSON — clip to outermost { ... }.

## Open

- Intent-aware re-ranking of doc excerpts (currently first-2000-chars).
- Streaming output so the UI can paint partial bundles.
`,
  },

  "5tQcAQIw": {
    title: "mdfy Launch Pack",
    markdown: `# mdfy Launch Pack

> _Recreated outline. Fill in copy + assets._

## What mdfy is — one sentence

> Your knowledge as a URL — the densest, cheapest way for any AI to cite what you wrote.

## Channels

- **Show HN** — see draft in [Show HN: mdfy](mdfy.app/nqNbGNzV)
- **Product Hunt** — TBD
- **Twitter / X** — thread draft TBD
- **Newsletter** — single post

## Story arcs

1. **Cross-AI by URL** — paste any mdfy URL into Claude / ChatGPT / Cursor.
2. **Token-economical** — \`?compact=1\` and \`?digest=1\` make hubs cheap to cite.
3. **Author-controlled** — every doc is rewritable, every bundle re-synthesisable.

## Assets to ship

- [ ] Hero screenshot — editor with bundle preview
- [ ] Demo GIF — paste a hub URL into Claude, watch it answer
- [ ] One-page comparison vs Notion / Obsidian / OpenMemory
- [ ] Pricing page (post-beta)

## Open

- Launch date dependent on Sprint 6 cleanup landing on staging.
- Mascot (Emdy) appearance — final illustration pending.
`,
  },

  "DwpX-WpR": {
    title: "Weekly Reviews — March 2026",
    markdown: `# Weekly Reviews — March 2026

> _Lost to the SAMPLE_WELCOME race. Empty template — reconstruct from memory or git history._

## W1 (Mar 1 – Mar 7)

**Shipped**
- _(fill in)_

**Stuck on**
- _(fill in)_

**Next**
- _(fill in)_

## W2 (Mar 8 – Mar 14)

**Shipped**
- _(fill in)_

**Stuck on**
- _(fill in)_

**Next**
- _(fill in)_

## W3 (Mar 15 – Mar 21)

**Shipped**
- _(fill in)_

**Stuck on**
- _(fill in)_

**Next**
- _(fill in)_

## W4 (Mar 22 – Mar 28)

**Shipped**
- _(fill in)_

**Stuck on**
- _(fill in)_

**Next**
- _(fill in)_

## March takeaways

- _(monthly summary)_
`,
  },
};

(async () => {
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}\n`);

  for (const [id, payload] of Object.entries(REWRITES)) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id, title, markdown")
      .eq("id", id)
      .single();
    if (!doc) {
      console.log(`${id}  NOT FOUND — skipping`);
      continue;
    }
    console.log(`${id}  current title="${doc.title}"  bytes=${(doc.markdown || "").length}`);
    console.log(`        new title="${payload.title}"  bytes=${payload.markdown.length}`);

    if (!apply) continue;

    // Snapshot current corrupted body before overwriting.
    const { data: maxV } = await supabase
      .from("document_versions")
      .select("version_number")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();
    const nextV = ((maxV?.version_number ?? 0) as number) + 1;
    await supabase.from("document_versions").insert({
      document_id: id,
      markdown: doc.markdown,
      title: doc.title,
      version_number: nextV,
      change_summary: "pre-recovery snapshot of welcome-corrupted body",
    });

    const { error } = await supabase
      .from("documents")
      .update({
        markdown: payload.markdown,
        title: payload.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      console.log(`        WRITE FAILED: ${error.message}`);
    } else {
      console.log(`        WRITTEN`);
    }
  }
  console.log(`\n${apply ? "Applied." : "Dry run only — pass --apply to write."}`);
})();
