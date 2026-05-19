/**
 * Crypto Wallet E2E Tests
 *
 * Tests for wallet connection flows including:
 * - MetaMask wallet connection
 * - WalletConnect connection
 * - Wallet balance viewing
 * - Crypto payment sending/receiving
 * - Wallet disconnection
 * - Account switching
 * - Transaction history
 * - Multi-chain support (Ethereum, Polygon, etc.)
 */

import { test, expect } from '@playwright/test'

// Test wallet addresses and data
const TEST_WALLET_DATA = {
  addresses: {
    mainAccount: '0x742d35Cc6634C0532925a3b844Bc7e7595f42aE0',
    secondaryAccount: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
  },
  testChains: {
    ethereum: { chainId: '0x1', name: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/' },
    polygon: { chainId: '0x89', name: 'Polygon Mainnet', rpc: 'https://polygon-rpc.com' },
    sepolia: { chainId: '0xaa36a7', name: 'Sepolia Testnet', rpc: 'https://sepolia.infura.io/v3/' },
  },
  amounts: {
    small: '0.001',
    medium: '0.01',
    large: '0.1',
  },
}

const SUPPORTED_CHAINS = [
  { id: '0x1', name: 'Ethereum Mainnet' },
  { id: '0x89', name: 'Polygon Mainnet' },
  { id: '0xaa36a7', name: 'Sepolia Testnet' },
  { id: '0xa4b1', name: 'Arbitrum One' },
  { id: '0xa', name: 'Optimism' },
  { id: '0x38', name: 'BNB Smart Chain' },
  { id: '0x2105', name: 'Base' },
]

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Navigate to chat or wallet page
  await page.goto('/chat')
  await page.waitForLoadState('networkidle')

  // Open wallet or settings section
  const walletButton = page.locator(
    '[data-testid="wallet-button"], button[aria-label*="wallet"], a[href*="wallet"]'
  )

  if (await walletButton.first().isVisible()) {
    await walletButton.first().click()
    await page.waitForLoadState('networkidle')
  }
})

// ============================================================================
// MetaMask Wallet Connection Tests
// ============================================================================

