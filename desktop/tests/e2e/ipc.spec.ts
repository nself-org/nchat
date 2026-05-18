/**
 * T30 — E2E spec: IPC round-trip via tauri-driver.
 * Verifies that Tauri commands are reachable from the renderer.
 */
import { test, expect } from "@playwright/test";

test("IPC round-trip — app_get_name returns nChat", async ({ page }) => {
  await page.waitForLoadState("domcontentloaded");

  const name = await page.evaluate(async () => {
    // @tauri-apps/api is available in the renderer context.
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("app_get_name");
  });

  expect(name).toBe("nChat");
});

test("IPC round-trip — app_get_version returns semver string", async ({
  page,
}) => {
  await page.waitForLoadState("domcontentloaded");

  const version = await page.evaluate(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("app_get_version");
  });

  // Semver pattern: x.y.z
  expect(version).toMatch(/^\d+\.\d+\.\d+/);
});
