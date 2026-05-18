/**
 * @jest-environment node
 */

/**
 * Comprehensive Tests for Rate Limiter Service
 *
 * Tests cover:
 * - Basic rate limiting
 * - Burst limiting
 * - Configuration management
 * - User and channel overrides
 * - Violation tracking
 * - Statistics
 */

import {
  RateLimiter,
  createRateLimiter,
  getRateLimiter,
  formatRetryAfter,
  createRateLimitHeaders,
  DEFAULT_RATE_LIMITS,
  STRICT_RATE_LIMITS,
} from "../rate-limiter";
import type { RateLimitAction, RateLimitConfig } from "../rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  afterEach(() => {
    limiter.clear();
    limiter.destroy();
  });

  // ============================================================================
  // Basic Rate Limiting Tests
  // ============================================================================

  describe("Basic Rate Limiting", () => {
    it("should allow actions within limit", () => {
      const result = limiter.check("message", "user-1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });

    it("should deny actions when limit exceeded", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 3, windowMs: 60000 },
        },
      });

      // Consume all tokens
      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");

      // Should be denied
      const result = testLimiter.check("message", "user-1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);

      testLimiter.destroy();
    });

    it("should track remaining count correctly", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 5, windowMs: 60000 },
        },
      });

      expect(testLimiter.check("message", "user-1").remaining).toBe(4);
      expect(testLimiter.check("message", "user-1").remaining).toBe(3);
      expect(testLimiter.check("message", "user-1").remaining).toBe(2);
      expect(testLimiter.check("message", "user-1").remaining).toBe(1);
      expect(testLimiter.check("message", "user-1").remaining).toBe(0);

      testLimiter.destroy();
    });

    it("should support checking without consuming", () => {
      const result1 = limiter.check("message", "user-1", { consume: false });
      const result2 = limiter.check("message", "user-1", { consume: false });

      expect(result1.remaining).toBe(result2.remaining);
    });

    it("should reset after window expires", async () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 50 }, // 50ms window
        },
      });

      testLimiter.check("message", "user-1");
      expect(testLimiter.check("message", "user-1").allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(testLimiter.check("message", "user-1").allowed).toBe(true);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Burst Limiting Tests
  // ============================================================================

  describe("Burst Limiting", () => {
    it("should enforce burst limits", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: {
            limit: 30,
            windowMs: 60000,
            burstLimit: 3,
            burstWindowMs: 5000,
          },
        },
      });

      // Use up burst allowance
      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");

      // Burst should be exceeded
      const result = testLimiter.check("message", "user-1");
      expect(result.allowed).toBe(false);
      expect(result.burstRemaining).toBe(0);

      testLimiter.destroy();
    });

    it("should report burst remaining", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: {
            limit: 30,
            windowMs: 60000,
            burstLimit: 5,
            burstWindowMs: 5000,
          },
        },
      });

      const result = testLimiter.check("message", "user-1");
      expect(result.burstRemaining).toBe(4);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Scope Tests
  // ============================================================================

  describe("Rate Limit Scopes", () => {
    it("should track limits per user", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 2, windowMs: 60000 },
        },
      });

      // User 1 uses their limit
      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");

      // User 1 is limited
      expect(testLimiter.check("message", "user-1").allowed).toBe(false);

      // User 2 should still have their limit
      expect(testLimiter.check("message", "user-2").allowed).toBe(true);

      testLimiter.destroy();
    });

    it("should support channel-specific limits", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 2, windowMs: 60000 },
        },
      });

      // Use limit in channel 1
      testLimiter.check("message", "user-1", { channelId: "channel-1" });
      testLimiter.check("message", "user-1", { channelId: "channel-1" });

      // Limited in channel 1
      expect(
        testLimiter.check("message", "user-1", { channelId: "channel-1" })
          .allowed,
      ).toBe(false);

      // But can still post in channel 2
      expect(
        testLimiter.check("message", "user-1", { channelId: "channel-2" })
          .allowed,
      ).toBe(true);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe("Configuration", () => {
    it("should use default limits", () => {
      const result = limiter.check("message", "user-1");
      expect(result.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });

    it("should allow custom default limits", () => {
      const customLimiter = createRateLimiter({
        defaults: {
          message: { limit: 100, windowMs: 60000 },
        },
      });

      const result = customLimiter.check("message", "user-1");
      expect(result.limit).toBe(100);

      customLimiter.destroy();
    });

    it("should update default limits", () => {
      limiter.setDefaultLimit("message", {
        limit: 50,
        windowMs: 30000,
      });

      const result = limiter.check("message", "new-user");
      expect(result.limit).toBe(50);
    });

    it("should support user-specific overrides", () => {
      limiter.setUserOverride("special-user", "message", {
        limit: 100,
        windowMs: 60000,
      });

      const specialResult = limiter.check("message", "special-user");
      const normalResult = limiter.check("message", "normal-user");

      expect(specialResult.limit).toBe(100);
      expect(normalResult.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });

    it("should support channel-specific overrides", () => {
      limiter.setChannelOverride("slow-channel", "message", {
        limit: 5,
        windowMs: 60000,
      });

      const slowResult = limiter.check("message", "user-1", {
        channelId: "slow-channel",
      });
      const normalResult = limiter.check("message", "user-1", {
        channelId: "normal-channel",
      });

      expect(slowResult.limit).toBe(5);
      expect(normalResult.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });

    it("should remove user overrides", () => {
      limiter.setUserOverride("user-1", "message", {
        limit: 100,
        windowMs: 60000,
      });

      limiter.removeUserOverride("user-1", "message");

      // Should use default now
      const result = limiter.check("message", "user-1");
      expect(result.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });

    it("should remove channel overrides", () => {
      limiter.setChannelOverride("channel-1", "message", {
        limit: 5,
        windowMs: 60000,
      });

      limiter.removeChannelOverride("channel-1", "message");

      const result = limiter.check("message", "user-1", {
        channelId: "channel-1",
      });
      expect(result.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });
  });

  // ============================================================================
  // Trusted Users Tests
  // ============================================================================

  describe("Trusted Users", () => {
    it("should skip limits for trusted users", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000, skipTrusted: true },
        },
        trustedUsers: ["trusted-user"],
      });

      // Use up the limit
      testLimiter.check("message", "trusted-user");
      testLimiter.check("message", "trusted-user");
      testLimiter.check("message", "trusted-user");

      // Trusted user should still be allowed
      expect(testLimiter.check("message", "trusted-user").allowed).toBe(true);

      testLimiter.destroy();
    });

    it("should add trusted users", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000, skipTrusted: true },
        },
      });

      testLimiter.addTrustedUser("new-trusted");

      testLimiter.check("message", "new-trusted");
      expect(testLimiter.check("message", "new-trusted").allowed).toBe(true);

      testLimiter.destroy();
    });

    it("should remove trusted users", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000, skipTrusted: true },
        },
        trustedUsers: ["trusted-user"],
      });

      testLimiter.removeTrustedUser("trusted-user");

      testLimiter.check("message", "trusted-user");
      expect(testLimiter.check("message", "trusted-user").allowed).toBe(false);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Strict Limits Tests
  // ============================================================================

  describe("Strict Limits", () => {
    it("should apply strict limits to users", () => {
      limiter.applyStrictLimits("suspicious-user");

      const result = limiter.check("message", "suspicious-user");
      expect(result.limit).toBe(STRICT_RATE_LIMITS.message!.limit);
    });

    it("should remove strict limits from users", () => {
      limiter.applyStrictLimits("user-1");
      limiter.removeStrictLimits("user-1");

      const result = limiter.check("message", "user-1");
      expect(result.limit).toBe(DEFAULT_RATE_LIMITS.message.limit);
    });
  });

  // ============================================================================
  // Role Exemptions Tests
  // ============================================================================

  describe("Role Exemptions", () => {
    it("should exempt specific roles", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: {
            limit: 1,
            windowMs: 60000,
            exemptRoles: ["admin", "moderator"],
          },
        },
      });

      testLimiter.check("message", "admin-user", { userRole: "admin" });
      testLimiter.check("message", "admin-user", { userRole: "admin" });

      // Admin should still be allowed
      expect(
        testLimiter.check("message", "admin-user", { userRole: "admin" })
          .allowed,
      ).toBe(true);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Multiple Actions Tests
  // ============================================================================

  describe("Multiple Actions", () => {
    it("should check multiple actions at once", () => {
      const { allowed, results } = limiter.checkMultiple([
        { action: "message", identifier: "user-1" },
        { action: "reaction", identifier: "user-1" },
      ]);

      expect(allowed).toBe(true);
      expect(results.length).toBe(2);
    });

    it("should deny if any action is denied", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
          reaction: { limit: 100, windowMs: 60000 },
        },
      });

      // Use up message limit
      testLimiter.check("message", "user-1");

      const { allowed, results } = testLimiter.checkMultiple([
        { action: "message", identifier: "user-1" },
        { action: "reaction", identifier: "user-1" },
      ]);

      expect(allowed).toBe(false);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Violation Tracking Tests
  // ============================================================================

  describe("Violation Tracking", () => {
    it("should track violations", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1"); // This should record a violation

      expect(testLimiter.getViolationCount("user-1")).toBe(1);

      testLimiter.destroy();
    });

    it("should identify repeat offenders", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      // Generate multiple violations
      for (let i = 0; i < 6; i++) {
        testLimiter.check("message", "user-1");
        testLimiter.check("message", "user-1");
      }

      expect(testLimiter.isRepeatOffender("user-1", 5)).toBe(true);

      testLimiter.destroy();
    });

    it("should calculate escalation multiplier", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      // Generate violations
      for (let i = 0; i < 4; i++) {
        testLimiter.check("message", "user-1");
        testLimiter.check("message", "user-1");
      }

      expect(testLimiter.getEscalationMultiplier("user-1")).toBeGreaterThan(1);

      testLimiter.destroy();
    });

    it("should clear violations", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");

      testLimiter.clearViolations("user-1");

      expect(testLimiter.getViolationCount("user-1")).toBe(0);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Reset Tests
  // ============================================================================

  describe("Reset", () => {
    it("should reset specific action for user", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      testLimiter.check("message", "user-1");
      expect(testLimiter.check("message", "user-1").allowed).toBe(false);

      testLimiter.reset("message", "user-1");
      expect(testLimiter.check("message", "user-1").allowed).toBe(true);

      testLimiter.destroy();
    });

    it("should reset all limits for user", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
          reaction: { limit: 1, windowMs: 60000 },
        },
      });

      testLimiter.check("message", "user-1");
      testLimiter.check("reaction", "user-1");

      testLimiter.resetAll("user-1");

      expect(testLimiter.check("message", "user-1").allowed).toBe(true);
      expect(testLimiter.check("reaction", "user-1").allowed).toBe(true);

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // State Tests
  // ============================================================================

  describe("State Management", () => {
    it("should get current state", () => {
      limiter.check("message", "user-1");

      const state = limiter.getState("message", "user-1");

      expect(state).toBeDefined();
      expect(state?.count).toBe(1);
    });

    it("should return undefined for non-existent state", () => {
      const state = limiter.getState("message", "non-existent-user");
      expect(state).toBeUndefined();
    });

    it("should set remaining count manually", () => {
      limiter.check("message", "user-1");
      limiter.setRemaining("message", "user-1", 10);

      const result = limiter.check("message", "user-1", { consume: false });
      expect(result.remaining).toBe(10);
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("Statistics", () => {
    it("should provide statistics", () => {
      limiter.check("message", "user-1");
      limiter.check("reaction", "user-1");
      limiter.check("message", "user-2");

      const stats = limiter.getStats();

      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.byAction.message).toBeGreaterThan(0);
    });

    it("should get rate-limited identifiers", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      testLimiter.check("message", "user-1");
      testLimiter.check("message", "user-1");

      const limited = testLimiter.getRateLimitedIdentifiers("message");
      expect(limited).toContain("user-1");

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Utility Functions Tests
  // ============================================================================

  describe("Utility Functions", () => {
    it("should format retry-after duration", () => {
      expect(formatRetryAfter(5000)).toBe("5 seconds");
      expect(formatRetryAfter(60000)).toBe("1 minute");
      expect(formatRetryAfter(120000)).toBe("2 minutes");
      expect(formatRetryAfter(3600000)).toBe("1 hour");
      expect(formatRetryAfter(7200000)).toBe("2 hours");
    });

    it("should create rate limit headers", () => {
      const result = limiter.check("message", "user-1");
      const headers = createRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBeDefined();
      expect(headers["X-RateLimit-Remaining"]).toBeDefined();
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
    });

    it("should include Retry-After header when denied", () => {
      const testLimiter = createRateLimiter({
        defaults: {
          message: { limit: 1, windowMs: 60000 },
        },
      });

      testLimiter.check("message", "user-1");
      const result = testLimiter.check("message", "user-1");
      const headers = createRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBeDefined();

      testLimiter.destroy();
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe("Singleton", () => {
    it("should return same instance without options", () => {
      const instance1 = getRateLimiter();
      const instance2 = getRateLimiter();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // Action Types Tests
  // ============================================================================

  describe("Action Types", () => {
    const actionTypes: RateLimitAction[] = [
      "message",
      "reaction",
      "channel_join",
      "channel_create",
      "api_call",
      "file_upload",
      "friend_request",
      "mention",
      "dm_create",
      "invite_create",
      "report",
      "profile_update",
      "webhook_call",
      "search",
      "export",
    ];

    actionTypes.forEach((action) => {
      it(`should have default config for ${action}`, () => {
        expect(DEFAULT_RATE_LIMITS[action]).toBeDefined();
        expect(DEFAULT_RATE_LIMITS[action].limit).toBeGreaterThan(0);
        expect(DEFAULT_RATE_LIMITS[action].windowMs).toBeGreaterThan(0);
      });

      it(`should check rate limit for ${action}`, () => {
        const result = limiter.check(action, "user-1");
        expect(result.allowed).toBe(true);
        expect(result.action).toBe(action);
      });
    });
  });
});
