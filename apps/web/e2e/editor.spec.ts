import { test, expect } from "@playwright/test";

test.describe("Editor — Core Writing Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("mdfy-onboarded", "1");
      localStorage.setItem("mdfy-welcome-seen", "1");
      localStorage.setItem("mdfy-active-tab", "tab-welcome");
    });
    await page.goto("/");
    // Wait for Tiptap editor to mount (has .tiptap class)
    await page.waitForSelector(".tiptap, .mdcore-rendered", { timeout: 15000 });
  });

  test("renders the editor with content", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
    // Tiptap editor or rendered preview should be visible
    await expect(page.locator(".tiptap, .mdcore-rendered").first()).toBeVisible();
  });

  test("can type in Source view and content appears", async ({ page }) => {
    // Switch to Source view
    await page.click('button:has-text("Source")');
    const cm = page.locator(".cm-editor .cm-content");
    await cm.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("# Hello World\n\nThis is a test.");
    // Switch to Live view
    await page.click('button:has-text("Live")');
    await page.waitForTimeout(500);
    // Tiptap should show the content
    const editor = page.locator(".tiptap").first();
    await expect(editor).toContainText("Hello World");
  });

  test("can switch between Live, Split, and Source views", async ({ page }) => {
    for (const mode of ["Split", "Source", "Live"]) {
      await page.click(`button:has-text("${mode}")`);
      await page.waitForTimeout(200);
    }
    // Should end on Live view without errors
    await expect(page.locator(".tiptap, .mdcore-rendered").first()).toBeVisible();
  });

  test("can type directly in LIVE view (Tiptap)", async ({ page }) => {
    // Click on the Tiptap editor
    const editor = page.locator(".tiptap").first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("Direct typing test");
      await expect(editor).toContainText("Direct typing test");
    }
  });

  test("bold formatting works in LIVE view", async ({ page }) => {
    const editor = page.locator(".tiptap").first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("test");
      // Select all and bold
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.press("ControlOrMeta+b");
      await page.waitForTimeout(300);
      // Check that bold tag exists
      const boldEl = editor.locator("strong, b").first();
      await expect(boldEl).toBeVisible({ timeout: 3000 });
    }
  });

  test("Enter creates new paragraph", async ({ page }) => {
    const editor = page.locator(".tiptap").first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("Line 1");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Line 2");
      const paragraphs = editor.locator("p");
      await expect(paragraphs).toHaveCount(2, { timeout: 3000 });
    }
  });
});

test.describe("Editor — Document Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("mdfy-onboarded", "1");
      localStorage.setItem("mdfy-welcome-seen", "1");
      localStorage.setItem("mdfy-active-tab", "tab-welcome");
    });
    await page.goto("/");
    await page.waitForSelector(".tiptap, .mdcore-rendered", { timeout: 15000 });
  });

  test("sidebar opens and shows content", async ({ page }) => {
    const filesBtn = page.locator('button:has-text("FILES")').first();
    if (await filesBtn.isVisible()) {
      await filesBtn.click();
      await page.waitForTimeout(500);
      // Sidebar should be visible with some content
      await expect(page.locator('[data-pane="sidebar"]')).toBeVisible({ timeout: 3000 });
    }
  });
});
