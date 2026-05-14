# mdfy — Product Specification v3.0

> **Personal knowledge hub for the AI era. Doc, Bundle, Hub — three URL scopes any AI can read.**
> "Capture today. Deploy to any AI tomorrow. Same URL."
>
> Last updated: 2026-05-14

---

## 1. What mdfy is

mdfy turns what you write into URLs that any AI can read. Three composable scopes — Doc, Bundle, Hub — let you publish a single note, a project bundle, or a whole personal knowledge graph, and paste them straight into Claude, ChatGPT, Cursor, Codex, or any AI dev tool.

Underneath, mdfy is a **Graph-RAG-as-URL** system: the same URL that renders a document for a human also returns clean markdown plus the pre-computed graph analysis (themes, insights, gaps, concept relations) for an AI. You pay the graph indexing cost once; every downstream AI inherits it for free when the URL is pasted.

```
                  ┌───────────────────────────────────┐
                  │              mdfy                 │
                  │  Personal knowledge hub for AI    │
                  └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬┘
                     │  │  │  │  │  │  │  │  │  │  │
        mdfy.app ────┘  │  │  │  │  │  │  │  │  │  │
        VS Code ────────┘  │  │  │  │  │  │  │  │  │
        Chrome ────────────┘  │  │  │  │  │  │  │  │
        Mac App ──────────────┘  │  │  │  │  │  │  │
        QuickLook ───────────────┘  │  │  │  │  │  │
        CLI ────────────────────────┘  │  │  │  │  │
        MCP Server ────────────────────┘  │  │  │  │
        @mdcore/engine (npm) ─────────────┘  │  │  │
        mdcore.ai (API platform) ────────────┘  │  │
        mdcore.org (OSS community) ─────────────┘  │
        mdcore.md (spec + playground) ─────────────┘
```

Every surface speaks the same engine, same renderer, same URL contract.

---

## 2. Core principles

1. **Markdown is the engine, not the interface.** Users never need to learn MD.
2. **A document is a URL, not a file.** Everything mdfy ships assumes URL is the unit of work.
3. **Two-way readable by default.** Every public URL serves clean markdown to AIs without configuration.
4. **Composable scopes.** Doc → Bundle → Hub: same primitive, different scope. Project context picks the bundle; personal context picks the hub.
5. **Cross-AI portability is the moat.** A single AI vendor can build deeper integration against itself; none can deliver a URL that works across competitors. mdfy bets on that asymmetry.
6. **Zero friction.** No login required to publish. Sign-in unlocks sync, hub, and bundles.
7. **Build in public.** 1 founder + AI pair-programming is the marketing.

---

## 3. URL architecture (the load-bearing primitive)

| Scope | URL shape | What it carries |
| ----- | --------- | --------------- |
| **Doc** | `mdfy.app/<id>` | A single document. Tightest scope, lowest token cost. |
| **Bundle** | `mdfy.app/b/<id>` | 3-20+ related docs + the canvas analysis (themes / insights / gaps / connections / concept sub-graph). Recommended default for project-scoped AI tool config. |
| **Hub** | `mdfy.app/hub/<slug>` | The whole personal knowledge graph, hub-wide concept_index. Broad context — use sparingly. |

Each URL has an LLM-friendly variant at `/raw/<id>`, `/raw/b/<id>`, `/raw/hub/<slug>` that returns clean markdown.

**Query knobs (token economy)**:
- `?compact` — trim whitespace, drop noisy quotes
- `?full=1` *(bundle only)* — inline every member doc body
- `?graph=0` *(bundle only)* — drop the analysis section
- `?digest=1` *(hub only)* — concept-clustered summary instead of per-doc index

**Frontmatter signals the AI can parse**:
- `mdfy_bundle: 1` / `mdfy_doc: 1` / `mdfy_hub: 1`
- `analysis_generated_at` / `analysis_stale: true` for bundles
- `mdfy_permission` / `reason` on permission errors

---

## 4. Privacy model

Three states, applied uniformly to docs, bundles, hubs:

| State | What it means | Fetcher needs |
| ----- | ------------- | ------------- |
| **Public** | Published; no allowed_emails | Nothing — anon fetches succeed |
| **Restricted** | Published; `allowed_emails` set | `Authorization: Bearer <token>` (owner) or `X-User-Email: <email>` matching an allowed address |
| **Private** | Not yet published (legacy: `is_draft=true`) | Owner JWT only; everyone else gets 404 |

**Invariant**: every gating decision happens server-side in the raw-fetch route. The URL never leaks content the rendered viewer wouldn't already show.

**Removed**: password-protect mode and document expiry. Both were intentionally retired — password mode added flow friction without value AI tools can use; expiry contradicted the permanent-URL policy. Existing legacy rows that carry `password_hash` or `expires_at` still gate, but no new UI surface offers them.

