/**
 * T30 — E2E spec: launch and window presence.
 * Verifies that the app starts, shows the main window, and has the correct title.
 */
import { test, expect } from "@playwright/test";

test("app launches and shows main window", async ({ page }) => {
  // tauri-driver navigates to the app window by default.
  await page.waitForLoadState("domcontentloaded");

  // The window title is set in tauri.conf.json.
  await expect(page).toHaveTitle(/nChat/);
});

test("main window is visible and not empty", async ({ page }) => {
  await page.waitForLoadState("domcontentloaded");
  // Verify the root element exists.
  const root = page.locator("#root");
  await expect(root).toBeVisible();
});
