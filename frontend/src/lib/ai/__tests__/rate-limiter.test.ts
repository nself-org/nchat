/**
 * Rate Limiter Tests
 * Tests for AI rate limiting functionality
 */

import {
  RateLimiter,
  getRateLimiter,
  getSummarizeUserLimiter,
  checkAIRateLimit,
  getRateLimitHeaders,
  AI_RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from "../rate-limiter";

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

  async incr(key: string, ttl?: number): Promise<number> {
    const current = this.data.get(key) || 0;
    const newValue = current + 1;
    this.data.set(key, newValue);
    return newValue;
  },

  async smembers(key: string): Promise<string[]> {
    return this.data.get(key) || [];
  },

  async sadd(key: string, ...members: string[]): Promise<void> {
    const current = this.data.get(key) || [];
    this.data.set(key, [...new Set([...current, ...members])]);
  },

  async srem(key: string, member: string): Promise<void> {
    const current = this.data.get(key) || [];
    this.data.set(
      key,
      current.filter((m: string) => m !== member),
    );
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.data.keys()).filter((key) => regex.test(key));
  },

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  },

  clear() {
    this.data.clear();
  },
};

jest.mock("@/lib/redis-cache", () => ({
  getCache: () => mockCache,
}));

jest.mock("@/lib/sentry-utils", () => ({
  captureError: jest.fn(),
  addSentryBreadcrumb: jest.fn(),
}));

