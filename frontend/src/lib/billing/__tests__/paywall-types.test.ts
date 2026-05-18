/**
 * Paywall Types Tests
 *
 * Tests for paywall type definitions and constants.
 *
 * @module @/lib/billing/__tests__/paywall-types.test
 */

import {
  PaywallDenialCode,
  PaywallError,
  PaywallErrorCode,
  DEFAULT_BYPASS_ROLES,
  USAGE_WARNING_THRESHOLDS,
  DEFAULT_UI_CONFIGS,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
  LIMIT_UNITS,
  type PaywallType,
  type PaywallAction,
  type PaywallCheckResult,
  type PaywallConfig,
  type PaywallContext,
} from "../paywall-types";
import type { PlanTier } from "@/types/subscription.types";

describe("PaywallTypes", () => {
  describe("PaywallDenialCode", () => {
    it("should define feature restriction codes", () => {
      expect(PaywallDenialCode.FEATURE_NOT_AVAILABLE).toBe(
        "FEATURE_NOT_AVAILABLE",
      );
      expect(PaywallDenialCode.FEATURE_DISABLED).toBe("FEATURE_DISABLED");
    });

    it("should define limit restriction codes", () => {
      expect(PaywallDenialCode.LIMIT_EXCEEDED).toBe("LIMIT_EXCEEDED");
      expect(PaywallDenialCode.LIMIT_APPROACHING).toBe("LIMIT_APPROACHING");
      expect(PaywallDenialCode.QUOTA_EXHAUSTED).toBe("QUOTA_EXHAUSTED");
    });

    it("should define tier restriction codes", () => {
      expect(PaywallDenialCode.TIER_REQUIRED).toBe("TIER_REQUIRED");
      expect(PaywallDenialCode.TIER_INSUFFICIENT).toBe("TIER_INSUFFICIENT");
    });

    it("should define role restriction codes", () => {
      expect(PaywallDenialCode.ROLE_REQUIRED).toBe("ROLE_REQUIRED");
      expect(PaywallDenialCode.ROLE_INSUFFICIENT).toBe("ROLE_INSUFFICIENT");
    });

    it("should define channel restriction codes", () => {
      expect(PaywallDenialCode.CHANNEL_RESTRICTED).toBe("CHANNEL_RESTRICTED");
      expect(PaywallDenialCode.CHANNEL_PREMIUM).toBe("CHANNEL_PREMIUM");
    });

    it("should define time restriction codes", () => {
      expect(PaywallDenialCode.TRIAL_EXPIRED).toBe("TRIAL_EXPIRED");
      expect(PaywallDenialCode.SUBSCRIPTION_EXPIRED).toBe(
        "SUBSCRIPTION_EXPIRED",
      );
      expect(PaywallDenialCode.OUTSIDE_ALLOWED_HOURS).toBe(
        "OUTSIDE_ALLOWED_HOURS",
      );
    });

    it("should define general codes", () => {
      expect(PaywallDenialCode.ACCESS_DENIED).toBe("ACCESS_DENIED");
      expect(PaywallDenialCode.UPGRADE_REQUIRED).toBe("UPGRADE_REQUIRED");
      expect(PaywallDenialCode.PAYMENT_REQUIRED).toBe("PAYMENT_REQUIRED");
    });
  });

  describe("PaywallError", () => {
    it("should create error with code and message", () => {
      const error = new PaywallError(
        PaywallErrorCode.INVALID_CONFIG,
        "Invalid configuration",
      );

      expect(error.code).toBe(PaywallErrorCode.INVALID_CONFIG);
      expect(error.message).toBe("Invalid configuration");
      expect(error.name).toBe("PaywallError");
    });

    it("should create error with paywall ID", () => {
      const error = new PaywallError(
        PaywallErrorCode.GATE_NOT_FOUND,
        "Gate not found",
        "my-gate",
      );

      expect(error.paywallId).toBe("my-gate");
    });

    it("should create error with metadata", () => {
      const error = new PaywallError(
        PaywallErrorCode.EVALUATION_FAILED,
        "Evaluation failed",
        undefined,
        { attempt: 1, feature: "videoCalls" },
      );

      expect(error.metadata).toEqual({ attempt: 1, feature: "videoCalls" });
    });

    it("should be instanceof Error", () => {
      const error = new PaywallError(PaywallErrorCode.UNKNOWN_ERROR, "Unknown");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PaywallError);
    });
  });

  describe("PaywallErrorCode", () => {
    it("should define all error codes", () => {
      expect(PaywallErrorCode.INVALID_CONFIG).toBe("PAYWALL_INVALID_CONFIG");
      expect(PaywallErrorCode.MISSING_CONTEXT).toBe("PAYWALL_MISSING_CONTEXT");
      expect(PaywallErrorCode.EVALUATION_FAILED).toBe(
        "PAYWALL_EVALUATION_FAILED",
      );
      expect(PaywallErrorCode.GATE_NOT_FOUND).toBe("PAYWALL_GATE_NOT_FOUND");
      expect(PaywallErrorCode.GATE_ERROR).toBe("PAYWALL_GATE_ERROR");
      expect(PaywallErrorCode.UNKNOWN_ERROR).toBe("PAYWALL_UNKNOWN_ERROR");
    });
  });

  describe("Constants", () => {
    describe("DEFAULT_BYPASS_ROLES", () => {
      it("should include admin roles", () => {
        expect(DEFAULT_BYPASS_ROLES).toContain("admin");
        expect(DEFAULT_BYPASS_ROLES).toContain("owner");
        expect(DEFAULT_BYPASS_ROLES).toContain("superadmin");
      });

      it("should not include regular user roles", () => {
        expect(DEFAULT_BYPASS_ROLES).not.toContain("member");
        expect(DEFAULT_BYPASS_ROLES).not.toContain("guest");
        expect(DEFAULT_BYPASS_ROLES).not.toContain("user");
      });
    });

    describe("USAGE_WARNING_THRESHOLDS", () => {
      it("should define thresholds in increasing order", () => {
        expect(USAGE_WARNING_THRESHOLDS.low).toBe(50);
        expect(USAGE_WARNING_THRESHOLDS.medium).toBe(75);
        expect(USAGE_WARNING_THRESHOLDS.high).toBe(90);
        expect(USAGE_WARNING_THRESHOLDS.critical).toBe(95);
      });

      it("should have reasonable threshold values", () => {
        expect(USAGE_WARNING_THRESHOLDS.low).toBeGreaterThan(0);
        expect(USAGE_WARNING_THRESHOLDS.low).toBeLessThan(
          USAGE_WARNING_THRESHOLDS.medium,
        );
        expect(USAGE_WARNING_THRESHOLDS.medium).toBeLessThan(
          USAGE_WARNING_THRESHOLDS.high,
        );
        expect(USAGE_WARNING_THRESHOLDS.high).toBeLessThan(
          USAGE_WARNING_THRESHOLDS.critical,
        );
        expect(USAGE_WARNING_THRESHOLDS.critical).toBeLessThanOrEqual(100);
      });
    });

    describe("DEFAULT_UI_CONFIGS", () => {
      it("should have config for each paywall type", () => {
        const types: PaywallType[] = [
          "feature",
          "limit",
          "tier",
          "role",
          "channel",
          "time",
          "custom",
        ];
        for (const type of types) {
          expect(DEFAULT_UI_CONFIGS[type]).toBeDefined();
        }
      });

      it("should configure feature type with upgrade modal", () => {
        expect(DEFAULT_UI_CONFIGS.feature.showUpgradeModal).toBe(true);
        expect(DEFAULT_UI_CONFIGS.feature.badgeVariant).toBe("premium");
      });

      it("should configure limit type with inline prompt", () => {
        expect(DEFAULT_UI_CONFIGS.limit.showInlinePrompt).toBe(true);
        expect(DEFAULT_UI_CONFIGS.limit.showBadge).toBe(true);
      });

      it("should configure tier type with blur content", () => {
        expect(DEFAULT_UI_CONFIGS.tier.blurContent).toBe(true);
        expect(DEFAULT_UI_CONFIGS.tier.badgeVariant).toBe("enterprise");
      });
    });

    describe("PLAN_TIER_NAMES", () => {
      it("should have names for all plan tiers", () => {
        const tiers: PlanTier[] = [
          "free",
          "starter",
          "professional",
          "enterprise",
          "custom",
        ];
        for (const tier of tiers) {
          expect(PLAN_TIER_NAMES[tier]).toBeDefined();
          expect(typeof PLAN_TIER_NAMES[tier]).toBe("string");
        }
      });

      it("should have proper capitalized names", () => {
        expect(PLAN_TIER_NAMES.free).toBe("Free");
        expect(PLAN_TIER_NAMES.starter).toBe("Starter");
        expect(PLAN_TIER_NAMES.professional).toBe("Professional");
        expect(PLAN_TIER_NAMES.enterprise).toBe("Enterprise");
        expect(PLAN_TIER_NAMES.custom).toBe("Custom");
      });
    });

    describe("FEATURE_DISPLAY_NAMES", () => {
      it("should have display names for premium features", () => {
        expect(FEATURE_DISPLAY_NAMES.videoCalls).toBe("Video Calls");
        expect(FEATURE_DISPLAY_NAMES.screenSharing).toBe("Screen Sharing");
        expect(FEATURE_DISPLAY_NAMES.sso).toBe("SSO / SAML");
        expect(FEATURE_DISPLAY_NAMES.apiAccess).toBe("API Access");
      });
    });

    describe("LIMIT_DISPLAY_NAMES", () => {
      it("should have display names for all limits", () => {
        expect(LIMIT_DISPLAY_NAMES.maxMembers).toBe("Team Members");
        expect(LIMIT_DISPLAY_NAMES.maxChannels).toBe("Channels");
        expect(LIMIT_DISPLAY_NAMES.maxStorageBytes).toBe("Storage");
        expect(LIMIT_DISPLAY_NAMES.maxFileSizeBytes).toBe("File Size");
        expect(LIMIT_DISPLAY_NAMES.maxApiCallsPerMonth).toBe("API Calls");
        expect(LIMIT_DISPLAY_NAMES.maxCallParticipants).toBe(
          "Call Participants",
        );
        expect(LIMIT_DISPLAY_NAMES.maxStreamDurationMinutes).toBe(
          "Stream Duration",
        );
      });
    });

    describe("LIMIT_UNITS", () => {
      it("should have units for all limits", () => {
        expect(LIMIT_UNITS.maxMembers).toBe("members");
        expect(LIMIT_UNITS.maxChannels).toBe("channels");
        expect(LIMIT_UNITS.maxStorageBytes).toBe("GB");
        expect(LIMIT_UNITS.maxFileSizeBytes).toBe("MB");
        expect(LIMIT_UNITS.maxApiCallsPerMonth).toBe("calls/month");
        expect(LIMIT_UNITS.maxCallParticipants).toBe("participants");
        expect(LIMIT_UNITS.maxStreamDurationMinutes).toBe("minutes");
      });
    });
  });

  describe("Type Guards", () => {
    it("should properly type PaywallCheckResult", () => {
      const result: PaywallCheckResult = {
        allowed: false,
        type: "feature",
        code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
        reason: "Video calls not available",
        currentPlan: "free",
        requiredPlan: "starter",
      };

      expect(result.allowed).toBe(false);
      expect(result.type).toBe("feature");
      expect(result.code).toBe(PaywallDenialCode.FEATURE_NOT_AVAILABLE);
    });

    it("should properly type PaywallContext", () => {
      const context: PaywallContext = {
        userId: "user-123",
        planTier: "free",
        userRole: "member",
        workspaceId: "ws-456",
      };

      expect(context.userId).toBe("user-123");
      expect(context.planTier).toBe("free");
    });
  });
});
