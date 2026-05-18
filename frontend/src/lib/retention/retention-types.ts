/**
 * Retention Policy Types
 *
 * Type definitions for the data retention policy engine.
 * Supports workspace, channel, user, and legal hold scopes with
 * policy inheritance and override rules.
 *
 * @module lib/retention/retention-types
 * @version 1.0.0
 */

// ============================================================================
// SCOPE TYPES
// ============================================================================

/**
 * Scope levels for retention policies (from most general to most specific)
 */
export type RetentionScope = "global" | "workspace" | "channel" | "user";

/**
 * Priority order for scope resolution (higher number = higher priority)
 */
export const SCOPE_PRIORITY: Record<RetentionScope, number> = {
  global: 0,
  workspace: 1,
  channel: 2,
  user: 3,
};

/**
 * Content types that can have retention policies
 */
export type RetentionContentType =
  | "messages"
  | "attachments"
  | "threads"
  | "reactions"
  | "read_receipts"
  | "drafts"
  | "audit_logs";

/**
 * All content types for iteration
 */
export const ALL_CONTENT_TYPES: RetentionContentType[] = [
  "messages",
  "attachments",
  "threads",
  "reactions",
  "read_receipts",
  "drafts",
  "audit_logs",
];

// ============================================================================
// RETENTION ACTION TYPES
// ============================================================================

/**
 * Action to take when retention period expires
 */
export type RetentionAction = "delete" | "archive" | "archive_then_delete";

/**
 * Status of a retention policy
 */
export type RetentionPolicyStatus =
  | "active"
  | "inactive"
  | "pending"
  | "suspended";

/**
 * Status of a retention job execution
 */
export type RetentionJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

// ============================================================================
// RETENTION PERIOD TYPES
// ============================================================================

/**
 * Time unit for retention periods
 */
export type RetentionTimeUnit = "hours" | "days" | "weeks" | "months" | "years";

/**
 * Retention period configuration
 */
export interface RetentionPeriod {
  /** Number of time units */
  value: number;
  /** Unit of time */
  unit: RetentionTimeUnit;
}

/**
 * Grace period before final deletion
 */
export interface GracePeriod {
  /** Whether grace period is enabled */
  enabled: boolean;
  /** Grace period duration */
  duration: RetentionPeriod;
  /** Whether content is recoverable during grace period */
  recoverable: boolean;
}

/**
 * Convert retention period to milliseconds
 */
export function periodToMilliseconds(period: RetentionPeriod): number {
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;
  const WEEK_MS = 7 * DAY_MS;
  const MONTH_MS = 30 * DAY_MS; // Approximation
  const YEAR_MS = 365 * DAY_MS; // Approximation

  switch (period.unit) {
    case "hours":
      return period.value * HOUR_MS;
    case "days":
      return period.value * DAY_MS;
    case "weeks":
      return period.value * WEEK_MS;
    case "months":
      return period.value * MONTH_MS;
    case "years":
      return period.value * YEAR_MS;
    default:
      return period.value * DAY_MS;
  }
}

/**
 * Calculate expiration date from a retention period
 */
export function calculateExpirationDate(
  fromDate: Date,
  period: RetentionPeriod,
): Date {
  return new Date(fromDate.getTime() + periodToMilliseconds(period));
}

/**
 * Check if a date has passed the retention period
 */
export function isExpired(date: Date, period: RetentionPeriod): boolean {
  const expirationDate = calculateExpirationDate(date, period);
  return new Date() > expirationDate;
}

// ============================================================================
// LEGAL HOLD TYPES
// ============================================================================

/**
 * Legal hold status
 */
export type LegalHoldStatus = "active" | "released" | "expired";

/**
 * Legal hold scope - what content is covered
 */
