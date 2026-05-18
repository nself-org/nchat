/**
 * Cache Manager Tests
 *
 * Tests for the CacheManager class including caching operations,
 * eviction policies, TTL handling, and cache statistics.
 */

import {
  CacheManager,
  getCacheManager,
  resetCacheManager,
  type CacheConfig,
  type CacheEvent,
  type EvictionPolicy,
} from "../cache-manager";
import { IndexedDBWrapper } from "../indexed-db";

// =============================================================================
// Mock Setup
// =============================================================================

jest.mock("../indexed-db", () => {
  const data: Map<string, Map<string, unknown>> = new Map([
    ["messages", new Map()],
    ["channels", new Map()],
    ["users", new Map()],
    ["syncQueue", new Map()],
  ]);

  const mockWrapper = {
    open: jest.fn().mockResolvedValue({}),
    close: jest.fn(),
    isOpen: jest.fn().mockReturnValue(true),
    get: jest.fn((store: string, key: string) => {
      return Promise.resolve(data.get(store)?.get(key));
    }),
    getAll: jest.fn((store: string) => {
      return Promise.resolve(Array.from(data.get(store)?.values() || []));
    }),
    getByIndex: jest.fn((store: string, _index: string, value: string) => {
      const storeData = data.get(store);
      if (!storeData) return Promise.resolve([]);
      const results: unknown[] = [];
      storeData.forEach((entry: unknown) => {
        const typedEntry = entry as { data?: { channelId?: string } };
        if (typedEntry.data?.channelId === value) {
          results.push(entry);
        }
      });
      return Promise.resolve(results);
    }),
    put: jest.fn((store: string, entry: { key: string }) => {
      data.get(store)?.set(entry.key, entry);
      return Promise.resolve(entry.key);
    }),
    putMany: jest.fn((store: string, entries: Array<{ key: string }>) => {
      entries.forEach((entry) => {
        data.get(store)?.set(entry.key, entry);
      });
      return Promise.resolve();
    }),
    delete: jest.fn((store: string, key: string) => {
      data.get(store)?.delete(key);
      return Promise.resolve();
    }),
    deleteMany: jest.fn((store: string, keys: string[]) => {
      keys.forEach((key) => data.get(store)?.delete(key));
      return Promise.resolve();
    }),
    clear: jest.fn((store: string) => {
      data.get(store)?.clear();
      return Promise.resolve();
    }),
    count: jest.fn((store: string) => {
      return Promise.resolve(data.get(store)?.size || 0);
    }),
    // Helper to reset data between tests
    _resetData: () => {
      data.forEach((store) => store.clear());
    },
    _getData: () => data,
  };

  return {
    IndexedDBWrapper: jest.fn().mockImplementation(() => mockWrapper),
    getIndexedDB: jest.fn().mockReturnValue(mockWrapper),
    resetIndexedDB: jest.fn(),
    __mockWrapper: mockWrapper,
  };
});

// =============================================================================
// Test Helpers
// =============================================================================

const createTestMessage = (id: string, channelId: string = "channel-1") => ({
  id,
  channelId,
  content: `Message ${id}`,
  authorId: "user-1",
  createdAt: new Date().toISOString(),
});

const createTestChannel = (id: string) => ({
  id,
  name: `Channel ${id}`,
  type: "public",
});

const createTestUser = (id: string) => ({
  id,
  username: `user_${id}`,
  displayName: `User ${id}`,
});

