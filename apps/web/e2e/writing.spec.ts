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

async function clearAndType(page: Page, text: string) {
  const editor = page.locator(".tiptap").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(100);
  await page.keyboard.type(text, { delay: 10 });
}

async function getEditorText(page: Page): Promise<string> {
  return page.locator(".tiptap").first().innerText();
}

async function getEditorHTML(page: Page): Promise<string> {
  return page.locator(".tiptap").first().innerHTML();
}

// ─── 1. Basic Typing ───

test.describe("Typing", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("type text and it appears", async ({ page }) => {
    await clearAndType(page, "Hello world");
    expect(await getEditorText(page)).toContain("Hello world");
  });

  test("Enter creates new paragraph", async ({ page }) => {
    await clearAndType(page, "Line 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line 2");
    const html = await getEditorHTML(page);
    expect((html.match(/<p>/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test("Backspace merges paragraphs", async ({ page }) => {
    await clearAndType(page, "First");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second");
    await page.keyboard.press("Home");
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);
    expect(await getEditorText(page)).toContain("FirstSecond");
  });

  test("Delete key removes forward", async ({ page }) => {
    await clearAndType(page, "ABCD");
    await page.keyboard.press("Home");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    expect(await getEditorText(page)).toContain("BCD");
  });
});

// ─── 2. Formatting ───

test.describe("Formatting", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("Cmd+B toggles bold on/off", async ({ page }) => {
    await clearAndType(page, "test");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("ControlOrMeta+b");
    await page.waitForTimeout(200);
    expect(await getEditorHTML(page)).toMatch(/<strong>|<b>/);
    await page.keyboard.press("ControlOrMeta+b");
    await page.waitForTimeout(200);
    expect(await getEditorHTML(page)).not.toMatch(/<strong>test<\/strong>/);
  });

  test("Cmd+I toggles italic", async ({ page }) => {
    await clearAndType(page, "test");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("ControlOrMeta+i");
    await page.waitForTimeout(200);
    expect(await getEditorHTML(page)).toMatch(/<em>|<i>/);
  });
});

// ─── 3. Blockquote ───

test.describe("Blockquote", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("Enter inside blockquote stays in same blockquote", async ({ page }) => {
    await clearAndType(page, "Quote line 1");
    await page.keyboard.press("ControlOrMeta+a");
    await page.waitForTimeout(500);
    const quoteBtn = page.locator('[title="Quote"]');
    if (await quoteBtn.isVisible({ timeout: 2000 })) {
      await quoteBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Quote line 2");
      await page.waitForTimeout(300);
      const html = await getEditorHTML(page);
      expect((html.match(/<blockquote>/g) || []).length).toBe(1);
      expect(html).toContain("Quote line 1");
      expect(html).toContain("Quote line 2");
    }
  });
});

// ─── 4. Paste ───

test.describe("Paste", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("paste at end preserves original content", async ({ page }) => {
    await clearAndType(page, "Original");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData("text/plain", "Pasted");
      document.querySelector(".tiptap")?.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })
      );
    });
    await page.waitForTimeout(500);
    const text = await getEditorText(page);
    expect(text).toContain("Original");
    expect(text).toContain("Pasted");
  });

  test("select all + delete + paste: no duplication", async ({ page }) => {
    await clearAndType(page, "Old");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData("text/plain", "New only");
      document.querySelector(".tiptap")?.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })
      );
    });
    await page.waitForTimeout(500);
    const text = await getEditorText(page);
    expect(text).toContain("New only");
    expect(text).not.toContain("Old");
    expect(text.split("New only").length - 1).toBe(1);
  });
});

// ─── 5. Undo/Redo ───

test.describe("Undo/Redo", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("Cmd+Z undoes", async ({ page }) => {
    await clearAndType(page, "A");
    await page.waitForTimeout(300); // let Tiptap group the transaction
    await page.keyboard.type("B");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    const text = await getEditorText(page);
    // At least the "B" should be undone
    expect(text).not.toContain("AB");
  });

  test("Cmd+Shift+Z redoes", async ({ page }) => {
    await clearAndType(page, "Redo");
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(200);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForTimeout(200);
    expect(await getEditorText(page)).toContain("Redo");
  });
});

// ─── 6. Source ↔ LIVE Sync ───

test.describe("Source ↔ LIVE Sync", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("Source → LIVE syncs", async ({ page }) => {
    await page.click('button:has-text("Source")');
    await page.waitForTimeout(300);
    const cm = page.locator(".cm-editor .cm-content");
    await cm.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("# From Source\n\nSync OK");
    await page.click('button:has-text("Live")');
    await page.waitForTimeout(1000);
    expect(await getEditorText(page)).toContain("From Source");
  });

  test("LIVE → Source syncs", async ({ page }) => {
    await clearAndType(page, "From LIVE");
    await page.waitForTimeout(500);
    await page.click('button:has-text("Source")');
    await page.waitForTimeout(500);
    const sourceText = await page.locator(".cm-editor .cm-content").innerText();
    expect(sourceText).toContain("From LIVE");
  });
});

// ─── 7. Content Preservation ───

test.describe("Content Preservation", () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test("20 paragraphs survive view switch round-trip", async ({ page }) => {
    const lines = Array.from({ length: 20 }, (_, i) => `Para ${i + 1}`);
    await page.click('button:has-text("Source")');
    await page.waitForTimeout(300);
    const cm = page.locator(".cm-editor .cm-content");
    await cm.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(lines.join("\n\n"), { delay: 0 });
    await page.click('button:has-text("Live")');
    await page.waitForTimeout(1500);
    const live = await getEditorText(page);
    expect(live).toContain("Para 1");
    expect(live).toContain("Para 20");
    await page.click('button:has-text("Source")');
    await page.waitForTimeout(500);
    const src = await cm.innerText();
    expect(src).toContain("Para 1");
    expect(src).toContain("Para 20");
  });
});
