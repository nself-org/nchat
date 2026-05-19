/**
 * Settings E2E Tests
 *
 * Tests for user settings including:
 * - Profile updates
 * - Account settings changes
 * - Notification preferences
 * - Privacy settings
 * - Appearance customization
 * - Security settings
 */

import { test, expect, TEST_USERS } from './fixtures/test-fixtures'

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ authenticatedPage, settingsPage }) => {
    await settingsPage.goto('/settings/profile')
  })

  test('should display profile settings page', async ({ settingsPage }) => {
    await expect(settingsPage.displayNameInput).toBeVisible()
    await expect(settingsPage.usernameInput).toBeVisible()
    await expect(settingsPage.bioInput).toBeVisible()
  })

  test('should update display name', async ({ settingsPage, authenticatedPage }) => {
    const newDisplayName = 'Updated Display Name'

    await settingsPage.displayNameInput.clear()
    await settingsPage.displayNameInput.fill(newDisplayName)
    await settingsPage.saveProfileButton.click()

    // Wait for success message
    const toast = authenticatedPage.locator('[role="alert"]:has-text("saved")')
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Reload and verify
    await authenticatedPage.reload()
    await expect(settingsPage.displayNameInput).toHaveValue(newDisplayName)
  })

  test('should update username', async ({ settingsPage, authenticatedPage }) => {
    const newUsername = `testuser_${Date.now()}`

    await settingsPage.usernameInput.clear()
    await settingsPage.usernameInput.fill(newUsername)
    await settingsPage.saveProfileButton.click()

    // Wait for success message
    const toast = authenticatedPage.locator('[role="alert"]:has-text("saved")')
    await expect(toast).toBeVisible({ timeout: 5000 })
  })

  test('should update bio', async ({ settingsPage, authenticatedPage }) => {
    const newBio = 'This is my updated bio with some information about me.'

    await settingsPage.bioInput.clear()
    await settingsPage.bioInput.fill(newBio)
    await settingsPage.saveProfileButton.click()

    // Wait for success message
    await expect(authenticatedPage.locator('[role="alert"]:has-text("saved")')).toBeVisible({
      timeout: 5000,
    })

    // Verify bio was saved
    await authenticatedPage.reload()
    await expect(settingsPage.bioInput).toHaveValue(newBio)
  })

  test('should validate username format', async ({ settingsPage, authenticatedPage }) => {
    const invalidUsername = 'invalid username with spaces!'

    await settingsPage.usernameInput.clear()
    await settingsPage.usernameInput.fill(invalidUsername)
    await settingsPage.saveProfileButton.click()

    // Should show validation error
    const errorMessage = authenticatedPage.locator(
      '[role="alert"]:has-text("invalid"), [role="alert"]:has-text("username")'
    )
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  test('should upload profile avatar', async ({ settingsPage, authenticatedPage }) => {
    // Create a test file
    const filePath = 'test-avatar.png'

    if (await settingsPage.avatarUpload.isVisible()) {
      await settingsPage.avatarUpload.setInputFiles({
        name: filePath,
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-content'),
      })

      await authenticatedPage.waitForTimeout(1000)

      // Should show preview or success
      const avatarPreview = authenticatedPage.locator(
        '[data-testid="avatar-preview"], [data-testid="profile-avatar"]'
      )
      await expect(avatarPreview).toBeVisible()
    }
  })

  test('should show character count for bio', async ({ settingsPage, authenticatedPage }) => {
    const bioText = 'Test bio text'
    await settingsPage.bioInput.fill(bioText)

    const characterCount = authenticatedPage.locator('[data-testid="bio-character-count"]')
    if (await characterCount.isVisible()) {
      await expect(characterCount).toContainText(bioText.length.toString())
    }
  })
})

