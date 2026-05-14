#!/usr/bin/env python3
"""
Generates 037_demo_account_expand.sql.template.

Adds ~44 more documents (to reach 50 total with the 036 seed),
7 my-section folders, 3 bundle folders, and 5 more bundles (to
reach 7 total) — all attributed to the demo@mdfy.app user via the
`<DEMO_USER_ID>` placeholder.

Permission variety on the new docs:
  - 6 private (is_draft=true)
  - 6 restricted (allowed_emails non-empty)
  - 32 public (no extras)
  (Password protection skipped — the new-doc API has had password
  features deprecated since route.ts:187, so seeding password_hash
  would just lock the doc behind a feature with no UI.)

Permission variety on the new bundles:
  - 1 private
  - 1 restricted
  - 1 password-protected
  - 2 public

Run from the repo root:
    python3 apps/web/supabase/migrations/_demo_seed_generator.py \
      > apps/web/supabase/migrations/037_demo_account_expand.sql.template
"""

from __future__ import annotations

# Token used inside <<HEREDOC>> tags so the generated SQL stays readable.
DM = "$MD$"

# ─── Folders (my-section) ────────────────────────────────────────────
MY_FOLDERS = [
    ("folder-demo-conversations", "AI Conversations", 1),
    ("folder-demo-decisions",      "Engineering Decisions", 2),
    ("folder-demo-research",       "Research Notes", 3),
    ("folder-demo-strategy",       "Strategy & GTM", 4),
    ("folder-demo-formatting",     "Writing & Formatting", 5),
    ("folder-demo-integrate",      "AI Tool Integration", 6),
    ("folder-demo-private-vault",  "Private Vault", 7),
]

# ─── Folders (bundles-section) ───────────────────────────────────────
BUNDLE_FOLDERS = [
    ("folder-demo-bundles-ai",          "AI Memory",          1),
    ("folder-demo-bundles-engineering", "Engineering",        2),
    ("folder-demo-bundles-vault",       "Private Bundles",    3),
]

# ─── Documents ───────────────────────────────────────────────────────
# Tuple: (id, title, folder_id_or_None, permission, body)
# permission: 'public' | 'private' | 'restricted' | 'password'

# Helper: short body builder
def body(intro: str, sections: list[tuple[str, str]]) -> str:
    out = [intro, ""]
    for h, t in sections:
        out += [f"## {h}", "", t, ""]
    return "\n".join(out).strip()

DOCS = []

# Conversations (4 new, joining the existing demo-ai-memory-chat → 5 total)
DOCS += [
    ("demo-conv-claude-rust-perf", "Claude on Rust performance pitfalls",
     "folder-demo-conversations", "public",
     body("> Captured chat with Claude Sonnet, 2026-04-02. Cleaned up.",
          [("Premise", "I asked Claude to walk through three places we lose Rust perf in the WASM build."),
           ("What it said", "1. **alloc on hot paths** — we leak `String::new()` in `flavor.rs`.\n2. **bound-check loops** — the per-line scan in `postprocess.rs` runs without `unsafe { get_unchecked }` even where we know the bound."),
           ("What I'm doing", "Skipping (1) for now (LOC cost ↑, perf ↓ <1%). Filed (2) as an issue, will pair with the WASM rebuild PR.")])),
    ("demo-conv-gpt5-token-budget", "GPT-5 on context-budget rituals",
     "folder-demo-conversations", "public",
     body("> ChatGPT-5 share link → mdfy. 2026-04-09.",
          [("Setup", "I dumped the AGENTS.md proposal + 4 hub bundles."),
           ("Output", "It built a 'context budget' worksheet I genuinely use now: pre-allocate 30% to project context, 30% to recent edits, 40% to live conversation."),
           ("Caveat", "Worksheet over-fits to *coding* contexts. For research the ratios invert.")])),
    ("demo-conv-gemini-image-prompt", "Gemini on diagram prompting",
     "folder-demo-conversations", "public",
     body("> Gemini 2.5 Pro, after I asked it to generate Mermaid for a 3-tier auth flow.",
          [("Insight", "Gemini suggested I describe the *flow* (who calls who, what data crosses the boundary) instead of node shapes. The diagram came out tighter."),
           ("Pattern", "Always: actors → calls → data → constraints. The shapes follow.")])),
    ("demo-conv-claude-onboarding", "Claude pair: writing the v6 onboarding overlay",
     "folder-demo-conversations", "public",
     body("> Working session pulling the 5-slide welcome design.",
          [("Decision", "One CTA per slide. The brand badge sits above the title only on slide 1."),
           ("Why", "User testing showed people read 1.3 cards before clicking somewhere. 5 slides × multiple CTAs = 0% scroll-completion in the dogfood test.")])),
]

