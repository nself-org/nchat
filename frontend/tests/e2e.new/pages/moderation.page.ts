/**
 * Moderation Page Object Model
 *
 * Page object for moderation queue and actions
 */

import { Page, Locator } from '@playwright/test'

export class ModerationPage {
  readonly page: Page
  readonly queueList: Locator
  readonly filterButtons: Locator
  readonly actionButtons: Locator
  readonly statsCards: Locator
  readonly settingsPanel: Locator

  constructor(page: Page) {
    this.page = page
    this.queueList = page.locator('[data-testid="moderation-queue"], .moderation-queue')
    this.filterButtons = page.locator('[data-testid="moderation-filter"], .filter-button')
    this.actionButtons = page.locator('[data-testid="moderation-action"], .action-button')
    this.statsCards = page.locator('[data-testid="stat-card"], .stat-card')
    this.settingsPanel = page.locator('[data-testid="moderation-settings"], .moderation-settings')
  }

  async goto() {
    await this.page.goto('/admin/moderation')
    await this.page.waitForLoadState('load')
  }

  async getQueueItems() {
    return this.page.locator('[data-testid="queue-item"], .queue-item')
  }

  async filterByType(type: 'spam' | 'toxicity' | 'all') {
    const filterButton = this.page.locator(`button:has-text("${type}"), [data-filter="${type}"]`)
    await filterButton.first().click()
    await this.page.waitForTimeout(500)
  }

  async reviewItem(index: number = 0) {
    const items = await this.getQueueItems()
    await items.nth(index).click()
    await this.page.waitForTimeout(300)
  }

  async takeAction(action: 'approve' | 'delete' | 'warn' | 'ban') {
    const actionButton = this.page.locator(
      `button:has-text("${action}"), [data-action="${action}"]`
    )
    await actionButton.first().click()

    // Handle confirmation if needed
    const confirmButton = this.page.locator('button:has-text("Confirm"), [data-testid="confirm"]')
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await confirmButton.click()
    }

    await this.page.waitForTimeout(500)
  }

  async getStatValue(statName: string): Promise<string> {
    const stat = this.page.locator(
      `[data-testid="stat-${statName}"], .stat:has-text("${statName}")`
    )
    return stat.textContent() || ''
  }

  async toggleAutoModeration(enabled: boolean) {
    await this.page.goto('/admin/moderation/settings')
    await this.page.waitForLoadState('load')

    const toggle = this.page.locator(
      '[data-testid="auto-moderation-toggle"], input[type="checkbox"][name*="auto"]'
    )

    const isChecked = await toggle.isChecked()
    if (isChecked !== enabled) {
      await toggle.click()
      await this.page.waitForTimeout(500)
    }
  }

  async setContentThreshold(type: 'spam' | 'toxicity', value: number) {
    await this.page.goto('/admin/moderation/settings')
    await this.page.waitForLoadState('load')

    const slider = this.page.locator(`[data-testid="${type}-threshold"], input[name*="${type}"]`)
    await slider.fill(value.toString())
    await this.page.waitForTimeout(300)
  }
}
