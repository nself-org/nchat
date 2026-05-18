/**
 * Privacy Settings
 *
 * User-configurable privacy controls and preferences.
 * Provides a comprehensive API for managing user privacy choices:
 * - Metadata retention preferences
 * - Analytics opt-in/opt-out
 * - Data collection controls
 * - Privacy mode settings
 *
 * @module lib/privacy/privacy-settings
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import type { AnonymizationStrategy } from "./ip-anonymizer";
import type { ScrubMethod, MetadataCategory } from "./metadata-minimizer";

const log = createLogger("PrivacySettings");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Privacy level presets
 */
export type PrivacyLevel =
  | "minimal"
  | "balanced"
  | "strict"
  | "maximum"
  | "custom";

/**
 * Data collection category
 */
export type DataCollectionCategory =
  | "essential"
  | "analytics"
  | "personalization"
  | "marketing"
  | "third_party";

/**
 * Analytics mode
 */
export type AnalyticsMode = "full" | "anonymous" | "aggregated" | "disabled";

/**
 * Metadata retention preference
 */
export interface MetadataRetentionPreference {
  category: MetadataCategory;
  enabled: boolean;
  retentionDays: number;
  anonymize: boolean;
}

/**
 * Data collection preference
 */
export interface DataCollectionPreference {
  category: DataCollectionCategory;
  enabled: boolean;
  anonymize: boolean;
  description: string;
}

/**
 * User privacy settings
 */
export interface UserPrivacySettings {
  id: string;
  userId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  // Privacy level
  privacyLevel: PrivacyLevel;

  // Analytics settings
  analyticsMode: AnalyticsMode;
  analyticsConsent: boolean;
  analyticsConsentDate?: Date;

  // Data collection preferences
  dataCollection: DataCollectionPreference[];

  // Metadata retention
  metadataRetention: MetadataRetentionPreference[];

  // IP and location privacy
  ipAnonymization: {
    enabled: boolean;
    strategy: AnonymizationStrategy;
  };
  locationTracking: {
    enabled: boolean;
    precision: "exact" | "city" | "country" | "disabled";
  };

  // Activity tracking
  activityTracking: {
    enabled: boolean;
    includeTimestamps: boolean;
    includeDuration: boolean;
    includeDeviceInfo: boolean;
  };

  // Communication metadata
  messageMetadata: {
    storeReadReceipts: boolean;
    storeTypingIndicators: boolean;
    storeDeliveryStatus: boolean;
    retainEditHistory: boolean;
    retainDeletedMessages: boolean;
    retentionDays: number;
  };

  // Session data
  sessionSettings: {
    storeSessionHistory: boolean;
    storeDeviceInfo: boolean;
    storeLoginLocations: boolean;
    retentionDays: number;
  };

  // Export and portability
  dataPortability: {
    allowExport: boolean;
    exportFormat: "json" | "csv" | "both";
    includeAttachments: boolean;
    includeMetadata: boolean;
  };

  // Deletion preferences
  deletionSettings: {
    autoDeleteMessages: boolean;
    autoDeleteAfterDays: number;
    deleteOnAccountClose: boolean;
    anonymizeOnDelete: boolean;
  };

  // Third-party sharing
  thirdPartySettings: {
    allowIntegrations: boolean;
    allowAnalyticsSharing: boolean;
    allowAIProcessing: boolean;
  };
}

/**
 * Privacy settings update input
 */