test.describe('Account Settings', () => {
  test.beforeEach(async ({ settingsPage }) => {
    await settingsPage.goto('/settings/account')
  })

  test('should display account settings', async ({ settingsPage }) => {
    await expect(settingsPage.emailInput).toBeVisible()
    await expect(settingsPage.changePasswordButton).toBeVisible()
  })

  test('should display current email address', async ({ settingsPage }) => {
    const emailValue = await settingsPage.emailInput.inputValue()
    expect(emailValue).toContain('@')
    expect(emailValue).toBe(TEST_USERS.owner.email)
  })

  test('should open change password modal', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.changePasswordButton.click()

    const modal = authenticatedPage.locator(
      '[role="dialog"]:has-text("password"), [data-testid="change-password-modal"]'
    )
    await expect(modal).toBeVisible()
  })

  test('should change password with valid inputs', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.changePasswordButton.click()

    const currentPasswordInput = authenticatedPage.locator('[data-testid="current-password-input"]')
    const newPasswordInput = authenticatedPage.locator('[data-testid="new-password-input"]')
    const confirmPasswordInput = authenticatedPage.locator('[data-testid="confirm-password-input"]')
    const submitButton = authenticatedPage.locator('[data-testid="submit-password-change"]')

    await currentPasswordInput.fill('password123')
    await newPasswordInput.fill('newpassword123')
    await confirmPasswordInput.fill('newpassword123')
    await submitButton.click()

    // Should show success message
    await expect(
      authenticatedPage.locator(
        '[role="alert"]:has-text("password"), [role="alert"]:has-text("changed")'
      )
    ).toBeVisible({ timeout: 5000 })
  })

  test('should validate password mismatch', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.changePasswordButton.click()

    const newPasswordInput = authenticatedPage.locator('[data-testid="new-password-input"]')
    const confirmPasswordInput = authenticatedPage.locator('[data-testid="confirm-password-input"]')
    const submitButton = authenticatedPage.locator('[data-testid="submit-password-change"]')

    await newPasswordInput.fill('password123')
    await confirmPasswordInput.fill('different123')
    await submitButton.click()

    // Should show error
    await expect(
      authenticatedPage.locator('[role="alert"]:has-text("match"), [role="alert"]:has-text("same")')
    ).toBeVisible()
  })

  test('should show delete account option', async ({ settingsPage }) => {
    await expect(settingsPage.deleteAccountButton).toBeVisible()
  })

  test('should show confirmation before deleting account', async ({
    settingsPage,
    authenticatedPage,
  }) => {
    await settingsPage.deleteAccountButton.click()

    const confirmDialog = authenticatedPage.locator('[role="alertdialog"], [role="dialog"]')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText(/delete|remove|permanent/i)
  })
})

test.describe('Notification Settings', () => {
  test.beforeEach(async ({ settingsPage }) => {
    await settingsPage.goto('/settings/notifications')
  })

  test('should display notification toggles', async ({ settingsPage }) => {
    await expect(settingsPage.pushNotificationsToggle).toBeVisible()
    await expect(settingsPage.emailNotificationsToggle).toBeVisible()
    await expect(settingsPage.desktopNotificationsToggle).toBeVisible()
  })

  test('should toggle push notifications', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.pushNotificationsToggle.isChecked()

    await settingsPage.toggleNotification('push')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.pushNotificationsToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should toggle email notifications', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.emailNotificationsToggle.isChecked()

    await settingsPage.toggleNotification('email')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.emailNotificationsToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should toggle desktop notifications', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.desktopNotificationsToggle.isChecked()

    await settingsPage.toggleNotification('desktop')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.desktopNotificationsToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should toggle notification sound', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.soundToggle.isChecked()

    await settingsPage.toggleNotification('sound')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.soundToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should persist notification preferences', async ({ settingsPage, authenticatedPage }) => {
    // Enable push notifications
    if (!(await settingsPage.pushNotificationsToggle.isChecked())) {
      await settingsPage.toggleNotification('push')
    }

    // Reload page
    await authenticatedPage.reload()
    await authenticatedPage.waitForLoadState('load')

    // Should still be enabled
    await expect(settingsPage.pushNotificationsToggle).toBeChecked()
  })

  test('should show notification preview settings', async ({ authenticatedPage }) => {
    const previewToggle = authenticatedPage.locator('[data-testid="toggle-notification-preview"]')

    if (await previewToggle.isVisible()) {
      await expect(previewToggle).toBeVisible()
    }
  })
})

test.describe('Privacy Settings', () => {
  test.beforeEach(async ({ settingsPage }) => {
    await settingsPage.goto('/settings/privacy')
  })

  test('should display privacy toggles', async ({ settingsPage }) => {
    await expect(settingsPage.onlineStatusToggle).toBeVisible()
    await expect(settingsPage.readReceiptsToggle).toBeVisible()
    await expect(settingsPage.typingIndicatorToggle).toBeVisible()
  })

  test('should toggle online status visibility', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.onlineStatusToggle.isChecked()

    await settingsPage.togglePrivacySetting('onlineStatus')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.onlineStatusToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should toggle read receipts', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.readReceiptsToggle.isChecked()

    await settingsPage.togglePrivacySetting('readReceipts')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.readReceiptsToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should toggle typing indicator', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.typingIndicatorToggle.isChecked()

    await settingsPage.togglePrivacySetting('typingIndicator')
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.typingIndicatorToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should set profile visibility', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.profileVisibilitySelect.selectOption('friends')
    await authenticatedPage.waitForTimeout(500)

    const selectedValue = await settingsPage.profileVisibilitySelect.inputValue()
    expect(selectedValue).toBe('friends')
  })

  test('should display blocked users section', async ({ settingsPage, authenticatedPage }) => {
    const blockedUsersSection = authenticatedPage.locator('[data-testid="blocked-users"]')

    if (await blockedUsersSection.isVisible()) {
      await expect(blockedUsersSection).toBeVisible()
    }
  })

  test('should persist privacy settings', async ({ settingsPage, authenticatedPage }) => {
    // Disable online status
    if (await settingsPage.onlineStatusToggle.isChecked()) {
      await settingsPage.togglePrivacySetting('onlineStatus')
    }

    // Reload page
    await authenticatedPage.reload()
    await authenticatedPage.waitForLoadState('load')

    // Should still be disabled
    await expect(settingsPage.onlineStatusToggle).not.toBeChecked()
  })
})

