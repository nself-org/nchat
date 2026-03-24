/**
 * Analytics Client Tests
 *
 * Tests for the core analytics client including tracking, identification,
 * queuing, and flushing functionality.
 */

import {
  AnalyticsClient,
  getAnalyticsClient,
  resetAnalyticsClient,
  trackEvent,
  identifyUser,
  trackPageView,
  flushAnalytics,
  AnalyticsClientConfig,
  UserTraits,
} from '../analytics-client'
import { AnalyticsEvent, EventCategory } from '../event-schema'
import { ConsentCategory, ConsentState, CONSENT_VERSION } from '../privacy-filter'

// ============================================================================
// Mocks
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// ============================================================================
// Test Helpers
// ============================================================================

const createConsentState = (analytics: boolean): ConsentState => ({
  [ConsentCategory.ESSENTIAL]: true,
  [ConsentCategory.ANALYTICS]: analytics,
  [ConsentCategory.FUNCTIONAL]: false,
  [ConsentCategory.MARKETING]: false,
  timestamp: Date.now(),
  version: CONSENT_VERSION,
})

const createTestConfig = (
  overrides: Partial<AnalyticsClientConfig> = {}
): Partial<AnalyticsClientConfig> => ({
  appVersion: '1.0.0',
  platform: 'web',
  debug: false,
  enabled: true,
  batchSize: 5,
  flushInterval: 0, // Disable auto-flush for tests
  maxQueueSize: 10,
  respectDoNotTrack: false,
  ...overrides,
})

// ============================================================================
// Setup/Teardown
// ============================================================================

