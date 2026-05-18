/**
 * Retention Policy Engine
 *
 * Handles data retention policy management, scheduling, and execution.
 */

import type {
  RetentionPolicy,
  RetentionPeriod,
  DataCategory,
  MessageType,
  ChannelRetentionOverride,
  AutoDeleteConfig,
  RetentionJobStatus,
  retentionPeriodToDays,
} from "./compliance-types";

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_RETENTION_PERIODS: {
  period: RetentionPeriod;
  label: string;
  days: number | null;
}[] = [
  { period: "forever", label: "Keep Forever", days: null },
  { period: "30_days", label: "30 Days", days: 30 },
  { period: "90_days", label: "90 Days", days: 90 },
  { period: "180_days", label: "6 Months", days: 180 },
  { period: "1_year", label: "1 Year", days: 365 },
  { period: "2_years", label: "2 Years", days: 730 },
  { period: "3_years", label: "3 Years", days: 1095 },
  { period: "5_years", label: "5 Years", days: 1825 },
  { period: "7_years", label: "7 Years", days: 2555 },
  { period: "custom", label: "Custom", days: null },
];

export const DATA_CATEGORIES: {
  category: DataCategory;
  label: string;
  description: string;
}[] = [
  {
    category: "messages",
    label: "Messages",
    description: "Chat messages and text content",
  },
  {
    category: "files",
    label: "Files",
    description: "Uploaded files and attachments",
  },
  {
    category: "reactions",
    label: "Reactions",
    description: "Message reactions and emojis",
  },
  {
    category: "threads",
    label: "Threads",
    description: "Thread conversations",
  },
  {
    category: "user_profiles",
    label: "User Profiles",
    description: "User profile data",
  },
  {
    category: "activity_logs",
    label: "Activity Logs",
    description: "User activity history",
  },
  {
    category: "audit_logs",
    label: "Audit Logs",
    description: "System audit records",
  },
  {
    category: "analytics",
    label: "Analytics",
    description: "Usage analytics data",
  },
  {
    category: "system_logs",
    label: "System Logs",
    description: "Application logs",
  },
  { category: "backups", label: "Backups", description: "Data backups" },
];

export const MESSAGE_TYPES: {
  type: MessageType;
  label: string;
}[] = [
  { type: "text", label: "Text Messages" },
  { type: "file", label: "File Attachments" },
  { type: "image", label: "Images" },
  { type: "video", label: "Videos" },
  { type: "voice", label: "Voice Messages" },
  { type: "system", label: "System Messages" },
  { type: "notification", label: "Notifications" },
  { type: "poll", label: "Polls" },
  { type: "pinned", label: "Pinned Messages" },
];

// ============================================================================
// POLICY VALIDATION
// ============================================================================

export interface PolicyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a retention policy configuration
 */
