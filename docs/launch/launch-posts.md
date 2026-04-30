# mdfy.app Launch Posts

---

## 1. Hacker News (Show HN)

**Title:** Show HN: mdfy.app -- Rust+WASM engine that turns AI output into shareable docs

---

I built a cross-platform Markdown publishing tool that captures AI output and turns it into a permanent, shareable URL. No login. No friction. Paste, render, share.

**The problem:** Every AI outputs Markdown, but that output is trapped inside chat windows. Copy it out and the formatting breaks. Paste it into Google Docs and you lose code blocks, math, diagrams. There is no fast path from AI output to a document you can send someone.

**The architecture:** The rendering engine is Rust (comrak) compiled to WASM via wasm-bindgen. Markdown goes in, HTML comes out in about 2ms, entirely client-side. Post-processing handles highlight.js for syntax coloring, KaTeX for math, and Mermaid for diagrams. The engine is a single WASM binary that runs identically across all targets.

Why Rust instead of a JS parser? Because I wanted one engine, many surfaces. The same comrak core powers the web app, a VS Code extension, a CLI, a Chrome extension, a Mac desktop app (Electron), an MCP server, and a tmux integration. Seven channels, one rendering pipeline. No divergence.

**The cross-AI angle:** The Chrome extension captures from ChatGPT, Claude, and Gemini. The MCP server lets any AI agent publish or read documents programmatically. The URL is the interchange format -- any AI can write to it, any AI can read from it. This makes mdfy.app a layer that sits across AI providers rather than inside one.

**What it supports:** GFM (tables, task lists, footnotes), KaTeX math, Mermaid diagrams, 190+ language syntax highlighting, dark/light mode, password-protected docs, embed via iframe, rich-text copy for Docs/Email, and mrkdwn copy for Slack.

**Tech:** Next.js 15, Supabase PostgreSQL, Vercel. Solo founder + Claude pair programming.

Free during beta. No login required to publish.

Try it: https://mdfy.app
Source: https://github.com/raymindai/mdcore

Happy to discuss the Rust-to-WASM pipeline, the cross-AI positioning, or anything else.

---

## 2. Product Hunt

**Tagline:** AI output to shareable document in one click

**Description:** mdfy.app captures AI output from ChatGPT, Claude, and Gemini and turns it into a permanent, beautifully rendered URL. Powered by a Rust+WASM engine. Available on web, CLI, VS Code, Chrome, Mac desktop, MCP server, and tmux. No login required.

**Maker Comment:**

I am Hyunsang, the solo founder of mdfy.app. I built the entire product with Claude as my pair programmer.

The problem I kept hitting: I would have a great conversation with an AI, get a well-structured response with code blocks, tables, and diagrams, and then have no good way to share it. Copy-paste into Docs breaks the formatting. Screenshots lose the text. Saving as a file means the recipient needs to know what Markdown is.

mdfy.app fixes this. Paste any Markdown, get a rendered document, click share, and you have a permanent URL anyone can open in a browser. The whole flow takes under 5 seconds.

What makes this different from existing Markdown tools:

First, it is a cross-AI layer. The Chrome extension captures directly from ChatGPT, Claude, and Gemini. The MCP server lets AI agents publish and read documents programmatically. mdfy.app sits between AI providers and the people who need to read their output.

Second, seven channels from one engine. The rendering core is Rust compiled to WASM. The same binary powers the web app, a CLI tool, a VS Code extension, a Chrome extension, a Mac desktop app, an MCP server, and a tmux integration. One codebase, consistent rendering everywhere.

Third, zero friction. No account creation. No login wall. Paste and share. The document gets a short URL like mdfy.app/abc123 with an edit token so you can update or delete it later.

The rendering handles everything modern Markdown needs: GFM tables, KaTeX math, Mermaid diagrams, syntax highlighting for 190+ languages, dark and light modes, and mobile-responsive layout.

Free during beta. I would love to hear what you think.

---

## 3. Reddit r/programming

