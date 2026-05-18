/**
 * Telegram Feature Map - Status Integrity Tests
 *
 * Verifies that the Telegram feature map has no placeholder, partial,
 * or coming_soon entries. Every feature must be either 'enabled' or
 * 'disabled' with a clear reason.
 *
 * Task 118: Resolve Telegram placeholder features in code map.
 *
 * @module templates/telegram/__tests__/telegram-features.test
 */

import {
  ALL_TELEGRAM_FEATURES,
  CHAT_TYPES,
  MESSAGING_FEATURES,
  VOICE_VIDEO_FEATURES,
  MEDIA_FEATURES,
  PRIVACY_FEATURES,
  PRESENCE_FEATURES,
  ORGANIZATION_FEATURES,
  INTERACTION_FEATURES,
  getFeatureById,
  getFeaturesByCategory,
  getEnabledFeatures,
  getDisabledFeatures,
  getPlaceholderFeatures,
  isFeatureEnabled,
  getFeatureDependencies,
  telegramFeatureConfig,
  type FeatureStatus,
  type TelegramFeature,
} from "../features";

// ============================================================================
// STATUS INTEGRITY TESTS
// ============================================================================

describe("Telegram Feature Map - Status Integrity", () => {
  it("should contain no features with placeholder status", () => {
    const placeholders = ALL_TELEGRAM_FEATURES.filter(
      (f) => (f.status as string) === "placeholder",
    );
    expect(placeholders).toHaveLength(0);
  });

  it("should contain no features with partial status", () => {
    const partials = ALL_TELEGRAM_FEATURES.filter(
      (f) => (f.status as string) === "partial",
    );
    expect(partials).toHaveLength(0);
  });

  it("should contain no features with coming_soon status", () => {
    const comingSoon = ALL_TELEGRAM_FEATURES.filter(
      (f) => (f.status as string) === "coming_soon",
    );
    expect(comingSoon).toHaveLength(0);
  });

  it("should only contain enabled or disabled statuses", () => {
    const validStatuses: FeatureStatus[] = ["enabled", "disabled"];
    for (const feature of ALL_TELEGRAM_FEATURES) {
      expect(validStatuses).toContain(feature.status);
    }
  });

  it("should have every feature with a non-empty id, name, and description", () => {
    for (const feature of ALL_TELEGRAM_FEATURES) {
      expect(feature.id).toBeTruthy();
      expect(feature.name).toBeTruthy();
      expect(feature.description).toBeTruthy();
    }
  });

  it("should have unique feature ids", () => {
    const ids = ALL_TELEGRAM_FEATURES.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ============================================================================
// DISABLED FEATURES - POLICY REQUIREMENTS
// ============================================================================

describe("Telegram Feature Map - Disabled Features Policy", () => {
  it("should have a disabledReason for every disabled feature", () => {
    const disabled = ALL_TELEGRAM_FEATURES.filter(
      (f) => f.status === "disabled",
    );
    for (const feature of disabled) {
      expect(feature.disabledReason).toBeTruthy();
      expect(typeof feature.disabledReason).toBe("string");
      expect(feature.disabledReason!.length).toBeGreaterThan(10);
    }
  });

  it("should have screenshot_notification as the only disabled feature", () => {
    const disabled = getDisabledFeatures();
    expect(disabled).toHaveLength(1);
    expect(disabled[0].id).toBe("screenshot_notification");
  });

  it("should have a web platform limitation reason for screenshot_notification", () => {
    const feature = getFeatureById("screenshot_notification");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("Web platform limitation");
  });
});

// ============================================================================
// PREVIOUSLY-PLACEHOLDER FEATURES - NOW RESOLVED
// ============================================================================

describe("Telegram Feature Map - Resolved Placeholders", () => {
  it("should have secret_chat enabled (was placeholder)", () => {
    const feature = getFeatureById("secret_chat");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.encryption).toBe("end-to-end");
  });

  it("should have voice_chat enabled (was placeholder)", () => {
    const feature = getFeatureById("voice_chat");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });

  it("should have video_chat enabled (was placeholder)", () => {
    const feature = getFeatureById("video_chat");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
  });

  it("should have self_destruct enabled (was placeholder)", () => {
    const feature = getFeatureById("self_destruct");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("secret_chat");
  });

  it("should have screenshot_notification explicitly disabled with reason (was placeholder)", () => {
    const feature = getFeatureById("screenshot_notification");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toBeDefined();
    expect(feature!.disabledReason!.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// FEATURE CATEGORY COMPLETENESS
// ============================================================================

describe("Telegram Feature Map - Category Completeness", () => {
  it("should have 7 chat types", () => {
    expect(CHAT_TYPES).toHaveLength(7);
  });

  it("should have 8 messaging features", () => {
    expect(MESSAGING_FEATURES).toHaveLength(8);
  });

  it("should have 4 voice/video features", () => {
    expect(VOICE_VIDEO_FEATURES).toHaveLength(4);
  });

  it("should have 10 media features", () => {
    expect(MEDIA_FEATURES).toHaveLength(10);
  });

  it("should have 9 privacy features", () => {
    expect(PRIVACY_FEATURES).toHaveLength(9);
  });

  it("should have 5 presence/profile features", () => {
    expect(PRESENCE_FEATURES).toHaveLength(5);
  });

  it("should have 5 organization features", () => {
    expect(ORGANIZATION_FEATURES).toHaveLength(5);
  });

  it("should have 4 interaction features", () => {
    expect(INTERACTION_FEATURES).toHaveLength(4);
  });

  it("should have 52 total features", () => {
    expect(ALL_TELEGRAM_FEATURES).toHaveLength(52);
  });
});

// ============================================================================
// FEATURE HELPERS
// ============================================================================

describe("Telegram Feature Map - Helpers", () => {
  it("getFeatureById should return a feature by id", () => {
    const feature = getFeatureById("private_chat");
    expect(feature).toBeDefined();
    expect(feature!.name).toBe("Private Chats");
  });

  it("getFeatureById should return undefined for unknown ids", () => {
    const feature = getFeatureById("nonexistent");
    expect(feature).toBeUndefined();
  });

  it("getFeaturesByCategory should filter by category", () => {
    const chatTypes = getFeaturesByCategory("chat_types");
    expect(chatTypes.length).toBe(CHAT_TYPES.length);
    for (const f of chatTypes) {
      expect(f.category).toBe("chat_types");
    }
  });

  it("getEnabledFeatures should return only enabled features", () => {
    const enabled = getEnabledFeatures();
    for (const f of enabled) {
      expect(f.status).toBe("enabled");
    }
    expect(enabled.length).toBe(ALL_TELEGRAM_FEATURES.length - 1); // 1 disabled
  });

  it("getDisabledFeatures should return only disabled features", () => {
    const disabled = getDisabledFeatures();
    for (const f of disabled) {
      expect(f.status).toBe("disabled");
    }
    expect(disabled.length).toBe(1);
  });

  it("getPlaceholderFeatures (deprecated) should return empty array", () => {
    const placeholders = getPlaceholderFeatures();
    expect(placeholders).toHaveLength(0);
  });

  it("isFeatureEnabled should return true for enabled features", () => {
    expect(isFeatureEnabled("private_chat")).toBe(true);
    expect(isFeatureEnabled("secret_chat")).toBe(true);
    expect(isFeatureEnabled("voice_chat")).toBe(true);
    expect(isFeatureEnabled("self_destruct")).toBe(true);
  });

  it("isFeatureEnabled should return false for disabled features", () => {
    expect(isFeatureEnabled("screenshot_notification")).toBe(false);
  });

  it("isFeatureEnabled should return false for nonexistent features", () => {
    expect(isFeatureEnabled("nonexistent")).toBe(false);
  });

  it("getFeatureDependencies should return dependency features", () => {
    const deps = getFeatureDependencies("self_destruct");
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("secret_chat");
  });

  it("getFeatureDependencies should return empty array for features without dependencies", () => {
    const deps = getFeatureDependencies("private_chat");
    expect(deps).toHaveLength(0);
  });
});

// ============================================================================
// FEATURE CONFIG EXPORT
// ============================================================================

describe("Telegram Feature Map - Config Export", () => {
  it("should export telegramFeatureConfig with all category arrays", () => {
    expect(telegramFeatureConfig.chatTypes).toBe(CHAT_TYPES);
    expect(telegramFeatureConfig.messaging).toBe(MESSAGING_FEATURES);
    expect(telegramFeatureConfig.voiceVideo).toBe(VOICE_VIDEO_FEATURES);
    expect(telegramFeatureConfig.media).toBe(MEDIA_FEATURES);
    expect(telegramFeatureConfig.privacy).toBe(PRIVACY_FEATURES);
    expect(telegramFeatureConfig.presence).toBe(PRESENCE_FEATURES);
    expect(telegramFeatureConfig.organization).toBe(ORGANIZATION_FEATURES);
    expect(telegramFeatureConfig.interaction).toBe(INTERACTION_FEATURES);
    expect(telegramFeatureConfig.all).toBe(ALL_TELEGRAM_FEATURES);
  });

  it("should export helpers on telegramFeatureConfig", () => {
    expect(typeof telegramFeatureConfig.helpers.getFeatureById).toBe(
      "function",
    );
    expect(typeof telegramFeatureConfig.helpers.getFeaturesByCategory).toBe(
      "function",
    );
    expect(typeof telegramFeatureConfig.helpers.getEnabledFeatures).toBe(
      "function",
    );
    expect(typeof telegramFeatureConfig.helpers.getDisabledFeatures).toBe(
      "function",
    );
    expect(typeof telegramFeatureConfig.helpers.getPlaceholderFeatures).toBe(
      "function",
    );
    expect(typeof telegramFeatureConfig.helpers.isFeatureEnabled).toBe(
      "function",
    );
    expect(typeof telegramFeatureConfig.helpers.getFeatureDependencies).toBe(
      "function",
    );
  });
});

// ============================================================================
// DEPENDENCY VALIDATION
// ============================================================================

describe("Telegram Feature Map - Dependency Validation", () => {
  it("should have all dependency feature ids referencing real features", () => {
    for (const feature of ALL_TELEGRAM_FEATURES) {
      if (feature.dependencies) {
        for (const depId of feature.dependencies) {
          const dep = getFeatureById(depId);
          expect(dep).toBeDefined();
        }
      }
    }
  });

  it("should have all dependency features enabled if the dependent feature is enabled", () => {
    for (const feature of ALL_TELEGRAM_FEATURES) {
      if (feature.status === "enabled" && feature.dependencies) {
        for (const depId of feature.dependencies) {
          const dep = getFeatureById(depId);
          expect(dep).toBeDefined();
          expect(dep!.status).toBe("enabled");
        }
      }
    }
  });
});
