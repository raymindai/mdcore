-- 033: Seed the "Sample Bundle: Tour of mdfy" example bundle + its three
-- member docs. EXAMPLE_TABS in MdEditor.tsx references the bundle by
-- the fixed id `mdfy-ex-bundle`; first-time visitors click it in
-- Guides & Examples and immediately see an interactive bundle —
-- canvas with pre-computed analysis, member-doc list, the full
-- bundle viewer flow.
--
-- All four rows are public (is_draft=false, no password, no
-- allowed_emails) so anonymous visitors can fetch them through
-- /api/bundles/mdfy-ex-bundle and /api/docs/mdfy-ex-*.
--
-- Pre-computed graph_data ships with the bundle so the canvas isn't
-- empty on first open. Re-running the canvas analysis would
-- regenerate it from the current doc bodies.
--
-- Idempotent via ON CONFLICT (id) DO NOTHING — re-running the
-- migration leaves any human edits to the rows intact.

-- ─── Member doc 1: Markdown formatting ─────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-fmt',
  $MD$# Markdown formatting in mdfy

mdfy renders standard GitHub-flavored Markdown plus a few extras worth knowing about.

## Inline

Regular text, **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and `inline code`.

Links work the usual way: [mdfy.app](https://mdfy.app). Footnotes too[^1].

[^1]: Like this one.

## Lists

- Bullets nest:
  - Second level
    - Third level
- And tasks toggle inline (click the checkbox in Live mode):
  - [x] Done
  - [ ] Open

## Tables

| Doc | Bundle | Hub |
|:----|:------:|----:|
| One URL | Many docs in one URL | All docs in one URL |
| `/abc123` | `/b/abc123` | `/hub/<you>` |

## Code

```typescript
const res = await fetch("https://mdfy.app/api/docs", {
  method: "POST",
  body: JSON.stringify({ markdown: "# Hello" }),
});
const { id } = await res.json();
// → https://mdfy.app/<id>
```

## Math

Inline KaTeX: $E = mc^2$.

Display block:

$$
\int_0^{\infty} e^{-x^2}\, dx = \frac{\sqrt{\pi}}{2}
$$

That covers what most docs need. Diagrams get their own page in this bundle.
$MD$,
  'Markdown formatting in mdfy',
  'mdfy-ex-token-fmt',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member doc 2: Diagrams ────────────────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-diag',
  $$# Diagrams: Mermaid + ASCII

mdfy renders diagrams from two source dialects so you can paste either and get the same picture.

## Mermaid

Use a fenced block with `mermaid`:

```mermaid
flowchart LR
  Doc[(Doc)] --> Bundle((Bundle))
  Bundle --> Hub[/Hub/]
  Hub --> AI[Any AI]
  AI -. cites .-> Doc
```

Sequence diagrams work the same way:

```mermaid
sequenceDiagram
  participant U as You
  participant M as mdfy
  participant AI as Claude/ChatGPT
  U->>M: Publish doc
  M-->>U: Permanent URL
  U->>AI: Paste URL
  AI->>M: Fetch /raw/<id>
  M-->>AI: Clean markdown
```

State, class, gantt, ER, journey, mindmap, timeline — all supported.

## ASCII

Paste an ASCII diagram and mdfy renders it as a stylized container.

```
┌─────────┐     ┌──────────┐     ┌──────┐
│  Doc    │ --> │  Bundle  │ --> │  Hub │
└─────────┘     └──────────┘     └──────┘
                     │
                     ▼
                 [ Any AI ]
```

Click any rendered ASCII block to convert it to Mermaid via the "asciitomd" action — the resulting code is editable in the visual canvas.

## Why both

ASCII is what LLMs default to producing. Mermaid is what scales to complex graphs. mdfy keeps both in the same toolbox so you don't have to choose at the moment of writing.
$$,
  'Diagrams: Mermaid + ASCII',
  'mdfy-ex-token-diag',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member doc 3: What ships in mdfy ──────────────────────────
INSERT INTO documents (id, markdown, title, edit_token, is_draft, edit_mode)
VALUES (
  'mdfy-ex-feat',
  $$# What ships in mdfy

A quick tour of the pieces, so the rest of the docs make sense.

## Publish

- Drop, paste, or type Markdown → get a permanent URL like `mdfy.app/<id>`.
- The URL is sharable, indexable, and AI-readable (every public URL has a clean-markdown variant at `/raw/<id>`).
- No login required to publish; signed-in users get a hub at `mdfy.app/hub/<you>`.

## Render

- Rust → WebAssembly Markdown engine (comrak) for the heavy lifting.
- highlight.js for code, KaTeX for math, Mermaid for diagrams.
- Dark and light themes; the print stylesheet doubles as the PDF export path.

## Capture

- Paste a ChatGPT/Claude/Gemini share URL → mdfy fetches and converts to clean markdown.
- Chrome extension captures any AI web UI in one click.
- `/mdfy capture` slash-command works inside Claude Code, Cursor, Codex, Aider.

## Compose

- Group related docs into a **Bundle** — that's what this page is part of.
- Bundles run cross-doc analysis (themes, insights, gaps, connections) and expose the result through the bundle's URL.
- A **Hub** rolls all your bundles + docs into one URL that another AI can read end-to-end.

## Deploy

- Paste any mdfy URL into Claude / ChatGPT / Cursor → the model receives clean markdown back.
- `?compact` and `?digest` trim tokens; `?full=1` (on bundle URLs) inlines every member doc.

The thesis: a document is a URL, and that URL should be useful to a human and to an AI without you doing extra work either way.
$$,
  'What ships in mdfy',
  'mdfy-ex-token-feat',
  false,
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ─── The bundle row ────────────────────────────────────────────
INSERT INTO bundles (
  id, title, description, edit_token, is_draft, intent, graph_data, graph_generated_at
)
VALUES (
  'mdfy-ex-bundle',
  'Sample Bundle: Tour of mdfy',
  'A three-document tour of mdfy — formatting, diagrams, and what the platform actually ships. Open the canvas to see how a bundle reads its own contents.',
  'mdfy-ex-token-bnd',
  false,
  'Show a newcomer what mdfy makes possible in three short docs.',
  $${
    "summary": "Three docs covering the core surfaces of mdfy: the markdown formatting it accepts, the diagram dialects it renders, and the platform pieces (publish / capture / compose / deploy) that connect them. Read together they answer the implicit question \"what does mdfy actually do for me.\"",
    "themes": [
      "A doc is a URL, not a file — every surface in mdfy assumes the URL is the unit of work.",
      "Two-way readable — every doc is meant to be read by a human AND fetched cleanly by an AI from the same address.",
      "Compositional surfaces — the same URL primitive scales from Doc to Bundle to Hub without changing the contract."
    ],
    "insights": [
      "The formatting doc never mentions AI directly, but its examples (code blocks, footnotes, tables) are precisely the structures an LLM consumes most reliably — readable formatting is also machine-friendly formatting.",
      "ASCII-and-Mermaid coexistence in the Diagrams doc is the same pattern as digest-and-full in the Bundle URL: keep the cheap representation as the default, let the heavier one stay one flag away.",
      "The Features doc reframes Bundles and Hubs as composition operators over the Doc primitive — they're not separate products, they're URL combinators."
    ],
    "keyTakeaways": [
      "Newcomers should leave with one mental model: doc → bundle → hub, all addressable by URL, all AI-readable by default.",
      "The viral loop runs through URLs: publish, paste into AI, AI cites back."
    ],
    "gaps": [
      "None of the three docs walks through editing an existing doc — the bundle covers what mdfy is, not how to iterate on a doc you already published.",
      "Pricing and account/login behaviour aren't covered (intentional for a 3-doc tour, but flagged for completeness)."
    ],
    "connections": [
      { "doc1": "mdfy-ex-fmt", "doc2": "mdfy-ex-diag", "relationship": "Both are about *what counts as content* in a mdfy doc — the formatting doc handles prose/code/math; the diagrams doc handles visuals." },
      { "doc1": "mdfy-ex-diag", "doc2": "mdfy-ex-feat", "relationship": "Diagrams demonstrate the rendering pipeline that the Features doc summarizes (Rust→WASM + highlight.js + KaTeX + Mermaid)." },
      { "doc1": "mdfy-ex-fmt", "doc2": "mdfy-ex-feat", "relationship": "Formatting choices in doc 1 are the same choices that determine how cleanly the Features doc's claim — \"AI-readable by default\" — actually delivers." }
    ],
    "documentSummaries": {
      "mdfy-ex-fmt": "Standard Markdown formatting (text, lists, tables, code, math, footnotes) as mdfy renders it.",
      "mdfy-ex-diag": "Mermaid and ASCII as two interchangeable diagram dialects, with the asciitomd conversion as the bridge.",
      "mdfy-ex-feat": "The five surfaces — Publish, Render, Capture, Compose, Deploy — and the URL-as-document thesis that ties them together."
    },
    "nodes": [
      { "id": "n-doc-fmt", "label": "Markdown formatting in mdfy", "type": "document", "weight": 1, "documentId": "mdfy-ex-fmt" },
      { "id": "n-doc-diag", "label": "Diagrams: Mermaid + ASCII", "type": "document", "weight": 1, "documentId": "mdfy-ex-diag" },
      { "id": "n-doc-feat", "label": "What ships in mdfy", "type": "document", "weight": 1, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-url", "label": "URL-as-document", "type": "concept", "weight": 3, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-ai", "label": "AI-readable by default", "type": "concept", "weight": 3, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-bundle", "label": "Bundle", "type": "concept", "weight": 2, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-hub", "label": "Hub", "type": "concept", "weight": 2, "documentId": "mdfy-ex-feat" },
      { "id": "n-c-mermaid", "label": "Mermaid", "type": "concept", "weight": 2, "documentId": "mdfy-ex-diag" },
      { "id": "n-c-ascii", "label": "ASCII diagram", "type": "concept", "weight": 2, "documentId": "mdfy-ex-diag" },
      { "id": "n-c-katex", "label": "KaTeX math", "type": "concept", "weight": 1, "documentId": "mdfy-ex-fmt" },
      { "id": "n-c-code", "label": "Code highlighting", "type": "concept", "weight": 2, "documentId": "mdfy-ex-fmt" }
    ],
    "edges": [
      { "source": "n-doc-fmt",   "target": "n-c-code",    "label": "demonstrates",       "weight": 2, "type": "contains" },
      { "source": "n-doc-fmt",   "target": "n-c-katex",   "label": "demonstrates",       "weight": 1, "type": "contains" },
      { "source": "n-doc-diag",  "target": "n-c-mermaid", "label": "demonstrates",       "weight": 2, "type": "contains" },
      { "source": "n-doc-diag",  "target": "n-c-ascii",   "label": "demonstrates",       "weight": 2, "type": "contains" },
      { "source": "n-doc-feat",  "target": "n-c-url",     "label": "argues for",         "weight": 3, "type": "elaborates" },
      { "source": "n-doc-feat",  "target": "n-c-ai",      "label": "argues for",         "weight": 3, "type": "elaborates" },
      { "source": "n-doc-feat",  "target": "n-c-bundle",  "label": "introduces",         "weight": 2, "type": "elaborates" },
      { "source": "n-doc-feat",  "target": "n-c-hub",     "label": "introduces",         "weight": 2, "type": "elaborates" },
      { "source": "n-c-url",     "target": "n-c-ai",      "label": "enables",            "weight": 2, "type": "supports" },
      { "source": "n-c-bundle",  "target": "n-c-url",     "label": "composes",           "weight": 2, "type": "supports" },
      { "source": "n-c-hub",     "target": "n-c-bundle",  "label": "rolls up",           "weight": 2, "type": "supports" },
      { "source": "n-c-mermaid", "target": "n-c-ascii",   "label": "interchangeable with","weight": 1, "type": "supports" }
    ],
    "clusters": [
      { "id": "cl-platform",   "label": "Platform thesis",       "nodeIds": ["n-c-url", "n-c-ai", "n-c-bundle", "n-c-hub"], "color": "#fb923c" },
      { "id": "cl-rendering",  "label": "Rendering vocabulary",  "nodeIds": ["n-c-code", "n-c-katex", "n-c-mermaid", "n-c-ascii"], "color": "#60a5fa" }
    ]
  }$$::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ─── Bundle membership ─────────────────────────────────────────
INSERT INTO bundle_documents (bundle_id, document_id, sort_order, annotation)
VALUES
  ('mdfy-ex-bundle', 'mdfy-ex-fmt',  0, 'Start here — the formatting vocabulary every other mdfy doc assumes.'),
  ('mdfy-ex-bundle', 'mdfy-ex-diag', 1, 'Visual content. Mermaid is the default; ASCII is the LLM-friendly fallback.'),
  ('mdfy-ex-bundle', 'mdfy-ex-feat', 2, 'What the platform actually ships — Publish, Render, Capture, Compose, Deploy.')
ON CONFLICT (bundle_id, document_id) DO NOTHING;
