/**
 * Playwright configuration for nself-chat (repo root)
 *
 * Covers the tests/e2e/ smoke suite (T-0393).
 * The chat app must already be running — no webServer block, because
 * nself-chat is self-hosted by end users and not launched by this config.
 *
 * Set CHAT_URL to point at a running instance (default: http://localhost:3000).
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail CI if test.only was accidentally committed */
  forbidOnly: !!process.env.CI,

  /* Retry on CI to reduce flakiness */
  retries: process.env.CI ? 2 : 0,

  /* Limit parallelism on CI for stability */
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html'], ['list']],

  use: {
    baseURL: process.env.CHAT_URL || 'http://localhost:3000',

    /* Collect trace on first retry */
    trace: 'on-first-retry',

    /* Screenshot only on failure */
    screenshot: 'only-on-failure',
  },

  /* No webServer — the chat app must already be running */
});
