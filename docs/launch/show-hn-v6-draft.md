# Show HN draft — mdfy v6 (Hub layer)

**Status**: draft for founder review. Voice is the founder's, not Claude's. Keep first-person, keep technical, drop adjectives the founder wouldn't say out loud.

**Last revised**: 2026-05-15 (post-rebrand-prep ship).

---

## Title options (pick one before posting)

1. **Show HN: mdfy – Your AI memory, deployable to any AI**
2. **Show HN: mdfy – Markdown URLs as a memory layer for Claude, ChatGPT, Cursor**
3. **Show HN: mdfy – I built the personal wiki Karpathy described, then deployed it as a URL**

(My preference: #1 — leads with our own line and the differentiator.)

---

## Body (target: ~400 words, no marketing language)

I've been building mdfy for ~8 weeks (1 month nights/weekends, then full-time). Today I'm shipping v6, which turns it from a markdown publisher into a memory layer.

The thesis is simple: LLMs read and write markdown natively. URLs cross every boundary. If you put a markdown doc at a URL, every AI you use can fetch it as context the same way. So your personal memory should be a markdown URL — not a Notion block, not an extracted-fact graph, not a vendor SDK.

**What it does today** (everything's free, no signup to try):

- **Capture from any AI** — Chrome extension for ChatGPT / Claude / Gemini, MCP server for Claude Code / Cursor, paste-anywhere editor at mdfy.app
- **Capture from anywhere else** — GitHub repos, Notion pages, Obsidian vaults (.zip), any URL, files (PDF/DOCX/code)
- **Bundle by topic** — group N docs, add an Intent, let AI synthesize discoveries (tensions, gaps, threads) across them
- **Hub** — your docs auto-cluster into a concept index. `mdfy.app/hub/<you>` becomes one URL Claude, ChatGPT, Cursor, and Codex can all fetch
- **Self-publishing wiki** — every public hub auto-exposes `index.md`, `SCHEMA.md`, `log.md`, `llms.txt` so AI agents know what's available
- **Recall API** — `POST /api/hub/<slug>/recall` with optional Haiku-based reranker (hybrid BM25 + pgvector)
- **Token economy** — `?compact` and `?digest` query params cut fetch cost 30-50%; bundle URLs also accept `?full=1` to inline every member doc and `?graph=0` to drop the analysis section
- **AI dev tool wiring** — one line in `AGENTS.md` / `CLAUDE.md` / `.cursor/rules` auto-loads your hub or bundle on every session; per-tool snippets at [`/docs/integrate`](https://mdfy.app/docs/integrate)
- **Open spec** — URL contract, retrieval API, llms.txt, bundle digest format all documented at [`/spec`](https://mdfy.app/spec); engine MIT-licensed

**What I think is interesting**:

1. **Cross-AI is structural moat.** Notion's AI works in Notion. ChatGPT's memory works in ChatGPT. mdfy works everywhere because it's just a URL — AI companies can't replicate that without abandoning their walled gardens.
2. **Authored memory ≠ extracted memory.** Mem0 and Letta extract facts from conversations. They're good at what they do. mdfy answers a different question: *what do **you** want to remember?* You write it. You edit it. You decide.
3. **Graph-RAG-as-URL, not Graph-RAG-as-service.** Microsoft's GraphRAG and LlamaIndex KG build the graph and traverse it internally when an upstream system asks. mdfy ships the graph in the URL response — every bundle URL carries themes, insights, concept relations as markdown. The receiving AI inherits the prior AI's work for free.
4. **The Karpathy wiki shape, deployed as URL.** Andrej said "Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase." That's a local-file shape. We rebuilt it as a URL shape — and added composable scopes (doc / bundle / hub) so per-project context maps cleanly to AGENTS.md / CLAUDE.md.

Stack: Next.js 15, Supabase Postgres with pgvector + HNSW, OpenAI text-embedding-3-small, Anthropic Haiku for concept extraction + reranking, Rust + WASM markdown engine. mdcore (engine) and the bundle spec are open source.

Try it: paste a ChatGPT share link, import a GitHub repo, drop a PDF. The URL is yours forever, no signup needed. Or open the example hub directly: [`mdfy.app/hub/demo`](https://mdfy.app/hub/demo) — six docs, two bundles with pre-computed analysis, a concept index you can browse. Paste the URL into Claude or Cursor to see the cross-AI part end-to-end.

Happy to dig into anything technical, the cross-AI thesis, why I left X to do this, or where I think this goes if it works.

---

## Anticipated comments + responses

**"Isn't this just Notion + AI?"**
> Notion's AI works in Notion. mdfy works wherever you paste the URL — Cursor, Claude, ChatGPT, Codex. The lock-in difference is the whole point.

**"What about Mem0 / Letta / extracted memory?"**
> Different question. Mem0 asks "what should the AI remember about you?" mdfy asks "what do you want to remember?" Both are legitimate. The first is inference; the second is authorship.

**"How is this different from publishing markdown to GitHub Pages?"**
> Three things: (a) capture surfaces (Chrome ext / MCP / 5 ingest sources), (b) the hub layer (auto-concept-index, recall API, lint surface), (c) cross-AI deployability (every URL is a citable context address with `/raw` + `?compact` and `/llms.txt`).

**"Won't AI companies just build this themselves?"**
> They can't. Their incentive is to keep you in their walled garden. The cross-AI position is mine to win precisely because every AI company is structurally one of the AIs, not the layer above them.

**"Pricing?"**
> Free during beta. Pro tier after launch (price TBD — announced when beta ends). No tier locks the core: capture / hub / cross-AI deployability are free forever. The Pro split today is around no-badge, custom domain, analytics, auto-analyze (stale-fetch triggers background graph regen).

**"Why are you doing this?"**
> Trillions of tokens of high-quality AI-assisted thinking are being created every day and lost to chat histories nobody returns to. The most expensive forgetting machine in history. I want to build the layer that catches the part you actually meant to keep.

---

## Launch day timing

- Post at 7 AM PT (peak HN traffic) on a Tuesday or Wednesday
- Have the founder online for the next 6 hours to respond personally
- Don't recruit upvotes. Don't post the link in Slack. Organic ranking only.
- After post: tweet a single thread (5-6 tweets), email Substack list, Slack the news in 2-3 friendly group chats (not "vote me up" — just "shipped this, would love feedback").

---

## What I do NOT want in the post

- "Revolutionary" / "disrupt" / "AI-powered" / "next-gen" — auto-downvotes on HN
- Buzzword pile-up
- Pitching investors language ("scalable", "platform play")
- More than one Karpathy mention (we already use it carefully in body)
- Reddit-style "let me know what you think!" tail
