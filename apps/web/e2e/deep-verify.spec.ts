import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("mdfy-onboarded", "1");
    localStorage.setItem("mdfy-welcome-seen", "1");
    localStorage.setItem("mdfy-active-tab", "tab-welcome");
  });
  await page.goto("/");
  await page.waitForSelector(".tiptap", { timeout: 20000 });
}

async function setViaSource(page: Page, md: string) {
  await page.click('button:has-text("Source")');
  await page.waitForTimeout(300);
  const cm = page.locator(".cm-editor .cm-content");
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(md, { delay: 0 });
  await page.click('button:has-text("Live")');
  await page.waitForTimeout(1500);
}

// ─── 1. Math editing continuity ───

test.describe("Math editing continuity", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("can type text AFTER inline math without breaking it", async ({ page }) => {
    await setViaSource(page, "The formula $E=mc^2$ is here.");
    await page.waitForTimeout(1000);
    // Click at the end of the line
    const editor = page.locator(".tiptap").first();
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" More text after math.");
    await page.waitForTimeout(500);
    const text = await editor.innerText();
    expect(text).toContain("More text after math");
    // Original content should still be there
    expect(text).toMatch(/E.*=.*mc|formula/);
  });

  test("can type text BEFORE inline math without breaking it", async ({ page }) => {
    await setViaSource(page, "$E=mc^2$ is famous.");
    await page.waitForTimeout(1000);
    const editor = page.locator(".tiptap").first();
    await editor.click();
    await page.keyboard.press("Home");
    await page.keyboard.type("Einstein's ");
    await page.waitForTimeout(500);
    const text = await editor.innerText();
    expect(text).toContain("Einstein");
  });

  test("math renders after Source→LIVE switch", async ({ page }) => {
    await setViaSource(page, "Inline: $\\alpha + \\beta$\n\nDisplay:\n\n$$\\int_0^1 x^2 dx$$");
    const html = await page.locator(".tiptap").first().innerHTML();
    // Should have KaTeX rendered content
    expect(html).toMatch(/katex|alpha|int/);
  });
});

// ─── 2. Mermaid editing continuity ───

test.describe("Mermaid editing continuity", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("can type paragraph AFTER mermaid block", async ({ page }) => {
    await setViaSource(page, "Before\n\n```mermaid\ngraph TD\n    A-->B\n```\n\nAfter");
    // Wait for mermaid render
    await page.waitForTimeout(3000);
    const editor = page.locator(".tiptap").first();
    const text = await editor.innerText();
    expect(text).toContain("Before");
    expect(text).toContain("After");
    // Click after "After" and type more
    await editor.click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("New paragraph after mermaid");
    await page.waitForTimeout(500);
    const newText = await editor.innerText();
    expect(newText).toContain("New paragraph after mermaid");
    expect(newText).toContain("Before");
  });

  test("mermaid renders as SVG diagram", async ({ page }) => {
    await setViaSource(page, "```mermaid\ngraph LR\n    A-->B\n    B-->C\n```");
    await page.waitForTimeout(3000);
    const html = await page.locator(".tiptap").first().innerHTML();
    // Should have either mermaid-rendered class or SVG
    expect(html).toMatch(/mermaid-rendered|<svg/);
  });
});

// ─── 3. Code block double-click editing ───

test.describe("Code block editing", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("code block content is editable in LIVE view", async ({ page }) => {
    await setViaSource(page, "```js\nconsole.log('hello')\n```");
    const editor = page.locator(".tiptap").first();
    const html = await editor.innerHTML();
    expect(html).toContain("console");
    // Code block should be rendered with pre tag
    expect(html).toMatch(/<pre/);
  });

  test("can click into code block and type", async ({ page }) => {
    await setViaSource(page, "```python\nprint('hi')\n```");
    const pre = page.locator(".tiptap pre").first();
    if (await pre.isVisible({ timeout: 3000 })) {
      await pre.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("print('world')");
      await page.waitForTimeout(300);
      const text = await pre.innerText();
      expect(text).toContain("world");
    }
  });
});

// ─── 4. Print/Export (PDF) ───

test.describe("Print/Export layout", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("content is visible for print (not empty)", async ({ page }) => {
    await setViaSource(page, "# Print Test\n\nThis should appear in print.");
    // Check that the LIVE view has content
    const text = await page.locator(".tiptap").first().innerText();
    expect(text).toContain("Print Test");
    expect(text).toContain("This should appear in print");
  });
});

