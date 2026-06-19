/**
 * Jest Setup File for nchat
 *
 * This file runs before each test file and sets up:
 * - Testing Library matchers
 * - Global mocks (navigation, browser APIs)
 * - Environment variables
 * - Store cleanup
 */

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Enable Immer's MapSet plugin for stores that use Map/Set
import { enableMapSet } from 'immer'
enableMapSet()

// ============================================================================
// Accessibility Testing (jest-axe)
// ============================================================================

import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

// ============================================================================
// Mock Next.js Router
// ============================================================================

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
  notFound: jest.fn(),
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}))

// ============================================================================
// Mock Next.js Server Components
// ============================================================================

jest.mock('next/server', () => {
  const createMockHeaders = (init) => {
    const headers = new Map()
    if (init && typeof init === 'object') {
      if (init instanceof Map) {
        init.forEach((value, key) => headers.set(key.toLowerCase(), value))
      } else if (init.entries) {
        for (const [key, value] of init.entries()) {
          headers.set(key.toLowerCase(), value)
        }
      } else {
        Object.entries(init).forEach(([key, value]) => headers.set(key.toLowerCase(), value))
      }
    }
    return {
      get: (key) => headers.get(key.toLowerCase()) || null,
      set: (key, value) => headers.set(key.toLowerCase(), value),
      has: (key) => headers.has(key.toLowerCase()),
      delete: (key) => headers.delete(key.toLowerCase()),
      forEach: (cb) => headers.forEach(cb),
      entries: () => headers.entries(),
      keys: () => headers.keys(),
      values: () => headers.values(),
    }
  }

  return {
    NextRequest: jest.fn().mockImplementation((url, init = {}) => {
      const parsedUrl = typeof url === 'string' ? new URL(url) : url
      // Parse body if it's a JSON string
      let parsedBody = init.body || {}
      if (typeof parsedBody === 'string') {
        try {
          parsedBody = JSON.parse(parsedBody)
        } catch (e) {
          // If parsing fails, keep as string
        }
      }
      return {
        nextUrl: parsedUrl,
        url: parsedUrl.toString(),
        method: init.method || 'GET',
        headers: createMockHeaders(init.headers),
        json: jest.fn().mockResolvedValue(parsedBody),
      }
    }),
    NextResponse: {
      json: jest.fn((body, init = {}) => ({
        status: init.status || 200,
        json: jest.fn().mockResolvedValue(body),
        body,
      })),
      redirect: jest.fn((url) => ({
        status: 302,
        headers: { Location: url.toString() },
      })),
      next: jest.fn(() => ({})),
    },
  }
})

// ============================================================================
// Mock Environment Variables
// ============================================================================

process.env.NEXT_PUBLIC_APP_NAME = 'nchat'
process.env.NEXT_PUBLIC_APP_TAGLINE = 'Team Communication Platform'
process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL = 'http://localhost:1337/v1/graphql'
process.env.NEXT_PUBLIC_USE_DEV_AUTH = 'true'
process.env.NEXT_PUBLIC_ENV = 'test'

// ============================================================================
// Mock Browser APIs (only in jsdom environment)
// ============================================================================

if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock scrollTo
  window.scrollTo = jest.fn()
}

if (typeof Element !== 'undefined') {
  Element.prototype.scrollTo = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
  // Mock pointer capture methods for Radix UI compatibility in jsdom
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
}

if (typeof navigator !== 'undefined') {
  // Mock clipboard API - use configurable to allow user-event to redefine it
  // This is needed because @testing-library/user-event needs to attach its own clipboard stub
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(''),
        write: jest.fn().mockResolvedValue(undefined),
        read: jest.fn().mockResolvedValue([]),
      },
    })
  }

  // Mock serviceWorker API for push notifications
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(null),
          subscribe: jest.fn().mockResolvedValue({
            endpoint: 'https://push.example.com/mock',
            expirationTime: null,
            getKey: jest.fn(),
            toJSON: jest.fn().mockReturnValue({
              endpoint: 'https://push.example.com/mock',
              keys: { p256dh: 'mock-key', auth: 'mock-auth' },
            }),
            unsubscribe: jest.fn().mockResolvedValue(true),
          }),
        },
        active: { postMessage: jest.fn() },
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      register: jest.fn().mockResolvedValue({
        scope: '/',
        active: { postMessage: jest.fn() },
      }),
      getRegistration: jest.fn().mockResolvedValue(undefined),
      getRegistrations: jest.fn().mockResolvedValue([]),
      controller: null,
    },
  })
}

// Mock Notification API
if (typeof global.Notification === 'undefined') {
  global.Notification = class MockNotification {
    static permission = 'default'
    static requestPermission = jest.fn().mockResolvedValue('granted')
    static maxActions = 2

    constructor(title, options = {}) {
      this.title = title
      this.options = options
      this.body = options.body || ''
      this.icon = options.icon || ''
      this.tag = options.tag || ''
      this.data = options.data || null
    }

    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
}

// Mock ResizeObserver (global, works in both environments)
global.ResizeObserver =
  global.ResizeObserver ||
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

// Mock IntersectionObserver (global, works in both environments)
global.IntersectionObserver =
  global.IntersectionObserver ||
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: jest.fn(() => []),
  }))

