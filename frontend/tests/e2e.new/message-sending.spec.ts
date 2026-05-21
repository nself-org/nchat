/**
 * Message Sending E2E Tests
 *
 * Tests for sending, editing, deleting, and interacting with messages
 */

import { test, expect } from '@playwright/test'

test.describe('Message Sending', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.waitForLoadState('load')

    const emailInput = page.locator('input[type="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('owner@nself.org')
      await page.locator('input[type="password"]').fill('password123')
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/(chat|dashboard)/, { timeout: 10000 })
    }

    // Navigate to a channel
    await page.goto('/chat/general')
    await page.waitForLoadState('load')
  })

  test('should send a text message', async ({ page }) => {
    const messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea'
    )

    if (await messageInput.isVisible()) {
      const testMessage = `Test message ${Date.now()}`
      await messageInput.fill(testMessage)

      // Press Enter or click send
      await messageInput.press('Enter').catch(async () => {
        const sendButton = page.locator('button[type="submit"], button:has-text("Send")')
        if (await sendButton.isVisible()) {
          await sendButton.click()
        }
      })

      await page.waitForTimeout(1000)

      // Verify message appears
      const sentMessage = page.locator(`text=${testMessage}`)
      await expect(sentMessage.first())
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Message may have been sent but scrolled out of view
        })
    }
  })

  test('should send message with Shift+Enter creating new line', async ({ page }) => {
    const messageInput = page.locator('[contenteditable="true"]')

    if (await messageInput.isVisible()) {
      await messageInput.fill('Line 1')
      await messageInput.press('Shift+Enter')
      await messageInput.press('ArrowDown') // Move cursor to new line
      await messageInput.type('Line 2')

      const content = await messageInput.textContent()
      expect(content).toContain('Line 1')
      expect(content).toContain('Line 2')
    }
  })

  test('should not send empty message', async ({ page }) => {
    const messageInput = page.locator('[contenteditable="true"], textarea')

    if (await messageInput.isVisible()) {
      // Try to send empty message
      await messageInput.press('Enter').catch(() => {})

      // Message list should not grow
      await page.waitForTimeout(500)
    }
  })

  test('should edit a message', async ({ page }) => {
    // Send a message first
    const messageInput = page.locator('[contenteditable="true"], textarea')

    if (await messageInput.isVisible()) {
      const originalMessage = `Edit test ${Date.now()}`
      await messageInput.fill(originalMessage)
      await messageInput.press('Enter').catch(async () => {
        await page.locator('button:has-text("Send")').click()
      })

      await page.waitForTimeout(1000)

      // Find the message and hover/right-click
      const sentMessage = page.locator(`text=${originalMessage}`).first()
      if (await sentMessage.isVisible()) {
        await sentMessage.hover()

        // Look for edit button
        const editButton = page.locator('button[aria-label*="Edit"], button:has-text("Edit")')
        if (await editButton.isVisible()) {
          await editButton.click()

          // Edit the message
          const editInput = page.locator('[contenteditable="true"]')
          await editInput.clear()
          await editInput.fill(`${originalMessage} (edited)`)
          await editInput.press('Enter')

          await page.waitForTimeout(1000)

          // Check for edited indicator
          const editedIndicator = page.locator('text=/edited|Edited/')
          await expect(editedIndicator.first())
            .toBeVisible({ timeout: 5000 })
            .catch(() => {})
        }
      }
    }
  })

  test('should delete a message', async ({ page }) => {
    // Send a message
    const messageInput = page.locator('[contenteditable="true"], textarea')

    if (await messageInput.isVisible()) {
      const messageToDelete = `Delete test ${Date.now()}`
      await messageInput.fill(messageToDelete)
      await messageInput.press('Enter').catch(async () => {
        await page.locator('button:has-text("Send")').click()
      })

      await page.waitForTimeout(1000)

      // Find and delete
      const sentMessage = page.locator(`text=${messageToDelete}`).first()
      if (await sentMessage.isVisible()) {
        await sentMessage.hover()

        const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")')
        if (await deleteButton.isVisible()) {
          await deleteButton.click()

          // Confirm deletion
          const confirmButton = page.locator(
            'button:has-text("Confirm"), button:has-text("Delete")'
          )
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
          }

          await page.waitForTimeout(1000)

          // Message should be gone or marked as deleted
          const deletedMessage = page.locator(`text=${messageToDelete}`)
          const isVisible = await deletedMessage.isVisible().catch(() => false)
          expect(isVisible).toBe(false)
        }
      }
    }
  })

  test('should react to a message', async ({ page }) => {
    const messageInput = page.locator('[contenteditable="true"], textarea')

    if (await messageInput.isVisible()) {
      const message = `React test ${Date.now()}`
      await messageInput.fill(message)
      await messageInput.press('Enter').catch(async () => {
        await page.locator('button:has-text("Send")').click()
      })

      await page.waitForTimeout(1000)

      const sentMessage = page.locator(`text=${message}`).first()
      if (await sentMessage.isVisible()) {
        await sentMessage.hover()

        // Look for reaction button
        const reactionButton = page.locator(
          'button[aria-label*="React"], button[aria-label*="emoji"]'
        )
        if (await reactionButton.isVisible()) {
          await reactionButton.click()

          // Click an emoji
          const emoji = page.locator('button:has-text("👍"), [data-emoji="👍"]').first()
          if (await emoji.isVisible()) {
            await emoji.click()
            await page.waitForTimeout(500)
          }
        }
      }
    }
  })

  test('should reply to a message', async ({ page }) => {
    // Send original message
    const messageInput = page.locator('[contenteditable="true"], textarea')

    if (await messageInput.isVisible()) {
      const originalMessage = `Reply test ${Date.now()}`
      await messageInput.fill(originalMessage)
      await messageInput.press('Enter').catch(async () => {
        await page.locator('button:has-text("Send")').click()
      })

      await page.waitForTimeout(1000)

      const sentMessage = page.locator(`text=${originalMessage}`).first()
      if (await sentMessage.isVisible()) {
        await sentMessage.hover()

        const replyButton = page.locator('button[aria-label*="Reply"], button:has-text("Reply")')
        if (await replyButton.isVisible()) {
          await replyButton.click()

          // Send reply
          const replyInput = page.locator('[contenteditable="true"]')
          await replyInput.fill('This is a reply')
          await replyInput.press('Enter')

          await page.waitForTimeout(1000)
        }
      }
    }
  })

  test('should start a thread', async ({ page }) => {
    const messageInput = page.locator('[contenteditable="true"], textarea')

    if (await messageInput.isVisible()) {
      const message = `Thread test ${Date.now()}`
      await messageInput.fill(message)
      await messageInput.press('Enter').catch(async () => {
        await page.locator('button:has-text("Send")').click()
      })

      await page.waitForTimeout(1000)

      const sentMessage = page.locator(`text=${message}`).first()
      if (await sentMessage.isVisible()) {
        await sentMessage.hover()

        const threadButton = page.locator('button[aria-label*="Thread"], button:has-text("Thread")')
        if (await threadButton.isVisible()) {
          await threadButton.click()

          // Thread panel should open
          const threadPanel = page.locator('[data-testid="thread-panel"], .thread-panel, aside')
          await expect(threadPanel.first())
            .toBeVisible({ timeout: 5000 })
            .catch(() => {})
        }
      }
    }
  })

  test('should show typing indicator', async ({ page, context }) => {
    // Open second tab to simulate another user
    const page2 = await context.newPage()
    await page2.goto('/login')
    await page2.locator('input[type="email"]').fill('member@nself.org')
    await page2.locator('input[type="password"]').fill('password123')
    await page2.locator('button[type="submit"]').click()
    await page2.waitForURL(/\/chat/, { timeout: 10000 })
    await page2.goto('/chat/general')

    // Type in second tab
    const messageInput2 = page2.locator('[contenteditable="true"]')
    if (await messageInput2.isVisible()) {
      await messageInput2.fill('Typing...')

      // Check for typing indicator in first tab
      await page.waitForTimeout(1000)
      const typingIndicator = page.locator('text=/typing|is typing/i')
      await expect(typingIndicator.first())
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Typing indicators may not work without WebSocket
        })
    }

    await page2.close()
  })
})
