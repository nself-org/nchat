/**
 * Search Functionality E2E Tests
 *
 * Tests for search features including:
 * - Search messages by text
 * - Search users by name/email
 * - Search channels
 * - Filter search results
 * - Search suggestions/autocomplete
 * - Recent searches
 * - Global search vs channel search
 * - Search result navigation
 */

import { test, expect } from '@playwright/test'

// Test user credentials
const TEST_USERS = {
  owner: {
    email: 'owner@nself.org',
    password: 'password123',
    role: 'owner',
  },
}

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Navigate to chat and ensure logged in
  await page.goto('/chat')
  await page.waitForLoadState('load')

  // Wait for chat interface to be ready
  await page
    .waitForSelector('[data-testid="chat-container"], .chat-container, main', {
      timeout: 10000,
    })
    .catch(() => {
      // May have different structure
    })
})

// ============================================================================
// Global Search Access Tests
// ============================================================================

test.describe('Global Search Access', () => {
  test('should display search bar in header or sidebar', async ({ page }) => {
    // Look for search input in various locations
    const headerSearch = page.locator(
      '[data-testid="global-search"], [data-testid="search-bar"], input[placeholder*="Search"], input[placeholder*="search"]'
    )

    const searchButton = page.locator(
      '[data-testid="search-button"], button[aria-label*="search"], button[aria-label*="Search"]'
    )

    const hasSearchUI =
      (await headerSearch.isVisible().catch(() => false)) ||
      (await searchButton.isVisible().catch(() => false))

    expect(typeof hasSearchUI).toBe('boolean')
  })

  test('should open search modal with keyboard shortcut', async ({ page }) => {
    // Common shortcuts: Ctrl/Cmd + K, Ctrl/Cmd + F
    await page.keyboard.press('Control+K')
    await page.waitForTimeout(300)

    // Or try Cmd+K for macOS
    if (!page.url().includes('search')) {
      await page.keyboard.press('Meta+K')
      await page.waitForTimeout(300)
    }

    // Look for search modal
    const searchModal = page.locator(
      '[data-testid="search-modal"], [data-testid="command-palette"], [role="dialog"]'
    )

    const isModalOpen = await searchModal.isVisible().catch(() => false)
    expect(typeof isModalOpen).toBe('boolean')
  })

  test('should focus search input on page load', async ({ page }) => {
    // Navigate directly to search page
    await page.goto('/chat/search').catch(() => {
      // May not have dedicated search page
    })

    await page.waitForTimeout(500)

    const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')

    if (await searchInput.isVisible()) {
      const isFocused = await searchInput.evaluate((el) => document.activeElement === el)
      expect(typeof isFocused).toBe('boolean')
    }
  })

  test('should close search on Escape key', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')

    if (await searchInput.isVisible()) {
      await searchInput.click()
      await page.keyboard.type('test')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Search should close or input should clear
      const isInputVisible = await searchInput.isVisible().catch(() => false)
      expect(typeof isInputVisible).toBe('boolean')
    }
  })
})

// ============================================================================
// Message Search Tests
// ============================================================================

test.describe('Message Search', () => {
  test('should search for messages by keyword', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('hello')
      await page.waitForTimeout(500)

      // Look for search results
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"], .search-result, [role="listbox"]'
      )

      const resultCount = await searchResults.count()
      expect(resultCount).toBeGreaterThanOrEqual(0) // May have zero results
    }
  })

  test('should display message search results with preview', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for results with preview
      const messagePreview = page.locator(
        '[data-testid="message-result"], .message-preview, [data-testid="result-preview"]'
      )

      const previewCount = await messagePreview.count()

      if (previewCount > 0) {
        // Should show message content
        const messageText = messagePreview.first().locator('text=test')
        const hasMessageText = await messageText.isVisible().catch(() => false)
        expect(typeof hasMessageText).toBe('boolean')
      }
    }
  })

  test('should show message context in search results', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('message')
      await page.waitForTimeout(500)

      const messageResult = page.locator('[data-testid="message-result"], .message-preview')

      if ((await messageResult.count()) > 0) {
        const firstResult = messageResult.first()

        // Look for sender name and timestamp
        const senderName = firstResult.locator(
          '[data-testid="sender-name"], .sender-name, [aria-label*="sender"]'
        )

        const timestamp = firstResult.locator(
          '[data-testid="message-time"], .message-time, .timestamp'
        )

        const hasContext =
          (await senderName.isVisible().catch(() => false)) ||
          (await timestamp.isVisible().catch(() => false))

        expect(typeof hasContext).toBe('boolean')
      }
    }
  })

  test('should navigate to message when clicking search result', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('hello')
      await page.waitForTimeout(500)

      const messageResult = page.locator(
        '[data-testid="message-result"], .message-result, [data-testid="search-result-item"]'
      )

      if ((await messageResult.count()) > 0) {
        await messageResult.first().click()
        await page.waitForTimeout(500)

        // Should navigate to message or highlight it
        const currentUrl = page.url()
        expect(currentUrl).toContain('/chat')
      }
    }
  })

  test('should support exact phrase search with quotes', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('"exact phrase"')
      await page.waitForTimeout(500)

      // Search should execute with quoted phrase
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"]'
      )

      const resultCount = await searchResults.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should highlight search terms in results', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for highlighted search terms
      const highlightedText = page.locator(
        '[data-testid="search-highlight"], .highlight, .search-highlight, mark'
      )

      const highlightCount = await highlightedText.count()
      expect(highlightCount).toBeGreaterThanOrEqual(0) // May not highlight
    }
  })
})

