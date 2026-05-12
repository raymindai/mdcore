-- 034: Expand "Sample Bundle: Tour of mdfy" from 3 → 8 member docs.
-- Adds five focused tour docs (AI capture, bundles deep-dive, hub,
-- deploy, editor modes) and updates the bundle's pre-computed
-- graph_data so the canvas paints a richer analysis on first open.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING on documents and
-- bundle_documents, UPDATE on bundles with timestamp refresh.

-- ─── Member doc 4: AI capture ──────────────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-ai',
  $$# Capturing AI conversations

mdfy treats the AI conversation as a first-class document type.

## Three paths in

1. **Paste a share URL.** ChatGPT, Claude, or Gemini conversation links resolve to clean markdown automatically.
2. **Drop a transcript.** Copy a chat thread, paste into mdfy — the parser detects the AI dialect and structures turns as `User:` / `Assistant:`.
3. **One-click capture.** The Chrome extension grabs whatever AI UI is open; `/mdfy capture` works inside Claude Code, Cursor, Codex, Aider.

## Why capture matters

Every captured chat lives at a permanent URL like `mdfy.app/abc123`. The URL is two-way readable: humans see a rendered doc, AIs fetch it as clean markdown.

> The answer you didn't save is the context the next AI session won't have.

That's the loop: capture today, paste tomorrow, the next AI gets your prior AI's work for free.
$$,
  'Capturing AI conversations',
  'mdfy-ex-token-ai',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member doc 5: Bundles deep-dive ───────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-bun',
  $$# Bundles as thinking surfaces

A bundle isn't a folder. It's a collection that reads itself.

## The mechanics

Select 3 or more docs in the sidebar, choose **Bundle**, give it a one-line **Intent** ("Decide our SNS launch strategy"). The bundle URL `mdfy.app/b/<id>` opens to a canvas: every doc is a node, concepts are inner nodes, edges are typed relationships.

## What it produces

Run **discovery** and the canvas surfaces:

- **Themes** that recur across docs
- **Insights** the AI noticed reading them together
- **Tensions** where two docs contradict each other
- **Gaps** the collection misses
- **Connections** as doc-to-doc relationships

## Compile

From the canvas toolbar, **Memo / FAQ / Brief** synthesises the whole bundle into a coherent artifact. The compiled doc *remembers its source bundle*, so a single click later regenerates it from the latest content.

The bundle reads what you gathered and tells you what it sees.
$$,
  'Bundles as thinking surfaces',
  'mdfy-ex-token-bun',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member doc 6: The Hub ─────────────────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-hub',
  $$# The Hub: your personal knowledge URL

A Hub rolls every doc and bundle you publish into one address: `mdfy.app/hub/<you>`.

## What the hub does

- **Indexes everything you publish** with a concept ontology (`concept_index`) so cross-doc references emerge as you write.
- **Exposes a single URL** that any AI can fetch end-to-end via `/raw/hub/<you>` or `/hub/<you>/llms-full.txt`.
- **Supports compact digests** — `?digest=1` returns a concept-clustered summary instead of the full body.

## Why one URL beats many

Pasting 20 doc links into Claude works but wastes tokens and breaks ordering. The hub URL is *one paste* and the AI gets a coherent representation of your personal knowledge graph — including which concepts appear where.

## Auto-management

Hub has a lint layer that detects orphan docs, near-duplicates, and title/content mismatches. At the right aggressiveness level mdfy auto-resolves the safe ones (e.g., dropping confirmed orphans) and surfaces the rest as a review queue.

A hub is a living index, not a folder of stale files.
$$,
  'The Hub: your personal knowledge URL',
  'mdfy-ex-token-hub',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member doc 7: Deploying to any AI ─────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-dpl',
  $$# Deploying a URL to any AI

The viral loop in mdfy runs through URLs.

## Paste, don't paste

Copy `mdfy.app/<id>` into Claude / ChatGPT / Cursor and the model fetches clean markdown automatically — no special configuration, no extensions, no API keys. Every public mdfy URL exposes a `/raw/<id>` variant tuned for LLM consumption.

## Three token-economy knobs

| Query | What it returns |
|-------|-----------------|
| (default) | Digest: title, links, annotations |
| `?compact` | Stripped whitespace, trimmed long quotes |
| `?full=1` | Bundle inlines every member doc body |
| `?graph=0` | Bundle drops the canvas analysis |

## Cross-AI is the moat

A single AI vendor can build deeper integration than mdfy with its own model. None of them can deliver a URL that works across their *competitors'* models — that asymmetry is mdfy's structural position.

Paste the URL. The other AI reads it. That's the entire workflow.
$$,
  'Deploying a URL to any AI',
  'mdfy-ex-token-dpl',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member doc 8: Editor modes ────────────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-edt',
  $$# Live, Split, and Source

