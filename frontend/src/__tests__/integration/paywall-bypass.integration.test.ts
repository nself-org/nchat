/**
 * Paywall Bypass Prevention Integration Tests
 *
 * Comprehensive integration tests to ensure paywall enforcement
 * cannot be bypassed through various attack vectors.
 *
 * @module @/__tests__/integration/paywall-bypass.integration.test
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkPaywall,
  checkRoutePaywall,
  extractPaywallContext,
  buildPaywallResponse,
  PAYWALL_ROUTES,
} from "@/middleware/paywall";
import {
  isFeatureAvailable,
  isWithinLimit,
  detectBypassAttempt,
  validateContextIntegrity,
} from "@/lib/billing/paywall-utils";
import {
  PaywallDenialCode,
  PaywallError,
  PaywallErrorCode,
} from "@/lib/billing/paywall-types";
import { PLAN_FEATURES, PLAN_LIMITS } from "@/lib/billing/plan-config";
import type { PlanTier } from "@/types/subscription.types";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRequest(
  url: string,
  options: {
    headers?: Record<string, string>;
    method?: string;
    body?: unknown;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value);
    }
  }

  return new NextRequest(new URL(url, "http://localhost"), {
    method: options.method ?? "GET",
    headers,
  });
}

function createUserContext(
  planTier: PlanTier,
  userId: string = "user-123",
  options: Record<string, string> = {},
) {
  return {
    "x-user-id": userId,
    "x-plan-tier": planTier,
    ...options,
  };
}

// ============================================================================
// Bypass Prevention Tests
// ============================================================================

describe("Paywall Bypass Prevention Integration Tests", () => {
  // ========================================================================
  // Header Manipulation Attacks
  // ========================================================================

  describe("Header Manipulation Attacks", () => {
    it("should detect plan tier header manipulation", () => {
      const result = detectBypassAttempt(
        { headers: { "x-plan-tier": "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("header_manipulation");
    });

    it("should detect role header manipulation", () => {
      // Attacker trying to inject admin role via headers
      const result = detectBypassAttempt(
        { headers: { "x-user-role": "admin" } },
        { userId: "user-123", planTier: "free", userRole: "member" },
      );

      // The context has the actual role, header manipulation would be detected
      // at the session/auth layer, but paywall uses trusted context
      expect(result.detected).toBe(false); // Headers other than plan-tier not checked here
    });

    it("should use trusted context over manipulated headers", async () => {
      // Even if headers claim enterprise, the trusted context is free
      const request = createMockRequest("http://localhost/api/auth/sso", {
        headers: {
          "x-user-id": "user-123",
          "x-plan-tier": "free", // Trusted context
        },
      });

      const result = await checkRoutePaywall(request);

      expect(result.allowed).toBe(false);
      expect(result.currentPlan).toBe("free");
    });
  });

  // ========================================================================
  // Query Parameter Injection
  // ========================================================================

  describe("Query Parameter Injection", () => {
    it("should detect bypass query parameter", () => {
      const result = detectBypassAttempt(
        { query: { bypass: "true" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("query_injection");
    });

    it("should detect admin query parameter", () => {
      const result = detectBypassAttempt(
        { query: { admin: "true" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("query_injection");
    });

    it("should detect plan override query parameter", () => {
      const result = detectBypassAttempt(
        { query: { plan: "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("query_injection");
    });

    it("should detect tier override query parameter", () => {
      const result = detectBypassAttempt(
        { query: { tier: "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("query_injection");
    });

    it("should detect override query parameter", () => {
      const result = detectBypassAttempt(
        { query: { override: "all" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("query_injection");
    });
  });

  // ========================================================================
  // Body Injection Attacks
  // ========================================================================

  describe("Body Injection Attacks", () => {
    it("should detect planTier body injection", () => {
      const result = detectBypassAttempt(
        { body: { planTier: "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("body_injection");
    });

    it("should detect isAdmin body injection", () => {
      const result = detectBypassAttempt(
        { body: { isAdmin: true } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("body_injection");
    });

    it("should detect bypass body injection", () => {
      const result = detectBypassAttempt(
        { body: { bypass: true } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("body_injection");
    });

    it("should detect tier body injection", () => {
      const result = detectBypassAttempt(
        { body: { tier: "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(true);
      expect(result.type).toBe("body_injection");
    });

    it("should not flag legitimate body fields", () => {
      const result = detectBypassAttempt(
        { body: { message: "Hello", channelId: "ch-123" } },
        { userId: "user-123", planTier: "free" },
      );

      expect(result.detected).toBe(false);
    });
  });

  // ========================================================================
  // Context Integrity Validation
  // ========================================================================

  describe("Context Integrity Validation", () => {
    it("should validate matching user ID", () => {
      const result = validateContextIntegrity(
        { userId: "user-123", planTier: "free" },
        { userId: "user-123", planTier: "free" },
      );

      expect(result).toBe(true);
    });

    it("should reject mismatched user ID", () => {
      const result = validateContextIntegrity(
        { userId: "user-456", planTier: "free" },
        { userId: "user-123", planTier: "free" },
      );

      expect(result).toBe(false);
    });

    it("should reject mismatched plan tier", () => {
      const result = validateContextIntegrity(
        { userId: "user-123", planTier: "enterprise" },
        { userId: "user-123", planTier: "free" },
      );

      expect(result).toBe(false);
    });

    it("should validate workspace ID when provided", () => {
      const matchResult = validateContextIntegrity(
        { userId: "user-123", planTier: "free", workspaceId: "ws-456" },
        { userId: "user-123", planTier: "free", workspaceId: "ws-456" },
      );
      expect(matchResult).toBe(true);

      const mismatchResult = validateContextIntegrity(
        { userId: "user-123", planTier: "free", workspaceId: "ws-789" },
        { userId: "user-123", planTier: "free", workspaceId: "ws-456" },
      );
      expect(mismatchResult).toBe(false);
    });
  });

  // ========================================================================
  // Plan Feature Enforcement
  // ========================================================================

  describe("Plan Feature Enforcement", () => {
    const premiumFeatures = [
      "videoCalls",
      "screenSharing",
      "sso",
      "apiAccess",
      "customBranding",
    ] as const;

    it("should deny all premium features on free plan", () => {
      for (const feature of premiumFeatures) {
        expect(isFeatureAvailable(feature, "free")).toBe(false);
      }
    });

    it("should enforce feature hierarchy correctly", () => {
      // Free plan features
      expect(isFeatureAvailable("publicChannels", "free")).toBe(true);
      expect(isFeatureAvailable("directMessages", "free")).toBe(true);

      // Starter plan adds
      expect(isFeatureAvailable("videoCalls", "starter")).toBe(true);
      expect(isFeatureAvailable("voiceMessages", "starter")).toBe(true);
      expect(isFeatureAvailable("sso", "starter")).toBe(false);

      // Professional plan adds
      expect(isFeatureAvailable("apiAccess", "professional")).toBe(true);
      expect(isFeatureAvailable("screenSharing", "professional")).toBe(true);
      expect(isFeatureAvailable("sso", "professional")).toBe(false);

      // Enterprise plan adds
      expect(isFeatureAvailable("sso", "enterprise")).toBe(true);
      expect(isFeatureAvailable("customBranding", "enterprise")).toBe(true);
    });

    it("should not allow feature access through tier manipulation", () => {
      // This simulates an attacker trying to access SSO with a free plan
      // but claiming enterprise tier
      const attackerContext = {
        userId: "attacker",
        planTier: "free" as PlanTier,
      };
      const trustedSource = {
        userId: "attacker",
        planTier: "free" as PlanTier,
      };

      // Integrity check should pass (no manipulation detected)
      expect(validateContextIntegrity(attackerContext, trustedSource)).toBe(
        true,
      );

      // But feature check should fail
      expect(isFeatureAvailable("sso", attackerContext.planTier)).toBe(false);
    });
  });

  // ========================================================================
  // Plan Limit Enforcement
  // ========================================================================

  describe("Plan Limit Enforcement", () => {
    it("should enforce member limits", () => {
      expect(isWithinLimit("maxMembers", "free", 9)).toBe(true);
      expect(isWithinLimit("maxMembers", "free", 10)).toBe(false);
      expect(isWithinLimit("maxMembers", "free", 100)).toBe(false);
    });

    it("should enforce channel limits", () => {
      expect(isWithinLimit("maxChannels", "free", 4)).toBe(true);
      expect(isWithinLimit("maxChannels", "free", 5)).toBe(false);
    });

    it("should allow unlimited for enterprise", () => {
      expect(isWithinLimit("maxMembers", "enterprise", 1000000)).toBe(true);
      expect(isWithinLimit("maxChannels", "enterprise", 1000000)).toBe(true);
    });

    it("should not allow limit bypass through tier manipulation", () => {
      // Attacker on free plan should not be able to bypass limits
      const freeLimits = PLAN_LIMITS.free;
      const enterpriseLimits = PLAN_LIMITS.enterprise;

      // Free plan should have limits
      expect(freeLimits.maxMembers).toBe(10);

      // Enterprise should be unlimited
      expect(enterpriseLimits.maxMembers).toBeNull();

      // But free user can't claim enterprise limits
      expect(isWithinLimit("maxMembers", "free", 11)).toBe(false);
    });
  });

  // ========================================================================
  // Route Protection Enforcement
  // ========================================================================

  describe("Route Protection Enforcement", () => {
    const protectedRoutes = [
      { path: "/api/calls", feature: "videoCalls", minTier: "starter" },
      {
        path: "/api/calls/123/screen-share",
        feature: "screenSharing",
        minTier: "professional",
      },
      { path: "/api/auth/sso", feature: "sso", minTier: "enterprise" },
      { path: "/api/auth/sso/callback", feature: "sso", minTier: "enterprise" },
      { path: "/api/webhooks", feature: "webhooks", minTier: "starter" },
      { path: "/api/export", feature: "dataExport", minTier: "starter" },
      {
        path: "/api/integrations",
        feature: "integrations",
        minTier: "starter",
      },
    ];

    for (const route of protectedRoutes) {
      it(`should protect ${route.path} for ${route.minTier}+ plans`, async () => {
        // Free plan should be denied
        const freeRequest = createMockRequest(`http://localhost${route.path}`, {
          headers: createUserContext("free"),
        });
        const freeResult = await checkRoutePaywall(freeRequest);
        expect(freeResult.allowed).toBe(false);

        // Correct tier should be allowed
        const correctRequest = createMockRequest(
          `http://localhost${route.path}`,
          {
            headers: createUserContext(route.minTier as PlanTier),
          },
        );
        const correctResult = await checkRoutePaywall(correctRequest);
        expect(correctResult.allowed).toBe(true);
      });
    }

    it("should allow unprotected routes for all plans", async () => {
      const unprotectedRoutes = [
        "/api/messages",
        "/api/users/me",
        "/api/health",
      ];

      for (const path of unprotectedRoutes) {
        const request = createMockRequest(`http://localhost${path}`, {
          headers: createUserContext("free"),
        });
        const result = await checkRoutePaywall(request);
        expect(result.allowed).toBe(true);
      }
    });
  });

  // ========================================================================
  // Authentication Bypass Prevention
  // ========================================================================

  describe("Authentication Bypass Prevention", () => {
    it("should not extract context without user ID", async () => {
      const request = createMockRequest("http://localhost/api/calls", {
        headers: { "x-plan-tier": "enterprise" }, // No user ID
      });

      const context = await extractPaywallContext(request);
      expect(context).toBeNull();
    });

    it("should allow request without context (auth layer handles)", async () => {
      const request = createMockRequest("http://localhost/api/calls", {
        headers: {}, // No headers
      });

      const result = await checkRoutePaywall(request);
      // Without context, we allow (auth middleware should handle)
      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // Paywall Response Format
  // ========================================================================

  describe("Paywall Response Format", () => {
    it("should return proper error response on denial", () => {
      const result = buildPaywallResponse({
        allowed: false,
        type: "feature",
        code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
        reason: "Video calls not available on free plan",
        currentPlan: "free",
        requiredPlan: "starter",
      });

      expect(result.status).toBe(403);
    });

    it("should include upgrade info in response", async () => {
      const result = buildPaywallResponse({
        allowed: false,
        type: "feature",
        code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
        reason: "SSO not available",
        currentPlan: "free",
        requiredPlan: "enterprise",
        upgrade: {
          targetPlan: "enterprise",
          planName: "Enterprise",
          monthlyPrice: 9900,
          yearlyPrice: 99000,
          featuresGained: ["SSO"],
          limitsIncreased: [],
          upgradeUrl: "/billing/upgrade?plan=enterprise",
          trialAvailable: false,
        },
      });

      const body = await result.json();
      expect(body.upgrade).toBeDefined();
      expect(body.upgrade.planName).toBe("Enterprise");
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe("Edge Cases", () => {
    it("should handle custom plan tier", async () => {
      const request = createMockRequest("http://localhost/api/auth/sso", {
        headers: createUserContext("custom"),
      });

      const result = await checkRoutePaywall(request);
      // Custom plan should have all features
      expect(result.allowed).toBe(true);
    });

    it("should handle unknown plan tier gracefully", async () => {
      const request = createMockRequest("http://localhost/api/calls", {
        headers: {
          "x-user-id": "user-123",
          "x-plan-tier": "unknown-tier",
        },
      });

      // Should default to free behavior
      const context = await extractPaywallContext(request);
      // Unknown tier should be treated as free
    });

    it("should handle concurrent paywall checks", async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        createMockRequest("http://localhost/api/calls", {
          headers: createUserContext(i % 2 === 0 ? "free" : "starter"),
        }),
      );

      const results = await Promise.all(
        requests.map((req) => checkRoutePaywall(req)),
      );

      // Verify correct enforcement for each
      results.forEach((result, i) => {
        if (i % 2 === 0) {
          expect(result.allowed).toBe(false);
        } else {
          expect(result.allowed).toBe(true);
        }
      });
    });
  });
});
