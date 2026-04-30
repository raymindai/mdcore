# @mdcore/styles

The rendering stylesheet for [mdfy.app](https://mdfy.app) -- dark/light themes, rendered document CSS, code highlighting overrides, Mermaid/ASCII diagram containers, print styles, and toolbar/scrollbar styling.

Zero JavaScript. Pure CSS. Just import and go.

## Install

```bash
npm install @mdcore/styles
```

## Quick Start

Import everything with one line:

```css
@import "@mdcore/styles";
```

Add the `mdcore-rendered` class to your container and set a theme:

```html
<html data-theme="dark">
  <body>
    <div class="mdcore-rendered">
      <!-- your rendered Markdown HTML goes here -->
    </div>
  </body>
</html>
```

That's it. Headings, paragraphs, tables, code blocks, math, diagrams -- all styled.

## Individual Imports

Import only what you need:

```css
@import "@mdcore/styles/theme";       /* CSS variables (dark + light) */
@import "@mdcore/styles/rendered";    /* .mdcore-rendered document styles */
@import "@mdcore/styles/code";        /* highlight.js light-mode overrides */
@import "@mdcore/styles/diagram";     /* Mermaid + ASCII diagram containers */
@import "@mdcore/styles/toolbar";     /* Scrollbar, editor, contentEditable helpers */
@import "@mdcore/styles/print";       /* Print / PDF export styles */
```

Or import themes individually:

```css
@import "@mdcore/styles/theme-dark";  /* Dark theme only (default) */
@import "@mdcore/styles/theme-light"; /* Light theme only */
```

## Available Files

| File | Export Path | Description |
|------|------------|-------------|
| `src/index.css` | `@mdcore/styles` | Main entry -- imports all modules below |
| `src/theme.css` | `@mdcore/styles/theme` | Combined dark + light theme variables |
| `src/theme-dark.css` | `@mdcore/styles/theme-dark` | Dark theme CSS variables (default) |
| `src/theme-light.css` | `@mdcore/styles/theme-light` | Light theme CSS variables |
| `src/rendered.css` | `@mdcore/styles/rendered` | All `.mdcore-rendered` document styles |
| `src/code.css` | `@mdcore/styles/code` | highlight.js light-mode color overrides |
| `src/diagram.css` | `@mdcore/styles/diagram` | Mermaid + ASCII diagram container styles |
| `src/toolbar.css` | `@mdcore/styles/toolbar` | Scrollbar, textarea, contentEditable helpers |
| `src/print.css` | `@mdcore/styles/print` | `@media print` styles for PDF export |

## CSS Variables Reference

All variables are set on `:root` (dark default) and overridden under `[data-theme="light"]`.

### Layout & Surface

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--background` | `#09090b` | `#faf9f7` | Page background |
| `--foreground` | `#fafafa` | `#18181b` | Page foreground |
| `--surface` | `#18181b` | `#f4f4f5` | Card/panel background |
| `--surface-hover` | `rgba(251,146,60,0.03)` | `rgba(234,88,12,0.04)` | Surface hover state |
| `--border` | `#27272a` | `#e4e4e7` | Primary border color |
| `--border-dim` | `rgba(39,39,42,0.6)` | `rgba(228,228,231,0.6)` | Subtle border color |

### Accent

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--accent` | `#fb923c` | `#ea580c` | Primary accent (orange) |
| `--accent-dim` | `rgba(251,146,60,0.15)` | `rgba(234,88,12,0.1)` | Accent background tint |

### Text

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--text-primary` | `#fafafa` | `#09090b` | Headings, strong text |
| `--text-secondary` | `#d4d4d8` | `#3f3f46` | Body text |
| `--text-tertiary` | `#a1a1aa` | `#71717a` | Subdued text |
| `--text-muted` | `#71717a` | `#71717a` | Muted text, list markers |
| `--text-faint` | `#737373` | `#a1a1aa` | Placeholders, faint text |
| `--h2-color` | `#e4e4e7` | `#27272a` | H2-H4 heading color |

### Editor

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--editor-text` | `#d4d4d8` | `#3f3f46` | Editor text color |
| `--editor-placeholder` | `#3f3f46` | `#a1a1aa` | Placeholder color |
| `--scrollbar-thumb` | `#27272a` | `#a1a1aa` | Scrollbar thumb |
| `--scrollbar-hover` | `#3f3f46` | `#a1a1aa` | Scrollbar thumb hover |

### Math

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--math-color` | `#c4b5fd` | `#7c3aed` | Inline math color |
| `--math-display-color` | `#ddd6fe` | `#6d28d9` | Display math color |

### Code Blocks

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--code-copy-bg` | `#27272a` | `#f4f4f5` | Copy button background |
| `--code-copy-color` | `#a1a1aa` | `#71717a` | Copy button icon color |
| `--code-copy-border` | `#3f3f46` | `#e4e4e7` | Copy button border |

### UI Components

| Variable | Dark | Light | Description |
|----------|------|-------|-------------|
| `--header-bg` | `rgba(9,9,11,0.95)` | `rgba(255,255,255,0.95)` | Sticky header background |
| `--badge-bg` | `rgba(251,146,60,0.15)` | `rgba(234,88,12,0.1)` | Badge background |
| `--badge-muted-bg` | `rgba(39,39,42,0.8)` | `rgba(244,244,245,0.8)` | Muted badge background |
| `--badge-muted-color` | `#71717a` | `#71717a` | Muted badge text |
| `--menu-bg` | `#18181b` | `#ffffff` | Context menu background |
| `--menu-hover` | `rgba(39,39,42,0.5)` | `rgba(244,244,245,0.8)` | Menu item hover |
| `--toggle-bg` | `rgba(39,39,42,0.5)` | `#e4e4e7` | Toggle background |
| `--toggle-active` | `#3f3f46` | `#d4d4d8` | Active toggle background |
| `--drag-bg` | `rgba(9,9,11,0.9)` | `rgba(255,255,255,0.9)` | Drag overlay background |

## Theme Switching

Set `data-theme` on any ancestor element (typically `<html>` or `<body>`). Dark is the default.

```html
<!-- Dark theme (default, also applies to :root) -->
<html data-theme="dark">

<!-- Light theme -->
<html data-theme="light">
```

Toggle with JavaScript:

```js
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

// Restore on load
const saved = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", saved);
```

## Customization

Override any variable to customize the look:

```css
@import "@mdcore/styles";

/* Custom accent color (blue instead of orange) */
:root,
[data-theme="dark"] {
  --accent: #3b82f6;
  --accent-dim: rgba(59, 130, 246, 0.15);
}

[data-theme="light"] {
  --accent: #2563eb;
  --accent-dim: rgba(37, 99, 235, 0.1);
}
```

## Usage Examples

### Next.js / React

```tsx
// app/layout.tsx
import "@mdcore/styles";

export default function Layout({ children }) {
  return (
    <html data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// components/Preview.tsx
export function Preview({ html }: { html: string }) {
  return (
    <div
      className="mdcore-rendered"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### VS Code Extension (Webview)

```ts
// Load styles into webview
const stylesUri = webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, "node_modules/@mdcore/styles/src/index.css")
);

