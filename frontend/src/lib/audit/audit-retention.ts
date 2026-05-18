/**
 * Audit Retention - Retention policy management for audit logs
 *
 * This module provides retention policy functionality,
 * including policy management, archival, and cleanup.
 */

import type {
  AuditCategory,
  AuditLogEntry,
  AuditRetentionPolicy,
  AuditSettings,
  AuditSeverity,
} from "./audit-types";

// ============================================================================
// Default Settings
// ============================================================================

export const defaultAuditSettings: AuditSettings = {
  enabled: true,
  defaultRetentionDays: 90,
  maxRetentionDays: 365,
  minRetentionDays: 7,
  archiveEnabled: false,
  realTimeEnabled: true,
  sensitiveFieldMasking: true,
  ipLoggingEnabled: true,
  geoLocationEnabled: false,
  policies: [],
};

// ============================================================================
// Retention Policy Functions
// ============================================================================

/**
 * Create a new retention policy
 */
export function createRetentionPolicy(
  name: string,
  retentionDays: number,
  options: Partial<AuditRetentionPolicy> = {},
): AuditRetentionPolicy {
  return {
    id: generatePolicyId(),
    name,
    enabled: true,
    retentionDays,
    archiveEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options,
  };
}

/**
 * Update a retention policy
 */