export function validateRetentionPolicy(
  policy: Partial<RetentionPolicy>,
): PolicyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!policy.name?.trim()) {
    errors.push("Policy name is required");
  }

  if (!policy.dataCategory) {
    errors.push("Data category is required");
  }

  if (!policy.period) {
    errors.push("Retention period is required");
  }

  // Custom period validation
  if (policy.period === "custom") {
    if (!policy.customDays || policy.customDays < 1) {
      errors.push("Custom retention period must be at least 1 day");
    }
    if (policy.customDays && policy.customDays > 36500) {
      errors.push("Custom retention period cannot exceed 100 years");
    }
  }

  // Warnings for potential issues
  if (policy.period === "forever" && policy.dataCategory === "activity_logs") {
    warnings.push("Keeping activity logs forever may impact storage costs");
  }

  if (policy.period === "30_days" && policy.dataCategory === "audit_logs") {
    warnings.push(
      "30-day retention for audit logs may not meet compliance requirements",
    );
  }

  if (
    policy.excludePinnedMessages === false &&
    policy.excludeStarredMessages === false
  ) {
    warnings.push("Important messages (pinned/starred) will also be deleted");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// POLICY CALCULATIONS
// ============================================================================

/**
 * Calculate the deletion date for a data item
 */
export function calculateDeletionDate(
  createdAt: Date,
  policy: RetentionPolicy,
): Date | null {
  if (policy.period === "forever") {
    return null;
  }

  const days =
    policy.period === "custom"
      ? policy.customDays
      : getDaysFromPeriod(policy.period);

  if (!days) {
    return null;
  }

  const deletionDate = new Date(createdAt);
  deletionDate.setDate(deletionDate.getDate() + days);
  return deletionDate;
}

/**
 * Get number of days from retention period
 */
export function getDaysFromPeriod(period: RetentionPeriod): number | null {
  const periodMap: Record<RetentionPeriod, number | null> = {
    forever: null,
    "30_days": 30,
    "90_days": 90,
    "180_days": 180,
    "1_year": 365,
    "2_years": 730,
    "3_years": 1095,
    "5_years": 1825,
    "7_years": 2555,
    custom: null,
  };
  return periodMap[period];
}

/**
 * Check if a data item should be retained (not deleted)
 */
export function shouldRetainItem(
  item: {
    createdAt: Date;
    type?: MessageType;
    isPinned?: boolean;
    isStarred?: boolean;
    channelId?: string;
  },
  policy: RetentionPolicy,
  now: Date = new Date(),
): boolean {
  // Check if message type is excluded
  if (item.type && policy.excludeMessageTypes?.includes(item.type)) {
    return true;
  }

  // Check if pinned and pinned messages are excluded
  if (item.isPinned && policy.excludePinnedMessages) {
    return true;
  }

  // Check if starred and starred messages are excluded
  if (item.isStarred && policy.excludeStarredMessages) {
    return true;
  }

  // Check channel-specific override
  if (item.channelId && policy.channelOverrides) {
    const override = policy.channelOverrides.find(
      (o) => o.channelId === item.channelId,
    );
    if (override) {
      const overrideDays =
        override.period === "custom"
          ? (override.customDays ?? null)
          : getDaysFromPeriod(override.period);

      if (overrideDays === null || overrideDays === undefined) {
        return true; // Keep forever
      }

      const overrideDeletionDate = new Date(item.createdAt);
      overrideDeletionDate.setDate(
        overrideDeletionDate.getDate() + overrideDays,
      );
      return now < overrideDeletionDate;
    }
  }

  // Calculate based on main policy
  const deletionDate = calculateDeletionDate(item.createdAt, policy);
  if (!deletionDate) {
    return true; // Keep forever
  }

  return now < deletionDate;
}

// ============================================================================
// POLICY BUILDER HELPERS
// ============================================================================

/**
 * Create a default retention policy
 */
export function createDefaultPolicy(
  category: DataCategory,
  overrides?: Partial<RetentionPolicy>,
): RetentionPolicy {
  const defaultPeriods: Record<DataCategory, RetentionPeriod> = {
    messages: "1_year",
    files: "1_year",
    reactions: "1_year",
    threads: "1_year",
    user_profiles: "forever",
    activity_logs: "90_days",
    audit_logs: "7_years",
    analytics: "2_years",
    system_logs: "30_days",
    backups: "90_days",
  };

  return {
    id: crypto.randomUUID(),
    name: `Default ${category} Policy`,
    description: `Default retention policy for ${category}`,
    enabled: true,
    isDefault: true,
    period: defaultPeriods[category] || "1_year",
    dataCategory: category,
    excludePinnedMessages: true,
    excludeStarredMessages: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a channel override
 */
export function createChannelOverride(
  channelId: string,
  channelName: string,
  period: RetentionPeriod,
  customDays?: number,
  reason?: string,
  createdBy?: string,
): ChannelRetentionOverride {
  return {
    channelId,
    channelName,
    period,
    customDays,
    reason,
    createdAt: new Date(),
    createdBy,
  };
}

// ============================================================================
// AUTO-DELETE CONFIGURATION
// ============================================================================

/**
 * Create default auto-delete configuration
 */
export function createDefaultAutoDeleteConfig(): AutoDeleteConfig {
  return {
    enabled: false,
    scheduleTime: "02:00", // 2 AM
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dryRunMode: true,
    notifyAdmins: true,
    notifyUsers: false,
    excludeWeekends: true,
    excludeHolidays: false,
    batchSize: 1000,
    maxDeletionsPerRun: 100000,
  };
}

/**
 * Calculate next run time for auto-delete
 */
export function calculateNextRunTime(config: AutoDeleteConfig): Date {
  const now = new Date();
  const [hours, minutes] = config.scheduleTime.split(":").map(Number);

  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  // Skip weekends if configured
  if (config.excludeWeekends) {
    const day = nextRun.getDay();
    if (day === 0) nextRun.setDate(nextRun.getDate() + 1); // Sunday -> Monday
    if (day === 6) nextRun.setDate(nextRun.getDate() + 2); // Saturday -> Monday
  }

  return nextRun;
}

// ============================================================================
// RETENTION JOB MANAGEMENT
// ============================================================================

/**
 * Create a new retention job status
 */
export function createRetentionJob(
  dryRun: boolean = false,
): RetentionJobStatus {
  return {
    id: crypto.randomUUID(),
    status: "pending",
    itemsProcessed: 0,
    itemsDeleted: 0,
    itemsFailed: 0,
    dryRun,
  };
}

/**
 * Format job status for display
 */
export function formatJobStatus(status: RetentionJobStatus["status"]): {
  label: string;
  color: string;
} {
  const statusMap: Record<
    RetentionJobStatus["status"],
    { label: string; color: string }
  > = {
    pending: { label: "Pending", color: "gray" },
    running: { label: "Running", color: "blue" },
    completed: { label: "Completed", color: "green" },
    failed: { label: "Failed", color: "red" },
    cancelled: { label: "Cancelled", color: "yellow" },
  };
  return statusMap[status];
}

// ============================================================================
// POLICY SUMMARY & STATISTICS
// ============================================================================

export interface PolicySummary {
  totalPolicies: number;
  enabledPolicies: number;
  categoriesWithPolicies: DataCategory[];
  shortestRetention: { category: DataCategory; days: number } | null;
  longestRetention: { category: DataCategory; days: number } | null;
  channelOverridesCount: number;
}

/**
 * Generate summary of all retention policies
 */
export function generatePolicySummary(
  policies: RetentionPolicy[],
): PolicySummary {
  const enabledPolicies = policies.filter((p) => p.enabled);
  const categoriesWithPolicies = [
    ...new Set(policies.map((p) => p.dataCategory)),
  ];

  let shortest: { category: DataCategory; days: number } | null = null;
  let longest: { category: DataCategory; days: number } | null = null;

  for (const policy of enabledPolicies) {
    const days =
      policy.period === "custom"
        ? (policy.customDays ?? null)
        : getDaysFromPeriod(policy.period);

    if (days !== null && days !== undefined) {
      if (!shortest || days < shortest.days) {
        shortest = { category: policy.dataCategory, days };
      }
      if (!longest || days > longest.days) {
        longest = { category: policy.dataCategory, days };
      }
    }
  }

  const channelOverridesCount = policies.reduce(
    (sum, p) => sum + (p.channelOverrides?.length || 0),
    0,
  );

  return {
    totalPolicies: policies.length,
    enabledPolicies: enabledPolicies.length,
    categoriesWithPolicies,
    shortestRetention: shortest,
    longestRetention: longest,
    channelOverridesCount,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const RetentionPolicyEngine = {
  DEFAULT_RETENTION_PERIODS,
  DATA_CATEGORIES,
  MESSAGE_TYPES,
  validateRetentionPolicy,
  calculateDeletionDate,
  getDaysFromPeriod,
  shouldRetainItem,
  createDefaultPolicy,
  createChannelOverride,
  createDefaultAutoDeleteConfig,
  calculateNextRunTime,
  createRetentionJob,
  formatJobStatus,
  generatePolicySummary,
};
