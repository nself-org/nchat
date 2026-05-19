/**
 * Test Fixtures
 *
 * Reusable test fixtures for E2E tests following Playwright best practices.
 */

import { test as base, expect } from '@playwright/test'
import { CallPage, WalletPage, AdvancedMessagingPage, SettingsPage } from './page-objects'

// =============================================================================
// Test User Data
// =============================================================================

export const TEST_USERS = {
  owner: {
    email: 'owner@nself.org',
    password: 'password123',
    role: 'owner',
    displayName: 'Owner User',
  },
  admin: {
    email: 'admin@nself.org',
    password: 'password123',
    role: 'admin',
    displayName: 'Admin User',
  },
  moderator: {
    email: 'moderator@nself.org',
    password: 'password123',
    role: 'moderator',
    displayName: 'Moderator User',
  },
  member: {
    email: 'member@nself.org',
    password: 'password123',
    role: 'member',
    displayName: 'Member User',
  },
  alice: {
    email: 'alice@nself.org',
    password: 'password123',
    role: 'member',
    displayName: 'Alice',
  },
  bob: {
    email: 'bob@nself.org',
    password: 'password123',
    role: 'member',
    displayName: 'Bob',
  },
} as const

// =============================================================================
// Test Wallet Data
// =============================================================================

export const TEST_WALLET_DATA = {
  addresses: {
    valid: '0x742d35Cc6634C0532925a3b844Bc7e7595f42aE0',
    secondary: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    invalid: 'invalid-address-123',
  },
  chains: {
    ethereum: { id: '0x1', name: 'Ethereum Mainnet' },
    polygon: { id: '0x89', name: 'Polygon Mainnet' },
    sepolia: { id: '0xaa36a7', name: 'Sepolia Testnet' },
  },
  amounts: {
    small: '0.001',
    medium: '0.01',
    large: '0.1',
  },
} as const

// =============================================================================
// Test Messages Data
// =============================================================================

export const TEST_MESSAGES = {
  simple: 'Hello, this is a test message',
  withLink: 'Check out this link: https://example.com',
  withMention: '@alice can you review this?',
  longMessage: 'This is a very long message '.repeat(10),
  withEmoji: 'Hello 👋 World 🌍',
  codeBlock: '```javascript\nconsole.log("Hello World");\n```',
} as const

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Login helper
 */
export async function login(page: any, user: keyof typeof TEST_USERS) {
  const userData = TEST_USERS[user]

  await page.goto('/login')
  await page.waitForLoadState('load')

  // Check if already logged in
  const isOnChat = page.url().includes('/chat')
  if (isOnChat) return

  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const isLoginPage = await emailInput.isVisible()

  if (isLoginPage) {
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await emailInput.fill(userData.email)
    await passwordInput.fill(userData.password)
    await submitButton.click()

    await page.waitForURL(/\/(chat|dashboard)/, { timeout: 10000 }).catch(() => {
      // May already be on the page
    })
  }
}

/**
 * Logout helper
 */
export async function logout(page: any) {
  await page.goto('/chat')
  await page.waitForLoadState('load')

  const logoutButton = page.locator(
    'button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"]'
  )

  const userMenu = page.locator('[data-testid="user-menu"]')
  if (await userMenu.isVisible()) {
    await userMenu.click()
  }

  if (await logoutButton.isVisible()) {
    await logoutButton.click()
    await page.waitForURL(/\/(login|$)/, { timeout: 10000 })
  }
}

/**
 * Navigate to chat channel
 */
export async function navigateToChannel(page: any, channelName: string) {
  await page.goto('/chat')
  await page.waitForLoadState('load')

  const channelLink = page.locator(`a[href*="/chat/${channelName}"]`)
  if (await channelLink.isVisible()) {
    await channelLink.click()
    await page.waitForLoadState('load')
  }
}

/**
 * Navigate to direct message
 */
export async function navigateToDM(page: any, userName: string) {
  await page.goto('/chat')
  await page.waitForLoadState('load')

  const dmLink = page.locator(`a[href*="/chat/dm/"]:has-text("${userName}")`)
  if (await dmLink.isVisible()) {
    await dmLink.click()
    await page.waitForLoadState('load')
  }
}

/**
 * Send a message
 */
export async function sendMessage(page: any, message: string) {
  const messageInput = page.locator('[data-testid="message-input"], [contenteditable="true"]')
  const sendButton = page.locator('[data-testid="send-message-button"], button[type="submit"]')

  await messageInput.fill(message)
  await sendButton.click()
  await page.waitForTimeout(500)
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: any, message?: string) {
  const toast = page.locator('[data-testid="toast"], [role="alert"]')
  await expect(toast).toBeVisible({ timeout: 5000 })

  if (message) {
    await expect(toast).toContainText(message)
  }

  return toast
}

/**
 * Grant browser permissions (for media/notifications)
 */
export async function grantPermissions(context: any, permissions: string[]) {
  await context.grantPermissions(permissions)
}

/**
 * Mock MetaMask provider
 */
export async function mockMetaMaskProvider(page: any) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }: any) => {
        if (method === 'eth_requestAccounts') {
          return ['0x742d35Cc6634C0532925a3b844Bc7e7595f42aE0']
        }
        if (method === 'eth_accounts') {
          return ['0x742d35Cc6634C0532925a3b844Bc7e7595f42aE0']
        }
        if (method === 'eth_chainId') {
          return '0x1'
        }
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
  })
}

// =============================================================================
// Extended Test with Fixtures
// =============================================================================

type TestFixtures = {
  callPage: CallPage
  walletPage: WalletPage
  messagingPage: AdvancedMessagingPage
  settingsPage: SettingsPage
  authenticatedPage: any
  loggedInUser: keyof typeof TEST_USERS
}

export const test = base.extend<TestFixtures>({
  callPage: async ({ page }, use) => {
    const callPage = new CallPage(page)
    await use(callPage)
  },

  walletPage: async ({ page }, use) => {
    const walletPage = new WalletPage(page)
    await use(walletPage)
  },

  messagingPage: async ({ page }, use) => {
    const messagingPage = new AdvancedMessagingPage(page)
    await use(messagingPage)
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page)
    await use(settingsPage)
  },

  authenticatedPage: async ({ page }, use) => {
    // Auto-login as owner for authenticated tests
    await login(page, 'owner')
    await use(page)
    // Logout after test
    await logout(page).catch(() => {
      // Ignore logout errors
    })
  },

  loggedInUser: ['owner', { option: true }],
})

export { expect }
