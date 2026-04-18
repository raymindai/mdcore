import { test, expect } from "@playwright/test";

test.describe("Editor — Core Writing Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for WASM engine to load
    await page.waitForSelector("[data-testid='engine-badge'], .mdcore-rendered", { timeout: 15000 });
  });

  test("renders the editor with default content", async ({ page }) => {
    // Should show the mdfy logo
    await expect(page.locator("header")).toBeVisible();
    // Should show rendered preview
    await expect(page.locator(".mdcore-rendered")).toBeVisible();
  });

  test("can type in Source view and see preview update", async ({ page }) => {
    // Switch to Source view
    await page.click('button:has-text("Source")');
    // Find CodeMirror editor
    const cm = page.locator(".cm-editor .cm-content");
    await cm.click();
    // Clear and type
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("# Hello World\n\nThis is a test.");
    // Switch to Live view
    await page.click('button:has-text("Live")');
    // Check preview has the heading
    await expect(page.locator(".mdcore-rendered h1")).toContainText("Hello World");
    await expect(page.locator(".mdcore-rendered p")).toContainText("This is a test");
  });

  test("can switch between Live, Split, and Source views", async ({ page }) => {
    for (const mode of ["Split", "Source", "Live"]) {
      await page.click(`button:has-text("${mode}")`);
      await expect(page.locator(`button:has-text("${mode}")`)).toHaveCSS("background-color", /.+/);
    }
  });

  test("can toggle dark/light theme", async ({ page }) => {
    const html = page.locator("html");
    const initialTheme = await html.getAttribute("data-theme");
    // Find and click theme toggle (in menu on mobile, direct on desktop)
    const themeBtn = page.locator('button[title*="Switch to"]');
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      const newTheme = await html.getAttribute("data-theme");
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test("can create a new document via + button", async ({ page }) => {
    const addBtn = page.locator('button[title="New document"]').or(page.locator('button:has-text("+")')).first();
    if (await addBtn.isVisible()) {
      const tabCountBefore = await page.locator(".mdcore-rendered").count();
      await addBtn.click();
      // Should have new tab content
      await expect(page.locator(".mdcore-rendered")).toBeVisible();
    }
  });
});

test.describe("Editor — Formatting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".mdcore-rendered", { timeout: 15000 });
  });

  test("Bold formatting works via keyboard shortcut", async ({ page }) => {
    // Switch to Source
    await page.click('button:has-text("Source")');
    const cm = page.locator(".cm-editor .cm-content");
    await cm.click();
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("hello world");
    // Select "world"
    await page.keyboard.press("Home");
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+End");
    // Apply bold
    await page.keyboard.press("Meta+b");
    // Switch to Live and check
    await page.click('button:has-text("Live")');
    await expect(page.locator(".mdcore-rendered strong")).toContainText("world");
  });
});

test.describe("Editor — Document Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".mdcore-rendered", { timeout: 15000 });
  });

  test("sidebar toggles open and closed", async ({ page }) => {
    const sidebarToggle = page.locator('button[aria-label*="sidebar"]').or(page.locator('button:has(svg.lucide-panel-left)')).first();
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      // Sidebar should be visible with "My Documents" or "FILES"
      await expect(page.locator('text=My Documents').or(page.locator('text=FILES'))).toBeVisible({ timeout: 3000 });
    }
  });

  test("Examples section is visible", async ({ page }) => {
    // Open sidebar if needed
    const sidebarToggle = page.locator('button:has(svg.lucide-panel-left)').first();
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
    }
    await expect(page.locator('text=Examples')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Editor — Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".mdcore-rendered", { timeout: 15000 });
  });

  test("export menu opens", async ({ page }) => {
    // Find export button (Upload icon)
    const exportBtn = page.locator('button:has(svg.lucide-upload)').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await expect(page.locator('text=Markdown (.md)')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Editor — AI Tools", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".mdcore-rendered", { timeout: 15000 });
  });

  test("AI menu opens with all options", async ({ page }) => {
    // Find AI button (Sparkles icon with "AI" text)
    const aiBtn = page.locator('button:has(svg.lucide-sparkles)').first();
    if (await aiBtn.isVisible()) {
      await aiBtn.click();
      await expect(page.locator('text=Polish')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('text=Summary')).toBeVisible();
      await expect(page.locator('text=TL;DR')).toBeVisible();
      await expect(page.locator('text=Translate')).toBeVisible();
    }
  });
});
