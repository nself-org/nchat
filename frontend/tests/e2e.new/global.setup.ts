/**
 * Global Setup for Playwright Tests
 *
 * This setup file runs before all tests and handles:
 * - Authentication state setup
 * - Storage state persistence
 * - Environment validation
 */

import { chromium, FullConfig } from "@playwright/test";

// Storage state file path
export const STORAGE_STATE = "playwright/.auth/user.json";

// Test user credentials (dev mode)
export const TEST_USERS = {
  owner: {
    email: "owner@nself.org",
    password: "password123",
    role: "owner",
  },
  admin: {
    email: "admin@nself.org",
    password: "password123",
    role: "admin",
  },
  moderator: {
    email: "moderator@nself.org",
    password: "password123",
    role: "moderator",
  },
  member: {
    email: "member@nself.org",
    password: "password123",
    role: "member",
  },
  guest: {
    email: "guest@nself.org",
    password: "password123",
    role: "guest",
  },
} as const;

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app
    await page.goto(baseURL || "http://localhost:3000");

    // Wait for the app to be ready
    await page.waitForLoadState("networkidle");

    // In dev mode, the app auto-logs in as owner.
    // FauxAuthService stores its session under 'nchat-dev-session';
    // NhostAuthService uses 'nchat-auth-token'. Check both so this works
    // regardless of which auth backend is active.
    const isLoggedIn = await page.evaluate(() => {
      return (
        localStorage.getItem("nchat-auth-token") !== null ||
        localStorage.getItem("nchat-dev-session") !== null
      );
    });

    if (!isLoggedIn) {
      // Navigate to login page
      await page.goto(`${baseURL}/login`);
      await page.waitForLoadState("networkidle");

      // Fill in credentials for owner
      const emailInput = page.locator(
        'input[type="email"], input[name="email"]',
      );
      const passwordInput = page.locator(
        'input[type="password"], input[name="password"]',
      );
      const submitButton = page.locator('button[type="submit"]');

      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_USERS.owner.email);
        await passwordInput.fill(TEST_USERS.owner.password);
        await submitButton.click();

        // Wait for redirect after login
        await page.waitForURL("**/chat**", { timeout: 10000 }).catch(() => {
          // May already be on chat page in dev mode
        });
      }
    }

    // Save storage state
    await context.storageState({ path: STORAGE_STATE });

    console.log("Global setup completed successfully");
  } catch (error) {
    console.error("Global setup failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
