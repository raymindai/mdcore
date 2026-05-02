# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/web/e2e/console-check.spec.ts >> capture all console errors and warnings
- Location: apps/web/e2e/console-check.spec.ts:3:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test } from "@playwright/test";
  2  | 
  3  | test("capture all console errors and warnings", async ({ page }) => {
  4  |   const errors: string[] = [];
  5  |   const warnings: string[] = [];
  6  |   page.on("console", msg => {
  7  |     if (msg.type() === "error") errors.push(msg.text());
  8  |     if (msg.type() === "warning") warnings.push(msg.text());
  9  |   });
  10 |   page.on("pageerror", err => errors.push("PAGE_ERROR: " + err.message));
  11 | 
  12 |   await page.addInitScript(() => {
  13 |     localStorage.setItem("mdfy-onboarded", "1");
  14 |     localStorage.setItem("mdfy-welcome-seen", "1");
  15 |     localStorage.setItem("mdfy-active-tab", "tab-welcome");
  16 |   });
> 17 |   await page.goto("/");
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  18 |   await page.waitForTimeout(8000);
  19 | 
  20 |   console.log("\n=== ERRORS (" + errors.length + ") ===");
  21 |   errors.forEach(e => console.log("ERR:", e.slice(0, 500)));
  22 |   console.log("\n=== WARNINGS (" + warnings.length + ") ===");
  23 |   warnings.forEach(w => console.log("WARN:", w.slice(0, 500)));
  24 | });
  25 | 
```