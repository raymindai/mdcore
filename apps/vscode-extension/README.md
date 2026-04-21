# mdfy.cc -- Markdown Publisher for VS Code

**Write Markdown. Preview beautifully. Publish instantly. Share a permanent URL.**

![mdfy WYSIWYG Preview](https://mdfy.cc/images/vscode/hero.png)

Turn any `.md` file into a shareable web document with code highlighting, math equations, and diagrams -- directly from VS Code.

---

## Features

### WYSIWYG Preview

Open any Markdown file and press **Cmd+Shift+M** to see it rendered with the same engine that powers [mdfy.cc](https://mdfy.cc).

![WYSIWYG Preview](https://mdfy.cc/images/vscode/preview.png)

- Click and type directly in the rendered view
- Formatting toolbar: bold, italic, headings, lists, links, code blocks, tables
- Dark and light themes -- follows your VS Code settings
- Live/Source toggle for switching between rendered and raw Markdown

### One-Click Publish

Right-click any `.md` file and select **Publish to mdfy.cc** to get a permanent, shareable URL.

![Publish](https://mdfy.cc/images/vscode/publish.png)

- No account required for basic publishing
- URL format: `mdfy.cc/d/abc123`
- Recipients see a beautifully rendered document -- no Markdown knowledge needed
- Edit token saved locally for future updates

### Cloud Sync

Keep your local Markdown files in sync with mdfy.cc.

![Cloud Sync](https://mdfy.cc/images/vscode/sync.png)

- **Push** local changes to cloud on save (auto or manual)
- **Pull** remote changes to local file
- **Conflict detection** with VS Code's built-in diff editor
- **Offline queue** -- failed syncs retry automatically
- Status bar shows sync state: synced / pushing / pulling

### Sidebar

Browse all your documents -- local, synced, and cloud -- in one place.

![Sidebar](https://mdfy.cc/images/vscode/sidebar.png)

- Local files with sync status indicators
- Cloud documents accessible without local copies
- Cloud folders with expand/collapse
- Search and filter across all documents
- Click to open, right-click for actions

### AI Tools

Five AI-powered commands to enhance your documents.

- **AI Polish** -- improve writing quality and clarity
- **AI Summary** -- generate a concise summary
- **AI TL;DR** -- extract key points
- **AI Translate** -- translate to any language
- **Ask AI to Edit** -- describe changes in natural language

Access via Command Palette (Cmd+Shift+P) or right-click context menu.

### Rendering Engine

Powered by a Rust + WASM engine (comrak) -- the same engine used across all mdfy platforms:

- **GFM** -- tables, task lists, strikethrough, autolinks, footnotes
- **KaTeX** -- inline `$E=mc^2$` and display math blocks
- **Mermaid** -- flowcharts, sequence diagrams, gantt charts, pie charts, class diagrams
- **Syntax highlighting** -- 190+ languages with automatic detection
- **ASCII diagrams** -- box-drawing art with "Convert to Mermaid" option

---

## Getting Started

1. Install this extension
2. Open any `.md` file
3. Press **Cmd+Shift+M** (or Ctrl+Shift+M) to preview
4. Right-click > **mdfy: Publish to mdfy.cc**
5. Share the URL

### Login (optional)

For cloud sync, document management, and AI tools:

1. Run **mdfy: Login to mdfy.cc** from Command Palette
2. Browser opens for Google/GitHub OAuth
3. Authenticated automatically -- no tokens to copy

---

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Preview (WYSIWYG) | `Cmd+Shift+M` | Live preview with inline editing |
| Publish to mdfy.cc | `Cmd+Alt+P` | Publish and get a shareable URL |
| Push to mdfy.cc | -- | Sync local changes to cloud |
| Pull from mdfy.cc | -- | Pull latest version from cloud |
| Export | `Cmd+Alt+E` | Export to HTML or rich text |
| Login | -- | Authenticate for account features |
| AI Polish | -- | Improve writing quality |
| AI Summary | -- | Generate concise summary |
| AI TL;DR | -- | Extract key points |
| AI Translate | -- | Translate document |
| Ask AI to Edit | -- | Natural language editing |

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mdfy.theme` | `auto` | Preview theme (`auto` / `dark` / `light`) |
| `mdfy.autoSync` | `false` | Auto-sync on save |
| `mdfy.autoPreview` | `true` | Auto-open preview for .md files |
| `mdfy.syncInterval` | `30` | Polling interval in seconds (10-300) |

---

## How Sync Works

Publishing creates a `.mdfy.json` sidecar file next to your `.md`:

```json
{
  "docId": "abc123",
  "editToken": "...",
  "lastSyncedAt": "2026-04-21T..."
}
```

This enables push/pull without re-authentication. Your Markdown source stays local. mdfy.cc hosts the rendered, shareable version.

---

## Part of the mdfy Ecosystem

mdfy.cc is available on every platform. Documents sync across all of them.

| Platform | What it does | Get it |
|----------|-------------|--------|
| **[Web](https://mdfy.cc)** | Full editor with WYSIWYG, AI tools, image gallery | [mdfy.cc](https://mdfy.cc) |
| **VS Code** | Preview, publish, sync from your editor | You are here |
| **[Mac Desktop](https://mdfy.cc/plugins)** | Native app with sidebar, drag-and-drop import | [Download DMG](https://mdfy.cc/plugins) |
| **[Chrome Extension](https://mdfy.cc/plugins)** | Capture from ChatGPT, Claude, Gemini | [Download](https://mdfy.cc/plugins) |
| **[CLI](https://www.npmjs.com/package/mdfy-cli)** | Publish from terminal, pipe support | `npm i -g mdfy-cli` |
| **[MCP Server](https://www.npmjs.com/package/mdfy-mcp)** | AI agents create/read/update documents | `npx mdfy-mcp` |
| **QuickLook** | Press Space on .md files in Finder | [Build from source](https://github.com/raymindai/mdcore) |
| **tmux** | Capture terminal pane and publish | [Install guide](https://github.com/raymindai/mdcore) |

### Cross-AI Workflow

Publish from any AI, read from any AI:

```
ChatGPT response --> Chrome Extension captures --> mdfy.cc/d/abc123
Claude reads mdfy.cc/d/abc123 --> refines --> updates the same URL
Share the URL with your team -- they see a rendered document
```

---

## Requirements

- VS Code 1.85 or later
- macOS, Windows, or Linux
- Node.js 18+ (for WASM engine)

## Links

- [mdfy.cc](https://mdfy.cc) -- Web editor
- [Plugins](https://mdfy.cc/plugins) -- All platforms
- [API Docs](https://mdfy.cc/docs) -- REST API reference
- [GitHub](https://github.com/raymindai/mdcore) -- Source code
- [Issues](https://github.com/raymindai/mdcore/issues) -- Bug reports

---

**Free during beta.** No login required to publish.