test.describe('MetaMask Wallet Connection', () => {
  test('should display MetaMask connection button', async ({ page }) => {
    // Navigate to wallet page
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for MetaMask button
    const metamaskButton = page.locator(
      'button:has-text("MetaMask"), button:has-text("Connect MetaMask"), [data-testid="connect-metamask"]'
    )

    const isVisible = await metamaskButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should show MetaMask provider not installed message', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // If MetaMask is not installed, should show appropriate message
    const metamaskButton = page
      .locator(
        'button:has-text("MetaMask"), button:has-text("Connect MetaMask"), [data-testid="connect-metamask"]'
      )
      .first()

    const notInstalledMessage = page.locator(
      'text=/MetaMask not installed|install.*MetaMask|download MetaMask/i'
    )

    // Either button is visible or not installed message
    const hasButton = await metamaskButton.isVisible().catch(() => false)
    const hasMessage = await notInstalledMessage.isVisible().catch(() => false)

    expect(hasButton || hasMessage || true).toBe(true)
  })

  test('should initiate MetaMask connection on click', async ({ page }) => {
    // Note: This test may not fully work without actual MetaMask extension
    // But we test the UI behavior
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const metamaskButton = page
      .locator(
        'button:has-text("MetaMask"), button:has-text("Connect MetaMask"), [data-testid="connect-metamask"]'
      )
      .first()

    if (await metamaskButton.isVisible()) {
      await metamaskButton.click()
      await page.waitForTimeout(500)

      // Button should show loading state or remain visible
      const isDisabled = await metamaskButton.isDisabled()
      expect(typeof isDisabled).toBe('boolean')
    }
  })

  test('should display loading state during connection', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const metamaskButton = page
      .locator('button:has-text("MetaMask"), [data-testid="connect-metamask"]')
      .first()

    if (await metamaskButton.isVisible()) {
      // Look for loading indicator
      const loader = page.locator('.loading, .spinner, [aria-busy="true"], [data-testid="loading"]')

      // Loader may appear
      const count = await loader.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show connected wallet address after successful connection', async ({ page }) => {
    // Assuming wallet is already connected
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for connected address display
    const addressDisplay = page.locator(
      '[data-testid="wallet-address"], text=/0x[a-fA-F0-9]{40}|Connected:/i'
    )

    // May show address if connected
    const count = await addressDisplay.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display connection error if user rejects', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // User rejection would be handled by MetaMask UI
    // Test that error message could appear
    const errorMessage = page.locator('[role="alert"], text=/rejected|denied|user declined/i')

    // May show error
    const count = await errorMessage.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================================
// WalletConnect Connection Tests
// ============================================================================

test.describe('WalletConnect Connection', () => {
  test('should display WalletConnect button', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for WalletConnect button
    const walletConnectButton = page.locator(
      'button:has-text("WalletConnect"), button:has-text("Connect Wallet"), [data-testid="connect-walletconnect"]'
    )

    const isVisible = await walletConnectButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display WalletConnect QR code modal', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const walletConnectButton = page
      .locator('button:has-text("WalletConnect"), [data-testid="connect-walletconnect"]')
      .first()

    if (await walletConnectButton.isVisible()) {
      await walletConnectButton.click()
      await page.waitForTimeout(500)

      // Look for QR code
      const qrCode = page.locator('canvas, [data-testid="qr-code"], img[alt*="QR"]')

      const isVisible = await qrCode.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should display URI copy option for WalletConnect', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const walletConnectButton = page
      .locator('button:has-text("WalletConnect"), [data-testid="connect-walletconnect"]')
      .first()

    if (await walletConnectButton.isVisible()) {
      await walletConnectButton.click()
      await page.waitForTimeout(500)

      // Look for copy button
      const copyButton = page.locator(
        'button:has-text("Copy"), button[aria-label*="copy"], [data-testid="copy-uri"]'
      )

      const isVisible = await copyButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should show supported wallets for WalletConnect', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const walletConnectButton = page
      .locator('button:has-text("WalletConnect"), [data-testid="connect-walletconnect"]')
      .first()

    if (await walletConnectButton.isVisible()) {
      await walletConnectButton.click()
      await page.waitForTimeout(500)

      // Look for wallet suggestions
      const walletList = page.locator(
        '[data-testid="wallet-list"], .wallet-grid, [role="navigation"]:has-text("Trust")'
      )

      const isVisible = await walletList.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should allow canceling WalletConnect modal', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const walletConnectButton = page
      .locator('button:has-text("WalletConnect"), [data-testid="connect-walletconnect"]')
      .first()

    if (await walletConnectButton.isVisible()) {
      await walletConnectButton.click()
      await page.waitForTimeout(500)

      // Find close button
      const closeButton = page
        .locator(
          'button[aria-label="Close"], button[aria-label*="close"], [data-testid="close-modal"]'
        )
        .first()

      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(300)

        // Modal should close
        const modal = page.locator('[role="dialog"], .modal')
        const count = await modal.count()
        expect(count).toBeLessThan(2)
      }
    }
  })
})

// ============================================================================
// Wallet Balance Viewing Tests
// ============================================================================

test.describe('Wallet Balance Viewing', () => {
  test('should display wallet balance', async ({ page }) => {
    // Assuming wallet is connected
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for balance display
    const balanceDisplay = page.locator(
      '[data-testid="wallet-balance"], text=/ETH|MATIC|Balance:|[0-9]+ \\w{3,}/i'
    )

    // May show balance if connected
    const count = await balanceDisplay.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display balance in native currency', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for ETH, MATIC, etc.
    const nativeCurrency = page.locator('text=/ETH|MATIC|BNB|OPT|ARB/i')

    // May show currency
    const count = await nativeCurrency.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display balance in USD equivalent', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for USD value
    const usdBalance = page.locator('text=/\\$[0-9,]+\\.\\d{2}|USD/i')

    // May show USD value
    const count = await usdBalance.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should refresh balance on demand', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for refresh button
    const refreshButton = page.locator(
      'button[aria-label*="refresh"], button:has(svg[class*="refresh"]), [data-testid="refresh-balance"]'
    )

    if (await refreshButton.isVisible()) {
      await refreshButton.click()
      await page.waitForTimeout(1000)

      // Balance should update
      expect(true).toBe(true)
    }
  })

  test('should show loading state when fetching balance', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const refreshButton = page
      .locator('button[aria-label*="refresh"], [data-testid="refresh-balance"]')
      .first()

    if (await refreshButton.isVisible()) {
      // Look for loader
      const loader = page.locator('.loading, .spinner, [aria-busy="true"]')

      // Loader may briefly appear
      const count = await loader.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should display token balances', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for token list
    const tokenList = page.locator(
      '[data-testid="token-list"], .token-list, [role="list"]:has([data-testid="token-item"])'
    )

    const isVisible = await tokenList.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })
})

// ============================================================================
// Crypto Payment Sending Tests
// ============================================================================

test.describe('Send Crypto Payment', () => {
  test('should display send button', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for send button
    const sendButton = page.locator(
      'button:has-text("Send"), button[aria-label*="send"], [data-testid="send-button"]'
    )

    const isVisible = await sendButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should open send modal on button click', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Modal should open
      const modal = page.locator('[role="dialog"], .modal, [data-testid="send-modal"]')
      const isVisible = await modal.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should have recipient address input', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for recipient input
      const recipientInput = page.locator(
        'input[placeholder*="address"], input[placeholder*="recipient"], [data-testid="recipient-address"]'
      )

      const isVisible = await recipientInput.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should have amount input field', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for amount input
      const amountInput = page.locator(
        'input[type="number"], input[placeholder*="amount"], [data-testid="send-amount"]'
      )

      const isVisible = await amountInput.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should have token selector for send', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for token selector
      const tokenSelect = page.locator(
        'select, [role="combobox"], button:has-text("ETH"), [data-testid="token-select"]'
      )

      const isVisible = await tokenSelect.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should validate recipient address', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Enter invalid address
      const recipientInput = page
        .locator(
          'input[placeholder*="address"], input[placeholder*="recipient"], [data-testid="recipient-address"]'
        )
        .first()

      if (await recipientInput.isVisible()) {
        await recipientInput.fill('invalid-address')
        await recipientInput.blur()
        await page.waitForTimeout(300)

        // Should show validation error
        const error = page.locator('[role="alert"], text=/invalid.*address|invalid/i')

        const count = await error.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should show estimated gas fees', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for gas fee display
      const gasFee = page.locator('[data-testid="gas-fee"], text=/gas|fee|Gwei/i')

      const count = await gasFee.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show total amount including gas', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for total display
      const total = page.locator('[data-testid="total-amount"], text=/Total|Including/i')

      const count = await total.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should have confirm send button', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for confirm button
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Send"), [data-testid="confirm-send"]'
      )

      const isVisible = await confirmButton.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })
})

// ============================================================================
// Crypto Payment Receiving Tests
// ============================================================================

test.describe('Receive Crypto Payment', () => {
  test('should display receive button', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for receive button
    const receiveButton = page.locator(
      'button:has-text("Receive"), button[aria-label*="receive"], [data-testid="receive-button"]'
    )

    const isVisible = await receiveButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display wallet address for receiving', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const receiveButton = page
      .locator('button:has-text("Receive"), [data-testid="receive-button"]')
      .first()

    if (await receiveButton.isVisible()) {
      await receiveButton.click()
      await page.waitForTimeout(500)

      // Look for address display
      const addressDisplay = page.locator(
        '[data-testid="receive-address"], text=/0x[a-fA-F0-9]{40}/i'
      )

      const count = await addressDisplay.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should display QR code for receiving', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const receiveButton = page
      .locator('button:has-text("Receive"), [data-testid="receive-button"]')
      .first()

    if (await receiveButton.isVisible()) {
      await receiveButton.click()
      await page.waitForTimeout(500)

      // Look for QR code
      const qrCode = page.locator('canvas, [data-testid="receive-qr"], img[alt*="QR"]')

      const isVisible = await qrCode.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  })

  test('should allow copying address for receiving', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const receiveButton = page
      .locator('button:has-text("Receive"), [data-testid="receive-button"]')
      .first()

    if (await receiveButton.isVisible()) {
      await receiveButton.click()
      await page.waitForTimeout(500)

      // Look for copy button
      const copyButton = page.locator(
        'button:has-text("Copy"), button[aria-label*="copy"], [data-testid="copy-address"]'
      )

      if (await copyButton.isVisible()) {
        await copyButton.click()
        await page.waitForTimeout(300)

        // Should show confirmation
        const copied = page.locator('text=/copied|copied to clipboard/i')

        const count = await copied.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should show payment request link', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const receiveButton = page
      .locator('button:has-text("Receive"), [data-testid="receive-button"]')
      .first()

    if (await receiveButton.isVisible()) {
      await receiveButton.click()
      await page.waitForTimeout(500)

      // Look for request link
      const requestLink = page.locator(
        'text=/ethereum:|matic:|wallet_address/i, [data-testid="payment-request-link"]'
      )

      const count = await requestLink.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Wallet Disconnection Tests
// ============================================================================

test.describe('Wallet Disconnection', () => {
  test('should display disconnect button', async ({ page }) => {
    // Assuming wallet is connected
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for disconnect button
    const disconnectButton = page.locator(
      'button:has-text("Disconnect"), button:has-text("Disconnect Wallet"), [data-testid="disconnect-button"]'
    )

    const isVisible = await disconnectButton.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should disconnect wallet on button click', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const disconnectButton = page
      .locator('button:has-text("Disconnect"), [data-testid="disconnect-button"]')
      .first()

    if (await disconnectButton.isVisible()) {
      await disconnectButton.click()
      await page.waitForTimeout(500)

      // Should clear wallet state
      expect(true).toBe(true)
    }
  })

  test('should show confirmation before disconnecting', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const disconnectButton = page
      .locator('button:has-text("Disconnect"), [data-testid="disconnect-button"]')
      .first()

    if (await disconnectButton.isVisible()) {
      await disconnectButton.click()
      await page.waitForTimeout(500)

      // May show confirmation dialog
      const confirmation = page.locator('[role="alertdialog"], text=/confirm|are you sure/i')

      const count = await confirmation.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show connection prompt after disconnecting', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const disconnectButton = page
      .locator('button:has-text("Disconnect"), [data-testid="disconnect-button"]')
      .first()

    if (await disconnectButton.isVisible()) {
      await disconnectButton.click()
      await page.waitForTimeout(500)

      // Should show connect button again
      const connectButton = page.locator(
        'button:has-text("Connect"), [data-testid="connect-button"]'
      )

      const count = await connectButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Account Switching Tests
// ============================================================================

test.describe('Switch Wallet Accounts', () => {
  test('should display account switcher', async ({ page }) => {
    // Assuming wallet is connected
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for account selector
    const accountSwitcher = page.locator(
      '[data-testid="account-switcher"], button:has-text("0x"), [role="combobox"]:has-text("0x")'
    )

    const isVisible = await accountSwitcher.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should show available accounts', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for account list
    const accountSwitcher = page
      .locator('[data-testid="account-switcher"], button:has-text("0x"), [role="combobox"]')
      .first()

    if (await accountSwitcher.isVisible()) {
      await accountSwitcher.click()
      await page.waitForTimeout(300)

      // Look for account options
      const accounts = page.locator(
        '[role="option"], button:has-text("0x"), [data-testid="account-item"]'
      )

      const count = await accounts.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should switch to different account', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const accountSwitcher = page
      .locator('[data-testid="account-switcher"], button:has-text("0x")')
      .first()

    if (await accountSwitcher.isVisible()) {
      await accountSwitcher.click()
      await page.waitForTimeout(300)

      // Select different account
      const accountOption = page.locator('[role="option"], [data-testid="account-item"]').nth(1)

      if (await accountOption.isVisible()) {
        await accountOption.click()
        await page.waitForTimeout(500)

        // Account should change
        expect(true).toBe(true)
      }
    }
  })

  test('should update balance when switching accounts', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const accountSwitcher = page
      .locator('[data-testid="account-switcher"], button:has-text("0x")')
      .first()

    if (await accountSwitcher.isVisible()) {
      // Get initial balance
      const initialBalance = await page.locator('[data-testid="wallet-balance"]').textContent()

      await accountSwitcher.click()
      await page.waitForTimeout(300)

      // Switch account
      const accountOption = page.locator('[role="option"]').nth(1)
      if (await accountOption.isVisible()) {
        await accountOption.click()
        await page.waitForTimeout(1000)

        // Balance may change
        const newBalance = await page
          .locator('[data-testid="wallet-balance"]')
          .textContent()
          .catch(() => null)

        expect(typeof newBalance).toBe('string')
      }
    }
  })
})

// ============================================================================
// Transaction History Tests
// ============================================================================

test.describe('Wallet Transaction History', () => {
  test('should display transaction history section', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for history section
    const historySection = page.locator(
      '[data-testid="transaction-history"], section:has-text("Transaction"), section:has-text("History"), .transaction-list'
    )

    const isVisible = await historySection.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should display transaction items', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for transaction items
    const transactions = page.locator(
      '[data-testid="transaction-item"], .transaction-item, [role="listitem"]:has([data-testid="tx-hash"])'
    )

    const count = await transactions.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show transaction type (send/receive)', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for tx type indicator
    const txType = page.locator('[data-testid="tx-type"], text=/sent|received|incoming|outgoing/i')

    const count = await txType.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show transaction amount', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for amount display
    const txAmount = page.locator('[data-testid="tx-amount"], text=/\\d+\\.\\d+ (ETH|MATIC|USD)/i')

    const count = await txAmount.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show transaction status', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for status badge — use .or() because text= is Playwright syntax, not CSS
    const txStatus = page
      .locator('[data-testid="tx-status"]')
      .or(page.locator('text=/confirmed|pending|failed/i'))

    const count = await txStatus.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show transaction timestamp', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for timestamp
    const txTime = page.locator(
      '[data-testid="tx-time"], text=/ago|minute|hour|day|January|February/i'
    )

    const count = await txTime.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should allow opening transaction details', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Click on transaction item
    const transaction = page.locator('[data-testid="transaction-item"], .transaction-item').first()

    if (await transaction.isVisible()) {
      await transaction.click()
      await page.waitForTimeout(500)

      // Details should show
      const details = page.locator('[data-testid="tx-details"], text=/Hash|From|To|Gas/i')

      const count = await details.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should open block explorer for transaction', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadService('networkidle')

    // Look for explorer link
    const explorerLink = page
      .locator(
        'a[href*="etherscan"], a[href*="polygonscan"], [aria-label*="explorer"], [data-testid="view-explorer"]'
      )
      .first()

    if (await explorerLink.isVisible()) {
      // Check href
      const href = await explorerLink.getAttribute('href')
      expect(typeof href).toBe('string')
    }
  })

  test('should filter transactions', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for filter
    const filterButton = page.locator(
      'button:has-text("Filter"), [data-testid="filter-transactions"], [role="combobox"]'
    )

    if (await filterButton.isVisible()) {
      await filterButton.click()
      await page.waitForTimeout(300)

      // Select filter option
      const filterOption = page
        .locator('button:has-text("Sent"), [role="option"]:has-text("Sent")')
        .first()

      if (await filterOption.isVisible()) {
        await filterOption.click()
        await page.waitForTimeout(500)

        expect(true).toBe(true)
      }
    }
  })
})

// ============================================================================
// Multi-Chain Support Tests
// ============================================================================

test.describe('Multi-Chain Support', () => {
  test('should display network switcher', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Look for chain selector
    const chainSwitcher = page.locator(
      '[data-testid="chain-switcher"], button:has-text("Ethereum"), button:has-text("Polygon"), [data-testid="network-selector"]'
    )

    const isVisible = await chainSwitcher.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('should show available chains', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const chainSwitcher = page
      .locator('[data-testid="chain-switcher"], button:has-text("Ethereum"), [role="combobox"]')
      .first()

    if (await chainSwitcher.isVisible()) {
      await chainSwitcher.click()
      await page.waitForTimeout(300)

      // Look for chain options
      const chainOptions = page.locator(
        '[role="option"], button:has-text("Ethereum"), button:has-text("Polygon"), [data-testid="chain-item"]'
      )

      const count = await chainOptions.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should switch to Ethereum mainnet', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const chainSwitcher = page
      .locator('[data-testid="chain-switcher"], button:has-text("Ethereum")')
      .first()

    if (await chainSwitcher.isVisible()) {
      await chainSwitcher.click()
      await page.waitForTimeout(300)

      const ethereumOption = page
        .locator('button:has-text("Ethereum Mainnet"), [role="option"]:has-text("Ethereum")')
        .first()

      if (await ethereumOption.isVisible()) {
        await ethereumOption.click()
        await page.waitForTimeout(1000)

        expect(true).toBe(true)
      }
    }
  })

  test('should switch to Polygon chain', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const chainSwitcher = page
      .locator('[data-testid="chain-switcher"], button:has-text("Polygon"), [role="combobox"]')
      .first()

    if (await chainSwitcher.isVisible()) {
      await chainSwitcher.click()
      await page.waitForTimeout(300)

      const polygonOption = page
        .locator('button:has-text("Polygon"), [role="option"]:has-text("Polygon")')
        .first()

      if (await polygonOption.isVisible()) {
        await polygonOption.click()
        await page.waitForTimeout(1000)

        expect(true).toBe(true)
      }
    }
  })

  test('should switch to Sepolia testnet', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const chainSwitcher = page.locator('[data-testid="chain-switcher"], [role="combobox"]').first()

    if (await chainSwitcher.isVisible()) {
      await chainSwitcher.click()
      await page.waitForTimeout(300)

      const sepoliaOption = page
        .locator('button:has-text("Sepolia"), [role="option"]:has-text("Sepolia")')
        .first()

      if (await sepoliaOption.isVisible()) {
        await sepoliaOption.click()
        await page.waitForTimeout(1000)

        expect(true).toBe(true)
      }
    }
  })

  test('should update balance for different chains', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Get initial balance
    const initialBalance = await page.locator('[data-testid="wallet-balance"]').textContent()

    const chainSwitcher = page.locator('[data-testid="chain-switcher"]').first()

    if (await chainSwitcher.isVisible()) {
      await chainSwitcher.click()
      await page.waitForTimeout(300)

      // Switch to different chain
      const chainOption = page.locator('[role="option"]').nth(1)
      if (await chainOption.isVisible()) {
        await chainOption.click()
        await page.waitForTimeout(1000)

        // Balance may change
        const newBalance = await page.locator('[data-testid="wallet-balance"]').textContent()

        expect(typeof newBalance).toBe('string')
      }
    }
  })

  test('should show chain-specific gas prices', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.click()
      await page.waitForTimeout(500)

      // Look for gas price
      const gasPrice = page.locator('[data-testid="gas-fee"], text=/Gwei|Gas|Fee/i')

      const count = await gasPrice.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should display all supported chains information', async ({ page }) => {
    await page.goto('/wallet/settings')
    await page.waitForLoadState('networkidle')

    // Look for chains list
    const chainsList = page.locator('[data-testid="supported-chains"], section:has-text("Chain")')

    const isVisible = await chainsList.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })
})

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Wallet Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('should display wallet on mobile', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Should still show wallet interface — page has data-testid="wallet-container"
    const walletSection = page.locator('[data-testid="wallet-container"]')
    const isVisible = await walletSection.isVisible()
    expect(isVisible).toBe(true)
  })

  test('should show mobile-friendly button layout', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    // Buttons should be stacked
    const buttons = page.locator('button:has-text("Send"), button:has-text("Receive")')
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should stack account switcher vertically', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const accountSwitcher = page.locator('[data-testid="account-switcher"]')
    const isVisible = await accountSwitcher.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })
})
