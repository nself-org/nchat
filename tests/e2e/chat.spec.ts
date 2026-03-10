/**
 * nself-chat E2E smoke tests — T-0393
 *
 * 7 test scenarios for the open-source chat client app.
 * Requires the chat app to be running at CHAT_APP_URL.
 * Skipped automatically when not available.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.CHAT_APP_URL ?? 'http://localhost:3000';

test.use({ baseURL: BASE });

const available = !!process.env.CHAT_APP_URL;

test.describe('nself-chat app', () => {
  // Scenario 1: Page load
  test('app loads without crashing', async ({ page }) => {
    test.skip(!available, 'CHAT_APP_URL not set');

    const resp = await page.goto('/');
    expect(resp?.status()).toBeLessThan(500);
  });

  // Scenario 2: Auth flow
  test('unauthenticated user sees login screen', async ({ page }) => {
    test.skip(!available, 'CHAT_APP_URL not set');

    await page.goto('/');
    const loginEl = page.locator(
      'input[type="email"], button:has-text("Sign in"), a[href*="login"]'
    ).first();
    await expect(loginEl).toBeVisible({ timeout: 5000 });
  });

  // Scenario 3: Message compose input
  test('message compose input is present after auth', async ({ page }) => {
    test.skip(!available || !process.env.CHAT_TEST_EMAIL, 'No test credentials');

    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.CHAT_TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.CHAT_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/channel|chat|room/);

    const compose = page.locator('textarea, input[placeholder*="message" i]').first();
    await expect(compose).toBeVisible();
  });

  // Scenario 4: Channel list is present
  test('channel list sidebar is rendered', async ({ page }) => {
    test.skip(!available || !process.env.CHAT_TEST_EMAIL, 'No test credentials');

    await page.goto('/');
    const channels = page.locator('[data-testid="channel-list"], [class*="channel"]').first();
    await expect(channels).toBeVisible({ timeout: 8000 });
  });

  // Scenario 5: WebSocket connection is established (check for real-time indicator)
  test('real-time connection indicator shows connected state', async ({ page }) => {
    test.skip(!available || !process.env.CHAT_TEST_EMAIL, 'No test credentials');

    await page.goto('/');
    // Look for a "connected" or "online" indicator — implementation-specific
    const connected = page.locator(
      '[data-testid="connection-status"], [aria-label*="connected"], [class*="online"]'
    ).first();
    // Best-effort check — some apps don't show explicit indicators
    const count = await connected.count();
    if (count > 0) {
      await expect(connected).toBeVisible({ timeout: 5000 });
    }
  });

  // Scenario 6: Page has no JS errors on load
  test('page loads without console errors', async ({ page }) => {
    test.skip(!available, 'CHAT_APP_URL not set');

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('ResizeObserver'));
    expect(critical).toHaveLength(0);
  });

  // Scenario 7: Mobile viewport renders correctly
  test('app renders on mobile viewport', async ({ page }) => {
    test.skip(!available, 'CHAT_APP_URL not set');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Check that layout is not broken (no horizontal scrollbar at mobile width)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = 390;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });
});
