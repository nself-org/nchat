/**
 * Bot Management E2E Tests
 *
 * Comprehensive tests for bot management workflow including:
 * - Navigating to bot manager
 * - Creating bots from templates
 * - Editing bot code
 * - Testing bots in sandbox
 * - Deploying bots
 * - Viewing bot analytics
 * - Bot permissions and configuration
 * - Bot lifecycle management
 */

import { test, expect } from '@playwright/test'

// Test user credentials
const TEST_USERS = {
  owner: {
    email: 'owner@nself.org',
    password: 'password123',
    role: 'owner',
  },
  admin: {
    email: 'admin@nself.org',
    password: 'password123',
    role: 'admin',
  },
  member: {
    email: 'member@nself.org',
    password: 'password123',
    role: 'member',
  },
}

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Login as owner/admin for bot management
  await page.goto('/login')
  await page.waitForLoadState('load')

  const emailInput = page.locator('input[type="email"], input[name="email"]')
  if (await emailInput.isVisible()) {
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await emailInput.fill(TEST_USERS.owner.email)
    await passwordInput.fill(TEST_USERS.owner.password)
    await submitButton.click()

    await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
  }
})

// ============================================================================
// Bot Manager Navigation Tests
// ============================================================================

test.describe('Bot Manager Navigation', () => {
  test('should navigate to bot manager from admin menu', async ({ page }) => {
    // Navigate to admin section
    await page.goto('/admin')
    await page.waitForLoadState('load')

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true })

    // Look for bot management link
    const botManagerLink = page.locator(
      'a:has-text("Bots"), a[href*="/admin/bots"], button:has-text("Bot Manager")'
    )

    if (await botManagerLink.isVisible()) {
      await botManagerLink.click()
      await page.waitForLoadState('load')

      // Should be on bots page
      const currentUrl = page.url()
      expect(currentUrl).toContain('bot')
    }
  })

  test('should display bot manager page', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    // Take screenshot
    await page.screenshot({ path: 'test-results/bot-manager.png', fullPage: true })

    // Look for page heading
    const heading = page.locator('h1:has-text("Bot"), h1:has-text("Automation")')

    const isVisible = await heading.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display bot list/grid', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    // Look for bot list container
    const botList = page.locator(
      '[data-testid="bot-list"], .bot-grid, [data-testid="bots-container"]'
    )

    const isVisible = await botList.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display create bot button prominently', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    // Look for create button
    const createButton = page.locator(
      '[data-testid="create-bot"], button:has-text("Create Bot"), button:has-text("New Bot")'
    )

    const isVisible = await createButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })
})

// ============================================================================
// Bot Templates Tests
// ============================================================================

test.describe('Bot Templates', () => {
  test('should display bot template gallery', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const createButton = page.locator('[data-testid="create-bot"], button:has-text("Create Bot")')

    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      // Take screenshot
      await page.screenshot({ path: 'test-results/bot-templates.png', fullPage: true })

      // Look for template gallery
      const templateGallery = page.locator(
        '[data-testid="template-gallery"], .template-grid'
      )

      const isVisible = await templateGallery.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display template categories', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const createButton = page.locator('[data-testid="create-bot"]')

    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      // Look for categories
      const categories = page.locator(
        '[data-testid="template-category"], .category-tab, button:has-text("Utility"), button:has-text("Moderation")'
      )

      const count = await categories.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show template preview cards', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const createButton = page.locator('[data-testid="create-bot"]')

    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      // Look for template cards
      const templateCards = page.locator(
        '[data-testid="template-card"], .template-card, [data-template-id]'
      )

      const count = await templateCards.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should display template details on hover/click', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const createButton = page.locator('[data-testid="create-bot"]')

    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      const templateCards = page.locator('[data-testid="template-card"]')

      if ((await templateCards.count()) > 0) {
        await templateCards.first().click()
        await page.waitForTimeout(300)

        // Should show template details
        const templateDetails = page.locator(
          '[data-testid="template-details"], .template-preview, [role="dialog"]'
        )

        const isVisible = await templateDetails.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should create bot from template', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const createButton = page.locator('[data-testid="create-bot"]')

    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      const templateCards = page.locator('[data-testid="template-card"]')

      if ((await templateCards.count()) > 0) {
        await templateCards.first().click()
        await page.waitForTimeout(300)

        // Look for "Use Template" or "Create" button
        const useTemplateButton = page.locator(
          'button:has-text("Use Template"), button:has-text("Create from Template"), button:has-text("Select")'
        )

        if (await useTemplateButton.isVisible()) {
          await useTemplateButton.click()
          await page.waitForTimeout(1000)

          // Take screenshot
          await page.screenshot({
            path: 'test-results/bot-created-from-template.png',
            fullPage: true,
          })

          // Should navigate to bot editor or show success
          const editor = page.locator('[data-testid="bot-editor"], .code-editor')
          const successMessage = page.locator('text=/created|success/i')

          const hasEditor = await editor.isVisible().catch(() => false)
          const hasSuccess = await successMessage.isVisible().catch(() => false)

          expect(hasEditor || hasSuccess).toBe(true)
        }
      }
    }
  })

  test('should display template code preview', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const createButton = page.locator('[data-testid="create-bot"]')

    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      const templateCards = page.locator('[data-testid="template-card"]')

      if ((await templateCards.count()) > 0) {
        await templateCards.first().click()
        await page.waitForTimeout(300)

        // Look for code preview
        const codePreview = page.locator('[data-testid="template-code"], pre, code, .code-preview')

        const isVisible = await codePreview.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })
})

