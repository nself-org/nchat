/**
 * Tests for feature-flags.ts
 *
 * Validates the FEATURE_FLAGS structure, all category/feature keys,
 * type helpers, and the utility functions that inspect the flags.
 */

import {
  FEATURE_FLAGS,
  DEFAULT_FEATURE_FLAGS,
  getFeatureCategories,
  getFeaturesInCategory,
  categoryHasEnabledSwitch,
  type FeatureCategory,
} from "../feature-flags";

// ---------------------------------------------------------------------------
// Top-level structure
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS top-level structure", () => {
  it("is exported as a non-null object", () => {
    expect(FEATURE_FLAGS).toBeDefined();
    expect(typeof FEATURE_FLAGS).toBe("object");
    expect(FEATURE_FLAGS).not.toBeNull();
  });

  it("contains all expected categories", () => {
    const expectedCategories = [
      "messaging",
      "voice",
      "video",
      "channels",
      "media",
      "security",
      "integrations",
      "payments",
      "admin",
      "realtime",
      "recording",
    ];
    for (const cat of expectedCategories) {
      expect(FEATURE_FLAGS).toHaveProperty(cat);
    }
  });

  it("has exactly 11 categories", () => {
    expect(Object.keys(FEATURE_FLAGS)).toHaveLength(11);
  });
});

