# mdfy Desktop

Native macOS Markdown editor with mdfy.cc quality rendering.

## Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm start
```

## Build

```bash
# Build distributable
npm run build
```

## Features

- WYSIWYG editing via contentEditable with HTML-to-Markdown roundtrip
- Source view toggle (Cmd+/)
- Full GFM support: tables, task lists, strikethrough
- Code syntax highlighting (highlight.js)
- KaTeX math rendering
- Mermaid diagram support
- Share to mdfy.cc with one click (Cmd+Shift+P)
- Auto-save on edit (5s debounce)
- File watching for external changes
- Drag & drop .md files
- Dark/Light mode follows system preference
- macOS native title bar with traffic lights
- .md and .markdown file association
- Recent files tracking
- Keyboard shortcuts (Cmd+B bold, Cmd+I italic, Cmd+K link)
- Table inline editing (double-click cells)
- Table context menu (right-click for add/delete rows/columns)
- Word and character count
- Markdown flavor detection

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New | Cmd+N |
| Open | Cmd+O |
| Save | Cmd+S |
| Save As | Cmd+Shift+S |
| Share | Cmd+Shift+P |
| Toggle Source | Cmd+/ |
| Bold | Cmd+B |
| Italic | Cmd+I |
| Link | Cmd+K |

## Architecture

```
main.js       — Electron main process (window, menu, IPC, file I/O)
preload.js    — Context bridge (safe IPC API exposure)
renderer/
  index.html  — Main window layout
  styles.css  — Dark/Light theme, mdcore-rendered styles
  app.js      — WYSIWYG editor, markdown rendering, file operations
```

The app uses `marked` for Markdown-to-HTML rendering (client-side), with post-processing for highlight.js, KaTeX, and Mermaid. WYSIWYG editing uses contentEditable with a custom HTML-to-Markdown converter ported from the VS Code extension.

## Tech Stack

- Electron 33
- marked (Markdown parser)
- highlight.js (syntax highlighting)
- KaTeX (math rendering)
- Mermaid (diagrams)
