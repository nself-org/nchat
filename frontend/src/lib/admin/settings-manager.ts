/**
 * Settings Manager - Global settings management utilities for the admin dashboard
 *
 * Provides functions to read, update, validate, and reset global application settings.
 */

// ============================================================================
// Types
// ============================================================================

export interface GlobalSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  features: FeatureSettings;
  limits: LimitSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
}

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  supportEmail: string;
  defaultLanguage: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  [key: string]: unknown;
}

export interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  ipWhitelist: string[];
  ipBlacklist: string[];
  [key: string]: unknown;
}

export interface FeatureSettings {
  publicRegistration: boolean;
  emailVerificationRequired: boolean;
  inviteOnly: boolean;
  publicChannels: boolean;
  privateChannels: boolean;
  directMessages: boolean;
  threads: boolean;
  reactions: boolean;
  fileUploads: boolean;
  voiceMessages: boolean;
  videoConference: boolean;
  customEmoji: boolean;
  userProfiles: boolean;
  userStatus: boolean;
  [key: string]: unknown;
}

export interface LimitSettings {
  maxFileSize: number; // bytes
  maxMessageLength: number;
  maxChannelsPerUser: number;
  maxMembersPerChannel: number;
  maxDailyMessages: number;
  storageQuota: number; // bytes
  rateLimit: number; // requests per minute
  [key: string]: unknown;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  slackNotifications: boolean;
  webhookNotifications: boolean;
  digestEnabled: boolean;
  digestFrequency: "daily" | "weekly" | "never";
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
  [key: string]: unknown;
}

export interface IntegrationSettings {
  slackEnabled: boolean;
  slackWebhookUrl: string;
  githubEnabled: boolean;
  githubToken: string;
  jiraEnabled: boolean;
  jiraUrl: string;
  googleDriveEnabled: boolean;
  dropboxEnabled: boolean;
  zapierEnabled: boolean;
  [key: string]: unknown;
}

export interface SettingsValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: SettingsValidationError[];
}

export interface SettingsUpdateResult {
  success: boolean;
  settings?: GlobalSettings;
  errors?: SettingsValidationError[];
  changedFields?: string[];
}

// ============================================================================
// Default Settings
// ============================================================================

export const defaultGeneralSettings: GeneralSettings = {
  siteName: "nchat",
  siteDescription: "Team communication platform",
  siteUrl: "https://localhost:3000",
  supportEmail: "support@example.com",
  defaultLanguage: "en",
  defaultTimezone: "UTC",
  maintenanceMode: false,
  maintenanceMessage:
    "We are performing scheduled maintenance. Please check back soon.",
};

export const defaultSecuritySettings: SecuritySettings = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: false,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  twoFactorEnabled: false,
  twoFactorRequired: false,
  allowedDomains: [],
  blockedDomains: [],
  ipWhitelist: [],
  ipBlacklist: [],
};

export const defaultFeatureSettings: FeatureSettings = {
  publicRegistration: true,
  emailVerificationRequired: true,
  inviteOnly: false,
  publicChannels: true,
  privateChannels: true,
  directMessages: true,
  threads: true,
  reactions: true,
  fileUploads: true,
  voiceMessages: false,
  videoConference: false,
  customEmoji: true,
  userProfiles: true,
  userStatus: true,
};

export const defaultLimitSettings: LimitSettings = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxMessageLength: 4000,
  maxChannelsPerUser: 100,
  maxMembersPerChannel: 1000,
  maxDailyMessages: 10000,
  storageQuota: 5 * 1024 * 1024 * 1024, // 5GB
  rateLimit: 100,
};

export const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  slackNotifications: false,
  webhookNotifications: false,
  digestEnabled: false,
  digestFrequency: "never",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

export const defaultIntegrationSettings: IntegrationSettings = {
  slackEnabled: false,
  slackWebhookUrl: "",
  githubEnabled: false,
  githubToken: "",
  jiraEnabled: false,
  jiraUrl: "",
  googleDriveEnabled: false,
  dropboxEnabled: false,
  zapierEnabled: false,
};

