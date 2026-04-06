# @mdcore/styles

Rendering styles for mdfy.cc — dark/light themes, rendered document CSS, code highlighting overrides, diagram containers, and print styles.

## Install

```bash
npm install @mdcore/styles
```

## Usage

Import everything:

```css
@import "@mdcore/styles";
```

Or import individual modules:

```css
@import "@mdcore/styles/theme";       /* CSS variables (dark + light) */
@import "@mdcore/styles/rendered";    /* .mdcore-rendered document styles */
@import "@mdcore/styles/code";        /* highlight.js light mode overrides */
@import "@mdcore/styles/diagram";     /* Mermaid + ASCII diagram containers */
@import "@mdcore/styles/toolbar";     /* Scrollbar, editor, contentEditable */
@import "@mdcore/styles/print";       /* Print / PDF export styles */
```

## Theme Switching

Set `data-theme="dark"` or `data-theme="light"` on a parent element (or `<html>`). Dark is the default.

```html
<html data-theme="dark">
  <body>
    <div class="mdcore-rendered">
      <!-- rendered markdown HTML here -->
    </div>
  </body>
</html>
```

## License

MIT