export interface UpdatePrivacySettingsInput {
  privacyLevel?: PrivacyLevel;
  analyticsMode?: AnalyticsMode;
  analyticsConsent?: boolean;
  dataCollection?: Partial<DataCollectionPreference>[];
  metadataRetention?: Partial<MetadataRetentionPreference>[];
  ipAnonymization?: Partial<UserPrivacySettings["ipAnonymization"]>;
  locationTracking?: Partial<UserPrivacySettings["locationTracking"]>;
  activityTracking?: Partial<UserPrivacySettings["activityTracking"]>;
  messageMetadata?: Partial<UserPrivacySettings["messageMetadata"]>;
  sessionSettings?: Partial<UserPrivacySettings["sessionSettings"]>;
  dataPortability?: Partial<UserPrivacySettings["dataPortability"]>;
  deletionSettings?: Partial<UserPrivacySettings["deletionSettings"]>;
  thirdPartySettings?: Partial<UserPrivacySettings["thirdPartySettings"]>;
}

/**
 * Privacy audit entry
 */
export interface PrivacyAuditEntry {
  id: string;
  userId: string;
  timestamp: Date;
  action: PrivacyAction;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Privacy action types
 */
export type PrivacyAction =
  | "settings_created"
  | "settings_updated"
  | "privacy_level_changed"
  | "analytics_consent_given"
  | "analytics_consent_revoked"
  | "data_export_requested"
  | "data_deletion_requested"
  | "retention_policy_changed";

/**
 * Privacy report
 */
export interface PrivacyReport {
  userId: string;
  generatedAt: Date;
  settings: UserPrivacySettings;
  dataCategories: {
    category: string;
    itemCount: number;
    lastUpdated?: Date;
    retentionStatus: "active" | "scheduled_deletion" | "deleted";
  }[];
  consentHistory: {
    category: DataCollectionCategory;
    consentedAt?: Date;
    revokedAt?: Date;
    currentStatus: boolean;
  }[];
  recentChanges: PrivacyAuditEntry[];
}

/**
 * Privacy settings service configuration
 */
export interface PrivacySettingsConfig {
  enabled: boolean;
  defaultPrivacyLevel: PrivacyLevel;
  enforceMinimumRetention: boolean;
  minimumRetentionDays: number;
  maximumRetentionDays: number;
  allowCustomSettings: boolean;
  auditEnabled: boolean;
  maxAuditEntries: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default configuration
 */
export const DEFAULT_PRIVACY_CONFIG: PrivacySettingsConfig = {
  enabled: true,
  defaultPrivacyLevel: "balanced",
  enforceMinimumRetention: true,
  minimumRetentionDays: 1,
  maximumRetentionDays: 730, // 2 years
  allowCustomSettings: true,
  auditEnabled: true,
  maxAuditEntries: 1000,
};

/**
 * Privacy level presets
 */
export const PRIVACY_LEVEL_PRESETS: Record<
  Exclude<PrivacyLevel, "custom">,
  Partial<UserPrivacySettings>
> = {
  minimal: {
    analyticsMode: "full",
    ipAnonymization: { enabled: false, strategy: "none" },
    locationTracking: { enabled: true, precision: "exact" },
    activityTracking: {
      enabled: true,
      includeTimestamps: true,
      includeDuration: true,
      includeDeviceInfo: true,
    },
    messageMetadata: {
      storeReadReceipts: true,
      storeTypingIndicators: true,
      storeDeliveryStatus: true,
      retainEditHistory: true,
      retainDeletedMessages: true,
      retentionDays: 365,
    },
    sessionSettings: {
      storeSessionHistory: true,
      storeDeviceInfo: true,
      storeLoginLocations: true,
      retentionDays: 365,
    },
    thirdPartySettings: {
      allowIntegrations: true,
      allowAnalyticsSharing: true,
      allowAIProcessing: true,
    },
  },
  balanced: {
    analyticsMode: "anonymous",
    ipAnonymization: { enabled: true, strategy: "truncate" },
    locationTracking: { enabled: true, precision: "city" },
    activityTracking: {
      enabled: true,
      includeTimestamps: true,
      includeDuration: false,
      includeDeviceInfo: false,
    },
    messageMetadata: {
      storeReadReceipts: true,
      storeTypingIndicators: false,
      storeDeliveryStatus: true,
      retainEditHistory: false,
      retainDeletedMessages: false,
      retentionDays: 90,
    },
    sessionSettings: {
      storeSessionHistory: true,
      storeDeviceInfo: false,
      storeLoginLocations: true,
      retentionDays: 90,
    },
    thirdPartySettings: {
      allowIntegrations: true,
      allowAnalyticsSharing: false,
      allowAIProcessing: true,
    },
  },
  strict: {
    analyticsMode: "aggregated",
    ipAnonymization: { enabled: true, strategy: "hash" },
    locationTracking: { enabled: false, precision: "disabled" },
    activityTracking: {
      enabled: false,
      includeTimestamps: false,
      includeDuration: false,
      includeDeviceInfo: false,
    },
    messageMetadata: {
      storeReadReceipts: false,
      storeTypingIndicators: false,
      storeDeliveryStatus: false,
      retainEditHistory: false,
      retainDeletedMessages: false,
      retentionDays: 30,
    },
    sessionSettings: {
      storeSessionHistory: false,
      storeDeviceInfo: false,
      storeLoginLocations: false,
      retentionDays: 7,
    },
    thirdPartySettings: {
      allowIntegrations: false,
      allowAnalyticsSharing: false,
      allowAIProcessing: false,
    },
  },
  maximum: {
    analyticsMode: "disabled",
    ipAnonymization: { enabled: true, strategy: "remove" },
    locationTracking: { enabled: false, precision: "disabled" },
    activityTracking: {
      enabled: false,
      includeTimestamps: false,
      includeDuration: false,
      includeDeviceInfo: false,
    },
    messageMetadata: {
      storeReadReceipts: false,
      storeTypingIndicators: false,
      storeDeliveryStatus: false,
      retainEditHistory: false,
      retainDeletedMessages: false,
      retentionDays: 1,
    },
    sessionSettings: {
      storeSessionHistory: false,
      storeDeviceInfo: false,
      storeLoginLocations: false,
      retentionDays: 1,
    },
    thirdPartySettings: {
      allowIntegrations: false,
      allowAnalyticsSharing: false,
      allowAIProcessing: false,
    },
  },
};

/**
 * Default data collection preferences
 */
export const DEFAULT_DATA_COLLECTION: DataCollectionPreference[] = [
  {
    category: "essential",
    enabled: true,
    anonymize: false,
    description:
      "Data required for core functionality (authentication, messaging)",
  },
  {
    category: "analytics",
    enabled: false,
    anonymize: true,
    description: "Usage analytics for improving the service",
  },
  {
    category: "personalization",
    enabled: false,
    anonymize: false,
    description: "Data used to personalize your experience",
  },
  {
    category: "marketing",
    enabled: false,
    anonymize: false,
    description: "Data used for marketing communications",
  },
  {
    category: "third_party",
    enabled: false,
    anonymize: false,
    description: "Data shared with third-party integrations",
  },
];

/**
 * Default metadata retention preferences
 */
export const DEFAULT_METADATA_RETENTION: MetadataRetentionPreference[] = [
  { category: "request", enabled: true, retentionDays: 7, anonymize: true },
  { category: "response", enabled: false, retentionDays: 7, anonymize: true },
  {
    category: "user_activity",
    enabled: true,
    retentionDays: 30,
    anonymize: true,
  },
  { category: "message", enabled: true, retentionDays: 365, anonymize: false },
  { category: "session", enabled: true, retentionDays: 30, anonymize: true },
  { category: "analytics", enabled: false, retentionDays: 90, anonymize: true },
  { category: "audit", enabled: true, retentionDays: 730, anonymize: false },
  { category: "system", enabled: true, retentionDays: 90, anonymize: false },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `priv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate retention days
 */
function validateRetentionDays(
  days: number,
  config: PrivacySettingsConfig,
): number {
  if (config.enforceMinimumRetention) {
    return Math.min(
      Math.max(days, config.minimumRetentionDays),
      config.maximumRetentionDays,
    );
  }
  return Math.max(days, 0);
}

/**
 * Create default settings for a user
 */
export function createDefaultSettings(
  userId: string,
  privacyLevel: PrivacyLevel = "balanced",
): UserPrivacySettings {
  const now = new Date();
  const preset =
    privacyLevel !== "custom" ? PRIVACY_LEVEL_PRESETS[privacyLevel] : {};

  return {
    id: generateId(),
    userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    privacyLevel,
    analyticsMode: preset.analyticsMode ?? "anonymous",
    analyticsConsent: false,
    dataCollection: DEFAULT_DATA_COLLECTION.map((dc) => ({ ...dc })),
    metadataRetention: DEFAULT_METADATA_RETENTION.map((mr) => ({ ...mr })),
    ipAnonymization: preset.ipAnonymization ?? {
      enabled: true,
      strategy: "truncate",
    },
    locationTracking: preset.locationTracking ?? {
      enabled: false,
      precision: "city",
    },
    activityTracking: preset.activityTracking ?? {
      enabled: true,
      includeTimestamps: true,
      includeDuration: false,
      includeDeviceInfo: false,
    },
    messageMetadata: preset.messageMetadata ?? {
      storeReadReceipts: true,
      storeTypingIndicators: false,
      storeDeliveryStatus: true,
      retainEditHistory: false,
      retainDeletedMessages: false,
      retentionDays: 90,
    },
    sessionSettings: preset.sessionSettings ?? {
      storeSessionHistory: true,
      storeDeviceInfo: false,
      storeLoginLocations: true,
      retentionDays: 90,
    },
    dataPortability: {
      allowExport: true,
      exportFormat: "json",
      includeAttachments: true,
      includeMetadata: false,
    },
    deletionSettings: {
      autoDeleteMessages: false,
      autoDeleteAfterDays: 365,
      deleteOnAccountClose: true,
      anonymizeOnDelete: true,
    },
    thirdPartySettings: preset.thirdPartySettings ?? {
      allowIntegrations: true,
      allowAnalyticsSharing: false,
      allowAIProcessing: false,
    },
  };
}

// ============================================================================
// PRIVACY SETTINGS SERVICE
// ============================================================================

/**
 * Privacy settings service for managing user privacy preferences
 */
export class PrivacySettingsService {
  private config: PrivacySettingsConfig;
  private settings = new Map<string, UserPrivacySettings>();
  private auditLog: PrivacyAuditEntry[] = [];

  constructor(config: Partial<PrivacySettingsConfig> = {}) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
    log.info("PrivacySettingsService initialized", {
      enabled: this.config.enabled,
    });
  }

  // ============================================================================
  // SETTINGS CRUD
  // ============================================================================

  /**
   * Get or create settings for a user
   */
  getOrCreateSettings(userId: string): UserPrivacySettings {
    let settings = this.settings.get(userId);

    if (!settings) {
      settings = createDefaultSettings(userId, this.config.defaultPrivacyLevel);
      this.settings.set(userId, settings);
      this.addAuditEntry(userId, "settings_created", undefined, settings);
      log.info("Privacy settings created", { userId });
    }

    return settings;
  }

  /**
   * Get settings for a user
   */
  getSettings(userId: string): UserPrivacySettings | null {
    return this.settings.get(userId) ?? null;
  }

  /**
   * Update settings for a user
   */
  updateSettings(
    userId: string,
    updates: UpdatePrivacySettingsInput,
    context?: { ipAddress?: string; userAgent?: string },
  ): UserPrivacySettings {
    const current = this.getOrCreateSettings(userId);
    const now = new Date();

    // Track specific changes for audit
    const changes: Partial<Record<string, { prev: unknown; new: unknown }>> =
      {};

    // Apply privacy level preset if changed
    if (updates.privacyLevel && updates.privacyLevel !== current.privacyLevel) {
      changes.privacyLevel = {
        prev: current.privacyLevel,
        new: updates.privacyLevel,
      };

      if (updates.privacyLevel !== "custom") {
        const preset = PRIVACY_LEVEL_PRESETS[updates.privacyLevel];
        Object.assign(current, preset);
      }
      current.privacyLevel = updates.privacyLevel;
    }

    // Apply analytics mode
    if (
      updates.analyticsMode &&
      updates.analyticsMode !== current.analyticsMode
    ) {
      changes.analyticsMode = {
        prev: current.analyticsMode,
        new: updates.analyticsMode,
      };
      current.analyticsMode = updates.analyticsMode;
    }

    // Apply analytics consent
    if (
      updates.analyticsConsent !== undefined &&
      updates.analyticsConsent !== current.analyticsConsent
    ) {
      const action = updates.analyticsConsent
        ? "analytics_consent_given"
        : "analytics_consent_revoked";
      this.addAuditEntry(
        userId,
        action,
        current.analyticsConsent,
        updates.analyticsConsent,
        context,
      );
      current.analyticsConsent = updates.analyticsConsent;
      current.analyticsConsentDate = now;
    }

    // Apply IP anonymization
    if (updates.ipAnonymization) {
      current.ipAnonymization = {
        ...current.ipAnonymization,
        ...updates.ipAnonymization,
      };
    }

    // Apply location tracking
    if (updates.locationTracking) {
      current.locationTracking = {
        ...current.locationTracking,
        ...updates.locationTracking,
      };
    }

    // Apply activity tracking
    if (updates.activityTracking) {
      current.activityTracking = {
        ...current.activityTracking,
        ...updates.activityTracking,
      };
    }

    // Apply message metadata
    if (updates.messageMetadata) {
      if (updates.messageMetadata.retentionDays !== undefined) {
        updates.messageMetadata.retentionDays = validateRetentionDays(
          updates.messageMetadata.retentionDays,
          this.config,
        );
      }
      current.messageMetadata = {
        ...current.messageMetadata,
        ...updates.messageMetadata,
      };
    }

    // Apply session settings
    if (updates.sessionSettings) {
      if (updates.sessionSettings.retentionDays !== undefined) {
        updates.sessionSettings.retentionDays = validateRetentionDays(
          updates.sessionSettings.retentionDays,
          this.config,
        );
      }
      current.sessionSettings = {
        ...current.sessionSettings,
        ...updates.sessionSettings,
      };
    }

    // Apply data portability
    if (updates.dataPortability) {
      current.dataPortability = {
        ...current.dataPortability,
        ...updates.dataPortability,
      };
    }

    // Apply deletion settings
    if (updates.deletionSettings) {
      if (updates.deletionSettings.autoDeleteAfterDays !== undefined) {
        updates.deletionSettings.autoDeleteAfterDays = validateRetentionDays(
          updates.deletionSettings.autoDeleteAfterDays,
          this.config,
        );
      }
      current.deletionSettings = {
        ...current.deletionSettings,
        ...updates.deletionSettings,
      };
    }

    // Apply third-party settings
    if (updates.thirdPartySettings) {
      current.thirdPartySettings = {
        ...current.thirdPartySettings,
        ...updates.thirdPartySettings,
      };
    }

    // Apply data collection preferences
    if (updates.dataCollection) {
      for (const update of updates.dataCollection) {
        if (update.category) {
          const existing = current.dataCollection.find(
            (dc) => dc.category === update.category,
          );
          if (existing) {
            Object.assign(existing, update);
          }
        }
      }
    }

    // Apply metadata retention preferences
    if (updates.metadataRetention) {
      for (const update of updates.metadataRetention) {
        if (update.category) {
          const existing = current.metadataRetention.find(
            (mr) => mr.category === update.category,
          );
          if (existing) {
            if (update.retentionDays !== undefined) {
              update.retentionDays = validateRetentionDays(
                update.retentionDays,
                this.config,
              );
            }
            Object.assign(existing, update);
          }
        }
      }
    }

    // Update version and timestamp
    current.version++;
    current.updatedAt = now;

    // Audit the update
    if (Object.keys(changes).length > 0) {
      this.addAuditEntry(
        userId,
        "settings_updated",
        changes,
        undefined,
        context,
      );
    }

    log.info("Privacy settings updated", {
      userId,
      changes: Object.keys(changes),
    });

    return current;
  }

  /**
   * Delete settings for a user
   */
  deleteSettings(userId: string): boolean {
    const deleted = this.settings.delete(userId);
    if (deleted) {
      log.info("Privacy settings deleted", { userId });
    }
    return deleted;
  }

  /**
   * Set privacy level (applies preset)
   */
  setPrivacyLevel(
    userId: string,
    level: PrivacyLevel,
    context?: { ipAddress?: string; userAgent?: string },
  ): UserPrivacySettings {
    return this.updateSettings(userId, { privacyLevel: level }, context);
  }

  // ============================================================================
  // ANALYTICS CONSENT
  // ============================================================================

  /**
   * Check if analytics consent is given
   */
  hasAnalyticsConsent(userId: string): boolean {
    const settings = this.getSettings(userId);
    return settings?.analyticsConsent ?? false;
  }

  /**
   * Grant analytics consent
   */
  grantAnalyticsConsent(
    userId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): UserPrivacySettings {
    return this.updateSettings(userId, { analyticsConsent: true }, context);
  }

  /**
   * Revoke analytics consent
   */
  revokeAnalyticsConsent(
    userId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): UserPrivacySettings {
    return this.updateSettings(
      userId,
      { analyticsConsent: false, analyticsMode: "disabled" },
      context,
    );
  }

  // ============================================================================
  // DATA COLLECTION
  // ============================================================================

  /**
   * Check if a data collection category is enabled
   */
  isDataCollectionEnabled(
    userId: string,
    category: DataCollectionCategory,
  ): boolean {
    const settings = this.getSettings(userId);
    if (!settings) return category === "essential"; // Essential is always required

    const preference = settings.dataCollection.find(
      (dc) => dc.category === category,
    );
    return preference?.enabled ?? false;
  }

  /**
   * Get effective metadata scrub method based on settings
   */
  getEffectiveScrubMethod(
    userId: string,
    category: MetadataCategory,
  ): ScrubMethod {
    const settings = this.getSettings(userId);
    if (!settings) return "remove"; // Default to removing if no settings

    const retention = settings.metadataRetention.find(
      (mr) => mr.category === category,
    );
    if (!retention || !retention.enabled) return "remove";
    if (retention.anonymize) return "hash";
    return "retain";
  }

  /**
   * Get effective IP anonymization strategy
   */
  getEffectiveIPStrategy(userId: string): AnonymizationStrategy {
    const settings = this.getSettings(userId);
    if (!settings || !settings.ipAnonymization.enabled) return "none";
    return settings.ipAnonymization.strategy;
  }

  // ============================================================================
  // PRIVACY REPORT
  // ============================================================================

  /**
   * Generate a privacy report for a user
   */
  generatePrivacyReport(userId: string): PrivacyReport {
    const settings = this.getOrCreateSettings(userId);
    const auditEntries = this.getAuditLog({ userId, limit: 50 });

    return {
      userId,
      generatedAt: new Date(),
      settings,
      dataCategories: settings.dataCollection.map((dc) => ({
        category: dc.category,
        itemCount: 0, // Would be populated from database
        retentionStatus: dc.enabled ? "active" : "scheduled_deletion",
      })),
      consentHistory: settings.dataCollection.map((dc) => ({
        category: dc.category,
        currentStatus: dc.enabled,
      })),
      recentChanges: auditEntries,
    };
  }

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  /**
   * Add audit entry
   */
  private addAuditEntry(
    userId: string,
    action: PrivacyAction,
    previousValue?: unknown,
    newValue?: unknown,
    context?: { ipAddress?: string; userAgent?: string },
  ): void {
    if (!this.config.auditEnabled) return;

    const entry: PrivacyAuditEntry = {
      id: generateId(),
      userId,
      timestamp: new Date(),
      action,
      previousValue,
      newValue,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    this.auditLog.push(entry);

    // Trim audit log if too large
    if (this.auditLog.length > this.config.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.config.maxAuditEntries);
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(options?: {
    userId?: string;
    action?: PrivacyAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): PrivacyAuditEntry[] {
    let entries = [...this.auditLog];

    if (options?.userId) {
      entries = entries.filter((e) => e.userId === options.userId);
    }

    if (options?.action) {
      entries = entries.filter((e) => e.action === options.action);
    }

    if (options?.startDate) {
      entries = entries.filter((e) => e.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      entries = entries.filter((e) => e.timestamp <= options.endDate!);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return entries.slice(offset, offset + limit);
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Apply a privacy level to all users
   */
  applyGlobalPrivacyLevel(level: PrivacyLevel): number {
    let count = 0;
    for (const [userId] of this.settings) {
      this.setPrivacyLevel(userId, level);
      count++;
    }
    log.info("Applied global privacy level", { level, usersAffected: count });
    return count;
  }

  /**
   * Get all users with a specific setting
   */
  getUsersWithSetting(
    predicate: (settings: UserPrivacySettings) => boolean,
  ): UserPrivacySettings[] {
    return Array.from(this.settings.values()).filter(predicate);
  }

  /**
   * Count users by privacy level
   */
  countByPrivacyLevel(): Record<PrivacyLevel, number> {
    const counts: Record<PrivacyLevel, number> = {
      minimal: 0,
      balanced: 0,
      strict: 0,
      maximum: 0,
      custom: 0,
    };

    for (const settings of this.settings.values()) {
      counts[settings.privacyLevel]++;
    }

    return counts;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get configuration
   */
  getConfig(): PrivacySettingsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PrivacySettingsConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info("PrivacySettingsService configuration updated");
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get total settings count
   */
  get settingsCount(): number {
    return this.settings.size;
  }

  /**
   * Export all settings (for backup)
   */
  exportSettings(): UserPrivacySettings[] {
    return Array.from(this.settings.values());
  }

  /**
   * Import settings (for restore)
   */
  importSettings(settings: UserPrivacySettings[]): {
    imported: number;
    failed: number;
  } {
    let imported = 0;
    let failed = 0;

    for (const s of settings) {
      try {
        this.settings.set(s.userId, s);
        imported++;
      } catch {
        failed++;
      }
    }

    log.info("Settings imported", { imported, failed });
    return { imported, failed };
  }

  /**
   * Clear all settings (for testing)
   */
  clearAll(): void {
    this.settings.clear();
    this.auditLog = [];
    log.info("All privacy settings cleared");
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: PrivacySettingsService | null = null;

/**
 * Get or create the privacy settings service singleton
 */
export function getPrivacySettingsService(
  config?: Partial<PrivacySettingsConfig>,
): PrivacySettingsService {
  if (!serviceInstance) {
    serviceInstance = new PrivacySettingsService(config);
  } else if (config) {
    serviceInstance.updateConfig(config);
  }
  return serviceInstance;
}

/**
 * Create a new privacy settings service instance
 */
export function createPrivacySettingsService(
  config?: Partial<PrivacySettingsConfig>,
): PrivacySettingsService {
  return new PrivacySettingsService(config);
}

/**
 * Reset the singleton (for testing)
 */
export function resetPrivacySettingsService(): void {
  serviceInstance = null;
}

export default PrivacySettingsService;
