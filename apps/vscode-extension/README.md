# mdfy.cc — VS Code Extension

Preview and publish Markdown documents to [mdfy.cc](https://mdfy.cc) directly from VS Code.

## Features

- **Preview** (Cmd+Shift+M) — Renders Markdown with the same styles as mdfy.cc, including GFM tables, task lists, code highlighting, KaTeX math, and Mermaid diagrams
- **Publish** — One-click publish to mdfy.cc, get a shareable URL instantly
- **Update** — Push changes to an already-published document
- **Status bar** — Quick-publish button visible when editing .md files

## Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| `mdfy: Preview` | Cmd+Shift+M | Open side-by-side preview |
| `mdfy: Publish to mdfy.cc` | — | Publish current file |
| `mdfy: Update on mdfy.cc` | — | Update previously published file |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mdfy.apiBaseUrl` | `https://mdfy.cc` | API base URL |
| `mdfy.theme` | `auto` | Preview theme: `auto`, `dark`, or `light` |

## Development

```bash
cd apps/vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## Packaging

```bash
npm run package
# Produces mdfy-vscode-0.1.0.vsix
```
