# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: table-debug.spec.ts >> debug table cell editing
- Location: e2e/table-debug.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.innerText: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.tiptap td').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - banner [ref=e13]:
      - generic [ref=e14]:
        - heading "mdfy.app" [level=1] [ref=e16] [cursor=pointer]:
          - generic "mdfy.app" [ref=e17]
        - generic [ref=e18]:
          - button "Home (Alt+H)" [ref=e19]:
            - img [ref=e20]
          - button "Live" [ref=e23] [cursor=pointer]:
            - img [ref=e24]
            - generic [ref=e27]: Live
          - button "Split" [ref=e28] [cursor=pointer]:
            - img [ref=e29]
            - generic [ref=e31]: Split
          - button "Source" [ref=e32] [cursor=pointer]:
            - img [ref=e33]
            - generic [ref=e36]: Source
        - generic [ref=e37]:
          - button "Switch to light mode" [ref=e38]:
            - img [ref=e39]
          - generic [ref=e42]:
            - generic [ref=e43]:
              - button "SHARE" [ref=e44]:
                - img [ref=e45]
                - generic [ref=e51]: SHARE
              - generic:
                - paragraph: Share
                - paragraph:
                  - text: Publish and create a share link for this document. Changes auto-save automatically.
                  - generic: Cmd+S
            - button "Menu" [ref=e53]:
              - img [ref=e54]
    - generic [ref=e55]:
      - generic [ref=e56]:
        - generic [ref=e57]:
          - generic [ref=e58]:
            - button [ref=e60]:
              - img [ref=e61]
            - generic [ref=e63]: FILES
            - button "Refresh" [ref=e64]:
              - img [ref=e65]
            - button "What do the icons and filters mean?" [ref=e70]:
              - img [ref=e71]
          - generic [ref=e74]:
            - button [ref=e76]:
              - img [ref=e77]
            - button [ref=e81]:
              - img [ref=e82]
        - generic [ref=e83]:
          - generic [ref=e84]:
            - generic [ref=e85] [cursor=pointer]:
              - generic [ref=e86]: My MDs
              - button "Search documents" [ref=e87]:
                - img [ref=e88]
              - button "New" [ref=e92]:
                - img [ref=e93]
                - generic [ref=e96]: New
              - button "New folder" [ref=e97]:
                - img [ref=e98]
            - generic [ref=e102]:
              - button "ALL" [ref=e103]
              - button "PRIVATE" [ref=e104]
              - button "SHARED" [ref=e105]
              - button "SYNCED" [ref=e106]
            - generic [ref=e108]: No documents yet. Create one with the + button above.
          - generic [ref=e111] [cursor=pointer]: Shared with me
          - generic [ref=e112]:
            - generic [ref=e113] [cursor=pointer]:
              - img [ref=e114]
              - generic [ref=e116]: Guides & Examples
            - generic [ref=e117]:
              - generic [ref=e118] [cursor=pointer]:
                - img [ref=e119]
                - generic [ref=e122]: Welcome to mdfy.app
              - generic [ref=e123] [cursor=pointer]:
                - img [ref=e124]
                - generic [ref=e127]: Import & Export Guide
              - generic [ref=e128] [cursor=pointer]:
                - img [ref=e129]
                - generic [ref=e132]: Key Features
              - generic [ref=e133] [cursor=pointer]:
                - img [ref=e134]
                - generic [ref=e137]: Markdown Syntax Guide
              - generic [ref=e138] [cursor=pointer]:
                - img [ref=e139]
                - generic [ref=e142]: Mermaid Diagrams — All 19 Types
              - generic [ref=e143] [cursor=pointer]:
                - img [ref=e144]
                - generic [ref=e147]: ASCII Art Examples
              - generic [ref=e148] [cursor=pointer]:
                - img [ref=e149]
                - generic [ref=e152]: Chrome Extension
              - generic [ref=e153] [cursor=pointer]:
                - img [ref=e154]
                - generic [ref=e157]: VS Code Extension
              - generic [ref=e158] [cursor=pointer]:
                - img [ref=e159]
                - generic [ref=e162]: mdfy for Mac
              - generic [ref=e163] [cursor=pointer]:
                - img [ref=e164]
                - generic [ref=e167]: mdfy CLI
              - generic [ref=e168] [cursor=pointer]:
                - img [ref=e169]
                - generic [ref=e172]: MCP Server
              - generic [ref=e173] [cursor=pointer]:
                - img [ref=e174]
                - generic [ref=e177]: QuickLook Preview
          - generic [ref=e180] [cursor=pointer]: Trash
        - button "Sign In / Sign Up" [ref=e182]:
          - img [ref=e183]
          - text: Sign In / Sign Up
      - generic [ref=e189]:
        - generic [ref=e190]:
          - generic [ref=e191]: LIVE
          - generic [ref=e192]:
            - generic [ref=e193]:
              - button "Formatting toolbar OFF" [ref=e194]:
                - img [ref=e195]
              - generic [ref=e200]:
                - paragraph [ref=e201]: Formatting Tools
                - paragraph [ref=e202]: Click to enable bold, headings, lists, and more.
                - button "Dismiss" [ref=e203]
            - generic [ref=e204]:
              - button "Narrow view ON" [ref=e205]:
                - img [ref=e206]
              - generic:
                - paragraph: Narrow View ON
                - paragraph: Limit content width for comfortable reading, like a book layout.
            - button "Document outline" [ref=e211]:
              - img [ref=e212]
            - generic [ref=e213]:
              - button "AI" [ref=e214]:
                - img [ref=e215]
                - generic [ref=e218]: AI
              - generic: AI Tools
            - generic [ref=e220]:
              - button "Export" [ref=e221]:
                - img [ref=e222]
              - generic: Export (download, print, copy)
        - generic [ref=e225]:
          - paragraph [ref=e230]: EDITED
          - generic [ref=e231]:
            - generic [ref=e232]:
              - generic [ref=e233]:
                - img [ref=e234]
                - generic [ref=e235]: Outline
              - button "Close outline" [ref=e236]:
                - img [ref=e237]
            - paragraph [ref=e241]: "No headings found. Add # headings to see the document structure."
    - contentinfo [ref=e242]:
      - generic [ref=e243]:
        - generic [ref=e244]:
          - button "Help" [ref=e245]
          - generic:
            - paragraph: Keyboard Shortcuts
            - generic:
              - generic:
                - generic: Cmd+B
                - generic: Bold
              - generic:
                - generic: Cmd+I
                - generic: Italic
              - generic:
                - generic: Cmd+K
                - generic: Insert link
              - generic:
                - generic: Cmd+S
                - generic: Share / copy URL
              - generic:
                - generic: Cmd+Shift+C
                - generic: Copy as HTML
              - generic:
                - generic: Cmd+Z
                - generic: Undo
              - generic:
                - generic: Cmd+Shift+Z
                - generic: Redo
              - generic:
                - generic: Cmd+\
                - generic: Toggle view mode
              - generic:
                - generic: Escape
                - generic: Focus markdown editor
              - generic:
                - generic: Dbl-click code
                - generic: Edit code block
              - generic:
                - generic: Dbl-click math
                - generic: Edit equation
              - generic:
                - generic: Dbl-click diagram
                - generic: Edit diagram
              - generic:
                - generic: Dbl-click table
                - generic: Edit cell
            - paragraph: Import
            - generic:
              - generic: MD
              - generic: PDF
              - generic: DOCX
              - generic: PPTX
              - generic: XLSX
              - generic: HTML
              - generic: CSV
              - generic: LaTeX
              - generic: RST
              - generic: RTF
              - generic: JSON
              - generic: XML
              - generic: TXT
            - paragraph: Drag & drop or use IMPORT in sidebar
            - paragraph: Export
            - generic:
              - generic:
                - generic: Download
                - generic: MD, HTML, TXT
              - generic:
                - generic: Print
                - generic: PDF
              - generic:
                - generic: Clipboard
                - generic: HTML, Rich Text, Slack, Plain
        - button "⌘K" [ref=e246] [cursor=pointer]:
          - generic [ref=e247]: ⌘K
        - link "About" [ref=e248] [cursor=pointer]:
          - /url: /about
        - link "Plugins" [ref=e249] [cursor=pointer]:
          - /url: /plugins
        - link "Trending" [ref=e250] [cursor=pointer]:
          - /url: /discover
        - link "API" [ref=e251] [cursor=pointer]:
          - /url: /docs
        - link "Privacy" [ref=e252] [cursor=pointer]:
          - /url: /privacy
        - link "Terms" [ref=e253] [cursor=pointer]:
          - /url: /terms
      - generic [ref=e254]:
        - generic [ref=e255]: 11 words
        - generic [ref=e256]: 50 chars
        - generic [ref=e257]: 3 lines
        - generic [ref=e258]:
          - text: RUST+WASM
          - generic: Rendered by mdcore engine (comrak, Rust compiled to WebAssembly)
        - generic [ref=e259]:
          - generic [ref=e260]:
            - img [ref=e261]
            - text: 4ms
          - generic: WASM engine render time
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("debug table cell editing", async ({ page }) => {
  4  |   await page.addInitScript(() => {
  5  |     localStorage.setItem("mdfy-onboarded", "1");
  6  |     localStorage.setItem("mdfy-welcome-seen", "1");
  7  |     localStorage.setItem("mdfy-active-tab", "tab-welcome");
  8  |   });
  9  |   await page.goto("/");
  10 |   await page.waitForSelector(".tiptap", { timeout: 20000 });
  11 | 
  12 |   // Create table via Source
  13 |   await page.click('button:has-text("Source")');
  14 |   await page.waitForTimeout(300);
  15 |   const cm = page.locator(".cm-editor .cm-content");
  16 |   await cm.click();
  17 |   await page.keyboard.press("ControlOrMeta+a");
  18 |   await page.keyboard.type("| Name | Value |\n|------|-------|\n| foo  | bar   |");
  19 | 
  20 |   // Switch to Live
  21 |   await page.click('button:has-text("Live")');
  22 |   await page.waitForTimeout(2000);
  23 | 
  24 |   // Debug: capture HTML
  25 |   const tiptapHtml = await page.locator(".tiptap").first().innerHTML();
  26 |   console.log("=== TIPTAP HTML (first 3000 chars) ===");
  27 |   console.log(tiptapHtml.slice(0, 3000));
  28 | 
  29 |   // Check structure
  30 |   const tableCount = await page.locator(".tiptap table").count();
  31 |   const tdCount = await page.locator(".tiptap td").count();
  32 |   const thCount = await page.locator(".tiptap th").count();
  33 |   console.log("Tables:", tableCount, "TDs:", tdCount, "THs:", thCount);
  34 | 
  35 |   // If no proper table nodes, check for raw HTML table
  36 |   if (tableCount === 0) {
  37 |     const rawTable = tiptapHtml.includes("<table");
  38 |     console.log("Raw <table> in HTML:", rawTable);
  39 |     const pipeCount = (tiptapHtml.match(/\|/g) || []).length;
  40 |     console.log("Pipe characters:", pipeCount);
  41 |   }
  42 | 
  43 |   // Now try clicking a cell and typing
  44 |   const firstTd = page.locator(".tiptap td").first();
  45 |   await firstTd.click();
  46 |   await page.waitForTimeout(500);
  47 | 
  48 |   // Select all text in cell and type new content
  49 |   await page.keyboard.press("ControlOrMeta+a");
  50 |   await page.keyboard.type("EDITED");
  51 |   await page.waitForTimeout(500);
  52 | 
> 53 |   const cellText = await firstTd.innerText();
     |                                  ^ Error: locator.innerText: Test timeout of 30000ms exceeded.
  54 |   console.log("Cell after edit:", cellText);
  55 | 
  56 |   // Take screenshot
  57 |   await page.screenshot({ path: "test-results/table-edit-result.png" });
  58 | 
  59 |   expect(cellText).toContain("EDITED");
  60 | });
  61 | 
```