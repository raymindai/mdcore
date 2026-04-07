# Packages Guide

This document describes all packages in the mdcore monorepo, how they relate to each other, and how they are used by apps and plugins.

## Overview

mdcore is organized as a monorepo with five packages under `packages/`:

| Package | npm Name | Description | Language |
|---------|----------|-------------|----------|
| `packages/engine` | `@mdcore/engine` (Rust crate) | Rust Markdown parser (comrak) compiled to WASM | Rust |
| `packages/mdcore` | `@mdcore/engine` (npm) | TypeScript wrapper around WASM -- render, postprocess, file import | TypeScript |
| `packages/styles` | `@mdcore/styles` | CSS-only package -- themes, rendered doc styles, print | CSS |
| `packages/api` | `@mdcore/api` | HTTP client for the mdfy.cc document API | TypeScript |
| `packages/ai` | `@mdcore/ai` | AI provider abstraction (Gemini, OpenAI, Anthropic) | TypeScript |

## Architecture

```text
                    packages/engine (Rust)
                    Markdown parser + flavor detection
                           |
                     wasm-pack build
                           |
                           v
                    packages/mdcore (TypeScript)
                    WASM wrapper + postprocess + file import
                   /               \
                  /                 \
    packages/styles             packages/ai
    CSS themes + doc styles     AI providers + mdfy text
                  \                 /
                   \               /
                    v             v
              +---------------------------+
              |     packages/api          |
              |  HTTP client (publish,    |
              |  pull, update, delete)    |
              +---------------------------+
                         |
            +-----------+-----------+
            |           |           |
         apps/web    apps/vscode   3rd party
         (mdfy.cc)   extension     integrations

```

## Package Details

### @mdcore/engine (Rust) -- `packages/engine`