// ---------------------------------------------------------------------------
// Messaging category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.messaging", () => {
  const { messaging } = FEATURE_FLAGS;

  it("has enabled: true", () => expect(messaging.enabled).toBe(true));
  it("has threads: true", () => expect(messaging.threads).toBe(true));
  it("has reactions: true", () => expect(messaging.reactions).toBe(true));
  it("has replies: true", () => expect(messaging.replies).toBe(true));
  it("has editing: true", () => expect(messaging.editing).toBe(true));
  it("has deletion: true", () => expect(messaging.deletion).toBe(true));
  it("has forwarding: true", () => expect(messaging.forwarding).toBe(true));
  it("has scheduling: false", () => expect(messaging.scheduling).toBe(false));
  it("has disappearing: false", () =>
    expect(messaging.disappearing).toBe(false));

  it("has exactly 9 fields", () => {
    expect(Object.keys(messaging)).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// Voice category (env-driven — defaults to false when env var unset)
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.voice", () => {
  const { voice } = FEATURE_FLAGS;

  it("has enabled property", () =>
    expect(typeof voice.enabled).toBe("boolean"));
  it("has calls property", () => expect(typeof voice.calls).toBe("boolean"));
  it("has voiceMessages property", () =>
    expect(typeof voice.voiceMessages).toBe("boolean"));
  it("has voiceChannels property", () =>
    expect(typeof voice.voiceChannels).toBe("boolean"));

  it("has exactly 4 fields", () => {
    expect(Object.keys(voice)).toHaveLength(4);
  });

  it("all voice flags are consistent (all true or all false — driven by single env)", () => {
    const values = [
      voice.enabled,
      voice.calls,
      voice.voiceMessages,
      voice.voiceChannels,
    ];
    const allTrue = values.every(Boolean);
    const allFalse = values.every((v) => !v);
    expect(allTrue || allFalse).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Video category (env-driven — same env as voice)
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.video", () => {
  const { video } = FEATURE_FLAGS;

  it("has enabled property", () =>
    expect(typeof video.enabled).toBe("boolean"));
  it("has calls property", () => expect(typeof video.calls).toBe("boolean"));
  it("has screenShare property", () =>
    expect(typeof video.screenShare).toBe("boolean"));

  it("has exactly 3 fields", () => {
    expect(Object.keys(video)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Channels category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.channels", () => {
  const { channels } = FEATURE_FLAGS;

  it("has public: true", () => expect(channels.public).toBe(true));
  it("has private: true", () => expect(channels.private).toBe(true));
  it("has directMessages: true", () =>
    expect(channels.directMessages).toBe(true));
  it("has groupDms: true", () => expect(channels.groupDms).toBe(true));
  it("has categories: true", () => expect(channels.categories).toBe(true));
  it("has threads: true", () => expect(channels.threads).toBe(true));

  it("has exactly 6 fields", () => {
    expect(Object.keys(channels)).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Media category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.media", () => {
  const { media } = FEATURE_FLAGS;

  it("has fileUploads: true", () => expect(media.fileUploads).toBe(true));
  it("has imageUploads: true", () => expect(media.imageUploads).toBe(true));
  it("has videoUploads: true", () => expect(media.videoUploads).toBe(true));
  it("has maxFileSize: 25", () => expect(media.maxFileSize).toBe(25));

  it("has allowedTypes as a non-empty array", () => {
    expect(Array.isArray(media.allowedTypes)).toBe(true);
    expect(media.allowedTypes.length).toBeGreaterThan(0);
  });

  it("allowedTypes includes image/*", () => {
    expect(media.allowedTypes).toContain("image/*");
  });

  it("allowedTypes includes video/*", () => {
    expect(media.allowedTypes).toContain("video/*");
  });

  it("allowedTypes includes audio/*", () => {
    expect(media.allowedTypes).toContain("audio/*");
  });

  it("allowedTypes includes application/pdf", () => {
    expect(media.allowedTypes).toContain("application/pdf");
  });

  it("has exactly 5 fields", () => {
    expect(Object.keys(media)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Security category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.security", () => {
  const { security } = FEATURE_FLAGS;

  it("has e2eEncryption: false", () =>
    expect(security.e2eEncryption).toBe(false));
  it("has biometricLock: false", () =>
    expect(security.biometricLock).toBe(false));
  it("has pinLock: false", () => expect(security.pinLock).toBe(false));
  it("has twoFactor: true", () => expect(security.twoFactor).toBe(true));
  it("has sessionManagement: true", () =>
    expect(security.sessionManagement).toBe(true));
  it("has sso as boolean", () => expect(typeof security.sso).toBe("boolean"));

  it("has exactly 6 fields", () => {
    expect(Object.keys(security)).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Integrations category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.integrations", () => {
  const { integrations } = FEATURE_FLAGS;

  it("has webhooks: true", () => expect(integrations.webhooks).toBe(true));
  it("has bots as boolean", () =>
    expect(typeof integrations.bots).toBe("boolean"));
  it("has slackImport: false", () =>
    expect(integrations.slackImport).toBe(false));
  it("has externalApps: false", () =>
    expect(integrations.externalApps).toBe(false));

  it("has exactly 4 fields", () => {
    expect(Object.keys(integrations)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Payments category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.payments", () => {
  const { payments } = FEATURE_FLAGS;

  it("has enabled: false", () => expect(payments.enabled).toBe(false));
  it("has subscriptions: false", () =>
    expect(payments.subscriptions).toBe(false));
  it("has crypto: false", () => expect(payments.crypto).toBe(false));
  it("has tokenGating: false", () => expect(payments.tokenGating).toBe(false));

  it("has exactly 4 fields", () => {
    expect(Object.keys(payments)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Admin category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.admin", () => {
  const { admin } = FEATURE_FLAGS;

  it("has dashboard: true", () => expect(admin.dashboard).toBe(true));
  it("has analytics: false", () => expect(admin.analytics).toBe(false));
  it("has auditLog: true", () => expect(admin.auditLog).toBe(true));
  it("has moderationPanel as boolean", () =>
    expect(typeof admin.moderationPanel).toBe("boolean"));
  it("has userManagement: true", () => expect(admin.userManagement).toBe(true));
  it("has roleManagement: true", () => expect(admin.roleManagement).toBe(true));

  it("has exactly 6 fields", () => {
    expect(Object.keys(admin)).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Realtime category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.realtime", () => {
  const { realtime } = FEATURE_FLAGS;

  it("has enabled as boolean", () =>
    expect(typeof realtime.enabled).toBe("boolean"));
  it("has presence as boolean", () =>
    expect(typeof realtime.presence).toBe("boolean"));
  it("has typing as boolean", () =>
    expect(typeof realtime.typing).toBe("boolean"));

  it("has exactly 3 fields", () => {
    expect(Object.keys(realtime)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Recording category
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS.recording", () => {
  const { recording } = FEATURE_FLAGS;

  it("has enabled as boolean", () =>
    expect(typeof recording.enabled).toBe("boolean"));
  it("has calls as boolean", () =>
    expect(typeof recording.calls).toBe("boolean"));
  it("has screenShares as boolean", () =>
    expect(typeof recording.screenShares).toBe("boolean"));

  it("has exactly 3 fields", () => {
    expect(Object.keys(recording)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_FEATURE_FLAGS
// ---------------------------------------------------------------------------

describe("DEFAULT_FEATURE_FLAGS", () => {
  it("is exported as a non-null object", () => {
    expect(DEFAULT_FEATURE_FLAGS).toBeDefined();
    expect(typeof DEFAULT_FEATURE_FLAGS).toBe("object");
    expect(DEFAULT_FEATURE_FLAGS).not.toBeNull();
  });

  it("has all the same categories as FEATURE_FLAGS", () => {
    expect(Object.keys(DEFAULT_FEATURE_FLAGS).sort()).toEqual(
      Object.keys(FEATURE_FLAGS).sort(),
    );
  });

  it("has the same messaging values as FEATURE_FLAGS", () => {
    expect(DEFAULT_FEATURE_FLAGS.messaging.enabled).toBe(
      FEATURE_FLAGS.messaging.enabled,
    );
    expect(DEFAULT_FEATURE_FLAGS.messaging.threads).toBe(
      FEATURE_FLAGS.messaging.threads,
    );
    expect(DEFAULT_FEATURE_FLAGS.messaging.reactions).toBe(
      FEATURE_FLAGS.messaging.reactions,
    );
  });
});

// ---------------------------------------------------------------------------
// getFeatureCategories()
// ---------------------------------------------------------------------------

describe("getFeatureCategories()", () => {
  it("returns an array", () => {
    expect(Array.isArray(getFeatureCategories())).toBe(true);
  });

  it("returns 11 categories", () => {
    expect(getFeatureCategories()).toHaveLength(11);
  });

  it("includes all known categories", () => {
    const cats = getFeatureCategories();
    expect(cats).toContain("messaging");
    expect(cats).toContain("voice");
    expect(cats).toContain("video");
    expect(cats).toContain("channels");
    expect(cats).toContain("media");
    expect(cats).toContain("security");
    expect(cats).toContain("integrations");
    expect(cats).toContain("payments");
    expect(cats).toContain("admin");
    expect(cats).toContain("realtime");
    expect(cats).toContain("recording");
  });

  it("matches Object.keys(FEATURE_FLAGS)", () => {
    expect(getFeatureCategories().sort()).toEqual(
      Object.keys(FEATURE_FLAGS).sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// getFeaturesInCategory()
// ---------------------------------------------------------------------------

describe("getFeaturesInCategory()", () => {
  it("returns the feature keys for messaging", () => {
    const keys = getFeaturesInCategory("messaging");
    expect(keys).toContain("enabled");
    expect(keys).toContain("threads");
    expect(keys).toContain("reactions");
    expect(keys).toContain("replies");
    expect(keys).toContain("editing");
    expect(keys).toContain("deletion");
    expect(keys).toContain("forwarding");
    expect(keys).toContain("scheduling");
    expect(keys).toContain("disappearing");
    expect(keys).toHaveLength(9);
  });

  it("returns the feature keys for channels", () => {
    const keys = getFeaturesInCategory("channels");
    expect(keys).toContain("public");
    expect(keys).toContain("private");
    expect(keys).toContain("directMessages");
    expect(keys).toContain("groupDms");
    expect(keys).toHaveLength(6);
  });

  it("returns the feature keys for voice", () => {
    const keys = getFeaturesInCategory("voice");
    expect(keys).toContain("enabled");
    expect(keys).toContain("calls");
    expect(keys).toContain("voiceMessages");
    expect(keys).toContain("voiceChannels");
    expect(keys).toHaveLength(4);
  });

  it("returns the feature keys for payments", () => {
    const keys = getFeaturesInCategory("payments");
    expect(keys).toContain("enabled");
    expect(keys).toContain("subscriptions");
    expect(keys).toContain("crypto");
    expect(keys).toContain("tokenGating");
    expect(keys).toHaveLength(4);
  });

  it("returns the feature keys for admin", () => {
    const keys = getFeaturesInCategory("admin");
    expect(keys).toContain("dashboard");
    expect(keys).toContain("analytics");
    expect(keys).toContain("auditLog");
    expect(keys).toContain("moderationPanel");
    expect(keys).toContain("userManagement");
    expect(keys).toContain("roleManagement");
    expect(keys).toHaveLength(6);
  });

  it("all categories return arrays", () => {
    for (const category of getFeatureCategories()) {
      const keys = getFeaturesInCategory(category as FeatureCategory);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// categoryHasEnabledSwitch()
// ---------------------------------------------------------------------------

describe("categoryHasEnabledSwitch()", () => {
  it("returns true for messaging (has enabled field)", () => {
    expect(categoryHasEnabledSwitch("messaging")).toBe(true);
  });

  it("returns true for voice (has enabled field)", () => {
    expect(categoryHasEnabledSwitch("voice")).toBe(true);
  });

  it("returns true for video (has enabled field)", () => {
    expect(categoryHasEnabledSwitch("video")).toBe(true);
  });

  it("returns true for payments (has enabled field)", () => {
    expect(categoryHasEnabledSwitch("payments")).toBe(true);
  });

  it("returns true for realtime (has enabled field)", () => {
    expect(categoryHasEnabledSwitch("realtime")).toBe(true);
  });

  it("returns true for recording (has enabled field)", () => {
    expect(categoryHasEnabledSwitch("recording")).toBe(true);
  });

  it("returns false for channels (no enabled field)", () => {
    expect(categoryHasEnabledSwitch("channels")).toBe(false);
  });

  it("returns false for media (no enabled field)", () => {
    expect(categoryHasEnabledSwitch("media")).toBe(false);
  });

  it("returns false for integrations (no enabled field)", () => {
    expect(categoryHasEnabledSwitch("integrations")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// All flag values are booleans or numbers — no undefined/null values
// ---------------------------------------------------------------------------

describe("all flag values are typed correctly", () => {
  it("all boolean flags are actual booleans", () => {
    for (const [catKey, catValue] of Object.entries(FEATURE_FLAGS)) {
      for (const [flagKey, flagValue] of Object.entries(catValue as object)) {
        if (flagKey !== "allowedTypes" && flagKey !== "maxFileSize") {
          expect(typeof flagValue).toBe(
            "boolean",
            `Expected FEATURE_FLAGS.${catKey}.${flagKey} to be a boolean`,
          );
        }
      }
    }
  });

  it("media.maxFileSize is a number", () => {
    expect(typeof FEATURE_FLAGS.media.maxFileSize).toBe("number");
  });

  it("media.allowedTypes is an array of strings", () => {
    expect(Array.isArray(FEATURE_FLAGS.media.allowedTypes)).toBe(true);
    for (const t of FEATURE_FLAGS.media.allowedTypes) {
      expect(typeof t).toBe("string");
    }
  });
});
