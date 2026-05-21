/**
 * Search Page Object Model
 *
 * Page object for semantic search and command palette
 */

import { Page, Locator } from '@playwright/test'

export class SearchPage {
  readonly page: Page
  readonly commandPalette: Locator
  readonly searchInput: Locator
  readonly searchResults: Locator
  readonly advancedFilters: Locator
  readonly searchHistory: Locator

  constructor(page: Page) {
    this.page = page
    this.commandPalette = page.locator(
      '[data-testid="command-palette"], [role="dialog"][aria-label*="search"]'
    )
    this.searchInput = page.locator(
      '[data-testid="search-input"], input[placeholder*="Search"], input[type="search"]'
    )
    this.searchResults = page.locator('[data-testid="search-results"], .search-results')
    this.advancedFilters = page.locator('[data-testid="advanced-filters"], .advanced-filters')
    this.searchHistory = page.locator('[data-testid="search-history"], .search-history')
  }

  async openCommandPalette() {
    // Open with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const isMac = await this.page.evaluate(() => navigator.platform.includes('Mac'))
    const modifier = isMac ? 'Meta' : 'Control'
    await this.page.keyboard.press(`${modifier}+KeyK`)
    await this.page.waitForTimeout(300)
  }

  async search(query: string, useNaturalLanguage: boolean = true) {
    // Open command palette
    await this.openCommandPalette()

    // Type search query
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Wait for debounce

    // Wait for results to load
    await this.page.waitForLoadState('load')
  }

  async selectResult(index: number = 0) {
    const results = this.page.locator('[data-testid="search-result-item"], .search-result-item')
    await results.nth(index).click()
    await this.page.waitForLoadState('load')
  }

  async navigateResultsWithKeyboard(direction: 'down' | 'up') {
    const key = direction === 'down' ? 'ArrowDown' : 'ArrowUp'
    await this.page.keyboard.press(key)
    await this.page.waitForTimeout(100)
  }

  async selectResultWithEnter() {
    await this.page.keyboard.press('Enter')
    await this.page.waitForLoadState('load')
  }

  async closeCommandPalette() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  async openAdvancedSearch() {
    await this.page.goto('/search')
    await this.page.waitForLoadState('load')
  }

  async applyFilter(filterName: string, value: string) {
    const filter = this.page.locator(
      `[data-testid="filter-${filterName}"], select[name="${filterName}"], input[name="${filterName}"]`
    )

    if ((await filter.getAttribute('type')) === 'select-one') {
      await filter.selectOption(value)
    } else {
      await filter.fill(value)
    }

    await this.page.waitForTimeout(300)
  }

  async setDateRange(from: string, to: string) {
    const fromInput = this.page.locator('[data-testid="date-from"], input[name="from"]')
    const toInput = this.page.locator('[data-testid="date-to"], input[name="to"]')

    await fromInput.fill(from)
    await toInput.fill(to)
    await this.page.waitForTimeout(300)
  }

  async saveSearch(name: string) {
    const saveButton = this.page.locator('button:has-text("Save"), [data-testid="save-search"]')
    await saveButton.click()

    const nameInput = this.page.locator('input[placeholder*="name"], [data-testid="search-name"]')
    await nameInput.fill(name)

    const confirmButton = this.page.locator('button:has-text("Save"), button:has-text("Confirm")')
    await confirmButton.last().click()
    await this.page.waitForTimeout(500)
  }

  async loadSavedSearch(name: string) {
    await this.page.goto('/search')
    await this.page.waitForLoadState('load')

    const savedSearch = this.page.locator(`[data-testid="saved-search"]:has-text("${name}")`)
    await savedSearch.click()
    await this.page.waitForTimeout(500)
  }

  async getResultCount(): Promise<number> {
    const countText = await this.page
      .locator('[data-testid="result-count"], .result-count')
      .textContent()

    const match = countText?.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async getSearchSuggestions() {
    return this.page.locator('[data-testid="search-suggestion"], .search-suggestion')
  }
}
