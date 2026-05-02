import { type Page } from "@playwright/test";

/**
 * Shared setup: dismiss onboarding/welcome and start the editor on a
 * fresh editable tab (NOT the read-only `tab-welcome` example, which
 * blocks editing in the LIVE view).
 */
export async function setupEditableTab(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("mdfy-onboarded", "1");
    localStorage.setItem("mdfy-welcome-seen", "1");
    localStorage.setItem("mdfy-tabs-version", "8");
    // Inject a single editable scratch tab
    const tab = {
      id: "tab-e2e-scratch",
      title: "E2E Scratch",
      markdown: "# E2E Scratch\n\nstart here\n",
      readonly: false,
      permission: "mine",
      isDraft: true,
    };
    localStorage.setItem("mdfy-tabs", JSON.stringify([tab]));
    localStorage.setItem("mdfy-active-tab", "tab-e2e-scratch");
  });
  await page.goto("/");
  // Wait for the Tiptap LIVE editor to mount AND become editable
  await page.waitForSelector(".ProseMirror[contenteditable='true']", { timeout: 20000 });
  // Give Tiptap a moment to fully wire up
  await page.waitForTimeout(300);
}

/** Replace the editor's content with `text` (LIVE view). */
export async function clearAndType(page: Page, text: string) {
  const editor = page.locator(".ProseMirror[contenteditable='true']").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(100);
  await page.keyboard.type(text, { delay: 5 });
}

export async function getEditorText(page: Page): Promise<string> {
  return page.locator(".ProseMirror").first().innerText();
}

export async function getEditorHTML(page: Page): Promise<string> {
  return page.locator(".ProseMirror").first().innerHTML();
}

/**
 * View-mode buttons — match by both visible text AND the icon-only fallback.
 * In the current build, view-mode toggles use icon buttons inside the toolbar
 * with `title` attributes ("Live", "Split", "Source").
 */
export async function clickView(page: Page, mode: "Live" | "Split" | "Source") {
  // Buttons have title="Live (Alt+1)" etc. — prefix match against the title attr.
  await page.locator(`button[title^="${mode}"]`).first().click();
  await page.waitForTimeout(250);
}

/** Set markdown via the Source (CM6) editor, then switch back to LIVE. */
export async function setViaSource(page: Page, md: string) {
  await clickView(page, "Source");
  await page.waitForTimeout(300);
  const cm = page.locator(".cm-editor .cm-content");
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(md, { delay: 0 });
  await clickView(page, "Live");
  await page.waitForTimeout(1500);
}