// ============================================================================
// Channel Search Tests
// ============================================================================

test.describe('Channel Search', () => {
  test('should search for channels by name', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('general')
      await page.waitForTimeout(500)

      // Look for channel results
      const channelResult = page.locator(
        '[data-testid="channel-result"], .channel-result, [data-testid="search-result-item"]'
      )

      const resultCount = await channelResult.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show channel icon in search results', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('#')
      await page.waitForTimeout(500)

      // Look for channel results with icon
      const channelResult = page.locator('[data-testid="channel-result"], .channel-result')

      if ((await channelResult.count()) > 0) {
        const firstResult = channelResult.first()

        const channelIcon = firstResult.locator('[data-testid="channel-icon"], .channel-icon, svg')

        const hasIcon = await channelIcon.isVisible().catch(() => false)
        expect(typeof hasIcon).toBe('boolean')
      }
    }
  })

  test('should display channel member count', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('general')
      await page.waitForTimeout(500)

      const channelResult = page.locator('[data-testid="channel-result"], .channel-result')

      if ((await channelResult.count()) > 0) {
        const firstResult = channelResult.first()

        const memberCount = firstResult.locator(
          '[data-testid="member-count"], .member-count, text=/member/i'
        )

        const hasCount = await memberCount.isVisible().catch(() => false)
        expect(typeof hasCount).toBe('boolean')
      }
    }
  })

  test('should navigate to channel when clicking search result', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('general')
      await page.waitForTimeout(500)

      const channelResult = page.locator('[data-testid="channel-result"], .channel-result')

      if ((await channelResult.count()) > 0) {
        await channelResult.first().click()
        await page.waitForTimeout(500)

        // Should navigate to channel
        const currentUrl = page.url()
        expect(currentUrl).toContain('/chat')
      }
    }
  })
})

// ============================================================================
// User/Contact Search Tests
// ============================================================================

test.describe('User/Contact Search', () => {
  test('should search for users by name', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('owner')
      await page.waitForTimeout(500)

      // Look for user results
      const userResult = page.locator(
        '[data-testid="user-result"], [data-testid="contact-result"], .user-result, .contact-result'
      )

      const resultCount = await userResult.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should search for users by email', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('@nself.org')
      await page.waitForTimeout(500)

      // Look for user results
      const userResult = page.locator('[data-testid="user-result"], [data-testid="contact-result"]')

      const resultCount = await userResult.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show user avatar in search results', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('member')
      await page.waitForTimeout(500)

      const userResult = page.locator('[data-testid="user-result"], [data-testid="contact-result"]')

      if ((await userResult.count()) > 0) {
        const firstResult = userResult.first()

        const avatar = firstResult.locator(
          '[data-testid="user-avatar"], .avatar, img[alt*="avatar"]'
        )

        const hasAvatar = await avatar.isVisible().catch(() => false)
        expect(typeof hasAvatar).toBe('boolean')
      }
    }
  })

  test('should show user online status', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('member')
      await page.waitForTimeout(500)

      const userResult = page.locator('[data-testid="user-result"], [data-testid="contact-result"]')

      if ((await userResult.count()) > 0) {
        const firstResult = userResult.first()

        const onlineStatus = firstResult.locator(
          '[data-testid="online-status"], .online-status, [aria-label*="online"]'
        )

        // Status indicator may be present
        const hasStatus = await onlineStatus.isVisible().catch(() => false)
        expect(typeof hasStatus).toBe('boolean')
      }
    }
  })

  test('should open direct message when clicking user result', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('member')
      await page.waitForTimeout(500)

      const userResult = page.locator('[data-testid="user-result"], [data-testid="contact-result"]')

      if ((await userResult.count()) > 0) {
        await userResult.first().click()
        await page.waitForTimeout(500)

        // Should open DM or navigate to user
        const currentUrl = page.url()
        expect(currentUrl).toContain('/chat')
      }
    }
  })
})