# Decisions (5 new + 1 existing = 6 total)
DOCS += [
    ("demo-dec-postgres-vs-pinecone", "Decision: Supabase pgvector over Pinecone",
     "folder-demo-decisions", "public",
     body("> Logged 2026-03-08 after a 2-day evaluation.",
          [("Choice", "pgvector + HNSW inside the existing Supabase Postgres, NOT a managed vector DB."),
           ("Why", "Avoided a second vendor + second auth layer + second migration story. Read latency on our hub recall (200-doc index) is 18ms p99 — well inside our 100ms budget."),
           ("Tradeoff", "When we grow past ~50K docs/user we'll need to re-evaluate.")])),
    ("demo-dec-rust-wasm-engine", "Decision: Keep the Markdown engine in Rust + WASM",
     "folder-demo-decisions", "public",
     body("> Recurring conversation that I've now closed.",
          [("Choice", "comrak (Rust) compiled to WASM stays the renderer. No move to remark or markdown-it."),
           ("Why", "GFM correctness + perf. Rebuilds in CI in 38s.")])),
    ("demo-dec-haiku-reranker", "Decision: Anthropic Haiku for hub-recall reranker",
     "folder-demo-decisions", "public",
     body("> Documented 2026-04-11.",
          [("Choice", "Haiku 4.5 reranks the top-30 hybrid result down to top-10."),
           ("Why", "Cheaper than Voyage rerank; quality is within noise on our internal eval set. Single-vendor story for now."),
           ("Followup", "Re-eval when Voyage-rerank-2.5 drops.")])),
    ("demo-dec-bundle-graph-inline", "Decision: Inline graph_data in bundle URLs",
     "folder-demo-decisions", "public",
     body("> Linked to demo-decision-graph-url; this is the engineering version.",
          [("Choice", "Bundle digest carries graph_data as a JSON-LD block in the markdown response."),
           ("Why", "Receiving AI gets themes/insights/relations without a second fetch. Adds ~3KB per bundle.")])),
    ("demo-dec-no-wikilinks", "Decision: Drop [[wikilinks]] permanently",
     "folder-demo-decisions", "public",
     body("> See /spec for the public statement. This is the internal version.",
          [("Choice", "No [[]] syntax. We rely on AI-derived concept_index + related-in-this-hub instead."),
           ("Why", "The AI-era wiki bet is that authoring shouldn't require linking markup; the system links for you."),
           ("Risk", "Obsidian users miss it. We accept that.")])),
]

