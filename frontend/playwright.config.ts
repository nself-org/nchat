/**
 * Playwright Configuration
 *
 * E2E testing configuration for nself-chat application.
 * Supports multiple browsers and provides dev/CI configurations.
 */

import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv'
// dotenv.config({ path: '.env.local' })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory — tests live in tests/e2e.new/
  testDir: './tests/e2e.new',

  // Exclude Detox mobile tests (not Playwright)
  testIgnore: ['**/mobile/**', '**/mobile-only/**'],

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI to reduce flakiness
  retries: process.env.CI ? 2 : 0,

  // Limit workers on CI for more stable execution
  workers: process.env.CI ? 2 : undefined,

  // Reporter to use.
  // In CI shard mode: emit blob reports (for merge-reports aggregation)
  // plus github annotations.  Locally: HTML report + list.
  reporter: process.env.CI
    ? [
        ['blob', { outputDir: 'blob-report' }],
        ['github'],
        ['list'],
      ]
    : [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
      ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Default timeout for actions
    actionTimeout: 10000,

    // Default timeout for navigation
    navigationTimeout: 30000,
  },

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    // Setup project for authentication state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup'],
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
      dependencies: ['setup'],
    },

    // Tablet viewport
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
      },
      dependencies: ['setup'],
    },
  ],

  // Global setup — runs once before all tests to warm up routes.
  // This prevents the first test per route from hitting a cold Next.js
  // production server and timing out.
  globalSetup: './tests/e2e.new/global.setup.ts',

  // Run the production server before starting the tests.
  // The workflow (e2e-tests.yml + pr-checks.yml accessibility job) runs
  // `pnpm build` as a preceding step, so `next start` serves pre-compiled
  // pages with no per-route compilation delay.  This eliminates the
  // on-demand compilation timeouts that occurred with `pnpm dev`.
  //
  // HASURA_ADMIN_SECRET satisfies next.config.js start-up gate in CI.
  // NEXT_PUBLIC_USE_DEV_AUTH is set by the workflow env, not here.
  webServer: {
    command: 'HASURA_ADMIN_SECRET=ci-test-placeholder-not-a-real-secret next start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // 5 minutes: production server startup is slower than dev on first boot.
    // Per-route compilation is eliminated, so tests themselves are faster.
    timeout: 300000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',
})
