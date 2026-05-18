import {
  PermissionCache,
  createPermissionCache,
  createHighPerformanceCache,
  createRealtimeCache,
  withCache,
  withBatchCache,
  type CacheKey,
  type CacheConfig,
  type BatchPermissionRequest,
} from "../permission-cache";
import { type PermissionResult } from "../permission-builder";
import { PERMISSIONS } from "@/types/rbac";

describe("Permission Cache", () => {
  describe("PermissionCache", () => {
    let cache: PermissionCache;

    beforeEach(() => {
      jest.useFakeTimers();
      cache = createPermissionCache({ maxSize: 100, ttlMs: 60000 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe("Basic Operations", () => {
      describe("set and get", () => {
        it("stores and retrieves a permission result", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          const result: PermissionResult = {
            allowed: true,
            reason: "Test",
            grantedBy: "test",
          };

          cache.set(key, result);
          const retrieved = cache.get(key);

          expect(retrieved).toEqual(result);
        });

        it("returns undefined for non-existent key", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          expect(cache.get(key)).toBeUndefined();
        });

        it("handles keys with channelId", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            channelId: "channel1",
          };

          const result: PermissionResult = { allowed: true };
          cache.set(key, result);

          expect(cache.get(key)).toEqual(result);
        });

        it("handles keys with resourceId", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_EDIT,
            resourceId: "msg123",
          };

          const result: PermissionResult = { allowed: true };
          cache.set(key, result);

          expect(cache.get(key)).toEqual(result);
        });

        it("updates existing entry on duplicate set", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          cache.set(key, { allowed: true });
          cache.set(key, { allowed: false });

          expect(cache.get(key)?.allowed).toBe(false);
          expect(cache.size).toBe(1);
        });
      });

      describe("has", () => {
        it("returns true for existing key", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          cache.set(key, { allowed: true });

          expect(cache.has(key)).toBe(true);
        });

        it("returns false for non-existent key", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          expect(cache.has(key)).toBe(false);
        });
      });

      describe("remove", () => {
        it("removes an existing entry", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          cache.set(key, { allowed: true });
          const cacheKey = cache.buildCacheKey(key);
          const removed = cache.remove(cacheKey);

          expect(removed).toBe(true);
          expect(cache.get(key)).toBeUndefined();
        });

        it("returns false for non-existent entry", () => {
          expect(cache.remove("non-existent")).toBe(false);
        });
      });

      describe("clear", () => {
        it("removes all entries", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_EDIT },
            { allowed: true },
          );

          cache.clear();

          expect(cache.size).toBe(0);
        });
      });
    });

    describe("LRU Eviction", () => {
      it("evicts least recently used when at capacity", () => {
        const smallCache = createPermissionCache({ maxSize: 3, ttlMs: 60000 });

        // Fill cache
        smallCache.set(
          { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
        smallCache.set(
          { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
        smallCache.set(
          { userId: "user3", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );

        // Add one more (should evict user1)
        smallCache.set(
          { userId: "user4", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );

        expect(smallCache.size).toBe(3);
        expect(
          smallCache.get({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          }),
        ).toBeUndefined();
        expect(
          smallCache.get({
            userId: "user4",
            permission: PERMISSIONS.MESSAGE_SEND,
          }),
        ).toBeDefined();
      });

      it("accessing an entry moves it to front", () => {
        const smallCache = createPermissionCache({ maxSize: 3, ttlMs: 60000 });

        // Fill cache
        smallCache.set(
          { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
        smallCache.set(
          { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
        smallCache.set(
          { userId: "user3", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );

        // Access user1 (moves to front)
        smallCache.get({
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        });

        // Add one more (should evict user2 now)
        smallCache.set(
          { userId: "user4", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );

        expect(
          smallCache.get({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          }),
        ).toBeDefined();
        expect(
          smallCache.get({
            userId: "user2",
            permission: PERMISSIONS.MESSAGE_SEND,
          }),
        ).toBeUndefined();
      });

      it("tracks eviction count in stats", () => {
        const smallCache = createPermissionCache({ maxSize: 2, ttlMs: 60000 });

        smallCache.set(
          { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
        smallCache.set(
          { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
        smallCache.set(
          { userId: "user3", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );

        const stats = smallCache.getStats();
        expect(stats.evictions).toBe(1);
      });
    });

    describe("TTL Expiration", () => {
      it("returns undefined for expired entries", () => {
        const shortTTLCache = createPermissionCache({
          maxSize: 100,
          ttlMs: 50,
        });

        const key: CacheKey = {
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        };

        shortTTLCache.set(key, { allowed: true });

        // Wait for expiration using fake timers
        jest.advanceTimersByTime(60);

        expect(shortTTLCache.get(key)).toBeUndefined();
      });

      it("returns entry before TTL expires", () => {
        const cache = createPermissionCache({ maxSize: 100, ttlMs: 1000 });

        const key: CacheKey = {
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        };

        cache.set(key, { allowed: true });

        // Check immediately
        expect(cache.get(key)).toBeDefined();
      });

      it("has() returns false for expired entries", () => {
        const shortTTLCache = createPermissionCache({
          maxSize: 100,
          ttlMs: 50,
        });

        const key: CacheKey = {
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        };

        shortTTLCache.set(key, { allowed: true });

        jest.advanceTimersByTime(60);

        expect(shortTTLCache.has(key)).toBe(false);
      });
    });

    describe("Invalidation", () => {
      describe("invalidateUser", () => {
        it("invalidates all entries for a user", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_EDIT },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );

          const count = cache.invalidateUser("user1");

          expect(count).toBe(2);
          expect(
            cache.get({
              userId: "user1",
              permission: PERMISSIONS.MESSAGE_SEND,
            }),
          ).toBeUndefined();
          expect(
            cache.get({
              userId: "user1",
              permission: PERMISSIONS.MESSAGE_EDIT,
            }),
          ).toBeUndefined();
          expect(
            cache.get({
              userId: "user2",
              permission: PERMISSIONS.MESSAGE_SEND,
            }),
          ).toBeDefined();
        });

        it("returns 0 for non-existent user", () => {
          expect(cache.invalidateUser("non-existent")).toBe(0);
        });
      });

      describe("invalidateChannel", () => {
        it("invalidates all entries for a channel", () => {
          cache.set(
            {
              userId: "user1",
              permission: PERMISSIONS.MESSAGE_SEND,
              channelId: "ch1",
            },
            { allowed: true },
          );
          cache.set(
            {
              userId: "user2",
              permission: PERMISSIONS.MESSAGE_SEND,
              channelId: "ch1",
            },
            { allowed: true },
          );
          cache.set(
            {
              userId: "user1",
              permission: PERMISSIONS.MESSAGE_SEND,
              channelId: "ch2",
            },
            { allowed: true },
          );

          const count = cache.invalidateChannel("ch1");

          expect(count).toBe(2);
          expect(
            cache.get({
              userId: "user1",
              permission: PERMISSIONS.MESSAGE_SEND,
              channelId: "ch1",
            }),
          ).toBeUndefined();
          expect(
            cache.get({
              userId: "user1",
              permission: PERMISSIONS.MESSAGE_SEND,
              channelId: "ch2",
            }),
          ).toBeDefined();
        });
      });

      describe("invalidateRole", () => {
        it("invalidates entries by role tag", () => {
          // Note: Role invalidation requires entries to be tagged
          const count = cache.invalidateRole("member");
          expect(count).toBe(0); // No entries tagged with role
        });
      });

      describe("invalidatePattern", () => {
        it("invalidates entries matching a pattern", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_EDIT },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );

          const count = cache.invalidatePattern(/^user1:/);

          expect(count).toBe(2);
        });

        it("tracks invalidation count in stats", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_EDIT },
            { allowed: true },
          );

          cache.invalidatePattern(/^user1:/);

          const stats = cache.getStats();
          expect(stats.invalidations).toBe(2);
        });
      });
    });

    describe("Batch Operations", () => {
      describe("getBatch", () => {
        it("returns cached results and counts", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_EDIT },
            { allowed: true },
          );

          const request: BatchPermissionRequest = {
            userId: "user1",
            permissions: [
              PERMISSIONS.MESSAGE_SEND,
              PERMISSIONS.MESSAGE_EDIT,
              PERMISSIONS.MESSAGE_DELETE, // Not cached
            ],
          };

          const result = cache.getBatch(request);

          expect(result.cached).toBe(2);
          expect(result.computed).toBe(1);
          expect(result.results.size).toBe(2);
          expect(result.results.get(PERMISSIONS.MESSAGE_SEND)?.allowed).toBe(
            true,
          );
        });
      });

      describe("setBatch", () => {
        it("sets multiple results at once", () => {
          const request: BatchPermissionRequest = {
            userId: "user1",
            permissions: [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_EDIT],
          };

          const results = new Map<string, PermissionResult>([
            [PERMISSIONS.MESSAGE_SEND, { allowed: true }],
            [PERMISSIONS.MESSAGE_EDIT, { allowed: false }],
          ]);

          cache.setBatch(request, results);

          expect(
            cache.get({ userId: "user1", permission: PERMISSIONS.MESSAGE_SEND })
              ?.allowed,
          ).toBe(true);
          expect(
            cache.get({ userId: "user1", permission: PERMISSIONS.MESSAGE_EDIT })
              ?.allowed,
          ).toBe(false);
        });
      });
    });

    describe("Statistics", () => {
      describe("getStats", () => {
        it("tracks hits and misses", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          // Miss
          cache.get(key);

          // Set and hit
          cache.set(key, { allowed: true });
          cache.get(key);
          cache.get(key);

          const stats = cache.getStats();
          expect(stats.hits).toBe(2);
          expect(stats.misses).toBe(1);
        });

        it("calculates hit rate", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          cache.set(key, { allowed: true });
          cache.get(key); // Hit
          cache.get(key); // Hit
          cache.get({ userId: "user2", permission: PERMISSIONS.MESSAGE_SEND }); // Miss

          const stats = cache.getStats();
          expect(stats.hitRate).toBeCloseTo(2 / 3);
        });

        it("returns size and maxSize", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );

          const stats = cache.getStats();
          expect(stats.size).toBe(2);
          expect(stats.maxSize).toBe(100);
        });
      });

      describe("resetStats", () => {
        it("resets all counters", () => {
          const key: CacheKey = {
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          };

          cache.set(key, { allowed: true });
          cache.get(key);
          cache.get({ userId: "user2", permission: PERMISSIONS.MESSAGE_SEND });

          cache.resetStats();

          const stats = cache.getStats();
          expect(stats.hits).toBe(0);
          expect(stats.misses).toBe(0);
          expect(stats.evictions).toBe(0);
          expect(stats.invalidations).toBe(0);
        });
      });

      it("can disable stats tracking", () => {
        const noStatsCache = createPermissionCache({
          maxSize: 100,
          ttlMs: 60000,
          enableStats: false,
        });

        const key: CacheKey = {
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        };

        noStatsCache.get(key); // Would be a miss
        noStatsCache.set(key, { allowed: true });
        noStatsCache.get(key); // Would be a hit

        const stats = noStatsCache.getStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });
    });

    describe("Configuration", () => {
      describe("configure", () => {
        it("updates maxSize and evicts if needed", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user3", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );

          cache.configure({ maxSize: 2 });

          expect(cache.size).toBe(2);
          expect(cache.getConfig().maxSize).toBe(2);
        });

        it("updates TTL", () => {
          cache.configure({ ttlMs: 30000 });
          expect(cache.getConfig().ttlMs).toBe(30000);
        });

        it("updates enableStats", () => {
          cache.configure({ enableStats: false });
          expect(cache.getConfig().enableStats).toBe(false);
        });
      });

      describe("getConfig", () => {
        it("returns current configuration", () => {
          const config = cache.getConfig();
          expect(config.maxSize).toBe(100);
          expect(config.ttlMs).toBe(60000);
          expect(config.enableStats).toBe(true);
        });
      });
    });

    describe("Cache Key Operations", () => {
      describe("buildCacheKey", () => {
        it("builds basic key", () => {
          const key = cache.buildCacheKey({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
          });

          expect(key).toBe(`user1:${PERMISSIONS.MESSAGE_SEND}`);
        });

        it("includes channelId", () => {
          const key = cache.buildCacheKey({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            channelId: "ch1",
          });

          expect(key).toContain("ch:ch1");
        });

        it("includes resourceId", () => {
          const key = cache.buildCacheKey({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            resourceId: "msg1",
          });

          expect(key).toContain("res:msg1");
        });
      });

      describe("parseCacheKey", () => {
        it("parses basic key", () => {
          const cacheKey = `user1:${PERMISSIONS.MESSAGE_SEND}`;
          const parsed = cache.parseCacheKey(cacheKey);

          expect(parsed?.userId).toBe("user1");
          expect(parsed?.permission).toBe(PERMISSIONS.MESSAGE_SEND);
        });

        it("parses key with channelId", () => {
          const cacheKey = `user1:${PERMISSIONS.MESSAGE_SEND}:ch:channel1`;
          const parsed = cache.parseCacheKey(cacheKey);

          expect(parsed?.channelId).toBe("channel1");
        });

        it("parses key with resourceId", () => {
          const cacheKey = `user1:${PERMISSIONS.MESSAGE_SEND}:res:msg123`;
          const parsed = cache.parseCacheKey(cacheKey);

          expect(parsed?.resourceId).toBe("msg123");
        });

        it("returns null for invalid key", () => {
          expect(cache.parseCacheKey("invalid")).toBeNull();
        });
      });
    });

    describe("Debug Methods", () => {
      describe("getAllEntries", () => {
        it("returns entries in LRU order", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );

          // Access user1 (moves to front)
          cache.get({ userId: "user1", permission: PERMISSIONS.MESSAGE_SEND });

          const entries = cache.getAllEntries();
          expect(entries).toHaveLength(2);
          expect(entries[0].key).toContain("user1");
        });
      });

      describe("toMap", () => {
        it("returns all entries as a map", () => {
          cache.set(
            { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: true },
          );
          cache.set(
            { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
            { allowed: false },
          );

          const map = cache.toMap();
          expect(map.size).toBe(2);
        });
      });
    });
  });

  describe("Factory Functions", () => {
    describe("createPermissionCache", () => {
      it("creates cache with default config", () => {
        const cache = createPermissionCache();
        const config = cache.getConfig();

        expect(config.maxSize).toBe(1000);
        expect(config.ttlMs).toBe(60000);
        expect(config.enableStats).toBe(true);
      });

      it("creates cache with custom config", () => {
        const cache = createPermissionCache({
          maxSize: 500,
          ttlMs: 30000,
        });

        const config = cache.getConfig();
        expect(config.maxSize).toBe(500);
        expect(config.ttlMs).toBe(30000);
      });
    });

    describe("createHighPerformanceCache", () => {
      it("creates cache with high capacity", () => {
        const cache = createHighPerformanceCache();
        const config = cache.getConfig();

        expect(config.maxSize).toBe(10000);
        expect(config.ttlMs).toBe(300000); // 5 minutes
      });
    });

    describe("createRealtimeCache", () => {
      it("creates cache with short TTL", () => {
        const cache = createRealtimeCache();
        const config = cache.getConfig();

        expect(config.maxSize).toBe(500);
        expect(config.ttlMs).toBe(5000); // 5 seconds
        expect(config.enableStats).toBe(false);
      });
    });
  });

  describe("Utility Functions", () => {
    describe("withCache", () => {
      it("caches permission check results", () => {
        const cache = createPermissionCache();
        let callCount = 0;

        const checkFn = (key: CacheKey): PermissionResult => {
          callCount++;
          return { allowed: true, reason: "Test" };
        };

        const cachedCheck = withCache(cache, checkFn);

        const key: CacheKey = {
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        };

        // First call - computes
        cachedCheck(key);
        expect(callCount).toBe(1);

        // Second call - uses cache
        cachedCheck(key);
        expect(callCount).toBe(1);
      });

      it("returns cached result", () => {
        const cache = createPermissionCache();

        const checkFn = (): PermissionResult => ({
          allowed: true,
          reason: "Original",
        });

        const cachedCheck = withCache(cache, checkFn);

        const key: CacheKey = {
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
        };

        const result1 = cachedCheck(key);
        const result2 = cachedCheck(key);

        expect(result1).toEqual(result2);
      });
    });

    describe("withBatchCache", () => {
      it("uses cache for batch checks", () => {
        const cache = createPermissionCache();
        let callCount = 0;

        const checkFn = (key: CacheKey): PermissionResult => {
          callCount++;
          return { allowed: true };
        };

        const batchCheck = withBatchCache(cache, checkFn);

        // Pre-cache one permission
        cache.set(
          { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );

        const request: BatchPermissionRequest = {
          userId: "user1",
          permissions: [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_EDIT],
        };

        const result = batchCheck(request);

        expect(result.results.size).toBe(2);
        expect(result.cached).toBe(1);
        expect(callCount).toBe(1); // Only called for MESSAGE_EDIT
      });

      it("caches computed results", () => {
        const cache = createPermissionCache();

        const checkFn = (): PermissionResult => ({ allowed: true });

        const batchCheck = withBatchCache(cache, checkFn);

        const request: BatchPermissionRequest = {
          userId: "user1",
          permissions: [PERMISSIONS.MESSAGE_SEND],
        };

        batchCheck(request);

        // Should be cached now
        expect(
          cache.get({ userId: "user1", permission: PERMISSIONS.MESSAGE_SEND }),
        ).toBeDefined();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty cache gracefully", () => {
      const cache = createPermissionCache();

      expect(cache.size).toBe(0);
      expect(cache.getAllEntries()).toEqual([]);
      expect(cache.invalidateUser("any")).toBe(0);
    });

    it("handles single entry cache", () => {
      const cache = createPermissionCache({ maxSize: 1, ttlMs: 60000 });

      cache.set(
        { userId: "user1", permission: PERMISSIONS.MESSAGE_SEND },
        { allowed: true },
      );
      cache.set(
        { userId: "user2", permission: PERMISSIONS.MESSAGE_SEND },
        { allowed: true },
      );

      expect(cache.size).toBe(1);
      expect(
        cache.get({ userId: "user1", permission: PERMISSIONS.MESSAGE_SEND }),
      ).toBeUndefined();
      expect(
        cache.get({ userId: "user2", permission: PERMISSIONS.MESSAGE_SEND }),
      ).toBeDefined();
    });

    it("handles rapid set/get operations", () => {
      const cache = createPermissionCache({ maxSize: 100, ttlMs: 60000 });

      for (let i = 0; i < 100; i++) {
        cache.set(
          { userId: `user${i}`, permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: i % 2 === 0 },
        );
      }

      expect(cache.size).toBe(100);

      for (let i = 0; i < 100; i++) {
        const result = cache.get({
          userId: `user${i}`,
          permission: PERMISSIONS.MESSAGE_SEND,
        });
        expect(result?.allowed).toBe(i % 2 === 0);
      }
    });

    it("maintains consistency after many evictions", () => {
      const cache = createPermissionCache({ maxSize: 10, ttlMs: 60000 });

      // Add 50 entries, causing 40 evictions
      for (let i = 0; i < 50; i++) {
        cache.set(
          { userId: `user${i}`, permission: PERMISSIONS.MESSAGE_SEND },
          { allowed: true },
        );
      }

      expect(cache.size).toBe(10);

      // Most recent 10 should still be there
      for (let i = 40; i < 50; i++) {
        expect(
          cache.get({
            userId: `user${i}`,
            permission: PERMISSIONS.MESSAGE_SEND,
          }),
        ).toBeDefined();
      }
    });
  });
});