mdfy gives you three ways to look at the same document.

## Live (default)

WYSIWYG. You see the rendered output and type into it directly — bold is bold, headings are headings, the markdown source stays behind the scenes. Best for prose and most editing work.

## Split

Two panes side-by-side: Source on the left, Live on the right. Edit either side; changes sync. Best for hand-written tables, math, or when you want to verify how a markdown construct renders.

## Source

Pure markdown in a CodeMirror editor with full syntax highlighting and shortcuts. Best for bulk edits, find-and-replace, or pasting machine-generated markdown verbatim.

## Why three

WYSIWYG markdown editors usually pick one — either you write in markdown and "preview," or you write in WYSIWYG and "export." mdfy refuses the trade-off: the source and the rendered tree are linked bidirectionally, and the toolbar pill lets you swap views without losing position.

Mode is per-session, not per-doc — set it once, every doc opens that way.
$$,
  'Live, Split, and Source',
  'mdfy-ex-token-edt',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Bundle membership: append the 5 new docs ──────────────────
INSERT INTO bundle_documents (bundle_id, document_id, sort_order, annotation)
VALUES
  ('mdfy-ex-bundle', 'mdfy-ex-ai',  3, 'How AI conversations turn into permanent, AI-readable URLs.'),
  ('mdfy-ex-bundle', 'mdfy-ex-bun', 4, 'A bundle reads what you gathered — themes, insights, tensions, gaps.'),
  ('mdfy-ex-bundle', 'mdfy-ex-hub', 5, 'One URL that rolls up every doc and bundle, with a living concept index.'),
  ('mdfy-ex-bundle', 'mdfy-ex-dpl', 6, 'How a mdfy URL travels into Claude / ChatGPT / Cursor and why cross-AI is the moat.'),
  ('mdfy-ex-bundle', 'mdfy-ex-edt', 7, 'Three views of the same doc: Live, Split, Source.')
ON CONFLICT (bundle_id, document_id) DO NOTHING;