---

## 5. Ecosystem surfaces

### 5.1 mdfy.app — web (core product)

**"Paste. See it beautiful. Share."**

| Feature | Status |
| ------- | ------ |
| WYSIWYG editor (Tiptap + CodeMirror Source view) | ✅ |
| Markdown rendering (GFM, code highlighting, KaTeX, Mermaid) | ✅ |
| Doc URL (`mdfy.app/<id>`) + raw markdown variant | ✅ |
| Bundle: canvas + graph_data + URL (`mdfy.app/b/<id>`) | ✅ |
| Hub: concept_index + URL (`mdfy.app/hub/<slug>`) | ✅ |
| Auto-save to Supabase, optimistic UI | ✅ |
| AI conversation auto-detect + format | ✅ |
| File import (PDF, DOCX, CSV, LaTeX, 15+ formats) | ✅ |
| Embed (iframe) | ✅ |
| Sharing: Public / Restricted (`allowed_emails`) / Private | ✅ |
| Hub auto-management (orphan / duplicate detection, lint) | ✅ |
| Sample Bundle: Tour of mdfy (`mdfy.app/b/mdfy-ex-bundle`) | ✅ |
| Viral badge ("Published with mdfy.app") | 🔜 |
| Pro tier (price TBD, post-beta) | Planned |

### 5.2 VS Code Extension

mdfy.app's WYSIWYG + cloud sync, inside VS Code. Same Rust→WASM engine. Bidirectional auto-save.

### 5.3 Chrome Extension

ChatGPT / Claude / Gemini one-click capture → mdfy.app document.

### 5.4 mdfy for Mac (desktop)

Offline-first editor, cloud sync, Finder integration, menu-bar quick capture.

### 5.5 QuickLook plugin

Finder spacebar → mdfy-quality preview (KaTeX + Mermaid + code highlighting) for .md files.

### 5.6 MCP Server

Hosted HTTP endpoint for Claude Web; npm package for Claude Desktop, Cursor, Windsurf. Tools: `mdfy_create`, `mdfy_update`, `mdfy_search`, `mdfy_publish`, `mdfy_list`, `mdfy_read`, `mdfy_delete`.

### 5.7 CLI (`@mdcore/terminal`)

```bash
mdfy publish < notes.md         # publish stdin → mdfy.app URL
mdfy bundle add <bundle-id> <doc-id>
mdfy capture                    # capture current tmux pane
```

### 5.8 @mdcore/engine (npm)

The same Rust→WASM renderer + post-processing pipeline used by mdfy.app, exported as a library for developers building their own surfaces.

### 5.9 mdcore.ai (API platform, future)

Programmatic render + convert + bundle endpoints for third-party AI tool integrations.

---

## 6. Cross-AI integration (`/docs/integrate`)

The compositional URL primitives plug straight into the context files every AI dev tool already reads:

| Tool | File | Default URL scope |
| ---- | ---- | ----------------- |
| Claude Code | `CLAUDE.md` (project) / `~/.claude/CLAUDE.md` (global) | Bundle for project, Hub for global |
| Cursor | `.cursor/rules/*.mdc` | Bundle |
| Codex CLI | `AGENTS.md` | Bundle |
| Gemini CLI | `GEMINI.md` | Bundle |
| Windsurf | `.windsurfrules` | Bundle |
| Aider | `CONVENTIONS.md` | Bundle |

**Pattern**: keep tool-specific rules in their respective files; put the mdfy URL in `AGENTS.md` (the de facto cross-tool convention). One line, every agent in the repo reads it on every session.

---

## 7. Tech layers

```
┌─ User surfaces ───────────────────────────────────┐
│  mdfy.app · VS Code · Chrome · Mac · QuickLook    │
│  CLI · MCP Server · API                           │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────┴───────────────────────────────┐
│  @mdcore/engine (shared engine)                   │
│  ┌─ Rust WASM core ─────────────────────────────┐ │
│  │  comrak parser → HTML                        │ │
│  │  flavor detection (GFM / Obsidian / MDX)     │ │
│  │  frontmatter parsing · TOC extraction        │ │
│  └──────────────────────────────────────────────┘ │
│  ┌─ JS post-processing ─────────────────────────┐ │
│  │  highlight.js · KaTeX · Mermaid styling      │ │
│  │  ASCII diagram · image handling              │ │
│  └──────────────────────────────────────────────┘ │
│  ┌─ Conversion utilities ───────────────────────┐ │
│  │  HTML↔MD · AI dialogue · CLI · CSV · JSON    │ │
│  │  LaTeX · RST · RTF · XML                     │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────┴───────────────────────────────┐
│  Graph RAG layer (Supabase + Postgres + pgvector) │
│  ┌─ Vector index ───────────────────────────────┐ │
│  │  document_chunks + bundle_embeddings         │ │
│  │  text-embedding-3-small (1536-d), HNSW       │ │
│  └──────────────────────────────────────────────┘ │
│  ┌─ Ontology ───────────────────────────────────┐ │
│  │  concept_index (hub-wide, in /raw/hub/*)     │ │
│  │  concept_relations (typed edges)             │ │
│  │  ai_graph (bundle-scoped, in /raw/b/*)       │ │
│  └──────────────────────────────────────────────┘ │
│  ┌─ Hybrid retrieval ───────────────────────────┐ │
│  │  semantic + keyword + graph traversal        │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────┴───────────────────────────────┐
│  Supabase (auth + storage + cron)                 │
│  documents · bundles · profiles · share state     │
│  RLS-protected; server-only access via service    │
│  role for app code, anon key blocked from         │
│  PostgREST.                                       │
└───────────────────────────────────────────────────┘
```

