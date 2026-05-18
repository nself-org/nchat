/**
 * Feature Service Unit Tests
 *
 * Comprehensive tests for the featureService singleton, covering all public methods
 * and edge cases for feature flag management.
 */

import { featureService, FeatureService } from "../feature-service";
import { FEATURE_FLAGS, type FeatureFlags } from "@/config/feature-flags";

describe("FeatureService", () => {
  // Reset flags before each test to ensure isolation
  beforeEach(() => {
    featureService.resetFlags();
  });

  // ============================================================================
  // DEFAULT FLAGS TESTS
  // ============================================================================
  describe("default flags", () => {
    it("should have default flags set correctly on initialization", () => {
      const flags = featureService.getFlags();
      expect(flags).toEqual(FEATURE_FLAGS);
    });

    it("should have messaging enabled by default", () => {
      expect(featureService.isEnabled("messaging")).toBe(true);
    });

    it("should have voice disabled by default", () => {
      expect(featureService.isEnabled("voice")).toBe(false);
    });

    it("should have video disabled by default", () => {
      expect(featureService.isEnabled("video")).toBe(false);
    });

    it("should have payments disabled by default", () => {
      expect(featureService.isEnabled("payments")).toBe(false);
    });

    it("should have messaging.threads enabled by default", () => {
      expect(featureService.isEnabled("messaging", "threads")).toBe(true);
    });

    it("should have messaging.scheduling disabled by default", () => {
      expect(featureService.isEnabled("messaging", "scheduling")).toBe(false);
    });

    it("should have all default admin features correctly set", () => {
      expect(featureService.isEnabled("admin", "dashboard")).toBe(true);
      expect(featureService.isEnabled("admin", "analytics")).toBe(false);
      expect(featureService.isEnabled("admin", "auditLog")).toBe(true);
      expect(featureService.isEnabled("admin", "userManagement")).toBe(true);
      expect(featureService.isEnabled("admin", "roleManagement")).toBe(true);
    });
  });

  // ============================================================================
  // isEnabled() TESTS
  // ============================================================================
  describe("isEnabled()", () => {
    describe("category-level checks", () => {
      it("should return true for categories with enabled=true", () => {
        expect(featureService.isEnabled("messaging")).toBe(true);
      });

      it("should return false for categories with enabled=false", () => {
        expect(featureService.isEnabled("voice")).toBe(false);
        expect(featureService.isEnabled("video")).toBe(false);
        expect(featureService.isEnabled("payments")).toBe(false);
      });

      it("should return true for categories without enabled switch (implicitly enabled)", () => {
        // channels, media, security, integrations, admin don't have enabled switch
        expect(featureService.isEnabled("channels")).toBe(true);
        expect(featureService.isEnabled("media")).toBe(true);
        expect(featureService.isEnabled("security")).toBe(true);
        expect(featureService.isEnabled("integrations")).toBe(true);
        expect(featureService.isEnabled("admin")).toBe(true);
      });
    });

    describe("feature-level checks", () => {
      it("should return correct value for enabled features", () => {
        expect(featureService.isEnabled("messaging", "threads")).toBe(true);
        expect(featureService.isEnabled("messaging", "reactions")).toBe(true);
        expect(featureService.isEnabled("channels", "public")).toBe(true);
      });

      it("should return correct value for disabled features", () => {
        expect(featureService.isEnabled("messaging", "scheduling")).toBe(false);
        expect(featureService.isEnabled("messaging", "disappearing")).toBe(
          false,
        );
        expect(featureService.isEnabled("security", "e2eEncryption")).toBe(
          false,
        );
      });

      it("should return false for features in disabled categories", () => {
        // voice.calls is false, but even if it were true, voice.enabled is false
        expect(featureService.isEnabled("voice", "calls")).toBe(false);
        expect(featureService.isEnabled("voice", "voiceMessages")).toBe(false);
        expect(featureService.isEnabled("video", "calls")).toBe(false);
        expect(featureService.isEnabled("payments", "subscriptions")).toBe(
          false,
        );
      });
    });

    describe("category enabled switch behavior", () => {
      it("should disable all features when category enabled is false", () => {
        featureService.setFlags({
          messaging: { ...FEATURE_FLAGS.messaging, enabled: false },
        });

        // Even though threads is true in the config, category is disabled
        expect(featureService.isEnabled("messaging")).toBe(false);
        expect(featureService.isEnabled("messaging", "threads")).toBe(false);
        expect(featureService.isEnabled("messaging", "reactions")).toBe(false);
      });

      it("should enable features when category enabled switch is turned on", () => {
        featureService.setFlags({
          voice: { ...FEATURE_FLAGS.voice, enabled: true, calls: true },
        });

        expect(featureService.isEnabled("voice")).toBe(true);
        expect(featureService.isEnabled("voice", "calls")).toBe(true);
      });
    });

    describe("non-boolean feature values", () => {
      it("should handle numeric values (maxFileSize)", () => {
        // maxFileSize is 25, should be truthy
        expect(featureService.isEnabled("media", "maxFileSize")).toBe(true);
      });

      it("should handle array values (allowedTypes)", () => {
        // allowedTypes is an array, should be truthy
        expect(featureService.isEnabled("media", "allowedTypes")).toBe(true);
      });
    });
  });

  // ============================================================================
  // setFlags() TESTS
  // ============================================================================
  describe("setFlags()", () => {
    it("should merge overrides with defaults", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, scheduling: true },
      });

      expect(featureService.isEnabled("messaging", "scheduling")).toBe(true);
      // Other messaging features should remain unchanged
      expect(featureService.isEnabled("messaging", "threads")).toBe(true);
      expect(featureService.isEnabled("messaging", "reactions")).toBe(true);
    });

    it("should override multiple categories", () => {
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true, calls: true },
        video: { ...FEATURE_FLAGS.video, enabled: true },
      });

      expect(featureService.isEnabled("voice")).toBe(true);
      expect(featureService.isEnabled("voice", "calls")).toBe(true);
      expect(featureService.isEnabled("video")).toBe(true);
    });

    it("should deeply merge nested objects", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, disappearing: true },
      });

      const flags = featureService.getFlags();
      expect(flags.messaging.disappearing).toBe(true);
      expect(flags.messaging.threads).toBe(true); // unchanged
    });

    it("should not modify default flags object", () => {
      const originalEnabled = FEATURE_FLAGS.messaging.scheduling;

      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, scheduling: true },
      });

      // Original should be unchanged
      expect(FEATURE_FLAGS.messaging.scheduling).toBe(originalEnabled);
    });

    it("should allow disabling previously enabled features", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, threads: false },
      });

      expect(featureService.isEnabled("messaging", "threads")).toBe(false);
    });

    it("should handle empty overrides", () => {
      featureService.setFlags({});
      expect(featureService.getFlags()).toEqual(FEATURE_FLAGS);
    });
  });

  // ============================================================================
  // resetFlags() TESTS
  // ============================================================================
  describe("resetFlags()", () => {
    it("should reset to default flags", () => {
      // Apply some overrides first
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true, calls: true },
        messaging: { ...FEATURE_FLAGS.messaging, scheduling: true },
      });

      // Verify overrides are applied
      expect(featureService.isEnabled("voice")).toBe(true);
      expect(featureService.isEnabled("messaging", "scheduling")).toBe(true);

      // Reset
      featureService.resetFlags();

      // Verify defaults are restored
      expect(featureService.isEnabled("voice")).toBe(false);
      expect(featureService.isEnabled("messaging", "scheduling")).toBe(false);
      expect(featureService.getFlags()).toEqual(FEATURE_FLAGS);
    });

    it("should be idempotent", () => {
      featureService.resetFlags();
      featureService.resetFlags();
      featureService.resetFlags();

      expect(featureService.getFlags()).toEqual(FEATURE_FLAGS);
    });
  });

  // ============================================================================
  // getFlags() TESTS
  // ============================================================================
  describe("getFlags()", () => {
    it("should return complete flags object", () => {
      const flags = featureService.getFlags();

      expect(flags).toHaveProperty("messaging");
      expect(flags).toHaveProperty("voice");
      expect(flags).toHaveProperty("video");
      expect(flags).toHaveProperty("channels");
      expect(flags).toHaveProperty("media");
      expect(flags).toHaveProperty("security");
      expect(flags).toHaveProperty("integrations");
      expect(flags).toHaveProperty("payments");
      expect(flags).toHaveProperty("admin");
    });

    it("should reflect current state after setFlags", () => {
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true },
      });

      const flags = featureService.getFlags();
      expect(flags.voice.enabled).toBe(true);
    });
  });

  // ============================================================================
  // getCategoryFlags() TESTS
  // ============================================================================
  describe("getCategoryFlags()", () => {
    it("should return flags for a specific category", () => {
      const messagingFlags = featureService.getCategoryFlags("messaging");

      expect(messagingFlags).toEqual(FEATURE_FLAGS.messaging);
      expect(messagingFlags.threads).toBe(true);
      expect(messagingFlags.scheduling).toBe(false);
    });

    it("should reflect overrides for the category", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, scheduling: true },
      });

      const messagingFlags = featureService.getCategoryFlags("messaging");
      expect(messagingFlags.scheduling).toBe(true);
    });

    it("should return flags for all categories", () => {
      expect(featureService.getCategoryFlags("voice")).toEqual(
        FEATURE_FLAGS.voice,
      );
      expect(featureService.getCategoryFlags("video")).toEqual(
        FEATURE_FLAGS.video,
      );
      expect(featureService.getCategoryFlags("channels")).toEqual(
        FEATURE_FLAGS.channels,
      );
      expect(featureService.getCategoryFlags("media")).toEqual(
        FEATURE_FLAGS.media,
      );
      expect(featureService.getCategoryFlags("security")).toEqual(
        FEATURE_FLAGS.security,
      );
      expect(featureService.getCategoryFlags("integrations")).toEqual(
        FEATURE_FLAGS.integrations,
      );
      expect(featureService.getCategoryFlags("payments")).toEqual(
        FEATURE_FLAGS.payments,
      );
      expect(featureService.getCategoryFlags("admin")).toEqual(
        FEATURE_FLAGS.admin,
      );
    });
  });

  // ============================================================================
  // getFlag() TESTS
  // ============================================================================
  describe("getFlag()", () => {
    it("should return correct boolean flag values", () => {
      expect(featureService.getFlag("messaging", "threads")).toBe(true);
      expect(featureService.getFlag("messaging", "scheduling")).toBe(false);
      expect(featureService.getFlag("voice", "enabled")).toBe(false);
    });

    it("should return correct non-boolean flag values", () => {
      expect(featureService.getFlag("media", "maxFileSize")).toBe(25);
      expect(featureService.getFlag("media", "allowedTypes")).toEqual([
        "image/*",
        "video/*",
        "audio/*",
        "application/pdf",
      ]);
    });

    it("should return updated value after setFlags", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, scheduling: true },
      });

      expect(featureService.getFlag("messaging", "scheduling")).toBe(true);
    });
  });

  // ============================================================================
  // areAllEnabled() TESTS
  // ============================================================================
  describe("areAllEnabled()", () => {
    it("should return true when all features are enabled", () => {
      const result = featureService.areAllEnabled([
        ["messaging", "threads"],
        ["messaging", "reactions"],
        ["channels", "public"],
      ]);

      expect(result).toBe(true);
    });

    it("should return false when any feature is disabled", () => {
      const result = featureService.areAllEnabled([
        ["messaging", "threads"],
        ["messaging", "scheduling"], // disabled
        ["channels", "public"],
      ]);

      expect(result).toBe(false);
    });

    it("should return false when category is disabled", () => {
      const result = featureService.areAllEnabled([
        ["messaging", "threads"],
        ["voice", "calls"], // voice category is disabled
      ]);

      expect(result).toBe(false);
    });

    it("should handle category-only checks", () => {
      const result = featureService.areAllEnabled([
        ["messaging", undefined],
        ["channels", undefined],
      ]);

      expect(result).toBe(true);
    });

    it("should return false when any category is disabled", () => {
      const result = featureService.areAllEnabled([
        ["messaging", undefined],
        ["voice", undefined], // disabled
      ]);

      expect(result).toBe(false);
    });

    it("should return true for empty array", () => {
      expect(featureService.areAllEnabled([])).toBe(true);
    });
  });

  // ============================================================================
  // isAnyEnabled() TESTS
  // ============================================================================
  describe("isAnyEnabled()", () => {
    it("should return true when at least one feature is enabled", () => {
      const result = featureService.isAnyEnabled([
        ["voice", "calls"], // disabled
        ["messaging", "threads"], // enabled
        ["payments", "subscriptions"], // disabled
      ]);

      expect(result).toBe(true);
    });

    it("should return false when all features are disabled", () => {
      const result = featureService.isAnyEnabled([
        ["voice", "calls"],
        ["voice", "voiceMessages"],
        ["payments", "subscriptions"],
      ]);

      expect(result).toBe(false);
    });

    it("should handle category-only checks", () => {
      const result = featureService.isAnyEnabled([
        ["voice", undefined], // disabled
        ["messaging", undefined], // enabled
      ]);

      expect(result).toBe(true);
    });

    it("should return false when all categories are disabled", () => {
      const result = featureService.isAnyEnabled([
        ["voice", undefined],
        ["video", undefined],
        ["payments", undefined],
      ]);

      expect(result).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(featureService.isAnyEnabled([])).toBe(false);
    });
  });

  // ============================================================================
  // getEnabledInCategory() TESTS
  // ============================================================================
  describe("getEnabledInCategory()", () => {
    it("should return all enabled features in a category", () => {
      const enabled = featureService.getEnabledInCategory("messaging");

      expect(enabled).toContain("threads");
      expect(enabled).toContain("reactions");
      expect(enabled).toContain("replies");
      expect(enabled).toContain("editing");
      expect(enabled).toContain("deletion");
      expect(enabled).toContain("forwarding");
      expect(enabled).not.toContain("scheduling");
      expect(enabled).not.toContain("disappearing");
      expect(enabled).not.toContain("enabled"); // Master switch excluded
    });

    it("should return empty array when category is disabled", () => {
      const enabled = featureService.getEnabledInCategory("voice");

      expect(enabled).toEqual([]);
    });

    it("should return empty array when category becomes disabled", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, enabled: false },
      });

      const enabled = featureService.getEnabledInCategory("messaging");
      expect(enabled).toEqual([]);
    });

    it("should work for categories without enabled switch", () => {
      const enabled = featureService.getEnabledInCategory("channels");

      expect(enabled).toContain("public");
      expect(enabled).toContain("private");
      expect(enabled).toContain("directMessages");
    });

    it("should reflect changes after setFlags", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, scheduling: true },
      });

      const enabled = featureService.getEnabledInCategory("messaging");
      expect(enabled).toContain("scheduling");
    });
  });

  // ============================================================================
  // getDisabledInCategory() TESTS
  // ============================================================================
  describe("getDisabledInCategory()", () => {
    it("should return all disabled features in a category", () => {
      const disabled = featureService.getDisabledInCategory("messaging");

      expect(disabled).toContain("scheduling");
      expect(disabled).toContain("disappearing");
      expect(disabled).not.toContain("threads");
      expect(disabled).not.toContain("reactions");
      expect(disabled).not.toContain("enabled"); // Master switch excluded
    });

    it("should return all features (except enabled) when category is disabled", () => {
      const disabled = featureService.getDisabledInCategory("voice");

      expect(disabled).toContain("calls");
      expect(disabled).toContain("voiceMessages");
      expect(disabled).toContain("voiceChannels");
      expect(disabled).not.toContain("enabled");
    });

    it("should return all features when category becomes disabled", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, enabled: false },
      });

      const disabled = featureService.getDisabledInCategory("messaging");

      // All features should be in disabled list
      expect(disabled).toContain("threads");
      expect(disabled).toContain("reactions");
      expect(disabled).toContain("scheduling");
    });

    it("should work for categories without enabled switch", () => {
      const disabled = featureService.getDisabledInCategory("admin");

      expect(disabled).toContain("analytics");
      expect(disabled).not.toContain("dashboard");
      expect(disabled).not.toContain("userManagement");
    });

    it("should reflect changes after setFlags", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, threads: false },
      });

      const disabled = featureService.getDisabledInCategory("messaging");
      expect(disabled).toContain("threads");
    });
  });

  // ============================================================================
  // MULTIPLE CATEGORY CHECKS
  // ============================================================================
  describe("multiple category checks", () => {
    it("should handle checking features across multiple categories", () => {
      expect(featureService.isEnabled("messaging", "threads")).toBe(true);
      expect(featureService.isEnabled("channels", "public")).toBe(true);
      expect(featureService.isEnabled("voice", "calls")).toBe(false);
      expect(featureService.isEnabled("admin", "dashboard")).toBe(true);
    });

    it("should allow enabling features in multiple categories simultaneously", () => {
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true, calls: true },
        video: { ...FEATURE_FLAGS.video, enabled: true, calls: true },
        payments: {
          ...FEATURE_FLAGS.payments,
          enabled: true,
          subscriptions: true,
        },
      });

      expect(featureService.isEnabled("voice", "calls")).toBe(true);
      expect(featureService.isEnabled("video", "calls")).toBe(true);
      expect(featureService.isEnabled("payments", "subscriptions")).toBe(true);
    });

    it("should correctly check areAllEnabled across categories", () => {
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true, calls: true },
      });

      expect(
        featureService.areAllEnabled([
          ["messaging", "threads"],
          ["voice", "calls"],
          ["channels", "public"],
        ]),
      ).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe("edge cases", () => {
    it("should handle rapid setFlags calls", () => {
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true },
      });
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: false },
      });
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true },
      });

      expect(featureService.isEnabled("voice")).toBe(true);
    });

    it("should handle setFlags followed by resetFlags", () => {
      featureService.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true },
        video: { ...FEATURE_FLAGS.video, enabled: true },
      });
      featureService.resetFlags();

      expect(featureService.isEnabled("voice")).toBe(false);
      expect(featureService.isEnabled("video")).toBe(false);
    });

    it("should maintain isolation between feature categories", () => {
      featureService.setFlags({
        messaging: { ...FEATURE_FLAGS.messaging, enabled: false },
      });

      // Other categories should be unaffected
      expect(featureService.isEnabled("channels", "public")).toBe(true);
      expect(featureService.isEnabled("admin", "dashboard")).toBe(true);
    });
  });

  // ============================================================================
  // INSTANCE ISOLATION
  // ============================================================================
  describe("instance isolation", () => {
    it("should allow creating separate instances", () => {
      const instance1 = new FeatureService();
      const instance2 = new FeatureService();

      instance1.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true },
      });

      // instance2 should still have defaults
      expect(instance1.isEnabled("voice")).toBe(true);
      expect(instance2.isEnabled("voice")).toBe(false);
    });

    it("should not affect singleton when using custom instances", () => {
      const customInstance = new FeatureService();
      customInstance.setFlags({
        voice: { ...FEATURE_FLAGS.voice, enabled: true },
      });

      // Singleton should be unaffected
      expect(featureService.isEnabled("voice")).toBe(false);
    });
  });
});
