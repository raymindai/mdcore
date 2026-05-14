# memori.wiki — Gap Analysis vs Current Codebase

> Companion to `MEMORI-WIKI-SPEC.md`. Audited against the
> `apps/web/` codebase on 2026-05-14.
>
> Frames the spec features (F1–F18) by **what's actually shipped**,
> **what's load-bearing for the rebrand promise**, and **what
> sounds important in the spec but isn't critical** to ship before
> renaming to memori.wiki.

---

## 0. TL;DR

The **memory layer** of memori.wiki is already shipped at production
depth: pgvector + HNSW + hybrid BM25/vector retrieval + Anthropic
Haiku reranker + llms.txt + compact form + concept index. mdfy
already returns what a memory product should return.

The **wiki layer** is approximately zero. The word "wiki" implies
inter-page navigation primitives that don't exist in the codebase:
`[[wikilinks]]`, backlinks, and a hub-wide search surface the user
can actually use. Without those, calling the product `memori.wiki`
is a brand lie.

**Critical-path before rebrand** (4 features, ranked):
1. **F1** `[[wikilink]]` syntax + auto-resolve
2. **F2** Backlinks panel
3. **F3** Hub search UI (backend done; UI missing)
4. **F8** Public `/spec` page

Everything else is wait-for-data, nice-to-have, or sub-tier of these
four. The matrix in §3 is the receipts.

---

## 1. What's actually shipped (audited)

### 1.1 Production-grade, exceeds spec

| Spec | Code reality |
|---|---|
| **F4 Concept Index** | `concept_index` + `concept_relations` tables (migrations `027`, `028`). Per-concept page at `app/hub/[slug]/c/[concept]/page.tsx` with neighbor concepts. Builder code in `lib/hub-lint.ts` + auto-management surface in `HubEmbed`. Way past spec. |
| **F5 Semantic Retrieval API** | `POST /api/hub/[slug]/recall` accepts `{ question, k, level: doc/chunk/bundle, hybrid, rerank }`. Doc-level + chunk-level + bundle-level retrieval. Hybrid = BM25 reciprocal-rank-fusion + pgvector cosine. Rerank = Anthropic Haiku cross-encoder. Telemetry logged. Spec asked for `?q=&limit=5`; we ship more. |
| **F6 llms.txt** | `app/hub/[slug]/llms.txt/route.ts` follows the llmstxt.org standard, includes `?compact=1` + `?digest=1` hints. |
| **F7 Compact form** | `?compact` query param wired across raw routes via `lib/markdown-compact.ts`. 30–50% token cuts working. |
| **F11 Version history UI** | `versions` state + `versions.map` UI rendered in MdEditor (line 13931). Restore via `updateDocument`. The Author column (human vs llm-lint) isn't on the UI yet, but the underlying versions table can store it. |
| **F17 Public hub directory** | `/hubs` page exists, listed in `sitemap.ts`, has metadata, indexable. |

### 1.2 Partial / needs explicit work

| Spec | Reality | Gap |
|---|---|---|
| **F3 Hub-wide full-text search** | Backend is done: `documents.search_vector` tsvector (migration `026_hybrid_retrieval`), `/api/search` route, semantic variant. | No `app/hub/[slug]/search/page.tsx`. No search bar in hub viewer. The capability exists but the user can't reach it from the rendered hub. |
| **F9 AI Wiki Lint** | `lib/hub-lint.ts` (297 lines) detects orphans, semantic duplicates, title-mismatch. Hub auto-management panel with 4-level aggressiveness. | Contradictions detection and stale-claim flagging both deferred (per `hub-lint.ts:14` comment: "Other Karpathy lint signals…"). Morning-digest email path not wired. |
| **F14 Native LLM 인식** | `/docs/integrate` ships per-tool snippets (Claude Code / Cursor / Codex / Gemini / Windsurf / Aider). | No formal partner certification, no "Recognized by" page, no public partner directory. |

### 1.3 Spec mismatches in the live data model

| Spec | Reality | Decision needed |
|---|---|---|
| `visibility: 'public' \| 'unlisted' \| 'private'` (3 states) | We track `is_draft` (private vs published) + `allowed_emails` (restricted). 2-axis model, no "unlisted" concept. | Add `unlisted` (indexable=false, accessible=true) or commit to keeping the current axes and update spec. |
| `Hub.isVerified` (blue check) | Column doesn't exist. | Defer; not pre-rebrand. |
| `Doc.outboundLinks: string[]` | Doc table has no link tracking. | Required for F1/F2. New `links` table or `outbound_links` jsonb column. |
| `DocVersion.authoredBy: 'llm-lint'` | `document_versions` table exists but author distinction (human vs llm) isn't surfaced. | Cheap fix when F9 morning-digest lands. |