export function updateRetentionPolicy(
  policy: AuditRetentionPolicy,
  updates: Partial<AuditRetentionPolicy>,
): AuditRetentionPolicy {
  return {
    ...policy,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Validate retention days against settings
 */
export function validateRetentionDays(
  days: number,
  settings: AuditSettings,
): { valid: boolean; message?: string } {
  if (days < settings.minRetentionDays) {
    return {
      valid: false,
      message: `Retention period must be at least ${settings.minRetentionDays} days`,
    };
  }

  if (days > settings.maxRetentionDays) {
    return {
      valid: false,
      message: `Retention period cannot exceed ${settings.maxRetentionDays} days`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Entry Filtering Based on Retention
// ============================================================================

/**
 * Get the applicable retention policy for an entry
 */
export function getApplicablePolicy(
  entry: AuditLogEntry,
  policies: AuditRetentionPolicy[],
  defaultRetentionDays: number,
): { policy: AuditRetentionPolicy | null; retentionDays: number } {
  // Find a policy that matches the entry
  const matchingPolicy = policies.find((policy) => {
    if (!policy.enabled) return false;

    // Check category match
    if (policy.categories && !policy.categories.includes(entry.category)) {
      return false;
    }

    // Check severity match
    if (policy.severities && !policy.severities.includes(entry.severity)) {
      return false;
    }

    return true;
  });

  if (matchingPolicy) {
    return {
      policy: matchingPolicy,
      retentionDays: matchingPolicy.retentionDays,
    };
  }

  return { policy: null, retentionDays: defaultRetentionDays };
}

/**
 * Check if an entry should be retained
 */
export function shouldRetainEntry(
  entry: AuditLogEntry,
  settings: AuditSettings,
  currentDate: Date = new Date(),
): boolean {
  const { retentionDays } = getApplicablePolicy(
    entry,
    settings.policies,
    settings.defaultRetentionDays,
  );
  const entryDate = new Date(entry.timestamp);
  const ageInDays =
    (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);

  return ageInDays <= retentionDays;
}

/**
 * Get entries that should be retained
 */
export function getRetainedEntries(
  entries: AuditLogEntry[],
  settings: AuditSettings,
  currentDate: Date = new Date(),
): AuditLogEntry[] {
  return entries.filter((entry) =>
    shouldRetainEntry(entry, settings, currentDate),
  );
}

/**
 * Get entries that are expired (should be deleted or archived)
 */
export function getExpiredEntries(
  entries: AuditLogEntry[],
  settings: AuditSettings,
  currentDate: Date = new Date(),
): AuditLogEntry[] {
  return entries.filter(
    (entry) => !shouldRetainEntry(entry, settings, currentDate),
  );
}

// ============================================================================
// Archive Functions
// ============================================================================

export interface ArchiveResult {
  archivedCount: number;
  deletedCount: number;
  errors: { entryId: string; error: string }[];
  archiveLocation?: string;
}

/**
 * Archive expired entries
 */
export async function archiveExpiredEntries(
  entries: AuditLogEntry[],
  settings: AuditSettings,
  archiveHandler?: (entries: AuditLogEntry[]) => Promise<string>,
): Promise<ArchiveResult> {
  const expiredEntries = getExpiredEntries(entries, settings);
  const result: ArchiveResult = {
    archivedCount: 0,
    deletedCount: 0,
    errors: [],
  };

  if (expiredEntries.length === 0) {
    return result;
  }

  if (settings.archiveEnabled && archiveHandler) {
    try {
      result.archiveLocation = await archiveHandler(expiredEntries);
      result.archivedCount = expiredEntries.length;
    } catch (error) {
      result.errors.push({
        entryId: "bulk",
        error: `Archive failed: ${(error as Error).message}`,
      });
    }
  } else {
    result.deletedCount = expiredEntries.length;
  }

  return result;
}

// ============================================================================
// Retention Statistics
// ============================================================================

export interface RetentionStatistics {
  totalEntries: number;
  retainedEntries: number;
  expiredEntries: number;
  entriesByPolicy: Map<string, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
  avgAgeInDays: number;
}

/**
 * Calculate retention statistics
 */
export function calculateRetentionStatistics(
  entries: AuditLogEntry[],
  settings: AuditSettings,
): RetentionStatistics {
  const retained = getRetainedEntries(entries, settings);
  const expired = getExpiredEntries(entries, settings);

  const entriesByPolicy = new Map<string, number>();
  entries.forEach((entry) => {
    const { policy } = getApplicablePolicy(
      entry,
      settings.policies,
      settings.defaultRetentionDays,
    );
    const policyName = policy?.name ?? "Default";
    entriesByPolicy.set(policyName, (entriesByPolicy.get(policyName) ?? 0) + 1);
  });

  let oldestEntry: Date | undefined;
  let newestEntry: Date | undefined;
  let totalAge = 0;
  const now = new Date();

  entries.forEach((entry) => {
    const entryDate = new Date(entry.timestamp);
    if (!oldestEntry || entryDate < oldestEntry) {
      oldestEntry = entryDate;
    }
    if (!newestEntry || entryDate > newestEntry) {
      newestEntry = entryDate;
    }
    totalAge += (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
  });

  return {
    totalEntries: entries.length,
    retainedEntries: retained.length,
    expiredEntries: expired.length,
    entriesByPolicy,
    oldestEntry,
    newestEntry,
    avgAgeInDays: entries.length > 0 ? totalAge / entries.length : 0,
  };
}

// ============================================================================
// Preset Policies
// ============================================================================

export const presetPolicies: Record<string, Partial<AuditRetentionPolicy>> = {
  security: {
    name: "Security Events",
    retentionDays: 365,
    categories: ["security"] as AuditCategory[],
    archiveEnabled: true,
  },
  admin: {
    name: "Admin Actions",
    retentionDays: 180,
    categories: ["admin"] as AuditCategory[],
    archiveEnabled: true,
  },
  critical: {
    name: "Critical Events",
    retentionDays: 365,
    severities: ["critical", "error"] as AuditSeverity[],
    archiveEnabled: true,
  },
  messages: {
    name: "Message Events",
    retentionDays: 30,
    categories: ["message"] as AuditCategory[],
    archiveEnabled: false,
  },
  files: {
    name: "File Events",
    retentionDays: 90,
    categories: ["file"] as AuditCategory[],
    archiveEnabled: false,
  },
  compliance: {
    name: "Compliance (All Events)",
    retentionDays: 365,
    archiveEnabled: true,
  },
};

/**
 * Get a preset policy by name
 */
export function getPresetPolicy(
  presetName: string,
): AuditRetentionPolicy | null {
  const preset = presetPolicies[presetName];
  if (!preset || !preset.name || !preset.retentionDays) {
    return null;
  }
  return createRetentionPolicy(preset.name, preset.retentionDays, preset);
}

// ============================================================================
// Helper Functions
// ============================================================================

function generatePolicyId(): string {
  return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format retention days for display
 */
export function formatRetentionPeriod(days: number): string {
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"}`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  } else {
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? "" : "s"}`;
  }
}

/**
 * Get suggested retention period based on compliance requirements
 */
export function getSuggestedRetentionForCompliance(
  complianceType: "gdpr" | "hipaa" | "sox" | "pci" | "default",
): number {
  switch (complianceType) {
    case "gdpr":
      return 365; // 1 year
    case "hipaa":
      return 2190; // 6 years
    case "sox":
      return 2555; // 7 years
    case "pci":
      return 365; // 1 year
    default:
      return 90; // 90 days
  }
}
