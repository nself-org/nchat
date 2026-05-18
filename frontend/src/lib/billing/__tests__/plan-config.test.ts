/**
 * Plan Configuration Tests
 *
 * Tests for subscription plan configuration, limits, and features.
 */

import {
  PLAN_LIMITS,
  PLAN_FEATURES,
  PLAN_PRICING,
  PLANS,
  getPlanConfig,
  getAvailablePlans,
  hasFeature,
  isWithinLimit,
  getRemainingQuota,
  getUsagePercentage,
  comparePlans,
  needsUpgradeForFeature,
  calculateYearlySavings,
  formatPrice,
  getUpgradeSuggestion,
} from "../plan-config";
import type { PlanTier } from "@/types/subscription.types";

describe("Plan Configuration", () => {
  describe("PLAN_LIMITS", () => {
    it("should define limits for all plan tiers", () => {
      const tiers: PlanTier[] = [
        "free",
        "starter",
        "professional",
        "enterprise",
        "custom",
      ];
      for (const tier of tiers) {
        expect(PLAN_LIMITS[tier]).toBeDefined();
        expect(PLAN_LIMITS[tier]).toHaveProperty("maxMembers");
        expect(PLAN_LIMITS[tier]).toHaveProperty("maxChannels");
        expect(PLAN_LIMITS[tier]).toHaveProperty("maxStorageBytes");
      }
    });

    it("should have increasing limits for higher tiers", () => {
      // Free should have lowest limits
      expect(PLAN_LIMITS.free.maxMembers).toBeLessThan(
        PLAN_LIMITS.starter.maxMembers!,
      );
      expect(PLAN_LIMITS.starter.maxMembers).toBeLessThan(
        PLAN_LIMITS.professional.maxMembers!,
      );

      // Enterprise should have unlimited (null) for some limits
      expect(PLAN_LIMITS.enterprise.maxMembers).toBeNull();
      expect(PLAN_LIMITS.enterprise.maxChannels).toBeNull();
    });
  });

  describe("PLAN_FEATURES", () => {
    it("should define features for all plan tiers", () => {
      const tiers: PlanTier[] = [
        "free",
        "starter",
        "professional",
        "enterprise",
        "custom",
      ];
      for (const tier of tiers) {
        expect(PLAN_FEATURES[tier]).toBeDefined();
        expect(PLAN_FEATURES[tier]).toHaveProperty("publicChannels");
        expect(PLAN_FEATURES[tier]).toHaveProperty("privateChannels");
      }
    });

    it("should unlock features progressively", () => {
      // Free tier should not have advanced features
      expect(PLAN_FEATURES.free.videoCalls).toBe(false);
      expect(PLAN_FEATURES.free.sso).toBe(false);

      // Starter should have video calls
      expect(PLAN_FEATURES.starter.videoCalls).toBe(true);

      // Professional should have screen sharing
      expect(PLAN_FEATURES.professional.screenSharing).toBe(true);

      // Enterprise should have SSO
      expect(PLAN_FEATURES.enterprise.sso).toBe(true);
    });
  });

  describe("PLAN_PRICING", () => {
    it("should define pricing for all tiers", () => {
      expect(PLAN_PRICING.free.monthly).toBe(0);
      expect(PLAN_PRICING.starter.monthly).toBeGreaterThan(0);
      expect(PLAN_PRICING.professional.monthly).toBeGreaterThan(
        PLAN_PRICING.starter.monthly,
      );
      expect(PLAN_PRICING.enterprise.monthly).toBeGreaterThan(
        PLAN_PRICING.professional.monthly,
      );
    });

    it("should have yearly discounts", () => {
      // Yearly should be cheaper than 12 * monthly
      const starterMonthlyTotal = PLAN_PRICING.starter.monthly * 12;
      expect(PLAN_PRICING.starter.yearly).toBeLessThan(starterMonthlyTotal);
    });
  });
});

