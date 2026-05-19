/**
 * AI Summary Page Object Model
 *
 * Page object for AI summarization features
 */

import { Page, Locator } from '@playwright/test'

export class AISummaryPage {
  readonly page: Page
  readonly summarizeButton: Locator
  readonly summaryPanel: Locator
  readonly sentimentIndicator: Locator
  readonly downloadButton: Locator
  readonly digestPanel: Locator

  constructor(page: Page) {
    this.page = page
    this.summarizeButton = page.locator(
      'button:has-text("Summarize"), [data-testid="summarize-button"]'
    )
    this.summaryPanel = page.locator('[data-testid="summary-panel"], .summary-panel')
    this.sentimentIndicator = page.locator('[data-testid="sentiment"], .sentiment-indicator')
    this.downloadButton = page.locator(
      'button:has-text("Download"), [data-testid="download-summary"]'
    )
    this.digestPanel = page.locator('[data-testid="digest-panel"], .digest-panel')
  }

  async summarizeThread(messageIndex: number = 0) {
    // Hover over message to show actions
    const message = this.page.locator('[data-testid="message-item"]').nth(messageIndex)
    await message.hover()

    // Click reply to open thread
    const replyButton = this.page.locator(
      '[data-testid="reply-button"], button[aria-label*="reply"]'
    )
    await replyButton.first().click()
    await this.page.waitForTimeout(500)

    // Click summarize in thread panel
    const threadSummarize = this.page.locator(
      '.thread-panel button:has-text("Summarize"), [data-testid="thread-summarize"]'
    )
    await threadSummarize.click()
    await this.page.waitForTimeout(2000) // Wait for AI processing
  }

  async getSummaryText(): Promise<string> {
    const summaryText = this.page.locator('[data-testid="summary-text"], .summary-text')
    return (await summaryText.textContent()) || ''
  }

  async getSentiment(): Promise<string> {
    return (await this.sentimentIndicator.textContent()) || ''
  }

  async generateChannelDigest(channel: string, timeRange: '24h' | '7d' | '30d' = '24h') {
    // Navigate to channel
    await this.page.goto(`/chat/${channel}`)
    await this.page.waitForLoadState('load')

    // Open digest panel
    const digestButton = this.page.locator(
      'button:has-text("Digest"), [data-testid="channel-digest"]'
    )
    await digestButton.click()
    await this.page.waitForTimeout(300)

    // Select time range
    const timeRangeSelect = this.page.locator(
      `[data-testid="time-range"], select[name="timeRange"]`
    )
    await timeRangeSelect.selectOption(timeRange)

    // Generate
    const generateButton = this.page.locator(
      'button:has-text("Generate"), [data-testid="generate-digest"]'
    )
    await generateButton.click()
    await this.page.waitForTimeout(3000) // Wait for AI processing
  }

  async getDigestSections() {
    return this.page.locator('[data-testid="digest-section"], .digest-section')
  }

  async getKeyTopics(): Promise<string[]> {
    const topics = this.page.locator('[data-testid="key-topic"], .key-topic')
    const count = await topics.count()
    const topicTexts: string[] = []

    for (let i = 0; i < count; i++) {
      const text = await topics.nth(i).textContent()
      if (text) topicTexts.push(text)
    }

    return topicTexts
  }

  async downloadSummary(format: 'pdf' | 'txt' | 'md' = 'txt') {
    // Open download menu
    await this.downloadButton.click()
    await this.page.waitForTimeout(200)

    // Select format
    const formatOption = this.page.locator(
      `button:has-text("${format.toUpperCase()}"), [data-format="${format}"]`
    )
    await formatOption.click()

    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.waitForTimeout(500)

    return downloadPromise
  }

  async viewSentimentAnalysis() {
    const sentimentTab = this.page.locator(
      'button:has-text("Sentiment"), [data-testid="sentiment-tab"]'
    )
    await sentimentTab.click()
    await this.page.waitForTimeout(500)
  }

  async getSentimentMetrics(): Promise<{
    positive: number
    neutral: number
    negative: number
  }> {
    const positive = await this.page
      .locator('[data-testid="sentiment-positive"], .sentiment-positive')
      .textContent()
    const neutral = await this.page
      .locator('[data-testid="sentiment-neutral"], .sentiment-neutral')
      .textContent()
    const negative = await this.page
      .locator('[data-testid="sentiment-negative"], .sentiment-negative')
      .textContent()

    return {
      positive: parseInt(positive || '0'),
      neutral: parseInt(neutral || '0'),
      negative: parseInt(negative || '0'),
    }
  }

  async regenerateSummary() {
    const regenerateButton = this.page.locator(
      'button:has-text("Regenerate"), [data-testid="regenerate-summary"]'
    )
    await regenerateButton.click()
    await this.page.waitForTimeout(2000)
  }

  async shareSummary(shareWith: 'channel' | 'dm' | 'email') {
    const shareButton = this.page.locator('button:has-text("Share"), [data-testid="share-summary"]')
    await shareButton.click()
    await this.page.waitForTimeout(200)

    const shareOption = this.page.locator(
      `button:has-text("${shareWith}"), [data-share="${shareWith}"]`
    )
    await shareOption.click()
    await this.page.waitForTimeout(500)
  }

  async checkSummaryQuality(): Promise<'good' | 'fair' | 'poor'> {
    const qualityIndicator = this.page.locator('[data-testid="summary-quality"], .summary-quality')
    const quality = await qualityIndicator.getAttribute('data-quality')
    return (quality as 'good' | 'fair' | 'poor') || 'fair'
  }
}
