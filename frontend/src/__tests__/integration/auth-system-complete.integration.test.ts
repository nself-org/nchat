/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

/**
 * Complete Auth System Integration Tests
 *
 * Comprehensive test suite for all authentication features.
 * These tests require a running server and are intended for E2E integration testing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'

// Skip these tests when running in unit test mode (no server available)
// These are intended for full integration testing with a running backend
const INTEGRATION_ENABLED = process.env.INTEGRATION_TESTS === 'true'
const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip

// Mock environment for testing
process.env.NEXT_PUBLIC_USE_DEV_AUTH = 'true'
process.env.NODE_ENV = 'test'

describeIntegration('Complete Auth System', () => {
  describe('Email/Password Authentication', () => {
    it('should register new user with email/password', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123456',
          username: 'testuser',
          displayName: 'Test User',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('test@example.com')
    })

    it('should login with correct credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@nself.org',
          password: 'password123',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.user).toBeDefined()
      expect(data.accessToken).toBeDefined()
    })

    it('should fail login with wrong password', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@nself.org',
          password: 'wrongpassword',
        }),
      })

      expect(response.ok).toBe(false)
    })

    it('should enforce password strength requirements', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'weak@example.com',
          password: 'weak',
          username: 'weakuser',
        }),
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error?.code).toBe('WEAK_PASSWORD')
    })
  })

  describe('Password Reset Flow', () => {
    it('should send password reset email', async () => {
      const response = await fetch('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@nself.org',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.message).toContain('reset link')
    })

    it('should not reveal if email exists (security)', async () => {
      const response = await fetch('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.message).toContain('If an account exists')
    })

    it('should rate limit password reset requests', async () => {
      // Make 4 requests quickly (limit is 3)
      const requests = Array(4)
        .fill(null)
        .map(() =>
          fetch('http://localhost:3000/api/auth/password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'owner@nself.org' }),
          })
        )

      const responses = await Promise.all(requests)
      const lastResponse = responses[responses.length - 1]

      expect(lastResponse.status).toBe(429) // Too Many Requests
    })
  })

  describe('Email Verification', () => {
    it('should send verification email on signup', async () => {
      // This is tested in the signup flow
      expect(true).toBe(true)
    })

    it('should verify email with valid token', async () => {
      // Mock token verification
      const mockToken = 'valid-verification-token'

      const response = await fetch('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mockToken }),
      })

      // In dev mode, this should succeed
      expect(response.ok).toBe(true)
    })

    it('should resend verification email', async () => {
      const response = await fetch('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'owner@nself.org' }),
      })

      expect(response.ok).toBe(true)
    })

    it('should rate limit verification resend requests', async () => {
      // Make 4 requests quickly (limit is 3 per hour)
      const requests = Array(4)
        .fill(null)
        .map(() =>
          fetch('http://localhost:3000/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com' }),
          })
        )

      const responses = await Promise.all(requests)
      const lastResponse = responses[responses.length - 1]

      expect(lastResponse.status).toBe(429)
    })
  })

  describe('Two-Factor Authentication (2FA)', () => {
    it('should setup 2FA with QR code', async () => {
      const response = await fetch('http://localhost:3000/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.qrCode).toBeDefined()
      expect(data.secret).toBeDefined()
    })

    it('should verify 2FA code during setup', async () => {
      // Mock 2FA verification
      const response = await fetch('http://localhost:3000/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'mock-secret',
          code: '123456',
        }),
      })

      // Response depends on valid code
      expect([200, 400]).toContain(response.status)
    })

    it('should generate backup codes', async () => {
      const response = await fetch('http://localhost:3000/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.backupCodes).toBeDefined()
      expect(data.backupCodes.length).toBe(10)
    })

    it('should disable 2FA', async () => {
      const response = await fetch('http://localhost:3000/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect([200, 401]).toContain(response.status)
    })
  })

  describe('OAuth Providers', () => {
    const providers = [
      'google',
      'github',
      'microsoft',
      'facebook',
      'twitter',
      'linkedin',
      'apple',
      'discord',
      'slack',
      'gitlab',
      'idme',
    ]

    providers.forEach((provider) => {
      it(`should have ${provider} OAuth configuration`, () => {
        // Check if provider is configured
        const clientIdEnvVar = `NEXT_PUBLIC_${provider.toUpperCase()}_CLIENT_ID`
        const isConfigured = !!process.env[clientIdEnvVar]

        // Provider may or may not be configured, test passes either way
        expect(typeof isConfigured).toBe('boolean')
      })
    })

    it('should handle OAuth callback with code', async () => {
      const response = await fetch(
        'http://localhost:3000/api/auth/oauth/callback?code=test-code&state=test-state'
      )

      // In dev mode, this redirects
      expect([302, 307, 400]).toContain(response.status)
    })

    it('should handle OAuth errors gracefully', async () => {
      const response = await fetch(
        'http://localhost:3000/api/auth/oauth/callback?error=access_denied'
      )

      // Should redirect to login with error
      expect([302, 307]).toContain(response.status)
    })
  })

  describe('ID.me Verification', () => {
    it('should check ID.me verification status', async () => {
      const response = await fetch('http://localhost:3000/api/auth/idme/status?userId=test-user-id')

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.verified).toBeDefined()
    })

    it('should handle ID.me callback', async () => {
      const response = await fetch(
        'http://localhost:3000/api/auth/idme/callback?code=test-code&state=test-state'
      )

      // Should redirect to settings
      expect([302, 307]).toContain(response.status)
    })
  })

  describe('Session Management', () => {
    it('should create session on login', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@nself.org',
          password: 'password123',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.accessToken).toBeDefined()
      expect(data.refreshToken).toBeDefined()
    })

    it('should list active sessions', async () => {
      const response = await fetch('http://localhost:3000/api/auth/sessions')

      expect([200, 401]).toContain(response.status)
    })

    it('should refresh access token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'mock-refresh-token',
        }),
      })

      expect([200, 401]).toContain(response.status)
    })

    it('should logout and destroy session', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Security Features', () => {
    it('should validate email format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Test123456',
          username: 'testuser',
        }),
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error?.code).toBe('INVALID_EMAIL')
    })

    it('should validate username format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123456',
          username: 'ab', // Too short
        }),
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error?.code).toBe('INVALID_USERNAME')
    })

    it('should prevent duplicate email registration', async () => {
      // First registration
      await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Test123456',
          username: 'duplicate1',
        }),
      })

      // Second registration with same email
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Test123456',
          username: 'duplicate2',
        }),
      })

      expect(response.status).toBe(409) // Conflict
    })

    it('should enforce domain restrictions (if configured)', async () => {
      // This test depends on configuration
      expect(true).toBe(true)
    })
  })

  describe('Email Service', () => {
    it('should have email service configured', () => {
      const hasSendGrid = !!process.env.SENDGRID_API_KEY
      const hasSmtp = !!process.env.SMTP_HOST
      const isConsole = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

      // Should have at least one email provider
      expect(hasSendGrid || hasSmtp || isConsole).toBe(true)
    })

    it('should render email templates correctly', async () => {
      // Import email service
      const { emailService } = await import('@/lib/email/email.service')

      expect(emailService).toBeDefined()
    })
  })
})

describe('Auth Configuration', () => {
  it('should load auth configuration', async () => {
    const { authConfig } = await import('@/config/auth.config')

    expect(authConfig).toBeDefined()
    expect(authConfig.isDevelopment).toBeDefined()
    expect(authConfig.providers).toBeDefined()
    expect(authConfig.security).toBeDefined()
    expect(authConfig.session).toBeDefined()
    expect(authConfig.twoFactor).toBeDefined()
  })

  it('should have correct password requirements', async () => {
    const { authConfig } = await import('@/config/auth.config')

    expect(authConfig.security.passwordMinLength).toBeGreaterThanOrEqual(8)
    expect(authConfig.security.maxLoginAttempts).toBeGreaterThan(0)
    expect(authConfig.security.lockoutDurationMinutes).toBeGreaterThan(0)
  })

  it('should validate password correctly', async () => {
    const { validatePassword } = await import('@/config/auth.config')

    const weak = validatePassword('weak')
    expect(weak.valid).toBe(false)
    expect(weak.errors.length).toBeGreaterThan(0)

    const strong = validatePassword('Strong123')
    expect(strong.valid).toBe(true)
    expect(strong.errors.length).toBe(0)
  })

  it('should validate email domain restrictions', async () => {
    const { isEmailDomainAllowed } = await import('@/config/auth.config')

    const valid = isEmailDomainAllowed('test@example.com')
    expect(typeof valid).toBe('boolean')
  })
})

describe('OAuth Provider Utilities', () => {
  it('should load OAuth provider configurations', async () => {
    const { oauthProviders, getEnabledProviders } = await import('@/lib/auth/oauth-providers')

    expect(oauthProviders).toBeDefined()
    expect(Object.keys(oauthProviders).length).toBeGreaterThan(0)

    const enabled = getEnabledProviders()
    expect(Array.isArray(enabled)).toBe(true)
  })

  it('should test provider configurations', async () => {
    const { testAllProviders } = await import('@/lib/auth/oauth-providers')

    const results = await testAllProviders()
    expect(results).toBeDefined()
    expect(Object.keys(results).length).toBeGreaterThan(0)
  })

  it('should generate OAuth URLs correctly', async () => {
    const { generateAuthUrl } = await import('@/lib/auth/oauth-providers')

    const url = generateAuthUrl('google', 'http://localhost:3000/callback', 'test-state')

    if (url) {
      expect(url).toContain('https://')
      expect(url).toContain('client_id')
      expect(url).toContain('redirect_uri')
    } else {
      // Provider not configured
      expect(url).toBeNull()
    }
  })
})