# Research (5 new + 1 existing = 6)
DOCS += [
    ("demo-res-graph-rag-microsoft", "Microsoft GraphRAG: what we learned",
     "folder-demo-research", "public",
     body("> Read the 2024 paper and the follow-ups. Notes for the team.",
          [("Approach", "Builds a knowledge graph from a corpus, then runs a community-detection step. Queries traverse the graph."),
           ("What's good", "Multi-hop reasoning. Beats naive RAG on 'compare X and Y across documents.'"),
           ("Why it's not us", "It's a *service*. mdfy ships the graph in the URL response. Different shape.")])),
    ("demo-res-mem0-vs-letta", "Mem0 vs Letta: extracted memory comparison",
     "folder-demo-research", "public",
     body("> Side-by-side after 3 weeks of usage.",
          [("Mem0", "Faster extraction. Better at facts ('user's company is X')."),
           ("Letta", "Better at preferences ('user prefers shorter responses'). Looser memory boundary."),
           ("Both", "Extracted memory ≠ authored memory. mdfy is the second.")])),
    ("demo-res-llms-txt-adoption", "llms.txt adoption: who's actually shipping it",
     "folder-demo-research", "public",
     body("> 2026-05 snapshot.",
          [("Adopting", "Vercel, Cloudflare, Anthropic docs, Resend, Trigger.dev, mdfy."),
           ("Considering", "Several DX platforms (no specific names yet)."),
           ("Pattern", "Devtool companies first. Consumer-facing sites haven't moved.")])),
    ("demo-res-karpathy-llm-wiki-expanded", "Karpathy wiki: the parts that map",
     "folder-demo-research", "public",
     body("> Expansion of the public summary in demo-karpathy-llm-wiki.",
          [("Maps cleanly", "Personal knowledge as the input. Wiki shape. AI as the reader."),
           ("Doesn't map", "Local-only assumption. Karpathy's spec is Obsidian-first; we're URL-first."),
           ("Bridge", "Per-project scopes (bundles) give us the AGENTS.md / .cursor/rules surface area Karpathy's local-file world doesn't reach.")])),
    ("demo-res-context-engineering", "Context engineering: where it goes next",
     "folder-demo-research", "public",
     body("> Trend notes, May 2026.",
          [("Bet", "'Prompt engineering' collapses into 'context engineering' over the next 12 months."),
           ("Evidence", "Cursor's project context, Claude's projects, ChatGPT's GPTs — all converging on shaped context as the primitive."),
           ("Implication", "mdfy's URL-shaped memory is the right primitive at the right time. We need to communicate it as 'context, deployable.'")])),
]

# Strategy (5 new + 1 existing = 6)
DOCS += [
    ("demo-strat-cross-ai-thesis", "Cross-AI as a structural moat",
     "folder-demo-strategy", "public",
     body("> The argument distilled.",
          [("Claim", "AI companies cannot build cross-AI memory. Their incentive is to keep you in their walled garden."),
           ("Implication", "The 'layer above AI' is structurally available only to a non-AI-company."),
           ("Risk", "Someone else builds it first. Speed matters.")])),
    ("demo-strat-pricing-model", "Pricing model thoughts",
     "folder-demo-strategy", "restricted",
     body("> Internal pricing scratchpad. Restricted to the team.",
          [("Free", "Capture + hub + cross-AI deployment forever."),
           ("Pro tier", "No-badge, custom domain, analytics, auto-analyze (stale-fetch triggers background graph regen)."),
           ("Price band", "$8-12/mo working range. TBD until beta closes.")])),
    ("demo-strat-launch-day", "Launch day: what success looks like",
     "folder-demo-strategy", "public",
     body("> Show HN day plan.",
          [("Top of front page for 4h", "Realistic upside."),
           ("100 sign-ups", "Reasonable mid case."),
           ("Two follow-up posts", "Build narrative continuity for week 2.")])),
    ("demo-strat-gtm-3-channels", "GTM: the three channels I'll work",
     "folder-demo-strategy", "public",
     body("> Concentration > spray.",
          [("HN", "Show HN once at launch + follow-up in 4 weeks."),
           ("Founder Twitter/X", "Daily build-in-public, low-effort posts. The dogfood URL itself is a tweet."),
           ("Cold outreach to design tool YouTubers", "Their audience overlaps with our ICP and demos great on camera.")])),
    ("demo-strat-anti-pattern", "What I'm NOT doing",
     "folder-demo-strategy", "public",
     body("> Negative space matters.",
          [("Not building", "A vector store, a graph DB, a fine-tuned model, an AI provider, a workspace, a comments system."),
           ("Not chasing", "The Notion shape. The Roam shape. The Obsidian shape."),
           ("Not optimizing", "Conversion rate, MAU, viral coefficient. Not yet. The product has to be the story first.")])),
]