---

## 8. Pricing

| Tier | When | What's in |
| ---- | ---- | --------- |
| **Beta** | Now | Everything unlocked. No credit card. Frame as "Free during beta". |
| **Pro** | After beta (price TBD) | No viral badge, custom domain, analytics, priority AI mdfy, **auto-analyze** for bundles/hubs. |

**Permanent policies (not tier features)**:
- Documents never expire.
- Public URLs are always AI-readable (`/raw/*` returns clean markdown).
- Sharing model (Public / Restricted / Private) is the same on every tier.

**Auto-analyze deep-dive**: the bundle `graph_data` and hub `concept_index` are computed once and cached. On Free tier, the user clicks "Re-analyze" when they want fresh analysis; the URL response carries `analysis_stale: true` until they do. On Pro, a stale fetch triggers background regeneration so the next fetch is fresh — hands-free. Pro-only because each regen is a paid LLM call.

---

## 9. Execution priority

### Now (pre-launch)
1. v6 surface polish (Hub, Bundle canvas, Start, Settings)
2. `/docs/integrate` discovery surfaces — Hub banner, Bundle Deploy panel, About page
3. Pre-launch QA pass (Chrome extension capture across AIs, GitHub import live test)

### Launch (free, no Stripe)
4. Viral badge ("Published with mdfy.app")
5. Mdfy.app + Chrome ext + VS Code ext + MCP server in one launch
6. HN Show HN, Reddit, Twitter

### Stabilisation (post-launch)
7. Stripe + Pro tier (auto-analyze, badge removal, custom domain)
8. Sample Bundles for common use cases (research, decisions, team KB)

### Ecosystem expansion
9. mdfy for Mac (offline-first)
10. QuickLook plugin
11. @mdcore/engine npm public release
12. mdcore.ai API platform

**Principle: one thing at a time. Move to the next only when the previous works.**

---

## 10. Competitive position

| | Notion | Obsidian | Karpathy LLM Wiki | Microsoft GraphRAG | **mdfy** |
| --- | --- | --- | --- | --- | --- |
| **Cross-AI portability** | ❌ own AI only | ❌ | ✅ | ❌ internal use | ✅ paste URL into any AI |
| **Capture surfaces** | Internal | Plugins | DIY | ❌ | Chrome / MCP / CLI / VS Code |
| **Graph layer** | ❌ | Manual links | ❌ | ✅ deep, internal | ✅ Graph RAG shipped in URL payload |
| **Composable scopes** | Pages / spaces | Vault | 1 unified wiki | 1 corpus | Doc / Bundle / Hub URLs |
| **Rendering quality** | Average | Good | Plain markdown | n/a | Best-in-class (Rust→WASM) |
| **Offline** | Limited | ✅ | DIY | n/a | ✅ (Mac app, VS Code) |
| **Zero friction publish** | Login required | Self-hosted | Self-hosted | n/a | ❌ no login required |
| **Multi-tenant share** | ✅ | ❌ | ❌ | ❌ | ✅ |

**mdfy's structural moat**: Graph-RAG-as-URL with composable scopes. A single AI vendor can build deeper Graph RAG against its own model than mdfy. None can deliver a graph URL that works across their competitors. The portability of the graph is the product, and the doc/bundle/hub split lets that portability map 1:1 to how `AGENTS.md` / `CLAUDE.md` / `.cursor/rules` actually want context (scoped, not unified).

vs **Karpathy's LLM Wiki vision**: same primitives (URL-addressable personal knowledge, two-way readable), different structure. Karpathy = one wiki per person (curated). mdfy = one hub + N bundles + M docs per person (composable + AI-synthesised). Karpathy is the upper bound for what well-curated wikis can give a power user; mdfy is the system for the 99% who never curate but capture constantly.

---

*Version: 3.0*
*Author: Hyunsang Cho + Claude*
