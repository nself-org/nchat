/**
 * Chat Page Object Model
 *
 * Page object for chat interface interactions
 */

import { Page, Locator, expect } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator
  readonly channelList: Locator
  readonly threadPanel: Locator
  readonly userMenu: Locator

  constructor(page: Page) {
    this.page = page
    this.messageInput = page.locator(
      '[data-testid="message-input"], [contenteditable="true"], textarea, .ProseMirror'
    )
    this.sendButton = page.locator('[data-testid="send-button"], button[aria-label*="send"]')
    this.messageList = page.locator('[data-testid="message-list"], .message-list, [role="log"]')
    this.channelList = page.locator('[data-testid="channel-list"], .channel-list, aside')
    this.threadPanel = page.locator('[data-testid="thread-panel"], .thread-panel')
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu')
  }

  async goto(channel?: string) {
    const url = channel ? `/chat/${channel}` : '/chat'
    await this.page.goto(url)
    await this.page.waitForLoadState('load')
  }

  async sendMessage(text: string) {
    await this.messageInput.first().click()
    await this.page.keyboard.type(text)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(500)
  }

  async getMessage(text: string): Promise<Locator> {
    return this.page.locator(`[data-testid="message-item"]:has-text("${text}")`)
  }

  async getMessageByIndex(index: number): Promise<Locator> {
    return this.page.locator('[data-testid="message-item"]').nth(index)
  }

  async selectChannel(channelName: string) {
    const channel = this.page.locator(`[data-testid="channel-item"]:has-text("${channelName}")`)
    await channel.click()
    await this.page.waitForLoadState('load')
  }

  async openThread(messageIndex: number = 0) {
    const message = await this.getMessageByIndex(messageIndex)
    await message.hover()

    const replyButton = this.page.locator(
      '[data-testid="reply-button"], button[aria-label*="reply"]'
    )
    await replyButton.first().click()
    await this.page.waitForTimeout(500)
  }

  async waitForMessages(count: number = 1) {
    await expect(this.page.locator('[data-testid="message-item"]')).toHaveCount(count, {
      timeout: 5000,
    })
  }
}
