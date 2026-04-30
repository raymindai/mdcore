# mdcore

## The fastest way from thought to shared document.

**Markdown URLs that humans write and AI reads.** Import anything. Render beautifully. Share instantly. Powered by Rust + WASM.

[![Live](https://img.shields.io/badge/mdfy.app-live-orange)](https://mdfy.app)
[![VS Code](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=raymindai.mdfy-vscode)
[![MCP](https://img.shields.io/badge/MCP-npm-red)](https://www.npmjs.com/package/mdfy-mcp)
[![CLI](https://img.shields.io/badge/CLI-npm-green)](https://www.npmjs.com/package/mdfy)

```text
                    mdcore engine (Rust)
                           │
            ┌──────────────┼──────────────┐
            │              │              │
         WASM           napi-rs        native
            │              │              │
       ┌────┼────┐    ┌────┼────┐    ┌───┼────┐
    Browser Edge  Deno Node Raycast  CLI  Mobile
    mdfy.app  CF         npm  Obsidian  brew  iOS
             Workers    pkg  VS Code   install Android
```

---

## What is this?

**mdcore** is a Markdown parsing, rendering, and conversion engine built in Rust. **mdfy.app** is the full document platform built on top of it.

Every document gets a permanent short URL (`mdfy.app/abc123`) that works everywhere — browsers, AI chats, Slack, email, embeds. No login to view. No paywall.

## 8 Channels

mdfy.app is available everywhere:

| Channel | Status | Install |
|---------|--------|---------|
| [**Web**](https://mdfy.app) | Live | Just open mdfy.app |
| [**VS Code**](https://marketplace.visualstudio.com/items?itemName=raymindai.mdfy-vscode) | v1.3.0 | Marketplace or [.vsix download](https://github.com/raymindai/mdcore/releases) |
| [**Desktop (Mac)**](https://github.com/raymindai/mdcore/releases) | v2.0.0 | DMG download |
| [**CLI**](https://www.npmjs.com/package/mdfy) | v1.3.0 | `npm install -g mdfy` |
| [**MCP Server**](https://www.npmjs.com/package/mdfy-mcp) | v1.3.0 | `npx mdfy-mcp` or hosted `mdfy.app/api/mcp` |
| [**Chrome Extension**](https://github.com/raymindai/mdcore/releases) | v2.0.0 | Download from releases |
| **QuickLook (Mac)** | v1.0.0 | [Download](https://github.com/raymindai/mdcore/releases) |
| **API** | Live | `https://mdfy.app/api/docs` |

## Features

### Editor
- **WYSIWYG** — edit directly in the rendered preview (contentEditable)
- **Source** — CodeMirror 6 with Markdown syntax highlighting
- **Split view** — side-by-side Live + Source panels
- **Floating toolbar** — context-aware formatting on text selection
- **Cmd+Enter** — escape from blockquote/list/code blocks
- **Mermaid visual editor** — drag-and-drop flowchart canvas

### Import (13+ formats)
- Documents — MD, PDF, DOCX, PPTX, XLSX, HTML, RTF
- Data — CSV, JSON, XML
- Academic — LaTeX, reStructuredText
- AI output — auto-detects ChatGPT/Claude/Gemini conversations
- CLI output — auto-detects terminal tables and unicode formatting

### Export
- Download — Markdown, HTML, Plain Text
- Print — PDF via browser print (custom print CSS)
- Clipboard — Raw HTML, Rich Text (Google Docs/Email), Slack mrkdwn
- Share — Short URL, QR Code, Embed code (iframe)

### Rendering
- **Full GFM** — tables, task lists, footnotes, strikethrough, autolinks
- **Math** — KaTeX inline (`$...$`) and display (`$$...$$`)
- **Mermaid** — flowcharts, sequence, gantt, class, state diagrams
- **190+ languages** — syntax highlighting via highlight.js
- **ASCII diagrams** — auto-detect and style box-drawing characters
- **Flavor detection** — auto-detects GFM, Obsidian, MDX, Pandoc, CommonMark

### Organization
- Folders with drag-and-drop
- Trash with restore
- Sort by newest, oldest, A→Z, Z→A
- Document search
- Simple / Detailed sidebar modes

### Sharing & Access
- Owner-only editing model (non-owners view, duplicate to edit)
- Password protection + expiry dates
- Email allowlist for restricted access
- View count tracking
- Key color + skin theme customization (8 colors, 8 schemes)

### Auth
- Google / GitHub OAuth + Email magic link
- Anonymous editing (no login required to create)
- Cloud sync across devices

## CLI

```bash
# Publish a file
mdfy publish README.md

# Pipe from any command
echo "# Hello" | mdfy publish
tmux capture-pane -p | mdfy publish
pbpaste | mdfy publish

# Manage documents
mdfy list
mdfy read abc123
mdfy update abc123 updated.md
mdfy search "meeting notes"
mdfy pull abc123 -o doc.md
```

## MCP Server

Connect any AI tool to mdfy.app:

```json
{
  "mcpServers": {
    "mdfy": {
      "command": "npx",
      "args": ["mdfy-mcp"]
    }
  }
}
```

Or use the hosted endpoint: `https://mdfy.app/api/mcp`

25 tools: create, read, update, delete, list, search, append, prepend, sections, sharing, versions, folders, stats, and more.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| `@mdcore/engine` | Rust WASM engine + TypeScript postprocessor | `npm i @mdcore/engine` |
| `@mdcore/styles` | CSS-only rendering styles (dark/light themes) | `npm i @mdcore/styles` |
| `@mdcore/api` | HTTP client for mdfy.app API | `npm i @mdcore/api` |
| `@mdcore/ai` | AI provider abstraction (Gemini, OpenAI, Anthropic) | `npm i @mdcore/ai` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core Engine | Rust + comrak |
| WASM | wasm-bindgen + wasm-pack |
| Web App | Next.js 15 + React 19 + TailwindCSS v4 |
| Desktop | Electron |
| VS Code | Extension API + WebView |
| Source Editor | CodeMirror 6 |
| Math | KaTeX |
| Diagrams | Mermaid.js |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime (Yjs CRDT) |
| Hosting | Vercel |

## Quick Start

```bash
# Run the web app
cd apps/web
npm install
npm run dev    # → http://localhost:3000

# Build the Rust engine
cd packages/engine
cargo test
wasm-pack build --target bundler --out-dir ../../apps/web/src/lib/wasm --release

# Build Desktop DMG
cd apps/desktop
npm run build:dmg
```

## Project Structure

```text
mdcore/
├── packages/
│   ├── engine/              # Rust core (comrak → WASM)
│   ├── mdcore/              # @mdcore/engine npm package
│   ├── styles/              # @mdcore/styles (CSS-only)
│   ├── api/                 # @mdcore/api (HTTP client)
│   └── ai/                  # @mdcore/ai (AI providers)
├── apps/
│   ├── web/                 # Next.js 15 (mdfy.app)
│   ├── desktop/             # Electron Mac app
│   ├── vscode-extension/    # VS Code extension
│   ├── chrome-extension/    # Chrome extension
│   └── quicklook/           # macOS QuickLook
├── docs/                    # Architecture, roadmap, manifesto
└── .github/workflows/       # CI/CD
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘B | Bold |
| ⌘I | Italic |
| ⌘K | Insert link |
| ⌘S | Share / copy URL |
| ⌘⇧C | Copy HTML |
| ⌘Z / ⌘⇧Z | Undo / Redo |
| ⌘\\ | Toggle view mode |
| ⌘Enter | Exit block (quote/list/code) |
| ⌘K | Command palette |
| Alt+1/2/3 | Live / Split / Source |
| Dbl-click | Edit code/math/diagram/table |

## Roadmap

- [x] Rust WASM engine + Next.js web app
- [x] WYSIWYG + Source + Split editing
- [x] 13+ format import (PDF, DOCX, PPTX, XLSX...)
- [x] Math (KaTeX), Mermaid diagrams, 190+ language highlighting
- [x] Short URL sharing + QR code + embed
- [x] Auth (Google/GitHub/Email) + cloud sync
- [x] Password protection + expiry + email allowlist
- [x] Folders + Trash + sorting
- [x] VS Code extension (Marketplace)
- [x] Desktop Mac app (Electron)
- [x] Chrome extension (ChatGPT/Claude/Gemini capture)
- [x] CLI tool (`npm install -g mdfy`)
- [x] MCP Server (25 tools, hosted + stdio)
- [x] macOS QuickLook
- [x] REST API + documentation
- [x] Mermaid visual editor (canvas)
- [x] AI conversation detection + formatting
- [x] Key color + skin theme customization
- [x] Owner-only editing model
- [x] Document notifications
- [ ] Stripe billing (Pro tier)
- [ ] Custom domains
- [ ] View analytics dashboard
- [ ] Obsidian plugin
- [ ] Mobile (iOS/Android)

## License

MIT

---

**mdcore** — *The fastest way from thought to shared document.*

[mdfy.app](https://mdfy.app) · [Docs](https://mdfy.app/docs) · [Plugins](https://mdfy.app/plugins) · [GitHub](https://github.com/raymindai/mdcore)