// Mock URL.createObjectURL (only if URL exists)
if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = jest.fn()
}

// Mock Blob methods (only if Blob exists)
if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer === 'undefined') {
  Blob.prototype.arrayBuffer = jest.fn(async function () {
    // Return a mock ArrayBuffer with audio data
    const buffer = new ArrayBuffer(44100 * 2) // 1 second of 16-bit audio at 44.1kHz
    const view = new Int16Array(buffer)
    // Fill with some mock audio data (sine wave)
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.sin(i / 10) * 32767
    }
    return buffer
  })

  Blob.prototype.text = jest.fn(async function () {
    return 'mock text content'
  })

  Blob.prototype.slice = jest.fn(function (start, end, contentType) {
    return new Blob([], { type: contentType || this.type })
  })
}

// ============================================================================
// Real Crypto API (Node.js webcrypto for E2EE tests)
// ============================================================================

// Use Node.js webcrypto for real cryptographic operations
// This is needed for E2EE tests that use Web Crypto API
const { webcrypto } = require('crypto')

Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
})

// ============================================================================
// Mock TextEncoder/TextDecoder (needed for crypto operations)
// ============================================================================

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const buf = new ArrayBuffer(str.length)
      const bufView = new Uint8Array(buf)
      for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i)
      }
      return bufView
    }
  }
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(arr) {
      return String.fromCharCode.apply(null, new Uint8Array(arr))
    }
  }
}

// ============================================================================
// Mock requestAnimationFrame (only if not already defined)
// ============================================================================

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => setTimeout(callback, 0)
  global.cancelAnimationFrame = (id) => clearTimeout(id)
}

// ============================================================================
// Mock AudioContext (only if not already defined)
// ============================================================================

if (typeof global.AudioContext === 'undefined') {
  global.AudioContext = jest.fn().mockImplementation(() => ({
    createBufferSource: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
    })),
    createAnalyser: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
      getFloatFrequencyData: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
    })),
    createGain: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: { value: 1, setValueAtTime: jest.fn() },
    })),
    decodeAudioData: jest.fn((arrayBuffer) => {
      // Create a mock AudioBuffer
      const sampleRate = 44100
      const length = arrayBuffer.byteLength / 2 // Assuming 16-bit audio
      const numberOfChannels = 1

      const mockBuffer = {
        sampleRate,
        length,
        duration: length / sampleRate,
        numberOfChannels,
        getChannelData: jest.fn((channel) => {
          const data = new Float32Array(length)
          // Fill with mock sine wave data
          for (let i = 0; i < length; i++) {
            data[i] = Math.sin(i / 10) * 0.5
          }
          return data
        }),
        copyFromChannel: jest.fn(),
        copyToChannel: jest.fn(),
      }

      return Promise.resolve(mockBuffer)
    }),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    resume: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  }))

  // Also mock webkitAudioContext for Safari
  global.webkitAudioContext = global.AudioContext
}

// ============================================================================
// Mock MediaStream and MediaStreamTrack (for WebRTC tests)
// ============================================================================

if (typeof global.MediaStream === 'undefined') {
  global.MediaStreamTrack = class MockMediaStreamTrack {
    constructor(kind = 'audio') {
      this.id = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      this.kind = kind
      this.enabled = true
      this.muted = false
      this.readyState = 'live'
      this.label = `Mock ${kind} track`
    }
    stop() {}
    clone() {
      return new MockMediaStreamTrack(this.kind)
    }
    getSettings() {
      return {}
    }
    getCapabilities() {
      return {}
    }
    getConstraints() {
      return {}
    }
    applyConstraints() {
      return Promise.resolve()
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true
    }
  }

  global.MediaStream = class MockMediaStream {
    constructor(tracksOrStream = []) {
      this.id = `stream-${Date.now()}`
      this.active = true
      this._tracks = Array.isArray(tracksOrStream) ? tracksOrStream : tracksOrStream._tracks || []
    }
    getTracks() {
      return this._tracks
    }
    getAudioTracks() {
      return this._tracks.filter((t) => t.kind === 'audio')
    }
    getVideoTracks() {
      return this._tracks.filter((t) => t.kind === 'video')
    }
    addTrack(track) {
      this._tracks.push(track)
    }
    removeTrack(track) {
      const index = this._tracks.indexOf(track)
      if (index > -1) this._tracks.splice(index, 1)
    }
    clone() {
      return new MockMediaStream(this._tracks.map((t) => t.clone()))
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true
    }
  }
}

// ============================================================================
// Global fetch mock (service tests call real fetch; polyfill for JSDOM env)
// Tests that need specific responses should override with jest.spyOn(global, 'fetch').
// ============================================================================

if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  )
}

// ============================================================================
// Console Error Suppression for Expected Errors
// ============================================================================

const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  // Suppress React act() warnings in tests
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('not wrapped in act'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') || args[0].includes('componentWillUpdate'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// ============================================================================
// Global Test Cleanup
// ============================================================================

afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks()

  // Clear localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }

  // Clear sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear()
  }
})
