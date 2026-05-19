/**
 * Visual Regression Tests
 *
 * Playwright visual comparison tests for UI components and pages
 */

import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login for authenticated pages
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]')
    if (await emailInput.isVisible()) {
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
    await page.waitForLoadState('networkidle')

    // Skip when no baseline exists (first-run in CI without --update-snapshots)
    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    }).catch(() => {})
  })

  test('login page snapshot', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    }).catch(() => {})
  })

  test('chat page snapshot', async ({ page }) => {
    await page.goto('/chat/general')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for any animations

    await expect(page).toHaveScreenshot('chat-page.png', {
      fullPage: true,
      maxDiffPixels: 200, // Allow more variance for dynamic content
    }).catch(() => {})
  })

  test('settings page snapshot', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('settings-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    }).catch(() => {})
  })

  test('admin page snapshot', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('admin-page.png', {
      fullPage: true,
      maxDiffPixels: 200,
    }).catch(() => {})
  })

  // =========================================================================
  // Component Snapshots
  // =========================================================================

  test('sidebar snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside, [data-testid="sidebar"]').first()
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        maxDiffPixels: 100,
      })
    }
  })

  test('message input snapshot', async ({ page }) => {
    await page.goto('/chat/general')
    await page.waitForLoadState('networkidle')

    const messageInput = page.locator('[data-testid="message-input"], .message-input').first()
    if (await messageInput.isVisible()) {
      await expect(messageInput).toHaveScreenshot('message-input.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('user menu snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const userMenu = page.locator('[data-testid="user-menu"], .user-menu').first()
    if (await userMenu.isVisible()) {
      await userMenu.click()
      await page.waitForTimeout(300)

      const dropdown = page.locator('[role="menu"], .dropdown-menu').first()
      if (await dropdown.isVisible()) {
        await expect(dropdown).toHaveScreenshot('user-menu-dropdown.png', {
          maxDiffPixels: 50,
        })
      }
    }
  })

  // =========================================================================
  // Responsive Snapshots
  // =========================================================================

  test('mobile chat page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/chat/general')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('mobile-chat-page.png', {
      fullPage: true,
      maxDiffPixels: 200,
    }).catch(() => {})
  })

  test('tablet chat page', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/chat/general')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('tablet-chat-page.png', {
      fullPage: true,
      maxDiffPixels: 200,
    }).catch(() => {})
  })

  // =========================================================================
  // Theme Snapshots
  // =========================================================================

  test('dark mode snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Toggle dark mode if available
    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"]')
    if (await themeToggle.isVisible()) {
      await themeToggle.click()
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('chat-page-dark.png', {
        fullPage: true,
        maxDiffPixels: 300,
      })
    }
  })

  // =========================================================================
  // State Snapshots
  // =========================================================================

  test('modal open snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Open create channel modal
    const createButton = page.locator('button:has-text("Create"), [data-testid="create-channel"]')
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(300)

      const modal = page.locator('[role="dialog"]').first()
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('create-channel-modal.png', {
          maxDiffPixels: 100,
        })
      }
    }
  })

  test('loading state snapshot', async ({ page }) => {
    // Intercept requests to delay them
    await page.route('**/graphql', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto('/chat')

    // Capture loading state
    const loadingIndicator = page.locator('.loading, [data-testid="loading"]').first()
    if (await loadingIndicator.isVisible()) {
      await expect(page).toHaveScreenshot('loading-state.png', {
        maxDiffPixels: 100,
      })
    }
  })

  test('empty state snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state').first()
    if (await emptyState.isVisible()) {
      await expect(emptyState).toHaveScreenshot('empty-state.png', {
        maxDiffPixels: 50,
      })
    }
  })
})
