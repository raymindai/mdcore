# The Markdown Infrastructure Manifesto

> ⚠️ **전략 업데이트 (2026-03-23)**: 엔진 철학은 유효하나, 제품 포지셔닝이 업데이트되었다.
> "Engine over Editor" → "Markdown은 엔진이지 인터페이스가 아니다" (사용자는 MD를 몰라도 된다).
> mdfy.app는 쇼케이스가 아니라 핵심 사업이다. 바이럴 뱃지 + 크로스 AI 레이어가 해자.
> 상세: `updatedDirection.md` v5.0 참조.

## Markdown has converged as the interface layer between AI and humans.

This is not a prediction. It is an observation.

Every major language model — Claude, GPT, Gemini, Llama, Mistral — defaults to Markdown output. Not because a committee decided. Because Markdown is the minimum viable structure: headings, lists, links, code, tables. Just enough semantics to carry meaning, just little enough to remain human-readable in raw form.

On the other side, every knowledge system that feeds AI — GitHub, Obsidian, documentation sites, Claude Code skills, Cursor rules, Notion, wikis — stores content as Markdown. It is the format AI reads from and writes to.

This convergence was not designed. It emerged. And it creates a specific, growing problem.

---

## The problem

Markdown has tools. It does not have infrastructure.

Pandoc converts between formats. markdown-it parses in JavaScript. CommonMark standardizes syntax. Remark transforms ASTs. These are good tools. They solve pieces of the problem.

But there is no unified engine — no single core that parses every Markdown flavor, renders it consistently across every surface, converts bidirectionally between Markdown and other formats, and ships as one dependency to any runtime.

Instead, every application re-implements the pipeline. A startup building a docs site wires together remark + rehype + shiki + katex + mermaid — five dependencies, each with its own version cycle, its own quirks, its own breaking changes. VS Code renders Markdown differently than GitHub, which renders it differently than Obsidian, which renders it differently than Slack. A developer's table works in one tool and breaks in another, not because the Markdown is wrong, but because every renderer makes different assumptions.

This fragmentation was tolerable when Markdown was a developer tool. It is not tolerable when Markdown is becoming the primary content format for AI-human interaction at massive scale.

---

## Why this problem is getting worse

**Volume.** AI systems generate billions of Markdown tokens per day. Every AI chat response, every generated document, every agent output. This volume did not exist three years ago. It will be 10x larger in three years.

**Audience shift.** A marketing manager using Claude receives Markdown. A student using GPT receives Markdown. A lawyer reviewing an AI summary receives Markdown. These people did not choose Markdown. They do not know its syntax. They need it rendered instantly, correctly, and beautifully — or the output is useless to them.

**Surface explosion.** Markdown now must render in browsers, terminals, mobile apps, VS Code, Obsidian, email clients, Slack, CLI tools, edge functions, PDF exports, and presentation decks. Pandoc covers format conversion. Nothing covers runtime-universal rendering from a single engine.

These three forces — volume, audience, surfaces — are compounding. The gap between "AI writes Markdown" and "humans receive useful documents" grows every day.

---

## What exists today and why it is not enough

We respect the existing ecosystem. Here is where it falls short:

**Pandoc** is a document converter, not a rendering engine. It does not compile to WASM. It does not run in a browser. It does not embed in your React app. It is a command-line tool that transforms files, and it does that brilliantly. But it cannot power real-time rendering across thirteen surfaces from a single codebase.

**markdown-it / Remark / Unified.js** are JavaScript-only. They cannot produce a native CLI binary, a mobile SDK, or an edge-optimized WASM module. They solve the "parse Markdown in Node" problem, not the "render Markdown everywhere" problem.

**CommonMark** standardizes base syntax but explicitly excludes tables, footnotes, math, diagrams, task lists, and wikilinks — the very extensions that AI outputs and users expect. A CommonMark-only engine renders half of what Claude generates.

**GitHub's cmark-gfm / GitLab's comrak** solve rendering for their specific platforms. They are not designed for embedding into third-party applications across runtimes.

The gap is not "nobody has worked on Markdown." The gap is: nobody has built the engine layer that sits beneath all of these — parsing every flavor, rendering for every surface, converting in both directions, from a single codebase.

---

## What we are building

mdcore is the universal Markdown engine.

One Rust codebase that compiles to:
- **WASM** for browsers, edge functions, and Deno
- **Native addons** for Node.js via napi-rs
- **Standalone binaries** for CLI and CI/CD
- **Mobile libraries** for iOS and Android via UniFFI

One engine. Every surface. Every Markdown flavor.