describe('Analytics Client', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorageMock.clear()
    sessionStorageMock.clear()
    jest.clearAllMocks()
    resetAnalyticsClient()
  })

  afterEach(() => {
    resetAnalyticsClient()
    jest.useRealTimers()
  })

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new AnalyticsClient()
      const config = client.getConfig()
      expect(config.appVersion).toBeDefined()
      expect(config.platform).toBe('web')
      expect(config.enabled).toBe(true)
    })

    it('should merge custom config', () => {
      const client = new AnalyticsClient({
        appVersion: '2.0.0',
        debug: true,
      })
      const config = client.getConfig()
      expect(config.appVersion).toBe('2.0.0')
      expect(config.debug).toBe(true)
    })

    it('should initialize state', () => {
      const client = new AnalyticsClient(createTestConfig())
      const state = client.getState()
      expect(state.initialized).toBe(false)
      expect(state.anonymousId).toBeDefined()
      expect(state.sessionId).toBeDefined()
      expect(state.queue).toEqual([])
    })

    it('should generate anonymous ID', () => {
      const client = new AnalyticsClient(createTestConfig())
      const state = client.getState()
      expect(state.anonymousId).toMatch(/^anon_/)
    })

    it('should generate session ID', () => {
      const client = new AnalyticsClient(createTestConfig())
      const state = client.getState()
      expect(state.sessionId).toMatch(/^sess_/)
    })

    it('should persist anonymous ID', () => {
      const client1 = new AnalyticsClient(createTestConfig())
      const id1 = client1.getState().anonymousId

      const client2 = new AnalyticsClient(createTestConfig())
      const id2 = client2.getState().anonymousId

      expect(id1).toBe(id2)
    })
  })

  // ==========================================================================
  // Initialize Tests
  // ==========================================================================

  describe('initialize', () => {
    it('should initialize client', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      expect(client.getState().initialized).toBe(true)
    })

    it('should not initialize twice', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.initialize(createConsentState(true))
      expect(client.getState().initialized).toBe(true)
    })

    it('should store consent state', () => {
      const consent = createConsentState(true)
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(consent)
      expect(client.getState().consent).toEqual(consent)
    })
  })

  // ==========================================================================
  // Identify Tests
  // ==========================================================================

  describe('identify', () => {
    it('should identify user', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.identify('user-123')

      const state = client.getState()
      expect(state.userId).toBe('user-123')
    })

    it('should store user traits', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.identify('user-123', {
        displayName: 'John Doe',
        email: 'john@example.com',
      })

      const state = client.getState()
      expect(state.traits.displayName).toBe('John Doe')
      expect(state.traits.userId).toBe('user-123')
    })

    it('should filter sensitive traits', () => {
      const client = new AnalyticsClient(createTestConfig({ usePrivacyFilter: true }))
      client.initialize(createConsentState(true))
      client.identify('user-123', {
        displayName: 'John Doe',
        password: 'secret123',
      } as UserTraits)

      const state = client.getState()
      expect(state.traits.displayName).toBe('John Doe')
      expect(state.traits.password).toBe('[REDACTED]')
    })

    it('should not identify when disabled', () => {
      const client = new AnalyticsClient(createTestConfig({ enabled: false }))
      client.initialize(createConsentState(true))
      client.identify('user-123')

      const state = client.getState()
      expect(state.userId).toBeUndefined()
    })
  })

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe('reset', () => {
    it('should reset user identity', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.identify('user-123', { displayName: 'John' })

      client.reset()

      const state = client.getState()
      expect(state.userId).toBeUndefined()
      expect(state.traits).toEqual({})
    })

    it('should generate new anonymous ID', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      const oldId = client.getState().anonymousId

      client.reset()

      expect(client.getState().anonymousId).not.toBe(oldId)
    })

    it('should generate new session ID', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      const oldId = client.getState().sessionId

      client.reset()

      expect(client.getState().sessionId).not.toBe(oldId)
    })
  })

  // ==========================================================================
  // setTraits Tests
  // ==========================================================================

  describe('setTraits', () => {
    it('should update traits', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.setTraits({ plan: 'premium' })

      expect(client.getState().traits.plan).toBe('premium')
    })

    it('should merge with existing traits', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.setTraits({ plan: 'premium' })
      client.setTraits({ role: 'admin' })

      const traits = client.getState().traits
      expect(traits.plan).toBe('premium')
      expect(traits.role).toBe('admin')
    })
  })

  // ==========================================================================
  // Track Tests
  // ==========================================================================

  describe('track', () => {
    it('should track event', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      const event = client.track(AnalyticsEvent.PAGE_VIEW, {
        path: '/chat',
        title: 'Chat',
      })

      expect(event).not.toBeNull()
      expect(event?.name).toBe(AnalyticsEvent.PAGE_VIEW)
      expect(event?.properties.path).toBe('/chat')
    })

    it('should add event to queue', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(client.getQueueSize()).toBe(1)
    })

    it('should include base properties', () => {
      const client = new AnalyticsClient(createTestConfig({ appVersion: '1.2.3' }))
      client.initialize(createConsentState(true))
      client.identify('user-123')

      const event = client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(event?.base.appVersion).toBe('1.2.3')
      expect(event?.base.userId).toBe('user-123')
      expect(event?.base.sessionId).toBeDefined()
      expect(event?.base.timestamp).toBeDefined()
    })

    it('should include event category', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      const event = client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(event?.category).toBe(EventCategory.NAVIGATION)
    })

    it('should filter sensitive data', () => {
      const client = new AnalyticsClient(createTestConfig({ usePrivacyFilter: true }))
      client.initialize(createConsentState(true))

      const event = client.track(AnalyticsEvent.PAGE_VIEW, {
        path: '/chat',
        title: 'Chat',
        userEmail: 'test@example.com',
      } as Record<string, unknown>)

      expect(event?.properties.userEmail).not.toBe('test@example.com')
    })

    it('should not track when disabled', () => {
      const client = new AnalyticsClient(createTestConfig({ enabled: false }))
      client.initialize(createConsentState(true))

      const event = client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(event).toBeNull()
    })

    it('should not track without consent', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(false))

      const event = client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(event).toBeNull()
    })

    it('should call onEventTracked callback', () => {
      const onEventTracked = jest.fn()
      const client = new AnalyticsClient(createTestConfig({ onEventTracked }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(onEventTracked).toHaveBeenCalledTimes(1)
    })

    it('should auto-flush when batch size reached', async () => {
      const onFlush = jest.fn().mockResolvedValue(undefined)
      const client = new AnalyticsClient(createTestConfig({ batchSize: 2, onFlush }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/1', title: '1' })
      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/2', title: '2' })

      // Advance fake timers and flush microtask queue for async flush
      jest.advanceTimersByTime(100)
      await Promise.resolve()
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      expect(onFlush).toHaveBeenCalled()
    })

    it('should enforce max queue size', () => {
      const client = new AnalyticsClient(createTestConfig({ maxQueueSize: 3 }))
      client.initialize(createConsentState(true))

      for (let i = 0; i < 5; i++) {
        client.track(AnalyticsEvent.PAGE_VIEW, { path: `/${i}`, title: `${i}` })
      }

      expect(client.getQueueSize()).toBeLessThanOrEqual(3)
    })

    it('should flush immediately when option is set', async () => {
      const onFlush = jest.fn().mockResolvedValue(undefined)
      const client = new AnalyticsClient(createTestConfig({ onFlush }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' }, { immediate: true })

      // Advance fake timers and flush microtask queue for async flush
      jest.advanceTimersByTime(100)
      await Promise.resolve()
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      expect(onFlush).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Page Tests
  // ==========================================================================

  describe('page', () => {
    it('should track page view', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      const event = client.page('/chat', 'Chat Page')

      expect(event?.name).toBe(AnalyticsEvent.PAGE_VIEW)
      expect(event?.properties.path).toBe('/chat')
      expect(event?.properties.title).toBe('Chat Page')
    })

    it('should include additional properties', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      const event = client.page('/chat', 'Chat Page', { custom: 'value' })

      expect((event?.properties as Record<string, unknown>).custom).toBe('value')
    })
  })

  // ==========================================================================
  // Error Tests
  // ==========================================================================

  describe('error', () => {
    it('should track error event', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      const event = client.error('NetworkError', 'Failed to fetch')

      expect(event?.name).toBe(AnalyticsEvent.ERROR_OCCURRED)
      expect(event?.properties.errorType).toBe('NetworkError')
      expect(event?.properties.errorMessage).toBe('Failed to fetch')
    })

    it('should flush immediately', async () => {
      const onFlush = jest.fn().mockResolvedValue(undefined)
      const client = new AnalyticsClient(createTestConfig({ onFlush }))
      client.initialize(createConsentState(true))

      client.error('TestError', 'Test message')

      // Advance fake timers and flush microtask queue for async flush
      jest.advanceTimersByTime(100)
      await Promise.resolve()
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      expect(onFlush).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Flush Tests
  // ==========================================================================

  describe('flush', () => {
    it('should flush events', async () => {
      const onFlush = jest.fn().mockResolvedValue(undefined)
      const client = new AnalyticsClient(createTestConfig({ onFlush }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })
      await client.flush()

      expect(onFlush).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: AnalyticsEvent.PAGE_VIEW })])
      )
    })

    it('should clear queue after flush', async () => {
      const onFlush = jest.fn().mockResolvedValue(undefined)
      const client = new AnalyticsClient(createTestConfig({ onFlush }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })
      await client.flush()

      expect(client.getQueueSize()).toBe(0)
    })

    it('should not flush when queue is empty', async () => {
      const onFlush = jest.fn().mockResolvedValue(undefined)
      const client = new AnalyticsClient(createTestConfig({ onFlush }))
      client.initialize(createConsentState(true))

      await client.flush()

      expect(onFlush).not.toHaveBeenCalled()
    })

    it('should restore queue on flush failure', async () => {
      const onFlush = jest.fn().mockRejectedValue(new Error('Network error'))
      const onError = jest.fn()
      const client = new AnalyticsClient(createTestConfig({ onFlush, onError }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })
      await client.flush()

      expect(client.getQueueSize()).toBe(1)
      expect(onError).toHaveBeenCalled()
    })

    it('should not flush while already flushing', async () => {
      let flushCount = 0
      const onFlush = jest.fn().mockImplementation(async () => {
        flushCount++
        // Simulate async work with a resolved promise (no real timer needed)
        await Promise.resolve()
      })
      const client = new AnalyticsClient(createTestConfig({ onFlush }))
      client.initialize(createConsentState(true))

      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/1', title: '1' })

      // Start multiple flushes concurrently
      const p1 = client.flush()
      const p2 = client.flush()
      const p3 = client.flush()

      await p1
      await p2
      await p3

      expect(flushCount).toBe(1)
    })
  })

  // ==========================================================================
  // Consent Tests
  // ==========================================================================

  describe('setConsent', () => {
    it('should update consent state', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(false))

      const newConsent = createConsentState(true)
      client.setConsent(newConsent)

      expect(client.getState().consent).toEqual(newConsent)
    })

    it('should clear queue when analytics consent removed', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      client.setConsent(createConsentState(false))

      expect(client.getQueueSize()).toBe(0)
    })
  })

  // ==========================================================================
  // isEnabled Tests
  // ==========================================================================

  describe('isEnabled', () => {
    it('should return true when enabled with consent', () => {
      const client = new AnalyticsClient(createTestConfig({ enabled: true }))
      client.initialize(createConsentState(true))
      expect(client.isEnabled()).toBe(true)
    })

    it('should return false when disabled', () => {
      const client = new AnalyticsClient(createTestConfig({ enabled: false }))
      client.initialize(createConsentState(true))
      expect(client.isEnabled()).toBe(false)
    })

    it('should return false without consent', () => {
      const client = new AnalyticsClient(createTestConfig({ enabled: true }))
      client.initialize(createConsentState(false))
      expect(client.isEnabled()).toBe(false)
    })
  })

  // ==========================================================================
  // Queue Management Tests
  // ==========================================================================

  describe('queue management', () => {
    it('should return queue copy', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      const queue = client.getQueue()
      queue.pop()

      expect(client.getQueueSize()).toBe(1)
    })

    it('should clear queue', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      client.clearQueue()

      expect(client.getQueueSize()).toBe(0)
    })
  })

  // ==========================================================================
  // Destroy Tests
  // ==========================================================================

  describe('destroy', () => {
    it('should mark as uninitialized', () => {
      const client = new AnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))

      client.destroy()

      expect(client.getState().initialized).toBe(false)
    })
  })

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe('singleton', () => {
    it('should return same instance', () => {
      const client1 = getAnalyticsClient()
      const client2 = getAnalyticsClient()
      expect(client1).toBe(client2)
    })

    it('should reset instance', () => {
      const client1 = getAnalyticsClient()
      resetAnalyticsClient()
      const client2 = getAnalyticsClient()
      expect(client1).not.toBe(client2)
    })
  })

  // ==========================================================================
  // Convenience Function Tests
  // ==========================================================================

  describe('convenience functions', () => {
    beforeEach(() => {
      resetAnalyticsClient()
      const client = getAnalyticsClient(createTestConfig())
      client.initialize(createConsentState(true))
    })

    describe('trackEvent', () => {
      it('should track event using singleton', () => {
        const event = trackEvent(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })
        expect(event).not.toBeNull()
        expect(event?.name).toBe(AnalyticsEvent.PAGE_VIEW)
      })
    })

    describe('identifyUser', () => {
      it('should identify user using singleton', () => {
        identifyUser('user-123', { displayName: 'John' })
        const state = getAnalyticsClient().getState()
        expect(state.userId).toBe('user-123')
      })
    })

    describe('trackPageView', () => {
      it('should track page view using singleton', () => {
        const event = trackPageView('/chat', 'Chat Page')
        expect(event?.name).toBe(AnalyticsEvent.PAGE_VIEW)
        expect(event?.properties.path).toBe('/chat')
      })
    })

    describe('flushAnalytics', () => {
      it('should flush using singleton', async () => {
        trackEvent(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })
        await flushAnalytics()
        expect(getAnalyticsClient().getQueueSize()).toBe(0)
      })
    })
  })

  // ==========================================================================
  // Queue Persistence Tests
  // ==========================================================================

  describe('queue persistence', () => {
    it('should persist queue to localStorage', () => {
      const client = new AnalyticsClient(createTestConfig({ persistQueue: true }))
      client.initialize(createConsentState(true))
      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should not persist when disabled', () => {
      localStorageMock.clear()
      jest.clearAllMocks()

      const client = new AnalyticsClient(createTestConfig({ persistQueue: false }))
      client.initialize(createConsentState(true))
      client.track(AnalyticsEvent.PAGE_VIEW, { path: '/chat', title: 'Chat' })

      // Should not be called for queue persistence
      const calls = (localStorage.setItem as jest.Mock).mock.calls
      const queueCalls = calls.filter(([key]: [string]) => key.includes('queue'))
      expect(queueCalls).toHaveLength(0)
    })
  })
})
