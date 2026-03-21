# Show HN: mdfy.cc — Paste Markdown, get a beautiful shareable URL

I built a Markdown renderer that runs entirely in your browser via Rust compiled to WASM.

**What it does:** Paste any Markdown → see it rendered instantly → click Share → get a short URL (mdfy.cc/abc123) anyone can view.

**Why I built it:** Every AI (ChatGPT, Claude, Gemini) outputs Markdown, but there's no good way to share it as a beautiful document. GitHub Gists render Markdown but the typography is mediocre. Rentry.co exists but doesn't support math or diagrams. I wanted something where you paste Markdown and get a document that looks *good*.

**What it supports:**
- GFM (tables, task lists, strikethrough, autolinks)
- KaTeX math ($e^{i\pi} + 1 = 0$)
- Mermaid diagrams
- Syntax highlighting for 190+ languages
- Dark/light mode
- Mobile responsive

**Tech stack:**
- Rendering engine: Rust (comrak) → WASM via wasm-bindgen
- Frontend: Next.js 15
- Post-processing: highlight.js, KaTeX, Mermaid (client-side JS)
- Storage: Supabase PostgreSQL
- Hosting: Vercel

The WASM engine renders Markdown in ~2ms. The entire rendering pipeline runs client-side — no server round-trip for rendering.

**What's next:** Chrome extension to save ChatGPT/Claude outputs with one click, PDF/DOCX export, and eventually open-sourcing the Rust engine as @mdcore/engine on npm.

Try it: https://mdfy.cc

Solo founder + Claude pair programming. Happy to answer questions about the Rust→WASM pipeline or anything else.
