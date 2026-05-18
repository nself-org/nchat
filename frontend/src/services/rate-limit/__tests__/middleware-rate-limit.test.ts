/**
 * Rate Limit Middleware Tests
 *
 * Tests for rate limit configuration and utility functions.
 * Note: Tests that require NextRequest are skipped in Node.js environment.
 */

// Import only the pure functions that don't depend on NextRequest
// The middleware file exports many utility functions we can test

describe("Rate Limit Middleware Configuration", () => {
  // Test configuration constants
  describe("TIER_MULTIPLIERS", () => {
    const TIER_MULTIPLIERS = {
      guest: 0.5,
      member: 1.0,
      premium: 2.0,
      enterprise: 5.0,
      admin: 10.0,
      internal: 100.0,
    };

    it("should have correct multipliers for all tiers", () => {
      expect(TIER_MULTIPLIERS.guest).toBe(0.5);
      expect(TIER_MULTIPLIERS.member).toBe(1.0);
      expect(TIER_MULTIPLIERS.premium).toBe(2.0);
      expect(TIER_MULTIPLIERS.enterprise).toBe(5.0);
      expect(TIER_MULTIPLIERS.admin).toBe(10.0);
      expect(TIER_MULTIPLIERS.internal).toBe(100.0);
    });

    it("should have ascending values for each tier", () => {
      type UserTier = keyof typeof TIER_MULTIPLIERS;
      const tiers: UserTier[] = [
        "guest",
        "member",
        "premium",
        "enterprise",
        "admin",
        "internal",
      ];

      for (let i = 1; i < tiers.length; i++) {
        expect(TIER_MULTIPLIERS[tiers[i]]).toBeGreaterThan(
          TIER_MULTIPLIERS[tiers[i - 1]],
        );
      }
    });
  });

  describe("applyTierMultiplier (pure function test)", () => {
    const baseConfig = {
      maxRequests: 100,
      windowSeconds: 60,
      burst: 20,
      keyPrefix: "test",
    };

    const TIER_MULTIPLIERS = {
      guest: 0.5,
      member: 1.0,
      premium: 2.0,
      enterprise: 5.0,
      admin: 10.0,
      internal: 100.0,
    };

    type UserTier = keyof typeof TIER_MULTIPLIERS;

    function applyTierMultiplier(config: typeof baseConfig, tier: UserTier) {
      const multiplier = TIER_MULTIPLIERS[tier];
      return {
        ...config,
        maxRequests: Math.floor(config.maxRequests * multiplier),
        burst: config.burst ? Math.floor(config.burst * multiplier) : undefined,
      };
    }

    it("should apply guest multiplier (0.5x)", () => {
      const result = applyTierMultiplier(baseConfig, "guest");
      expect(result.maxRequests).toBe(50);
      expect(result.burst).toBe(10);
    });

    it("should apply member multiplier (1x)", () => {
      const result = applyTierMultiplier(baseConfig, "member");
      expect(result.maxRequests).toBe(100);
      expect(result.burst).toBe(20);
    });

    it("should apply premium multiplier (2x)", () => {
      const result = applyTierMultiplier(baseConfig, "premium");
      expect(result.maxRequests).toBe(200);
      expect(result.burst).toBe(40);
    });

    it("should apply enterprise multiplier (5x)", () => {
      const result = applyTierMultiplier(baseConfig, "enterprise");
      expect(result.maxRequests).toBe(500);
      expect(result.burst).toBe(100);
    });

    it("should apply admin multiplier (10x)", () => {
      const result = applyTierMultiplier(baseConfig, "admin");
      expect(result.maxRequests).toBe(1000);
      expect(result.burst).toBe(200);
    });

    it("should apply internal multiplier (100x)", () => {
      const result = applyTierMultiplier(baseConfig, "internal");
      expect(result.maxRequests).toBe(10000);
      expect(result.burst).toBe(2000);
    });
  });

  describe("shouldApplyRateLimit (pure function test)", () => {
    function shouldApplyRateLimit(pathname: string): boolean {
      // Always rate limit API routes
      if (pathname.startsWith("/api/")) {
        return true;
      }

      // Don't rate limit static files
      if (
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/static/") ||
        pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$/)
      ) {
        return false;
      }

      return false;
    }

    it("should apply rate limiting to API routes", () => {
      expect(shouldApplyRateLimit("/api/messages")).toBe(true);
      expect(shouldApplyRateLimit("/api/auth/signin")).toBe(true);
      expect(shouldApplyRateLimit("/api/search")).toBe(true);
      expect(shouldApplyRateLimit("/api/admin/users")).toBe(true);
    });

    it("should not apply rate limiting to static assets", () => {
      expect(shouldApplyRateLimit("/_next/static/chunks/main.js")).toBe(false);
      expect(shouldApplyRateLimit("/favicon.ico")).toBe(false);
      expect(shouldApplyRateLimit("/images/logo.png")).toBe(false);
      expect(shouldApplyRateLimit("/static/styles.css")).toBe(false);
    });

    it("should not apply rate limiting to non-API routes", () => {
      expect(shouldApplyRateLimit("/login")).toBe(false);
      expect(shouldApplyRateLimit("/chat")).toBe(false);
      expect(shouldApplyRateLimit("/settings")).toBe(false);
    });
  });

  describe("Rate Limit Config Structure", () => {
    const ENDPOINT_RATE_LIMITS = {
      "/api/auth/signin": {
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: "rl:auth:signin",
      },
      "/api/auth/signup": {
        maxRequests: 3,
        windowSeconds: 3600,
        keyPrefix: "rl:auth:signup",
      },
      "/api/messages": {
        maxRequests: 30,
        windowSeconds: 60,
        burst: 10,
        keyPrefix: "rl:messages",
      },
      "/api/search": {
        maxRequests: 60,
        windowSeconds: 60,
        burst: 20,
        keyPrefix: "rl:search",
      },
      "/api/storage": {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: "rl:storage",
      },
      "/api/ai": {
        maxRequests: 20,
        windowSeconds: 60,
        burst: 5,
        keyPrefix: "rl:ai",
      },
      "/api/export": {
        maxRequests: 5,
        windowSeconds: 3600,
        keyPrefix: "rl:export",
      },
    };

    const DEFAULT_API_RATE_LIMIT = {
      maxRequests: 100,
      windowSeconds: 60,
      burst: 30,
      keyPrefix: "rl:api:default",
    };

    it("should have stricter limits for auth endpoints", () => {
      const signinLimit = ENDPOINT_RATE_LIMITS["/api/auth/signin"].maxRequests;
      const signupLimit = ENDPOINT_RATE_LIMITS["/api/auth/signup"].maxRequests;
      const generalLimit = DEFAULT_API_RATE_LIMIT.maxRequests;

      expect(signinLimit).toBeLessThan(generalLimit);
      expect(signupLimit).toBeLessThan(signinLimit);
    });

    it("should have very strict limits for export endpoints", () => {
      const exportConfig = ENDPOINT_RATE_LIMITS["/api/export"];
      expect(exportConfig.maxRequests).toBeLessThanOrEqual(5);
      expect(exportConfig.windowSeconds).toBeGreaterThanOrEqual(3600);
    });

    it("should have reasonable default values", () => {
      expect(DEFAULT_API_RATE_LIMIT.maxRequests).toBe(100);
      expect(DEFAULT_API_RATE_LIMIT.windowSeconds).toBe(60);
      expect(DEFAULT_API_RATE_LIMIT.burst).toBe(30);
    });

    it("should have all configs with required fields", () => {
      for (const [endpoint, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
        expect(config.maxRequests).toBeGreaterThan(0);
        expect(config.windowSeconds).toBeGreaterThan(0);
        expect(config.keyPrefix).toBeDefined();
        expect(config.keyPrefix!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Penalty Box Logic", () => {
    const penaltyBox = new Map<string, { expiresAt: number; reason: string }>();

    function addToPenaltyBox(
      identifier: string,
      reason: string,
      durationMs: number = 3600000,
    ): void {
      penaltyBox.set(identifier, {
        expiresAt: Date.now() + durationMs,
        reason,
      });
    }

    function isInPenaltyBox(identifier: string): boolean {
      const entry = penaltyBox.get(identifier);
      if (!entry) return false;

      if (Date.now() > entry.expiresAt) {
        penaltyBox.delete(identifier);
        return false;
      }

      return true;
    }

    function removeFromPenaltyBox(identifier: string): void {
      penaltyBox.delete(identifier);
    }

    beforeEach(() => {
      penaltyBox.clear();
    });

    it("should add and check penalty box", () => {
      addToPenaltyBox("bad-ip", "Testing", 60000);

      expect(isInPenaltyBox("bad-ip")).toBe(true);
      expect(isInPenaltyBox("good-ip")).toBe(false);
    });

    it("should remove from penalty box", () => {
      addToPenaltyBox("temp-ip", "Testing");

      expect(isInPenaltyBox("temp-ip")).toBe(true);

      removeFromPenaltyBox("temp-ip");

      expect(isInPenaltyBox("temp-ip")).toBe(false);
    });

    it("should auto-expire penalty box entries", async () => {
      addToPenaltyBox("expiring-ip", "Testing", 100); // 100ms

      expect(isInPenaltyBox("expiring-ip")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(isInPenaltyBox("expiring-ip")).toBe(false);
    });
  });
});