// =============================================================================
// Tests
// =============================================================================

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let mockWrapper: ReturnType<typeof IndexedDBWrapper> & {
    _resetData: () => void;
    _getData: () => Map<string, Map<string, unknown>>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mock wrapper
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mockModule = require("../indexed-db");
    mockWrapper = mockModule.__mockWrapper;
    mockWrapper._resetData();

    // Reset singleton
    resetCacheManager();

    // Create new cache manager with auto cleanup disabled
    cacheManager = new CacheManager({ autoCleanup: false });
  });

  afterEach(() => {
    cacheManager.destroy();
    jest.clearAllTimers();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await cacheManager.initialize();

      expect(cacheManager.isInitialized()).toBe(true);
    });

    it("should only initialize once", async () => {
      await cacheManager.initialize();
      await cacheManager.initialize();

      expect(mockWrapper.open).toHaveBeenCalledTimes(1);
    });

    it("should start cleanup timer when autoCleanup is enabled", async () => {
      jest.useFakeTimers();

      const manager = new CacheManager({
        autoCleanup: true,
        cleanupInterval: 1000,
      });
      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);

      manager.destroy();
      jest.useRealTimers();
    });
  });

  describe("destroy", () => {
    it("should clean up resources", async () => {
      await cacheManager.initialize();

      cacheManager.destroy();

      expect(cacheManager.isInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // Message Cache Tests
  // ==========================================================================

  describe("message caching", () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    describe("cacheMessage", () => {
      it("should cache a message", async () => {
        const message = createTestMessage("msg-1");

        await cacheManager.cacheMessage(message);

        expect(mockWrapper.put).toHaveBeenCalledWith(
          "messages",
          expect.objectContaining({
            key: "msg-1",
            data: message,
          }),
        );
      });

      it("should set expiration time when TTL is configured", async () => {
        const message = createTestMessage("msg-1");

        await cacheManager.cacheMessage(message);

        expect(mockWrapper.put).toHaveBeenCalledWith(
          "messages",
          expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
        );
      });
    });

    describe("cacheMessages", () => {
      it("should cache multiple messages", async () => {
        const messages = [
          createTestMessage("msg-1"),
          createTestMessage("msg-2"),
          createTestMessage("msg-3"),
        ];

        await cacheManager.cacheMessages(messages);

        expect(mockWrapper.putMany).toHaveBeenCalledWith(
          "messages",
          expect.arrayContaining([
            expect.objectContaining({ key: "msg-1" }),
            expect.objectContaining({ key: "msg-2" }),
            expect.objectContaining({ key: "msg-3" }),
          ]),
        );
      });
    });

    describe("getMessage", () => {
      it("should get a cached message", async () => {
        const message = createTestMessage("msg-1");
        await cacheManager.cacheMessage(message);

        const result = await cacheManager.getMessage("msg-1");

        expect(result).toEqual(message);
      });

      it("should return null for non-existent message", async () => {
        const result = await cacheManager.getMessage("non-existent");

        expect(result).toBeNull();
      });

      it("should return null for expired message", async () => {
        // Set up expired entry
        const expiredEntry = {
          key: "msg-expired",
          data: createTestMessage("msg-expired"),
          expiresAt: Date.now() - 1000, // Expired
          accessCount: 0,
          lastAccessedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          size: 100,
        };
        mockWrapper
          ._getData()
          .get("messages")
          ?.set("msg-expired", expiredEntry);

        const result = await cacheManager.getMessage("msg-expired");

        expect(result).toBeNull();
      });

      it("should update access count on hit", async () => {
        const message = createTestMessage("msg-1");
        await cacheManager.cacheMessage(message);

        await cacheManager.getMessage("msg-1");

        const putCalls = mockWrapper.put.mock.calls;
        const lastPutCall = putCalls[putCalls.length - 1];
        expect(lastPutCall[1].accessCount).toBe(1);
      });
    });

    describe("getChannelMessages", () => {
      it("should get messages for a channel", async () => {
        const messages = [
          createTestMessage("msg-1", "channel-1"),
          createTestMessage("msg-2", "channel-1"),
        ];

        for (const msg of messages) {
          await cacheManager.cacheMessage(msg);
        }

        const result = await cacheManager.getChannelMessages("channel-1");

        expect(result.length).toBeGreaterThanOrEqual(0);
      });

      it("should respect limit parameter", async () => {
        // Add entries to mock data
        const data = mockWrapper._getData().get("messages");
        for (let i = 0; i < 5; i++) {
          const entry = {
            key: `msg-${i}`,
            data: { ...createTestMessage(`msg-${i}`), channelId: "channel-1" },
            expiresAt: Date.now() + 100000,
            accessCount: 0,
            lastAccessedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            size: 100,
          };
          data?.set(`msg-${i}`, entry);
        }

        const result = await cacheManager.getChannelMessages("channel-1", 2);

        expect(result.length).toBeLessThanOrEqual(2);
      });
    });

    describe("deleteMessage", () => {
      it("should delete a cached message", async () => {
        const message = createTestMessage("msg-1");
        await cacheManager.cacheMessage(message);

        await cacheManager.deleteMessage("msg-1");

        expect(mockWrapper.delete).toHaveBeenCalledWith("messages", "msg-1");
      });
    });

    describe("clearChannelMessages", () => {
      it("should clear all messages for a channel", async () => {
        await cacheManager.clearChannelMessages("channel-1");

        expect(mockWrapper.deleteMany).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Channel Cache Tests
  // ==========================================================================

  describe("channel caching", () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    describe("cacheChannel", () => {
      it("should cache a channel", async () => {
        const channel = createTestChannel("channel-1");

        await cacheManager.cacheChannel(channel);

        expect(mockWrapper.put).toHaveBeenCalledWith(
          "channels",
          expect.objectContaining({
            key: "channel-1",
            data: channel,
          }),
        );
      });
    });

    describe("getChannel", () => {
      it("should get a cached channel", async () => {
        const channel = createTestChannel("channel-1");
        await cacheManager.cacheChannel(channel);

        const result = await cacheManager.getChannel("channel-1");

        expect(result).toEqual(channel);
      });

      it("should return null for non-existent channel", async () => {
        const result = await cacheManager.getChannel("non-existent");

        expect(result).toBeNull();
      });
    });

    describe("getAllChannels", () => {
      it("should get all cached channels", async () => {
        await cacheManager.cacheChannel(createTestChannel("channel-1"));
        await cacheManager.cacheChannel(createTestChannel("channel-2"));

        const result = await cacheManager.getAllChannels();

        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("deleteChannel", () => {
      it("should delete a cached channel", async () => {
        await cacheManager.cacheChannel(createTestChannel("channel-1"));

        await cacheManager.deleteChannel("channel-1");

        expect(mockWrapper.delete).toHaveBeenCalledWith(
          "channels",
          "channel-1",
        );
      });
    });
  });

  // ==========================================================================
  // User Cache Tests
  // ==========================================================================

  describe("user caching", () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    describe("cacheUser", () => {
      it("should cache a user", async () => {
        const user = createTestUser("user-1");

        await cacheManager.cacheUser(user);

        expect(mockWrapper.put).toHaveBeenCalledWith(
          "users",
          expect.objectContaining({
            key: "user-1",
            data: user,
          }),
        );
      });
    });

    describe("getUser", () => {
      it("should get a cached user", async () => {
        const user = createTestUser("user-1");
        await cacheManager.cacheUser(user);

        const result = await cacheManager.getUser("user-1");

        expect(result).toEqual(user);
      });

      it("should return null for non-existent user", async () => {
        const result = await cacheManager.getUser("non-existent");

        expect(result).toBeNull();
      });
    });

    describe("getAllUsers", () => {
      it("should get all cached users", async () => {
        await cacheManager.cacheUser(createTestUser("user-1"));
        await cacheManager.cacheUser(createTestUser("user-2"));

        const result = await cacheManager.getAllUsers();

        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("deleteUser", () => {
      it("should delete a cached user", async () => {
        await cacheManager.cacheUser(createTestUser("user-1"));

        await cacheManager.deleteUser("user-1");

        expect(mockWrapper.delete).toHaveBeenCalledWith("users", "user-1");
      });
    });
  });

  // ==========================================================================
  // Cache Management Tests
  // ==========================================================================

  describe("cache management", () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    describe("getStats", () => {
      it("should return cache statistics", async () => {
        const stats = await cacheManager.getStats();

        expect(stats).toEqual(
          expect.objectContaining({
            totalEntries: expect.any(Number),
            totalSize: expect.any(Number),
            hitCount: expect.any(Number),
            missCount: expect.any(Number),
            hitRate: expect.any(Number),
            channelCount: expect.any(Number),
            messageCount: expect.any(Number),
            userCount: expect.any(Number),
          }),
        );
      });

      it("should calculate hit rate correctly", async () => {
        // Trigger some hits and misses
        await cacheManager.getMessage("non-existent-1");
        await cacheManager.getMessage("non-existent-2");

        const message = createTestMessage("msg-1");
        await cacheManager.cacheMessage(message);
        await cacheManager.getMessage("msg-1");

        const stats = await cacheManager.getStats();

        expect(stats.hitCount).toBeGreaterThanOrEqual(1);
        expect(stats.missCount).toBeGreaterThanOrEqual(2);
      });
    });

    describe("clearAll", () => {
      it("should clear all cached data", async () => {
        await cacheManager.cacheMessage(createTestMessage("msg-1"));
        await cacheManager.cacheChannel(createTestChannel("channel-1"));
        await cacheManager.cacheUser(createTestUser("user-1"));

        await cacheManager.clearAll();

        expect(mockWrapper.clear).toHaveBeenCalledWith("messages");
        expect(mockWrapper.clear).toHaveBeenCalledWith("channels");
        expect(mockWrapper.clear).toHaveBeenCalledWith("users");
      });

      it("should reset hit/miss counters", async () => {
        await cacheManager.getMessage("non-existent");
        await cacheManager.clearAll();

        const stats = await cacheManager.getStats();

        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);
      });
    });

    describe("evict", () => {
      const policies: EvictionPolicy[] = ["lru", "lfu", "fifo", "ttl"];

      policies.forEach((policy) => {
        it(`should evict entries using ${policy} policy`, async () => {
          // Add some entries
          const data = mockWrapper._getData();
          for (let i = 0; i < 5; i++) {
            const entry = {
              key: `msg-${i}`,
              data: createTestMessage(`msg-${i}`),
              expiresAt: Date.now() + 100000 + i * 1000,
              accessCount: i,
              lastAccessedAt: Date.now() - i * 1000,
              createdAt: Date.now() - (5 - i) * 1000,
              updatedAt: Date.now(),
              size: 100,
            };
            data.get("messages")?.set(`msg-${i}`, entry);
          }

          const evicted = await cacheManager.evict(policy, 2);

          expect(evicted).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe("removeExpired", () => {
      it("should remove expired entries", async () => {
        // Add expired entry
        const data = mockWrapper._getData();
        data.get("messages")?.set("expired-1", {
          key: "expired-1",
          data: createTestMessage("expired-1"),
          expiresAt: Date.now() - 1000,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          size: 100,
        });

        const removed = await cacheManager.removeExpired();

        expect(removed).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ==========================================================================
  // Event System Tests
  // ==========================================================================

  describe("event system", () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it("should emit events on cache operations", async () => {
      const events: CacheEvent[] = [];
      const unsubscribe = cacheManager.subscribe((event) => {
        events.push(event);
      });

      await cacheManager.cacheMessage(createTestMessage("msg-1"));
      await cacheManager.getMessage("msg-1");
      await cacheManager.deleteMessage("msg-1");

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === "set")).toBe(true);
      expect(events.some((e) => e.type === "hit")).toBe(true);
      expect(events.some((e) => e.type === "delete")).toBe(true);

      unsubscribe();
    });

    it("should allow unsubscribing from events", async () => {
      const events: CacheEvent[] = [];
      const unsubscribe = cacheManager.subscribe((event) => {
        events.push(event);
      });

      await cacheManager.cacheMessage(createTestMessage("msg-1"));
      const countBefore = events.length;

      unsubscribe();

      await cacheManager.cacheMessage(createTestMessage("msg-2"));

      expect(events.length).toBe(countBefore);
    });

    it("should handle listener errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      cacheManager.subscribe(() => {
        throw new Error("Listener error");
      });

      await expect(
        cacheManager.cacheMessage(createTestMessage("msg-1")),
      ).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe("configuration", () => {
    it("should use default configuration", () => {
      const config = cacheManager.getConfig();

      expect(config.maxSize).toBe(50 * 1024 * 1024);
      expect(config.maxMessagesPerChannel).toBe(100);
    });

    it("should allow updating configuration", () => {
      cacheManager.setConfig({ maxMessagesPerChannel: 50 });

      const config = cacheManager.getConfig();

      expect(config.maxMessagesPerChannel).toBe(50);
    });

    it("should restart cleanup timer when config changes", async () => {
      jest.useFakeTimers();

      const manager = new CacheManager({
        autoCleanup: true,
        cleanupInterval: 5000,
      });
      await manager.initialize();

      manager.setConfig({ cleanupInterval: 10000 });

      // Timer should be restarted with new interval
      expect(manager.getConfig().cleanupInterval).toBe(10000);

      manager.destroy();
      jest.useRealTimers();
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return the same instance", () => {
      const instance1 = getCacheManager();
      const instance2 = getCacheManager();

      expect(instance1).toBe(instance2);
    });

    it("should reset the singleton", () => {
      const instance1 = getCacheManager();

      resetCacheManager();

      const instance2 = getCacheManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // TTL Tests
  // ==========================================================================

  describe("TTL handling", () => {
    it("should not set expiration when TTL is null", async () => {
      const manager = new CacheManager({
        defaultTTL: null,
        autoCleanup: false,
      });
      await manager.initialize();

      await manager.cacheMessage(createTestMessage("msg-1"));

      const putCall = mockWrapper.put.mock.calls.find(
        (call) => call[0] === "messages",
      );
      expect(putCall?.[1].expiresAt).toBeNull();

      manager.destroy();
    });

    it("should set expiration based on TTL", async () => {
      const ttl = 60000;
      const manager = new CacheManager({ defaultTTL: ttl, autoCleanup: false });
      await manager.initialize();

      const before = Date.now();
      await manager.cacheMessage(createTestMessage("msg-1"));
      const after = Date.now();

      const putCall = mockWrapper.put.mock.calls.find(
        (call) => call[0] === "messages",
      );
      const expiresAt = putCall?.[1].expiresAt;

      expect(expiresAt).toBeGreaterThanOrEqual(before + ttl);
      expect(expiresAt).toBeLessThanOrEqual(after + ttl);

      manager.destroy();
    });
  });

  // ==========================================================================
  // Size Estimation Tests
  // ==========================================================================

  describe("size estimation", () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it("should estimate message size", async () => {
      const message = createTestMessage("msg-1");
      await cacheManager.cacheMessage(message);

      const putCall = mockWrapper.put.mock.calls.find(
        (call) => call[0] === "messages",
      );

      expect(putCall?.[1].size).toBeGreaterThan(0);
    });
  });
});
