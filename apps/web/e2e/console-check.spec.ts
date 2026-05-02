import { test } from "@playwright/test";

test("capture all console errors and warnings", async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning") warnings.push(msg.text());
  });
  page.on("pageerror", err => errors.push("PAGE_ERROR: " + err.message));

  await page.addInitScript(() => {
    localStorage.setItem("mdfy-onboarded", "1");
    localStorage.setItem("mdfy-welcome-seen", "1");
    localStorage.setItem("mdfy-active-tab", "tab-welcome");
  });
  await page.goto("/");
  await page.waitForTimeout(8000);

  console.log("\n=== ERRORS (" + errors.length + ") ===");
  errors.forEach(e => console.log("ERR:", e.slice(0, 200)));
  console.log("\n=== WARNINGS (" + warnings.length + ") ===");
  warnings.forEach(w => console.log("WARN:", w.slice(0, 200)));
});