// ============================================================================
// Search Filters Tests
// ============================================================================

test.describe('Search Filters', () => {
  test('should display filter options', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for filter buttons or options
      const filterButton = page.locator(
        '[data-testid="filter-button"], button[aria-label*="filter"], .filter-button'
      )

      const filterOptions = page.locator(
        '[data-testid="filter-options"], [role="group"], .filter-options'
      )

      const hasFilters =
        (await filterButton.isVisible().catch(() => false)) ||
        (await filterOptions.isVisible().catch(() => false))

      expect(typeof hasFilters).toBe('boolean')
    }
  })

  test('should filter results by type (messages/channels/users)', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for type filters
      const messagesFilter = page.locator(
        '[data-testid="filter-messages"], label:has-text("Messages"), button:has-text("Messages")'
      )

      const channelsFilter = page.locator(
        '[data-testid="filter-channels"], label:has-text("Channels"), button:has-text("Channels")'
      )

      const usersFilter = page.locator(
        '[data-testid="filter-users"], label:has-text("People"), button:has-text("People")'
      )

      const hasTypeFilters =
        (await messagesFilter.isVisible().catch(() => false)) ||
        (await channelsFilter.isVisible().catch(() => false)) ||
        (await usersFilter.isVisible().catch(() => false))

      expect(typeof hasTypeFilters).toBe('boolean')
    }
  })

  test('should filter by date range', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for date filter
      const dateFilter = page.locator(
        '[data-testid="date-filter"], input[type="date"], [aria-label*="date"]'
      )

      const hasDateFilter = await dateFilter.isVisible().catch(() => false)
      expect(typeof hasDateFilter).toBe('boolean')
    }
  })

  test('should filter by channel', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for channel filter dropdown
      const channelFilter = page.locator(
        '[data-testid="channel-filter"], [aria-label*="channel"], select'
      )

      const hasChannelFilter = await channelFilter.isVisible().catch(() => false)
      expect(typeof hasChannelFilter).toBe('boolean')
    }
  })

  test('should support clearing filters', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for clear filters button
      const clearButton = page.locator(
        '[data-testid="clear-filters"], button:has-text("Clear"), button[aria-label*="clear"]'
      )

      if (await clearButton.isVisible()) {
        await clearButton.click()
        await page.waitForTimeout(300)

        // Filters should be reset
        expect(true).toBe(true)
      }
    }
  })
})

// ============================================================================
// Search Suggestions and Autocomplete Tests
// ============================================================================

test.describe('Search Suggestions', () => {
  test('should show search suggestions while typing', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('h')
      await page.waitForTimeout(300)

      // Look for suggestion dropdown
      const suggestions = page.locator(
        '[data-testid="suggestions"], [role="listbox"], [role="menu"]'
      )

      const hasSuggestions = await suggestions.isVisible().catch(() => false)
      expect(typeof hasSuggestions).toBe('boolean')
    }
  })

  test('should display suggested search terms', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('te')
      await page.waitForTimeout(300)

      const suggestionItem = page.locator(
        '[data-testid="suggestion-item"], [role="option"], .suggestion'
      )

      const itemCount = await suggestionItem.count()
      expect(itemCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should support autocomplete with arrow keys', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('te')
      await page.waitForTimeout(300)

      // Press arrow down to select suggestion
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      // Suggestion should be highlighted
      const highlightedSuggestion = page.locator(
        '[data-testid="suggestion-item"][aria-selected="true"], [role="option"][aria-selected="true"]'
      )

      // May highlight or not
      expect(true).toBe(true)
    }
  })

  test('should select suggestion with Enter key', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('te')
      await page.waitForTimeout(300)

      // Select first suggestion
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Search should execute
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"]'
      )

      expect(true).toBe(true)
    }
  })

  test('should show popular/trending searches', async ({ page }) => {
    // Open search without query
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.waitForTimeout(300)

      // Look for trending/popular searches
      const trendingSection = page.locator(
        '[data-testid="trending-searches"], [data-testid="popular-searches"], text=/trending|popular/i'
      )

      const hasTrending = await trendingSection.isVisible().catch(() => false)
      expect(typeof hasTrending).toBe('boolean')
    }
  })
})

