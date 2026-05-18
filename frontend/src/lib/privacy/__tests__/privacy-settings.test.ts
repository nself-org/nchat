/**
 * Privacy Settings Tests
 *
 * @module lib/privacy/__tests__/privacy-settings.test
 */

import {
  PrivacySettingsService,
  createPrivacySettingsService,
  getPrivacySettingsService,
  resetPrivacySettingsService,
  createDefaultSettings,
  PRIVACY_LEVEL_PRESETS,
  DEFAULT_DATA_COLLECTION,
  DEFAULT_METADATA_RETENTION,
  type PrivacyLevel,
  type UserPrivacySettings,
} from "../privacy-settings";

describe("PrivacySettingsService", () => {
  let service: PrivacySettingsService;

  beforeEach(() => {
    resetPrivacySettingsService();
    service = createPrivacySettingsService();
  });

  afterEach(() => {
    resetPrivacySettingsService();
  });

  describe("constructor and initialization", () => {
    it("should create with default config", () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultPrivacyLevel).toBe("balanced");
      expect(config.auditEnabled).toBe(true);
    });

    it("should create with custom config", () => {
      const custom = createPrivacySettingsService({
        defaultPrivacyLevel: "strict",
        enforceMinimumRetention: false,
      });
      const config = custom.getConfig();
      expect(config.defaultPrivacyLevel).toBe("strict");
      expect(config.enforceMinimumRetention).toBe(false);
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getPrivacySettingsService();
      const instance2 = getPrivacySettingsService();
      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getPrivacySettingsService();
      resetPrivacySettingsService();
      const instance2 = getPrivacySettingsService();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("getOrCreateSettings", () => {
    it("should create settings for new user", () => {
      const settings = service.getOrCreateSettings("user1");

      expect(settings).toBeDefined();
      expect(settings.userId).toBe("user1");
      expect(settings.privacyLevel).toBe("balanced");
    });

    it("should return existing settings", () => {
      const settings1 = service.getOrCreateSettings("user1");
      const settings2 = service.getOrCreateSettings("user1");

      expect(settings1).toBe(settings2);
      expect(settings1.id).toBe(settings2.id);
    });

    it("should create with default privacy level from config", () => {
      const customService = createPrivacySettingsService({
        defaultPrivacyLevel: "strict",
      });
      const settings = customService.getOrCreateSettings("user1");

      expect(settings.privacyLevel).toBe("strict");
    });
  });

  describe("getSettings", () => {
    it("should return null for non-existent user", () => {
      const settings = service.getSettings("non-existent");
      expect(settings).toBeNull();
    });

    it("should return settings for existing user", () => {
      service.getOrCreateSettings("user1");
      const settings = service.getSettings("user1");

      expect(settings).not.toBeNull();
      expect(settings?.userId).toBe("user1");
    });
  });

  describe("updateSettings", () => {
    it("should update privacy level", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        privacyLevel: "strict",
      });

      expect(updated.privacyLevel).toBe("strict");
    });

    it("should apply preset when changing privacy level", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        privacyLevel: "maximum",
      });

      expect(updated.analyticsMode).toBe("disabled");
      expect(updated.ipAnonymization.strategy).toBe("remove");
    });

    it("should update analytics consent", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        analyticsConsent: true,
      });

      expect(updated.analyticsConsent).toBe(true);
      expect(updated.analyticsConsentDate).toBeDefined();
    });

    it("should update IP anonymization", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        ipAnonymization: { enabled: true, strategy: "hash" },
      });

      expect(updated.ipAnonymization.enabled).toBe(true);
      expect(updated.ipAnonymization.strategy).toBe("hash");
    });

    it("should update location tracking", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        locationTracking: { enabled: false, precision: "disabled" },
      });

      expect(updated.locationTracking.enabled).toBe(false);
      expect(updated.locationTracking.precision).toBe("disabled");
    });

    it("should update message metadata settings", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        messageMetadata: { storeReadReceipts: false, retentionDays: 30 },
      });

      expect(updated.messageMetadata.storeReadReceipts).toBe(false);
      expect(updated.messageMetadata.retentionDays).toBe(30);
    });

    it("should enforce retention limits", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        messageMetadata: { retentionDays: 1000 }, // Exceeds max
      });

      expect(updated.messageMetadata.retentionDays).toBeLessThanOrEqual(730);
    });

    it("should update third-party settings", () => {
      service.getOrCreateSettings("user1");
      const updated = service.updateSettings("user1", {
        thirdPartySettings: {
          allowIntegrations: false,
          allowAIProcessing: false,
        },
      });

      expect(updated.thirdPartySettings.allowIntegrations).toBe(false);
      expect(updated.thirdPartySettings.allowAIProcessing).toBe(false);
    });

    it("should increment version on update", () => {
      const settings = service.getOrCreateSettings("user1");
      const initialVersion = settings.version;

      service.updateSettings("user1", { privacyLevel: "strict" });

      expect(settings.version).toBe(initialVersion + 1);
    });

    it("should update timestamp on change", () => {
      const settings = service.getOrCreateSettings("user1");
      const initialUpdatedAt = settings.updatedAt;

      // Wait a bit to ensure timestamp changes
      service.updateSettings("user1", { privacyLevel: "strict" });

      expect(settings.updatedAt.getTime()).toBeGreaterThanOrEqual(
        initialUpdatedAt.getTime(),
      );
    });
  });

  describe("deleteSettings", () => {
    it("should delete existing settings", () => {
      service.getOrCreateSettings("user1");
      const deleted = service.deleteSettings("user1");

      expect(deleted).toBe(true);
      expect(service.getSettings("user1")).toBeNull();
    });

    it("should return false for non-existent user", () => {
      const deleted = service.deleteSettings("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("setPrivacyLevel", () => {
    it("should set privacy level with preset", () => {
      service.getOrCreateSettings("user1");
      const settings = service.setPrivacyLevel("user1", "strict");

      expect(settings.privacyLevel).toBe("strict");
      expect(settings.analyticsMode).toBe("aggregated");
    });

    it("should apply all preset values", () => {
      service.getOrCreateSettings("user1");
      const settings = service.setPrivacyLevel("user1", "maximum");

      expect(settings.locationTracking.enabled).toBe(false);
      expect(settings.activityTracking.enabled).toBe(false);
      expect(settings.thirdPartySettings.allowIntegrations).toBe(false);
    });
  });

  describe("analytics consent", () => {
    it("should check consent status", () => {
      service.getOrCreateSettings("user1");

      expect(service.hasAnalyticsConsent("user1")).toBe(false);
    });

    it("should grant analytics consent", () => {
      service.getOrCreateSettings("user1");
      service.grantAnalyticsConsent("user1");

      expect(service.hasAnalyticsConsent("user1")).toBe(true);
    });

    it("should revoke analytics consent", () => {
      service.getOrCreateSettings("user1");
      service.grantAnalyticsConsent("user1");
      service.revokeAnalyticsConsent("user1");

      expect(service.hasAnalyticsConsent("user1")).toBe(false);
    });

    it("should disable analytics mode when revoking consent", () => {
      service.getOrCreateSettings("user1");
      service.grantAnalyticsConsent("user1");
      const settings = service.revokeAnalyticsConsent("user1");

      expect(settings.analyticsMode).toBe("disabled");
    });
  });

  describe("data collection", () => {
    it("should check if category is enabled", () => {
      service.getOrCreateSettings("user1");

      expect(service.isDataCollectionEnabled("user1", "essential")).toBe(true);
      expect(service.isDataCollectionEnabled("user1", "analytics")).toBe(false);
    });

    it("should return true for essential on new user", () => {
      expect(service.isDataCollectionEnabled("user1", "essential")).toBe(true);
    });
  });

  describe("effective settings", () => {
    it("should get effective scrub method", () => {
      service.getOrCreateSettings("user1");

      const method = service.getEffectiveScrubMethod("user1", "request");
      expect(["remove", "hash", "retain"]).toContain(method);
    });

    it("should get effective IP strategy", () => {
      service.getOrCreateSettings("user1");

      const strategy = service.getEffectiveIPStrategy("user1");
      expect(strategy).toBeDefined();
    });
  });

  describe("privacy report", () => {
    it("should generate privacy report", () => {
      service.getOrCreateSettings("user1");
      const report = service.generatePrivacyReport("user1");

      expect(report.userId).toBe("user1");
      expect(report.generatedAt).toBeDefined();
      expect(report.settings).toBeDefined();
      expect(report.dataCategories).toBeDefined();
      expect(report.consentHistory).toBeDefined();
    });

    it("should include recent changes", () => {
      service.getOrCreateSettings("user1");
      service.updateSettings("user1", { privacyLevel: "strict" });

      const report = service.generatePrivacyReport("user1");

      expect(report.recentChanges.length).toBeGreaterThan(0);
    });
  });

  describe("audit log", () => {
    it("should track settings creation", () => {
      service.getOrCreateSettings("user1");

      const entries = service.getAuditLog({ userId: "user1" });
      expect(entries.some((e) => e.action === "settings_created")).toBe(true);
    });

    it("should track settings updates", () => {
      service.getOrCreateSettings("user1");
      service.updateSettings("user1", { privacyLevel: "strict" });

      const entries = service.getAuditLog({ userId: "user1" });
      expect(entries.some((e) => e.action === "settings_updated")).toBe(true);
    });

    it("should track consent changes", () => {
      service.getOrCreateSettings("user1");
      service.grantAnalyticsConsent("user1");

      const entries = service.getAuditLog({ userId: "user1" });
      expect(entries.some((e) => e.action === "analytics_consent_given")).toBe(
        true,
      );
    });

    it("should filter by action", () => {
      service.getOrCreateSettings("user1");
      service.updateSettings("user1", { privacyLevel: "strict" });

      const entries = service.getAuditLog({ action: "settings_updated" });
      expect(entries.every((e) => e.action === "settings_updated")).toBe(true);
    });

    it("should paginate results", () => {
      service.getOrCreateSettings("user1");
      service.updateSettings("user1", { privacyLevel: "strict" });
      service.updateSettings("user1", { privacyLevel: "maximum" });

      const entries = service.getAuditLog({ limit: 1 });
      expect(entries).toHaveLength(1);
    });
  });

  describe("bulk operations", () => {
    it("should apply global privacy level", () => {
      service.getOrCreateSettings("user1");
      service.getOrCreateSettings("user2");

      const count = service.applyGlobalPrivacyLevel("strict");

      expect(count).toBe(2);
      expect(service.getSettings("user1")?.privacyLevel).toBe("strict");
      expect(service.getSettings("user2")?.privacyLevel).toBe("strict");
    });

    it("should get users with specific setting", () => {
      service.getOrCreateSettings("user1");
      service.setPrivacyLevel("user1", "strict");
      service.getOrCreateSettings("user2");

      const users = service.getUsersWithSetting(
        (s) => s.privacyLevel === "strict",
      );

      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe("user1");
    });

    it("should count by privacy level", () => {
      service.getOrCreateSettings("user1");
      service.getOrCreateSettings("user2");
      service.setPrivacyLevel("user2", "strict");

      const counts = service.countByPrivacyLevel();

      expect(counts.balanced).toBe(1);
      expect(counts.strict).toBe(1);
    });
  });

  describe("export/import", () => {
    it("should export all settings", () => {
      service.getOrCreateSettings("user1");
      service.getOrCreateSettings("user2");

      const exported = service.exportSettings();

      expect(exported).toHaveLength(2);
    });

    it("should import settings", () => {
      const settings = createDefaultSettings("user1", "strict");
      settings.id = "imported-id";

      const result = service.importSettings([settings]);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(service.getSettings("user1")).toBeDefined();
    });
  });

  describe("clearAll", () => {
    it("should clear all settings and audit log", () => {
      service.getOrCreateSettings("user1");
      service.getOrCreateSettings("user2");

      service.clearAll();

      expect(service.settingsCount).toBe(0);
      expect(service.getAuditLog()).toHaveLength(0);
    });
  });
});

describe("createDefaultSettings", () => {
  it("should create settings with specified privacy level", () => {
    const settings = createDefaultSettings("user1", "strict");

    expect(settings.userId).toBe("user1");
    expect(settings.privacyLevel).toBe("strict");
  });

  it("should apply preset values", () => {
    const settings = createDefaultSettings("user1", "maximum");

    expect(settings.analyticsMode).toBe("disabled");
    expect(settings.locationTracking.enabled).toBe(false);
    expect(settings.activityTracking.enabled).toBe(false);
  });

  it("should have unique ID", () => {
    const settings1 = createDefaultSettings("user1");
    const settings2 = createDefaultSettings("user2");

    expect(settings1.id).not.toBe(settings2.id);
  });

  it("should set timestamps", () => {
    const settings = createDefaultSettings("user1");

    expect(settings.createdAt).toBeInstanceOf(Date);
    expect(settings.updatedAt).toBeInstanceOf(Date);
  });

  it("should include data collection preferences", () => {
    const settings = createDefaultSettings("user1");

    expect(settings.dataCollection).toHaveLength(
      DEFAULT_DATA_COLLECTION.length,
    );
    expect(
      settings.dataCollection.find((dc) => dc.category === "essential")
        ?.enabled,
    ).toBe(true);
  });

  it("should include metadata retention preferences", () => {
    const settings = createDefaultSettings("user1");

    expect(settings.metadataRetention).toHaveLength(
      DEFAULT_METADATA_RETENTION.length,
    );
  });
});

describe("PRIVACY_LEVEL_PRESETS", () => {
  it("should have presets for all non-custom levels", () => {
    expect(PRIVACY_LEVEL_PRESETS.minimal).toBeDefined();
    expect(PRIVACY_LEVEL_PRESETS.balanced).toBeDefined();
    expect(PRIVACY_LEVEL_PRESETS.strict).toBeDefined();
    expect(PRIVACY_LEVEL_PRESETS.maximum).toBeDefined();
  });

  it("should have increasing privacy from minimal to maximum", () => {
    expect(PRIVACY_LEVEL_PRESETS.minimal.analyticsMode).toBe("full");
    expect(PRIVACY_LEVEL_PRESETS.balanced.analyticsMode).toBe("anonymous");
    expect(PRIVACY_LEVEL_PRESETS.strict.analyticsMode).toBe("aggregated");
    expect(PRIVACY_LEVEL_PRESETS.maximum.analyticsMode).toBe("disabled");
  });

  it("should have valid settings in each preset", () => {
    for (const preset of Object.values(PRIVACY_LEVEL_PRESETS)) {
      expect(preset.analyticsMode).toBeDefined();
      expect(preset.ipAnonymization).toBeDefined();
      expect(preset.locationTracking).toBeDefined();
    }
  });
});

describe("DEFAULT_DATA_COLLECTION", () => {
  it("should have essential category", () => {
    const essential = DEFAULT_DATA_COLLECTION.find(
      (dc) => dc.category === "essential",
    );
    expect(essential).toBeDefined();
    expect(essential?.enabled).toBe(true);
  });

  it("should have analytics category disabled by default", () => {
    const analytics = DEFAULT_DATA_COLLECTION.find(
      (dc) => dc.category === "analytics",
    );
    expect(analytics).toBeDefined();
    expect(analytics?.enabled).toBe(false);
  });

  it("should have descriptions for all categories", () => {
    for (const dc of DEFAULT_DATA_COLLECTION) {
      expect(dc.description).toBeDefined();
      expect(dc.description.length).toBeGreaterThan(0);
    }
  });
});

describe("DEFAULT_METADATA_RETENTION", () => {
  it("should have all metadata categories", () => {
    const categories = DEFAULT_METADATA_RETENTION.map((mr) => mr.category);

    expect(categories).toContain("request");
    expect(categories).toContain("user_activity");
    expect(categories).toContain("message");
    expect(categories).toContain("session");
    expect(categories).toContain("analytics");
    expect(categories).toContain("audit");
  });

  it("should have audit with longest retention", () => {
    const audit = DEFAULT_METADATA_RETENTION.find(
      (mr) => mr.category === "audit",
    );
    expect(audit?.retentionDays).toBeGreaterThanOrEqual(365);
  });

  it("should have valid retention days", () => {
    for (const mr of DEFAULT_METADATA_RETENTION) {
      expect(mr.retentionDays).toBeGreaterThanOrEqual(0);
    }
  });
});
