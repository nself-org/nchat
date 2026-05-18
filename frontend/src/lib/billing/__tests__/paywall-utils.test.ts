/**
 * Paywall Utils Tests
 *
 * Tests for paywall utility functions.
 *
 * @module @/lib/billing/__tests__/paywall-utils.test
 */

import {
  isFeatureAvailable,
  isWithinLimit,
  getRemainingQuota,
  getUsagePercentage,
  shouldShowUpgradePrompt,
  getMinimumTierForFeature,
  getNewFeaturesInTier,
  getLimitImprovements,
  formatLimitValue,
  formatBytes,
  formatUsageInfo,
  formatDenialReason,
  formatUpgradeMessage,
  buildUpgradePrompt,
  buildUsageWarningPrompt,
  getPaywallUIConfig,
  mergeUIConfigs,
  getPaywallBadgeText,
  getPaywallIcon,
  createPaywallContext,
  validatePaywallContext,
  getRecommendedUpgrade,
  getUpgradeOptions,
  detectBypassAttempt,
  validateContextIntegrity,
  getCachedPaywallResult,
  setCachedPaywallResult,
  createPaywallCacheKey,
  clearPaywallCache,
  clearUserPaywallCache,
} from "../paywall-utils";
import {
  PaywallDenialCode,
  PaywallUsageInfo,
  USAGE_WARNING_THRESHOLDS,
} from "../paywall-types";
import type { PlanTier } from "@/types/subscription.types";

