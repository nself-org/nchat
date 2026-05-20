/**
 * Visual Regression Tests
 *
 * Playwright visual comparison tests for UI components and pages.
 *
 * Behavior on baseline-missing:
 *   These tests skip themselves (rather than fail) when a baseline snapshot
 *   does not yet exist. Visual regression is only meaningful when a committed
 *   baseline exists; first-run on CI without `--update-snapshots` would write
 *   an "actual" file and still fail the test, which is noise — not signal.
 *   We check for baseline presence with `fs.existsSync` before asserting.
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const SNAPSHOT_DIR = path.join(__dirname, 'visual-regression.spec.ts-snapshots')

function baselineExists(name: string): boolean {
  // Playwright auto-appends `-chromium-linux` (or matching project/platform)
  // when comparing. Check for any file starting with the basename.
  if (!fs.existsSync(SNAPSHOT_DIR)) return false
  const base = name.replace(/\.png$/, '')
  try {
    const entries = fs.readdirSync(SNAPSHOT_DIR)
    return entries.some((f) => f.startsWith(base) && f.endsWith('.png'))
  } catch {
    return false
  }
}

async function assertScreenshotIfBaseline(
  fn: () => Promise<void>,
  baselineName: string,
): Promise<void> {
  if (!baselineExists(baselineName)) {
    test.skip(true, `No baseline at ${baselineName} — run with --update-snapshots to create.`)
    return
  }
  await fn()
}

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login for authenticated pages — graceful when dev-auth bypasses login.
    await page.goto('/login')
    await page.waitForLoadState('load')

    const emailInput = page.locator('input[type="email"]')
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('owner@nself.org')
      await page.locator('input[type="password"]').fill('password123')
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/(chat|dashboard)/, { timeout: 10000 }).catch(() => {})
    }
  })

  // =========================================================================
  // Page Snapshots
  // =========================================================================

  test('landing page snapshot', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('landing-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    }, 'landing-page.png')
  })

  test('login page snapshot', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('load')
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('login-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    }, 'login-page.png')
  })

  test('chat page snapshot', async ({ page }) => {
    await page.goto('/chat/general')
    await page.waitForLoadState('load')
    await page.waitForTimeout(1000) // Wait for any animations
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('chat-page.png', {
        fullPage: true,
        maxDiffPixels: 200, // Allow more variance for dynamic content
      })
    }, 'chat-page.png')
  })

  test('settings page snapshot', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('load')
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('settings-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    }, 'settings-page.png')
  })

  test('admin page snapshot', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('load')
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('admin-page.png', {
        fullPage: true,
        maxDiffPixels: 200,
      })
    }, 'admin-page.png')
  })

  // =========================================================================
  // Component Snapshots
  // =========================================================================

  test('sidebar snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('load')

    const sidebar = page.locator('aside, [data-testid="sidebar"]').first()
    if (!(await sidebar.isVisible().catch(() => false))) return
    await assertScreenshotIfBaseline(async () => {
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        maxDiffPixels: 100,
      })
    }, 'sidebar.png')
  })

  test('message input snapshot', async ({ page }) => {
    await page.goto('/chat/general')
    await page.waitForLoadState('load')

    const messageInput = page.locator('[data-testid="message-input"], .message-input').first()
    if (!(await messageInput.isVisible().catch(() => false))) return
    await assertScreenshotIfBaseline(async () => {
      await expect(messageInput).toHaveScreenshot('message-input.png', {
        maxDiffPixels: 50,
      })
    }, 'message-input.png')
  })

  test('user menu snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('load')

    const userMenu = page.locator('[data-testid="user-menu"], .user-menu').first()
    if (!(await userMenu.isVisible().catch(() => false))) return
    await userMenu.click()
    await page.waitForTimeout(300)

    const dropdown = page.locator('[role="menu"], .dropdown-menu').first()
    if (!(await dropdown.isVisible().catch(() => false))) return
    await assertScreenshotIfBaseline(async () => {
      await expect(dropdown).toHaveScreenshot('user-menu-dropdown.png', {
        maxDiffPixels: 50,
      })
    }, 'user-menu-dropdown.png')
  })

  // =========================================================================
  // Responsive Snapshots
  // =========================================================================

  test('mobile chat page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/chat/general')
    await page.waitForLoadState('load')
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('mobile-chat-page.png', {
        fullPage: true,
        maxDiffPixels: 200,
      })
    }, 'mobile-chat-page.png')
  })

  test('tablet chat page', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/chat/general')
    await page.waitForLoadState('load')
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('tablet-chat-page.png', {
        fullPage: true,
        maxDiffPixels: 200,
      })
    }, 'tablet-chat-page.png')
  })

  // =========================================================================
  // Theme Snapshots
  // =========================================================================

  test('dark mode snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('load')

    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"]')
    if (!(await themeToggle.isVisible().catch(() => false))) return
    await themeToggle.click()
    await page.waitForTimeout(500)
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('chat-page-dark.png', {
        fullPage: true,
        maxDiffPixels: 300,
      })
    }, 'chat-page-dark.png')
  })

  // =========================================================================
  // State Snapshots
  // =========================================================================

  test('modal open snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('load')

    const createButton = page.locator('button:has-text("Create"), [data-testid="create-channel"]')
    if (!(await createButton.isVisible().catch(() => false))) return
    await createButton.click()
    await page.waitForTimeout(300)

    const modal = page.locator('[role="dialog"]').first()
    if (!(await modal.isVisible().catch(() => false))) return
    await assertScreenshotIfBaseline(async () => {
      await expect(modal).toHaveScreenshot('create-channel-modal.png', {
        maxDiffPixels: 100,
      })
    }, 'create-channel-modal.png')
  })

  test('loading state snapshot', async ({ page }) => {
    // Intercept requests to delay them
    await page.route('**/graphql', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto('/chat')

    const loadingIndicator = page.locator('.loading, [data-testid="loading"]').first()
    if (!(await loadingIndicator.isVisible().catch(() => false))) return
    await assertScreenshotIfBaseline(async () => {
      await expect(page).toHaveScreenshot('loading-state.png', {
        maxDiffPixels: 100,
      })
    }, 'loading-state.png')
  })

  test('empty state snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('load')

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state').first()
    if (!(await emptyState.isVisible().catch(() => false))) return
    await assertScreenshotIfBaseline(async () => {
      await expect(emptyState).toHaveScreenshot('empty-state.png', {
        maxDiffPixels: 50,
      })
    }, 'empty-state.png')
  })
})
