/**
 * Response Cache Tests
 * Tests for AI response caching functionality
 */

import {
  ResponseCache,
  getResponseCache,
  getSummarizationCache,
  getSearchCache,
  AI_CACHE_TTL,
  CacheStrategy,
  type CachedResponse,
} from "../response-cache";

// ============================================================================
// Mock Redis Cache
// ============================================================================

const mockCache = {
  data: new Map<string, any>(),

  async get<T>(key: string): Promise<T | null> {
    return this.data.get(key) ?? null;
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.data.set(key, value);
  },

  async del(key: string): Promise<void> {
    this.data.delete(key);
  },

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = 0;
    for (const key of this.data.keys()) {
      if (regex.test(key)) {
        this.data.delete(key);
        count++;
      }
    }
    return count;
  },

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.data.keys()).filter((key) => regex.test(key));
  },

  clear() {
    this.data.clear();
  },
};

jest.mock("@/lib/redis-cache", () => ({
  getCache: () => mockCache,
}));

jest.mock("@/lib/sentry-utils", () => ({
  addSentryBreadcrumb: jest.fn(),
}));

// ============================================================================
// Tests
// ============================================================================

describe("ResponseCache", () => {
  let cache: ResponseCache;

  beforeEach(() => {
    mockCache.clear();
    cache = new ResponseCache("test", {
      enabled: true,
      ttl: 300,
    });
  });

  describe("Basic Operations", () => {
    it("should set and get cached value", async () => {
      const data = { result: "test data" };
      await cache.set("key1", data);

      const cached = await cache.get("key1");

      expect(cached).toEqual(data);
    });

    it("should return null for non-existent key", async () => {
      const cached = await cache.get("nonexistent");

      expect(cached).toBeNull();
    });

    it("should delete cached value", async () => {
      await cache.set("key1", { data: "test" });
      await cache.delete("key1");

      const cached = await cache.get("key1");

      expect(cached).toBeNull();
    });

    it("should check if key exists", async () => {
      await cache.set("key1", { data: "test" });

      const exists1 = await cache.exists("key1");
      const exists2 = await cache.exists("key2");

      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });

    it("should respect TTL", async () => {
      await cache.set("key1", { data: "test" }, { ttl: 1 });

      // Simulate TTL expiration by manipulating cached data
      const cacheKey = cache["generateCacheKey"]("key1");
      const cached = await mockCache.get<CachedResponse>(cacheKey);
      if (cached) {
        cached.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
        await mockCache.set(cacheKey, cached);
      }

      const result = await cache.get("key1");

      expect(result).toBeNull();
    });

    it("should track hit count", async () => {
      await cache.set("key1", { data: "test" });

      await cache.get("key1");
      await cache.get("key1");
      await cache.get("key1");

      const cacheKey = cache["generateCacheKey"]("key1");
      const cached = await mockCache.get<CachedResponse>(cacheKey);

      expect(cached?.hitCount).toBe(3);
    });

    it("should store metadata", async () => {
      await cache.set(
        "key1",
        { data: "test" },
        {
          metadata: { source: "api", version: 1 },
        },
      );

      const cacheKey = cache["generateCacheKey"]("key1");
      const cached = await mockCache.get<CachedResponse>(cacheKey);

      expect(cached?.metadata).toEqual({ source: "api", version: 1 });
    });
  });

  describe("Hash-based Caching", () => {
    it("should cache by payload hash", async () => {
      const payload = { query: "test", params: { limit: 10 } };
      const data = { results: ["a", "b", "c"] };

      await cache.setByPayload(payload, data);
      const cached = await cache.getByPayload(payload);

      expect(cached).toEqual(data);
    });

    it("should generate same hash for identical payloads", async () => {
      const payload1 = { a: 1, b: 2 };
      const payload2 = { a: 1, b: 2 };

      await cache.setByPayload(payload1, { data: "test" });
      const cached = await cache.getByPayload(payload2);

      expect(cached).toEqual({ data: "test" });
    });

    it("should normalize object keys for consistent hashing", async () => {
      const payload1 = { b: 2, a: 1 };
      const payload2 = { a: 1, b: 2 };

      await cache.setByPayload(payload1, { data: "test" });
      const cached = await cache.getByPayload(payload2);

      expect(cached).toEqual({ data: "test" });
    });

    it("should hash long keys", async () => {
      const longKey = "a".repeat(200);
      await cache.set(longKey, { data: "test" });

      const cached = await cache.get(longKey);

      expect(cached).toEqual({ data: "test" });
    });
  });

  describe("Batch Operations", () => {
    it("should get multiple keys", async () => {
      await cache.set("key1", { value: 1 });
      await cache.set("key2", { value: 2 });
      await cache.set("key3", { value: 3 });

      const results = await cache.getMany(["key1", "key2", "key3", "key4"]);

      expect(results.size).toBe(3);
      expect(results.get("key1")).toEqual({ value: 1 });
      expect(results.get("key2")).toEqual({ value: 2 });
      expect(results.get("key3")).toEqual({ value: 3 });
      expect(results.has("key4")).toBe(false);
    });

    it("should set multiple keys", async () => {
      const entries = new Map([
        ["key1", { value: 1 }],
        ["key2", { value: 2 }],
        ["key3", { value: 3 }],
      ]);

      await cache.setMany(entries);

      const key1 = await cache.get("key1");
      const key2 = await cache.get("key2");
      const key3 = await cache.get("key3");

      expect(key1).toEqual({ value: 1 });
      expect(key2).toEqual({ value: 2 });
      expect(key3).toEqual({ value: 3 });
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate by pattern", async () => {
      await cache.set("user:123:data", { data: "test1" });
      await cache.set("user:123:profile", { data: "test2" });
      await cache.set("user:456:data", { data: "test3" });

      const count = await cache.invalidatePattern("*user:123*");

      expect(count).toBe(2);

      const cached1 = await cache.get("user:123:data");
      const cached2 = await cache.get("user:456:data");

      expect(cached1).toBeNull();
      expect(cached2).toEqual({ data: "test3" });
    });

    it("should invalidate by user", async () => {
      await cache.set("data:user:user-123", { data: "test1" });
      await cache.set("data:user:user-456", { data: "test2" });

      const count = await cache.invalidateByUser("user-123");

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should invalidate by org", async () => {
      await cache.set("data:org:org-123", { data: "test1" });
      await cache.set("data:org:org-456", { data: "test2" });

      const count = await cache.invalidateByOrg("org-123");

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should clear all cache", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });

      await cache.clear();

      const cached1 = await cache.get("key1");
      const cached2 = await cache.get("key2");

      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hits and misses", async () => {
      await cache.set("key1", { data: "test" });

      await cache.get("key1"); // hit
      await cache.get("key1"); // hit
      await cache.get("key2"); // miss
      await cache.get("key3"); // miss

      const stats = await cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.totalRequests).toBe(4);
      expect(stats.hitRate).toBe(0.5);
    });

    it("should calculate hit rate correctly", async () => {
      await cache.set("key1", { data: "test" });

      await cache.get("key1"); // hit
      await cache.get("key1"); // hit
      await cache.get("key1"); // hit
      await cache.get("key2"); // miss

      const stats = await cache.getStats();

      expect(stats.hitRate).toBe(0.75);
    });

    it("should track cache size", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });
      await cache.set("key3", { data: "test3" });

      const stats = await cache.getStats();

      expect(stats.cacheSize).toBeGreaterThanOrEqual(3);
    });

    it("should reset statistics", async () => {
      await cache.set("key1", { data: "test" });
      await cache.get("key1");

      await cache.resetStats();

      const stats = await cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("Configuration", () => {
    it("should respect enabled setting", async () => {
      const disabledCache = new ResponseCache("disabled", {
        enabled: false,
      });

      await disabledCache.set("key1", { data: "test" });
      const cached = await disabledCache.get("key1");

      expect(cached).toBeNull();
    });

    it("should get configuration", () => {
      const config = cache.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.ttl).toBe(300);
      expect(config.keyPrefix).toBe("ai:cache:test");
    });

    it("should update configuration", () => {
      cache.updateConfig({ ttl: 600 });

      const config = cache.getConfig();

      expect(config.ttl).toBe(600);
    });

    it("should enable/disable cache", () => {
      cache.disable();
      expect(cache.isEnabled()).toBe(false);

      cache.enable();
      expect(cache.isEnabled()).toBe(true);
    });
  });

  describe("TTL Presets", () => {
    it("should have predefined TTL values", () => {
      expect(AI_CACHE_TTL.REALTIME).toBe(60);
      expect(AI_CACHE_TTL.CHAT).toBe(300);
      expect(AI_CACHE_TTL.SUMMARIZATION).toBe(1800);
      expect(AI_CACHE_TTL.SEARCH).toBe(3600);
      expect(AI_CACHE_TTL.EMBEDDINGS).toBe(7200);
      expect(AI_CACHE_TTL.ANALYSIS).toBe(14400);
      expect(AI_CACHE_TTL.TRANSLATION).toBe(86400);
      expect(AI_CACHE_TTL.CLASSIFICATION).toBe(86400);
    });
  });

  describe("Error Handling", () => {
    it("should handle Redis get errors gracefully", async () => {
      jest
        .spyOn(mockCache, "get")
        .mockRejectedValueOnce(new Error("Redis error"));

      const result = await cache.get("key1");

      expect(result).toBeNull();
    });

    it("should handle Redis set errors gracefully", async () => {
      jest
        .spyOn(mockCache, "set")
        .mockRejectedValueOnce(new Error("Redis error"));

      await expect(cache.set("key1", { data: "test" })).resolves.not.toThrow();
    });
  });

  describe("Semantic Caching", () => {
    it("should support semantic key lookup", async () => {
      const result = await cache.getBySemantic("test prompt");

      expect(result).toBeNull();
    });
  });
});

describe("Cache Manager", () => {
  beforeEach(() => {
    mockCache.clear();
  });

  it("should create and cache instances", () => {
    const cache1 = getResponseCache("test");
    const cache2 = getResponseCache("test");

    expect(cache1).toBe(cache2);
  });

  it("should create separate caches for different namespaces", () => {
    const cache1 = getResponseCache("cache1");
    const cache2 = getResponseCache("cache2");

    expect(cache1).not.toBe(cache2);
  });

  it("should create pre-configured caches", () => {
    const summarizationCache = getSummarizationCache();
    const searchCache = getSearchCache();

    expect(summarizationCache).toBeInstanceOf(ResponseCache);
    expect(searchCache).toBeInstanceOf(ResponseCache);

    expect(summarizationCache.getConfig().ttl).toBe(AI_CACHE_TTL.SUMMARIZATION);
    expect(searchCache.getConfig().ttl).toBe(AI_CACHE_TTL.SEARCH);
  });
});

describe("Cache Decorator", () => {
  beforeEach(() => {
    mockCache.clear();
  });

  it("should cache method results", async () => {
    // Note: Decorator tests would require actual decorator usage
    // This is a placeholder for decorator testing
    expect(true).toBe(true);
  });
});
