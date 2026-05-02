import { test, expect } from "@playwright/test";

test("table from toolbar insertion", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("mdfy-onboarded", "1");
    localStorage.setItem("mdfy-welcome-seen", "1");
    localStorage.setItem("mdfy-active-tab", "tab-welcome");
  });
  await page.goto("/");
  await page.waitForSelector(".tiptap", { timeout: 20000 });

  // Insert table via Tiptap API directly
  const result = await page.evaluate(() => {
    // Find the Tiptap ProseMirror instance
    const pm = document.querySelector(".ProseMirror");
    if (!pm) return { error: "no ProseMirror" };
    // Check if it has editor access
    return {
      hasPM: true,
      contentEditable: pm.getAttribute("contenteditable"),
      childCount: pm.childElementCount,
      html: pm.innerHTML.slice(0, 200),
    };
  });
  console.log("PM state:", JSON.stringify(result));

  // Type a table in Source view
  await page.click('button:has-text("Source")');
  await page.waitForTimeout(300);
  const cm = page.locator(".cm-editor .cm-content");
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("# Test\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nAfter table");

  // Switch to Live
  await page.click('button:has-text("Live")');
  await page.waitForTimeout(3000);

  // Check what's in Tiptap now
  const liveResult = await page.evaluate(() => {
    const pm = document.querySelector(".ProseMirror");
    if (!pm) return { error: "no ProseMirror after switch" };
    const table = pm.querySelector("table");
    return {
      fullHtml: pm.innerHTML,
      hasTable: !!table,
      tableHtml: table?.outerHTML || "none",
      childTags: Array.from(pm.children).map(c => c.tagName.toLowerCase()),
    };
  });
  console.log("=== LIVE AFTER SWITCH ===");
  console.log("Has table:", liveResult.hasTable);
  console.log("Child tags:", JSON.stringify(liveResult.childTags));
  console.log("Full HTML:", liveResult.fullHtml?.slice(0, 1000));
  if (liveResult.hasTable) {
    console.log("Table HTML:", liveResult.tableHtml);
  }

  // Try clicking a cell
  if (liveResult.hasTable) {
    const td = page.locator(".ProseMirror td").first();
    await td.click();
    await page.waitForTimeout(500);
    await page.keyboard.type("EDITED");
    await page.waitForTimeout(500);
    const cellText = await td.innerText();
    console.log("Cell after edit:", cellText);
    expect(cellText).toContain("EDITED");
  } else {
    console.log("NO TABLE FOUND - checking if it rendered as text");
    const text = await page.locator(".ProseMirror").first().innerText();
    console.log("Live text:", text.slice(0, 500));
  }

  await page.screenshot({ path: "test-results/table-debug2.png" });
});
