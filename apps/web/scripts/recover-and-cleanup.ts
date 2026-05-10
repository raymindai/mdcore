// Phase-2 recovery + cleanup, executed in dependency order so the
// migration 029 unique constraint never blocks an update.
//
// Plan:
//   1. SAVE good content trapped under wrong title:
//      - eEVnD3V6 ← ycd249y4.markdown (AI Bundle Generation notes)
//      - ycd08oxI title := H1 from its body (Project Acme PRD)
//      - ycd01N9A title := H1 from its body (Letta vs Mem0)
//   2. DELETE the now-redundant siblings + clear-cut dups:
//      - ycd249y4 (content moved to eEVnD3V6)
//      - ycd09uCk (welcome-corrupted PRD; ycd08oxI now has the real PRD)
//      - ycd00PnE, YtWZ8z_T (welcome-titled welcome dups)
//      - FTnSu3Lx (Launch Pack dup of 5tQcAQIw which was rewritten)
//      - nqNbGNzV ("Project Acme — Full Context" with Show HN body —
//        ycd25D4s is the canonical Show HN doc; 5HCYUb9C is the
//        rewritten Project Acme — Full Context)
//   3. REWRITE remaining welcome-corrupted that have a meaningful
//      title and no surviving sibling content:
//      - ycd140D0 "Project Acme — Architecture"
//      - ycd21Vxs "Week 3"
//      - vgOWAuvI "Founder Journal"
//
// Each write snapshots the current state into document_versions
// first. Each delete is a soft-delete (deleted_at timestamp), not
// hard delete, so anything can be restored.
//
// Dry-run by default; pass --apply to write.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes("--apply");

async function snapshotAndUpdate(id: string, updates: { markdown?: string; title?: string }, summary: string) {
  const { data: doc } = await supabase
    .from("documents")
    .select("title, markdown")
    .eq("id", id)
    .single();
  if (!doc) { console.log(`  [${id}] NOT FOUND`); return; }
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
    change_summary: summary,
  });
  const { error } = await supabase
    .from("documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.log(`  [${id}] update failed: ${error.message}`);
}

async function softDelete(id: string, reason: string) {
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) console.log(`  [${id}] delete failed: ${error.message}`);
  else console.log(`  [${id}] soft-deleted (${reason})`);
}

const REWRITES: Record<string, { title: string; markdown: string }> = {
  "ycd140D0": {
    title: "Project Acme — Architecture",
    markdown: `# Project Acme — Architecture

> _Recreated outline. Original was lost to the SAMPLE_WELCOME race._

## Overview

Acme is a post-call sales intelligence layer. Components (high level):

\`\`\`
audio in → transcription → extraction → CRM write
            (Whisper)       (Claude)     (Salesforce / HubSpot)
\`\`\`

## Components

### Ingestion
- Cloud upload endpoint (POST /v1/calls)
- Webhook from Zoom / Gong / Chorus
- File-store: object storage (raw audio, retained 30d)

### Transcription
- Provider: Whisper (self-hosted) or Deepgram (managed)
- Output: speaker-diarised transcript JSON

### Extraction
- LLM: Claude with structured output (JSON schema)
- Inputs: transcript, account context, recent CRM state
- Outputs: follow_ups[], decisions[], next_steps[]

### CRM bridge
- OAuth tokens per tenant (Salesforce, HubSpot)
- Idempotent write with external ID = call_id
- Approval queue: nothing writes without human OK in v1

## Data model

- \`calls(id, tenant_id, audio_url, status, transcript_id, ...)\`
- \`extractions(id, call_id, kind, payload, status, approver_id)\`
- \`integrations(tenant_id, provider, refresh_token, ...)\`

## Open questions

- Streaming vs batch transcription
- Multi-tenant inference vs per-tenant model pinning
- Retention: raw audio vs transcript vs extracted-only
`,
  },

  "ycd21Vxs": {
    title: "Week 3",
    markdown: `# Week 3

> _Lost to the SAMPLE_WELCOME race. Empty template — fill in._

## Goals (set Mon)
- _(fill in)_

## Shipped
- _(fill in)_

## Stuck on
- _(fill in)_

## Decisions made
- _(fill in)_

## Next week
- _(fill in)_
`,
  },

  "vgOWAuvI": {
    title: "Founder Journal",
    markdown: `# Founder Journal

> _Recreated outline. Original was lost to the SAMPLE_WELCOME race._

## How to use this

Append-only log. Date stamp each entry. Capture decisions, doubts,
and small daily wins. The point is not polish — the point is having
a record of what you were thinking when you made each call.

## Entries

### \`2026-05-10\`

_(fill in)_

### \`2026-05-09\`

_(fill in)_

### \`2026-05-08\`

_(fill in)_

---

_New entries on top._
`,
  },
};

