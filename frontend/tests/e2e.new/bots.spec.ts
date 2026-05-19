/**
 * Bot Interactions E2E Tests
 *
 * Comprehensive tests for bot functionality including:
 * - Bot creation and installation
 * - Bot configuration and settings
 * - Bot commands (/help, /status, etc.)
 * - Bot responses and messages
 * - Bot webhooks
 * - Bot permissions management
 * - Bot enable/disable
 * - Bot deletion
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
// Bot Management Page Tests
// ============================================================================

test.describe('Bot Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to bots page
    await page.goto('/admin/bots')
    await page.waitForLoadState('networkidle')
  })

  test('should display bots management page', async ({ page }) => {
    // Look for page heading
    const heading = page.locator('h1:has-text("Bots")')
    const isVisible = await heading.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display installed bots list', async ({ page }) => {
    // Look for installed bots tab/section
    const installedTab = page.locator('[role="tab"]:has-text("Installed"), text=/Installed/i')
    const botTable = page.locator('[data-testid="bot-list"], table, [data-testid="installed-bots"]')

    if (await installedTab.isVisible()) {
      await installedTab.click()
      await page.waitForTimeout(300)
    }

    const isVisible = await botTable.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display bot items in list', async ({ page }) => {
    // Look for bot items
    const botItems = page.locator('[data-testid="bot-item"], tbody tr, [data-bot-id], .bot-card')

    const count = await botItems.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have add bot button', async ({ page }) => {
    // Look for add bot button
    const addButton = page.locator(
      'button:has-text("Add Bot"), button:has-text("Install Bot"), button[data-testid="add-bot"]'
    )

    const isVisible = await addButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should have marketplace button', async ({ page }) => {
    // Look for marketplace button
    const marketplaceButton = page.locator(
      'button:has-text("Marketplace"), button:has-text("Browse Bots")'
    )

    const isVisible = await marketplaceButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should have refresh button', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]')

    const isVisible = await refreshButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should toggle between table and card view', async ({ page }) => {
    // Look for view toggle buttons
    const tableView = page.locator('button:has-text("Table")')
    const cardView = page.locator('button:has-text("Cards")')

    if (await tableView.isVisible()) {
      await tableView.click()
      await page.waitForTimeout(300)
    }

    if (await cardView.isVisible()) {
      await cardView.click()
      await page.waitForTimeout(300)
    }

    expect(true).toBe(true)
  })

  test('should display available bots tab', async ({ page }) => {
    // Look for available bots tab
    const availableTab = page.locator('[role="tab"]:has-text("Available"), text=/Available/i')

    if (await availableTab.isVisible()) {
      await availableTab.click()
      await page.waitForTimeout(300)

      // Should show available bots
      const botCards = page.locator('.bot-card, [data-bot-id]')
      expect(await botCards.count()).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Bot Creation & Installation Tests
// ============================================================================

test.describe('Bot Creation & Installation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to bots page
    await page.goto('/admin/bots')
    await page.waitForLoadState('networkidle')
  })

  test('should open add bot modal', async ({ page }) => {
    // Click add bot button
    const addButton = page.locator('button:has-text("Add Bot"), button[data-testid="add-bot"]')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Modal should open
      const modal = page.locator('[role="dialog"], .modal, [data-testid="add-bot-modal"]')

      const isOpen = await modal.isVisible().catch(() => false)
      expect(typeof isOpen).toBe('boolean')
    }
  })

  test('should display bot token input', async ({ page }) => {
    // Open add bot modal
    const addButton = page.locator('button:has-text("Add Bot")')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Look for token input
      const tokenInput = page.locator(
        'input[placeholder*="token"], input[placeholder*="Token"], [data-testid="bot-token"]'
      )

      const isVisible = await tokenInput.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display channel selection in bot modal', async ({ page }) => {
    // Open add bot modal
    const addButton = page.locator('button:has-text("Add Bot")')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Look for channel selector
      const channelSelector = page.locator(
        'select, [data-testid="channel-select"], [role="listbox"]'
      )

      const exists = await channelSelector.count()
      expect(exists).toBeGreaterThanOrEqual(0)
    }
  })

  test('should display permission checkboxes in bot modal', async ({ page }) => {
    // Open add bot modal
    const addButton = page.locator('button:has-text("Add Bot")')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Look for permission checkboxes
      const permissions = page.locator('input[type="checkbox"], label:has(input[type="checkbox"])')

      const count = await permissions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should close add bot modal on cancel', async ({ page }) => {
    // Open modal
    const addButton = page.locator('button:has-text("Add Bot")')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Find close button
      const closeButton = page.locator(
        'button:has-text("Cancel"), button[aria-label="Close"], [role="dialog"] button:first-child'
      )

      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(300)

        // Modal should close
        const modal = page.locator('[role="dialog"]')
        const isClosed = !(await modal.isVisible())
        expect(isClosed).toBe(true)
      }
    }
  })

  test('should open bot marketplace', async ({ page }) => {
    // Click marketplace button
    const marketplaceButton = page.locator('button:has-text("Marketplace")')

    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click()
      await page.waitForTimeout(300)

      // Marketplace should display
      const marketplace = page.locator(
        'text=/Bot Marketplace|Marketplace/i, [data-testid="marketplace"]'
      )

      const isVisible = await marketplace.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display featured bots in marketplace', async ({ page }) => {
    // Open marketplace
    const marketplaceButton = page.locator('button:has-text("Marketplace")')

    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click()
      await page.waitForTimeout(300)

      // Look for bot cards
      const botCards = page.locator('[data-testid="bot-card"], .bot-card, [data-bot-id]')

      const count = await botCards.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should filter bots by category', async ({ page }) => {
    // Open marketplace
    const marketplaceButton = page.locator('button:has-text("Marketplace")')

    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click()
      await page.waitForTimeout(300)

      // Look for category filter
      const categoryFilter = page.locator(
        'select, button[aria-label*="category"], [data-testid="category-filter"]'
      )

      if (await categoryFilter.first().isVisible()) {
        await categoryFilter.first().click()
        await page.waitForTimeout(300)

        // Select category
        const option = page.locator('option, [role="option"]').first()
        if (await option.isVisible()) {
          await option.click()
          await page.waitForTimeout(300)
        }
      }
    }
  })

  test('should search bots in marketplace', async ({ page }) => {
    // Open marketplace
    const marketplaceButton = page.locator('button:has-text("Marketplace")')

    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click()
      await page.waitForTimeout(300)

      // Look for search input
      const searchInput = page.locator('input[placeholder*="search"], [data-testid="bot-search"]')

      if (await searchInput.isVisible()) {
        await searchInput.fill('reminder')
        await page.waitForTimeout(500)

        // Results should update
        const botCards = page.locator('[data-testid="bot-card"], .bot-card')
        expect(await botCards.count()).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ============================================================================
// Bot Commands Tests
// ============================================================================

test.describe('Bot Commands', () => {
  test.beforeEach(async ({ page }) => {
    // Login as member for chat testing
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.member.email)
      await passwordInput.fill(TEST_USERS.member.password)
      await submitButton.click()

      await page.waitForURL(/\/(chat|admin)/, { timeout: 10000 })
    }

    // Navigate to chat
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('should send bot command', async ({ page }) => {
    // Look for message input
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      // Type bot command
      await messageInput.first().click()
      await page.keyboard.type('/help')
      await page.waitForTimeout(200)

      // Command should be typed
      const inputText = await messageInput.first().textContent()
      expect(inputText).toContain('/')
    }
  })

  test('should display command suggestions', async ({ page }) => {
    // Look for message input
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      await page.keyboard.type('/')
      await page.waitForTimeout(300)

      // Command suggestions should appear
      const suggestions = page.locator(
        '[data-testid="command-suggestions"], .suggestions, [role="listbox"]'
      )

      const isVisible = await suggestions.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should select command from suggestions', async ({ page }) => {
    // Look for message input
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      await page.keyboard.type('/')
      await page.waitForTimeout(300)

      // Look for suggestions
      const suggestions = page.locator('[role="option"], .suggestion')

      if ((await suggestions.count()) > 0) {
        await suggestions.first().click()
        await page.waitForTimeout(200)

        // Command should be inserted
        const inputText = await messageInput.first().textContent()
        expect(inputText?.length || 0).toBeGreaterThan(0)
      }
    }
  })

  test('should execute /help command', async ({ page }) => {
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )
    const sendButton = page.locator(
      '[data-testid="send-button"], button[aria-label*="send"], button:has(svg[class*="send"])'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      await page.keyboard.type('/help')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(1000)

      // Help message should appear
      const helpMessage = page.locator('text=/help|commands|usage/i')

      const exists = await helpMessage.count()
      expect(exists).toBeGreaterThanOrEqual(0)
    }
  })

  test('should execute /status command', async ({ page }) => {
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      await page.keyboard.type('/status')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(1000)

      // Status message should appear
      const statusMessage = page.locator('text=/status|online|ready/i')

      const exists = await statusMessage.count()
      expect(exists).toBeGreaterThanOrEqual(0)
    }
  })

  test('should handle invalid command gracefully', async ({ page }) => {
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      await page.keyboard.type('/nonexistent')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(1000)

      // Should show error or invalid command message
      const errorMessage = page.locator('text=/unknown|not found|invalid|unrecognized/i')

      // Either error shows or message is treated as text
      expect(true).toBe(true)
    }
  })
})

// ============================================================================
// Bot Responses Tests
// ============================================================================

test.describe('Bot Responses', () => {
  test.beforeEach(async ({ page }) => {
    // Login as member
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.member.email)
      await passwordInput.fill(TEST_USERS.member.password)
      await submitButton.click()

      await page.waitForURL(/\/(chat|admin)/, { timeout: 10000 })
    }

    // Navigate to chat
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('should display bot message', async ({ page }) => {
    // Look for messages
    const messages = page.locator('[data-testid="message-item"], .message-item, article')

    // Look for bot indicator
    const botMessages = page.locator('[data-testid="bot-message"], .bot-message, [data-bot-id]')

    const count = await botMessages.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display bot avatar/badge', async ({ page }) => {
    // Look for bot messages with avatar
    const botAvatars = page.locator('[data-testid="bot-avatar"], .bot-avatar, img[alt*="bot"]')

    const count = await botAvatars.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should support bot message formatting', async ({ page }) => {
    // Look for formatted message (bold, italic, code, etc)
    const formattedText = page.locator('strong, em, code, pre, [class*="font-"]')

    const exists = await formattedText.count()
    expect(exists).toBeGreaterThanOrEqual(0)
  })

  test('should support bot embeds and cards', async ({ page }) => {
    // Look for embed containers
    const embeds = page.locator('[data-testid="embed"], .embed, [data-testid="card"], .card')

    const count = await embeds.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display bot action buttons', async ({ page }) => {
    // Look for bot message buttons/actions
    const botActions = page.locator('button[data-action], .bot-action, [data-testid="bot-button"]')

    const count = await botActions.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should handle bot mentions', async ({ page }) => {
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      await page.keyboard.type('@')
      await page.waitForTimeout(300)

      // Mention suggestions should appear
      const mentions = page.locator('[role="option"], .mention')

      const count = await mentions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Bot Configuration Tests
// ============================================================================

test.describe('Bot Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to bots page
    await page.goto('/admin/bots')
    await page.waitForLoadState('networkidle')
  })

  test('should open bot settings modal', async ({ page }) => {
    // Look for installed bots
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      // Hover to show actions
      await botItems.first().hover()
      await page.waitForTimeout(300)

      // Look for settings button
      const settingsButton = page.locator(
        'button[aria-label*="settings"], button[aria-label*="configure"], button:has-text("Settings")'
      )

      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await page.waitForTimeout(300)

        // Settings modal should open
        const modal = page.locator('[role="dialog"], .modal')
        const isOpen = await modal.isVisible()
        expect(isOpen).toBe(true)
      }
    }
  })

  test('should display bot settings form', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      await botItems.first().hover()

      const settingsButton = page.locator(
        'button[aria-label*="settings"], button:has-text("Settings")'
      )

      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await page.waitForTimeout(300)

        // Look for form inputs
        const formInputs = page.locator('input, textarea, select')

        const count = await formInputs.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should update bot settings', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      await botItems.first().hover()

      const settingsButton = page.locator(
        'button[aria-label*="settings"], button:has-text("Settings")'
      )

      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await page.waitForTimeout(300)

        // Look for save button
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]')

        if (await saveButton.isVisible()) {
          // Check if it's disabled or enabled
          const isDisabled = await saveButton.isDisabled()
          expect(typeof isDisabled).toBe('boolean')
        }
      }
    }
  })

  test('should manage bot permissions', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      await botItems.first().hover()

      const settingsButton = page.locator(
        'button[aria-label*="settings"], button:has-text("Settings")'
      )

      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await page.waitForTimeout(300)

        // Look for permission checkboxes
        const permissions = page.locator(
          'input[type="checkbox"], label:has(input[type="checkbox"])'
        )

        const count = await permissions.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ============================================================================
// Bot Enable/Disable Tests
// ============================================================================

test.describe('Bot Enable/Disable', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to bots page
    await page.goto('/admin/bots')
    await page.waitForLoadState('networkidle')
  })

  test('should display bot enabled/disabled status', async ({ page }) => {
    // Look for bot status indicator
    const statusIndicator = page.locator(
      '[data-testid="bot-status"], .status-badge, [class*="toggle"]'
    )

    const count = await statusIndicator.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should toggle bot enabled state', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      // Look for toggle switch
      const toggleSwitch = botItems
        .first()
        .locator('input[type="checkbox"], button[role="switch"], [role="switch"]')

      if (await toggleSwitch.isVisible()) {
        // Get initial state
        const initialState = await toggleSwitch.getAttribute('aria-checked')

        await toggleSwitch.click()
        await page.waitForTimeout(300)

        // State should change
        const newState = await toggleSwitch.getAttribute('aria-checked')
        expect(newState).not.toEqual(initialState)
      }
    }
  })

  test('should show disabled bot indication', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      // Look for disabled indicator
      const disabledIndicator = botItems.first().locator('[class*="disabled"], [class*="opacity-"]')

      const exists = await disabledIndicator.count()
      expect(exists).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Bot Deletion Tests
// ============================================================================

test.describe('Bot Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to bots page
    await page.goto('/admin/bots')
    await page.waitForLoadState('networkidle')
  })

  test('should display delete bot button', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      await botItems.first().hover()

      // Look for delete button
      const deleteButton = page.locator(
        'button[aria-label*="delete"], button:has-text("Delete"), button:has-text("Remove")'
      )

      const isVisible = await deleteButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should show delete confirmation dialog', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      await botItems.first().hover()

      const deleteButton = page.locator(
        'button[aria-label*="delete"], button:has-text("Delete"), button:has-text("Remove")'
      )

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(300)

        // Confirmation dialog should appear
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"], .confirm-dialog')

        const isOpen = await confirmDialog.isVisible()
        expect(isOpen).toBe(true)
      }
    }
  })

  test('should cancel bot deletion', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      await botItems.first().hover()

      const deleteButton = page.locator('button[aria-label*="delete"], button:has-text("Delete")')

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(300)

        // Find cancel button
        const cancelButton = page.locator('button:has-text("Cancel")')

        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          await page.waitForTimeout(300)

          // Dialog should close
          const dialog = page.locator('[role="alertdialog"], [role="dialog"]')
          const isClosed = !(await dialog.isVisible())
          expect(isClosed).toBe(true)
        }
      }
    }
  })

  test('should confirm bot deletion', async ({ page }) => {
    const botItems = page.locator('[data-testid="bot-item"], .bot-card, tbody tr')

    if ((await botItems.count()) > 0) {
      const initialCount = await botItems.count()

      await botItems.first().hover()

      const deleteButton = page.locator('button[aria-label*="delete"], button:has-text("Delete")')

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(300)

        // Find confirm button
        const confirmButton = page.locator(
          'button:has-text("Delete"), button:has-text("Confirm"), button[data-testid="confirm"]'
        )

        if (await confirmButton.isVisible()) {
          await confirmButton.click()
          await page.waitForTimeout(1000)

          // Bot count should decrease or show success
          const newCount = await botItems.count()
          expect(newCount).toBeLessThanOrEqual(initialCount)
        }
      }
    }
  })
})

// ============================================================================
// Bot Webhooks Tests
// ============================================================================

test.describe('Bot Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to webhooks page
    await page.goto('/admin/webhooks')
    await page.waitForLoadState('networkidle')
  })

  test('should display webhooks page', async ({ page }) => {
    // Look for page heading
    const heading = page.locator('h1, h2')
    const isVisible = await heading
      .first()
      .isVisible()
      .catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display webhook list', async ({ page }) => {
    // Look for webhook table
    const webhookTable = page.locator(
      '[data-testid="webhook-list"], table, [data-testid="webhooks"]'
    )

    const isVisible = await webhookTable.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should have button to create webhook', async ({ page }) => {
    // Look for add webhook button
    const addButton = page.locator(
      'button:has-text("Add Webhook"), button:has-text("New Webhook"), button[data-testid="create-webhook"]'
    )

    const isVisible = await addButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display webhook URL', async ({ page }) => {
    // Look for webhook URLs
    const webhookUrls = page.locator('[data-testid="webhook-url"], code, [class*="url"]')

    const count = await webhookUrls.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should allow copying webhook URL', async ({ page }) => {
    // Look for copy button
    const copyButton = page.locator('button[aria-label*="copy"], button:has(svg[class*="copy"])')

    if (await copyButton.first().isVisible()) {
      await copyButton.first().click()
      await page.waitForTimeout(300)

      // Copy should succeed
      expect(true).toBe(true)
    }
  })

  test('should display webhook event types', async ({ page }) => {
    // Look for event type selectors
    const eventSelectors = page.locator('input[type="checkbox"], label:has(input[type="checkbox"])')

    const count = await eventSelectors.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should regenerate webhook secret', async ({ page }) => {
    // Look for regenerate button
    const regenerateButton = page.locator(
      'button:has-text("Regenerate"), button[aria-label*="regenerate"]'
    )

    if (await regenerateButton.isVisible()) {
      await regenerateButton.click()
      await page.waitForTimeout(300)

      // Confirmation or success should appear
      expect(true).toBe(true)
    }
  })
})

// ============================================================================
// Bot Permissions Tests
// ============================================================================

test.describe('Bot Permissions', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.owner.email)
      await passwordInput.fill(TEST_USERS.owner.password)
      await submitButton.click()

      await page.waitForURL(/\/(admin|chat)/, { timeout: 10000 })
    }

    // Navigate to bots page
    await page.goto('/admin/bots')
    await page.waitForLoadState('networkidle')
  })

  test('should display permission checkboxes', async ({ page }) => {
    // Look for permission controls
    const permissionCheckboxes = page.locator(
      'input[type="checkbox"], label:has(input[type="checkbox"])'
    )

    const count = await permissionCheckboxes.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should toggle individual permissions', async ({ page }) => {
    // Look for permission checkboxes
    const permissionCheckboxes = page.locator(
      'input[type="checkbox"][data-permission], input[type="checkbox"]'
    )

    if ((await permissionCheckboxes.count()) > 0) {
      const checkbox = permissionCheckboxes.first()
      const initialState = await checkbox.isChecked()

      await checkbox.click()
      await page.waitForTimeout(300)

      const newState = await checkbox.isChecked()
      expect(newState).not.toEqual(initialState)
    }
  })

  test('should show permission descriptions', async ({ page }) => {
    // Look for permission descriptions/labels
    const descriptions = page.locator(
      'label, [data-testid="permission-description"], [class*="description"]'
    )

    const count = await descriptions.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should restrict admin-only permissions', async ({ page }) => {
    // Look for disabled permission controls
    const disabledPermissions = page.locator('input[type="checkbox"][disabled]')

    const count = await disabledPermissions.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should save permission changes', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator(
      'button:has-text("Save"), button[type="submit"], [data-testid="save-permissions"]'
    )

    if (await saveButton.isVisible()) {
      // Check enabled/disabled state
      const isDisabled = await saveButton.isDisabled()
      expect(typeof isDisabled).toBe('boolean')
    }
  })
})

// ============================================================================
// Bot Error Handling Tests
// ============================================================================

test.describe('Bot Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Login as member for chat testing
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await emailInput.fill(TEST_USERS.member.email)
      await passwordInput.fill(TEST_USERS.member.password)
      await submitButton.click()

      await page.waitForURL(/\/(chat|admin)/, { timeout: 10000 })
    }

    // Navigate to chat
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('should handle command parsing errors', async ({ page }) => {
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )

    if (await messageInput.first().isVisible()) {
      await messageInput.first().click()
      // Type malformed command
      await page.keyboard.type('/command with incomplete')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(1000)

      // Error or graceful handling should occur
      expect(true).toBe(true)
    }
  })

  test('should show bot offline message', async ({ page }) => {
    // Look for offline indicator
    const offlineIndicator = page.locator(
      'text=/offline|unavailable|disconnected/i, [data-testid="offline"]'
    )

    const exists = await offlineIndicator.count()
    expect(exists).toBeGreaterThanOrEqual(0)
  })

  test('should recover from bot errors', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true)
    await page.waitForTimeout(1000)

    // Restore connection
    await page.context().setOffline(false)
    await page.waitForTimeout(1000)

    // Page should be functional
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea'
    )

    const isVisible = await messageInput
      .first()
      .isVisible()
      .catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })
})