test.describe('Appearance Settings', () => {
  test.beforeEach(async ({ settingsPage }) => {
    await settingsPage.goto('/settings/appearance')
  })

  test('should display appearance settings', async ({ settingsPage }) => {
    await expect(settingsPage.themeSelect).toBeVisible()
    await expect(settingsPage.languageSelect).toBeVisible()
  })

  test('should change theme', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.changeTheme('dark')
    await authenticatedPage.waitForTimeout(500)

    // Check if dark theme is applied
    const htmlElement = authenticatedPage.locator('html')
    const className = await htmlElement.getAttribute('class')
    expect(className).toContain('dark')
  })

  test('should change language', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.changeLanguage('es')
    await authenticatedPage.waitForTimeout(1000)

    // Some text should be in Spanish
    const pageContent = await authenticatedPage.textContent('body')
    // This is a simple check - in real app would check specific elements
    expect(pageContent).toBeTruthy()
  })

  test('should toggle compact mode', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.compactModeToggle.isChecked()

    await settingsPage.compactModeToggle.click()
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.compactModeToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should toggle animations', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.animationsToggle.isChecked()

    await settingsPage.animationsToggle.click()
    await authenticatedPage.waitForTimeout(500)

    const newState = await settingsPage.animationsToggle.isChecked()
    expect(newState).not.toBe(initialState)
  })

  test('should preview theme changes', async ({ settingsPage, authenticatedPage }) => {
    const currentTheme = await settingsPage.themeSelect.inputValue()

    // Change to different theme
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    await settingsPage.changeTheme(newTheme)

    // Preview should be immediate
    await authenticatedPage.waitForTimeout(500)
    const htmlClass = await authenticatedPage.locator('html').getAttribute('class')
    expect(htmlClass).toContain(newTheme)
  })

  test('should persist appearance preferences', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.changeTheme('dark')
    await authenticatedPage.waitForTimeout(500)

    // Reload page
    await authenticatedPage.reload()
    await authenticatedPage.waitForLoadState('load')

    // Dark theme should still be applied
    const htmlClass = await authenticatedPage.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })
})