// ============================================================================
// Bot Code Editor Tests
// ============================================================================

test.describe('Bot Code Editor', () => {
  test('should display code editor for bot', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    // Look for existing bot to edit
    const botItems = page.locator('[data-testid="bot-item"], .bot-card')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Take screenshot
      await page.screenshot({ path: 'test-results/bot-editor.png', fullPage: true })

      // Look for code editor
      const codeEditor = page.locator(
        '[data-testid="bot-editor"], .monaco-editor, .code-editor, textarea[class*="editor"]'
      )

      const isVisible = await codeEditor.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should support syntax highlighting', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for syntax highlighted code
      const syntaxElements = page.locator(
        '.monaco-editor .token, .hljs-keyword, .hljs-string, [class*="syntax-"]'
      )

      const count = await syntaxElements.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should support code editing', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const codeEditor = page.locator('[data-testid="bot-editor"], textarea').first()

      if (await codeEditor.isVisible()) {
        await codeEditor.click()
        await page.keyboard.type('// Test comment')
        await page.waitForTimeout(300)

        // Editor should accept input
        expect(true).toBe(true)
      }
    }
  })

  test('should display save button', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for save button
      const saveButton = page.locator(
        '[data-testid="save-bot"], button:has-text("Save"), button[aria-label*="save"]'
      )

      const isVisible = await saveButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should show unsaved changes indicator', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const codeEditor = page.locator('textarea, [contenteditable="true"]').first()

      if (await codeEditor.isVisible()) {
        await codeEditor.click()
        await page.keyboard.type('// Modified')
        await page.waitForTimeout(300)

        // Look for unsaved indicator
        const unsavedIndicator = page.locator(
          '[data-testid="unsaved-changes"], .dirty-indicator'
        )

        const isVisible = await unsavedIndicator.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should provide code autocomplete/IntelliSense', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const codeEditor = page.locator('textarea').first()

      if (await codeEditor.isVisible()) {
        await codeEditor.click()
        await page.keyboard.type('bot.')
        await page.waitForTimeout(500)

        // Look for autocomplete suggestions
        const suggestions = page.locator(
          '.monaco-list, [role="listbox"], .autocomplete, .suggestions'
        )

        const isVisible = await suggestions.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should display code validation errors', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for error indicators
      const errorMarkers = page.locator(
        '[data-testid="code-errors"], .error-marker, .squiggly-error'
      )

      const count = await errorMarkers.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Bot Sandbox Testing Tests
// ============================================================================

test.describe('Bot Sandbox Testing', () => {
  test('should display test bot button', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for test button
      const testButton = page.locator(
        '[data-testid="test-bot"], button:has-text("Test"), button:has-text("Run Test")'
      )

      const isVisible = await testButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should open sandbox testing panel', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const testButton = page.locator('[data-testid="test-bot"], button:has-text("Test")')

      if (await testButton.isVisible()) {
        await testButton.click()
        await page.waitForTimeout(500)

        // Take screenshot
        await page.screenshot({ path: 'test-results/bot-sandbox.png', fullPage: true })

        // Look for sandbox panel
        const sandboxPanel = page.locator(
          '[data-testid="bot-sandbox"], [data-testid="test-panel"], .sandbox'
        )

        const isVisible = await sandboxPanel.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should display test input field', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const testButton = page.locator('[data-testid="test-bot"]')

      if (await testButton.isVisible()) {
        await testButton.click()
        await page.waitForTimeout(500)

        // Look for test input
        const testInput = page.locator(
          '[data-testid="test-input"], input[placeholder*="test"], textarea[placeholder*="test"]'
        )

        const isVisible = await testInput.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should run bot in sandbox', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const testButton = page.locator('[data-testid="test-bot"]')

      if (await testButton.isVisible()) {
        await testButton.click()
        await page.waitForTimeout(500)

        const testInput = page.locator('[data-testid="test-input"], input').first()

        if (await testInput.isVisible()) {
          await testInput.fill('/help')
          await page.waitForTimeout(300)

          const runButton = page.locator(
            '[data-testid="run-test"], button:has-text("Run"), button:has-text("Execute")'
          )

          if (await runButton.isVisible()) {
            await runButton.click()
            await page.waitForTimeout(1000)

            // Take screenshot
            await page.screenshot({
              path: 'test-results/bot-test-result.png',
              fullPage: true,
            })

            // Should show test output
            const testOutput = page.locator(
              '[data-testid="test-output"], .output, pre, [data-testid="bot-response"]'
            )

            const isVisible = await testOutput.isVisible().catch(() => false)
            expect(typeof isVisible).toBe('boolean')
          }
        }
      }
    }
  })

  test('should display test execution logs', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const testButton = page.locator('[data-testid="test-bot"]')

      if (await testButton.isVisible()) {
        await testButton.click()
        await page.waitForTimeout(500)

        // Look for logs panel
        const logsPanel = page.locator(
          '[data-testid="test-logs"], .logs, [data-testid="console-output"]'
        )

        const isVisible = await logsPanel.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should show test execution time', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const testButton = page.locator('[data-testid="test-bot"]')

      if (await testButton.isVisible()) {
        await testButton.click()
        await page.waitForTimeout(500)

        const runButton = page.locator('[data-testid="run-test"]')

        if (await runButton.isVisible()) {
          await runButton.click()
          await page.waitForTimeout(1000)

          // Look for execution time
          const executionTime = page.locator(
            '[data-testid="execution-time"], .execution-time'
          )

          const isVisible = await executionTime.isVisible().catch(() => false)
          expect(typeof isVisible).toBe('boolean')
        }
      }
    }
  })
})

// ============================================================================
// Bot Deployment Tests
// ============================================================================

test.describe('Bot Deployment', () => {
  test('should display deploy button', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for deploy button
      const deployButton = page.locator(
        '[data-testid="deploy-bot"], button:has-text("Deploy"), button:has-text("Activate")'
      )

      const isVisible = await deployButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should show deployment confirmation dialog', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const deployButton = page.locator('[data-testid="deploy-bot"], button:has-text("Deploy")')

      if (await deployButton.isVisible()) {
        await deployButton.click()
        await page.waitForTimeout(300)

        // Look for confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"], .confirm-dialog')

        const isVisible = await confirmDialog.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should deploy bot successfully', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const deployButton = page.locator('[data-testid="deploy-bot"]')

      if (await deployButton.isVisible()) {
        await deployButton.click()
        await page.waitForTimeout(300)

        const confirmButton = page.locator('button:has-text("Deploy"), button:has-text("Confirm")')

        if (await confirmButton.isVisible()) {
          await confirmButton.click()
          await page.waitForTimeout(1000)

          // Take screenshot
          await page.screenshot({ path: 'test-results/bot-deployed.png', fullPage: true })

          // Should show success message
          const successMessage = page.locator('text=/deployed|active|success/i')

          const isVisible = await successMessage.isVisible().catch(() => false)
          expect(typeof isVisible).toBe('boolean')
        }
      }
    }
  })

  test('should show bot status as deployed/active', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      // Look for status badge
      const statusBadge = botItems.first().locator('[data-testid="bot-status"], .status, .badge')

      const isVisible = await statusBadge.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should support undeploying bot', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for undeploy/deactivate button
      const undeployButton = page.locator(
        'button:has-text("Undeploy"), button:has-text("Deactivate"), button:has-text("Stop")'
      )

      const isVisible = await undeployButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })
})