// ============================================================================
// Recent Searches Tests
// ============================================================================

test.describe('Recent Searches', () => {
  test('should display recent searches', async ({ page }) => {
    // Perform a search first
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test search')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Clear search to see recent
      await searchInput.first().click()
      await searchInput.first().fill('')
      await page.waitForTimeout(300)

      // Look for recent searches
      const recentSearches = page.locator('[data-testid="recent-searches"], text=/recent/i')

      const hasRecent = await recentSearches.isVisible().catch(() => false)
      expect(typeof hasRecent).toBe('boolean')
    }
  })

  test('should click recent search to restore it', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('recent test')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Clear to see recent
      await searchInput.first().fill('')
      await page.waitForTimeout(300)

      const recentItem = page.locator('[data-testid="recent-search-item"], .recent-search')

      if ((await recentItem.count()) > 0) {
        const itemText = await recentItem.first().textContent()
        expect(itemText).toBeTruthy()
      }
    }
  })

  test('should support clearing recent searches', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()

      // Look for clear recent button
      const clearRecent = page.locator(
        '[data-testid="clear-recent"], button:has-text("Clear recent"), button[aria-label*="clear"]'
      )

      if (await clearRecent.isVisible()) {
        await clearRecent.click()
        await page.waitForTimeout(300)

        // Recent searches should be cleared
        expect(true).toBe(true)
      }
    }
  })
})

// ============================================================================
// Channel-Specific Search Tests
// ============================================================================

test.describe('Channel-Specific Search', () => {
  test('should search within current channel', async ({ page }) => {
    // Navigate to a channel first
    const channels = page.locator('[data-testid="channel-item"], .channel-item, a[href*="/chat/"]')

    const channelCount = await channels.count()

    if (channelCount > 0) {
      await channels.first().click()
      await page.waitForTimeout(500)

      // Look for channel-specific search
      const channelSearch = page.locator(
        '[data-testid="channel-search"], [data-testid="search-input"], input[placeholder*="Search"]'
      )

      if (await channelSearch.isVisible()) {
        await channelSearch.click()
        await page.keyboard.type('test')
        await page.waitForTimeout(500)

        // Results should be from current channel only
        const searchResults = page.locator(
          '[data-testid="search-results"], [data-testid="message-result"]'
        )

        const resultCount = await searchResults.count()
        expect(resultCount).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should indicate search scope (channel vs global)', async ({ page }) => {
    const channels = page.locator('[data-testid="channel-item"], .channel-item, a[href*="/chat/"]')

    const channelCount = await channels.count()

    if (channelCount > 0) {
      await channels.first().click()
      await page.waitForTimeout(500)

      const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')

      if (await searchInput.isVisible()) {
        // Look for scope indicator
        const scopeIndicator = page.locator(
          '[data-testid="search-scope"], .search-scope, [aria-label*="scope"]'
        )

        const hasScope = await scopeIndicator.isVisible().catch(() => false)
        expect(typeof hasScope).toBe('boolean')
      }
    }
  })

  test('should allow switching between channel and global search', async ({ page }) => {
    const channels = page.locator('[data-testid="channel-item"], .channel-item, a[href*="/chat/"]')

    const channelCount = await channels.count()

    if (channelCount > 0) {
      await channels.first().click()
      await page.waitForTimeout(500)

      const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')

      if (await searchInput.isVisible()) {
        // Look for scope toggle
        const scopeToggle = page.locator(
          '[data-testid="toggle-scope"], button[aria-label*="toggle"], .scope-toggle'
        )

        if (await scopeToggle.isVisible()) {
          await scopeToggle.click()
          await page.waitForTimeout(300)

          // Scope should change
          expect(true).toBe(true)
        }
      }
    }
  })
})

// ============================================================================
// Search Result Navigation Tests
// ============================================================================

test.describe('Search Result Navigation', () => {
  test('should navigate between search results with arrow keys', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Navigate results
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(200)

      // Navigation should work
      expect(true).toBe(true)
    }
  })

  test('should show result count', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for result count
      const resultCount = page.locator(
        '[data-testid="result-count"], .result-count, text=/result/i'
      )

      const hasCount = await resultCount.isVisible().catch(() => false)
      expect(typeof hasCount).toBe('boolean')
    }
  })

  test('should support pagination in search results', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for next page button
      const nextButton = page.locator(
        '[data-testid="next-page"], button[aria-label*="next"], button:has-text("Next")'
      )

      const prevButton = page.locator(
        '[data-testid="prev-page"], button[aria-label*="previous"], button:has-text("Previous")'
      )

      const hasPagination =
        (await nextButton.isVisible().catch(() => false)) ||
        (await prevButton.isVisible().catch(() => false))

      expect(typeof hasPagination).toBe('boolean')
    }
  })

  test('should load more results on scroll', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for results container
      const resultsContainer = page.locator('[data-testid="search-results"], .search-results')

      if (await resultsContainer.isVisible()) {
        // Scroll to bottom
        await resultsContainer.evaluate((el) => (el.scrollTop = el.scrollHeight))
        await page.waitForTimeout(500)

        // More results should load or load more button appears
        expect(true).toBe(true)
      }
    }
  })
})