**Title:** I built a Rust+WASM Markdown engine that powers 7 different clients from one codebase

---

I have been working on mdfy.app, a Markdown publishing tool that turns AI output into shareable URLs. The interesting part from an engineering perspective is the architecture: a single Rust rendering engine compiled to WASM, shared across seven different surfaces.

**The engine:** Built on comrak, the same GFM-compliant Markdown parser that GitLab and Reddit use. Compiled to WASM via wasm-bindgen with wasm-pack targeting the bundler output. The binary is around 600KB. Rendering happens client-side in about 2ms. No server round-trip for the parse-and-render step.

**Why Rust instead of remark/marked/markdown-it?** I wanted one source of truth for rendering. JS parsers are fine for a single web app, but the moment you need the same rendering in a CLI, a VS Code extension, a desktop app, and an MCP server, you either maintain N parsers or you compile one to run everywhere. Rust-to-WASM gave me the latter.

**Post-processing pipeline:** The WASM engine outputs raw HTML. A TypeScript post-processor then handles: (1) highlight.js for code blocks, (2) KaTeX for math expressions, (3) Mermaid diagram containers, and (4) copy buttons on code blocks. comrak uses `github_pre_lang: true`, so code blocks come out as `<pre lang="rust"><code>` rather than `<code class="language-rust">`. The post-processor regex is tuned to that format.

**One thing I learned the hard way:** syntect (Rust syntax highlighter) uses the onig C library, which cannot compile to wasm32-unknown-unknown. I spent two days trying to make it work before moving syntax highlighting to the client-side JS layer. Similarly, wasm-opt does not support bulk memory operations from recent Rust WASM output, so I had to disable it entirely. The Rust-to-WASM toolchain is powerful but the edges are sharp.

**The seven clients:** Web app (Next.js 15), CLI, VS Code extension, Chrome extension (captures from ChatGPT/Claude/Gemini), Mac desktop (Electron), MCP server (lets AI agents publish/read docs), and tmux integration. All share the same engine.

**Cross-AI angle:** The MCP server is the most interesting piece architecturally. Any AI agent that speaks MCP can create, read, update, or delete documents on mdfy.app. The Chrome extension captures AI conversations. The URL becomes the interchange format between AI systems.

Open source: github.com/raymindai/mdcore
Live: mdfy.app

Built solo with Claude as pair programmer. Feedback on the architecture welcome.

---

## 4. Twitter/X Thread

**Tweet 1**

I built mdfy.app -- it turns AI output into shareable documents.

Paste Markdown. Get a permanent URL. No login.

Powered by a Rust engine compiled to WASM. Renders in 2ms, entirely in your browser.

Here is how it works and why I built it:

**Tweet 2**

The problem: every AI outputs Markdown. ChatGPT, Claude, Gemini -- all of them.

But that output is trapped in chat windows. Copy it out and the formatting breaks. There is no fast path from AI response to a document you can share.

mdfy.app fixes that.

**Tweet 3**

How it works:

1. Paste any Markdown (or capture from AI with the Chrome extension)
2. Rendered instantly -- tables, math, diagrams, code
3. Click Share -- get a URL like mdfy.app/abc123
4. Anyone can view it. No account needed on either end.

mdfy.app

**Tweet 4**

The engine is Rust (comrak) compiled to WASM. One binary, seven surfaces:

- Web app
- CLI
- VS Code extension
- Chrome extension
- Mac desktop app
- MCP server
- tmux integration

Same rendering everywhere. No parser divergence.

**Tweet 5**

The MCP server is the part I am most excited about.

Any AI agent can publish or read documents on mdfy.app programmatically. The URL becomes the interchange format between AI systems.

Cross-AI publishing layer. No vendor lock-in.

**Tweet 6**

Built this solo with Claude as my pair programmer. Architecture, Rust code, frontend, infra -- all pair-programmed with AI.

Free during beta. No login required.

Try it: mdfy.app
Source: github.com/raymindai/mdcore

Feedback welcome.