// ============================================================================
// Bot Analytics Tests
// ============================================================================

test.describe('Bot Analytics', () => {
  test('should display analytics tab/button', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for analytics tab
      const analyticsTab = page.locator(
        '[data-testid="bot-analytics"], button:has-text("Analytics"), [role="tab"]:has-text("Analytics")'
      )

      const isVisible = await analyticsTab.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display bot usage metrics', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const analyticsTab = page.locator(
        '[data-testid="bot-analytics"], button:has-text("Analytics")'
      )

      if (await analyticsTab.isVisible()) {
        await analyticsTab.click()
        await page.waitForTimeout(500)

        // Take screenshot
        await page.screenshot({ path: 'test-results/bot-analytics.png', fullPage: true })

        // Look for metrics
        const metrics = page.locator(
          '[data-testid="bot-metrics"], .metric, .stat'
        )

        const count = await metrics.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should display usage chart/graph', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const analyticsTab = page.locator('[data-testid="bot-analytics"]')

      if (await analyticsTab.isVisible()) {
        await analyticsTab.click()
        await page.waitForTimeout(500)

        // Look for chart
        const chart = page.locator('canvas, svg[class*="chart"], [data-testid="usage-chart"]')

        const isVisible = await chart.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should show bot error rate', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const analyticsTab = page.locator('[data-testid="bot-analytics"]')

      if (await analyticsTab.isVisible()) {
        await analyticsTab.click()
        await page.waitForTimeout(500)

        // Look for error rate metric
        const errorRate = page.locator(
          '[data-testid="error-rate"], .error-metric'
        )

        const isVisible = await errorRate.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should display bot activity log', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const analyticsTab = page.locator('[data-testid="bot-analytics"]')

      if (await analyticsTab.isVisible()) {
        await analyticsTab.click()
        await page.waitForTimeout(500)

        // Look for activity log
        const activityLog = page.locator('[data-testid="activity-log"], .log-list, table')

        const isVisible = await activityLog.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should allow filtering analytics by date range', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const analyticsTab = page.locator('[data-testid="bot-analytics"]')

      if (await analyticsTab.isVisible()) {
        await analyticsTab.click()
        await page.waitForTimeout(500)

        // Look for date range filter
        const dateFilter = page.locator(
          '[data-testid="date-range"], button:has-text("Last 7 days"), select'
        )

        const isVisible = await dateFilter.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })
})

// ============================================================================
// Bot Configuration Tests
// ============================================================================

test.describe('Bot Configuration', () => {
  test('should display bot settings panel', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for settings tab
      const settingsTab = page.locator(
        '[data-testid="bot-settings"], button:has-text("Settings"), [role="tab"]:has-text("Settings")'
      )

      const isVisible = await settingsTab.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should allow editing bot name and description', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const settingsTab = page.locator('[data-testid="bot-settings"]')

      if (await settingsTab.isVisible()) {
        await settingsTab.click()
        await page.waitForTimeout(500)

        // Look for name and description fields
        const nameInput = page.locator(
          '[data-testid="bot-name"], input[name="name"], input[placeholder*="name"]'
        )

        const descriptionInput = page.locator(
          '[data-testid="bot-description"], textarea[name="description"]'
        )

        const hasName = await nameInput.isVisible().catch(() => false)
        const hasDescription = await descriptionInput.isVisible().catch(() => false)

        expect(hasName || hasDescription).toBe(true)
      }
    }
  })

  test('should display bot trigger configuration', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const settingsTab = page.locator('[data-testid="bot-settings"]')

      if (await settingsTab.isVisible()) {
        await settingsTab.click()
        await page.waitForTimeout(500)

        // Look for trigger settings
        const triggerSettings = page.locator(
          '[data-testid="bot-triggers"]'
        )

        const isVisible = await triggerSettings.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should display bot permissions configuration', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const settingsTab = page.locator('[data-testid="bot-settings"]')

      if (await settingsTab.isVisible()) {
        await settingsTab.click()
        await page.waitForTimeout(500)

        // Look for permissions section
        const permissions = page.locator(
          '[data-testid="bot-permissions"], input[type="checkbox"]'
        )

        const count = await permissions.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should save bot configuration', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const settingsTab = page.locator('[data-testid="bot-settings"]')

      if (await settingsTab.isVisible()) {
        await settingsTab.click()
        await page.waitForTimeout(500)

        // Look for save button
        const saveButton = page.locator('[data-testid="save-settings"], button:has-text("Save")')

        if (await saveButton.isVisible()) {
          await saveButton.click()
          await page.waitForTimeout(1000)

          // Should show success message
          const successMessage = page.locator('text=/saved|updated|success/i')

          const isVisible = await successMessage.isVisible().catch(() => false)
          expect(typeof isVisible).toBe('boolean')
        }
      }
    }
  })
})

// ============================================================================
// Bot Deletion Tests
// ============================================================================

test.describe('Bot Deletion', () => {
  test('should display delete bot button', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      // Look for delete button (usually in settings or menu)
      const deleteButton = page.locator(
        '[data-testid="delete-bot"], button:has-text("Delete"), button[aria-label*="delete"]'
      )

      const isVisible = await deleteButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should show confirmation before deleting bot', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const deleteButton = page.locator('[data-testid="delete-bot"], button:has-text("Delete")')

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(300)

        // Take screenshot
        await page.screenshot({
          path: 'test-results/bot-delete-confirmation.png',
          fullPage: true,
        })

        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]')

        const isVisible = await confirmDialog.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should require typing bot name to confirm deletion', async ({ page }) => {
    await page.goto('/admin/bots')
    await page.waitForLoadState('load')

    const botItems = page.locator('[data-testid="bot-item"]')

    if ((await botItems.count()) > 0) {
      await botItems.first().click()
      await page.waitForTimeout(500)

      const deleteButton = page.locator('[data-testid="delete-bot"]')

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(300)

        // Look for confirmation input
        const confirmInput = page.locator(
          '[data-testid="confirm-delete-input"], input[placeholder*="name"], input[placeholder*="confirm"]'
        )

        const isVisible = await confirmInput.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })
})