The core Markdown parsing engine written in Rust, built on [comrak](https://github.com/kivikakk/comrak).

**Responsibilities:**
- Parse Markdown to HTML (full GFM support)
- Math rendering setup (outputs `<span data-math-style="...">`)
- Code block markup (outputs `<pre lang="..."><code>`)
- Table of contents extraction
- Markdown flavor detection (GFM, Obsidian, MDX, Pandoc, CommonMark)
- Frontmatter detection (YAML, TOML, JSON)

**Build:**
```bash
cd packages/engine
cargo test                    # Run 16 tests
wasm-pack build --target web --out-dir ../mdcore/wasm --release
```

**Important:** This package does NOT do syntax highlighting (no syntect -- it breaks WASM compilation). Highlighting is handled by the TypeScript postprocessor.

### @mdcore/engine (npm) -- `packages/mdcore`

The TypeScript package published to npm as `@mdcore/engine`. Wraps the WASM bindings and provides a complete rendering pipeline.

**Responsibilities:**
- WASM initialization and binding
- Post-processing: highlight.js syntax highlighting, KaTeX math rendering, ASCII diagram detection, copy buttons
- Mermaid SVG styling (DOM-level)
- HTML-to-Markdown conversion (Turndown + GFM plugin)
- AI conversation detection and formatting
- CLI output conversion to Markdown
- Multi-format file import (CSV, JSON, XML, HTML, RTF, LaTeX, RST)

**Key export -- the `mdcore` object:**
```ts
import { mdcore } from "@mdcore/engine";

await mdcore.init(wasmBindings); // required once
const result = mdcore.render("# Hello");
// result.html -- fully processed HTML
// result.title -- document title
// result.toc -- table of contents
// result.flavor -- detected Markdown flavor
```

**Dependencies:** highlight.js, katex, turndown, turndown-plugin-gfm

### @mdcore/styles -- `packages/styles`

CSS-only package. No JavaScript, no build step.

**Responsibilities:**
- Dark and light theme CSS variables (40+ variables)
- `.mdcore-rendered` class styles (headings, tables, code, lists, math, images, etc.)
- highlight.js light-mode color overrides
- Mermaid and ASCII diagram container styles
- Print/PDF export styles
- Scrollbar and contentEditable helpers

**Usage:**
```css
@import "@mdcore/styles";
```

### @mdcore/api -- `packages/api`

HTTP client for the mdfy.cc REST API. Zero dependencies (uses native `fetch`).

**Responsibilities:**
- `MdfyClient` class with full CRUD operations
- Standalone functions for quick one-off calls
- Document publishing, updating, pulling, deleting
- Version history management
- Image upload
- Access control (edit mode, allowed emails, token rotation)

**Usage:**
```ts
import { MdfyClient } from "@mdcore/api";
const client = new MdfyClient();
const result = await client.publish("# Hello");
```

### @mdcore/ai -- `packages/ai`

AI provider abstraction layer. BYOK (Bring Your Own Key). Zero AI SDK dependencies.

**Responsibilities:**
- Unified `callAI()` interface across Gemini, OpenAI, Anthropic
- `mdfyText()` -- raw text to structured Markdown
- `asciiRender()` -- ASCII/Mermaid diagrams to styled HTML
- AI conversation detection and parsing
- Provider-specific raw calls (`callGemini`, `callOpenAI`, `callAnthropic`)

**Usage:**
```ts
import { mdfyText } from "@mdcore/ai";
const md = await mdfyText(rawText, { provider: "gemini", apiKey: "..." });
```

## How Apps Use Packages

### apps/web (mdfy.cc)

The main web app uses all packages:

| Package | Usage |
|---------|-------|
| `@mdcore/engine` (Rust) | WASM binary loaded in the browser for real-time rendering |
| `@mdcore/engine` (npm) | `mdcore.render()` + `postProcessHtml()` + file import + conversation detection |
| `@mdcore/styles` | Extracted from `globals.css` (styles originated here, now shared as a package) |
| `@mdcore/api` | Server-side API routes under `app/api/docs/` |
| `@mdcore/ai` | Server-side AI routes (`/api/import/mdfy`, `/api/ascii-to-mermaid`) |

### apps/vscode-extension

The VS Code extension uses a subset of packages:

| Package | Usage |
|---------|-------|
| `@mdcore/engine` (npm) | Renders Markdown in the preview webview |
| `@mdcore/styles` | Styles the webview preview panel |
| `@mdcore/api` | Publishes documents to mdfy.cc from the editor |

### Third-Party Integrations

External developers can use any combination:

```ts
// Render-only (no API, no AI)
import { mdcore } from "@mdcore/engine";
import "@mdcore/styles";

// Publish-only (no rendering)
import { publish } from "@mdcore/api";

// AI-only (no rendering, no publishing)
import { mdfyText } from "@mdcore/ai";
```

## Package Dependency Graph

```text
@mdcore/engine (npm)
  depends on: highlight.js, katex, turndown
  bundles: @mdcore/engine (WASM binary)

@mdcore/styles
  depends on: nothing (pure CSS)

@mdcore/api
  depends on: nothing (uses native fetch)

@mdcore/ai
  depends on: nothing (uses native fetch)
```

No package depends on another package. They are fully independent and can be installed separately.

## Migration Guide

If you previously used mdfy.cc code directly (copying from `apps/web/src/lib/`), here is how to migrate to packages:

### Rendering

**Before (hardcoded):**
```ts
import { render } from "../lib/wasm/mdcore_engine";
import { postProcessHtml } from "../lib/postprocess";

const raw = render(markdown);
const html = postProcessHtml(raw.html);
```

**After (package):**
```ts
import { mdcore } from "@mdcore/engine";

mdcore.init(wasmBindings);
const result = mdcore.render(markdown);
// result.html is already post-processed
```

### Styles

**Before (hardcoded):**
```css
/* Copy-pasted from globals.css */
```

**After (package):**
```css
@import "@mdcore/styles";
```

### API Calls

**Before (hardcoded):**
```ts
const res = await fetch("/api/docs", {
  method: "POST",
  body: JSON.stringify({ markdown, title }),
});
```

**After (package):**
```ts
import { publish } from "@mdcore/api";
const result = await publish(markdown, title);
```

### AI Calls

**Before (hardcoded):**
```ts
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/...`, {
  method: "POST",
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
});
```

**After (package):**
```ts
import { callAI } from "@mdcore/ai";
const text = await callAI(prompt, { provider: "gemini", apiKey: "..." });
```

## Directory Structure

```text
packages/
├── engine/                  # Rust crate (compiled to WASM)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs           # WASM bindings (wasm-bindgen)
│       ├── render.rs        # HTML rendering via comrak
│       └── flavor.rs        # Markdown flavor detection
│
├── mdcore/                  # TypeScript npm package (@mdcore/engine)
│   ├── package.json
│   ├── tsup.config.ts       # Build config (copies WASM binary to dist/)
│   ├── wasm/                # WASM build output (from engine)
│   └── src/
│       ├── index.ts         # Main export: mdcore object + re-exports
│       ├── types.ts         # FlavorInfo, RenderResult, RenderOptions, etc.
│       ├── postprocess.ts   # highlight.js + KaTeX + ASCII diagram detection
│       ├── mermaid-style.ts # Mermaid SVG post-processing
│       ├── html-to-md.ts    # HTML to Markdown (Turndown)
│       ├── ai-conversation.ts  # AI conversation detection
│       ├── cli-to-md.ts     # CLI output to Markdown
│       └── file-import.ts   # Multi-format file import
│
├── styles/                  # CSS-only package (@mdcore/styles)
│   ├── package.json
│   └── src/
│       ├── index.css        # Main entry (imports all modules)
│       ├── theme.css        # Imports dark + light themes
│       ├── theme-dark.css   # Dark theme CSS variables (default)
│       ├── theme-light.css  # Light theme CSS variables
│       ├── rendered.css     # .mdcore-rendered document styles
│       ├── code.css         # highlight.js light-mode overrides
│       ├── diagram.css      # Mermaid + ASCII diagram containers
│       ├── toolbar.css      # Scrollbar, editor, contentEditable
│       └── print.css        # @media print styles
│
├── api/                     # HTTP client (@mdcore/api)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts         # Public API exports
│       ├── client.ts        # MdfyClient class + MdfyApiError
│       ├── types.ts         # All TypeScript interfaces
│       ├── documents.ts     # Standalone document functions
│       └── upload.ts        # Standalone upload function
│
└── ai/                      # AI provider abstraction (@mdcore/ai)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts         # Public API exports
        ├── types.ts         # AIProvider, AIConfig, ConversationMessage
        ├── config.ts        # Default models, temperature, max tokens
        ├── mdfy-text.ts     # Raw text to structured Markdown
        ├── ascii-render.ts  # ASCII/Mermaid to styled HTML
        ├── conversation.ts  # AI conversation detection + formatting
        └── providers/
            ├── index.ts     # callAI() factory
            ├── gemini.ts    # Google Gemini provider
            ├── openai.ts    # OpenAI provider
            └── anthropic.ts # Anthropic provider
```

## Contributing

### Adding a New Package

1. Create `packages/{name}/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Use `@mdcore/{name}` as the npm package name
3. Add a `README.md` with install, quick start, API reference, and examples
4. Update this document and the root `README.md`
5. Keep packages independent -- no cross-package imports

### Modifying Existing Packages

- **engine (Rust):** Run `cargo test` after changes. Rebuild WASM with `wasm-pack build`.
- **mdcore (TypeScript):** Run `npm run build` (uses tsup). Test that `postprocess.ts` regex matches comrak's `github_pre_lang: true` output format.
- **styles:** No build step. Test in browser with both `data-theme="dark"` and `data-theme="light"`.
- **api:** Run `npm run build` (uses tsc). Test against the live API or a local dev server.
- **ai:** Run `npm run build` (uses tsc). Test with real API keys (no mocks -- these are HTTP-only).

### Package Conventions

- All TypeScript packages target ES2022 with ESNext modules
- All packages export both ESM and CJS (except styles, which is CSS-only)
- All packages include TypeScript declarations (`.d.ts`)
- Zero cross-package dependencies
- MIT license for all packages