export interface LegalHoldScope {
  /** Specific user IDs (empty = all users) */
  userIds: string[];
  /** Specific channel IDs (empty = all channels) */
  channelIds: string[];
  /** Specific workspace IDs (empty = all workspaces) */
  workspaceIds: string[];
  /** Content types covered */
  contentTypes: RetentionContentType[];
  /** Date range start */
  startDate?: Date;
  /** Date range end */
  endDate?: Date;
}

/**
 * Legal hold record
 */
export interface LegalHold {
  /** Unique identifier */
  id: string;
  /** Name/title of the legal hold */
  name: string;
  /** Description of the legal hold */
  description: string;
  /** Matter/case reference number */
  matterReference: string;
  /** Legal hold scope */
  scope: LegalHoldScope;
  /** Current status */
  status: LegalHoldStatus;
  /** User who created the hold */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** When the hold was released (if applicable) */
  releasedAt?: Date;
  /** User who released the hold */
  releasedBy?: string;
  /** Expiration date (if set) */
  expiresAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a legal hold
 */
export interface CreateLegalHoldInput {
  name: string;
  description: string;
  matterReference: string;
  scope: LegalHoldScope;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a legal hold
 */
export interface UpdateLegalHoldInput {
  name?: string;
  description?: string;
  matterReference?: string;
  scope?: Partial<LegalHoldScope>;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RETENTION POLICY TYPES
// ============================================================================

/**
 * Retention rule for a specific content type
 */
export interface RetentionRule {
  /** Content type this rule applies to */
  contentType: RetentionContentType;
  /** Whether this rule is enabled */
  enabled: boolean;
  /** Retention period */
  period: RetentionPeriod;
  /** Action to take when period expires */
  action: RetentionAction;
  /** Grace period configuration */
  gracePeriod?: GracePeriod;
  /** Archive destination (if action includes archival) */
  archiveDestination?: string;
}

/**
 * Full retention policy definition
 */
export interface RetentionPolicy {
  /** Unique identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Policy scope */
  scope: RetentionScope;
  /** Target ID based on scope (workspace_id, channel_id, user_id, or null for global) */
  targetId: string | null;
  /** Policy status */
  status: RetentionPolicyStatus;
  /** Retention rules by content type */
  rules: RetentionRule[];
  /** Whether this policy can be overridden by more specific policies */
  allowOverride: boolean;
  /** Whether child scopes inherit this policy */
  inheritable: boolean;
  /** Priority within the same scope level */
  priority: number;
  /** User who created the policy */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last execution timestamp */
  lastExecutedAt?: Date;
  /** Next scheduled execution */
  nextExecutionAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a retention policy
 */
export interface CreateRetentionPolicyInput {
  name: string;
  description?: string;
  scope: RetentionScope;
  targetId?: string;
  rules: RetentionRule[];
  allowOverride?: boolean;
  inheritable?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a retention policy
 */
export interface UpdateRetentionPolicyInput {
  name?: string;
  description?: string;
  status?: RetentionPolicyStatus;
  rules?: RetentionRule[];
  allowOverride?: boolean;
  inheritable?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// POLICY RESOLUTION TYPES
// ============================================================================

/**
 * Result of resolving applicable policies for a target
 */
export interface ResolvedRetentionPolicy {
  /** The effective rules after inheritance/override resolution */
  effectiveRules: Map<RetentionContentType, RetentionRule>;
  /** Source policy IDs that contributed to the resolution */
  sourcePolicies: string[];
  /** Any active legal holds that prevent deletion */
  activeLegalHolds: string[];
  /** Whether deletion is blocked by legal holds */
  deletionBlocked: boolean;
  /** The most specific scope level */
  effectiveScope: RetentionScope;
}

/**
 * Context for resolving retention policies
 */
export interface RetentionResolutionContext {
  /** Target user ID (for user-specific policies) */
  userId?: string;
  /** Target channel ID */
  channelId?: string;
  /** Target workspace ID */
  workspaceId?: string;
  /** Content type to resolve for */
  contentType?: RetentionContentType;
}

// ============================================================================
// RETENTION JOB TYPES
// ============================================================================

/**
 * Content item eligible for retention action
 */
export interface RetentionCandidate {
  /** Item ID */
  id: string;
  /** Content type */
  contentType: RetentionContentType;
  /** Creation date */
  createdAt: Date;
  /** Expiration date based on policy */
  expiresAt: Date;
  /** Whether in grace period */
  inGracePeriod: boolean;
  /** Grace period end (if applicable) */
  gracePeriodEndsAt?: Date;
  /** Policy ID that applies */
  policyId: string;
  /** Action to take */
  action: RetentionAction;
  /** Related IDs (channel, user, etc.) */
  channelId?: string;
  userId?: string;
  workspaceId?: string;
  /** Whether blocked by legal hold */
  blockedByLegalHold: boolean;
  /** Legal hold IDs blocking this item */
  blockingLegalHolds: string[];
}

/**
 * Retention job execution record
 */
export interface RetentionJob {
  /** Job ID */
  id: string;
  /** Policy ID being executed */
  policyId: string;
  /** Job status */
  status: RetentionJobStatus;
  /** Start timestamp */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Items processed count */
  itemsProcessed: number;
  /** Items deleted count */
  itemsDeleted: number;
  /** Items archived count */
  itemsArchived: number;
  /** Items skipped (legal hold, etc.) */
  itemsSkipped: number;
  /** Items failed */
  itemsFailed: number;
  /** Error messages */
  errors: RetentionJobError[];
  /** Current batch number */
  currentBatch: number;
  /** Total batches */
  totalBatches: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Error during retention job execution
 */
export interface RetentionJobError {
  /** Error timestamp */
  timestamp: Date;
  /** Item ID that failed */
  itemId?: string;
  /** Content type */
  contentType?: RetentionContentType;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Whether the job should continue */
  recoverable: boolean;
}

/**
 * Result of a retention job execution
 */
export interface RetentionJobResult {
  /** Job ID */
  jobId: string;
  /** Success flag */
  success: boolean;
  /** Items processed */
  itemsProcessed: number;
  /** Items deleted */
  itemsDeleted: number;
  /** Items archived */
  itemsArchived: number;
  /** Items skipped */
  itemsSkipped: number;
  /** Items failed */
  itemsFailed: number;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Errors encountered */
  errors: RetentionJobError[];
  /** Affected entity IDs by type */
  affectedEntities: {
    channels: string[];
    users: string[];
    workspaces: string[];
  };
}

// ============================================================================
// ARCHIVE TYPES
// ============================================================================

/**
 * Archived content record
 */
export interface ArchivedContent {
  /** Archive ID */
  id: string;
  /** Original content ID */
  originalId: string;
  /** Content type */
  contentType: RetentionContentType;
  /** Archived data (serialized) */
  data: string;
  /** Original creation date */
  originalCreatedAt: Date;
  /** Archive date */
  archivedAt: Date;
  /** Policy ID that triggered archival */
  policyId: string;
  /** Retention job ID */
  jobId: string;
  /** Storage location/path */
  storageLocation: string;
  /** Checksum for integrity verification */
  checksum: string;
  /** Compressed size in bytes */
  sizeBytes: number;
  /** Related entity IDs */
  channelId?: string;
  userId?: string;
  workspaceId?: string;
  /** When this archive can be deleted */
  deleteAfter?: Date;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Archive storage configuration
 */
export interface ArchiveStorageConfig {
  /** Storage type */
  type: "database" | "s3" | "gcs" | "azure" | "local";
  /** Connection/path details */
  connection: string;
  /** Whether to compress archives */
  compress: boolean;
  /** Compression algorithm */
  compressionAlgorithm?: "gzip" | "lz4" | "zstd";
  /** Whether to encrypt archives */
  encrypt: boolean;
  /** Encryption key ID (if using KMS) */
  encryptionKeyId?: string;
  /** Retention period for archives (before final deletion) */
  archiveRetentionPeriod?: RetentionPeriod;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

/**
 * Retention audit event type
 */
export type RetentionAuditEventType =
  | "policy_created"
  | "policy_updated"
  | "policy_deleted"
  | "policy_activated"
  | "policy_deactivated"
  | "job_started"
  | "job_completed"
  | "job_failed"
  | "item_deleted"
  | "item_archived"
  | "item_restored"
  | "legal_hold_created"
  | "legal_hold_updated"
  | "legal_hold_released"
  | "deletion_blocked";

/**
 * Retention audit log entry
 */
export interface RetentionAuditEntry {
  /** Entry ID */
  id: string;
  /** Event type */
  eventType: RetentionAuditEventType;
  /** Timestamp */
  timestamp: Date;
  /** Actor user ID */
  actorId: string;
  /** Policy ID (if applicable) */
  policyId?: string;
  /** Job ID (if applicable) */
  jobId?: string;
  /** Legal hold ID (if applicable) */
  legalHoldId?: string;
  /** Affected item ID */
  itemId?: string;
  /** Content type */
  contentType?: RetentionContentType;
  /** Event details */
  details: Record<string, unknown>;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Retention statistics for a workspace/channel
 */
export interface RetentionStats {
  /** Total items subject to retention */
  totalItems: number;
  /** Items pending deletion */
  pendingDeletion: number;
  /** Items in grace period */
  inGracePeriod: number;
  /** Items blocked by legal hold */
  blockedByLegalHold: number;
  /** Items deleted (last 30 days) */
  deletedLast30Days: number;
  /** Items archived (last 30 days) */
  archivedLast30Days: number;
  /** Storage freed (bytes, last 30 days) */
  storageFreeBytes: number;
  /** Breakdown by content type */
  byContentType: Record<
    RetentionContentType,
    {
      total: number;
      pendingDeletion: number;
      deleted: number;
      archived: number;
    }
  >;
  /** Active policies count */
  activePolicies: number;
  /** Active legal holds count */
  activeLegalHolds: number;
  /** Last job execution */
  lastJobAt?: Date;
  /** Next scheduled job */
  nextJobAt?: Date;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Global retention configuration
 */
export interface RetentionConfig {
  /** Whether retention is enabled globally */
  enabled: boolean;
  /** Default retention period (if no policy applies) */
  defaultPeriod: RetentionPeriod;
  /** Default action */
  defaultAction: RetentionAction;
  /** Default grace period */
  defaultGracePeriod: GracePeriod;
  /** Archive storage configuration */
  archiveStorage: ArchiveStorageConfig;
  /** Job execution settings */
  jobSettings: {
    /** Batch size for processing */
    batchSize: number;
    /** Maximum concurrent jobs */
    maxConcurrentJobs: number;
    /** Delay between batches (ms) */
    batchDelayMs: number;
    /** Maximum retries for failed items */
    maxRetries: number;
    /** Retry delay (ms) */
    retryDelayMs: number;
  };
  /** Schedule settings */
  scheduleSettings: {
    /** Cron expression for scheduled runs */
    cronExpression: string;
    /** Timezone */
    timezone: string;
    /** Whether to run during maintenance windows only */
    maintenanceWindowOnly: boolean;
    /** Maintenance window start hour (0-23) */
    maintenanceWindowStart?: number;
    /** Maintenance window end hour (0-23) */
    maintenanceWindowEnd?: number;
  };
  /** Notification settings */
  notifications: {
    /** Notify admins before large deletions */
    notifyBeforeLargeDeletion: boolean;
    /** Threshold for "large" deletion */
    largeDeletionThreshold: number;
    /** Lead time before large deletion (hours) */
    notificationLeadTimeHours: number;
    /** Notify on job failures */
    notifyOnJobFailure: boolean;
    /** Email addresses for notifications */
    notificationEmails: string[];
  };
}

/**
 * Default retention configuration
 */
export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  enabled: true,
  defaultPeriod: { value: 365, unit: "days" },
  defaultAction: "delete",
  defaultGracePeriod: {
    enabled: true,
    duration: { value: 30, unit: "days" },
    recoverable: true,
  },
  archiveStorage: {
    type: "database",
    connection: "default",
    compress: true,
    compressionAlgorithm: "gzip",
    encrypt: true,
  },
  jobSettings: {
    batchSize: 1000,
    maxConcurrentJobs: 1,
    batchDelayMs: 100,
    maxRetries: 3,
    retryDelayMs: 5000,
  },
  scheduleSettings: {
    cronExpression: "0 3 * * *", // 3 AM daily
    timezone: "UTC",
    maintenanceWindowOnly: false,
  },
  notifications: {
    notifyBeforeLargeDeletion: true,
    largeDeletionThreshold: 10000,
    notificationLeadTimeHours: 24,
    notifyOnJobFailure: true,
    notificationEmails: [],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a default retention rule for a content type
 */
export function createDefaultRule(
  contentType: RetentionContentType,
): RetentionRule {
  return {
    contentType,
    enabled: true,
    period: { value: 365, unit: "days" },
    action: "delete",
    gracePeriod: {
      enabled: true,
      duration: { value: 30, unit: "days" },
      recoverable: true,
    },
  };
}

/**
 * Create rules for all content types with a common period
 */
export function createUniformRules(
  period: RetentionPeriod,
  action: RetentionAction = "delete",
): RetentionRule[] {
  return ALL_CONTENT_TYPES.map((contentType) => ({
    contentType,
    enabled: true,
    period,
    action,
    gracePeriod: {
      enabled: true,
      duration: { value: 30, unit: "days" },
      recoverable: true,
    },
  }));
}

/**
 * Format a retention period for display
 */
export function formatRetentionPeriod(period: RetentionPeriod): string {
  const value = period.value;
  const unit = period.unit;

  if (value === 1) {
    // Singular form
    return `1 ${unit.slice(0, -1)}`;
  }

  return `${value} ${unit}`;
}

/**
 * Parse a retention period from a string (e.g., "30 days", "1 year")
 */
export function parseRetentionPeriod(str: string): RetentionPeriod | null {
  const match = str.match(/^(\d+)\s*(hour|day|week|month|year)s?$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = (match[2].toLowerCase() + "s") as RetentionTimeUnit;

  if (!["hours", "days", "weeks", "months", "years"].includes(unit)) {
    return null;
  }

  return { value, unit };
}

/**
 * Check if a legal hold covers a specific item
 */
export function isItemCoveredByLegalHold(
  hold: LegalHold,
  item: {
    userId?: string;
    channelId?: string;
    workspaceId?: string;
    contentType: RetentionContentType;
    createdAt: Date;
  },
): boolean {
  // Check status
  if (hold.status !== "active") return false;

  // Check content type
  if (
    hold.scope.contentTypes.length > 0 &&
    !hold.scope.contentTypes.includes(item.contentType)
  ) {
    return false;
  }

  // Check user scope
  if (
    hold.scope.userIds.length > 0 &&
    item.userId &&
    !hold.scope.userIds.includes(item.userId)
  ) {
    return false;
  }

  // Check channel scope
  if (
    hold.scope.channelIds.length > 0 &&
    item.channelId &&
    !hold.scope.channelIds.includes(item.channelId)
  ) {
    return false;
  }

  // Check workspace scope
  if (
    hold.scope.workspaceIds.length > 0 &&
    item.workspaceId &&
    !hold.scope.workspaceIds.includes(item.workspaceId)
  ) {
    return false;
  }

  // Check date range
  if (hold.scope.startDate && item.createdAt < hold.scope.startDate) {
    return false;
  }

  if (hold.scope.endDate && item.createdAt > hold.scope.endDate) {
    return false;
  }

  return true;
}

/**
 * Generate a unique ID for retention entities
 */
export function generateRetentionId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}