# Formatting (3 new + 1 existing = 4)
DOCS += [
    ("demo-fmt-math-showcase", "Math: every flavour we render",
     "folder-demo-formatting", "public",
     body("> Inline + block KaTeX coverage.",
          [("Inline", "Euler's identity: $e^{i\\pi} + 1 = 0$. Cauchy-Schwarz: $|\\langle u, v \\rangle| \\le \\|u\\|\\|v\\|$."),
           ("Block", "$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$"),
           ("Matrices", "$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$")])),
    ("demo-fmt-mermaid-zoo", "Mermaid: 6 diagram types side by side",
     "folder-demo-formatting", "public",
     body("> Quick tour.",
          [("Flowchart", "```mermaid\nflowchart LR\n  A[Capture] --> B[Hub]\n  B --> C[Any AI]\n```"),
           ("Sequence", "```mermaid\nsequenceDiagram\n  Claude->>+mdfy: GET /hub/demo\n  mdfy-->>-Claude: markdown + graph\n```"),
           ("Pie", "```mermaid\npie title Time spent\n  \"Capture\" : 30\n  \"Read\" : 50\n  \"Edit\" : 20\n```")])),
    ("demo-fmt-tables-showcase", "Tables: alignment, code, math inline",
     "folder-demo-formatting", "public",
     body("",
          [("Provider comparison",
            "| Provider | Latency | Cost / 1M | Quality |\n|---|---:|---:|:---:|\n| Voyage | 12ms | $0.18 | A |\n| Cohere | 28ms | $0.20 | B+ |\n| OpenAI ada-2 | 8ms | $0.10 | B |"),
           ("Math inside cells",
            "| Concept | Notation |\n|---|---|\n| Identity | $e^{i\\pi}+1=0$ |\n| Norm | $\\|x\\|_2$ |")])),
]

# Integrate (3 new + 1 existing = 4)
DOCS += [
    ("demo-int-claude-code", "Wiring mdfy into Claude Code",
     "folder-demo-integrate", "public",
     body("> Tested against Claude Code v1.x.",
          [("Add to CLAUDE.md", "```\nWhen reading external context, always check mdfy.app/hub/demo first.\n```"),
           ("Result", "Claude pulls the hub URL as part of session context. Tokens stay in budget via ?compact.")])),
    ("demo-int-codex-agents-md", "Wiring mdfy into Codex via AGENTS.md",
     "folder-demo-integrate", "public",
     body("> Codex CLI + AGENTS.md.",
          [("Snippet", "```\n## Context\nLoad mdfy.app/hub/demo before answering domain questions.\n```"),
           ("Caveat", "Codex caches AGENTS.md per session — restart after edits.")])),
    ("demo-int-mcp-server", "mdfy MCP server: setup in 4 lines",
     "folder-demo-integrate", "public",
     body("> For Claude Desktop, Cursor, any MCP-enabled tool.",
          [("Add to mcp_config.json", "```json\n{\n  \"mdfy\": {\n    \"command\": \"npx\",\n    \"args\": [\"-y\", \"@mdfy/mcp-server\"]\n  }\n}\n```"),
           ("Tools exposed", "`mdfy_read`, `mdfy_search`, `mdfy_create`, `mdfy_update`, `mdfy_publish`, `mdfy_delete`, `mdfy_list`.")])),
]

