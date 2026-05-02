# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/web/e2e/deep-verify.spec.ts >> Table >> table renders with cells
- Location: apps/web/e2e/deep-verify.spec.ts:249:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | async function setup(page: Page) {
  4   |   await page.addInitScript(() => {
  5   |     localStorage.setItem("mdfy-onboarded", "1");
  6   |     localStorage.setItem("mdfy-welcome-seen", "1");
  7   |     localStorage.setItem("mdfy-active-tab", "tab-welcome");
  8   |   });
> 9   |   await page.goto("/");
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  10  |   await page.waitForSelector(".tiptap", { timeout: 20000 });
  11  | }
  12  | 
  13  | async function setViaSource(page: Page, md: string) {
  14  |   await page.click('button:has-text("Source")');
  15  |   await page.waitForTimeout(300);
  16  |   const cm = page.locator(".cm-editor .cm-content");
  17  |   await cm.click();
  18  |   await page.keyboard.press("ControlOrMeta+a");
  19  |   await page.keyboard.type(md, { delay: 0 });
  20  |   await page.click('button:has-text("Live")');
  21  |   await page.waitForTimeout(1500);
  22  | }
  23  | 
  24  | // ─── 1. Math editing continuity ───
  25  | 
  26  | test.describe("Math editing continuity", () => {
  27  |   test.beforeEach(async ({ page }) => { await setup(page); });
  28  | 
  29  |   test("can type text AFTER inline math without breaking it", async ({ page }) => {
  30  |     await setViaSource(page, "The formula $E=mc^2$ is here.");
  31  |     await page.waitForTimeout(1000);
  32  |     // Click at the end of the line
  33  |     const editor = page.locator(".tiptap").first();
  34  |     await editor.click();
  35  |     await page.keyboard.press("End");
  36  |     await page.keyboard.type(" More text after math.");
  37  |     await page.waitForTimeout(500);
  38  |     const text = await editor.innerText();
  39  |     expect(text).toContain("More text after math");
  40  |     // Original content should still be there
  41  |     expect(text).toMatch(/E.*=.*mc|formula/);
  42  |   });
  43  | 
  44  |   test("can type text BEFORE inline math without breaking it", async ({ page }) => {
  45  |     await setViaSource(page, "$E=mc^2$ is famous.");
  46  |     await page.waitForTimeout(1000);
  47  |     const editor = page.locator(".tiptap").first();
  48  |     await editor.click();
  49  |     await page.keyboard.press("Home");
  50  |     await page.keyboard.type("Einstein's ");
  51  |     await page.waitForTimeout(500);
  52  |     const text = await editor.innerText();
  53  |     expect(text).toContain("Einstein");
  54  |   });
  55  | 
  56  |   test("math renders after Source→LIVE switch", async ({ page }) => {
  57  |     await setViaSource(page, "Inline: $\\alpha + \\beta$\n\nDisplay:\n\n$$\\int_0^1 x^2 dx$$");
  58  |     const html = await page.locator(".tiptap").first().innerHTML();
  59  |     // Should have KaTeX rendered content
  60  |     expect(html).toMatch(/katex|alpha|int/);
  61  |   });
  62  | });
  63  | 
  64  | // ─── 2. Mermaid editing continuity ───
  65  | 
  66  | test.describe("Mermaid editing continuity", () => {
  67  |   test.beforeEach(async ({ page }) => { await setup(page); });
  68  | 
  69  |   test("can type paragraph AFTER mermaid block", async ({ page }) => {
  70  |     await setViaSource(page, "Before\n\n```mermaid\ngraph TD\n    A-->B\n```\n\nAfter");
  71  |     // Wait for mermaid render
  72  |     await page.waitForTimeout(3000);
  73  |     const editor = page.locator(".tiptap").first();
  74  |     const text = await editor.innerText();
  75  |     expect(text).toContain("Before");
  76  |     expect(text).toContain("After");
  77  |     // Click after "After" and type more
  78  |     await editor.click();
  79  |     await page.keyboard.press("ControlOrMeta+End");
  80  |     await page.keyboard.press("Enter");
  81  |     await page.keyboard.type("New paragraph after mermaid");
  82  |     await page.waitForTimeout(500);
  83  |     const newText = await editor.innerText();
  84  |     expect(newText).toContain("New paragraph after mermaid");
  85  |     expect(newText).toContain("Before");
  86  |   });
  87  | 
  88  |   test("mermaid renders as SVG diagram", async ({ page }) => {
  89  |     await setViaSource(page, "```mermaid\ngraph LR\n    A-->B\n    B-->C\n```");
  90  |     await page.waitForTimeout(3000);
  91  |     const html = await page.locator(".tiptap").first().innerHTML();
  92  |     // Should have either mermaid-rendered class or SVG
  93  |     expect(html).toMatch(/mermaid-rendered|<svg/);
  94  |   });
  95  | });
  96  | 
  97  | // ─── 3. Code block double-click editing ───
  98  | 
  99  | test.describe("Code block editing", () => {
  100 |   test.beforeEach(async ({ page }) => { await setup(page); });
  101 | 
  102 |   test("code block content is editable in LIVE view", async ({ page }) => {
  103 |     await setViaSource(page, "```js\nconsole.log('hello')\n```");
  104 |     const editor = page.locator(".tiptap").first();
  105 |     const html = await editor.innerHTML();
  106 |     expect(html).toContain("console");
  107 |     // Code block should be rendered with pre tag
  108 |     expect(html).toMatch(/<pre/);
  109 |   });
```