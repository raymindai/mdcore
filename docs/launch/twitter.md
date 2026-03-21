# Twitter/X Launch Thread

---

**Tweet 1 (Hook)**

I built mdfy.cc — paste Markdown, get a beautiful document.

Powered by a Rust engine compiled to WASM. Renders in 2ms. No server, no login.

Try it → mdfy.cc

🧵 Here's how I built it as a solo dev with Claude:

---

**Tweet 2 (Problem)**

Every AI outputs Markdown. ChatGPT, Claude, Gemini — all of them.

But there's no good way to share that output as a polished document.

GitHub Gist? Mediocre rendering. Google Docs? Formatting breaks. PDF? Too much friction.

I wanted: paste → beautiful → share. That's it.

---

**Tweet 3 (Solution)**

mdfy.cc does exactly that:

1. Paste any Markdown
2. See it rendered instantly (tables, math, diagrams, code)
3. Click Share → get mdfy.cc/abc123
4. Anyone can view it. No account needed.

---

**Tweet 4 (Tech)**

The engine is Rust compiled to WASM.

Why Rust? Because I want this to run everywhere — browser, CLI, mobile, edge functions — from one codebase.

Same pattern as SWC (replaced Babel) and Biome (replaced ESLint).

The WASM binary is 600KB. Renders Markdown in ~2ms.

---

**Tweet 5 (AI-built)**

I built this in 3 weeks as a solo founder.

My co-pilot? Claude.

Architecture decisions, Rust code, Next.js frontend, Supabase integration — all pair-programmed with AI.

1 person + AI = a team of 5.

---

**Tweet 6 (What's next)**

Next up:
- Chrome extension (save ChatGPT/Claude outputs with one click)
- PDF/DOCX export
- Open-sourcing the Rust engine as @mdcore/engine

The vision: own the Markdown infrastructure layer for the AI era.

Try it: mdfy.cc
Star it: github.com/raymindai/mdcore

---

**Tweet 7 (CTA)**

If you work with Markdown (so... everyone who uses AI), try mdfy.cc.

No login. No paywall. Just paste and share.

Would love your feedback 🙏