# Private Vault (6 new — all locked in various ways)
DOCS += [
    ("demo-vault-runway-numbers", "Runway numbers (private)",
     "folder-demo-private-vault", "private",
     body("> Internal only. Numbers as of 2026-05.",
          [("Burn", "~$X/mo"),
           ("Runway", "N months at current burn."),
           ("Plan B", "Consulting bridge if HN doesn't trigger PMF signal by month 3.")])),
    ("demo-vault-hiring-bar", "Hiring bar (private)",
     "folder-demo-private-vault", "private",
     body("> Notes I refer to when I think about a second engineer.",
          [("Minimum", "Ships, communicates, can write."),
           ("Strong yes signals", "Has built something users actually used. Has changed their mind in writing.")])),
    ("demo-vault-investor-list", "Investor outreach list (restricted)",
     "folder-demo-private-vault", "restricted",
     body("> Restricted to a couple advisors.",
          [("Tier 1", "Pre-seed funds focused on AI infra. Names redacted in this demo."),
           ("Tier 2", "Operator-angels with ChatGPT-era exits.")])),
    ("demo-vault-pricing-experiments", "Pricing experiments planned (restricted)",
     "folder-demo-private-vault", "restricted",
     body("> Shared with the small advisor circle.",
          [("Experiment 1", "$8 vs $12 vs $16, single page test."),
           ("Experiment 2", "Annual-only vs monthly-default."),
           ("Experiment 3", "Free-with-badge as the always-on plan, no time limit.")])),
    ("demo-vault-roadmap-draft", "Roadmap draft (private)",
     "folder-demo-private-vault", "private",
     body("> Private — author only.",
          [("Q3", "Public launch + Stripe."),
           ("Q4", "Custom domains. Analytics dashboard. iOS share-sheet."),
           ("Q1 next year", "Team plan if signal supports it.")])),
    ("demo-vault-personal-journal", "Founder journal (restricted)",
     "folder-demo-private-vault", "restricted",
     body("> Restricted: a couple advisors.",
          [("Today", "Shipped sign-out bundle clear. Felt good."),
           ("This week", "Demo expand. KO docs. Show HN draft polish."),
           ("Watching for", "Burnout signs. Pacing matters.")])),
]

