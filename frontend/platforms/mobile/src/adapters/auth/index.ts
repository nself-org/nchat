/**
 * Auth Adapter for nself-chat Mobile
 *
 * Provides biometric authentication and OAuth redirect handling
 */

import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'
import { App } from '@capacitor/app'

/**
 * Auth adapter interface for mobile-specific auth operations
 */
export interface AuthAdapter {
  checkBiometric(): Promise<{
    available: boolean
    type: BiometryType | null
    error?: string
  }>
  authenticateBiometric(options?: {
    reason?: string
    title?: string
  }): Promise<boolean>
  handleOAuthRedirect(url: string): Promise<void>
  registerDeepLinkHandler(
    handler: (url: string) => void | Promise<void>
  ): () => void
}

/**
 * Mobile auth implementation using Capacitor plugins
 *
 * @example
 * ```typescript
 * import { mobileAuth } from '@/adapters/auth'
 *
 * // Check if biometric auth is available
 * const { available, type } = await mobileAuth.checkBiometric()
 * if (available) {
 *   console.log(`Biometric type: ${type}`)
 * }
 *
 * // Authenticate with biometrics
 * const success = await mobileAuth.authenticateBiometric({
 *   reason: 'Unlock app',
 *   title: 'Authenticate'
 * })
 *
 * // Register OAuth deep link handler
 * const cleanup = mobileAuth.registerDeepLinkHandler((url) => {
 *   console.log('OAuth redirect:', url)
 * })
 * ```
 */
export const mobileAuth: AuthAdapter = {
  /**
   * Check if biometric authentication is available
   */
  async checkBiometric() {
    try {
      const result = await BiometricAuth.checkBiometry()
      return {
        available: result.isAvailable,
        type: result.biometryType,
        error: result.reason,
      }
    } catch (error) {
      console.error('[Auth] Error checking biometric:', error)
      return {
        available: false,
        type: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Authenticate using biometrics (Face ID, Touch ID, fingerprint)
   */
  async authenticateBiometric(options = {}) {
    const { reason = 'Authenticate to continue', title = 'Authentication' } =
      options

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (BiometricAuth.authenticate as any)({
        reason,
        title,
        subtitle: 'nself-chat',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: title,
        androidSubtitle: reason,
        androidConfirmationRequired: false,
      })

      return true
    } catch (error) {
      console.error('[Auth] Biometric authentication failed:', error)
      return false
    }
  },

  /**
   * Handle OAuth redirect (called from deep link)
   */
  async handleOAuthRedirect(url: string) {
    try {
      // Parse OAuth callback URL
      const urlObj = new URL(url)
      const params = new URLSearchParams(urlObj.search)

      // Extract auth params
      const code = params.get('code')
      const state = params.get('state')
      const error = params.get('error')

      if (error) {
        console.error('[Auth] OAuth error:', error)
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code || !state) {
        throw new Error('Missing OAuth parameters')
      }

      // Emit custom event for OAuth handler
      const event = new CustomEvent('oauth-redirect', {
        detail: { code, state, url },
      })
      window.dispatchEvent(event)
    } catch (error) {
      console.error('[Auth] Error handling OAuth redirect:', error)
      throw error
    }
  },

  /**
   * Register deep link handler for OAuth callbacks
   */
  registerDeepLinkHandler(handler: (url: string) => void | Promise<void>) {
    const listenerPromise = App.addListener('appUrlOpen', async (data) => {
      const url = data.url
      console.log('[Auth] Deep link opened:', url)

      // Check if it's an OAuth callback
      if (url.includes('oauth') || url.includes('callback')) {
        await handler(url)
      }
    })

    // Return cleanup function — resolve listener promise then remove
    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {})
    }
  },
}

/**
 * Biometric auth helpers
 */
export const biometricHelpers = {
  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName(type: BiometryType | null): string {
    if (!type) return 'None'

    switch (type) {
      case BiometryType.touchId:
        return 'Touch ID'
      case BiometryType.faceId:
        return 'Face ID'
      case BiometryType.fingerprintAuthentication:
        return 'Fingerprint'
      case BiometryType.faceAuthentication:
        return 'Face Recognition'
      case BiometryType.irisAuthentication:
        return 'Iris Scan'
      default:
        return 'Biometric'
    }
  },

  /**
   * Check if device has strong biometric authentication
   */
  hasStrongBiometric(type: BiometryType | null): boolean {
    if (!type) return false
    return [
      BiometryType.faceId,
      BiometryType.touchId,
      BiometryType.irisAuthentication,
    ].includes(type)
  },
}

export default mobileAuth
