# mdcore

**The fastest way from thought to shared document.**

Import anything. Render beautifully. Share instantly. Powered by Rust + WASM.

```
                    mdcore engine (Rust)
                           │
            ┌──────────────┼──────────────┐
            │              │              │
         WASM           napi-rs        native
            │              │              │
       ┌────┼────┐    ┌────┼────┐    ┌───┼────┐
    Browser Edge  Deno Node Raycast  CLI  Mobile
    mdfy.cc  CF         npm  Obsidian  brew  iOS
             Workers    pkg  VS Code   install Android
```

## What is this?

mdcore is a Markdown parsing, rendering, and conversion engine built in Rust. The web product **[mdfy.cc](https://mdfy.cc)** is the first surface built on top of the engine.

mdfy.cc is not just a renderer — it's a full document platform:
- **Import** any file format (PDF, DOCX, PPTX, XLSX, HTML, CSV, LaTeX, and more)
- **Edit** inline with WYSIWYG or source Markdown
- **AI mdfy** — AI-powered structuring turns raw text into clean Markdown
- **Share** with a single click — short URL with beautiful rendered output
- **Export** to MD, HTML, TXT, PDF, or copy as rich text for Docs/Email/Slack

## Features

### Editor
- **WYSIWYG editing** — edit directly in the rendered preview like a word processor
- **Source editing** — CodeMirror 6 with Markdown-aware highlighting
- **Split view** — side-by-side Beautified + MDFIED (source) panels
- **Floating toolbar** — context-aware formatting on text selection
- **Narrow view** — constrain content width for comfortable reading

### Import (13 formats)
- **Documents** — MD, PDF, DOCX, PPTX, XLSX, HTML, RTF
- **Data** — CSV, JSON, XML
- **Academic** — LaTeX, RST (reStructuredText)
- **Plain text** — TXT
- **CLI output** — auto-detects Claude Code / terminal output (unicode tables, checkmarks)
- **AI mdfy** — post-import AI structuring via Gemini

### Export
- **Download** — Markdown, HTML, Plain Text
- **Print** — PDF via browser print
- **Clipboard** — Raw HTML, Rich Text (Google Docs/Email), Slack mrkdwn, Plain Text
- **Share** — Short URL, QR Code, Embed code (iframe)

### Rendering
- **Full GFM** — tables, task lists, footnotes, strikethrough, autolinks
- **Math** — KaTeX for inline and display equations
- **Mermaid** — flowcharts, sequence diagrams, gantt charts
- **190+ languages** — syntax highlighting via highlight.js
- **Flavor detection** — auto-detects GFM, Obsidian, MDX, Pandoc, CommonMark
- **Flavor conversion** — convert between GFM, CommonMark, Obsidian with one click

### Organization
- **Folders** — create, rename, drag-and-drop documents between folders
- **Trash** — soft delete with restore
- **Sorting** — newest, oldest, A→Z, Z→A
- **Cloud sync** — sign in to save documents across devices

### Auth & Sharing
- **Google / GitHub OAuth** + Email magic link
- **Free tier** — unlimited documents, cloud sync, 7-day expiry, mdfy.cc badge
- **Pro tier** — no expiry, no badge, custom domain, analytics, password protection (coming soon)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core Engine | Rust + comrak |
| WASM | wasm-bindgen + wasm-pack |
| Web App | Next.js 15 + React 19 + TailwindCSS v4 |
| Source Editor | CodeMirror 6 |
| Math | KaTeX |
| Diagrams | Mermaid.js |
| DOCX Import | mammoth |
| Office Import | officeparser (PPTX, XLSX) |
| PDF Import | pdf-parse (server-side) |
| AI Structuring | Gemini API |
| HTML → MD | Turndown + GFM plugin |
| Auth | Supabase Auth (@supabase/ssr) |
| Database | Supabase PostgreSQL |
| Hosting | Vercel |

## Project Structure

```
mdcore/
├── packages/
│   ├── engine/              # Rust core engine
│   │   └── src/
│   │       ├── lib.rs       # WASM bindings
│   │       ├── render.rs    # HTML rendering via comrak
│   │       └── flavor.rs    # MD flavor detection
│   └── wasm/                # WASM build output
├── apps/
│   └── web/                 # Next.js 15 web app (mdfy.cc)
│       └── src/
│           ├── app/
│           │   ├── api/
│           │   │   ├── docs/          # Document CRUD
│           │   │   ├── import/pdf/    # PDF text extraction
│           │   │   ├── import/office/ # PPTX/XLSX extraction
│           │   │   ├── import/mdfy/   # AI structuring
│           │   │   ├── user/          # User documents
│           │   │   └── og/            # OG image generation
│           │   ├── auth/callback/     # OAuth callback
│           │   ├── d/[id]/            # SSR document viewer
│           │   ├── embed/[id]/        # Embed viewer
│           │   └── about/             # About page
│           ├── lib/
│           │   ├── engine.ts          # WASM engine wrapper
│           │   ├── postprocess.ts     # KaTeX + Mermaid + highlight.js
│           │   ├── file-import.ts     # Multi-format import
│           │   ├── cli-to-md.ts       # CLI output → Markdown
│           │   ├── html-to-md.ts      # HTML → Markdown (Turndown)
│           │   ├── share.ts           # URL sharing + document API
│           │   ├── useAuth.ts         # Auth hook
│           │   └── supabase*.ts       # Supabase clients
│           └── components/
│               ├── MdEditor.tsx       # Main editor (WYSIWYG + Source)
│               ├── FloatingToolbar.tsx # Selection toolbar
│               ├── useCodeMirror.ts   # CM6 hook
│               ├── MdCanvas.tsx       # Mermaid visual editor
│               └── MathEditor.tsx     # KaTeX equation editor
└── package.json
```

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- Node.js 18+

### Run the web app

```bash
cd apps/web
npm install
npm run dev    # → http://localhost:3000
```

### Build the engine

```bash
cd packages/engine
cargo test
wasm-pack build --target bundler --out-dir ../../apps/web/src/lib/wasm --release
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘B` | Bold |
| `⌘I` | Italic |
| `⌘K` | Insert link |
| `⌘S` | Share (copy URL) |
| `⌘⇧C` | Copy HTML |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `⌘\` | Toggle view mode |
| `Esc` | Focus editor |
| Double-click | Edit code/math/diagram/table inline |

## Roadmap

- [x] WYSIWYG editing (contentEditable on rendered HTML)
- [x] Multi-format import (PDF, DOCX, PPTX, XLSX, HTML, CSV, LaTeX, RST)
- [x] AI mdfy structuring (Gemini)
- [x] CLI output auto-conversion
- [x] Folders + Trash + Sorting
- [x] Auth (Google/GitHub/Email)
- [x] Cloud sync + document ownership
- [x] Viral badge ("Published with mdfy.cc")
- [x] Flavor conversion (GFM ↔ CommonMark ↔ Obsidian)
- [ ] Stripe billing (Pro $8/mo)
- [ ] Custom domains
- [ ] View analytics
- [ ] Chrome extension (ChatGPT/Claude → mdfy.cc)
- [ ] `@mdcore/engine` npm package
- [ ] `@mdcore/terminal` CLI renderer
- [ ] VS Code / Obsidian plugins
- [ ] Mobile SDK (UniFFI → Swift/Kotlin)

## License

MIT

---

**mdcore** — *The fastest way from thought to shared document.*

[mdfy.cc](https://mdfy.cc) · [mdcore.ai](https://mdcore.ai)