describe("Plan Helper Functions", () => {
  describe("getPlanConfig", () => {
    it("should return complete plan configuration", () => {
      const config = getPlanConfig("professional");
      expect(config.tier).toBe("professional");
      expect(config.name).toBe("Professional");
      expect(config.limits).toBe(PLAN_LIMITS.professional);
      expect(config.features).toBe(PLAN_FEATURES.professional);
      expect(config.pricing).toBe(PLAN_PRICING.professional);
    });
  });

  describe("getAvailablePlans", () => {
    it("should return all plans except custom", () => {
      const plans = getAvailablePlans();
      expect(plans.length).toBe(4);
      expect(plans.map((p) => p.tier)).not.toContain("custom");
    });
  });

  describe("hasFeature", () => {
    it("should correctly check feature availability", () => {
      expect(hasFeature("free", "publicChannels")).toBe(true);
      expect(hasFeature("free", "videoCalls")).toBe(false);
      expect(hasFeature("starter", "videoCalls")).toBe(true);
      expect(hasFeature("enterprise", "sso")).toBe(true);
    });
  });

  describe("isWithinLimit", () => {
    it("should correctly check if usage is within limit", () => {
      expect(isWithinLimit("free", "maxMembers", 5)).toBe(true);
      expect(isWithinLimit("free", "maxMembers", 10)).toBe(false); // At limit
      expect(isWithinLimit("free", "maxMembers", 15)).toBe(false); // Over limit

      // Unlimited should always return true
      expect(isWithinLimit("enterprise", "maxMembers", 10000)).toBe(true);
    });
  });

  describe("getRemainingQuota", () => {
    it("should calculate remaining quota correctly", () => {
      // Free tier: 10 members max
      expect(getRemainingQuota("free", "maxMembers", 3)).toBe(7);
      expect(getRemainingQuota("free", "maxMembers", 10)).toBe(0);
      expect(getRemainingQuota("free", "maxMembers", 15)).toBe(0); // Can't go negative

      // Unlimited should return null
      expect(getRemainingQuota("enterprise", "maxMembers", 1000)).toBeNull();
    });
  });

  describe("getUsagePercentage", () => {
    it("should calculate usage percentage correctly", () => {
      // Free tier: 10 members max
      expect(getUsagePercentage("free", "maxMembers", 5)).toBe(50);
      expect(getUsagePercentage("free", "maxMembers", 10)).toBe(100);

      // Over limit should cap at 100
      expect(getUsagePercentage("free", "maxMembers", 20)).toBe(100);

      // Unlimited should return null
      expect(getUsagePercentage("enterprise", "maxMembers", 1000)).toBeNull();
    });
  });

  describe("comparePlans", () => {
    it("should correctly compare plan tiers", () => {
      expect(comparePlans("starter", "free")).toBeGreaterThan(0);
      expect(comparePlans("free", "starter")).toBeLessThan(0);
      expect(comparePlans("professional", "professional")).toBe(0);
      expect(comparePlans("enterprise", "free")).toBeGreaterThan(0);
    });
  });

  describe("needsUpgradeForFeature", () => {
    it("should return minimum required tier for feature", () => {
      // Free tier missing video calls
      expect(needsUpgradeForFeature("free", "videoCalls")).toBe("starter");

      // Free tier missing screen sharing
      expect(needsUpgradeForFeature("free", "screenSharing")).toBe(
        "professional",
      );

      // Free tier missing SSO
      expect(needsUpgradeForFeature("free", "sso")).toBe("enterprise");

      // Already has feature
      expect(needsUpgradeForFeature("enterprise", "sso")).toBeNull();
    });
  });

  describe("calculateYearlySavings", () => {
    it("should calculate yearly discount percentage", () => {
      const savings = calculateYearlySavings("starter");
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBeLessThan(100);

      // Free tier has no yearly pricing — function returns null, not 0
      expect(calculateYearlySavings("free")).toBeNull();
    });
  });

  describe("formatPrice", () => {
    it("should format prices correctly", () => {
      expect(formatPrice(500)).toBe("$5");
      expect(formatPrice(1500)).toBe("$15");
      expect(formatPrice(9900)).toBe("$99");
      expect(formatPrice(1234)).toBe("$12.34");

      // Without currency symbol
      expect(formatPrice(500, "USD", false)).toBe("5");
    });
  });

  describe("getUpgradeSuggestion", () => {
    it("should suggest upgrade when approaching limits", () => {
      const result = getUpgradeSuggestion("free", {
        members: 9, // 90% of limit
        channels: 4,
        storageBytes: 500 * 1024 * 1024, // 50% of 1GB
      });

      expect(result.shouldUpgrade).toBe(true);
      expect(result.suggestedTier).toBe("starter");
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("should not suggest upgrade when usage is low", () => {
      const result = getUpgradeSuggestion("free", {
        members: 2,
        channels: 1,
        storageBytes: 100 * 1024 * 1024,
      });

      expect(result.shouldUpgrade).toBe(false);
      expect(result.suggestedTier).toBeNull();
      expect(result.reasons.length).toBe(0);
    });
  });
});