function getWebviewContent(html: string) {
  return `<!DOCTYPE html>
<html data-theme="dark">
<head><link rel="stylesheet" href="${stylesUri}"></head>
<body>
  <div class="mdcore-rendered">${html}</div>
</body>
</html>`;
}
```

### Electron App

```html
<!-- index.html -->
<html data-theme="dark">
<head>
  <link rel="stylesheet" href="./node_modules/@mdcore/styles/src/index.css">
</head>
<body>
  <div class="mdcore-rendered" id="preview"></div>
</body>
</html>
```

### Plain HTML

```html
<link rel="stylesheet" href="https://unpkg.com/@mdcore/styles/src/index.css">

<div class="mdcore-rendered" data-theme="dark">
  <h1>Hello World</h1>
  <p>This is a paragraph with <strong>bold</strong> and <code>inline code</code>.</p>
</div>
```

## What Each Module Styles

### rendered.css

Styles everything inside `.mdcore-rendered`:

- **Headings** (h1-h6) -- sizes, weights, colors, bottom borders
- **Paragraphs, strong, em** -- spacing, colors
- **Links** -- accent color, hover underline
- **Blockquotes** -- left border, background
- **Inline code** -- monospace, background, accent color
- **Code blocks** (`pre > code`) -- surface background, rounded corners, copy button hover
- **Tables** -- full-width, header styling, hover rows, cell borders
- **Lists** (ul, ol, nested) -- proper indentation, marker styles, nesting levels
- **Task lists** -- custom checkbox styling, accent-colored checks
- **Images** -- rounded corners, border, lightbox zoom, alignment, sizing
- **KaTeX math** -- inline and display math, purple tones
- **Footnotes** -- section separator, small text
- **Description lists** (dt/dd) -- bold terms, indented definitions
- **Horizontal rules** -- subtle divider

### code.css

Light-mode overrides for highlight.js syntax tokens:

- Keywords: `#a626a4` (purple)
- Strings/types: `#50a14f` (green)
- Comments: `#a0a1a7` (gray)
- Numbers/builtins: `#c18401` (gold)
- Functions: `#4078f2` (blue)

Dark mode uses the highlight.js `github-dark` theme as-is (no overrides needed).

### diagram.css

Container styles for Mermaid and ASCII diagrams:

- `.mermaid-container` -- gradient background, border, shadow, centered SVG
- `.ascii-diagram` -- same container style, monospace code block inside
- Light-mode variants with lighter backgrounds and shadows

### toolbar.css

Editor and UI helpers:

- Custom scrollbar (6px, rounded thumb)
- Textarea placeholder and selection colors
- ContentEditable table/image controls (suppresses browser-injected handles)
- Selection highlight prevention on non-editable elements

### print.css

`@media print` overrides for PDF export:

- Hides header, footer, textarea, editor, copy buttons
- Forces white background, dark text
- Adjusts heading sizes for print
- Removes shadows and background gradients from diagrams

## Requirements

- No JavaScript dependencies
- Works with any Markdown-to-HTML renderer (comrak, marked, remark, etc.)
- Rendered HTML should use `.mdcore-rendered` as the container class
- highlight.js classes (`.hljs`, `.hljs-keyword`, etc.) expected for code.css
- KaTeX classes (`.katex`, `.katex-display`) expected for math styles

## License

MIT
