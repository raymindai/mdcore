import { test, expect } from "@playwright/test";
import { setupEditableTab } from "./_helpers";

/**
 * Catch any uncaught console errors / page errors during a normal editor load.
 * Filters out known-benign warnings (Next.js HMR, dev-mode WASM async/await,
 * 401s on auth-required endpoints when not signed in).
 */
test("no uncaught errors on editor load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push("PAGE_ERROR: " + err.message));

  await setupEditableTab(page);
  await page.waitForTimeout(2000);

  const fatal = errors.filter((e) => {
    if (/401|Unauthorized/i.test(e)) return false; // not signed in
    if (/asyncWebAssembly|async\/await/i.test(e)) return false; // dev-mode WASM warning
    if (/Failed to load resource.*api\/user\/folders/i.test(e)) return false;
    return true;
  });

  if (fatal.length) {
    console.log("UNEXPECTED ERRORS:\n" + fatal.map((e) => "  - " + e).join("\n"));
  }
  expect(fatal).toEqual([]);
});
