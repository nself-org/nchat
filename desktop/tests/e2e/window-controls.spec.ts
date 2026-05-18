/**
 * T30 — E2E spec: window control commands.
 * Exercises window_minimize, window_is_maximized via IPC.
 */
import { test, expect } from "@playwright/test";

test("window_is_maximized returns a boolean", async ({ page }) => {
  await page.waitForLoadState("domcontentloaded");

  const isMaximized = await page.evaluate(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("window_is_maximized");
  });

  expect(typeof isMaximized).toBe("boolean");
});

test("window_minimize completes without error", async ({ page }) => {
  await page.waitForLoadState("domcontentloaded");

  await expect(
    page.evaluate(async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("window_minimize");
    })
  ).resolves.toBeUndefined();
});