(async () => {
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}\n`);

  // ── Step 1a: pull ycd249y4 body before anything mutates ────────
  const { data: src } = await supabase
    .from("documents")
    .select("markdown")
    .eq("id", "ycd249y4")
    .single();
  const ycd249Body = src?.markdown || "";
  console.log(`Source ycd249y4 body bytes: ${ycd249Body.length}`);

  // ── Step 1b: rewrite eEVnD3V6 with that body, derive title from H1
  const eEVnH1 = ycd249Body.match(/^#\s+(.+)/m)?.[1].trim() || "AI Bundle Generation: Prompt Engineering Notes";
  console.log(`\n[1] eEVnD3V6 ← ycd249y4 body (title="${eEVnH1}")`);
  if (apply) await snapshotAndUpdate("eEVnD3V6", { markdown: ycd249Body, title: eEVnH1 }, "restore from ycd249y4 (real content was trapped under wrong id)");

  // ── Step 2a: ycd08oxI title sync from H1
  const { data: ycd08 } = await supabase
    .from("documents")
    .select("markdown, title")
    .eq("id", "ycd08oxI")
    .single();
  const ycd08H1 = (ycd08?.markdown || "").match(/^#\s+(.+)/m)?.[1].trim() || ycd08?.title || "";
  console.log(`[2] ycd08oxI title sync: "${ycd08?.title}" → "${ycd08H1}"`);
  if (apply) await snapshotAndUpdate("ycd08oxI", { title: ycd08H1 }, "title sync to body H1 (was 'Welcome to...' by accident)");

  // ── Step 3a: ycd01N9A title sync from H1
  const { data: ycd01 } = await supabase
    .from("documents")
    .select("markdown, title")
    .eq("id", "ycd01N9A")
    .single();
  const ycd01H1 = (ycd01?.markdown || "").match(/^#\s+(.+)/m)?.[1].trim() || ycd01?.title || "";
  console.log(`[3] ycd01N9A title sync: "${ycd01?.title}" → "${ycd01H1}"`);
  if (apply) await snapshotAndUpdate("ycd01N9A", { title: ycd01H1 }, "title sync to body H1 (Letta vs Mem0 is the real content)");

  // ── Step 4: rewrites with starter drafts
  for (const [id, payload] of Object.entries(REWRITES)) {
    console.log(`[4] rewrite ${id}: title="${payload.title}" bytes=${payload.markdown.length}`);
    if (apply) await snapshotAndUpdate(id, payload, "starter draft to replace welcome-corrupted body");
  }

  // ── Step 5: soft-deletes
  const deletes: Array<[string, string]> = [
    ["ycd249y4", "content moved to eEVnD3V6; title was wrong anyway"],
    ["ycd09uCk", "welcome-corrupted PRD; real PRD now lives in ycd08oxI"],
    ["ycd00PnE", "welcome-titled dup of welcome content"],
    ["YtWZ8z_T", "welcome-titled dup of welcome content"],
    ["FTnSu3Lx", "Launch Pack dup of 5tQcAQIw (which was rewritten)"],
    ["nqNbGNzV", "Show HN body misnamed; canonical Show HN is ycd25D4s, canonical Acme Full Context is 5HCYUb9C"],
  ];
  console.log("");
  for (const [id, reason] of deletes) {
    console.log(`[5] soft-delete ${id}  (${reason})`);
    if (apply) await softDelete(id, reason);
  }

  console.log(`\n${apply ? "Applied." : "Dry run only — pass --apply to write."}`);
})();