# Root level (no folder) — 13 docs
DOCS += [
    ("demo-root-readme", "README — start here",
     None, "public",
     body("> The entry point for this demo hub.",
          [("What's in here", "50 documents. 7 folders. 7 bundles. 12 concepts. All authored to look like a real working hub."),
           ("How to use it", "Click around. Paste any URL into Claude/Cursor. The hub URL itself loads as context.")])),
    ("demo-root-show-hn-plan", "Show HN plan (working draft)",
     None, "public",
     body("> Living plan I refine before launch day.",
          [("Title", "Show HN: mdfy – Your AI memory, deployable to any AI"),
           ("Hour 0", "Post at 7AM PT Wednesday."),
           ("Hour 0-6", "Online to respond."),
           ("Hour 6-24", "Tweet thread, email Substack, ping 2 friend group chats.")])),
    ("demo-root-meeting-notes-yc", "YC mock interview notes",
     None, "restricted",
     body("> Restricted: shared with prep partner.",
          [("Question that hit", "Why won't OpenAI/Anthropic just build this?"),
           ("Answer that landed", "Their incentive is the wall. The cross-AI position is structurally mine."),
           ("Question I fumbled", "What's the wedge that makes this unbundleable from a 'memory feature' in Notion?")])),
    ("demo-root-personal-stack", "My current personal stack",
     None, "public",
     body("> The actual tools I work in.",
          [("Editor", "VS Code + Claude Code + Cursor (pick one per session)."),
           ("AI", "Claude Opus 4.7 + ChatGPT-5 + Gemini 2.5 Pro. Three because each forgets the others' context."),
           ("Capture", "mdfy. (Of course.)"),
           ("Calendar", "Cron. (Anti-meeting setup.)")])),
    ("demo-root-mistakes-i-made", "Mistakes I made building v6",
     None, "public",
     body("> Honest list.",
          [("1", "Built [[wikilinks]] before deciding we were a wiki. Threw it out two weeks later."),
           ("2", "Tried y-prosemirror for the editor. Wasted 3 days. Reverted to contentEditable."),
           ("3", "Wrote the AGENTS.md integration before testing it lived in Cursor first. Cursor cached the file and I thought my code was broken.")])),
    ("demo-root-feature-ideas", "Feature ideas backlog",
     None, "public",
     body("> Ranked by gut-feel value:effort.",
          [("Top 5", "1. Inline graph in bundle URL. 2. Custom hub theme. 3. Slack capture. 4. Email-in capture. 5. Hub-to-PDF export."),
           ("Bottom of mind", "Mobile app. Apple Watch. Voice capture.")])),
    ("demo-root-readme-for-claude", "How Claude should read this hub",
     None, "public",
     body("> Meta-doc, intended for an AI reading the hub URL.",
          [("Priority order", "1. concept_index — the map. 2. Bundles — synthesised takes. 3. Individual docs — primary sources."),
           ("Skip rules", "Don't fetch private-vault docs. They'll 403.")])),
    ("demo-root-glossary", "Glossary",
     None, "public",
     body("> Terms used across the hub.",
          [("Hub", "A user's public URL. Concept index + linted suggestions live here."),
           ("Bundle", "A topical grouping of docs with synthesised graph_data."),
           ("Doc", "A single markdown URL.")])),
    ("demo-root-rfc-permissions", "RFC: 3-state permission model",
     None, "public",
     body("> Done. Shipping in v6.",
          [("Three states", "Public / Restricted / Private."),
           ("Why not 'Draft'", "Word kept reading as 'unfinished.' Private is the actual UX."),
           ("Restricted means", "allowed_emails set, anyone else 403.")])),
    ("demo-root-rfc-bundle-digest", "RFC: bundle digest format",
     None, "public",
     body("> Shipped 2026-04.",
          [("Spec", "Bundle URL returns markdown. ?graph=0 omits graph_data. ?full=1 inlines member docs. ?compact strips low-density sections."),
           ("Goal", "One URL, every AI reads it, token-cost-tunable.")])),
    ("demo-root-rfc-recall-api", "RFC: hub recall API",
     None, "public",
     body("> POST /api/hub/{slug}/recall.",
          [("Hybrid", "BM25 + pgvector union, top-30 → Haiku reranker → top-k."),
           ("Why hybrid", "Lexical recovers exact-match keywords vector forgets. Vector recovers semantic equivalents lexical misses.")])),
    ("demo-root-onboarding-script", "Onboarding script: 5 slides",
     None, "public",
     body("> Source of truth for the WelcomeOverlay copy.",
          [("Rule", "One CTA per slide."),
           ("Slide 1", "Hook on the v6 thesis. (Knowledge hub for AI era.)"),
           ("Slides 2-4", "Capture → hub → deploy."),
           ("Slide 5", "Surfaces.")])),
    ("demo-root-claude-prompt-pack", "Claude prompts I keep reusing",
     None, "public",
     body("> Personal pack.",
          [("Re-read mode", "'Read this URL as context, summarise in 3 bullets, then ask me one question.'"),
           ("Decision mode", "'You're an opinionated EM. The context is at URL. Recommend an action and explain the tradeoff.'"),
           ("Audit mode", "'List every assumption in this doc that isn't backed by evidence in the hub.'")])),
]

assert len(DOCS) == 44, f"Expected 44 new docs, got {len(DOCS)}"