This is the pattern that SWC used to replace Babel (20x faster, same ecosystem), that Biome used to unify linting and formatting, that Turbopack used to replace Webpack. Build the core in a systems language, compile to every target, let the ecosystem build on top.

---

## Our principles

### Engine over Editor

We are V8, not Chrome. WebKit, not Safari. SQLite, not a database GUI.

Editors are products. Products compete on UX and features. They rise and fall with design trends. The engine underneath persists across generations of products. We build the layer that every editor, viewer, and tool can depend on.

We ship a product — mdfy.app — because people need a front door. But the product is an expression of the engine, not the other way around.

### Every flavor in, correct output out

GFM task lists. Obsidian `[[wikilinks]]`. MDX components. Pandoc citations. KaTeX math. Mermaid diagrams. Frontmatter in YAML, TOML, or JSON.

An infrastructure layer does not get to have opinions about which Markdown dialect is "right." It detects, parses, and renders all of them. When flavors conflict — when the same syntax means different things in different contexts — we resolve it through explicit configuration, not silent assumptions.

This is hard. It requires a compatibility matrix, clear defaults, and escape hatches. We accept that complexity because the alternative — forcing everyone onto one flavor — is worse.

### Bidirectional by default

MD→HTML is the obvious direction. But the AI era demands the reverse: HTML→MD, PDF→MD, DOCX→MD, webpage→MD.

AI agents need to ingest the world as Markdown to process it. Humans need Markdown rendered as polished documents to use it.

We acknowledge this is a lossy process. HTML→MD cannot perfectly preserve every layout decision. PDF→MD loses some visual structure. We are explicit about what is preserved and what is approximated. Transparency over false promises.

### Open engine, commercial infrastructure

The engine is open source. MIT licensed. Always.

This is not charity. It is strategy. An open engine gets embedded everywhere. Embedding creates dependency. Dependency creates distribution. Distribution creates the opportunity to sell infrastructure on top: hosted rendering APIs, team collaboration, premium themes, analytics, enterprise support.

This is the model of Elastic, Redis, Vercel, and every successful open-core infrastructure company. The engine is free. The platform is the business.

---

## Who pays and why

**Developers** embed `@mdcore/engine` (free, open source) and optionally pay for the hosted API when they need rendering at scale without managing infrastructure.

**Teams** use mdfy.app Pro for collaborative Markdown workspaces with shared templates, branded exports, and analytics.

**Enterprises** pay for mdcore Cloud — API access with SLAs, custom themes, private rendering, and compliance features.

**Everyone else** uses mdfy.app for free — paste Markdown, see it rendered, share a link. No account required. The free tier is the acquisition funnel. It proves the engine works. It generates word of mouth.

The pricing follows the infrastructure model: the engine is free because it needs to be everywhere. The services on top of the engine are where value capture happens.

---

## The bet we are making

We are betting that Markdown is not a transitional format.

The counterargument: AI could switch to HTML, or JSON, or some proprietary structured format. This is technically possible. But we think it won't happen, for a specific reason:

Markdown is the only format that is simultaneously human-readable in raw form and machine-parseable. HTML is machine-parseable but unreadable raw. Plain text is human-readable but has no structure. JSON is structured but not meant for human eyes.

Markdown sits at the exact intersection. That intersection does not go away as AI improves. It gets more important — because the more AI writes, the more humans need to be able to read, verify, and edit the raw output. Markdown lets them do that. No other format does.

We could be wrong. Formats are not permanent. But we believe the structural properties of Markdown — minimal syntax, maximum readability, sufficient structure — make it uniquely durable as the AI-human interface layer.

And the team that builds the infrastructure for that layer will be building on the right foundation, regardless of whether the format is called "Markdown" or evolves into something that preserves these same properties under a different name.

---

## What we are not

~~We are not an editor company. We are not competing with Obsidian, Notion, or Typora.~~ *(Updated: mdfy.app is now positioned as the core product — a web-native document publishing tool. mditor provides WYSIWYG + Source modes so users don't need to know Markdown. See updatedDirection.md v5.0.)*

We are not a conversion tool. We are not competing with Pandoc on format transformation.

We are not a standard body. We are not trying to replace CommonMark or define the "right" Markdown.

We are the engine layer beneath the product — and the product is the publishing layer for AI outputs. The fastest way from thought to shared document. No AI company will build a cross-AI publishing tool. That structural gap is our moat.

---

*mdcore — The Markdown Engine for the AI Era*

*Engine: [github.com/mdcore](https://github.com/mdcore)*
*Product: [mdfy.app](https://mdfy.app)*
*API: [mdcore.ai](https://mdcore.ai)*
*Standard: [mdcore.md](https://mdcore.md)*
