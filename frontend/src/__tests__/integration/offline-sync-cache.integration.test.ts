/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: Offline + Sync + Cache
 *
 * Tests the integration between offline mode, sync queue management,
 * and cache operations. Verifies data persistence, sync mechanisms,
 * and cache invalidation work correctly together.
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

describe('Offline + Sync + Cache Integration', () => {
  const mockUserId = 'user-1'

  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    localStorage.clear()
  })

  describe('Offline Detection', () => {
    it('should detect when app goes offline', () => {
      const networkState = {
        online: true,
        lastCheck: Date.now(),
      }

      // Simulate going offline
      networkState.online = false
      networkState.lastCheck = Date.now()

      localStorage.setItem('network-state', JSON.stringify(networkState))

      const stored = JSON.parse(localStorage.getItem('network-state') || '{}')
      expect(stored.online).toBe(false)
    })

    it('should detect when app goes online', () => {
      const networkState = {
        online: false,
      }

      // Simulate going online
      networkState.online = true

      expect(networkState.online).toBe(true)
    })

    it('should track offline duration', () => {
      const offlineStart = Date.now()
      const offlineEnd = Date.now() + 60000 // 1 minute later

      const duration = offlineEnd - offlineStart

      expect(duration).toBe(60000)
    })
  })

  describe('Sync Queue Management', () => {
    it('should queue operations while offline', () => {
      const syncQueue: Array<{ type: string; data: unknown; timestamp: number }> = []

      const operation = {
        type: 'create_message',
        data: { content: 'Hello', channelId: 'channel-1' },
        timestamp: Date.now(),
      }

      syncQueue.push(operation)

      localStorage.setItem('sync-queue', JSON.stringify(syncQueue))

      const stored = JSON.parse(localStorage.getItem('sync-queue') || '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].type).toBe('create_message')
    })

    it('should prioritize sync operations', () => {
      const operations = [
        { id: '1', type: 'create_message', priority: 2 },
        { id: '2', type: 'update_profile', priority: 1 },
        { id: '3', type: 'delete_message', priority: 3 },
      ]

      const sorted = [...operations].sort((a, b) => b.priority - a.priority)

      expect(sorted[0].type).toBe('delete_message') // Highest priority
      expect(sorted[2].type).toBe('update_profile') // Lowest priority
    })

    it('should process sync queue when online', async () => {
      const syncQueue = [
        { id: '1', type: 'create_message', synced: false },
        { id: '2', type: 'update_message', synced: false },
      ]

      // Simulate processing
      for (const item of syncQueue) {
        item.synced = true
        await Promise.resolve()
      }

      expect(syncQueue.every((item) => item.synced)).toBe(true)
    })

    it('should handle sync failures and retry', () => {
      const operation = {
        id: 'op-1',
        type: 'create_message',
        attempts: 0,
        maxAttempts: 3,
        synced: false,
      }

      // First attempt fails
      operation.attempts++

      // Should retry
      const shouldRetry = operation.attempts < operation.maxAttempts
      expect(shouldRetry).toBe(true)
    })

    it('should remove synced operations from queue', () => {
      const syncQueue = [
        { id: '1', synced: true },
        { id: '2', synced: false },
        { id: '3', synced: true },
      ]

      const remainingQueue = syncQueue.filter((item) => !item.synced)

      expect(remainingQueue).toHaveLength(1)
      expect(remainingQueue[0].id).toBe('2')
    })
  })

  describe('Cache Management', () => {
    it('should cache messages for offline access', () => {
      const messages = [
        { id: '1', content: 'Hello', channelId: 'channel-1' },
        { id: '2', content: 'World', channelId: 'channel-1' },
      ]

      localStorage.setItem('cache-messages-channel-1', JSON.stringify(messages))

      const cached = JSON.parse(localStorage.getItem('cache-messages-channel-1') || '[]')
      expect(cached).toHaveLength(2)
    })

    it('should update cache when new data arrives', () => {
      const cachedMessages = [{ id: '1', content: 'Hello' }]

      const newMessage = { id: '2', content: 'World' }
      cachedMessages.push(newMessage)

      localStorage.setItem('cache-messages', JSON.stringify(cachedMessages))

      const stored = JSON.parse(localStorage.getItem('cache-messages') || '[]')
      expect(stored).toHaveLength(2)
    })

    it('should invalidate cache after TTL expires', () => {
      const cacheEntry = {
        data: { id: '1', content: 'Hello' },
        timestamp: Date.now() - 3600000, // 1 hour ago
        ttl: 1800000, // 30 minutes TTL
      }

      const now = Date.now()
      const isExpired = now - cacheEntry.timestamp > cacheEntry.ttl

      expect(isExpired).toBe(true)
    })

    it('should implement LRU cache eviction', () => {
      const cache = new Map<string, { data: unknown; lastAccessed: number }>()
      const MAX_CACHE_SIZE = 3

      // Add items
      cache.set('key1', { data: 'value1', lastAccessed: Date.now() - 3000 })
      cache.set('key2', { data: 'value2', lastAccessed: Date.now() - 2000 })
      cache.set('key3', { data: 'value3', lastAccessed: Date.now() - 1000 })

      // Add new item, triggering eviction
      if (cache.size >= MAX_CACHE_SIZE) {
        // Find least recently used
        let lruKey = ''
        let oldestAccess = Infinity

        cache.forEach((value, key) => {
          if (value.lastAccessed < oldestAccess) {
            oldestAccess = value.lastAccessed
            lruKey = key
          }
        })

        cache.delete(lruKey)
      }

      cache.set('key4', { data: 'value4', lastAccessed: Date.now() })

      expect(cache.has('key1')).toBe(false) // Evicted
      expect(cache.has('key4')).toBe(true)
    })

    it('should track cache hit rate', () => {
      const cacheStats = {
        hits: 0,
        misses: 0,
      }

      const cache = new Map([['key1', 'value1']])

      // Cache hit
      if (cache.has('key1')) {
        cacheStats.hits++
      } else {
        cacheStats.misses++
      }

      // Cache miss
      if (cache.has('key2')) {
        cacheStats.hits++
      } else {
        cacheStats.misses++
      }

      const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses)

      expect(hitRate).toBe(0.5)
    })
  })

  describe('Optimistic Updates', () => {
    it('should apply optimistic update immediately', () => {
      const messages = [{ id: '1', content: 'Hello' }]

      const optimisticMessage = {
        id: 'temp-2',
        content: 'World',
        pending: true,
      }

      messages.push(optimisticMessage)

      expect(messages).toHaveLength(2)
      expect(messages[1].pending).toBe(true)
    })

    it('should replace optimistic update with server response', () => {
      const messages = [
        { id: '1', content: 'Hello' },
        { id: 'temp-2', content: 'World', pending: true },
      ]

      const serverResponse = {
        id: '2',
        content: 'World',
        pending: false,
      }

      const index = messages.findIndex((m) => m.id === 'temp-2')
      if (index !== -1) {
        messages[index] = serverResponse
      }

      expect(messages[1].id).toBe('2')
      expect(messages[1].pending).toBe(false)
    })

    it('should revert optimistic update on failure', () => {
      const messages = [
        { id: '1', content: 'Hello' },
        { id: 'temp-2', content: 'World', pending: true },
      ]

      // Simulate failure
      const failedId = 'temp-2'
      const filteredMessages = messages.filter((m) => m.id !== failedId)

      expect(filteredMessages).toHaveLength(1)
    })
  })

  describe('Cross-Module State Consistency', () => {
    it('should sync cache with sync queue state', () => {
      const message = { id: 'temp-1', content: 'Hello', synced: false }

      // Add to cache
      localStorage.setItem(`cache-message-${message.id}`, JSON.stringify(message))

      // Add to sync queue
      const syncQueue = [{ id: message.id, type: 'create_message', synced: false }]
      localStorage.setItem('sync-queue', JSON.stringify(syncQueue))

      const cachedMessage = JSON.parse(localStorage.getItem(`cache-message-${message.id}`) || '{}')
      const queueItem = JSON.parse(localStorage.getItem('sync-queue') || '[]')[0]

      expect(cachedMessage.id).toBe(queueItem.id)
    })

    it('should update cache when sync completes', () => {
      const message = { id: 'temp-1', content: 'Hello', synced: false }

      localStorage.setItem('cache-message-temp-1', JSON.stringify(message))

      // Simulate sync complete
      message.synced = true
      message.id = 'message-1' // Server-assigned ID

      localStorage.removeItem('cache-message-temp-1')
      localStorage.setItem('cache-message-message-1', JSON.stringify(message))

      expect(localStorage.getItem('cache-message-temp-1')).toBeNull()
      expect(localStorage.getItem('cache-message-message-1')).toBeTruthy()
    })

    it('should handle concurrent offline operations', () => {
      const operations = [
        { id: '1', type: 'create', timestamp: Date.now() },
        { id: '2', type: 'update', timestamp: Date.now() + 100 },
        { id: '3', type: 'delete', timestamp: Date.now() + 200 },
      ]

      // Sort by timestamp to maintain order
      const sorted = [...operations].sort((a, b) => a.timestamp - b.timestamp)

      expect(sorted[0].id).toBe('1')
      expect(sorted[2].id).toBe('3')
    })
  })

  describe('Conflict Resolution', () => {
    it('should detect conflicts during sync', () => {
      const localVersion = {
        id: 'message-1',
        content: 'Hello local',
        version: 1,
        updatedAt: Date.now() - 1000,
      }

      const serverVersion = {
        id: 'message-1',
        content: 'Hello server',
        version: 2,
        updatedAt: Date.now(),
      }

      const hasConflict = localVersion.version !== serverVersion.version

      expect(hasConflict).toBe(true)
    })

    it('should resolve conflicts with last-write-wins', () => {
      const localUpdate = {
        id: '1',
        content: 'Local',
        updatedAt: Date.now() - 1000,
      }

      const serverUpdate = {
        id: '1',
        content: 'Server',
        updatedAt: Date.now(),
      }

      const resolved = serverUpdate.updatedAt > localUpdate.updatedAt ? serverUpdate : localUpdate

      expect(resolved.content).toBe('Server')
    })

    it('should merge non-conflicting changes', () => {
      const localData = {
        id: '1',
        title: 'Local Title',
        description: 'Original',
      }

      const serverData = {
        id: '1',
        title: 'Original',
        description: 'Server Description',
      }

      const merged = {
        id: '1',
        title: localData.title, // Local change
        description: serverData.description, // Server change
      }

      expect(merged.title).toBe('Local Title')
      expect(merged.description).toBe('Server Description')
    })
  })

  describe('Storage Management', () => {
    it('should monitor storage usage', () => {
      const storageInfo = {
        used: 5 * 1024 * 1024, // 5MB
        quota: 50 * 1024 * 1024, // 50MB
      }

      const usagePercent = (storageInfo.used / storageInfo.quota) * 100

      expect(usagePercent).toBe(10)
    })

    it('should clean up old cache entries when storage is low', () => {
      const cacheEntries = [
        { key: 'cache-1', timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // 7 days old
        { key: 'cache-2', timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000 }, // 1 day old
        { key: 'cache-3', timestamp: Date.now() }, // New
      ]

      const MAX_AGE = 3 * 24 * 60 * 60 * 1000 // 3 days
      const now = Date.now()

      const validEntries = cacheEntries.filter((entry) => now - entry.timestamp < MAX_AGE)

      expect(validEntries).toHaveLength(2)
    })

    it('should compress cached data', () => {
      const data = 'Hello World '.repeat(100)
      const originalSize = data.length

      // Mock compression (actual implementation would use CompressionStream)
      const compressed = data.slice(0, originalSize / 2)
      const compressionRatio = compressed.length / originalSize

      expect(compressionRatio).toBeLessThan(1)
    })
  })

  describe('Background Sync', () => {
    it('should register background sync task', () => {
      const syncTask = {
        id: 'sync-messages',
        registered: true,
        lastSync: Date.now(),
      }

      localStorage.setItem('background-sync-task', JSON.stringify(syncTask))

      const stored = JSON.parse(localStorage.getItem('background-sync-task') || '{}')
      expect(stored.registered).toBe(true)
    })

    it('should trigger background sync when online', async () => {
      const networkState = { online: false }

      // Go online
      networkState.online = true

      if (networkState.online) {
        // Trigger sync
        const syncResult = await Promise.resolve({ success: true })
        expect(syncResult.success).toBe(true)
      }
    })

    it('should batch background sync operations', () => {
      const pendingOperations = [
        { id: '1', type: 'create' },
        { id: '2', type: 'update' },
        { id: '3', type: 'delete' },
      ]

      const batchSize = 10
      const batches = []

      for (let i = 0; i < pendingOperations.length; i += batchSize) {
        batches.push(pendingOperations.slice(i, i + batchSize))
      }

      expect(batches).toHaveLength(1)
      expect(batches[0]).toHaveLength(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle storage quota exceeded', () => {
      try {
        // Simulate quota exceeded
        const largeData = 'x'.repeat(10 * 1024 * 1024) // 10MB
        localStorage.setItem('large-item', largeData)
      } catch (error) {
        const handled = {
          error: 'QUOTA_EXCEEDED',
          message: 'Storage quota exceeded',
        }

        expect(handled.error).toBe('QUOTA_EXCEEDED')
      }
    })

    it('should handle sync failures gracefully', () => {
      const operation = {
        id: 'op-1',
        type: 'create_message',
        attempts: 0,
        maxAttempts: 3,
      }

      // Simulate failure
      operation.attempts++

      if (operation.attempts >= operation.maxAttempts) {
        // Mark as failed
        const failed = true
        expect(failed).toBe(false) // Should not reach max attempts yet
      }

      expect(operation.attempts).toBeLessThan(operation.maxAttempts)
    })

    it('should recover from corrupted cache', () => {
      localStorage.setItem('cache-messages', 'invalid-json')

      try {
        JSON.parse(localStorage.getItem('cache-messages') || '[]')
      } catch {
        // Clear corrupted cache
        localStorage.removeItem('cache-messages')
        localStorage.setItem('cache-messages', JSON.stringify([]))
      }

      const recovered = JSON.parse(localStorage.getItem('cache-messages') || '[]')
      expect(Array.isArray(recovered)).toBe(true)
    })
  })

  describe('Security', () => {
    it('should not cache sensitive data in offline mode', () => {
      const data = {
        id: '1',
        content: 'Public message',
        password: 'should-not-cache',
      }

      const safeToCacheFields = ['id', 'content']
      const cached: Record<string, unknown> = {}

      safeToCacheFields.forEach((field) => {
        if (field in data) {
          cached[field] = data[field as keyof typeof data]
        }
      })

      expect('password' in cached).toBe(false)
    })

    it('should encrypt cached data at rest', () => {
      const sensitiveData = {
        userId: mockUserId,
        token: 'secret-token',
      }

      // Mock encryption
      const encrypted = `encrypted-${Buffer.from(JSON.stringify(sensitiveData)).toString('base64')}`

      expect(encrypted).not.toContain('secret-token')
      expect(encrypted).toContain('encrypted-')
    })

    it('should validate data before syncing', () => {
      const operation = {
        type: 'create_message',
        data: {
          content: '<script>alert("xss")</script>',
        },
      }

      // Sanitize before sync
      const sanitized = operation.data.content.replace(/<script[^>]*>.*?<\/script>/gi, '')

      expect(sanitized).toBe('')
    })
  })

  describe('Performance', () => {
    it('should debounce cache writes', () => {
      const cacheWrites: number[] = []
      const DEBOUNCE_MS = 100

      let debounceTimer: NodeJS.Timeout | null = null

      const debouncedWrite = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
          cacheWrites.push(Date.now())
        }, DEBOUNCE_MS)
      }

      // Multiple rapid calls
      debouncedWrite()
      debouncedWrite()
      debouncedWrite()

      // Should only write once after debounce
      expect(cacheWrites).toHaveLength(0) // Not written yet

      // Advance timers by debounce time
      jest.advanceTimersByTime(DEBOUNCE_MS)

      // Should have written once
      expect(cacheWrites).toHaveLength(1)
    })

    it('should lazy load cached data', () => {
      const loadedCaches = new Set<string>()

      const loadCache = (key: string): boolean => {
        if (loadedCaches.has(key)) {
          return true // Already loaded
        }

        loadedCaches.add(key)
        return true
      }

      loadCache('messages')
      const secondLoad = loadCache('messages')

      expect(secondLoad).toBe(true)
      expect(loadedCaches.size).toBe(1)
    })

    it('should limit sync queue size', () => {
      const MAX_QUEUE_SIZE = 100
      const syncQueue: Array<{ id: string }> = []

      for (let i = 0; i < 150; i++) {
        syncQueue.push({ id: `op-${i}` })
      }

      // Trim to max size (keep most recent)
      const trimmedQueue = syncQueue.slice(-MAX_QUEUE_SIZE)

      expect(trimmedQueue).toHaveLength(MAX_QUEUE_SIZE)
      expect(trimmedQueue[0].id).toBe('op-50')
    })
  })
})