describe("PaywallUtils", () => {
  // ========================================================================
  // Access Check Utilities
  // ========================================================================

  describe("isFeatureAvailable", () => {
    it("should return true for free plan features", () => {
      expect(isFeatureAvailable("publicChannels", "free")).toBe(true);
      expect(isFeatureAvailable("privateChannels", "free")).toBe(true);
      expect(isFeatureAvailable("directMessages", "free")).toBe(true);
    });

    it("should return false for premium features on free plan", () => {
      expect(isFeatureAvailable("videoCalls", "free")).toBe(false);
      expect(isFeatureAvailable("screenSharing", "free")).toBe(false);
      expect(isFeatureAvailable("sso", "free")).toBe(false);
    });

    it("should return true for starter features on starter plan", () => {
      expect(isFeatureAvailable("videoCalls", "starter")).toBe(true);
      expect(isFeatureAvailable("voiceMessages", "starter")).toBe(true);
      expect(isFeatureAvailable("webhooks", "starter")).toBe(true);
    });

    it("should return true for professional features on professional plan", () => {
      expect(isFeatureAvailable("apiAccess", "professional")).toBe(true);
      expect(isFeatureAvailable("screenSharing", "professional")).toBe(true);
      expect(isFeatureAvailable("auditLogs", "professional")).toBe(true);
    });

    it("should return true for enterprise features on enterprise plan", () => {
      expect(isFeatureAvailable("sso", "enterprise")).toBe(true);
      expect(isFeatureAvailable("customBranding", "enterprise")).toBe(true);
      expect(isFeatureAvailable("prioritySupport", "enterprise")).toBe(true);
    });
  });

  describe("isWithinLimit", () => {
    it("should return true when under limit", () => {
      expect(isWithinLimit("maxMembers", "free", 5)).toBe(true);
      expect(isWithinLimit("maxChannels", "free", 3)).toBe(true);
    });

    it("should return false when at or over limit", () => {
      expect(isWithinLimit("maxMembers", "free", 10)).toBe(false);
      expect(isWithinLimit("maxMembers", "free", 15)).toBe(false);
    });

    it("should return true for unlimited (null) limits", () => {
      expect(isWithinLimit("maxMembers", "enterprise", 1000000)).toBe(true);
    });

    it("should handle zero usage", () => {
      expect(isWithinLimit("maxMembers", "free", 0)).toBe(true);
    });
  });

  describe("getRemainingQuota", () => {
    it("should return remaining quota correctly", () => {
      expect(getRemainingQuota("maxMembers", "free", 5)).toBe(5);
      expect(getRemainingQuota("maxMembers", "free", 8)).toBe(2);
    });

    it("should return 0 when at limit", () => {
      expect(getRemainingQuota("maxMembers", "free", 10)).toBe(0);
    });

    it("should return 0 when over limit", () => {
      expect(getRemainingQuota("maxMembers", "free", 15)).toBe(0);
    });

    it("should return null for unlimited", () => {
      expect(getRemainingQuota("maxMembers", "enterprise", 1000)).toBeNull();
    });
  });

  describe("getUsagePercentage", () => {
    it("should calculate percentage correctly", () => {
      expect(getUsagePercentage("maxMembers", "free", 5)).toBe(50);
      expect(getUsagePercentage("maxMembers", "free", 8)).toBe(80);
    });

    it("should cap at 100%", () => {
      expect(getUsagePercentage("maxMembers", "free", 15)).toBe(100);
    });

    it("should return null for unlimited", () => {
      expect(getUsagePercentage("maxMembers", "enterprise", 1000)).toBeNull();
    });

    it("should handle zero usage", () => {
      expect(getUsagePercentage("maxMembers", "free", 0)).toBe(0);
    });
  });

  describe("shouldShowUpgradePrompt", () => {
    it("should return false below threshold", () => {
      expect(shouldShowUpgradePrompt("maxMembers", "free", 5)).toBe(false);
    });

    it("should return true at or above threshold", () => {
      expect(shouldShowUpgradePrompt("maxMembers", "free", 8, 75)).toBe(true);
    });

    it("should respect custom threshold", () => {
      expect(shouldShowUpgradePrompt("maxMembers", "free", 5, 50)).toBe(true);
      expect(shouldShowUpgradePrompt("maxMembers", "free", 4, 50)).toBe(false);
    });

    it("should return false for unlimited", () => {
      expect(shouldShowUpgradePrompt("maxMembers", "enterprise", 1000000)).toBe(
        false,
      );
    });
  });

  describe("getMinimumTierForFeature", () => {
    it("should return free for basic features", () => {
      expect(getMinimumTierForFeature("publicChannels")).toBe("free");
      expect(getMinimumTierForFeature("directMessages")).toBe("free");
    });

    it("should return starter for starter features", () => {
      expect(getMinimumTierForFeature("videoCalls")).toBe("starter");
      expect(getMinimumTierForFeature("voiceMessages")).toBe("starter");
    });

    it("should return professional for professional features", () => {
      expect(getMinimumTierForFeature("apiAccess")).toBe("professional");
      expect(getMinimumTierForFeature("screenSharing")).toBe("professional");
    });

    it("should return enterprise for enterprise features", () => {
      expect(getMinimumTierForFeature("sso")).toBe("enterprise");
      expect(getMinimumTierForFeature("customBranding")).toBe("enterprise");
    });
  });

  describe("getNewFeaturesInTier", () => {
    it("should return new features when upgrading", () => {
      const newFeatures = getNewFeaturesInTier("free", "starter");
      expect(newFeatures.length).toBeGreaterThan(0);
      expect(newFeatures.some((f) => f.key === "videoCalls")).toBe(true);
    });

    it("should return empty for same tier", () => {
      const newFeatures = getNewFeaturesInTier("starter", "starter");
      expect(newFeatures).toHaveLength(0);
    });

    it("should include all enterprise features", () => {
      const newFeatures = getNewFeaturesInTier("professional", "enterprise");
      expect(newFeatures.some((f) => f.key === "sso")).toBe(true);
    });
  });

  describe("getLimitImprovements", () => {
    it("should show limit increases", () => {
      const improvements = getLimitImprovements("free", "starter");
      expect(improvements.length).toBeGreaterThan(0);
      expect(improvements.some((l) => l.key === "maxMembers")).toBe(true);
    });

    it("should show unlimited for enterprise", () => {
      const improvements = getLimitImprovements("professional", "enterprise");
      const membersImprovement = improvements.find(
        (l) => l.key === "maxMembers",
      );
      expect(membersImprovement?.newValue).toBeNull();
    });
  });

  // ========================================================================
  // Formatting Utilities
  // ========================================================================

  describe("formatLimitValue", () => {
    it("should format numeric values with unit", () => {
      expect(formatLimitValue(10, "maxMembers")).toBe("10 members");
    });

    it("should return Unlimited for null", () => {
      expect(formatLimitValue(null, "maxMembers")).toBe("Unlimited");
    });

    it("should format bytes correctly", () => {
      expect(formatLimitValue(1024 * 1024 * 1024, "maxStorageBytes")).toBe(
        "1.0 GB",
      );
    });
  });

  describe("formatBytes", () => {
    it("should format bytes", () => {
      expect(formatBytes(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
    });

    it("should format megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    });

    it("should format gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    });

    it("should format with decimals for smaller values", () => {
      expect(formatBytes(1536)).toBe("1.5 KB");
    });
  });

  describe("formatUsageInfo", () => {
    it("should format usage with limit", () => {
      const usage: PaywallUsageInfo = {
        current: 8,
        limit: 10,
        remaining: 2,
        percentage: 80,
        warningLevel: "high",
        unit: "members",
      };
      expect(formatUsageInfo(usage)).toBe("8 / 10 members (80%)");
    });

    it("should format unlimited usage", () => {
      const usage: PaywallUsageInfo = {
        current: 100,
        limit: null,
        remaining: null,
        percentage: null,
        warningLevel: "none",
        unit: "members",
      };
      expect(formatUsageInfo(usage)).toContain("100");
      expect(formatUsageInfo(usage)).toContain("Unlimited");
    });
  });

  describe("formatDenialReason", () => {
    it("should format feature not available", () => {
      const result = formatDenialReason({
        allowed: false,
        code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
        currentPlan: "free",
      });
      expect(result).toContain("not available");
    });

    it("should format limit exceeded", () => {
      const result = formatDenialReason({
        allowed: false,
        code: PaywallDenialCode.LIMIT_EXCEEDED,
        currentPlan: "free",
      });
      expect(result).toContain("limit");
    });

    it("should use custom reason if provided", () => {
      const result = formatDenialReason({
        allowed: false,
        reason: "Custom denial reason",
        currentPlan: "free",
      });
      expect(result).toBe("Custom denial reason");
    });
  });

  // ========================================================================
  // Prompt Configuration
  // ========================================================================

  describe("buildUpgradePrompt", () => {
    it("should build prompt for feature denial", () => {
      const prompt = buildUpgradePrompt({
        allowed: false,
        code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
        currentPlan: "free",
        requiredPlan: "starter",
      });

      expect(prompt.title).toContain("Unlock");
      expect(prompt.primaryCta.action).toBe("upgrade");
    });

    it("should build prompt for limit exceeded", () => {
      const prompt = buildUpgradePrompt({
        allowed: false,
        code: PaywallDenialCode.LIMIT_EXCEEDED,
        currentPlan: "free",
        requiredPlan: "starter",
      });

      expect(prompt.title).toContain("Limit");
    });

    it("should offer trial when available", () => {
      const prompt = buildUpgradePrompt({
        allowed: false,
        currentPlan: "free",
        requiredPlan: "starter",
        upgrade: {
          targetPlan: "starter",
          planName: "Starter",
          monthlyPrice: 500,
          yearlyPrice: 5000,
          featuresGained: [],
          limitsIncreased: [],
          upgradeUrl: "/upgrade",
          trialAvailable: true,
          trialDays: 14,
        },
      });

      expect(prompt.primaryCta.text).toContain("Trial");
    });
  });

  describe("buildUsageWarningPrompt", () => {
    it("should build critical warning", () => {
      const usage: PaywallUsageInfo = {
        current: 96,
        limit: 100,
        remaining: 4,
        percentage: 96,
        warningLevel: "critical",
        unit: "members",
      };

      const prompt = buildUsageWarningPrompt(usage, "maxMembers", "free");
      expect(prompt.title).toContain("Almost Full");
    });

    it("should build high usage warning", () => {
      const usage: PaywallUsageInfo = {
        current: 90,
        limit: 100,
        remaining: 10,
        percentage: 90,
        warningLevel: "high",
        unit: "members",
      };

      const prompt = buildUsageWarningPrompt(usage, "maxMembers", "free");
      expect(prompt.title).toContain("Running Low");
    });
  });

  // ========================================================================
  // UI Configuration
  // ========================================================================

  describe("getPaywallUIConfig", () => {
    it("should return config for each paywall type", () => {
      expect(getPaywallUIConfig("feature")).toBeDefined();
      expect(getPaywallUIConfig("limit")).toBeDefined();
      expect(getPaywallUIConfig("tier")).toBeDefined();
    });
  });

  describe("mergeUIConfigs", () => {
    it("should merge configs", () => {
      const base = { showBadge: true, badgeText: "Premium" };
      const override = { badgeText: "Enterprise" };
      const merged = mergeUIConfigs(base, override);

      expect(merged.showBadge).toBe(true);
      expect(merged.badgeText).toBe("Enterprise");
    });

    it("should return base if no override", () => {
      const base = { showBadge: true };
      const merged = mergeUIConfigs(base, undefined);
      expect(merged).toEqual(base);
    });
  });

  describe("getPaywallBadgeText", () => {
    it("should return plan name for tier type", () => {
      expect(getPaywallBadgeText("tier", "professional")).toBe("Professional");
    });

    it("should return Premium for feature type", () => {
      expect(getPaywallBadgeText("feature", undefined)).toBe("Premium");
    });

    it("should return Locked for channel type", () => {
      expect(getPaywallBadgeText("channel", undefined)).toBe("Locked");
    });
  });

  describe("getPaywallIcon", () => {
    it("should return correct icons", () => {
      expect(getPaywallIcon("feature")).toBe("sparkles");
      expect(getPaywallIcon("limit")).toBe("gauge");
      expect(getPaywallIcon("tier")).toBe("crown");
      expect(getPaywallIcon("role")).toBe("shield");
      expect(getPaywallIcon("channel")).toBe("lock");
    });
  });

  // ========================================================================
  // Context Utilities
  // ========================================================================

  describe("createPaywallContext", () => {
    it("should create context with required fields", () => {
      const context = createPaywallContext("user-123", "free");
      expect(context.userId).toBe("user-123");
      expect(context.planTier).toBe("free");
    });

    it("should include optional fields", () => {
      const context = createPaywallContext("user-123", "starter", {
        workspaceId: "ws-456",
        userRole: "admin",
      });
      expect(context.workspaceId).toBe("ws-456");
      expect(context.userRole).toBe("admin");
    });
  });

  describe("validatePaywallContext", () => {
    it("should return true for valid context", () => {
      expect(
        validatePaywallContext({ userId: "user-123", planTier: "free" }),
      ).toBe(true);
    });

    it("should return false for missing userId", () => {
      expect(validatePaywallContext({ planTier: "free" } as any)).toBe(false);
    });

    it("should return false for missing planTier", () => {
      expect(validatePaywallContext({ userId: "user-123" } as any)).toBe(false);
    });
  });

  // ========================================================================
  // Upgrade Path Utilities
  // ========================================================================

  describe("getRecommendedUpgrade", () => {
    it("should recommend upgrade when approaching limits", () => {
      const result = getRecommendedUpgrade("free", { members: 9 });
      // The result returns reasons array, which if non-empty means upgrade should be suggested
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.recommendedTier).toBe("starter");
    });

    it("should not recommend upgrade when under thresholds", () => {
      const result = getRecommendedUpgrade("free", { members: 2 });
      // No reasons means no upgrade needed
      expect(result.reasons.length).toBe(0);
      expect(result.recommendedTier).toBeNull();
    });

    it("should return null tier for enterprise", () => {
      const result = getRecommendedUpgrade("enterprise", { members: 1000 });
      expect(result.recommendedTier).toBeNull();
    });
  });

  describe("getUpgradeOptions", () => {
    it("should return higher tiers", () => {
      const options = getUpgradeOptions("free");
      expect(options.length).toBe(3); // starter, professional, enterprise
    });

    it("should include recommended flag", () => {
      const options = getUpgradeOptions("free");
      expect(options.some((o) => o.isRecommended)).toBe(true);
    });

    it("should return empty for enterprise", () => {
      const options = getUpgradeOptions("enterprise");
      expect(options).toHaveLength(0);
    });
  });

  // ========================================================================
  // Bypass Detection
  // ========================================================================

  describe("detectBypassAttempt", () => {
    it("should detect header manipulation", () => {
      const result = detectBypassAttempt(
        { headers: { "x-plan-tier": "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );
      expect(result.detected).toBe(true);
      expect(result.type).toBe("header_manipulation");
    });

    it("should detect suspicious query parameters", () => {
      const result = detectBypassAttempt(
        { query: { bypass: "true" } },
        { userId: "user-123", planTier: "free" },
      );
      expect(result.detected).toBe(true);
      expect(result.type).toBe("query_injection");
    });

    it("should detect body injection", () => {
      const result = detectBypassAttempt(
        { body: { planTier: "enterprise" } },
        { userId: "user-123", planTier: "free" },
      );
      expect(result.detected).toBe(true);
      expect(result.type).toBe("body_injection");
    });

    it("should not flag valid requests", () => {
      const result = detectBypassAttempt(
        { headers: { "x-plan-tier": "free" } },
        { userId: "user-123", planTier: "free" },
      );
      expect(result.detected).toBe(false);
    });

    it("should detect admin field injection", () => {
      const result = detectBypassAttempt(
        { body: { isAdmin: true } },
        { userId: "user-123", planTier: "free" },
      );
      expect(result.detected).toBe(true);
    });
  });

  describe("validateContextIntegrity", () => {
    it("should return true for matching context", () => {
      const result = validateContextIntegrity(
        { userId: "user-123", planTier: "free" },
        { userId: "user-123", planTier: "free" },
      );
      expect(result).toBe(true);
    });

    it("should return false for mismatched user", () => {
      const result = validateContextIntegrity(
        { userId: "user-123", planTier: "free" },
        { userId: "user-456", planTier: "free" },
      );
      expect(result).toBe(false);
    });

    it("should return false for mismatched plan", () => {
      const result = validateContextIntegrity(
        { userId: "user-123", planTier: "enterprise" },
        { userId: "user-123", planTier: "free" },
      );
      expect(result).toBe(false);
    });

    it("should check workspace when provided", () => {
      const result = validateContextIntegrity(
        { userId: "user-123", planTier: "free", workspaceId: "ws-789" },
        { userId: "user-123", planTier: "free", workspaceId: "ws-456" },
      );
      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // Cache Utilities
  // ========================================================================

  describe("Cache Functions", () => {
    beforeEach(() => {
      clearPaywallCache();
    });

    it("should cache and retrieve results", () => {
      const result = { allowed: true, currentPlan: "free" as PlanTier };
      setCachedPaywallResult("test-key", result, 60000);

      const cached = getCachedPaywallResult("test-key");
      expect(cached).toEqual(result);
    });

    it("should return null for expired cache", () => {
      const result = { allowed: true, currentPlan: "free" as PlanTier };
      setCachedPaywallResult("test-key", result, -1); // Expired

      const cached = getCachedPaywallResult("test-key");
      expect(cached).toBeNull();
    });

    it("should create cache keys correctly", () => {
      const key = createPaywallCacheKey("feature-video", {
        userId: "user-123",
        planTier: "free",
        workspaceId: "ws-456",
      });
      expect(key).toContain("feature-video");
      expect(key).toContain("user-123");
      expect(key).toContain("free");
      expect(key).toContain("ws-456");
    });

    it("should clear user cache", () => {
      setCachedPaywallResult("paywall:test:user-123:free::", {
        allowed: true,
        currentPlan: "free",
      });
      setCachedPaywallResult("paywall:test:user-456:free::", {
        allowed: true,
        currentPlan: "free",
      });

      clearUserPaywallCache("user-123");

      expect(getCachedPaywallResult("paywall:test:user-123:free::")).toBeNull();
      expect(
        getCachedPaywallResult("paywall:test:user-456:free::"),
      ).not.toBeNull();
    });
  });
});