-- ─── Refresh the bundle's pre-computed graph_data ──────────────
UPDATE bundles
SET
  graph_data = $${
    "summary": "Eight docs forming a guided tour of mdfy. The first three (formatting, diagrams, what ships) cover the rendering and product vocabulary. The next five (AI capture, bundles, hub, deploy, editor modes) cover the workflow loop: capture → compose → publish → cross-AI deploy → iterate. Read end-to-end they answer two questions at once: what mdfy renders, and how the URL it produces actually behaves in the wild.",
    "themes": [
      "A doc is a URL, not a file — every surface assumes the URL is the unit of work.",
      "Two-way readable — every URL is for both humans and AIs from the same address.",
      "Compositional surfaces — Doc, Bundle, Hub are URL combinators over one primitive.",
      "Cross-AI portability — the URL is the moat; mdfy never bets on a single AI vendor."
    ],
    "insights": [
      "The formatting and diagrams docs never mention AI directly, but their examples (code blocks, tables, Mermaid) are precisely the structures an LLM consumes most reliably — readable markdown is also machine-friendly markdown.",
      "ASCII↔Mermaid coexistence (in Diagrams) mirrors digest↔full (in Deploy): keep the cheap representation as default, leave the heavier one one flag away.",
      "The Bundles and Hub docs both reframe collection as composition — they're not folders, they're URL combinators that read themselves and emit a new URL.",
      "AI capture (doc 4) and Deploy (doc 7) form a closed loop: capture turns an AI session into a URL; deploy hands that URL back to a different AI. The same URL plays both roles."
    ],
    "keyTakeaways": [
      "Doc → Bundle → Hub: all addressable, all AI-readable.",
      "Capture today's AI work; deploy it back into tomorrow's session as one URL.",
      "Live / Split / Source are three windows on the same source of truth — no export step needed.",
      "Auto-management keeps the hub a living index, not a graveyard of stale files."
    ],
    "gaps": [
      "The tour doesn't cover sharing, permissions, or password gating — those are separate flows.",
      "No doc walks through editing an already-published doc end-to-end.",
      "Pricing, login, and team workflows are intentionally out of scope for this 8-doc bundle."
    ],
    "connections": [
      { "doc1": "mdfy-ex-fmt", "doc2": "mdfy-ex-diag", "relationship": "Both define what counts as content in a mdfy doc — prose/code/math vs visuals." },
      { "doc1": "mdfy-ex-diag", "doc2": "mdfy-ex-feat", "relationship": "Diagrams demonstrate the rendering pipeline the Features doc summarises (Rust→WASM + highlight.js + KaTeX + Mermaid)." },
      { "doc1": "mdfy-ex-feat", "doc2": "mdfy-ex-ai", "relationship": "Features lists \"Capture\" as a surface; AI capture deep-dives the same workflow." },
      { "doc1": "mdfy-ex-ai", "doc2": "mdfy-ex-dpl", "relationship": "Capture and Deploy are two ends of the same URL loop." },
      { "doc1": "mdfy-ex-bun", "doc2": "mdfy-ex-hub", "relationship": "Bundle is bundle-scope analysis; Hub is hub-wide concept_index — distinct ontologies on the same primitive." },
      { "doc1": "mdfy-ex-hub", "doc2": "mdfy-ex-dpl", "relationship": "Hub URL is the densest deployable artifact mdfy produces." },
      { "doc1": "mdfy-ex-edt", "doc2": "mdfy-ex-fmt", "relationship": "Editor modes are three views over the same markdown that Formatting documents." }
    ],
    "documentSummaries": {
      "mdfy-ex-fmt": "Standard Markdown formatting (text, lists, tables, code, math, footnotes) as mdfy renders it.",
      "mdfy-ex-diag": "Mermaid and ASCII as two interchangeable diagram dialects, with asciitomd as the bridge.",
      "mdfy-ex-feat": "The five surfaces — Publish, Render, Capture, Compose, Deploy — and the URL-as-document thesis.",
      "mdfy-ex-ai": "How AI conversations enter mdfy (paste URL, drop transcript, one-click capture) and why permanent URLs matter for the next AI session.",
      "mdfy-ex-bun": "Bundles as thinking surfaces — themes, insights, tensions, gaps, compile into Memo/FAQ/Brief.",
      "mdfy-ex-hub": "The hub URL as a living index: concept ontology, AI-fetchable, auto-management lint layer.",
      "mdfy-ex-dpl": "Pasting a mdfy URL into Claude / ChatGPT / Cursor; the cross-AI portability that defines mdfy's structural moat.",
      "mdfy-ex-edt": "Three editor modes — Live (WYSIWYG), Split (source + render), Source (raw markdown) — over the same bidirectional source of truth."
    },
    "nodes": [
      { "id": "n-doc-fmt",  "label": "Markdown formatting in mdfy",      "type": "document", "weight": 1, "documentId": "mdfy-ex-fmt" },
      { "id": "n-doc-diag", "label": "Diagrams: Mermaid + ASCII",        "type": "document", "weight": 1, "documentId": "mdfy-ex-diag" },
      { "id": "n-doc-feat", "label": "What ships in mdfy",               "type": "document", "weight": 1, "documentId": "mdfy-ex-feat" },
      { "id": "n-doc-ai",   "label": "Capturing AI conversations",       "type": "document", "weight": 1, "documentId": "mdfy-ex-ai" },
      { "id": "n-doc-bun",  "label": "Bundles as thinking surfaces",     "type": "document", "weight": 1, "documentId": "mdfy-ex-bun" },
      { "id": "n-doc-hub",  "label": "The Hub: your personal knowledge URL", "type": "document", "weight": 1, "documentId": "mdfy-ex-hub" },
      { "id": "n-doc-dpl",  "label": "Deploying a URL to any AI",        "type": "document", "weight": 1, "documentId": "mdfy-ex-dpl" },
      { "id": "n-doc-edt",  "label": "Live, Split, and Source",          "type": "document", "weight": 1, "documentId": "mdfy-ex-edt" },
      { "id": "n-c-url",      "label": "URL-as-document",        "type": "concept", "weight": 4, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-ai",       "label": "AI-readable by default", "type": "concept", "weight": 4, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-cross",    "label": "Cross-AI portability",   "type": "concept", "weight": 3, "documentId": "mdfy-ex-dpl" },
      { "id": "n-c-bundle",   "label": "Bundle",                 "type": "concept", "weight": 3, "documentId": "mdfy-ex-bun" },
      { "id": "n-c-hub",      "label": "Hub",                    "type": "concept", "weight": 3, "documentId": "mdfy-ex-hub" },
      { "id": "n-c-capture",  "label": "AI capture",             "type": "concept", "weight": 2, "documentId": "mdfy-ex-ai" },
      { "id": "n-c-compile",  "label": "Compile (Memo/FAQ/Brief)","type": "concept","weight": 2, "documentId": "mdfy-ex-bun" },
      { "id": "n-c-concept",  "label": "concept_index",          "type": "concept", "weight": 2, "documentId": "mdfy-ex-hub" },
      { "id": "n-c-mermaid",  "label": "Mermaid",                "type": "concept", "weight": 2, "documentId": "mdfy-ex-diag" },
      { "id": "n-c-ascii",    "label": "ASCII diagram",          "type": "concept", "weight": 2, "documentId": "mdfy-ex-diag" },
      { "id": "n-c-katex",    "label": "KaTeX math",             "type": "concept", "weight": 1, "documentId": "mdfy-ex-fmt" },
      { "id": "n-c-code",     "label": "Code highlighting",      "type": "concept", "weight": 2, "documentId": "mdfy-ex-fmt" },
      { "id": "n-c-modes",    "label": "Live / Split / Source",  "type": "concept", "weight": 2, "documentId": "mdfy-ex-edt" }
    ],
    "edges": [
      { "source": "n-doc-fmt",   "target": "n-c-code",     "label": "demonstrates", "weight": 2, "type": "contains" },
      { "source": "n-doc-fmt",   "target": "n-c-katex",    "label": "demonstrates", "weight": 1, "type": "contains" },
      { "source": "n-doc-diag",  "target": "n-c-mermaid",  "label": "demonstrates", "weight": 2, "type": "contains" },
      { "source": "n-doc-diag",  "target": "n-c-ascii",    "label": "demonstrates", "weight": 2, "type": "contains" },
      { "source": "n-doc-feat",  "target": "n-c-url",      "label": "argues for",   "weight": 3, "type": "elaborates" },
      { "source": "n-doc-feat",  "target": "n-c-ai",       "label": "argues for",   "weight": 3, "type": "elaborates" },
      { "source": "n-doc-feat",  "target": "n-c-bundle",   "label": "introduces",   "weight": 2, "type": "elaborates" },
      { "source": "n-doc-feat",  "target": "n-c-hub",      "label": "introduces",   "weight": 2, "type": "elaborates" },
      { "source": "n-doc-ai",    "target": "n-c-capture",  "label": "defines",      "weight": 3, "type": "elaborates" },
      { "source": "n-doc-ai",    "target": "n-c-url",      "label": "applies",      "weight": 2, "type": "supports" },
      { "source": "n-doc-bun",   "target": "n-c-bundle",   "label": "deep-dives",   "weight": 3, "type": "elaborates" },
      { "source": "n-doc-bun",   "target": "n-c-compile",  "label": "introduces",   "weight": 2, "type": "elaborates" },
      { "source": "n-doc-hub",   "target": "n-c-hub",      "label": "deep-dives",   "weight": 3, "type": "elaborates" },
      { "source": "n-doc-hub",   "target": "n-c-concept",  "label": "introduces",   "weight": 2, "type": "elaborates" },
      { "source": "n-doc-dpl",   "target": "n-c-cross",    "label": "argues for",   "weight": 3, "type": "elaborates" },
      { "source": "n-doc-dpl",   "target": "n-c-url",      "label": "demonstrates", "weight": 2, "type": "supports" },
      { "source": "n-doc-edt",   "target": "n-c-modes",    "label": "defines",      "weight": 3, "type": "elaborates" },
      { "source": "n-c-url",     "target": "n-c-ai",       "label": "enables",      "weight": 3, "type": "supports" },
      { "source": "n-c-bundle",  "target": "n-c-url",      "label": "composes",     "weight": 2, "type": "supports" },
      { "source": "n-c-hub",     "target": "n-c-bundle",   "label": "rolls up",     "weight": 2, "type": "supports" },
      { "source": "n-c-capture", "target": "n-c-url",      "label": "produces",     "weight": 2, "type": "supports" },
      { "source": "n-c-cross",   "target": "n-c-ai",       "label": "scales",       "weight": 2, "type": "supports" },
      { "source": "n-c-compile", "target": "n-c-bundle",   "label": "synthesises",  "weight": 2, "type": "supports" },
      { "source": "n-c-concept", "target": "n-c-hub",      "label": "indexes",      "weight": 2, "type": "supports" },
      { "source": "n-c-mermaid", "target": "n-c-ascii",    "label": "interchangeable with", "weight": 1, "type": "supports" },
      { "source": "n-c-modes",   "target": "n-c-url",      "label": "views of",     "weight": 1, "type": "supports" }
    ],
    "clusters": [
      { "id": "cl-platform",   "label": "Platform thesis",        "nodeIds": ["n-c-url", "n-c-ai", "n-c-cross"], "color": "#fb923c" },
      { "id": "cl-composition","label": "Composition surfaces",   "nodeIds": ["n-c-bundle", "n-c-hub", "n-c-compile", "n-c-concept"], "color": "#a78bfa" },
      { "id": "cl-rendering",  "label": "Rendering vocabulary",   "nodeIds": ["n-c-code", "n-c-katex", "n-c-mermaid", "n-c-ascii", "n-c-modes"], "color": "#60a5fa" },
      { "id": "cl-loop",       "label": "Capture + deploy loop",  "nodeIds": ["n-c-capture", "n-c-url", "n-c-cross"], "color": "#4ade80" }
    ]
  }$$::jsonb,
  graph_generated_at = NOW(),
  updated_at = NOW()
WHERE id = 'mdfy-ex-bundle';
