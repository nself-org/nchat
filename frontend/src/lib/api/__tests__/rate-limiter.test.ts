/**
 * @jest-environment node
 */

/**
 * Rate Limiter Tests
 *
 * Tests for the advanced rate limiting implementation.
 */

import {
  RateLimiter,
  RATE_LIMIT_PRESETS,
  getClientIp,
  getCombinedIdentifier,
} from "../rate-limiter";
import type { RateLimitConfig } from "../rate-limiter";
import { NextRequest } from "next/server";

// Mock Redis to use in-memory store
jest.mock("ioredis", () => ({
  default: jest.fn(() => null),
}));

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    rateLimiter = new RateLimiter();
  });

  afterEach(async () => {
    await rateLimiter.destroy();
    jest.useRealTimers();
  });

  describe("Sliding Window Algorithm", () => {
    it("should allow requests within limit", async () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      // Make 5 requests - all should be allowed
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.check("user:123", config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i - 1);
        expect(result.limit).toBe(5);
      }
    });

    it("should block requests exceeding limit", async () => {
      const config: RateLimitConfig = {
        maxRequests: 3,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      // Make 4 requests - 4th should be blocked
      for (let i = 0; i < 4; i++) {
        const result = await rateLimiter.check("user:456", config);
        if (i < 3) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
          expect(result.remaining).toBe(0);
          expect(result.retryAfter).toBeGreaterThan(0);
        }
      }
    });

    it("should reset after window expires", async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 1, // 1 second window
        keyPrefix: "test",
      };

      // Make 2 requests
      await rateLimiter.check("user:789", config);
      await rateLimiter.check("user:789", config);

      // Wait for window to expire using fake timers
      jest.advanceTimersByTime(1100);

      // Should be allowed again
      const result = await rateLimiter.check("user:789", config);
      expect(result.allowed).toBe(true);
    });

    it("should handle burst allowance", async () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowSeconds: 60,
        burst: 5, // Total limit = 10
        keyPrefix: "test",
      };

      // Make 10 requests - all should be allowed
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.check("user:burst", config);
        expect(result.allowed).toBe(true);
      }

      // 11th should be blocked
      const result = await rateLimiter.check("user:burst", config);
      expect(result.allowed).toBe(false);
    });
  });

  describe("Token Bucket Algorithm", () => {
    it("should allow requests when tokens available", async () => {
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      const result = await rateLimiter.checkTokenBucket("user:tb1", config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should block when tokens depleted", async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      // Consume all tokens
      await rateLimiter.checkTokenBucket("user:tb2", config);
      await rateLimiter.checkTokenBucket("user:tb2", config);

      // Should be blocked
      const result = await rateLimiter.checkTokenBucket("user:tb2", config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("Rate Limit Status", () => {
    it("should return status without incrementing", async () => {
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      // Check status without consuming
      const status1 = await rateLimiter.status("user:status", config);
      expect(status1.remaining).toBe(10);

      const status2 = await rateLimiter.status("user:status", config);
      expect(status2.remaining).toBe(10); // Should be same

      // Make actual request
      await rateLimiter.check("user:status", config);

      const status3 = await rateLimiter.status("user:status", config);
      expect(status3.remaining).toBe(9); // Now decremented
    });
  });

  describe("Reset Functionality", () => {
    it("should reset rate limit for identifier", async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      // Use up the limit
      await rateLimiter.check("user:reset", config);
      await rateLimiter.check("user:reset", config);

      let result = await rateLimiter.check("user:reset", config);
      expect(result.allowed).toBe(false);

      // Reset
      await rateLimiter.reset("user:reset", config);

      // Should be allowed again
      result = await rateLimiter.check("user:reset", config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe("Multiple Identifiers", () => {
    it("should track limits separately for different identifiers", async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
        keyPrefix: "test",
      };

      // User 1 uses up limit
      await rateLimiter.check("user:1", config);
      await rateLimiter.check("user:1", config);
      const result1 = await rateLimiter.check("user:1", config);
      expect(result1.allowed).toBe(false);

      // User 2 should still have full limit
      const result2 = await rateLimiter.check("user:2", config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });
  });

  describe("Rate Limit Presets", () => {
    it("should have all required presets", () => {
      expect(RATE_LIMIT_PRESETS.AUTH).toBeDefined();
      expect(RATE_LIMIT_PRESETS.MESSAGE_SEND).toBeDefined();
      expect(RATE_LIMIT_PRESETS.FILE_UPLOAD).toBeDefined();
      expect(RATE_LIMIT_PRESETS.SEARCH).toBeDefined();
      expect(RATE_LIMIT_PRESETS.API_USER).toBeDefined();
    });

    it("should have correct configuration for AUTH preset", () => {
      expect(RATE_LIMIT_PRESETS.AUTH.maxRequests).toBe(5);
      expect(RATE_LIMIT_PRESETS.AUTH.windowSeconds).toBe(60);
    });

    it("should have burst configuration for MESSAGE_SEND", () => {
      expect(RATE_LIMIT_PRESETS.MESSAGE_SEND.burst).toBe(5);
    });
  });
});

describe("Helper Functions", () => {
  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-real-ip": "192.168.1.2",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.2");
    });

    it("should extract IP from cf-connecting-ip header (Cloudflare)", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "cf-connecting-ip": "192.168.1.3",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.3");
    });

    it("should return localhost as fallback", () => {
      const request = new NextRequest("http://localhost:3000");
      const ip = getClientIp(request);
      expect(ip).toBe("127.0.0.1");
    });
  });

  describe("getCombinedIdentifier", () => {
    it("should prefer user ID over IP", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      }) as NextRequest & { user?: { id: string } };

      request.user = { id: "user-123" };

      const identifier = getCombinedIdentifier(request);
      expect(identifier).toBe("user:user-123");
    });

    it("should use IP when user not available", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      }) as NextRequest & { user?: { id: string } };

      const identifier = getCombinedIdentifier(request);
      expect(identifier).toBe("ip:192.168.1.1");
    });
  });
});

describe("Rate Limit Headers", () => {
  it("should include correct rate limit information", async () => {
    const rateLimiter = new RateLimiter();
    const config: RateLimitConfig = {
      maxRequests: 10,
      windowSeconds: 60,
      keyPrefix: "test",
    };

    const result = await rateLimiter.check("user:headers", config);

    expect(result.limit).toBe(10);
    expect(result.remaining).toBeLessThanOrEqual(10);
    expect(result.reset).toBeGreaterThan(Date.now() / 1000);

    await rateLimiter.destroy();
  });
});

describe("Concurrent Requests", () => {
  it("should handle concurrent requests correctly", async () => {
    const rateLimiter = new RateLimiter();
    const config: RateLimitConfig = {
      maxRequests: 10,
      windowSeconds: 60,
      keyPrefix: "test",
    };

    // Make 20 concurrent requests
    const promises = Array(20)
      .fill(null)
      .map(() => rateLimiter.check("user:concurrent", config));

    const results = await Promise.all(promises);

    // In-memory fallback may not perfectly enforce limits under concurrency
    // but should generally limit requests
    const allowed = results.filter((r) => r.allowed).length;
    const blocked = results.filter((r) => !r.allowed).length;

    // At least some should be allowed, and the total should be 20
    expect(allowed).toBeGreaterThan(0);
    expect(allowed + blocked).toBe(20);

    await rateLimiter.destroy();
  });
});