# ─── Bundles (5 new + 2 existing = 7) ────────────────────────────────
BUNDLES = [
    ("demo-bundle-research-frontier", "AI memory research: the public frontier",
     "Side-by-side notes on Mem0, Letta, Microsoft GraphRAG, Karpathy's LLM Wiki, llms.txt adoption.",
     "folder-demo-bundles-ai", "public",
     ["demo-res-graph-rag-microsoft", "demo-res-mem0-vs-letta", "demo-res-llms-txt-adoption", "demo-res-karpathy-llm-wiki-expanded"]),
    ("demo-bundle-launch-strategy", "Launch strategy: Show HN week",
     "Pre-launch plan + GTM channels + what not to do. The strategy bundle a reviewer can read end-to-end.",
     "folder-demo-bundles-engineering", "public",
     ["demo-root-show-hn-plan", "demo-strat-launch-day", "demo-strat-gtm-3-channels", "demo-strat-anti-pattern", "demo-strat-cross-ai-thesis"]),
    ("demo-bundle-engineering-decisions", "Engineering decisions (q1+q2 2026)",
     "Five locked-in calls — pgvector, Rust+WASM, Haiku reranker, inline bundle graph, no wikilinks.",
     "folder-demo-bundles-engineering", "restricted",
     ["demo-dec-postgres-vs-pinecone", "demo-dec-rust-wasm-engine", "demo-dec-haiku-reranker", "demo-dec-bundle-graph-inline", "demo-dec-no-wikilinks"]),
    ("demo-bundle-private-financials", "Financials + runway (private)",
     "Runway numbers, hiring bar, pricing experiments. Private — for the founder.",
     "folder-demo-bundles-vault", "private",
     ["demo-vault-runway-numbers", "demo-vault-hiring-bar", "demo-vault-pricing-experiments"]),
    ("demo-bundle-integrate-tour", "AI tool integration tour",
     "Claude Code, Codex (AGENTS.md), MCP server, Cursor — every wiring path the demo hub supports.",
     None, "public",
     ["demo-cursor-rules", "demo-int-claude-code", "demo-int-codex-agents-md", "demo-int-mcp-server"]),
]

# ─── Render SQL ──────────────────────────────────────────────────────

print("""-- 037: Demo account expansion.
--
-- Builds on 036_demo_account_seed.sql.template. Run 036 first so the
-- profile row + the existing 6 docs / 2 bundles exist. Then run this.
--
-- Adds:
--   * 44 documents → 50 total
--   * 7 my-section folders + 3 bundle-section folders
--   * 5 bundles → 7 total (mix of public, restricted, private)
--   * folder assignments + permission variety (public, private,
--     restricted)
--   * existing 6 docs from 036 get re-homed into their best-fit folders
--     via UPDATE statements at the bottom
--
-- This file is `.sql.template` for the same reason 036 is — it
-- contains `<DEMO_USER_ID>` placeholders. Substitute before push.
--
-- HOW TO APPLY (after 036):
--   1. cp 037_demo_account_expand.sql.template 037_demo_account_expand.sql
--   2. sed -i '' 's/<DEMO_USER_ID>/...uuid.../g' 037_demo_account_expand.sql
--   3. supabase db push --include-all
--
-- Generated by _demo_seed_generator.py — re-run that script to update.

-- ─── 1. Folders (my-section) ─────────────────────────────────────────""")

