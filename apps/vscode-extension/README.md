# mdfy.cc — Markdown Publisher

**Write Markdown. Publish instantly. Share a beautiful URL.**

Turn any `.md` file into a beautifully rendered, shareable web document — directly from VS Code. No account required.

---

## What You Get

- **WYSIWYG Preview** — Edit directly in the rendered preview. Toolbar for bold, italic, headings, lists, links, code blocks, tables.
- **One-Click Publish** — Right-click → Publish → get `mdfy.cc/d/abc123`. Share with anyone.
- **Bidirectional Sync** — Push local changes up. Pull remote changes down. Visual diff on conflicts.
- **Sidebar** — Browse local and cloud documents. See sync status at a glance.
- **Offline Queue** — Failed syncs are queued and retried automatically.

## Rendering

Same engine as mdfy.cc — powered by Rust/WASM:

- GFM tables, task lists, strikethrough, autolinks
- KaTeX math — inline `$E=mc^2$` and display blocks
- Mermaid diagrams — flowcharts, sequences, and more
- Syntax highlighting — 190+ languages
- Dark and light themes — follows your VS Code theme

## Getting Started

1. Install this extension
2. Open any `.md` file
3. Press **Cmd+Shift+M** (or Ctrl+Shift+M) to preview
4. Right-click → **mdfy: Publish to mdfy.cc**
5. Share the URL

## Commands

| Command | Shortcut | What it does |
|---------|----------|--------------|
| Preview (WYSIWYG) | `Cmd+Shift+M` | Live preview with inline editing |
| Publish to mdfy.cc | `Cmd+Alt+P` | Publish and get a shareable URL |
| Push to mdfy.cc | — | Sync local changes to cloud |
| Pull from mdfy.cc | — | Pull latest from cloud |
| Export | `Cmd+Alt+E` | Export to HTML or rich text |
| Login | — | Authenticate for account features |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mdfy.theme` | `auto` | Preview theme (auto / dark / light) |
| `mdfy.autoSync` | `false` | Auto-sync on save |
| `mdfy.autoPreview` | `true` | Auto-open preview for .md files |
| `mdfy.syncInterval` | `30` | Polling interval in seconds |

## How Sync Works

Publishing creates a `.mdfy.json` sidecar next to your `.md` file:

```json
{
  "docId": "abc123",
  "editToken": "...",
  "lastSyncedAt": "2026-04-18T..."
}
```

This enables push/pull without re-authentication. Your Markdown stays local — mdfy.cc hosts the rendered view.

## mdfy Ecosystem

| Platform | How to get it |
|----------|---------------|
| Web | [mdfy.cc](https://mdfy.cc) |
| VS Code | You are here |
| Mac App | Native desktop with sidebar and sync |
| CLI | `npm install -g mdfy-cli` |
| MCP Server | `npx mdfy-mcp` — AI tools integration |
| Chrome Extension | Capture ChatGPT / Claude conversations |
| QuickLook | Press Space on .md files in Finder |

## Links

[mdfy.cc](https://mdfy.cc) · [Docs](https://mdfy.cc/docs) · [GitHub](https://github.com/raymindai/mdcore) · [Issues](https://github.com/raymindai/mdcore/issues)
