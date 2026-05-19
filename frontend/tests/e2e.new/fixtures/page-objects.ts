/**
 * Page Objects for E2E Tests
 *
 * Reusable page object models following Playwright best practices.
 * Each page object encapsulates the selectors and actions for a specific page or component.
 */

import { Page, Locator, expect } from '@playwright/test'

// =============================================================================
// Base Page Object
// =============================================================================

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path)
    await this.page.waitForLoadState('load')
  }

  async waitForElement(selector: string, options?: { timeout?: number }) {
    return this.page.waitForSelector(selector, options)
  }

  async clickElement(selector: string) {
    await this.page.click(selector)
  }

  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value)
  }

  async getText(selector: string): Promise<string> {
    return this.page.textContent(selector) ?? ''
  }
}

// =============================================================================
// Call Page Object
// =============================================================================

export class CallPage extends BasePage {
  // Locators
  readonly voiceCallButton: Locator
  readonly videoCallButton: Locator
  readonly endCallButton: Locator
  readonly muteButton: Locator
  readonly cameraToggleButton: Locator
  readonly screenShareButton: Locator
  readonly callPanel: Locator
  readonly callDuration: Locator
  readonly callStatus: Locator
  readonly localVideo: Locator
  readonly remoteVideo: Locator

  constructor(page: Page) {
    super(page)
    this.voiceCallButton = page.locator('[data-testid="voice-call-button"]')
    this.videoCallButton = page.locator('[data-testid="video-call-button"]')
    this.endCallButton = page.locator('[data-testid="end-call-button"]')
    this.muteButton = page.locator('[data-testid="mute-audio-button"]')
    this.cameraToggleButton = page.locator('[data-testid="camera-toggle-button"]')
    this.screenShareButton = page.locator('[data-testid="screen-share-button"]')
    this.callPanel = page.locator('[data-testid="call-panel"]')
    this.callDuration = page.locator('[data-testid="call-duration"]')
    this.callStatus = page.locator('[data-testid="call-status"]')
    this.localVideo = page.locator('[data-testid="local-video"]')
    this.remoteVideo = page.locator('[data-testid="remote-video"]')
  }

  async startVoiceCall() {
    await this.voiceCallButton.click()
    await this.page.waitForTimeout(1000)
  }

  async startVideoCall() {
    await this.videoCallButton.click()
    await this.page.waitForTimeout(1000)
  }

  async endCall() {
    await this.endCallButton.click()
    await this.page.waitForTimeout(500)
  }

  async toggleMute() {
    await this.muteButton.click()
  }

  async toggleCamera() {
    await this.cameraToggleButton.click()
  }

  async toggleScreenShare() {
    await this.screenShareButton.click()
  }

  async getCallDuration(): Promise<string> {
    return this.callDuration.textContent() ?? ''
  }

  async isInCall(): Promise<boolean> {
    return this.callPanel.isVisible()
  }

  async waitForCallToConnect() {
    await expect(this.callStatus).toContainText(/connected|active/i, { timeout: 10000 })
  }
}

// =============================================================================
// Wallet Page Object
// =============================================================================

export class WalletPage extends BasePage {
  // Locators
  readonly connectMetaMaskButton: Locator
  readonly connectWalletConnectButton: Locator
  readonly disconnectButton: Locator
  readonly walletAddress: Locator
  readonly walletBalance: Locator
  readonly sendButton: Locator
  readonly receiveButton: Locator
  readonly transactionHistory: Locator
  readonly chainSwitcher: Locator
  readonly accountSwitcher: Locator

  // Send modal
  readonly recipientAddressInput: Locator
  readonly sendAmountInput: Locator
  readonly confirmSendButton: Locator
  readonly gasFeeDisplay: Locator

  // Receive modal
  readonly receiveQRCode: Locator
  readonly copyAddressButton: Locator