---

## 2. What's MISSING and load-bearing for the rebrand

These are the features whose absence makes "memori.wiki" a misnomer.

### 2.1 F1 — `[[wikilink]]` syntax + auto-resolve

**Why critical**: The single distinguishing primitive of a wiki vs a
folder of docs. Without inter-doc linking through the title (not the
ID), there is no wiki graph.

**What ships**:
- Markdown post-processor recognises `[[Doc Title]]` pattern, resolves
  to same-hub doc by title (exact → fuzzy → "create draft?" prompt)
- `documents.outbound_links` jsonb (or new `links` table) persisted
  on doc save
- Live editor + rendered viewer show wikilinks as accent-coloured
  underlines that route to `mdfy.app/<docId>` (or `memori.wiki/{user}/<slug>` post-rebrand)

**Build estimate**: 1–2 days. Engine layer (`packages/mdcore`)
post-process pass is the right place; client-side resolver hits
`/api/user/documents` (already exists) for the title→id map.

### 2.2 F2 — Backlinks panel

**Why critical**: F1 without F2 is a write-only graph. Backlinks is
the *read* side of the wiki contract.

**What ships**:
- `links` table (`from_doc_id`, `to_doc_id`, `context_snippet`)
  populated on every doc save
- Doc viewer renders a "Referenced by N docs" section at the bottom,
  clickable
- Inverse index: same `links` table queried by `to_doc_id` gives
  inbound

**Build estimate**: 1 day after F1.

### 2.3 F3 — Hub search UI (backend already done)

**Why critical**: Wiki users expect a search box. Currently the
backend (`documents.search_vector`, `/api/search`) returns results
but no surface lets a hub visitor use it.

**What ships**:
- `app/hub/[slug]/search/page.tsx` with input + results list
- Search box visible from hub home (single text input, top-right)
- Result row: title + 200-char highlighted snippet + link

**Build estimate**: 4–6 hours. Pure UI surface.

### 2.4 F8 — Public `/spec` page

**Why critical**: The fourth brand pillar is "Open spec, not platform
lock-in." A renamed product called `memori.wiki/spec` needs to
actually exist on day one or the pillar reads as marketing.

**What ships**:
- `app/spec/page.tsx` (or under `/docs/spec` if we choose that
  hierarchy) documenting:
  - URL patterns (Hub / Doc / Bundle / Concept / llms.txt /
    `?compact` / `?q=` / `graph.json`)
  - Bundle JSON output shape
  - llms.txt format
  - Retrieval API request/response shape with examples
  - MIT licence claim for the engine
- Linked from About + footer of every viewer page

**Build estimate**: 0.5–1 day. Mostly writing; structure follows
`/docs/integrate` patterns.

---

## 3. Critical vs nice-to-have — full matrix

| # | Feature | Status | Pre-rebrand? | Why this verdict |
|---|---|---|---|---|
| F1 | `[[wikilink]]` | ❌ 0% | **YES, blocker** | Without wikilinks, "wiki" is a lie |
| F2 | Backlinks panel | ❌ 0% | **YES, blocker** | F1 needs its inverse |
| F3 | Hub search UI | ⚠️ backend done | **YES, blocker** | Wiki users expect a search box |
| F4 | Concept Index | ✅ shipped | already done | ✅ |
| F5 | Semantic Retrieval API | ✅ shipped | already done | ✅ |
| F6 | llms.txt | ✅ shipped | already done | ✅ |
| F7 | Compact form | ✅ shipped | already done | ✅ |
| F8 | Public `/spec` page | ❌ 0% | **YES, blocker** | Brand pillar "open spec" requires it |
| F9 | AI Wiki Lint | ✅ ~70% | post-launch deepen | Detection ships, morning-digest deferred |
| F10 | Auto-build (passive intel) | ❌ 0% | post-launch | Nice-to-have, not promise-defining |
| F11 | Version history UI | ✅ shipped | already done | ✅ |
| F12 | Doc graph view (hub-level) | ❌ 0% | **post-launch, not pre** | Bundle canvas ships; hub graph is visual nicety |
| F13 | Bundle templates | ❌ 0% | post-launch | Onboarding helper, not core |
| F14 | Native LLM 인식 | ⚠️ partial | post-launch | `/docs/integrate` is enough for launch; partner cert is 6-month work |
| F15 | Verified profiles | ❌ 0% | post-launch | Trust signal, valuable after 1k+ hubs exist |
| F16 | Inter-hub references | ❌ 0% | post-launch | Network effect, requires scale first |
| F17 | Public hub directory | ✅ shipped | already done | ✅ (depth — featured/trending — is later) |
| F18 | Bundle marketplace (fork) | ❌ 0% | 2027+ | Way too early |

