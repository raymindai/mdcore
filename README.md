# mdcore

**The universal Markdown engine for the AI era.**

One Rust codebase. Every Markdown flavor. Every surface.

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

mdcore is a Markdown parsing, rendering, and conversion engine built in Rust. It compiles to:

- **WASM** — runs in browsers, edge functions, Deno
- **Native Node addon** — via napi-rs (planned)
- **Standalone binary** — CLI tool (planned)
- **Mobile libraries** — via UniFFI (planned)

The web product **[mdfy.cc](https://mdfy.cc)** is the first surface built on top of the engine.

## Features

- **Full GFM support** — tables, task lists, footnotes, strikethrough, autolinks
- **Flavor auto-detection** — automatically detects GFM, Obsidian, MDX, Pandoc, CommonMark
- **Math rendering** — KaTeX for inline and display math
- **Mermaid diagrams** — client-side diagram rendering
- **Syntax highlighting** — via syntect (Rust) with 20+ language support
- **Bidirectional** — MD→HTML (and X→MD planned)
- **Frontmatter** — detects and strips YAML, TOML, JSON frontmatter
- **TOC extraction** — automatic table of contents generation
- **Wikilinks** — Obsidian-style `[[links]]`
- **URL sharing** — compress Markdown into URL hash, no server needed

## Project Structure

```
mdcore/
├── packages/
│   ├── engine/          # Rust core engine
│   │   └── src/
│   │       ├── lib.rs       # Main API: render(), detectFlavor()
│   │       ├── flavor.rs    # MD flavor auto-detection
│   │       └── render.rs    # HTML rendering via comrak
│   └── wasm/            # WASM build output
│       └── pkg/
├── apps/
│   └── web/             # Next.js 15 web app (mdfy.cc)
│       └── src/
│           ├── lib/
│           │   ├── engine.ts      # WASM engine wrapper
│           │   ├── postprocess.ts # KaTeX + Mermaid post-processing
│           │   └── share.ts       # URL-based sharing
│           └── components/
│               └── MdEditor.tsx   # Main editor component
└── package.json         # Monorepo root
```

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- Node.js 18+

### Build the engine

```bash
cd packages/engine
cargo test                    # Run 16 tests
wasm-pack build --target bundler --out-dir ../wasm/pkg --release
```

### Run the web app

```bash
cd apps/web
npm install
npm run dev
```

### Use the engine in your project

```typescript
import { render, detectFlavor } from "@mdcore/engine";

// Render Markdown to HTML
const result = render("# Hello **world**");
console.log(result.html);
// → <h1>Hello <strong>world</strong></h1>

// Detect flavor
const flavor = detectFlavor(obsidianContent);
console.log(flavor.primary);   // "obsidian"
console.log(flavor.wikilinks); // true
console.log(flavor.confidence); // 0.85
```

## API

### `render(markdown: string): RenderResult`

Parse and render Markdown to HTML.

Returns:
- `html` — Rendered HTML string
- `flavor` — Detected flavor info (primary, math, mermaid, wikilinks, jsx, frontmatter, confidence)
- `title` — Extracted first H1 (or undefined)
- `toc_json` — JSON string of table of contents entries

### `detectFlavor(markdown: string): FlavorInfo`

Detect the Markdown flavor without rendering.

### `renderWithOptions(markdown: string, options: string): RenderResult`

Render with custom options (JSON string).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core Engine | Rust + comrak + syntect |
| WASM | wasm-bindgen + wasm-pack |
| Web App | Next.js 15 + TailwindCSS |
| Math | KaTeX |
| Diagrams | Mermaid.js |
| Types | Auto-generated TypeScript |

## Keyboard Shortcuts (mdfy.cc)

| Shortcut | Action |
|----------|--------|
| `⌘S` | Share (copy URL to clipboard) |
| `⌘⇧C` | Copy rendered HTML |
| `⌘\` | Toggle view mode (Split / Preview / Editor) |
| `Esc` | Focus editor |

## Roadmap

- [ ] napi-rs Node.js native bindings
- [ ] `@mdcore/terminal` — CLI Markdown renderer
- [ ] X→MD conversion (HTML, PDF, DOCX → Markdown)
- [ ] VS Code extension
- [ ] Obsidian plugin
- [ ] Interactive editing (tables, diagrams)
- [ ] Canvas mode (Excalidraw for MD)
- [ ] Mobile SDK (UniFFI → Swift/Kotlin)

## License

MIT

---

**mdcore** — *The Markdown Engine for the AI Era*

[mdcore.ai](https://mdcore.ai) · [mdfy.cc](https://mdfy.cc) · [mdcore.md](https://mdcore.md)