  constructor(page: Page) {
    super(page)
    this.connectMetaMaskButton = page.locator('[data-testid="connect-metamask"]')
    this.connectWalletConnectButton = page.locator('[data-testid="connect-walletconnect"]')
    this.disconnectButton = page.locator('[data-testid="disconnect-button"]')
    this.walletAddress = page.locator('[data-testid="wallet-address"]')
    this.walletBalance = page.locator('[data-testid="wallet-balance"]')
    this.sendButton = page.locator('[data-testid="send-button"]')
    this.receiveButton = page.locator('[data-testid="receive-button"]')
    this.transactionHistory = page.locator('[data-testid="transaction-history"]')
    this.chainSwitcher = page.locator('[data-testid="chain-switcher"]')
    this.accountSwitcher = page.locator('[data-testid="account-switcher"]')

    // Send modal
    this.recipientAddressInput = page.locator('[data-testid="recipient-address"]')
    this.sendAmountInput = page.locator('[data-testid="send-amount"]')
    this.confirmSendButton = page.locator('[data-testid="confirm-send"]')
    this.gasFeeDisplay = page.locator('[data-testid="gas-fee"]')

    // Receive modal
    this.receiveQRCode = page.locator('[data-testid="receive-qr"]')
    this.copyAddressButton = page.locator('[data-testid="copy-address"]')
  }

  async connectMetaMask() {
    await this.connectMetaMaskButton.click()
    await this.page.waitForTimeout(500)
  }

  async connectWalletConnect() {
    await this.connectWalletConnectButton.click()
    await this.page.waitForTimeout(500)
  }

  async disconnect() {
    await this.disconnectButton.click()
    await this.page.waitForTimeout(500)
  }

  async openSendModal() {
    await this.sendButton.click()
    await this.page.waitForTimeout(500)
  }

  async openReceiveModal() {
    await this.receiveButton.click()
    await this.page.waitForTimeout(500)
  }

  async sendCrypto(recipientAddress: string, amount: string) {
    await this.openSendModal()
    await this.recipientAddressInput.fill(recipientAddress)
    await this.sendAmountInput.fill(amount)
    await this.confirmSendButton.click()
  }

  async getBalance(): Promise<string> {
    return this.walletBalance.textContent() ?? ''
  }

  async getAddress(): Promise<string> {
    return this.walletAddress.textContent() ?? ''
  }

  async switchChain(chainName: string) {
    await this.chainSwitcher.click()
    await this.page.locator(`[role="option"]:has-text("${chainName}")`).click()
    await this.page.waitForTimeout(1000)
  }

  async copyReceiveAddress() {
    await this.openReceiveModal()
    await this.copyAddressButton.click()
    await this.page.waitForTimeout(300)
  }
}

// =============================================================================
// Advanced Messaging Page Object
// =============================================================================

export class AdvancedMessagingPage extends BasePage {
  // Poll components
  readonly createPollButton: Locator
  readonly pollQuestionInput: Locator
  readonly pollOptionInput: Locator
  readonly addPollOptionButton: Locator
  readonly createPollSubmitButton: Locator
  readonly pollVoteButton: Locator

  // Scheduled messages
  readonly scheduleMessageButton: Locator
  readonly scheduleDatePicker: Locator
  readonly scheduleTimeInput: Locator
  readonly scheduleSubmitButton: Locator

  // Message actions
  readonly forwardMessageButton: Locator
  readonly reactToMessageButton: Locator
  readonly translateMessageButton: Locator

  // Link preview
  readonly linkPreview: Locator

  constructor(page: Page) {
    super(page)
    this.createPollButton = page.locator('[data-testid="create-poll-button"]')
    this.pollQuestionInput = page.locator('[data-testid="poll-question-input"]')
    this.pollOptionInput = page.locator('[data-testid="poll-option-input"]')
    this.addPollOptionButton = page.locator('[data-testid="add-poll-option"]')
    this.createPollSubmitButton = page.locator('[data-testid="create-poll-submit"]')
    this.pollVoteButton = page.locator('[data-testid="poll-vote-button"]')

    this.scheduleMessageButton = page.locator('[data-testid="schedule-message-button"]')
    this.scheduleDatePicker = page.locator('[data-testid="schedule-date-picker"]')
    this.scheduleTimeInput = page.locator('[data-testid="schedule-time-input"]')
    this.scheduleSubmitButton = page.locator('[data-testid="schedule-submit"]')

    this.forwardMessageButton = page.locator('[data-testid="forward-message-button"]')
    this.reactToMessageButton = page.locator('[data-testid="react-to-message"]')
    this.translateMessageButton = page.locator('[data-testid="translate-message"]')

    this.linkPreview = page.locator('[data-testid="link-preview"]')
  }

