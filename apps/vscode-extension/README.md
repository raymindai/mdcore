# mdfy.cc -- Markdown Publisher for VS Code

**Write Markdown in VS Code. Publish as a beautiful web document. Share a permanent URL.**

![mdfy WYSIWYG Preview](https://mdfy.cc/images/vscode/hero.png)

mdfy.cc turns your Markdown files into shareable, beautifully rendered documents with a permanent URL -- directly from VS Code. No copy-pasting into Google Docs. No screenshots. No "can you open this .md file?" conversations.

Powered by a Rust + WASM rendering engine with GFM, KaTeX math, Mermaid diagrams, and 190+ language syntax highlighting. The same engine that powers [mdfy.cc](https://mdfy.cc), the Chrome extension, and the Mac desktop app.

---

## Table of Contents

- [Why mdfy?](#why-mdfy)
- [Features](#features)
- [Getting Started](#getting-started)
- [Commands](#commands)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [AI Tools](#ai-tools)
- [How Sync Works](#how-sync-works)
- [Use Cases](#use-cases)
- [mdfy Ecosystem](#mdfy-ecosystem)
- [FAQ](#faq)

---

## Why mdfy?

VS Code's built-in Markdown preview is read-only and local. mdfy gives you:

| | Built-in Preview | mdfy Preview |
|--|-----------------|--------------|
| Edit in preview | No | Yes -- click and type directly |
| Share with others | No | Yes -- one-click URL |
| Math equations | No | Yes -- KaTeX inline and display |
| Mermaid diagrams | No | Yes -- flowcharts, sequences, gantt |
| Cloud sync | No | Yes -- push/pull with conflict detection |
| AI tools | No | Yes -- polish, summarize, translate |
| Code highlighting | Basic | 190+ languages with theme support |

---

## Features

### WYSIWYG Preview

Press **Cmd+Shift+M** to open the mdfy preview panel. Unlike the built-in preview, you can **edit directly in the rendered view**.

![WYSIWYG Preview](https://mdfy.cc/images/vscode/preview.png)

- Click any text to edit it in place
- Formatting toolbar appears on selection: bold, italic, headings, lists, links, code, tables
- Changes sync back to your `.md` source file in real time
- Toggle between **Live** (rendered) and **Source** (raw Markdown) views
- Dark and light themes -- automatically follows your VS Code color theme

### Rich Rendering

Every Markdown feature you need, rendered correctly:

**GFM (GitHub Flavored Markdown)**
- Tables with alignment
- Task lists with checkboxes
- Strikethrough, autolinks, footnotes
- Definition lists

**Math (KaTeX)**
- Inline math: `$E = mc^2$` renders as formatted equation
- Display math blocks: `$$\int_0^\infty e^{-x} dx = 1$$`
- Automatic detection -- no special syntax needed beyond `$`

**Diagrams (Mermaid)**
- Flowcharts, sequence diagrams, gantt charts
- Class diagrams, state diagrams, pie charts
- Dark theme matching your VS Code colors
- ASCII diagrams with "Convert to Mermaid" option

**Code Blocks**
- 190+ languages with automatic detection
- Syntax highlighting that matches your theme
- Copy button on each code block
- Line numbers for long blocks

### Document Outline

Click the **Outline** button in the preview toolbar to open a document structure panel. It lists all headings (H1-H6) with indentation matching their hierarchy. Click any heading to scroll directly to it in the preview, with a brief highlight animation. The outline updates automatically as you edit.

### One-Click Publish

Turn any `.md` file into a shareable URL in one click.

![Publish Flow](https://mdfy.cc/images/vscode/publish.png)

1. Open a `.md` file
2. **Cmd+Alt+P** or right-click > **Publish to mdfy.cc**
3. URL is generated: `mdfy.cc/d/abc123`
4. URL is copied to clipboard -- paste it anywhere

**No account required** for basic publishing. The recipient sees a beautifully rendered document in their browser -- they don't need VS Code, Markdown knowledge, or an account.

### Cloud Sync

Keep your local files in sync with the published version.

![Sync Status](https://mdfy.cc/images/vscode/sync.png)

- **Auto-push on save** -- your published document updates when you save locally (configurable)
- **Pull remote changes** -- if someone edits on mdfy.cc, pull the changes to your local file
- **Conflict detection** -- when both sides change, VS Code's diff editor opens with three merge options: pull, push, or view diff
- **Offline queue** -- if you save while offline, changes are queued and pushed when you reconnect
- **Status bar indicator** -- always shows the current state: synced, pushing, pulling, or conflict

### Sidebar

Browse all your documents in one place.

![Sidebar](https://mdfy.cc/images/vscode/sidebar.png)

Click the mdfy icon in the Activity Bar to open the sidebar:

- **Local files** -- all `.md` files in your workspace with sync status
- **Synced documents** -- locally edited files that are published to mdfy.cc
- **Cloud documents** -- documents on mdfy.cc that you can pull locally
- **Cloud folders** -- organized with expand/collapse
- **Search** -- filter across all document types
- **File path** -- hover to see full path, click to open
- **Right-click menu** -- publish, sync, open in browser, unsync

### Export

Export your rendered document in multiple formats:

- **HTML** -- self-contained HTML file with all styles embedded
- **Rich text** -- paste into Google Docs, Word, or email with formatting preserved
- **Markdown** -- copy raw Markdown to clipboard

Keyboard shortcut: **Cmd+Alt+E**

---

## Getting Started

### Quick Start (no account needed)

1. Install this extension from the Marketplace
2. Open any `.md` file
3. Press **Cmd+Shift+M** to preview
4. Press **Cmd+Alt+P** to publish and get a URL

### With Account (for sync and AI)

1. Open Command Palette (**Cmd+Shift+P**)
2. Run **mdfy: Login to mdfy.cc**
3. Browser opens for Google or GitHub OAuth
4. You're authenticated -- sync and AI features are now available

---

## Commands

All commands are available via Command Palette (**Cmd+Shift+P**, type "mdfy"):

| Command | Description |
|---------|-------------|
| **mdfy: Preview (WYSIWYG)** | Open live preview with inline editing |
| **mdfy: Publish to mdfy.cc** | Publish and get a shareable URL |
| **mdfy: Push to mdfy.cc** | Push local changes to cloud |
| **mdfy: Pull from mdfy.cc** | Pull latest version from cloud |
| **mdfy: Export** | Export to HTML or rich text |
| **mdfy: Login to mdfy.cc** | Authenticate for account features |
| **mdfy: Sync Status** | Show current sync state |
| **mdfy: AI Polish** | Improve writing quality and clarity |
| **mdfy: AI Summary** | Generate a concise summary |
| **mdfy: AI TL;DR** | Extract key bullet points |
| **mdfy: AI Translate** | Translate to a specified language |
| **mdfy: Ask AI to Edit** | Describe changes in natural language |

All commands are also available in the right-click context menu when editing a Markdown file.

---

## Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Cmd+Shift+M` | Open WYSIWYG preview |
| `Cmd+Alt+P` | Publish to mdfy.cc |
| `Cmd+Alt+E` | Export document |

---

## Settings

Configure via VS Code Settings (Cmd+,) under "mdfy.cc":

| Setting | Default | Description |
|---------|---------|-------------|
| `mdfy.theme` | `auto` | Preview theme. `auto` follows VS Code's color theme. Options: `auto`, `dark`, `light` |
| `mdfy.autoSync` | `false` | Automatically push changes on file save |
| `mdfy.autoPreview` | `true` | Automatically open mdfy preview when opening a .md file |
| `mdfy.syncInterval` | `30` | Polling interval for remote changes (seconds, 10-300) |
| `mdfy.apiBaseUrl` | `https://mdfy.cc` | API endpoint (for self-hosted instances) |

---

## AI Tools

Five AI-powered tools to enhance your documents, available both as commands and in a dedicated side panel. Requires login.

### AI Side Panel

Click the **AI** button in the preview toolbar to open the AI panel alongside your document. The panel provides:

- **Quick actions** -- Polish, Summary, TL;DR, and Translate in a 2x2 grid
- **Chat input** -- describe changes in natural language, AI edits your document directly
- **Undo** -- revert the last AI change with one click
- **Diff highlighting** -- changed blocks are briefly highlighted in orange after AI edits

The AI panel, Outline panel, and Image panel are mutually exclusive -- opening one closes the others.

### AI Polish

Rewrites your document for clarity, grammar, and professional tone while preserving the original meaning and structure.

```
Before: "the system is kinda slow when lots of users connect at same time"
After:  "The system experiences performance degradation under high concurrent user load"
```

### AI Summary

Generates a concise summary of your document, capturing the key points and conclusions.

### AI TL;DR

Extracts the essential takeaways as bullet points. Useful for long documents, meeting notes, or research papers.

### AI Translate

Translates your document to any language. A prompt asks for the target language, then the entire document is translated while preserving Markdown formatting, code blocks, and technical terms.

### Ask AI to Edit

Describe what you want to change in natural language:

```
"Add a table comparing React vs Vue vs Svelte"
"Convert the bullet points in section 3 to a numbered list"
"Add error handling examples to all the code blocks"
```

The AI modifies your document based on the instruction. The change is applied directly to your Markdown source -- undo with Cmd+Z if needed.

---

## How Sync Works

### The .mdfy.json sidecar

When you publish a file, a `.mdfy.json` is created next to your `.md` file:

```json
{
  "docId": "abc123",
  "editToken": "...",
  "lastSyncedAt": "2026-04-21T12:00:00Z",
  "lastSyncedHash": "a1b2c3..."
}
```

This file tracks sync state. Add it to `.gitignore` if you don't want it in version control.

### Sync flow

```
Local save --> auto-push (if enabled) --> mdfy.cc updated
                                              |
Someone edits on mdfy.cc                      |
                                              v
Polling detects change --> pull notification --> accept or diff
```

### Conflict resolution

When both local and remote have changed:

1. VS Code notification appears: "Document has remote changes"
2. Three options:
   - **Pull** -- overwrite local with remote
   - **Push** -- overwrite remote with local
   - **Diff** -- open VS Code's diff editor to merge manually

---

## Use Cases

### Share technical documentation

Write your README, API docs, or architecture decisions in VS Code. Publish to mdfy.cc. Share the URL with your team. They see a beautifully rendered document -- no `.md` file viewer needed.

### Capture and refine AI output

Use the [Chrome extension](https://mdfy.cc/plugins) to capture an AI conversation. Pull it into VS Code for editing. Push refined version back. The URL stays the same.

### Publish from CI/CD

Use the [CLI](https://www.npmjs.com/package/mdfy-cli) in your pipeline to auto-publish documentation on every commit. Edit locally in VS Code when needed.

### Cross-AI knowledge base

Publish a document from VS Code. Paste the URL into any AI conversation. Claude, ChatGPT, and Gemini can all read mdfy.cc URLs. Use the [MCP server](https://www.npmjs.com/package/mdfy-mcp) for programmatic access.

### Meeting notes to shareable document

Take notes in Markdown during a meeting. When done, Cmd+Alt+P to publish. Share the URL in Slack. Recipients see formatted notes with tables, checklists, and code blocks -- not raw Markdown.

---

## mdfy Ecosystem

mdfy.cc is a cross-platform document publishing system. All platforms share the same rendering engine and the same document URLs.

| Platform | What it does | Install |
|----------|-------------|---------|
| **[Web Editor](https://mdfy.cc)** | Full editor with WYSIWYG, image gallery, AI tools | [mdfy.cc](https://mdfy.cc) |
| **VS Code** | Preview, publish, sync from your editor | You are here |
| **[Mac Desktop](https://mdfy.cc/plugins)** | Native app with sidebar, file import (PDF, DOCX, PPTX) | [Download DMG](https://github.com/raymindai/mdcore/releases) |
| **[Chrome Extension](https://mdfy.cc/plugins)** | Capture from ChatGPT, Claude, Gemini, GitHub | [Download](https://mdfy.cc/plugins) |
| **[CLI](https://www.npmjs.com/package/mdfy-cli)** | `mdfy publish`, pipe support, tmux capture | `npm i -g mdfy-cli` |
| **[MCP Server](https://www.npmjs.com/package/mdfy-mcp)** | AI agents create/read/update documents | `npx mdfy-mcp` |
| **QuickLook** | Press Space on .md in Finder for rendered preview | [Build from source](https://github.com/raymindai/mdcore) |
| **tmux** | Capture pane output and publish | [Install guide](https://github.com/raymindai/mdcore/tree/main/apps/tmux) |

### The URL is the bridge

Every mdfy document has a permanent short URL (`mdfy.cc/d/abc123`). This URL:

- Renders beautifully in any browser
- Is readable by any AI (paste it into a ChatGPT/Claude conversation)
- Can be embedded in websites via iframe
- Updates in place when you push changes
- Works offline via hash-based fallback

---

## FAQ

**Q: Do I need an account to publish?**
A: No. You can publish without logging in. The document gets a permanent URL and an edit token (stored locally). Login is needed for cloud sync, document listing, and AI tools.

**Q: Is my Markdown sent to a server?**
A: Rendering happens entirely in your browser via WASM. When you publish, the Markdown is stored on mdfy.cc (Supabase PostgreSQL). Documents can be private or public.

**Q: Can I use this with private/internal documents?**
A: Yes. Published documents default to private (draft). You control visibility via the publish toggle. Documents can also be password-protected on the web editor.

**Q: What happens if I uninstall the extension?**
A: Your local `.md` files are unchanged. Published documents remain on mdfy.cc. The `.mdfy.json` sidecar files can be deleted.

**Q: Does it work with existing Markdown extensions?**
A: Yes. mdfy adds its own preview panel and does not interfere with the built-in Markdown preview or other extensions.

**Q: How is this different from GitHub Gists?**
A: mdfy renders Markdown with KaTeX math, Mermaid diagrams, and full GFM. It has WYSIWYG editing, AI tools, bidirectional sync, and works across 8 platforms. Gists are static text files.

---

## Requirements

- VS Code 1.85 or later
- macOS, Windows, or Linux

## Links

- [mdfy.cc](https://mdfy.cc) -- Web editor
- [Plugins page](https://mdfy.cc/plugins) -- All platforms and downloads
- [API Documentation](https://mdfy.cc/docs) -- REST API reference
- [GitHub](https://github.com/raymindai/mdcore) -- Source code
- [Issues](https://github.com/raymindai/mdcore/issues) -- Bug reports and feature requests

---

**Free during beta.** No login required to publish. Built by a solo founder with Claude as pair programmer.
