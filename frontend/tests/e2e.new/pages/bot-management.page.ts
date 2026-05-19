/**
 * Bot Management Page Object Model
 *
 * Page object for bot creation, editing, and testing
 */

import { Page, Locator } from '@playwright/test'

export class BotManagementPage {
  readonly page: Page
  readonly botList: Locator
  readonly createButton: Locator
  readonly templateSelector: Locator
  readonly codeEditor: Locator
  readonly testPanel: Locator
  readonly analyticsPanel: Locator

  constructor(page: Page) {
    this.page = page
    this.botList = page.locator('[data-testid="bot-list"], .bot-list')
    this.createButton = page.locator('button:has-text("Create Bot"), [data-testid="create-bot"]')
    this.templateSelector = page.locator(
      '[data-testid="template-selector"], select[name="template"]'
    )
    this.codeEditor = page.locator(
      '[data-testid="code-editor"], .monaco-editor, textarea[name="code"]'
    )
    this.testPanel = page.locator('[data-testid="test-panel"], .test-panel')
    this.analyticsPanel = page.locator('[data-testid="analytics-panel"], .analytics-panel')
  }

  async goto() {
    await this.page.goto('/admin/bots/manage')
    await this.page.waitForLoadState('load')
  }

  async createBot(name: string) {
    await this.createButton.click()
    await this.page.waitForTimeout(300)

    const nameInput = this.page.locator('input[name="name"], [data-testid="bot-name"]')
    await nameInput.fill(name)

    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create")')
    await submitButton.click()
    await this.page.waitForLoadState('load')
  }

  async createBotFromTemplate(name: string, template: string) {
    await this.createButton.click()
    await this.page.waitForTimeout(300)

    // Select template
    const templateOption = this.page.locator(
      `[data-testid="template-${template}"], [data-template="${template}"]`
    )
    await templateOption.click()
    await this.page.waitForTimeout(300)

    // Fill in bot name
    const nameInput = this.page.locator('input[name="name"], [data-testid="bot-name"]')
    await nameInput.fill(name)

    // Submit
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create")')
    await submitButton.click()
    await this.page.waitForLoadState('load')
  }

  async selectBot(botName: string) {
    const bot = this.page.locator(`[data-testid="bot-item"]:has-text("${botName}")`)
    await bot.click()
    await this.page.waitForLoadState('load')
  }

  async editBotCode(code: string) {
    // Click into code editor
    await this.codeEditor.click()

    // Clear existing code
    await this.page.keyboard.press('Control+A')
    await this.page.keyboard.press('Backspace')

    // Type new code
    await this.page.keyboard.type(code)
    await this.page.waitForTimeout(500)
  }

  async saveBotCode() {
    const saveButton = this.page.locator('button:has-text("Save"), [data-testid="save-bot"]')
    await saveButton.click()
    await this.page.waitForTimeout(500)
  }

  async testBot(testMessage: string) {
    // Open test panel if not already open
    const testButton = this.page.locator('button:has-text("Test"), [data-testid="test-bot"]')
    await testButton.click()
    await this.page.waitForTimeout(300)

    // Enter test message
    const testInput = this.page.locator(
      '[data-testid="test-input"], input[placeholder*="test"], textarea[placeholder*="test"]'
    )
    await testInput.fill(testMessage)

    // Send test
    const sendButton = this.page.locator('[data-testid="send-test"], button:has-text("Send")')
    await sendButton.click()
    await this.page.waitForTimeout(1000)
  }

  async getBotResponse(): Promise<string> {
    const response = this.page.locator('[data-testid="bot-response"], .bot-response')
    return (await response.textContent()) || ''
  }

  async viewAnalytics(botName: string) {
    await this.selectBot(botName)

    const analyticsTab = this.page.locator(
      'button:has-text("Analytics"), [data-testid="analytics-tab"]'
    )
    await analyticsTab.click()
    await this.page.waitForLoadState('load')
  }

  async getAnalyticMetric(metric: 'calls' | 'errors' | 'responseTime'): Promise<string> {
    const metricElement = this.page.locator(`[data-testid="metric-${metric}"], .metric-${metric}`)
    return (await metricElement.textContent()) || '0'
  }

  async toggleBotStatus(enabled: boolean) {
    const toggle = this.page.locator(
      '[data-testid="bot-enabled-toggle"], input[type="checkbox"][name="enabled"]'
    )

    const isChecked = await toggle.isChecked()
    if (isChecked !== enabled) {
      await toggle.click()
      await this.page.waitForTimeout(500)
    }
  }

  async deleteBot(botName: string, confirm: boolean = false) {
    await this.selectBot(botName)

    const deleteButton = this.page.locator('button:has-text("Delete"), [data-testid="delete-bot"]')
    await deleteButton.click()
    await this.page.waitForTimeout(300)

    if (confirm) {
      const confirmButton = this.page.locator(
        'button:has-text("Confirm"), button:has-text("Delete")'
      )
      await confirmButton.last().click()
      await this.page.waitForTimeout(500)
    } else {
      const cancelButton = this.page.locator('button:has-text("Cancel")')
      await cancelButton.click()
    }
  }

  async getBotList() {
    return this.page.locator('[data-testid="bot-item"], .bot-item')
  }

  async configureTriggers(triggers: string[]) {
    const triggersInput = this.page.locator('[data-testid="bot-triggers"], input[name="triggers"]')
    await triggersInput.fill(triggers.join(', '))
    await this.page.waitForTimeout(300)
  }

  async setPermissions(role: string) {
    const roleSelect = this.page.locator(
      '[data-testid="bot-permissions"], select[name="permissions"]'
    )
    await roleSelect.selectOption(role)
    await this.page.waitForTimeout(300)
  }
}
