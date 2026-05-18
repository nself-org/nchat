/**
 * Paywall Middleware Tests
 *
 * Comprehensive tests for paywall enforcement including bypass prevention.
 *
 * @module @/middleware/__tests__/paywall.test
 */

import {
  checkFeaturePaywall,
  checkLimitPaywall,
  checkTierPaywall,
  checkRolePaywall,
  checkChannelPaywall,
  checkTimePaywall,
  findMinimumTierForFeature,
  findMinimumTierForHigherLimit,
  getWarningLevel,
  buildUpgradeInfo,
  matchRouteToPaywall,
  PAYWALL_ROUTES,
} from "../paywall";
import type {
  FeaturePaywallConfig,
  LimitPaywallConfig,
  TierPaywallConfig,
  RolePaywallConfig,
  ChannelPaywallConfig,
  TimePaywallConfig,
} from "@/lib/billing/paywall-types";
import { PaywallDenialCode } from "@/lib/billing/paywall-types";
import type { PlanTier } from "@/types/subscription.types";

// ============================================================================
// Test Context Helpers
// ============================================================================

function createContext(
  planTier: PlanTier,
  options: Record<string, unknown> = {},
) {
  return {
    userId: "user-123",
    planTier,
    ...options,
  };
}

describe("PaywallMiddleware", () => {
  // ========================================================================
  // Route Matching
  // ========================================================================

  describe("matchRouteToPaywall", () => {
    it("should match exact routes", () => {
      const config = matchRouteToPaywall("/api/calls");
      expect(config).toBeDefined();
      expect((config as FeaturePaywallConfig).feature).toBe("videoCalls");
    });

    it("should match wildcard routes", () => {
      const config = matchRouteToPaywall("/api/calls/123/join");
      expect(config).toBeDefined();
      expect((config as LimitPaywallConfig).limit).toBe("maxCallParticipants");
    });

    it("should return undefined for unprotected routes", () => {
      const config = matchRouteToPaywall("/api/messages");
      expect(config).toBeUndefined();
    });

    it("should match SSO routes", () => {
      const config = matchRouteToPaywall("/api/auth/sso");
      expect(config).toBeDefined();
      expect((config as FeaturePaywallConfig).feature).toBe("sso");
    });

    it("should match nested admin routes", () => {
      const config = matchRouteToPaywall("/api/admin/users");
      expect(config).toBeDefined();
      expect((config as FeaturePaywallConfig).feature).toBe("adminDashboard");
    });
  });

  describe("PAYWALL_ROUTES", () => {
    it("should have video call routes", () => {
      expect(PAYWALL_ROUTES["/api/calls"]).toBeDefined();
    });

    it("should have screen sharing route", () => {
      expect(PAYWALL_ROUTES["/api/calls/*/screen-share"]).toBeDefined();
    });

    it("should have webhook routes", () => {
      expect(PAYWALL_ROUTES["/api/webhooks"]).toBeDefined();
    });

    it("should have SSO routes", () => {
      expect(PAYWALL_ROUTES["/api/auth/sso"]).toBeDefined();
    });

    it("should have export routes", () => {
      expect(PAYWALL_ROUTES["/api/export"]).toBeDefined();
    });
  });

  // ========================================================================
  // Feature Paywall Checks
  // ========================================================================

  describe("checkFeaturePaywall", () => {
    const videoCallsConfig: FeaturePaywallConfig = {
      id: "video-calls",
      name: "Video Calls",
      type: "feature",
      feature: "videoCalls",
      action: "execute",
      enabled: true,
      priority: 100,
    };

    it("should allow access for starter plan", async () => {
      const result = await checkFeaturePaywall(
        videoCallsConfig,
        createContext("starter"),
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny access for free plan", async () => {
      const result = await checkFeaturePaywall(
        videoCallsConfig,
        createContext("free"),
      );
      expect(result.allowed).toBe(false);
      expect(result.type).toBe("feature");
      expect(result.code).toBe(PaywallDenialCode.FEATURE_NOT_AVAILABLE);
    });

    it("should include upgrade info on denial", async () => {
      const result = await checkFeaturePaywall(
        videoCallsConfig,
        createContext("free"),
      );
      expect(result.upgrade).toBeDefined();
      expect(result.upgrade?.targetPlan).toBe("starter");
    });

    it("should allow SSO for enterprise only", async () => {
      const ssoConfig: FeaturePaywallConfig = {
        id: "sso",
        name: "SSO",
        type: "feature",
        feature: "sso",
        action: "access",
        enabled: true,
        priority: 100,
      };

      const freeResult = await checkFeaturePaywall(
        ssoConfig,
        createContext("free"),
      );
      expect(freeResult.allowed).toBe(false);

      const proResult = await checkFeaturePaywall(
        ssoConfig,
        createContext("professional"),
      );
      expect(proResult.allowed).toBe(false);

      const entResult = await checkFeaturePaywall(
        ssoConfig,
        createContext("enterprise"),
      );
      expect(entResult.allowed).toBe(true);
    });
  });

  // ========================================================================
  // Limit Paywall Checks
  // ========================================================================

  describe("checkLimitPaywall", () => {
    const membersLimitConfig: LimitPaywallConfig = {
      id: "members-limit",
      name: "Member Limit",
      type: "limit",
      limit: "maxMembers",
      action: "create",
      enabled: true,
      priority: 100,
      warningThreshold: 80,
      hardLimit: true,
    };

    it("should allow within limit", async () => {
      const result = await checkLimitPaywall(
        membersLimitConfig,
        createContext("free"),
        5,
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny when exceeding limit", async () => {
      const result = await checkLimitPaywall(
        membersLimitConfig,
        createContext("free"),
        10,
      );
      expect(result.allowed).toBe(false);
      expect(result.type).toBe("limit");
      expect(result.code).toBe(PaywallDenialCode.LIMIT_EXCEEDED);
    });

    it("should include usage info", async () => {
      const result = await checkLimitPaywall(
        membersLimitConfig,
        createContext("free"),
        8,
      );
      expect(result.usage).toBeDefined();
      expect(result.usage?.current).toBe(8);
      expect(result.usage?.percentage).toBe(80);
    });

    it("should warn when approaching limit", async () => {
      const result = await checkLimitPaywall(
        membersLimitConfig,
        createContext("free"),
        8,
      );
      expect(result.allowed).toBe(true);
      expect(result.code).toBe(PaywallDenialCode.LIMIT_APPROACHING);
    });

    it("should allow unlimited for enterprise", async () => {
      const result = await checkLimitPaywall(
        membersLimitConfig,
        createContext("enterprise"),
        1000,
      );
      expect(result.allowed).toBe(true);
      expect(result.usage?.limit).toBeNull();
    });
  });

  // ========================================================================
  // Tier Paywall Checks
  // ========================================================================

  describe("checkTierPaywall", () => {
    const proTierConfig: TierPaywallConfig = {
      id: "pro-tier",
      name: "Professional Required",
      type: "tier",
      minimumTier: "professional",
      action: "access",
      enabled: true,
      priority: 100,
    };

    it("should allow access at or above tier", async () => {
      const proResult = await checkTierPaywall(
        proTierConfig,
        createContext("professional"),
      );
      expect(proResult.allowed).toBe(true);

      const entResult = await checkTierPaywall(
        proTierConfig,
        createContext("enterprise"),
      );
      expect(entResult.allowed).toBe(true);
    });

    it("should deny below tier", async () => {
      const result = await checkTierPaywall(
        proTierConfig,
        createContext("starter"),
      );
      expect(result.allowed).toBe(false);
      expect(result.type).toBe("tier");
      expect(result.requiredPlan).toBe("professional");
    });

    it("should handle custom tier with allowCustom", async () => {
      const configWithCustom: TierPaywallConfig = {
        ...proTierConfig,
        allowCustom: true,
      };
      const result = await checkTierPaywall(
        configWithCustom,
        createContext("custom"),
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // Role Paywall Checks
  // ========================================================================

  describe("checkRolePaywall", () => {
    const adminOnlyConfig: RolePaywallConfig = {
      id: "admin-only",
      name: "Admin Only",
      type: "role",
      allowedRoles: ["admin", "owner"],
      action: "access",
      enabled: true,
      priority: 100,
    };

    it("should allow access for allowed roles", async () => {
      const result = await checkRolePaywall(
        adminOnlyConfig,
        createContext("free", { userRole: "admin" }),
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny access for non-allowed roles", async () => {
      const result = await checkRolePaywall(
        adminOnlyConfig,
        createContext("free", { userRole: "member" }),
      );
      expect(result.allowed).toBe(false);
      expect(result.type).toBe("role");
    });

    it("should deny when role is in deniedRoles", async () => {
      const configWithDenied: RolePaywallConfig = {
        ...adminOnlyConfig,
        deniedRoles: ["guest"],
      };
      const result = await checkRolePaywall(
        configWithDenied,
        createContext("free", { userRole: "guest" }),
      );
      expect(result.allowed).toBe(false);
    });

    it("should deny when no role provided", async () => {
      const result = await checkRolePaywall(
        adminOnlyConfig,
        createContext("free"),
      );
      expect(result.allowed).toBe(false);
    });
  });

  // ========================================================================
  // Channel Paywall Checks
  // ========================================================================

  describe("checkChannelPaywall", () => {
    const premiumChannelConfig: ChannelPaywallConfig = {
      id: "premium-channel",
      name: "Premium Channel",
      type: "channel",
      premiumChannelIds: ["premium-channel-1", "premium-channel-2"],
      requiredFeature: "videoCalls",
      action: "access",
      enabled: true,
      priority: 100,
    };

    it("should allow access to non-premium channels", async () => {
      const result = await checkChannelPaywall(
        premiumChannelConfig,
        createContext("free", { channelId: "regular-channel" }),
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny free users from premium channels", async () => {
      const result = await checkChannelPaywall(
        premiumChannelConfig,
        createContext("free", { channelId: "premium-channel-1" }),
      );
      expect(result.allowed).toBe(false);
      expect(result.type).toBe("channel");
    });

    it("should allow paid users to access premium channels", async () => {
      const result = await checkChannelPaywall(
        premiumChannelConfig,
        createContext("starter", { channelId: "premium-channel-1" }),
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // Time Paywall Checks
  // ========================================================================

  describe("checkTimePaywall", () => {
    const subscriptionRequiredConfig: TimePaywallConfig = {
      id: "subscription-required",
      name: "Active Subscription Required",
      type: "time",
      requireActiveSubscription: true,
      action: "access",
      enabled: true,
      priority: 100,
    };

    it("should allow active subscriptions", async () => {
      const result = await checkTimePaywall(
        subscriptionRequiredConfig,
        createContext("starter", { subscriptionStatus: "active" }),
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny expired subscriptions", async () => {
      const result = await checkTimePaywall(
        subscriptionRequiredConfig,
        createContext("starter", { subscriptionStatus: "canceled" }),
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe(PaywallDenialCode.SUBSCRIPTION_EXPIRED);
    });

    it("should allow trialing subscriptions", async () => {
      const result = await checkTimePaywall(
        subscriptionRequiredConfig,
        createContext("starter", { subscriptionStatus: "trialing" }),
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // Helper Functions
  // ========================================================================

  describe("Helper Functions", () => {
    describe("findMinimumTierForFeature", () => {
      it("should find correct tier for video calls", () => {
        expect(findMinimumTierForFeature("videoCalls")).toBe("starter");
      });

      it("should find correct tier for SSO", () => {
        expect(findMinimumTierForFeature("sso")).toBe("enterprise");
      });

      it("should return free for basic features", () => {
        expect(findMinimumTierForFeature("publicChannels")).toBe("free");
      });
    });

    describe("getWarningLevel", () => {
      it("should return correct warning levels", () => {
        expect(getWarningLevel(40)).toBe("none");
        expect(getWarningLevel(60)).toBe("low");
        expect(getWarningLevel(80)).toBe("medium");
        expect(getWarningLevel(92)).toBe("high");
        expect(getWarningLevel(98)).toBe("critical");
      });
    });

    describe("buildUpgradeInfo", () => {
      it("should build complete upgrade info", () => {
        const info = buildUpgradeInfo("free", "starter", "videoCalls");
        expect(info).toBeDefined();
        expect(info?.targetPlan).toBe("starter");
        expect(info?.planName).toBe("Starter");
        expect(info?.featuresGained.length).toBeGreaterThan(0);
        expect(info?.upgradeUrl).toContain("starter");
      });

      it("should return undefined without target tier", () => {
        const info = buildUpgradeInfo("free", undefined as any);
        expect(info).toBeUndefined();
      });
    });
  });

  // ========================================================================
  // Bypass Prevention Tests
  // ========================================================================

  describe("Bypass Prevention", () => {
    describe("Feature Enforcement", () => {
      it("should enforce based on actual plan features", async () => {
        const config: FeaturePaywallConfig = {
          id: "test",
          name: "Test",
          type: "feature",
          feature: "sso",
          action: "access",
          enabled: true,
          priority: 100,
        };

        // Free plan should not have SSO
        const freeResult = await checkFeaturePaywall(
          config,
          createContext("free"),
        );
        expect(freeResult.allowed).toBe(false);

        // Starter should not have SSO
        const starterResult = await checkFeaturePaywall(
          config,
          createContext("starter"),
        );
        expect(starterResult.allowed).toBe(false);

        // Professional should not have SSO
        const proResult = await checkFeaturePaywall(
          config,
          createContext("professional"),
        );
        expect(proResult.allowed).toBe(false);

        // Enterprise should have SSO
        const entResult = await checkFeaturePaywall(
          config,
          createContext("enterprise"),
        );
        expect(entResult.allowed).toBe(true);
      });
    });

    describe("Limit Enforcement", () => {
      it("should enforce based on actual plan limits", async () => {
        const config: LimitPaywallConfig = {
          id: "test",
          name: "Test",
          type: "limit",
          limit: "maxMembers",
          action: "create",
          enabled: true,
          priority: 100,
          hardLimit: true,
        };

        // Free plan limit is 10
        expect(
          (await checkLimitPaywall(config, createContext("free"), 9)).allowed,
        ).toBe(true);
        expect(
          (await checkLimitPaywall(config, createContext("free"), 10)).allowed,
        ).toBe(false);
        expect(
          (await checkLimitPaywall(config, createContext("free"), 100)).allowed,
        ).toBe(false);

        // Enterprise has no limit
        expect(
          (await checkLimitPaywall(config, createContext("enterprise"), 10000))
            .allowed,
        ).toBe(true);
      });
    });

    describe("Tier Hierarchy", () => {
      it("should respect tier hierarchy", async () => {
        const config: TierPaywallConfig = {
          id: "test",
          name: "Test",
          type: "tier",
          minimumTier: "professional",
          action: "access",
          enabled: true,
          priority: 100,
        };

        // Lower tiers should be denied
        expect(
          (await checkTierPaywall(config, createContext("free"))).allowed,
        ).toBe(false);
        expect(
          (await checkTierPaywall(config, createContext("starter"))).allowed,
        ).toBe(false);

        // Same and higher tiers should be allowed
        expect(
          (await checkTierPaywall(config, createContext("professional")))
            .allowed,
        ).toBe(true);
        expect(
          (await checkTierPaywall(config, createContext("enterprise"))).allowed,
        ).toBe(true);
      });
    });

    describe("Role Enforcement", () => {
      it("should not allow role bypass through self-claim", async () => {
        const config: RolePaywallConfig = {
          id: "test",
          name: "Test",
          type: "role",
          allowedRoles: ["admin", "owner"],
          action: "access",
          enabled: true,
          priority: 100,
        };

        // Context role comes from trusted source
        const memberResult = await checkRolePaywall(
          config,
          createContext("enterprise", { userRole: "member" }),
        );
        expect(memberResult.allowed).toBe(false);

        // Even with enterprise plan, role must match
        const adminResult = await checkRolePaywall(
          config,
          createContext("enterprise", { userRole: "admin" }),
        );
        expect(adminResult.allowed).toBe(true);
      });
    });
  });
});
