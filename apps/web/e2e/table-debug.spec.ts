import { test, expect } from "@playwright/test";

test("debug table cell editing", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("mdfy-onboarded", "1");
    localStorage.setItem("mdfy-welcome-seen", "1");
    localStorage.setItem("mdfy-active-tab", "tab-welcome");
  });
  await page.goto("/");
  await page.waitForSelector(".tiptap", { timeout: 20000 });

  // Create table via Source
  await page.click('button:has-text("Source")');
  await page.waitForTimeout(300);
  const cm = page.locator(".cm-editor .cm-content");
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("| Name | Value |\n|------|-------|\n| foo  | bar   |");

  // Switch to Live
  await page.click('button:has-text("Live")');
  await page.waitForTimeout(2000);

  // Debug: capture HTML
  const tiptapHtml = await page.locator(".tiptap").first().innerHTML();
  console.log("=== TIPTAP HTML (first 3000 chars) ===");
  console.log(tiptapHtml.slice(0, 3000));

  // Check structure
  const tableCount = await page.locator(".tiptap table").count();
  const tdCount = await page.locator(".tiptap td").count();
  const thCount = await page.locator(".tiptap th").count();
  console.log("Tables:", tableCount, "TDs:", tdCount, "THs:", thCount);

  // If no proper table nodes, check for raw HTML table
  if (tableCount === 0) {
    const rawTable = tiptapHtml.includes("<table");
    console.log("Raw <table> in HTML:", rawTable);
    const pipeCount = (tiptapHtml.match(/\|/g) || []).length;
    console.log("Pipe characters:", pipeCount);
  }

  // Now try clicking a cell and typing
  const firstTd = page.locator(".tiptap td").first();
  await firstTd.click();
  await page.waitForTimeout(500);

  // Select all text in cell and type new content
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("EDITED");
  await page.waitForTimeout(500);

  const cellText = await firstTd.innerText();
  console.log("Cell after edit:", cellText);

  // Take screenshot
  await page.screenshot({ path: "test-results/table-edit-result.png" });

  expect(cellText).toContain("EDITED");
});