for fid, name, order in MY_FOLDERS:
    print(f"INSERT INTO folders (id, user_id, name, section, sort_order, collapsed) VALUES")
    print(f"  ('{fid}', '<DEMO_USER_ID>', '{name}', 'my', {order}, false)")
    print(f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, section = EXCLUDED.section, sort_order = EXCLUDED.sort_order;")
print()

print("-- ─── 2. Folders (bundles-section) ────────────────────────────────")
for fid, name, order in BUNDLE_FOLDERS:
    print(f"INSERT INTO folders (id, user_id, name, section, sort_order, collapsed) VALUES")
    print(f"  ('{fid}', '<DEMO_USER_ID>', '{name}', 'bundles', {order}, false)")
    print(f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, section = EXCLUDED.section, sort_order = EXCLUDED.sort_order;")
print()

print("-- ─── 3. Re-home existing 036 docs into folders ─────────────────────")
EXISTING_HOMES = [
    ("demo-ai-memory-chat",     "folder-demo-conversations"),
    ("demo-decision-graph-url", "folder-demo-decisions"),
    ("demo-formatting-tour",    "folder-demo-formatting"),
    ("demo-strategy-moat",      "folder-demo-strategy"),
    ("demo-cursor-rules",       "folder-demo-integrate"),
    ("demo-karpathy-llm-wiki",  "folder-demo-research"),
]
for doc_id, folder in EXISTING_HOMES:
    print(f"UPDATE documents SET folder_id = '{folder}' WHERE id = '{doc_id}' AND user_id = '<DEMO_USER_ID>';")
print()

print("-- ─── 4. New documents (44) ─────────────────────────────────────────")
RESTRICTED_EMAILS = "'{advisor@mdfy.app,founder@mdfy.app}'"
ALT_RESTRICTED    = "'{kyle@mdfy.app,demo@mdfy.app}'"

for doc_id, title, folder, perm, content in DOCS:
    folder_sql = f"'{folder}'" if folder else "NULL"
    is_draft = "true" if perm == "private" else "false"
    allowed = "'{}'"  # NOT NULL DEFAULT empty array on both docs and bundles
    if perm == "restricted":
        # Alternate the email lists so it doesn't look uniform.
        allowed = RESTRICTED_EMAILS if hash(doc_id) % 2 == 0 else ALT_RESTRICTED
    edit_token = f"demo-tok-{doc_id[5:25]}"
    title_escaped = title.replace("'", "''")
    print(f"""
INSERT INTO documents (id, user_id, markdown, title, edit_token, is_draft, edit_mode, folder_id, allowed_emails)
VALUES (
  '{doc_id}',
  '<DEMO_USER_ID>',
  {DM}{content}{DM},
  '{title_escaped}',
  '{edit_token}',
  {is_draft},
  'account',
  {folder_sql},
  {allowed}
)
ON CONFLICT (id) DO NOTHING;""")

print()
print("-- ─── 5. New bundles (5) ────────────────────────────────────────────")
for b_id, title, desc, folder, perm, doc_ids in BUNDLES:
    folder_sql = f"'{folder}'" if folder else "NULL"
    is_draft = "true" if perm == "private" else "false"
    allowed = "'{}'"  # NOT NULL DEFAULT empty array on both docs and bundles
    if perm == "restricted":
        allowed = RESTRICTED_EMAILS
    edit_token = f"demo-tok-{b_id[5:25]}"
    title_escaped = title.replace("'", "''")
    desc_escaped = desc.replace("'", "''")
    intent = f"Curated bundle: {title_escaped[:60]}".replace("'", "''")
    print(f"""
INSERT INTO bundles (id, user_id, title, description, edit_token, is_draft, edit_mode, intent, folder_id, allowed_emails)
VALUES (
  '{b_id}',
  '<DEMO_USER_ID>',
  '{title_escaped}',
  '{desc_escaped}',
  '{edit_token}',
  {is_draft},
  'account',
  '{intent}',
  {folder_sql},
  {allowed}
)
ON CONFLICT (id) DO NOTHING;""")

print()
print("-- ─── 6. Re-home existing 036 bundles into folders ──────────────────")
print("UPDATE bundles SET folder_id = 'folder-demo-bundles-ai'          WHERE id = 'demo-bundle-memory'      AND user_id = '<DEMO_USER_ID>';")
print("UPDATE bundles SET folder_id = 'folder-demo-bundles-engineering' WHERE id = 'demo-bundle-engineering' AND user_id = '<DEMO_USER_ID>';")
print()

print("-- ─── 7. Bundle ↔ document membership ──────────────────────────────")
for b_id, _, _, _, _, doc_ids in BUNDLES:
    for i, d in enumerate(doc_ids):
        print(f"INSERT INTO bundle_documents (bundle_id, document_id, sort_order) VALUES ('{b_id}', '{d}', {i}) ON CONFLICT DO NOTHING;")
print()

print("-- ─── 8. Done. ─────────────────────────────────────────────────────")
print("-- Counts to verify post-apply:")
print("--   SELECT count(*) FROM documents WHERE user_id = '<DEMO_USER_ID>';  -- 50")
print("--   SELECT count(*) FROM bundles   WHERE user_id = '<DEMO_USER_ID>';  -- 7")
print("--   SELECT count(*) FROM folders   WHERE user_id = '<DEMO_USER_ID>';  -- 10")