**The four real blockers**: F1, F2, F3, F8.
**Already done**: F4, F5, F6, F7, F11, F17 (six features).
**Defer to post-launch without guilt**: everything else.

---

## 4. What sounds urgent in the spec but actually isn't

These are features the spec lists in Tier 1 or Tier 2 that, on
re-read against the brand promise, are not load-bearing for the
rebrand window.

### 4.1 F9 contradictions + stale detection
The spec lists them under "AI Wiki Lint" Tier 2. They're cool, but
the *visible* part of lint that delivers the brand promise is
**orphan + duplicate + title-mismatch**, which already ships.
Contradictions and stale claims are high-effort LLM jobs whose
output is hard to evaluate. Ship the morning-digest *plumbing* first
with the three signals we already have; add detectors as data
proves their value.

### 4.2 F10 Auto-build (passive capture intelligence)
The spec frames Chrome ext as not just capture but classification +
auto-bundle prompting. Cool. But pre-launch, the Chrome ext doing
*capture* alone already delivers the memory-door promise. Auto-build
is a "deepens the loop" feature, not a "must work day one" feature.

### 4.3 F12 Hub graph view
A pretty surface for the link graph. Useful for showing off orphans
visually. But the *backlinks panel* (F2) already exposes the same
graph information per-doc, and the *concept index* (F4) already
gives the cross-doc navigation. A whole-hub graph view is a nice
power-user tool that doesn't change whether the brand promise lands.

### 4.4 F14 partner certification page
"Recognized by [Cursor, Anthropic, OpenAI]" reads great but requires
those partners to opt in. Launch with `/docs/integrate` showing
per-tool *self-serve* config; pursue formal partner pages once we
have data on whether tools' users are actually pasting our URLs.

### 4.5 Spec's success metrics (§5)
The spec lists adoption metrics (1000 hubs, 15 docs avg) and quality
metrics (recall@5 ≥80%, lint precision ≥90%). These are 6-month
post-launch targets. Don't gate the rebrand on hitting them; gate
the rebrand on whether the *primitives* deliver them once we have
users.

---

## 5. Recommended sequence

**Week 1 (build week)**
- Day 1–2: F1 `[[wikilink]]` engine + resolver + persistence
- Day 3: F2 Backlinks (table + UI)
- Day 4: F3 Hub search UI surface
- Day 5: F8 `/spec` page draft + footer link

**Week 2 (rebrand week)** — out of scope here, separate migration
plan doc per spec §6.

**Months 1–3 post-launch**
- F9 morning digest + author distinction
- F10 auto-build capture pipeline
- F11 author column (human/llm-lint) in version UI
- F12 hub graph view (visual nicety)

**Months 4–6**
- F14 partner certification (if data justifies)
- F15 verified profiles
- F5 + F9 deepening

**Year 2+**
- F16 inter-hub
- F18 marketplace

---

## 6. Concrete next decisions for founder

These are blocking judgement calls before the build can start.

1. **`/spec` vs `/docs/spec` location** — top-level or under docs?
   Top-level is more brand, docs-level is more discoverable. I'd
   recommend `/spec` (top-level) so the URL itself becomes the
   pillar.
2. **`unlisted` visibility — add or skip?** Spec calls for 3 states;
   we have 2. Adding "unlisted" (accessible but not in `/hubs` or
   sitemap) is one column + one filter. Skip if not requested.
3. **Wikilink resolver fallback** — when `[[Foo Bar]]` resolves to
   nothing, do we: (a) show a red broken link, (b) inline-prompt
   "create draft 'Foo Bar'?", (c) silently leave as text? Spec says
   (b); cheapest day-one ship is (a) with (b) deferred.
4. **Backlinks scope** — same-hub only, or include public docs from
   other hubs? Spec implies same-hub Tier 1, inter-hub Tier 3.
   Commit to same-hub for rebrand.
5. **Rebrand timing** — F1–F3+F8 in place first (single rebrand
   PR), or rolling rebrand (rename Now, ship wiki features in
   public)? Spec §8.1 says "ship 4 features, then rebrand." Hold
   the line.

---

*— end of gap analysis —*