export const defaultGlobalSettings: GlobalSettings = {
  general: defaultGeneralSettings,
  security: defaultSecuritySettings,
  features: defaultFeatureSettings,
  limits: defaultLimitSettings,
  notifications: defaultNotificationSettings,
  integrations: defaultIntegrationSettings,
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate general settings
 */
export function validateGeneralSettings(
  settings: Partial<GeneralSettings>,
): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  if (settings.siteName !== undefined && settings.siteName.trim() === "") {
    errors.push({
      field: "general.siteName",
      message: "Site name is required",
      value: settings.siteName,
    });
  }

  if (settings.siteUrl !== undefined) {
    try {
      new URL(settings.siteUrl);
    } catch {
      errors.push({
        field: "general.siteUrl",
        message: "Invalid URL format",
        value: settings.siteUrl,
      });
    }
  }

  if (
    settings.supportEmail !== undefined &&
    !isValidEmail(settings.supportEmail)
  ) {
    errors.push({
      field: "general.supportEmail",
      message: "Invalid email format",
      value: settings.supportEmail,
    });
  }

  return errors;
}

/**
 * Validate security settings
 */
export function validateSecuritySettings(
  settings: Partial<SecuritySettings>,
): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  if (settings.passwordMinLength !== undefined) {
    if (settings.passwordMinLength < 6) {
      errors.push({
        field: "security.passwordMinLength",
        message: "Password minimum length must be at least 6",
        value: settings.passwordMinLength,
      });
    }
    if (settings.passwordMinLength > 128) {
      errors.push({
        field: "security.passwordMinLength",
        message: "Password minimum length cannot exceed 128",
        value: settings.passwordMinLength,
      });
    }
  }

  if (settings.sessionTimeout !== undefined && settings.sessionTimeout < 5) {
    errors.push({
      field: "security.sessionTimeout",
      message: "Session timeout must be at least 5 minutes",
      value: settings.sessionTimeout,
    });
  }

  if (
    settings.maxLoginAttempts !== undefined &&
    settings.maxLoginAttempts < 1
  ) {
    errors.push({
      field: "security.maxLoginAttempts",
      message: "Max login attempts must be at least 1",
      value: settings.maxLoginAttempts,
    });
  }

  if (settings.lockoutDuration !== undefined && settings.lockoutDuration < 1) {
    errors.push({
      field: "security.lockoutDuration",
      message: "Lockout duration must be at least 1 minute",
      value: settings.lockoutDuration,
    });
  }

  return errors;
}

/**
 * Validate limit settings
 */
export function validateLimitSettings(
  settings: Partial<LimitSettings>,
): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  if (settings.maxFileSize !== undefined) {
    if (settings.maxFileSize < 1024) {
      errors.push({
        field: "limits.maxFileSize",
        message: "Max file size must be at least 1KB",
        value: settings.maxFileSize,
      });
    }
    if (settings.maxFileSize > 100 * 1024 * 1024) {
      errors.push({
        field: "limits.maxFileSize",
        message: "Max file size cannot exceed 100MB",
        value: settings.maxFileSize,
      });
    }
  }

  if (settings.maxMessageLength !== undefined) {
    if (settings.maxMessageLength < 1) {
      errors.push({
        field: "limits.maxMessageLength",
        message: "Max message length must be at least 1",
        value: settings.maxMessageLength,
      });
    }
    if (settings.maxMessageLength > 10000) {
      errors.push({
        field: "limits.maxMessageLength",
        message: "Max message length cannot exceed 10000",
        value: settings.maxMessageLength,
      });
    }
  }

  if (
    settings.maxChannelsPerUser !== undefined &&
    settings.maxChannelsPerUser < 1
  ) {
    errors.push({
      field: "limits.maxChannelsPerUser",
      message: "Max channels per user must be at least 1",
      value: settings.maxChannelsPerUser,
    });
  }

  if (
    settings.maxMembersPerChannel !== undefined &&
    settings.maxMembersPerChannel < 2
  ) {
    errors.push({
      field: "limits.maxMembersPerChannel",
      message: "Max members per channel must be at least 2",
      value: settings.maxMembersPerChannel,
    });
  }

  if (settings.rateLimit !== undefined && settings.rateLimit < 1) {
    errors.push({
      field: "limits.rateLimit",
      message: "Rate limit must be at least 1 request per minute",
      value: settings.rateLimit,
    });
  }

  return errors;
}

/**
 * Validate notification settings
 */
export function validateNotificationSettings(
  settings: Partial<NotificationSettings>,
): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  if (
    settings.quietHoursStart !== undefined &&
    !isValidTimeFormat(settings.quietHoursStart)
  ) {
    errors.push({
      field: "notifications.quietHoursStart",
      message: "Invalid time format. Use HH:MM format",
      value: settings.quietHoursStart,
    });
  }

  if (
    settings.quietHoursEnd !== undefined &&
    !isValidTimeFormat(settings.quietHoursEnd)
  ) {
    errors.push({
      field: "notifications.quietHoursEnd",
      message: "Invalid time format. Use HH:MM format",
      value: settings.quietHoursEnd,
    });
  }

  return errors;
}