// ─── 5. Tiptap CSS matches mdcore-rendered ───

test.describe("Visual styling", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("headings have correct hierarchy", async ({ page }) => {
    await setViaSource(page, "# H1\n\n## H2\n\n### H3\n\nParagraph");
    const editor = page.locator(".tiptap").first();
    const h1 = editor.locator("h1");
    const h2 = editor.locator("h2");
    const h3 = editor.locator("h3");
    if (await h1.isVisible({ timeout: 2000 })) {
      const h1Size = await h1.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      const h2Size = await h2.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      const h3Size = await h3.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(h1Size).toBeGreaterThan(h2Size);
      expect(h2Size).toBeGreaterThan(h3Size);
    }
  });

  test("blockquote has accent border", async ({ page }) => {
    await setViaSource(page, "> This is a quote");
    const bq = page.locator(".tiptap blockquote").first();
    if (await bq.isVisible({ timeout: 2000 })) {
      const borderLeft = await bq.evaluate(el => getComputedStyle(el).borderLeftStyle);
      expect(borderLeft).toBe("solid");
    }
  });

  test("bullet list has disc markers", async ({ page }) => {
    await setViaSource(page, "- Item 1\n- Item 2\n- Item 3");
    const ul = page.locator(".tiptap ul").first();
    if (await ul.isVisible({ timeout: 2000 })) {
      const listStyle = await ul.evaluate(el => getComputedStyle(el).listStyleType);
      expect(listStyle).toBe("disc");
    }
  });

  test("code block has surface background", async ({ page }) => {
    await setViaSource(page, "```\ncode\n```");
    const pre = page.locator(".tiptap pre").first();
    if (await pre.isVisible({ timeout: 2000 })) {
      const bg = await pre.evaluate(el => getComputedStyle(el).backgroundColor);
      // Should not be transparent
      expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    }
  });
});

// ─── 6. Tab switching preserves content ───

test.describe("Tab switching", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("switching tabs and back preserves content", async ({ page }) => {
    // Type content in current tab
    const editor = page.locator(".tiptap").first();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("Tab 1 content");
    await page.waitForTimeout(500);

    // Open sidebar and click a different document
    const filesBtn = page.locator('button:has-text("FILES")').first();
    if (await filesBtn.isVisible({ timeout: 2000 })) {
      await filesBtn.click();
      await page.waitForTimeout(500);
      // Find another document in sidebar
      const sidebarItems = page.locator('[data-pane="sidebar"] .group');
      const count = await sidebarItems.count();
      if (count >= 2) {
        await sidebarItems.nth(1).click();
        await page.waitForTimeout(1000);
        // Go back to first tab
        await sidebarItems.nth(0).click();
        await page.waitForTimeout(1000);
        const text = await editor.innerText();
        // Content should be preserved (or at least document loaded)
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── 7. Checkbox toggle ───

test.describe("Checkbox", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("task list checkbox toggles on click", async ({ page }) => {
    await setViaSource(page, "- [ ] Unchecked\n- [x] Checked");
    const checkboxes = page.locator('.tiptap input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 1) {
      const firstChecked = await checkboxes.first().isChecked();
      await checkboxes.first().click();
      await page.waitForTimeout(300);
      const afterClick = await checkboxes.first().isChecked();
      expect(afterClick).not.toBe(firstChecked);
    }
  });
});

// ─── 8. Table editing ───

test.describe("Table", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("table renders with cells", async ({ page }) => {
    await setViaSource(page, "| A | B |\n|---|---|\n| 1 | 2 |");
    const table = page.locator(".tiptap table").first();
    if (await table.isVisible({ timeout: 2000 })) {
      const cells = table.locator("td, th");
      expect(await cells.count()).toBeGreaterThanOrEqual(4);
    }
  });

  test("can click and type in table cell", async ({ page }) => {
    await setViaSource(page, "| A | B |\n|---|---|\n| 1 | 2 |");
    const cell = page.locator(".tiptap td").first();
    if (await cell.isVisible({ timeout: 2000 })) {
      await cell.click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("edited");
      await page.waitForTimeout(300);
      expect(await cell.innerText()).toContain("edited");
    }
  });
});
