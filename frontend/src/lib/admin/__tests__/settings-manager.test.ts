/**
 * Settings Manager Unit Tests
 *
 * Tests for global settings management utilities including validation,
 * reading, updating, and resetting settings.
 */

import {
  validateGeneralSettings,
  validateSecuritySettings,
  validateLimitSettings,
  validateNotificationSettings,
  validateIntegrationSettings,
  validateSettings,
  readSettings,
  updateSettings,
  resetToDefaults,
  resetSection,
  isValidEmail,
  isValidUrl,
  isValidTimeFormat,
  getChangedFields,
  getSettingsDiff,
  formatSettingValue,
  getSettingCategoryLabel,
  exportSettings,
  importSettings,
  defaultGlobalSettings,
  defaultGeneralSettings,
  defaultSecuritySettings,
  defaultFeatureSettings,
  defaultLimitSettings,
  defaultNotificationSettings,
  defaultIntegrationSettings,
  type GlobalSettings,
  type GeneralSettings,
  type SecuritySettings,
  type LimitSettings,
} from "../settings-manager";

// ============================================================================
// Validation Tests
// ============================================================================

describe("Validation Functions", () => {
  describe("validateGeneralSettings", () => {
    it("should pass for valid settings", () => {
      const errors = validateGeneralSettings({
        siteName: "My Site",
        siteUrl: "https://example.com",
        supportEmail: "support@example.com",
      });

      expect(errors.length).toBe(0);
    });

    it("should fail for empty site name", () => {
      const errors = validateGeneralSettings({ siteName: "" });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("general.siteName");
    });

    it("should fail for invalid URL", () => {
      const errors = validateGeneralSettings({ siteUrl: "not-a-url" });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("general.siteUrl");
    });

    it("should fail for invalid email", () => {
      const errors = validateGeneralSettings({ supportEmail: "not-an-email" });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("general.supportEmail");
    });
  });

  describe("validateSecuritySettings", () => {
    it("should pass for valid settings", () => {
      const errors = validateSecuritySettings({
        passwordMinLength: 8,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
      });

      expect(errors.length).toBe(0);
    });

    it("should fail for password min length less than 6", () => {
      const errors = validateSecuritySettings({ passwordMinLength: 4 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("security.passwordMinLength");
      expect(errors[0].message).toContain("at least 6");
    });

    it("should fail for password min length greater than 128", () => {
      const errors = validateSecuritySettings({ passwordMinLength: 200 });

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("exceed 128");
    });

    it("should fail for session timeout less than 5", () => {
      const errors = validateSecuritySettings({ sessionTimeout: 3 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("security.sessionTimeout");
    });

    it("should fail for max login attempts less than 1", () => {
      const errors = validateSecuritySettings({ maxLoginAttempts: 0 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("security.maxLoginAttempts");
    });

    it("should fail for lockout duration less than 1", () => {
      const errors = validateSecuritySettings({ lockoutDuration: 0 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("security.lockoutDuration");
    });
  });

  describe("validateLimitSettings", () => {
    it("should pass for valid settings", () => {
      const errors = validateLimitSettings({
        maxFileSize: 10 * 1024 * 1024,
        maxMessageLength: 4000,
        maxChannelsPerUser: 100,
        maxMembersPerChannel: 1000,
        rateLimit: 100,
      });

      expect(errors.length).toBe(0);
    });

    it("should fail for max file size less than 1KB", () => {
      const errors = validateLimitSettings({ maxFileSize: 100 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("limits.maxFileSize");
    });

    it("should fail for max file size greater than 100MB", () => {
      const errors = validateLimitSettings({ maxFileSize: 200 * 1024 * 1024 });

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("100MB");
    });

    it("should fail for max message length less than 1", () => {
      const errors = validateLimitSettings({ maxMessageLength: 0 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("limits.maxMessageLength");
    });

    it("should fail for max message length greater than 10000", () => {
      const errors = validateLimitSettings({ maxMessageLength: 20000 });

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("10000");
    });

    it("should fail for max channels per user less than 1", () => {
      const errors = validateLimitSettings({ maxChannelsPerUser: 0 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("limits.maxChannelsPerUser");
    });

    it("should fail for max members per channel less than 2", () => {
      const errors = validateLimitSettings({ maxMembersPerChannel: 1 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("limits.maxMembersPerChannel");
    });

    it("should fail for rate limit less than 1", () => {
      const errors = validateLimitSettings({ rateLimit: 0 });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("limits.rateLimit");
    });
  });

  describe("validateNotificationSettings", () => {
    it("should pass for valid settings", () => {
      const errors = validateNotificationSettings({
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      });

      expect(errors.length).toBe(0);
    });

    it("should fail for invalid quiet hours start", () => {
      const errors = validateNotificationSettings({ quietHoursStart: "25:00" });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("notifications.quietHoursStart");
    });

    it("should fail for invalid quiet hours end", () => {
      const errors = validateNotificationSettings({ quietHoursEnd: "invalid" });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("notifications.quietHoursEnd");
    });
  });

  describe("validateIntegrationSettings", () => {
    it("should pass for valid settings", () => {
      const errors = validateIntegrationSettings({
        slackEnabled: true,
        slackWebhookUrl: "https://hooks.slack.com/services/xxx",
      });

      expect(errors.length).toBe(0);
    });

    it("should fail for slack enabled without URL", () => {
      const errors = validateIntegrationSettings({
        slackEnabled: true,
        slackWebhookUrl: "",
      });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("integrations.slackWebhookUrl");
    });

    it("should fail for invalid slack webhook URL", () => {
      const errors = validateIntegrationSettings({
        slackWebhookUrl: "not-a-url",
      });

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("Invalid");
    });

    it("should fail for jira enabled without URL", () => {
      const errors = validateIntegrationSettings({
        jiraEnabled: true,
        jiraUrl: "",
      });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe("integrations.jiraUrl");
    });
  });

  describe("validateSettings", () => {
    it("should validate all sections", () => {
      const result = validateSettings({
        general: { siteName: "" },
        security: { passwordMinLength: 4 },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it("should return valid for correct settings", () => {
      const result = validateSettings({
        general: { siteName: "My Site" },
        security: { passwordMinLength: 8 },
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});

// ============================================================================
// Settings Operations Tests
// ============================================================================

describe("Settings Operations", () => {
  describe("readSettings", () => {
    it("should return defaults for null input", () => {
      const settings = readSettings(null);

      expect(settings).toEqual(defaultGlobalSettings);
    });

    it("should return defaults for undefined input", () => {
      const settings = readSettings(undefined);

      expect(settings).toEqual(defaultGlobalSettings);
    });

    it("should merge with defaults", () => {
      const settings = readSettings({
        general: { siteName: "Custom Site" },
      });

      expect(settings.general.siteName).toBe("Custom Site");
      expect(settings.general.siteDescription).toBe(
        defaultGeneralSettings.siteDescription,
      );
      expect(settings.security).toEqual(defaultSecuritySettings);
    });
  });

  describe("updateSettings", () => {
    it("should update valid settings", () => {
      const current = { ...defaultGlobalSettings };
      const result = updateSettings(current, {
        general: { siteName: "New Name" },
      });

      expect(result.success).toBe(true);
      expect(result.settings?.general.siteName).toBe("New Name");
      expect(result.changedFields).toContain("general.siteName");
    });

    it("should fail for invalid settings", () => {
      const current = { ...defaultGlobalSettings };
      const result = updateSettings(current, {
        security: { passwordMinLength: 4 },
      });

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it("should track changed fields", () => {
      const current = { ...defaultGlobalSettings };
      const result = updateSettings(current, {
        general: { siteName: "New Name", siteDescription: "New Description" },
      });

      expect(result.changedFields?.length).toBe(2);
      expect(result.changedFields).toContain("general.siteName");
      expect(result.changedFields).toContain("general.siteDescription");
    });

    it("should not track unchanged fields", () => {
      const current = { ...defaultGlobalSettings };
      const result = updateSettings(current, {
        general: { siteName: defaultGeneralSettings.siteName },
      });

      expect(result.changedFields?.includes("general.siteName")).toBe(false);
    });
  });

  describe("resetToDefaults", () => {
    it("should reset all settings to defaults", () => {
      const settings = resetToDefaults();

      expect(settings).toEqual(defaultGlobalSettings);
    });

    it("should reset specific section to defaults", () => {
      const settings = resetToDefaults("general");

      expect(settings.general).toEqual(defaultGeneralSettings);
    });
  });

  describe("resetSection", () => {
    it("should reset only the specified section", () => {
      const current: GlobalSettings = {
        ...defaultGlobalSettings,
        general: { ...defaultGeneralSettings, siteName: "Custom Site" },
        security: { ...defaultSecuritySettings, passwordMinLength: 12 },
      };

      const result = resetSection(current, "general");

      expect(result.general).toEqual(defaultGeneralSettings);
      expect(result.security.passwordMinLength).toBe(12);
    });

    it("should reset security section", () => {
      const current: GlobalSettings = {
        ...defaultGlobalSettings,
        security: { ...defaultSecuritySettings, passwordMinLength: 12 },
      };

      const result = resetSection(current, "security");

      expect(result.security).toEqual(defaultSecuritySettings);
    });

    it("should reset features section", () => {
      const current: GlobalSettings = {
        ...defaultGlobalSettings,
        features: { ...defaultFeatureSettings, publicRegistration: false },
      };

      const result = resetSection(current, "features");

      expect(result.features).toEqual(defaultFeatureSettings);
    });

    it("should reset limits section", () => {
      const current: GlobalSettings = {
        ...defaultGlobalSettings,
        limits: { ...defaultLimitSettings, maxFileSize: 999 },
      };

      const result = resetSection(current, "limits");

      expect(result.limits).toEqual(defaultLimitSettings);
    });

    it("should reset notifications section", () => {
      const current: GlobalSettings = {
        ...defaultGlobalSettings,
        notifications: {
          ...defaultNotificationSettings,
          emailNotifications: false,
        },
      };

      const result = resetSection(current, "notifications");

      expect(result.notifications).toEqual(defaultNotificationSettings);
    });

    it("should reset integrations section", () => {
      const current: GlobalSettings = {
        ...defaultGlobalSettings,
        integrations: { ...defaultIntegrationSettings, slackEnabled: true },
      };

      const result = resetSection(current, "integrations");

      expect(result.integrations).toEqual(defaultIntegrationSettings);
    });
  });
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe("Helper Functions", () => {
  describe("isValidEmail", () => {
    it("should return true for valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.com")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(isValidEmail("not-an-email")).toBe(false);
      expect(isValidEmail("missing@domain")).toBe(false);
      expect(isValidEmail("@nodomain.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(true);
      expect(isValidUrl("https://sub.domain.com/path?query=1")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("//missing-protocol.com")).toBe(false);
    });
  });

  describe("isValidTimeFormat", () => {
    it("should return true for valid times", () => {
      expect(isValidTimeFormat("00:00")).toBe(true);
      expect(isValidTimeFormat("12:30")).toBe(true);
      expect(isValidTimeFormat("23:59")).toBe(true);
      expect(isValidTimeFormat("9:00")).toBe(true);
    });

    it("should return false for invalid times", () => {
      expect(isValidTimeFormat("25:00")).toBe(false);
      expect(isValidTimeFormat("12:60")).toBe(false);
      expect(isValidTimeFormat("invalid")).toBe(false);
      expect(isValidTimeFormat("")).toBe(false);
    });
  });

  describe("getChangedFields", () => {
    it("should detect changed fields", () => {
      const current = { a: 1, b: "hello", c: true };
      const updates = { a: 2, b: "world" };

      const changed = getChangedFields(current, updates, "test");

      expect(changed).toContain("test.a");
      expect(changed).toContain("test.b");
      expect(changed).not.toContain("test.c");
    });

    it("should handle array changes", () => {
      const current = { items: ["a", "b"] };
      const updates = { items: ["a", "b", "c"] };

      const changed = getChangedFields(current, updates, "test");

      expect(changed).toContain("test.items");
    });

    it("should not detect unchanged arrays", () => {
      const current = { items: ["a", "b"] };
      const updates = { items: ["a", "b"] };

      const changed = getChangedFields(current, updates, "test");

      expect(changed).not.toContain("test.items");
    });
  });

  describe("getSettingsDiff", () => {
    it("should return diff between settings", () => {
      const before = { ...defaultGlobalSettings };
      const after = {
        ...defaultGlobalSettings,
        general: { ...defaultGeneralSettings, siteName: "New Name" },
      };

      const diff = getSettingsDiff(before, after);

      expect(diff["general.siteName"]).toBeDefined();
      expect(diff["general.siteName"].old).toBe(
        defaultGeneralSettings.siteName,
      );
      expect(diff["general.siteName"].new).toBe("New Name");
    });

    it("should return empty diff for identical settings", () => {
      const settings = { ...defaultGlobalSettings };

      const diff = getSettingsDiff(settings, settings);

      expect(Object.keys(diff).length).toBe(0);
    });
  });

  describe("formatSettingValue", () => {
    it("should format null/undefined", () => {
      expect(formatSettingValue(null)).toBe("Not set");
      expect(formatSettingValue(undefined)).toBe("Not set");
    });

    it("should format booleans", () => {
      expect(formatSettingValue(true)).toBe("Enabled");
      expect(formatSettingValue(false)).toBe("Disabled");
    });

    it("should format numbers", () => {
      expect(formatSettingValue(1000)).toBe("1,000");
      expect(formatSettingValue(1234567)).toBe("1,234,567");
    });

    it("should format arrays", () => {
      expect(formatSettingValue([])).toBe("None");
      expect(formatSettingValue(["a", "b", "c"])).toBe("a, b, c");
    });

    it("should format strings", () => {
      expect(formatSettingValue("hello")).toBe("hello");
    });
  });

  describe("getSettingCategoryLabel", () => {
    it("should return labels for all categories", () => {
      expect(getSettingCategoryLabel("general")).toBe("General");
      expect(getSettingCategoryLabel("security")).toBe("Security");
      expect(getSettingCategoryLabel("features")).toBe("Features");
      expect(getSettingCategoryLabel("limits")).toBe("Limits");
      expect(getSettingCategoryLabel("notifications")).toBe("Notifications");
      expect(getSettingCategoryLabel("integrations")).toBe("Integrations");
    });
  });
});

// ============================================================================
// Export/Import Tests
// ============================================================================

describe("Export/Import", () => {
  describe("exportSettings", () => {
    it("should export settings as JSON", () => {
      const json = exportSettings(defaultGlobalSettings);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe("1.0.0");
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.settings).toBeDefined();
      expect(parsed.settings.general.siteName).toBe(
        defaultGeneralSettings.siteName,
      );
    });
  });

  describe("importSettings", () => {
    it("should import valid settings", () => {
      const json = exportSettings(defaultGlobalSettings);
      const result = importSettings(json);

      expect(result.success).toBe(true);
      expect(result.settings).toBeDefined();
    });

    it("should fail for invalid JSON", () => {
      const result = importSettings("not-json");

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain("JSON");
    });

    it("should fail for missing settings key", () => {
      const result = importSettings(JSON.stringify({ version: "1.0.0" }));

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain("format");
    });

    it("should fail for invalid settings values", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        settings: {
          security: { passwordMinLength: 4 },
        },
      });
      const result = importSettings(json);

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Default Settings Tests
// ============================================================================

describe("Default Settings", () => {
  it("should have all required general settings", () => {
    expect(defaultGeneralSettings.siteName).toBeDefined();
    expect(defaultGeneralSettings.siteDescription).toBeDefined();
    expect(defaultGeneralSettings.siteUrl).toBeDefined();
    expect(defaultGeneralSettings.supportEmail).toBeDefined();
    expect(defaultGeneralSettings.defaultLanguage).toBeDefined();
    expect(defaultGeneralSettings.defaultTimezone).toBeDefined();
    expect(typeof defaultGeneralSettings.maintenanceMode).toBe("boolean");
    expect(defaultGeneralSettings.maintenanceMessage).toBeDefined();
  });

  it("should have all required security settings", () => {
    expect(typeof defaultSecuritySettings.passwordMinLength).toBe("number");
    expect(typeof defaultSecuritySettings.passwordRequireUppercase).toBe(
      "boolean",
    );
    expect(typeof defaultSecuritySettings.passwordRequireLowercase).toBe(
      "boolean",
    );
    expect(typeof defaultSecuritySettings.passwordRequireNumbers).toBe(
      "boolean",
    );
    expect(typeof defaultSecuritySettings.passwordRequireSpecial).toBe(
      "boolean",
    );
    expect(typeof defaultSecuritySettings.sessionTimeout).toBe("number");
    expect(typeof defaultSecuritySettings.maxLoginAttempts).toBe("number");
    expect(typeof defaultSecuritySettings.lockoutDuration).toBe("number");
    expect(typeof defaultSecuritySettings.twoFactorEnabled).toBe("boolean");
    expect(typeof defaultSecuritySettings.twoFactorRequired).toBe("boolean");
    expect(Array.isArray(defaultSecuritySettings.allowedDomains)).toBe(true);
    expect(Array.isArray(defaultSecuritySettings.blockedDomains)).toBe(true);
  });

  it("should have all required feature settings", () => {
    expect(typeof defaultFeatureSettings.publicRegistration).toBe("boolean");
    expect(typeof defaultFeatureSettings.emailVerificationRequired).toBe(
      "boolean",
    );
    expect(typeof defaultFeatureSettings.publicChannels).toBe("boolean");
    expect(typeof defaultFeatureSettings.privateChannels).toBe("boolean");
    expect(typeof defaultFeatureSettings.directMessages).toBe("boolean");
    expect(typeof defaultFeatureSettings.threads).toBe("boolean");
    expect(typeof defaultFeatureSettings.reactions).toBe("boolean");
    expect(typeof defaultFeatureSettings.fileUploads).toBe("boolean");
  });

  it("should have all required limit settings", () => {
    expect(typeof defaultLimitSettings.maxFileSize).toBe("number");
    expect(typeof defaultLimitSettings.maxMessageLength).toBe("number");
    expect(typeof defaultLimitSettings.maxChannelsPerUser).toBe("number");
    expect(typeof defaultLimitSettings.maxMembersPerChannel).toBe("number");
    expect(typeof defaultLimitSettings.maxDailyMessages).toBe("number");
    expect(typeof defaultLimitSettings.storageQuota).toBe("number");
    expect(typeof defaultLimitSettings.rateLimit).toBe("number");
  });

  it("should have all required notification settings", () => {
    expect(typeof defaultNotificationSettings.emailNotifications).toBe(
      "boolean",
    );
    expect(typeof defaultNotificationSettings.pushNotifications).toBe(
      "boolean",
    );
    expect(typeof defaultNotificationSettings.digestEnabled).toBe("boolean");
    expect(typeof defaultNotificationSettings.quietHoursEnabled).toBe(
      "boolean",
    );
    expect(defaultNotificationSettings.quietHoursStart).toBeDefined();
    expect(defaultNotificationSettings.quietHoursEnd).toBeDefined();
  });

  it("should have all required integration settings", () => {
    expect(typeof defaultIntegrationSettings.slackEnabled).toBe("boolean");
    expect(typeof defaultIntegrationSettings.githubEnabled).toBe("boolean");
    expect(typeof defaultIntegrationSettings.jiraEnabled).toBe("boolean");
    expect(typeof defaultIntegrationSettings.googleDriveEnabled).toBe(
      "boolean",
    );
    expect(typeof defaultIntegrationSettings.dropboxEnabled).toBe("boolean");
    expect(typeof defaultIntegrationSettings.zapierEnabled).toBe("boolean");
  });
});