/**
 * Validate integration settings
 */
export function validateIntegrationSettings(
  settings: Partial<IntegrationSettings>,
): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  if (settings.slackEnabled && !settings.slackWebhookUrl) {
    errors.push({
      field: "integrations.slackWebhookUrl",
      message: "Slack webhook URL is required when Slack is enabled",
      value: settings.slackWebhookUrl,
    });
  }

  if (settings.slackWebhookUrl && !isValidUrl(settings.slackWebhookUrl)) {
    errors.push({
      field: "integrations.slackWebhookUrl",
      message: "Invalid Slack webhook URL",
      value: settings.slackWebhookUrl,
    });
  }

  if (settings.jiraEnabled && !settings.jiraUrl) {
    errors.push({
      field: "integrations.jiraUrl",
      message: "Jira URL is required when Jira is enabled",
      value: settings.jiraUrl,
    });
  }

  if (settings.jiraUrl && !isValidUrl(settings.jiraUrl)) {
    errors.push({
      field: "integrations.jiraUrl",
      message: "Invalid Jira URL",
      value: settings.jiraUrl,
    });
  }

  return errors;
}

/**
 * Validate all settings
 */
export function validateSettings(
  settings: Partial<GlobalSettings>,
): SettingsValidationResult {
  const errors: SettingsValidationError[] = [];

  if (settings.general) {
    errors.push(...validateGeneralSettings(settings.general));
  }

  if (settings.security) {
    errors.push(...validateSecuritySettings(settings.security));
  }

  if (settings.limits) {
    errors.push(...validateLimitSettings(settings.limits));
  }

  if (settings.notifications) {
    errors.push(...validateNotificationSettings(settings.notifications));
  }

  if (settings.integrations) {
    errors.push(...validateIntegrationSettings(settings.integrations));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Settings Operations
// ============================================================================

/**
 * Read settings with default values
 */
export function readSettings(
  stored: Partial<GlobalSettings> | null | undefined,
): GlobalSettings {
  if (!stored) {
    return { ...defaultGlobalSettings };
  }

  return {
    general: { ...defaultGeneralSettings, ...stored.general },
    security: { ...defaultSecuritySettings, ...stored.security },
    features: { ...defaultFeatureSettings, ...stored.features },
    limits: { ...defaultLimitSettings, ...stored.limits },
    notifications: { ...defaultNotificationSettings, ...stored.notifications },
    integrations: { ...defaultIntegrationSettings, ...stored.integrations },
  };
}

/**
 * Update settings with validation
 */
export function updateSettings(
  current: GlobalSettings,
  updates: Partial<GlobalSettings>,
): SettingsUpdateResult {
  // Validate updates
  const validation = validateSettings(updates);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  // Track changed fields
  const changedFields: string[] = [];

  // Merge updates
  const newSettings: GlobalSettings = { ...current };

  if (updates.general) {
    const changes = getChangedFields(
      current.general,
      updates.general,
      "general",
    );
    changedFields.push(...changes);
    newSettings.general = { ...current.general, ...updates.general };
  }

  if (updates.security) {
    const changes = getChangedFields(
      current.security,
      updates.security,
      "security",
    );
    changedFields.push(...changes);
    newSettings.security = { ...current.security, ...updates.security };
  }

  if (updates.features) {
    const changes = getChangedFields(
      current.features,
      updates.features,
      "features",
    );
    changedFields.push(...changes);
    newSettings.features = { ...current.features, ...updates.features };
  }

  if (updates.limits) {
    const changes = getChangedFields(current.limits, updates.limits, "limits");
    changedFields.push(...changes);
    newSettings.limits = { ...current.limits, ...updates.limits };
  }

  if (updates.notifications) {
    const changes = getChangedFields(
      current.notifications,
      updates.notifications,
      "notifications",
    );
    changedFields.push(...changes);
    newSettings.notifications = {
      ...current.notifications,
      ...updates.notifications,
    };
  }

  if (updates.integrations) {
    const changes = getChangedFields(
      current.integrations,
      updates.integrations,
      "integrations",
    );
    changedFields.push(...changes);
    newSettings.integrations = {
      ...current.integrations,
      ...updates.integrations,
    };
  }

  return {
    success: true,
    settings: newSettings,
    changedFields,
  };
}

/**
 * Reset settings to defaults
 */
export function resetToDefaults(
  section?: keyof GlobalSettings,
): GlobalSettings {
  if (!section) {
    return { ...defaultGlobalSettings };
  }

  const defaults = { ...defaultGlobalSettings };
  return {
    general:
      section === "general" ? { ...defaultGeneralSettings } : defaults.general,
    security:
      section === "security"
        ? { ...defaultSecuritySettings }
        : defaults.security,
    features:
      section === "features"
        ? { ...defaultFeatureSettings }
        : defaults.features,
    limits:
      section === "limits" ? { ...defaultLimitSettings } : defaults.limits,
    notifications:
      section === "notifications"
        ? { ...defaultNotificationSettings }
        : defaults.notifications,
    integrations:
      section === "integrations"
        ? { ...defaultIntegrationSettings }
        : defaults.integrations,
  };
}

/**
 * Reset a specific section to defaults
 */
export function resetSection(
  current: GlobalSettings,
  section: keyof GlobalSettings,
): GlobalSettings {
  const newSettings = { ...current };

  switch (section) {
    case "general":
      newSettings.general = { ...defaultGeneralSettings };
      break;
    case "security":
      newSettings.security = { ...defaultSecuritySettings };
      break;
    case "features":
      newSettings.features = { ...defaultFeatureSettings };
      break;
    case "limits":
      newSettings.limits = { ...defaultLimitSettings };
      break;
    case "notifications":
      newSettings.notifications = { ...defaultNotificationSettings };
      break;
    case "integrations":
      newSettings.integrations = { ...defaultIntegrationSettings };
      break;
  }

  return newSettings;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if time format is valid (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Get list of changed fields between two objects
 */
export function getChangedFields<T extends Record<string, unknown>>(
  current: T,
  updates: Partial<T>,
  prefix: string,
): string[] {
  const changed: string[] = [];

  for (const key of Object.keys(updates) as (keyof T)[]) {
    if (updates[key] !== undefined && current[key] !== updates[key]) {
      // Handle array comparison
      if (Array.isArray(current[key]) && Array.isArray(updates[key])) {
        const currentArr = current[key] as unknown[];
        const updatesArr = updates[key] as unknown[];
        if (JSON.stringify(currentArr) !== JSON.stringify(updatesArr)) {
          changed.push(`${prefix}.${String(key)}`);
        }
      } else {
        changed.push(`${prefix}.${String(key)}`);
      }
    }
  }

  return changed;
}

/**
 * Get settings diff between two settings objects
 */
export function getSettingsDiff(
  before: GlobalSettings,
  after: GlobalSettings,
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  const sections: (keyof GlobalSettings)[] = [
    "general",
    "security",
    "features",
    "limits",
    "notifications",
    "integrations",
  ];

  for (const section of sections) {
    const beforeSection = before[section];
    const afterSection = after[section];

    for (const key of Object.keys(
      afterSection,
    ) as (keyof typeof afterSection)[]) {
      const beforeValue = beforeSection[key];
      const afterValue = afterSection[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        diff[`${section}.${String(key)}`] = {
          old: beforeValue,
          new: afterValue,
        };
      }
    }
  }

  return diff;
}

/**
 * Format setting value for display
 */
export function formatSettingValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not set";
  }

  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "None";
    }
    return value.join(", ");
  }

  return String(value);
}

/**
 * Get setting category label
 */
export function getSettingCategoryLabel(
  category: keyof GlobalSettings,
): string {
  const labels: Record<keyof GlobalSettings, string> = {
    general: "General",
    security: "Security",
    features: "Features",
    limits: "Limits",
    notifications: "Notifications",
    integrations: "Integrations",
  };
  return labels[category];
}

/**
 * Export settings as JSON
 */
export function exportSettings(settings: GlobalSettings): string {
  return JSON.stringify(
    {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      settings,
    },
    null,
    2,
  );
}

/**
 * Import settings from JSON
 */
export function importSettings(json: string): SettingsUpdateResult {
  try {
    const data = JSON.parse(json);

    if (!data.settings) {
      return {
        success: false,
        errors: [
          { field: "root", message: "Invalid settings format", value: null },
        ],
      };
    }

    const validation = validateSettings(data.settings);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    return {
      success: true,
      settings: readSettings(data.settings),
    };
  } catch (error) {
    return {
      success: false,
      errors: [{ field: "root", message: "Invalid JSON format", value: null }],
    };
  }
}