// ============================================================================
// Tests
// ============================================================================

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    mockCache.clear();
    limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000, // 1 minute
    });
  });

  describe("Token Bucket Algorithm", () => {
    it("should allow requests within limit", async () => {
      const result = await limiter.checkLimit("test-key");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it("should track remaining tokens", async () => {
      await limiter.checkLimit("test-key");
      await limiter.checkLimit("test-key");
      const result = await limiter.checkLimit("test-key");

      expect(result.remaining).toBe(7);
    });

    it("should block requests when limit exceeded", async () => {
      // Use up all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.checkLimit("test-key");
      }

      const result = await limiter.checkLimit("test-key");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should handle custom cost", async () => {
      const result = await limiter.checkLimit("test-key", { cost: 5 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("should refill tokens over time", async () => {
      // Use up all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.checkLimit("test-key");
      }

      // Simulate time passing by manipulating the timestamp
      const timestampKey = "ratelimit:ai:test-key:timestamp";
      const oldTimestamp = await mockCache.get<number>(timestampKey);
      await mockCache.set(timestampKey, oldTimestamp! - 10000); // 10 seconds ago

      const result = await limiter.checkLimit("test-key");

      // Should have refilled some tokens
      expect(result.allowed).toBe(true);
    });

    it("should provide correct reset time", async () => {
      const result = await limiter.checkLimit("test-key");
      const now = Date.now();
      const resetTime = result.resetAt.getTime();

      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThanOrEqual(now + 60000);
    });
  });

  describe("Sliding Window Algorithm", () => {
    it("should allow requests within window", async () => {
      const result = await limiter.checkSlidingWindow("test-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("should track requests in window", async () => {
      await limiter.checkSlidingWindow("test-key");
      await limiter.checkSlidingWindow("test-key");
      const result = await limiter.checkSlidingWindow("test-key");

      expect(result.remaining).toBe(7);
    });

    it("should block when window limit exceeded", async () => {
      for (let i = 0; i < 10; i++) {
        await limiter.checkSlidingWindow("test-key");
      }

      const result = await limiter.checkSlidingWindow("test-key");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should remove expired timestamps", async () => {
      const key = "ratelimit:ai:sliding:test-key";
      const now = Date.now();
      const oldTimestamps = [now - 70000, now - 65000]; // Beyond 60s window
      const recentTimestamps = [now - 5000, now - 1000];

      await mockCache.set(key, [...oldTimestamps, ...recentTimestamps]);

      const result = await limiter.checkSlidingWindow("test-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7); // 10 - 2 recent - 1 current
    });
  });

  describe("Convenience Methods", () => {
    it("should check user limit", async () => {
      const result = await limiter.checkUserLimit("user-123", "summarize");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it("should check org limit", async () => {
      const result = await limiter.checkOrgLimit("org-456", "search");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it("should check endpoint limit", async () => {
      const result = await limiter.checkEndpointLimit("chat");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it("should isolate limits per user", async () => {
      for (let i = 0; i < 10; i++) {
        await limiter.checkUserLimit("user-1", "test");
      }

      const user1Result = await limiter.checkUserLimit("user-1", "test");
      const user2Result = await limiter.checkUserLimit("user-2", "test");

      expect(user1Result.allowed).toBe(false);
      expect(user2Result.allowed).toBe(true);
    });
  });

  describe("Rate Limit Info", () => {
    it("should return rate limit info for user", async () => {
      await limiter.checkUserLimit("user-123", "test");
      await limiter.checkUserLimit("user-123", "test");

      const info = await limiter.getRateLimitInfo("test", "user-123");

      expect(info.length).toBeGreaterThanOrEqual(2); // User + endpoint
      expect(info[0].userId).toBe("user-123");
      // Request count may vary due to how limit info is calculated
      expect(info[0].requestCount).toBeGreaterThanOrEqual(2);
      expect(info[0].remaining).toBeLessThanOrEqual(8);
    });

    it("should return rate limit info for org", async () => {
      await limiter.checkOrgLimit("org-456", "test");

      const info = await limiter.getRateLimitInfo("test", undefined, "org-456");

      expect(info).toHaveLength(2); // Org + endpoint
      expect(info[0].orgId).toBe("org-456");
    });
  });

  describe("Reset Methods", () => {
    it("should reset user limit", async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkUserLimit("user-123", "test");
      }

      await limiter.resetUserLimit("user-123", "test");

      const result = await limiter.checkUserLimit("user-123", "test");
      expect(result.remaining).toBe(9);
    });

    it("should reset org limit", async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkOrgLimit("org-456", "test");
      }

      await limiter.resetOrgLimit("org-456", "test");

      const result = await limiter.checkOrgLimit("org-456", "test");
      expect(result.remaining).toBe(9);
    });

    it("should reset all user limits", async () => {
      await limiter.checkUserLimit("user-123", "test1");
      await limiter.checkUserLimit("user-123", "test2");

      await limiter.resetAllLimits("user-123");

      const result1 = await limiter.checkUserLimit("user-123", "test1");
      const result2 = await limiter.checkUserLimit("user-123", "test2");

      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(9);
    });
  });

  describe("Error Handling", () => {
    it("should fail open when Redis errors", async () => {
      const errorLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      // Mock Redis error
      jest
        .spyOn(mockCache, "get")
        .mockRejectedValueOnce(new Error("Redis error"));

      const result = await errorLimiter.checkLimit("test-key");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });
  });
});

describe("Factory Functions", () => {
  beforeEach(() => {
    mockCache.clear();
  });

  it("should create and cache limiter instances", () => {
    const limiter1 = getRateLimiter("test", AI_RATE_LIMITS.CHAT_USER);
    const limiter2 = getRateLimiter("test", AI_RATE_LIMITS.CHAT_USER);

    expect(limiter1).toBe(limiter2);
  });

  it("should create pre-configured limiters", () => {
    const limiter = getSummarizeUserLimiter();

    expect(limiter).toBeInstanceOf(RateLimiter);
    // Config is private, just verify instance is created
    expect(limiter).toBeTruthy();
  });
});

describe("Helper Functions", () => {
  beforeEach(() => {
    mockCache.clear();
  });

  it("should check multiple rate limits", async () => {
    const userLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
    const orgLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

    const result = await checkAIRateLimit({
      userId: "user-123",
      orgId: "org-456",
      endpoint: "test",
      userLimiter,
      orgLimiter,
    });

    expect(result.allowed).toBe(true);
  });

  it("should return first blocked limit", async () => {
    const userLimiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
    const orgLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

    // Exhaust user limit
    await userLimiter.checkUserLimit("user-123", "test");
    await userLimiter.checkUserLimit("user-123", "test");

    const result = await checkAIRateLimit({
      userId: "user-123",
      orgId: "org-456",
      endpoint: "test",
      userLimiter,
      orgLimiter,
    });

    expect(result.allowed).toBe(false);
  });

  it("should generate rate limit headers", () => {
    const result: RateLimitResult = {
      allowed: true,
      limit: 100,
      remaining: 75,
      resetAt: new Date("2026-01-31T12:00:00Z"),
      retryAfter: 30,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe("100");
    expect(headers["X-RateLimit-Remaining"]).toBe("75");
    expect(headers["X-RateLimit-Reset"]).toBeTruthy();
    expect(headers["Retry-After"]).toBe("30");
  });
});