  async createPoll(question: string, options: string[]) {
    await this.createPollButton.click()
    await this.pollQuestionInput.fill(question)

    for (const option of options) {
      await this.pollOptionInput.fill(option)
      await this.addPollOptionButton.click()
    }

    await this.createPollSubmitButton.click()
    await this.page.waitForTimeout(500)
  }

  async voteOnPoll(optionIndex: number) {
    await this.pollVoteButton.nth(optionIndex).click()
    await this.page.waitForTimeout(300)
  }

  async scheduleMessage(message: string, date: string, time: string) {
    await this.scheduleMessageButton.click()
    await this.scheduleDatePicker.fill(date)
    await this.scheduleTimeInput.fill(time)
    await this.page.locator('[data-testid="message-input"]').fill(message)
    await this.scheduleSubmitButton.click()
    await this.page.waitForTimeout(500)
  }

  async forwardMessage(messageId: string, targetChannel: string) {
    await this.page
      .locator(`[data-testid="message-${messageId}"] [data-testid="message-menu"]`)
      .click()
    await this.forwardMessageButton.click()
    await this.page.locator(`[data-testid="channel-${targetChannel}"]`).click()
    await this.page.waitForTimeout(500)
  }

  async reactToMessage(messageId: string, emoji: string) {
    await this.page
      .locator(`[data-testid="message-${messageId}"] [data-testid="add-reaction"]`)
      .click()
    await this.page.locator(`[data-testid="emoji-${emoji}"]`).click()
    await this.page.waitForTimeout(300)
  }

  async translateMessage(messageId: string, targetLanguage: string) {
    await this.page
      .locator(`[data-testid="message-${messageId}"] [data-testid="message-menu"]`)
      .click()
    await this.translateMessageButton.click()
    await this.page.locator(`[data-testid="language-${targetLanguage}"]`).click()
    await this.page.waitForTimeout(500)
  }

  async waitForLinkPreview(url: string) {
    await expect(this.linkPreview).toBeVisible({ timeout: 5000 })
    await expect(this.linkPreview).toContainText(url)
  }
}

// =============================================================================
// Settings Page Object
// =============================================================================

export class SettingsPage extends BasePage {
  // Navigation
  readonly profileTab: Locator
  readonly accountTab: Locator
  readonly notificationsTab: Locator
  readonly privacyTab: Locator
  readonly appearanceTab: Locator
  readonly securityTab: Locator

  // Profile settings
  readonly displayNameInput: Locator
  readonly usernameInput: Locator
  readonly bioInput: Locator
  readonly avatarUpload: Locator
  readonly saveProfileButton: Locator

  // Account settings
  readonly emailInput: Locator
  readonly changePasswordButton: Locator
  readonly deleteAccountButton: Locator

  // Notification settings
  readonly pushNotificationsToggle: Locator
  readonly emailNotificationsToggle: Locator
  readonly desktopNotificationsToggle: Locator
  readonly soundToggle: Locator

  // Privacy settings
  readonly onlineStatusToggle: Locator
  readonly readReceiptsToggle: Locator
  readonly typingIndicatorToggle: Locator
  readonly profileVisibilitySelect: Locator

  // Appearance settings
  readonly themeSelect: Locator
  readonly languageSelect: Locator
  readonly compactModeToggle: Locator
  readonly animationsToggle: Locator

  // Security settings
  readonly twoFactorToggle: Locator
  readonly activeSessions: Locator
  readonly loginHistory: Locator

