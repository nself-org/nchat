/**
 * Rate Limit Service Tests
 *
 * Tests for the unified rate limiting service.
 */

import {
  RateLimitService,
  createRateLimitService,
  RATE_LIMIT_CONFIGS,
  ENDPOINT_CATEGORY_MAP,
} from "../rate-limit-service";
import type { RateLimitMetadata, UserTier } from "../types";

describe("RateLimitService", () => {
  let service: RateLimitService;

  beforeEach(() => {
    // Use memory store for testing
    service = createRateLimitService({
      storeType: "memory",
      enablePenaltyBox: true,
      violationThreshold: 3,
      penaltyDuration: 60, // 1 minute for testing
    });
  });

  afterEach(async () => {
    await service.clearAll();
  });

  describe("check()", () => {
    it("should allow requests within limit", async () => {
      const metadata: RateLimitMetadata = {
        userId: "user-123",
        ip: "192.168.1.1",
        userRole: "member",
      };

      const result = await service.check("api_general", metadata);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThan(result.limit);
    });

    it("should block requests over limit", async () => {
      const metadata: RateLimitMetadata = {
        userId: "user-456",
        ip: "192.168.1.2",
        userRole: "member",
      };

      // Auth category has 5 requests per minute
      for (let i = 0; i < 5; i++) {
        await service.check("auth", metadata);
      }

      // 6th request should be blocked
      const result = await service.check("auth", metadata);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should apply tier multipliers", async () => {
      const baseMetadata: RateLimitMetadata = {
        ip: "192.168.1.3",
      };

      // Guest tier (0.5x multiplier)
      const guestMeta: RateLimitMetadata = {
        ...baseMetadata,
        userId: "guest-user",
        userRole: "guest",
      };

      // Premium tier (2x multiplier)
      const premiumMeta: RateLimitMetadata = {
        ...baseMetadata,
        userId: "premium-user",
        userRole: "premium",
      };

      const guestResult = await service.check("api_general", guestMeta);
      const premiumResult = await service.check("api_general", premiumMeta);

      // Premium should have higher limit than guest
      expect(premiumResult.limit).toBeGreaterThan(guestResult.limit);
    });

    it("should bypass for internal tier", async () => {
      const metadata: RateLimitMetadata = {
        userId: "internal-service",
        ip: "127.0.0.1",
        userRole: "internal",
      };

      const result = await service.check("auth_sensitive", metadata);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(result.limit); // No decrement
    });
  });

  describe("checkEndpoint()", () => {
    it("should map endpoints to categories correctly", async () => {
      const metadata: RateLimitMetadata = {
        userId: "user-789",
        ip: "192.168.1.4",
      };

      const authResult = await service.checkEndpoint(
        "/api/auth/signin",
        "POST",
        metadata,
      );
      const searchResult = await service.checkEndpoint(
        "/api/search",
        "GET",
        metadata,
      );

      // Auth has strict limits (5/min)
      expect(authResult.limit).toBeLessThan(searchResult.limit);
      // Search has moderate limits (60/min + burst)
      const expectedSearchLimit =
        RATE_LIMIT_CONFIGS.search.maxRequests +
        (RATE_LIMIT_CONFIGS.search.burst || 0);
      expect(searchResult.limit).toBeLessThanOrEqual(expectedSearchLimit);
    });

    it("should use message_create category for POST to messages", async () => {
      const metadata: RateLimitMetadata = {
        userId: "user-msg",
        ip: "192.168.1.5",
      };

      // GET uses messages category (higher limit)
      const getResult = await service.checkEndpoint(
        "/api/messages",
        "GET",
        metadata,
      );

      // Create new service to get fresh limits
      const service2 = createRateLimitService({ storeType: "memory" });
      const postMeta: RateLimitMetadata = {
        userId: "user-msg-post",
        ip: "192.168.1.6",
      };

      // POST uses messages_create category (lower limit)
      const postResult = await service2.checkEndpoint(
        "/api/messages",
        "POST",
        postMeta,
      );

      expect(getResult.limit).toBeGreaterThan(postResult.limit);
      await service2.clearAll();
    });

    it("should fall back to api_general for unknown endpoints", async () => {
      const metadata: RateLimitMetadata = {
        userId: "user-unknown",
        ip: "192.168.1.7",
      };

      const result = await service.checkEndpoint(
        "/api/unknown/endpoint",
        "GET",
        metadata,
      );

      expect(result.limit).toBe(
        RATE_LIMIT_CONFIGS.api_general.maxRequests +
          (RATE_LIMIT_CONFIGS.api_general.burst || 0),
      );
    });
  });

  describe("Penalty Box", () => {
    it("should add violators to penalty box after threshold", async () => {
      const metadata: RateLimitMetadata = {
        userId: "bad-user",
        ip: "192.168.1.100",
      };

      // Exceed limit multiple times to trigger penalty box (threshold: 3)
      for (let violation = 0; violation < 3; violation++) {
        // Exhaust auth limit (5 requests)
        for (let i = 0; i < 6; i++) {
          await service.check("auth", metadata);
        }
        // Reset for next violation cycle
        await service.reset(`user:${metadata.userId}`);
      }

      // User should now be in penalty box
      const blocked = service.isBlocked(metadata.userId!);
      expect(blocked).not.toBeNull();
      expect(blocked?.identifier).toBe(metadata.userId);
    });

    it("should reject requests from penalty box", async () => {
      const identifier = "blocked-user";

      // Manually add to penalty box
      service.addToPenaltyBox(identifier, "Test block", 60);

      const metadata: RateLimitMetadata = {
        userId: identifier,
        ip: "192.168.1.200",
      };

      const result = await service.check("api_general", metadata);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0); // Indicates penalty box block
    });

    it("should allow removal from penalty box", async () => {
      const identifier = "temp-blocked";

      service.addToPenaltyBox(identifier, "Temporary block");

      expect(service.isBlocked(identifier)).not.toBeNull();

      service.removeFromPenaltyBox(identifier);

      expect(service.isBlocked(identifier)).toBeNull();
    });

    it("should list penalty box entries", () => {
      service.addToPenaltyBox("user-a", "Reason A");
      service.addToPenaltyBox("user-b", "Reason B");

      const entries = service.getPenaltyBoxEntries();

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.identifier)).toContain("user-a");
      expect(entries.map((e) => e.identifier)).toContain("user-b");
    });
  });

  describe("status()", () => {
    it("should return current status without incrementing", async () => {
      const metadata: RateLimitMetadata = {
        userId: "status-user",
        ip: "192.168.1.50",
      };

      // Make some requests
      await service.check("api_general", metadata);
      await service.check("api_general", metadata);

      // Check status
      const status = await service.status("api_general", metadata);

      expect(status.current).toBe(2);

      // Verify status didn't increment
      const status2 = await service.status("api_general", metadata);
      expect(status2.current).toBe(2);
    });
  });

  describe("reset()", () => {
    it("should reset rate limit for identifier", async () => {
      const metadata: RateLimitMetadata = {
        userId: "reset-user",
        ip: "192.168.1.60",
      };

      // Make requests
      await service.check("auth", metadata);
      await service.check("auth", metadata);

      // Reset
      await service.reset(`user:${metadata.userId}`);

      // Check status after reset
      const status = await service.status("auth", metadata);
      expect(status.current).toBe(0);
    });
  });

  describe("isHealthy()", () => {
    it("should return true for memory store", async () => {
      const healthy = await service.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe("getStoreName()", () => {
    it("should return store name", async () => {
      const name = await service.getStoreName();
      expect(name).toBe("memory");
    });
  });
});

describe("RATE_LIMIT_CONFIGS", () => {
  it("should have configurations for all endpoint categories", () => {
    const categories = [
      "auth",
      "auth_sensitive",
      "messages",
      "messages_create",
      "file_upload",
      "search",
      "api_general",
      "graphql",
      "websocket",
      "admin",
      "webhook",
      "bot",
      "ai",
      "export",
    ];

    for (const category of categories) {
      expect(RATE_LIMIT_CONFIGS[category]).toBeDefined();
      expect(RATE_LIMIT_CONFIGS[category].maxRequests).toBeGreaterThan(0);
      expect(RATE_LIMIT_CONFIGS[category].windowSeconds).toBeGreaterThan(0);
    }
  });

  it("should have stricter limits for auth endpoints", () => {
    expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBeLessThan(
      RATE_LIMIT_CONFIGS.api_general.maxRequests,
    );
    expect(RATE_LIMIT_CONFIGS.auth_sensitive.maxRequests).toBeLessThan(
      RATE_LIMIT_CONFIGS.auth.maxRequests,
    );
  });

  it("should have strictest limits for export endpoints", () => {
    expect(RATE_LIMIT_CONFIGS.export.maxRequests).toBeLessThanOrEqual(5);
    expect(RATE_LIMIT_CONFIGS.export.windowSeconds).toBeGreaterThanOrEqual(
      3600,
    );
  });
});

describe("ENDPOINT_CATEGORY_MAP", () => {
  it("should map auth endpoints correctly", () => {
    expect(ENDPOINT_CATEGORY_MAP["/api/auth/signin"]).toBe("auth");
    expect(ENDPOINT_CATEGORY_MAP["/api/auth/signup"]).toBe("auth");
    expect(ENDPOINT_CATEGORY_MAP["/api/auth/change-password"]).toBe(
      "auth_sensitive",
    );
  });

  it("should map AI endpoints correctly", () => {
    expect(ENDPOINT_CATEGORY_MAP["/api/ai"]).toBe("ai");
    expect(ENDPOINT_CATEGORY_MAP["/api/translate"]).toBe("ai");
  });

  it("should map export endpoints correctly", () => {
    expect(ENDPOINT_CATEGORY_MAP["/api/export"]).toBe("export");
    expect(ENDPOINT_CATEGORY_MAP["/api/compliance/export"]).toBe("export");
  });
});