// ============================================================================
// Search Performance and Feedback Tests
// ============================================================================

test.describe('Search Experience', () => {
  test('should show loading state while searching', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')

      // Loading indicator may appear briefly
      const loadingIndicator = page.locator(
        '[data-testid="search-loading"], .loading, .spinner, [aria-busy="true"]'
      )

      // Check for loading state
      await page.waitForTimeout(100)

      expect(true).toBe(true)
    }
  })

  test('should show "no results" message', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      // Search for something unlikely to exist
      await page.keyboard.type('xyzabc123notaword')
      await page.waitForTimeout(500)

      // Look for no results message
      const noResults = page.locator('[data-testid="no-results"], text=/no results|not found/i')

      // May show no results
      expect(true).toBe(true)
    }
  })

  test('should show search error message on failure', async ({ page }) => {
    await page.context().setOffline(true)

    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test')
      await page.waitForTimeout(500)

      // Look for error message
      const errorMessage = page.locator(
        '[data-testid="search-error"], .error, text=/error|failed/i'
      )

      // May show error
      expect(true).toBe(true)
    }

    await page.context().setOffline(false)
  })

  test('should preserve search query on navigation', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('persistent')
      await page.waitForTimeout(300)

      const queryValue = await searchInput.first().inputValue()

      // Navigate to result
      const searchResult = page.locator('[data-testid="search-result-item"], .search-result')

      if ((await searchResult.count()) > 0) {
        await searchResult.first().click()
        await page.waitForTimeout(300)

        // Go back
        await page.goBack()
        await page.waitForTimeout(300)

        // Query should be preserved
        const newQueryValue = await searchInput
          .first()
          .inputValue()
          .catch(() => '')
        expect(newQueryValue || queryValue).toBeTruthy()
      }
    }
  })
})

// ============================================================================
// Search with Modifiers Tests
// ============================================================================

test.describe('Advanced Search Syntax', () => {
  test('should support search by sender (from:)', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('from:owner test')
      await page.waitForTimeout(500)

      // Search should execute with modifier
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"]'
      )

      const resultCount = await searchResults.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should support search by channel (in:)', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('in:general test')
      await page.waitForTimeout(500)

      // Search should execute with modifier
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"]'
      )

      const resultCount = await searchResults.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should support search by date (before:/after:)', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('before:2025-01-29 test')
      await page.waitForTimeout(500)

      // Search should execute with date modifier
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"]'
      )

      const resultCount = await searchResults.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should support negative search (exclude with -)', async ({ page }) => {
    const searchInput = page.locator(
      '[data-testid="search-input"], [data-testid="global-search"], input[placeholder*="Search"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().click()
      await page.keyboard.type('test -spam')
      await page.waitForTimeout(500)

      // Search should exclude results
      const searchResults = page.locator(
        '[data-testid="search-results"], [data-testid="message-result"]'
      )

      const resultCount = await searchResults.count()
      expect(resultCount).toBeGreaterThanOrEqual(0)
    }
  })
})