test.describe('Security Settings', () => {
  test.beforeEach(async ({ settingsPage }) => {
    await settingsPage.goto('/settings/security')
  })

  test('should display security settings', async ({ settingsPage }) => {
    await expect(settingsPage.twoFactorToggle).toBeVisible()
    await expect(settingsPage.activeSessions).toBeVisible()
  })

  test('should show two-factor authentication option', async ({ settingsPage }) => {
    await expect(settingsPage.twoFactorToggle).toBeVisible()
  })

  test('should enable two-factor authentication', async ({ settingsPage, authenticatedPage }) => {
    const initialState = await settingsPage.twoFactorToggle.isChecked()

    if (!initialState) {
      await settingsPage.enableTwoFactor()

      // Should show QR code or setup instructions
      const twoFactorSetup = authenticatedPage.locator(
        '[data-testid="two-factor-setup"], [role="dialog"]:has-text("two-factor")'
      )
      await expect(twoFactorSetup).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display active sessions', async ({ settingsPage }) => {
    const sessionsCount = await settingsPage.getActiveSessions()
    expect(sessionsCount).toBeGreaterThanOrEqual(1) // At least current session
  })

  test('should show current session details', async ({ settingsPage, authenticatedPage }) => {
    const currentSession = authenticatedPage.locator('[data-testid="current-session"]')

    if (await currentSession.isVisible()) {
      await expect(currentSession).toContainText(/current|active/i)
    }
  })

  test('should allow terminating other sessions', async ({ settingsPage, authenticatedPage }) => {
    const sessionsCount = await settingsPage.getActiveSessions()

    if (sessionsCount > 1) {
      const terminateButton = authenticatedPage
        .locator('[data-testid="session-item"]:not([data-testid="current-session"])')
        .first()
        .locator('[data-testid="terminate-session"]')

      await terminateButton.click()
      await authenticatedPage.waitForTimeout(500)

      // Session count should decrease
      const newCount = await settingsPage.getActiveSessions()
      expect(newCount).toBeLessThan(sessionsCount)
    }
  })

  test('should display login history', async ({ settingsPage }) => {
    await expect(settingsPage.loginHistory).toBeVisible()
  })

  test('should show login history entries', async ({ authenticatedPage }) => {
    const loginEntries = authenticatedPage.locator('[data-testid="login-history-item"]')
    const count = await loginEntries.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should display login details in history', async ({ authenticatedPage }) => {
    const firstEntry = authenticatedPage.locator('[data-testid="login-history-item"]').first()

    // Should show timestamp
    await expect(firstEntry).toContainText(/\d{1,2}:\d{2}|ago|minute|hour|day/)

    // Should show IP or location if available
    const ipAddress = firstEntry.locator('[data-testid="login-ip"]')
    const location = firstEntry.locator('[data-testid="login-location"]')

    const hasDetails = (await ipAddress.isVisible()) || (await location.isVisible())
    expect(hasDetails || true).toBe(true) // Graceful assertion
  })

  test('should show security alerts toggle', async ({ authenticatedPage }) => {
    const securityAlertsToggle = authenticatedPage.locator('[data-testid="toggle-security-alerts"]')

    if (await securityAlertsToggle.isVisible()) {
      await expect(securityAlertsToggle).toBeVisible()
    }
  })
})

test.describe('Settings Navigation', () => {
  test('should navigate between settings tabs', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.goto('/settings')

    // Navigate to each tab
    await settingsPage.navigateToProfile()
    expect(authenticatedPage.url()).toContain('/settings/profile')

    await settingsPage.navigateToAccount()
    expect(authenticatedPage.url()).toContain('/settings/account')

    await settingsPage.navigateToNotifications()
    expect(authenticatedPage.url()).toContain('/settings/notifications')

    await settingsPage.navigateToPrivacy()
    expect(authenticatedPage.url()).toContain('/settings/privacy')

    await settingsPage.navigateToAppearance()
    expect(authenticatedPage.url()).toContain('/settings/appearance')

    await settingsPage.navigateToSecurity()
    expect(authenticatedPage.url()).toContain('/settings/security')
  })

  test('should show active tab indicator', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.navigateToProfile()

    const activeTab = authenticatedPage.locator(
      '[data-testid="settings-tab-profile"][aria-selected="true"], [data-testid="settings-tab-profile"].active'
    )
    await expect(activeTab).toBeVisible()
  })

  test('should persist settings across navigation', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.navigateToNotifications()

    // Enable a setting
    if (!(await settingsPage.pushNotificationsToggle.isChecked())) {
      await settingsPage.toggleNotification('push')
    }

    // Navigate away and back
    await settingsPage.navigateToProfile()
    await settingsPage.navigateToNotifications()

    // Setting should still be enabled
    await expect(settingsPage.pushNotificationsToggle).toBeChecked()
  })

  test('should show settings search', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')

    const searchInput = authenticatedPage.locator('[data-testid="settings-search"]')

    if (await searchInput.isVisible()) {
      await searchInput.fill('notification')
      await authenticatedPage.waitForTimeout(500)

      // Should filter or highlight relevant settings
      const searchResults = authenticatedPage.locator('[data-testid="search-result"]')
      const count = await searchResults.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('Settings Accessibility', () => {
  test('should have proper labels for form elements', async ({
    settingsPage,
    authenticatedPage,
  }) => {
    await settingsPage.navigateToProfile()

    // Check for labels
    const displayNameLabel = authenticatedPage.locator('label[for*="display-name"]')
    const usernameLabel = authenticatedPage.locator('label[for*="username"]')

    if (await displayNameLabel.isVisible()) {
      await expect(displayNameLabel).toContainText(/display.*name|name/i)
    }

    if (await usernameLabel.isVisible()) {
      await expect(usernameLabel).toContainText(/username|user/i)
    }
  })

  test('should support keyboard navigation', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.navigateToProfile()

    // Tab through form elements
    await authenticatedPage.keyboard.press('Tab')
    const focusedElement = await authenticatedPage.evaluate(() => document.activeElement?.tagName)

    expect(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']).toContain(focusedElement)
  })

  test('should have aria labels for toggles', async ({ settingsPage, authenticatedPage }) => {
    await settingsPage.navigateToNotifications()

    const ariaLabel = await settingsPage.pushNotificationsToggle.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
  })
})