  constructor(page: Page) {
    super(page)
    // Navigation
    this.profileTab = page.locator('[data-testid="settings-tab-profile"]')
    this.accountTab = page.locator('[data-testid="settings-tab-account"]')
    this.notificationsTab = page.locator('[data-testid="settings-tab-notifications"]')
    this.privacyTab = page.locator('[data-testid="settings-tab-privacy"]')
    this.appearanceTab = page.locator('[data-testid="settings-tab-appearance"]')
    this.securityTab = page.locator('[data-testid="settings-tab-security"]')

    // Profile
    this.displayNameInput = page.locator('[data-testid="profile-display-name"]')
    this.usernameInput = page.locator('[data-testid="profile-username"]')
    this.bioInput = page.locator('[data-testid="profile-bio"]')
    this.avatarUpload = page.locator('[data-testid="avatar-upload"]')
    this.saveProfileButton = page.locator('[data-testid="save-profile"]')

    // Account
    this.emailInput = page.locator('[data-testid="account-email"]')
    this.changePasswordButton = page.locator('[data-testid="change-password"]')
    this.deleteAccountButton = page.locator('[data-testid="delete-account"]')

    // Notifications
    this.pushNotificationsToggle = page.locator('[data-testid="toggle-push-notifications"]')
    this.emailNotificationsToggle = page.locator('[data-testid="toggle-email-notifications"]')
    this.desktopNotificationsToggle = page.locator('[data-testid="toggle-desktop-notifications"]')
    this.soundToggle = page.locator('[data-testid="toggle-sound"]')

    // Privacy
    this.onlineStatusToggle = page.locator('[data-testid="toggle-online-status"]')
    this.readReceiptsToggle = page.locator('[data-testid="toggle-read-receipts"]')
    this.typingIndicatorToggle = page.locator('[data-testid="toggle-typing-indicator"]')
    this.profileVisibilitySelect = page.locator('[data-testid="select-profile-visibility"]')

    // Appearance
    this.themeSelect = page.locator('[data-testid="select-theme"]')
    this.languageSelect = page.locator('[data-testid="select-language"]')
    this.compactModeToggle = page.locator('[data-testid="toggle-compact-mode"]')
    this.animationsToggle = page.locator('[data-testid="toggle-animations"]')

    // Security
    this.twoFactorToggle = page.locator('[data-testid="toggle-two-factor"]')
    this.activeSessions = page.locator('[data-testid="active-sessions"]')
    this.loginHistory = page.locator('[data-testid="login-history"]')
  }

  async navigateToProfile() {
    await this.profileTab.click()
    await this.page.waitForLoadState('load')
  }

  async navigateToAccount() {
    await this.accountTab.click()
    await this.page.waitForLoadState('load')
  }

  async navigateToNotifications() {
    await this.notificationsTab.click()
    await this.page.waitForLoadState('load')
  }

  async navigateToPrivacy() {
    await this.privacyTab.click()
    await this.page.waitForLoadState('load')
  }

  async navigateToAppearance() {
    await this.appearanceTab.click()
    await this.page.waitForLoadState('load')
  }

  async navigateToSecurity() {
    await this.securityTab.click()
    await this.page.waitForLoadState('load')
  }

  async updateProfile(data: { displayName?: string; username?: string; bio?: string }) {
    await this.navigateToProfile()

    if (data.displayName) {
      await this.displayNameInput.fill(data.displayName)
    }
    if (data.username) {
      await this.usernameInput.fill(data.username)
    }
    if (data.bio) {
      await this.bioInput.fill(data.bio)
    }

    await this.saveProfileButton.click()
    await this.page.waitForTimeout(500)
  }

  async toggleNotification(type: 'push' | 'email' | 'desktop' | 'sound') {
    await this.navigateToNotifications()

    switch (type) {
      case 'push':
        await this.pushNotificationsToggle.click()
        break
      case 'email':
        await this.emailNotificationsToggle.click()
        break
      case 'desktop':
        await this.desktopNotificationsToggle.click()
        break
      case 'sound':
        await this.soundToggle.click()
        break
    }

    await this.page.waitForTimeout(300)
  }

  async togglePrivacySetting(setting: 'onlineStatus' | 'readReceipts' | 'typingIndicator') {
    await this.navigateToPrivacy()

    switch (setting) {
      case 'onlineStatus':
        await this.onlineStatusToggle.click()
        break
      case 'readReceipts':
        await this.readReceiptsToggle.click()
        break
      case 'typingIndicator':
        await this.typingIndicatorToggle.click()
        break
    }

    await this.page.waitForTimeout(300)
  }

  async changeTheme(theme: string) {
    await this.navigateToAppearance()
    await this.themeSelect.selectOption(theme)
    await this.page.waitForTimeout(500)
  }

  async changeLanguage(language: string) {
    await this.navigateToAppearance()
    await this.languageSelect.selectOption(language)
    await this.page.waitForTimeout(500)
  }

  async enableTwoFactor() {
    await this.navigateToSecurity()
    await this.twoFactorToggle.click()
    await this.page.waitForTimeout(500)
  }

  async getActiveSessions(): Promise<number> {
    await this.navigateToSecurity()
    const sessions = await this.activeSessions.locator('[data-testid="session-item"]').count()
    return sessions
  }
}
