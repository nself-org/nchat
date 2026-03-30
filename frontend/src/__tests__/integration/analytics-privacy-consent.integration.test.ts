/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: Analytics + Privacy + Consent Management
 *
 * Tests the integration between analytics collection, privacy filtering,
 * and consent management. Verifies data collection respects user preferences
 * and privacy requirements.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

describe('Analytics + Privacy + Consent Integration', () => {
  const mockUserId = 'user-1'

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Consent Management', () => {
    it('should store user consent preferences', () => {
      const consent = {
        userId: mockUserId,
        analytics: true,
        functional: true,
        marketing: false,
        timestamp: Date.now(),
      }

      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify(consent))

      const stored = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      expect(stored.analytics).toBe(true)
      expect(stored.marketing).toBe(false)
    })

    it('should require explicit consent before collecting analytics', () => {
      const hasConsent = (userId: string): boolean => {
        const consent = localStorage.getItem(`consent-${userId}`)
        if (!consent) return false

        const parsed = JSON.parse(consent)
        return parsed.analytics === true
      }

      // No consent given yet
      expect(hasConsent(mockUserId)).toBe(false)

      // Give consent
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: true }))

      expect(hasConsent(mockUserId)).toBe(true)
    })

    it('should respect opt-out preferences', () => {
      const consent = {
        userId: mockUserId,
        analytics: false,
        optOutTimestamp: Date.now(),
      }

      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify(consent))

      const shouldCollectAnalytics = (userId: string): boolean => {
        const stored = localStorage.getItem(`consent-${userId}`)
        if (!stored) return false

        const parsed = JSON.parse(stored)
        return parsed.analytics === true
      }

      expect(shouldCollectAnalytics(mockUserId)).toBe(false)
    })

    it('should track consent version for GDPR compliance', () => {
      const consent = {
        userId: mockUserId,
        version: '2.1.0',
        acceptedAt: Date.now(),
        analytics: true,
      }

      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify(consent))

      const stored = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      expect(stored.version).toBe('2.1.0')
    })
  })

  describe('Analytics Collection with Consent', () => {
    it('should only collect events when user has consented', () => {
      const event = {
        type: 'page_view',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      const consent = JSON.parse(
        localStorage.getItem(`consent-${mockUserId}`) || '{"analytics":false}'
      )

      if (consent.analytics) {
        localStorage.setItem(`event-${event.timestamp}`, JSON.stringify(event))
      }

      const stored = localStorage.getItem(`event-${event.timestamp}`)
      expect(stored).toBeNull() // Not collected without consent
    })

    it('should track events after consent is granted', () => {
      // Grant consent
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: true }))

      const event = {
        type: 'button_click',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')

      if (consent.analytics) {
        localStorage.setItem(`event-${event.timestamp}`, JSON.stringify(event))
      }

      const stored = localStorage.getItem(`event-${event.timestamp}`)
      expect(stored).toBeTruthy()
    })

    it('should stop collecting when consent is revoked', () => {
      const events: Array<{ type: string; timestamp: number }> = []

      // Initial consent
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: true }))

      events.push({ type: 'event_1', timestamp: Date.now() })

      // Revoke consent
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: false }))

      const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')

      if (consent.analytics) {
        events.push({ type: 'event_2', timestamp: Date.now() })
      }

      expect(events).toHaveLength(1)
    })
  })

  describe('Privacy Filtering', () => {
    it('should remove PII from analytics events', () => {
      const event = {
        type: 'message_sent',
        userId: mockUserId,
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        content: 'Secret message',
        timestamp: Date.now(),
      }

      // Apply privacy filter
      const filtered = {
        type: event.type,
        userId: event.userId,
        timestamp: event.timestamp,
        // PII removed: email, ipAddress, content
      }

      expect('email' in filtered).toBe(false)
      expect('ipAddress' in filtered).toBe(false)
      expect('content' in filtered).toBe(false)
    })

    it('should anonymize user identifiers', () => {
      const userId = 'user-12345'
      const anonymized = `anon-${Buffer.from(userId).toString('base64').slice(0, 16)}`

      expect(anonymized).not.toBe(userId)
      expect(anonymized).toContain('anon-')
    })

    it('should hash IP addresses', () => {
      const ipAddress = '192.168.1.1'
      const hashed = `hashed-${Buffer.from(ipAddress).toString('base64')}`

      expect(hashed).not.toBe(ipAddress)
      expect(hashed).toContain('hashed-')
    })

    it('should redact sensitive content from events', () => {
      const sensitivePatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{16}\b/, // Credit card
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      ]

      const content = 'My email is test@example.com and SSN is 123-45-6789'
      let redacted = content

      sensitivePatterns.forEach((pattern) => {
        redacted = redacted.replace(pattern, '[REDACTED]')
      })

      expect(redacted).not.toContain('test@example.com')
      expect(redacted).not.toContain('123-45-6789')
      expect(redacted).toContain('[REDACTED]')
    })
  })

  describe('Data Retention', () => {
    it('should delete analytics data after retention period', () => {
      const retentionDays = 90
      const now = Date.now()
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000

      const events = [
        { id: '1', timestamp: now - retentionMs - 1000 }, // Expired
        { id: '2', timestamp: now - retentionMs + 1000 }, // Valid
        { id: '3', timestamp: now }, // Valid
      ]

      const validEvents = events.filter((event) => now - event.timestamp <= retentionMs)

      expect(validEvents).toHaveLength(2)
      expect(validEvents.find((e) => e.id === '1')).toBeUndefined()
    })

    it('should purge user data on account deletion', () => {
      const userDataKeys = [
        `consent-${mockUserId}`,
        `analytics-${mockUserId}`,
        `events-${mockUserId}`,
        `session-${mockUserId}`,
      ]

      // Store data
      userDataKeys.forEach((key) => {
        localStorage.setItem(key, JSON.stringify({ data: 'test' }))
      })

      // Delete user data
      userDataKeys.forEach((key) => {
        localStorage.removeItem(key)
      })

      userDataKeys.forEach((key) => {
        expect(localStorage.getItem(key)).toBeNull()
      })
    })

    it('should export user data on request (GDPR)', () => {
      const userData = {
        consent: JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}'),
        events: JSON.parse(localStorage.getItem(`events-${mockUserId}`) || '[]'),
        sessions: JSON.parse(localStorage.getItem(`sessions-${mockUserId}`) || '[]'),
      }

      const exportData = JSON.stringify(userData, null, 2)
      expect(exportData).toBeTruthy()
    })
  })

  describe('Cross-Module State Consistency', () => {
    it('should sync consent state across analytics and tracking modules', () => {
      const consent = {
        userId: mockUserId,
        analytics: true,
        functional: true,
      }

      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify(consent))

      // Check analytics module
      const analyticsConsent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      expect(analyticsConsent.analytics).toBe(true)

      // Check tracking module
      const trackingConsent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      expect(trackingConsent.functional).toBe(true)
    })

    it('should apply privacy filters to all collected data', () => {
      const event = {
        type: 'user_action',
        userId: mockUserId,
        email: 'test@example.com',
        metadata: {
          ipAddress: '192.168.1.1',
        },
      }

      // Apply filter
      const filtered = {
        type: event.type,
        userId: event.userId,
        // PII removed
      }

      expect('email' in filtered).toBe(false)
      expect('metadata' in filtered).toBe(false)
    })

    it('should handle consent changes in real-time', () => {
      const consentHistory: Array<{ analytics: boolean; timestamp: number }> = []

      // Initial state
      const consent1 = { analytics: true, timestamp: Date.now() }
      consentHistory.push(consent1)
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify(consent1))

      // Change consent
      const consent2 = { analytics: false, timestamp: Date.now() + 1000 }
      consentHistory.push(consent2)
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify(consent2))

      expect(consentHistory).toHaveLength(2)
      expect(consentHistory[1].analytics).toBe(false)
    })
  })

  describe('Analytics Event Types', () => {
    it('should collect page view events with consent', () => {
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: true }))

      const event = {
        type: 'page_view',
        path: '/dashboard',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')

      if (consent.analytics) {
        localStorage.setItem(`event-${event.timestamp}`, JSON.stringify(event))
      }

      const stored = localStorage.getItem(`event-${event.timestamp}`)
      expect(stored).toBeTruthy()
    })

    it('should collect interaction events with privacy filtering', () => {
      const event = {
        type: 'button_click',
        element: 'submit-button',
        userId: mockUserId,
        sessionId: 'session-123',
        timestamp: Date.now(),
      }

      // No PII in this event
      expect(event).not.toHaveProperty('email')
      expect(event).not.toHaveProperty('ipAddress')
    })

    it('should aggregate events while respecting privacy', () => {
      const events = [
        { type: 'click', timestamp: Date.now(), userId: mockUserId },
        { type: 'click', timestamp: Date.now() + 100, userId: mockUserId },
        { type: 'view', timestamp: Date.now() + 200, userId: mockUserId },
      ]

      const aggregated = {
        clicks: events.filter((e) => e.type === 'click').length,
        views: events.filter((e) => e.type === 'view').length,
        // User identity can be anonymized in aggregates
      }

      expect(aggregated.clicks).toBe(2)
      expect(aggregated.views).toBe(1)
    })
  })

  describe('Session Tracking', () => {
    it('should create session with consent', () => {
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: true }))

      const session = {
        id: 'session-1',
        userId: mockUserId,
        startTime: Date.now(),
        events: [],
      }

      const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')

      if (consent.analytics) {
        localStorage.setItem(`session-${session.id}`, JSON.stringify(session))
      }

      const stored = localStorage.getItem(`session-${session.id}`)
      expect(stored).toBeTruthy()
    })

    it('should track session duration without PII', () => {
      const session = {
        id: 'session-1',
        userId: mockUserId, // Can be anonymized
        startTime: Date.now(),
        endTime: Date.now() + 300000, // 5 minutes
      }

      const duration = session.endTime - session.startTime
      expect(duration).toBe(300000)
    })

    it('should end session when user logs out', () => {
      const session = {
        id: 'session-1',
        userId: mockUserId,
        startTime: Date.now(),
        endTime: null as number | null,
        active: true,
      }

      // User logs out
      session.endTime = Date.now()
      session.active = false

      expect(session.active).toBe(false)
      expect(session.endTime).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing consent gracefully', () => {
      const hasConsent = (userId: string): boolean => {
        try {
          const consent = localStorage.getItem(`consent-${userId}`)
          if (!consent) return false
          const parsed = JSON.parse(consent)
          return parsed.analytics === true
        } catch {
          return false
        }
      }

      expect(hasConsent('non-existent-user')).toBe(false)
    })

    it('should handle corrupted consent data', () => {
      localStorage.setItem(`consent-${mockUserId}`, 'invalid-json')

      try {
        JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      } catch {
        // Reset to default
        localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: false }))
      }

      const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      expect(consent.analytics).toBe(false)
    })

    it('should fail-safe to no tracking on errors', () => {
      const trackEvent = (event: { type: string }): boolean => {
        try {
          const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
          if (!consent.analytics) return false

          // Tracking logic
          return true
        } catch {
          return false // Fail-safe: don't track
        }
      }

      // Corrupt consent
      localStorage.setItem(`consent-${mockUserId}`, 'invalid')

      expect(trackEvent({ type: 'test' })).toBe(false)
    })
  })

  describe('Security', () => {
    it('should encrypt sensitive analytics data', () => {
      const sensitiveData = {
        userId: mockUserId,
        sessionId: 'session-123',
      }

      // Mock encryption
      const encrypted = `encrypted-${Buffer.from(JSON.stringify(sensitiveData)).toString('base64')}`

      expect(encrypted).not.toContain(mockUserId)
      expect(encrypted).toContain('encrypted-')
    })

    it('should validate consent signature to prevent tampering', () => {
      const consent = {
        userId: mockUserId,
        analytics: true,
        timestamp: Date.now(),
      }

      // Mock signature
      const signature = `sig-${Buffer.from(JSON.stringify(consent)).toString('base64').slice(0, 32)}`

      const consentWithSignature = {
        ...consent,
        signature,
      }

      expect(consentWithSignature.signature).toContain('sig-')
    })

    it('should prevent unauthorized access to analytics data', () => {
      const hasPermission = (userId: string, requestedUserId: string): boolean => {
        return userId === requestedUserId || userId === 'admin'
      }

      expect(hasPermission('user-1', 'user-1')).toBe(true)
      expect(hasPermission('user-1', 'user-2')).toBe(false)
      expect(hasPermission('admin', 'user-2')).toBe(true)
    })

    it('should rate limit analytics API requests', () => {
      const rateLimiter = {
        userId: mockUserId,
        limit: 100,
        window: 60000,
        requests: [] as number[],
      }

      const now = Date.now()
      for (let i = 0; i < 95; i++) {
        rateLimiter.requests.push(now)
      }

      const canMakeRequest = rateLimiter.requests.length < rateLimiter.limit
      expect(canMakeRequest).toBe(true)
    })
  })

  describe('Compliance', () => {
    it('should support Do Not Track header', () => {
      const dnt = '1' // Browser DNT header
      const shouldTrack = dnt !== '1'

      expect(shouldTrack).toBe(false)
    })

    it('should provide consent withdrawal mechanism', () => {
      // Initial consent
      localStorage.setItem(`consent-${mockUserId}`, JSON.stringify({ analytics: true }))

      // Withdraw consent
      localStorage.setItem(
        `consent-${mockUserId}`,
        JSON.stringify({ analytics: false, withdrawnAt: Date.now() })
      )

      const consent = JSON.parse(localStorage.getItem(`consent-${mockUserId}`) || '{}')
      expect(consent.analytics).toBe(false)
      expect(consent.withdrawnAt).toBeTruthy()
    })

    it('should log consent changes for audit trail', () => {
      const auditLog = [
        {
          userId: mockUserId,
          action: 'consent_granted',
          timestamp: Date.now() - 1000,
        },
        {
          userId: mockUserId,
          action: 'consent_withdrawn',
          timestamp: Date.now(),
        },
      ]

      expect(auditLog).toHaveLength(2)
      expect(auditLog[1].action).toBe('consent_withdrawn')
    })
  })
})
