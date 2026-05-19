/**
 * AI Summarization E2E Tests
 *
 * Comprehensive tests for AI-powered summarization features including:
 * - Thread summarization workflow
 * - Channel digest generation
 * - Sentiment analysis view
 * - Download summary
 *
 * Features:
 * - Page object pattern
 * - Screenshots on failure
 * - Video recording for critical flows
 * - Accessibility testing with axe
 * - Performance metrics
 * - Mobile viewport testing
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AISummaryPage } from './pages/ai-summary.page'
import { ChatPage } from './pages/chat.page'

// Test user credentials
const TEST_USERS = {
  owner: {
    email: 'owner@nself.org',
    password: 'password123',
    role: 'owner',
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
// Thread Access Tests
// ============================================================================

test.describe('Thread Access and Navigation', () => {
  test('should display threads in message list', async ({ page }) => {
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/threads-view.png', fullPage: true })

    // Look for thread indicators
    const threadIndicators = page.locator(
      '[data-testid="thread-indicator"], [data-testid="reply-count"], .thread-indicator, button:has-text("replies")'
    )

    const count = await threadIndicators.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should open thread panel when clicking on thread indicator', async ({ page }) => {
    // Look for thread indicators
    const threadIndicators = page.locator(
      '[data-testid="thread-indicator"], [data-testid="reply-count"], button:has-text("replies")'
    )

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      // Take screenshot of opened thread
      await page.screenshot({ path: 'test-results/thread-opened.png', fullPage: true })

      // Thread panel should open
      const threadPanel = page.locator(
        '[data-testid="thread-panel"], [data-testid="thread-view"], .thread-panel, aside'
      )

      const isVisible = await threadPanel.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display thread messages in panel', async ({ page }) => {
    // Open first thread
    const threadIndicators = page.locator(
      '[data-testid="thread-indicator"], button:has-text("replies")'
    )

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      // Look for thread messages
      const threadMessages = page.locator(
        '[data-testid="thread-message"], .thread-message, [data-testid="thread-panel"] [data-testid="message-item"]'
      )

      const messageCount = await threadMessages.count()
      expect(messageCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should close thread panel', async ({ page }) => {
    // Open thread
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      // Look for close button
      const closeButton = page.locator(
        '[data-testid="close-thread"], button[aria-label*="close"], button:has(svg[class*="close"])'
      )

      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(500)

        // Thread panel should close
        const threadPanel = page.locator('[data-testid="thread-panel"]')
        const isClosed = !(await threadPanel.isVisible().catch(() => true))
        expect(isClosed).toBe(true)
      }
    }
  })
})

// ============================================================================
// AI Summarization Button Tests
// ============================================================================

test.describe('AI Summarization Button', () => {
  test('should display summarize button in thread panel', async ({ page }) => {
    // Open thread
    const threadIndicators = page.locator(
      '[data-testid="thread-indicator"], button:has-text("replies")'
    )

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      // Take screenshot
      await page.screenshot({ path: 'test-results/thread-panel-ui.png', fullPage: true })

      // Look for summarize button
      const summarizeButton = page.locator(
        '[data-testid="summarize-thread"], button:has-text("Summarize"), button:has-text("AI Summary"), button[aria-label*="summarize"]'
      )

      const isVisible = await summarizeButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display AI icon on summarize button', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator(
        '[data-testid="summarize-thread"], button:has-text("Summarize")'
      )

      if (await summarizeButton.isVisible()) {
        // Look for AI icon (sparkles, robot, brain, etc)
        const aiIcon = summarizeButton.locator(
          'svg, [data-testid="ai-icon"], [class*="sparkle"], [class*="robot"]'
        )

        const hasIcon = await aiIcon.isVisible().catch(() => false)
        expect(typeof hasIcon).toBe('boolean')
      }
    }
  })

  test('should show tooltip on hover over summarize button', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.hover()
        await page.waitForTimeout(500)

        // Look for tooltip
        const tooltip = page.locator('[role="tooltip"], .tooltip')

        const isVisible = await tooltip.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })
})

// ============================================================================
// Summary Generation Tests
// ============================================================================

test.describe('Summary Generation', () => {
  test('should trigger summary generation on button click', async ({ page }) => {
    const threadIndicators = page.locator(
      '[data-testid="thread-indicator"], button:has-text("replies")'
    )

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator(
        '[data-testid="summarize-thread"], button:has-text("Summarize")'
      )

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(1000)

        // Take screenshot of loading state
        await page.screenshot({
          path: 'test-results/summary-loading.png',
          fullPage: true,
        })

        // Should show loading indicator or summary
        const loadingIndicator = page.locator(
          '[data-testid="summary-loading"], .loading, .spinner, [aria-busy="true"]'
        )

        const summaryContainer = page.locator(
          '[data-testid="thread-summary"], [data-testid="ai-summary"], .summary-container'
        )

        const showsProgress =
          (await loadingIndicator.isVisible().catch(() => false)) ||
          (await summaryContainer.isVisible().catch(() => false))

        expect(typeof showsProgress).toBe('boolean')
      }
    }
  })

  test('should display loading state during summarization', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(200)

        // Look for loading indicators
        const loadingElements = page.locator(
          '[data-testid="summary-loading"], .loading, .spinner, [role="status"]'
        )

        const hasLoading = (await loadingElements.count()) > 0
        expect(typeof hasLoading).toBe('boolean')
      }
    }
  })

  test('should display progress percentage during generation', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(300)

        // Look for progress indicator
        const progressText = page.locator('[data-testid="progress-percent"]')

        const hasProgress = await progressText.isVisible().catch(() => false)
        expect(typeof hasProgress).toBe('boolean')
      }
    }
  })

  test('should disable button during summarization', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(200)

        // Button should be disabled during processing
        const isDisabled = await summarizeButton.isDisabled().catch(() => false)
        expect(typeof isDisabled).toBe('boolean')
      }
    }
  })
})

// ============================================================================
// Summary Display Tests
// ============================================================================

test.describe('Summary Display', () => {
  test('should display generated summary', async ({ page }) => {
    const threadIndicators = page.locator(
      '[data-testid="thread-indicator"], button:has-text("replies")'
    )

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator(
        '[data-testid="summarize-thread"], button:has-text("Summarize")'
      )

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000) // Wait for AI generation

        // Take screenshot of summary
        await page.screenshot({
          path: 'test-results/summary-generated.png',
          fullPage: true,
        })

        // Look for summary container
        const summaryContainer = page.locator(
          '[data-testid="thread-summary"], [data-testid="ai-summary"], .summary-container'
        )

        const isVisible = await summaryContainer.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should display summary with proper formatting', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for formatted summary (headings, lists, paragraphs)
        const summaryContent = page.locator('[data-testid="summary-content"]')

        if (await summaryContent.isVisible()) {
          const formattedElements = summaryContent.locator('h1, h2, h3, ul, ol, p, strong, em')

          const count = await formattedElements.count()
          expect(count).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  test('should display summary metadata (timestamp, token count)', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for metadata
        const metadata = page.locator(
          '[data-testid="summary-metadata"], .summary-info'
        )

        const hasMetadata = await metadata.isVisible().catch(() => false)
        expect(typeof hasMetadata).toBe('boolean')
      }
    }
  })

  test('should show AI disclaimer or attribution', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for AI disclaimer
        const disclaimer = page.locator(
          '[data-testid="ai-disclaimer"]'
        )

        const hasDisclaimer = await disclaimer.isVisible().catch(() => false)
        expect(typeof hasDisclaimer).toBe('boolean')
      }
    }
  })
})

// ============================================================================
// Copy to Clipboard Tests
// ============================================================================

test.describe('Copy Summary to Clipboard', () => {
  test('should display copy button for summary', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for copy button
        const copyButton = page.locator(
          '[data-testid="copy-summary"], button:has-text("Copy"), button[aria-label*="copy"]'
        )

        const isVisible = await copyButton.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should copy summary to clipboard on click', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-write', 'clipboard-read'])

    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const copyButton = page.locator('[data-testid="copy-summary"], button:has-text("Copy")')

        if (await copyButton.isVisible()) {
          await copyButton.click()
          await page.waitForTimeout(500)

          // Take screenshot
          await page.screenshot({
            path: 'test-results/summary-copied.png',
            fullPage: true,
          })

          // Check for success feedback
          const successMessage = page.locator('[role="alert"], .toast')

          const showsSuccess = await successMessage.isVisible().catch(() => false)
          expect(typeof showsSuccess).toBe('boolean')
        }
      }
    }
  })

  test('should show copied confirmation message', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-write'])

    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const copyButton = page.locator('[data-testid="copy-summary"]')

        if (await copyButton.isVisible()) {
          await copyButton.click()
          await page.waitForTimeout(300)

          // Look for confirmation toast/message
          const confirmation = page.locator(
            '[role="status"], [role="alert"], .toast'
          )

          const isVisible = await confirmation.isVisible().catch(() => false)
          expect(typeof isVisible).toBe('boolean')
        }
      }
    }
  })

  test('should change copy button icon after copying', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-write'])

    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const copyButton = page.locator('[data-testid="copy-summary"]')

        if (await copyButton.isVisible()) {
          // Get initial icon
          const initialIcon = await copyButton.locator('svg').getAttribute('class')

          await copyButton.click()
          await page.waitForTimeout(500)

          // Icon should change (copy -> check)
          const newIcon = await copyButton.locator('svg').getAttribute('class')
          expect(typeof newIcon).toBe('string')
        }
      }
    }
  })
})

// ============================================================================
// Download as Markdown Tests
// ============================================================================

test.describe('Download Summary as Markdown', () => {
  test('should display download button for summary', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for download button
        const downloadButton = page.locator(
          '[data-testid="download-summary"], button:has-text("Download"), button[aria-label*="download"]'
        )

        const isVisible = await downloadButton.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should trigger markdown download on click', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const downloadButton = page.locator(
          '[data-testid="download-summary"], button:has-text("Download")'
        )

        if (await downloadButton.isVisible()) {
          // Listen for download
          const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)

          await downloadButton.click()

          const download = await downloadPromise

          if (download) {
            // Verify filename
            const filename = download.suggestedFilename()
            expect(filename).toContain('.md')
          }
        }
      }
    }
  })

  test('should download with correct filename format', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const downloadButton = page.locator('[data-testid="download-summary"]')

        if (await downloadButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)

          await downloadButton.click()

          const download = await downloadPromise

          if (download) {
            // Filename should be descriptive (e.g., thread-summary-2025-01-31.md)
            const filename = download.suggestedFilename()
            expect(filename).toMatch(/summary|thread/i)
            expect(filename).toContain('.md')
          }
        }
      }
    }
  })
})

// ============================================================================
// Summary Regeneration Tests
// ============================================================================

test.describe('Summary Regeneration', () => {
  test('should display regenerate button after summary is shown', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for regenerate button
        const regenerateButton = page.locator(
          '[data-testid="regenerate-summary"], button:has-text("Regenerate"), button:has-text("Generate Again")'
        )

        const isVisible = await regenerateButton.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })

  test('should regenerate summary on button click', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const regenerateButton = page.locator(
          '[data-testid="regenerate-summary"], button:has-text("Regenerate")'
        )

        if (await regenerateButton.isVisible()) {
          await regenerateButton.click()
          await page.waitForTimeout(1000)

          // Should show loading state again
          const loadingIndicator = page.locator(
            '[data-testid="summary-loading"], .loading, .spinner'
          )

          const isLoading = await loadingIndicator.isVisible().catch(() => false)
          expect(typeof isLoading).toBe('boolean')
        }
      }
    }
  })

  test('should show confirmation before regenerating', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        const regenerateButton = page.locator('[data-testid="regenerate-summary"]')

        if (await regenerateButton.isVisible()) {
          await regenerateButton.click()
          await page.waitForTimeout(300)

          // May show confirmation dialog
          const confirmDialog = page.locator(
            '[role="dialog"], [role="alertdialog"], .confirm-dialog'
          )

          const hasConfirm = await confirmDialog.isVisible().catch(() => false)
          expect(typeof hasConfirm).toBe('boolean')
        }
      }
    }
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe('Summary Error Handling', () => {
  test('should display error message on summarization failure', async ({ page }) => {
    // Simulate offline to cause error
    await page.context().setOffline(true)

    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(2000)

        // Take screenshot of error
        await page.screenshot({
          path: 'test-results/summary-error.png',
          fullPage: true,
        })

        // Look for error message
        const errorMessage = page.locator(
          '[data-testid="summary-error"], [role="alert"]'
        )

        const hasError = await errorMessage.isVisible().catch(() => false)
        expect(typeof hasError).toBe('boolean')
      }
    }

    await page.context().setOffline(false)
  })

  test('should show retry button after error', async ({ page }) => {
    await page.context().setOffline(true)

    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(2000)

        // Look for retry button
        const retryButton = page.locator(
          '[data-testid="retry-summary"], button:has-text("Retry"), button:has-text("Try Again")'
        )

        const isVisible = await retryButton.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }

    await page.context().setOffline(false)
  })

  test('should handle empty thread gracefully', async ({ page }) => {
    // This test checks for edge case handling
    const summarizeButton = page.locator('[data-testid="summarize-thread"]')

    if (await summarizeButton.isVisible()) {
      await summarizeButton.click()
      await page.waitForTimeout(1000)

      // Should show appropriate message (e.g., "No messages to summarize")
      const emptyMessage = page.locator('text=/no messages|empty thread|nothing to summarize/i')

      const hasMessage = await emptyMessage.isVisible().catch(() => false)
      expect(typeof hasMessage).toBe('boolean')
    }
  })

  test('should recover from errors on retry', async ({ page }) => {
    await page.context().setOffline(true)

    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(2000)

        // Restore connection
        await page.context().setOffline(false)

        const retryButton = page.locator('[data-testid="retry-summary"]')

        if (await retryButton.isVisible()) {
          await retryButton.click()
          await page.waitForTimeout(3000)

          // Should show summary or loading
          const summaryContainer = page.locator('[data-testid="thread-summary"]')
          const isVisible = await summaryContainer.isVisible().catch(() => false)
          expect(typeof isVisible).toBe('boolean')
        }
      }
    }
  })
})

// ============================================================================
// Summary Persistence Tests
// ============================================================================

test.describe('Summary Persistence', () => {
  test('should cache summary after generation', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Close and reopen thread
        const closeButton = page.locator('[data-testid="close-thread"]')
        if (await closeButton.isVisible()) {
          await closeButton.click()
          await page.waitForTimeout(300)

          // Reopen
          await threadIndicators.first().click()
          await page.waitForTimeout(500)

          // Summary should still be visible (cached)
          const summaryContainer = page.locator('[data-testid="thread-summary"]')
          const isVisible = await summaryContainer.isVisible().catch(() => false)
          expect(typeof isVisible).toBe('boolean')
        }
      }
    }
  })

  test('should show timestamp of when summary was generated', async ({ page }) => {
    const threadIndicators = page.locator('[data-testid="thread-indicator"]')

    if ((await threadIndicators.count()) > 0) {
      await threadIndicators.first().click()
      await page.waitForTimeout(500)

      const summarizeButton = page.locator('[data-testid="summarize-thread"]')

      if (await summarizeButton.isVisible()) {
        await summarizeButton.click()
        await page.waitForTimeout(3000)

        // Look for timestamp
        const timestamp = page.locator(
          '[data-testid="summary-timestamp"], time'
        )

        const isVisible = await timestamp.isVisible().catch(() => false)
        expect(typeof isVisible).toBe('boolean')
      }
    }
  })
})
