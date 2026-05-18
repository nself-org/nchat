/**
 * Storage Quota Manager
 *
 * Manages storage quotas, usage tracking, and enforcement for users, channels, and teams.
 * Supports soft/hard limits, usage breakdowns, and automatic cleanup policies.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface StorageQuota {
  /** Entity ID (userId, channelId, or teamId) */
  entityId: string;
  /** Entity type */
  entityType: "user" | "channel" | "team";
  /** Total storage limit in bytes */
  limit: number;
  /** Current usage in bytes */
  used: number;
  /** Usage percentage (0-100) */
  percentage: number;
  /** Soft limit threshold (percentage, e.g., 80) */
  softLimitThreshold: number;
  /** Whether soft limit has been exceeded */
  softLimitExceeded: boolean;
  /** Whether hard limit has been exceeded */
  hardLimitExceeded: boolean;
  /** Last calculated timestamp */
  lastCalculated: Date;
}

export interface StorageUsageBreakdown {
  /** Total usage in bytes */
  total: number;
  /** Usage by type */
  byType: {
    messages: number;
    files: number;
    images: number;
    videos: number;
    audio: number;
    documents: number;
    archives: number;
    code: number;
    other: number;
    cache: number;
  };
  /** Usage by user (for team/channel) */
  byUser?: Map<string, number>;
  /** Usage by channel (for team) */
  byChannel?: Map<string, number>;
  /** Largest files */
  largestFiles: Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>;
  /** Oldest files */
  oldestFiles: Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>;
}

export interface StorageTier {
  id: string;
  name: string;
  /** Storage limit in bytes */
  limit: number;
  /** Price per month (USD cents) */
  priceMonthly: number;
  /** Features included */
  features: string[];
}

export interface QuotaWarning {
  id: string;
  entityId: string;
  entityType: "user" | "channel" | "team";
  type: "approaching" | "exceeded" | "critical";
  /** Percentage at which warning was triggered */
  threshold: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface CleanupPolicy {
  /** Enable automatic cleanup */
  enabled: boolean;
  /** Delete files older than (days) */
  deleteOlderThan?: number;
  /** Compress images older than (days) */
  compressImagesOlderThan?: number;
  /** Archive messages older than (days) */
  archiveMessagesOlderThan?: number;
  /** Delete cache older than (days) */
  deleteCacheOlderThan?: number;
  /** Minimum free space to maintain (percentage) */
  maintainFreeSpace?: number;
}

export interface StorageStats {
  /** Total storage allocated (bytes) */
  totalAllocated: number;
  /** Total storage used (bytes) */
  totalUsed: number;
  /** Total storage available (bytes) */
  totalAvailable: number;
  /** Number of files */
  fileCount: number;
  /** Number of users */
  userCount: number;
  /** Number of channels */
  channelCount: number;
  /** Average file size (bytes) */
  averageFileSize: number;
  /** Largest file size (bytes) */
  largestFileSize: number;
  /** Growth rate (bytes per day) */
  growthRate: number;
  /** Projected days until full */
  daysUntilFull: number | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default storage tiers */
export const STORAGE_TIERS: StorageTier[] = [
  {
    id: "free",
    name: "Free",
    limit: 5 * 1024 * 1024 * 1024, // 5 GB
    priceMonthly: 0,
    features: [
      "5 GB storage",
      "Basic file types",
      "10 MB max file size",
      "90 days retention",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    limit: 25 * 1024 * 1024 * 1024, // 25 GB
    priceMonthly: 999, // $9.99
    features: [
      "25 GB storage",
      "All file types",
      "100 MB max file size",
      "1 year retention",
      "Advanced search",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    limit: 100 * 1024 * 1024 * 1024, // 100 GB
    priceMonthly: 2999, // $29.99
    features: [
      "100 GB storage",
      "All file types",
      "500 MB max file size",
      "Unlimited retention",
      "Advanced search",
      "Version history",
      "Custom retention policies",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    limit: 1024 * 1024 * 1024 * 1024, // 1 TB
    priceMonthly: 9999, // $99.99
    features: [
      "1 TB storage",
      "All file types",
      "Unlimited file size",
      "Unlimited retention",
      "Advanced search",
      "Version history",
      "Custom retention policies",
      "Priority support",
      "SLA guarantee",
    ],
  },
];

/** Default per-user quota (5 GB) */
export const DEFAULT_USER_QUOTA = 5 * 1024 * 1024 * 1024;

/** Default per-channel quota (10 GB) */
export const DEFAULT_CHANNEL_QUOTA = 10 * 1024 * 1024 * 1024;

/** Default team quota (100 GB) */
export const DEFAULT_TEAM_QUOTA = 100 * 1024 * 1024 * 1024;

/** Soft limit warning threshold (percentage) */
export const SOFT_LIMIT_THRESHOLD = 80;

/** Critical threshold (percentage) */
export const CRITICAL_THRESHOLD = 95;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculate storage percentage
 */
export function calculatePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded(used: number, limit: number): boolean {
  return used >= limit;
}

/**
 * Check if soft limit is exceeded
 */
export function isSoftLimitExceeded(
  used: number,
  limit: number,
  threshold: number = SOFT_LIMIT_THRESHOLD,
): boolean {
  const percentage = calculatePercentage(used, limit);
  return percentage >= threshold;
}

/**
 * Get quota status
 */
export function getQuotaStatus(
  used: number,
  limit: number,
): "ok" | "warning" | "critical" | "exceeded" {
  const percentage = calculatePercentage(used, limit);

  if (percentage >= 100) return "exceeded";
  if (percentage >= CRITICAL_THRESHOLD) return "critical";
  if (percentage >= SOFT_LIMIT_THRESHOLD) return "warning";
  return "ok";
}

/**
 * Estimate days until quota is full
 */
export function estimateDaysUntilFull(
  used: number,
  limit: number,
  growthRatePerDay: number,
): number | null {
  if (growthRatePerDay <= 0) return null;
  if (used >= limit) return 0;

  const remaining = limit - used;
  const days = Math.ceil(remaining / growthRatePerDay);
  return days;
}

// ============================================================================
// QUOTA MANAGER CLASS
// ============================================================================

export class QuotaManager {
  private quotaCache: Map<string, StorageQuota> = new Map();
  private warningsCache: Map<string, QuotaWarning[]> = new Map();

  /**
   * Get storage quota for an entity
   */
  async getQuota(
    entityId: string,
    entityType: "user" | "channel" | "team",
  ): Promise<StorageQuota> {
    const cacheKey = `${entityType}:${entityId}`;

    // Check cache first
    const cached = this.quotaCache.get(cacheKey);
    if (cached && Date.now() - cached.lastCalculated.getTime() < 60000) {
      return cached;
    }

    const limit = this.getDefaultLimit(entityType);
    const used = await this.calculateUsage(entityId, entityType);
    const percentage = calculatePercentage(used, limit);

    const quota: StorageQuota = {
      entityId,
      entityType,
      limit,
      used,
      percentage,
      softLimitThreshold: SOFT_LIMIT_THRESHOLD,
      softLimitExceeded: isSoftLimitExceeded(used, limit),
      hardLimitExceeded: isQuotaExceeded(used, limit),
      lastCalculated: new Date(),
    };

    // Cache for 1 minute
    this.quotaCache.set(cacheKey, quota);

    return quota;
  }

  /**
   * Update storage quota limit
   */
  async updateQuota(
    entityId: string,
    entityType: "user" | "channel" | "team",
    newLimit: number,
  ): Promise<StorageQuota> {
    // Invalidate cache
    const cacheKey = `${entityType}:${entityId}`;
    this.quotaCache.delete(cacheKey);

    // Recalculate
    return this.getQuota(entityId, entityType);
  }

  /**
   * Calculate storage usage for an entity
   */
  async calculateUsage(
    entityId: string,
    entityType: "user" | "channel" | "team",
  ): Promise<number> {
    // This is a placeholder implementation

    // Simulate usage calculation
    return Math.floor(Math.random() * 5 * 1024 * 1024 * 1024);
  }

  /**
   * Get detailed usage breakdown
   */
  async getUsageBreakdown(
    entityId: string,
    entityType: "user" | "channel" | "team",
  ): Promise<StorageUsageBreakdown> {
    // Placeholder implementation
    const total = await this.calculateUsage(entityId, entityType);

    return {
      total,
      byType: {
        messages: Math.floor(total * 0.1),
        files: Math.floor(total * 0.2),
        images: Math.floor(total * 0.3),
        videos: Math.floor(total * 0.15),
        audio: Math.floor(total * 0.05),
        documents: Math.floor(total * 0.1),
        archives: Math.floor(total * 0.05),
        code: Math.floor(total * 0.03),
        other: Math.floor(total * 0.01),
        cache: Math.floor(total * 0.01),
      },
      largestFiles: [],
      oldestFiles: [],
    };
  }

  /**
   * Check if upload is allowed
   */
  async canUpload(
    entityId: string,
    entityType: "user" | "channel" | "team",
    fileSize: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getQuota(entityId, entityType);

    if (quota.hardLimitExceeded) {
      return {
        allowed: false,
        reason: "Storage quota exceeded",
      };
    }

    const projectedUsage = quota.used + fileSize;
    if (projectedUsage > quota.limit) {
      return {
        allowed: false,
        reason: `Upload would exceed quota by ${formatBytes(projectedUsage - quota.limit)}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record file upload
   */
  async recordUpload(
    entityId: string,
    entityType: "user" | "channel" | "team",
    fileSize: number,
  ): Promise<void> {
    // Invalidate cache
    const cacheKey = `${entityType}:${entityId}`;
    this.quotaCache.delete(cacheKey);

    // Check if warning should be triggered
    const quota = await this.getQuota(entityId, entityType);
    await this.checkAndCreateWarnings(quota);
  }

  /**
   * Record file deletion
   */
  async recordDeletion(
    entityId: string,
    entityType: "user" | "channel" | "team",
    fileSize: number,
  ): Promise<void> {
    // Invalidate cache
    const cacheKey = `${entityType}:${entityId}`;
    this.quotaCache.delete(cacheKey);
  }

  /**
   * Get quota warnings
   */
  async getWarnings(
    entityId: string,
    entityType: "user" | "channel" | "team",
  ): Promise<QuotaWarning[]> {
    const cacheKey = `${entityType}:${entityId}`;

    // Check cache
    const cached = this.warningsCache.get(cacheKey);
    if (cached) return cached;

    const warnings: QuotaWarning[] = [];

    this.warningsCache.set(cacheKey, warnings);
    return warnings;
  }

  /**
   * Check quota and create warnings if needed
   */
  private async checkAndCreateWarnings(quota: StorageQuota): Promise<void> {
    const warnings: QuotaWarning[] = [];

    if (quota.hardLimitExceeded) {
      warnings.push({
        id: `${quota.entityType}:${quota.entityId}:exceeded`,
        entityId: quota.entityId,
        entityType: quota.entityType,
        type: "exceeded",
        threshold: 100,
        message: `Storage quota exceeded (${formatBytes(quota.used)} / ${formatBytes(quota.limit)})`,
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (quota.percentage >= CRITICAL_THRESHOLD) {
      warnings.push({
        id: `${quota.entityType}:${quota.entityId}:critical`,
        entityId: quota.entityId,
        entityType: quota.entityType,
        type: "critical",
        threshold: CRITICAL_THRESHOLD,
        message: `Storage quota critical (${quota.percentage}% used)`,
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (quota.softLimitExceeded) {
      warnings.push({
        id: `${quota.entityType}:${quota.entityId}:approaching`,
        entityId: quota.entityId,
        entityType: quota.entityType,
        type: "approaching",
        threshold: quota.softLimitThreshold,
        message: `Storage quota approaching limit (${quota.percentage}% used)`,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    if (warnings.length > 0) {
      const cacheKey = `${quota.entityType}:${quota.entityId}`;
      this.warningsCache.set(cacheKey, warnings);
    }
  }

  /**
   * Acknowledge a warning
   */
  async acknowledgeWarning(warningId: string): Promise<void> {
    // Invalidate warnings cache
    this.warningsCache.clear();
  }

  /**
   * Get default limit for entity type
   */
  private getDefaultLimit(entityType: "user" | "channel" | "team"): number {
    switch (entityType) {
      case "user":
        return DEFAULT_USER_QUOTA;
      case "channel":
        return DEFAULT_CHANNEL_QUOTA;
      case "team":
        return DEFAULT_TEAM_QUOTA;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    // Placeholder implementation
    return {
      totalAllocated: 100 * 1024 * 1024 * 1024,
      totalUsed: 45 * 1024 * 1024 * 1024,
      totalAvailable: 55 * 1024 * 1024 * 1024,
      fileCount: 12543,
      userCount: 150,
      channelCount: 45,
      averageFileSize: 3.5 * 1024 * 1024,
      largestFileSize: 250 * 1024 * 1024,
      growthRate: 500 * 1024 * 1024, // 500 MB per day
      daysUntilFull: estimateDaysUntilFull(
        45 * 1024 * 1024 * 1024,
        100 * 1024 * 1024 * 1024,
        500 * 1024 * 1024,
      ),
    };
  }

  /**
   * Apply cleanup policy
   */
  async applyCleanupPolicy(
    entityId: string,
    entityType: "user" | "channel" | "team",
    policy: CleanupPolicy,
  ): Promise<{ filesDeleted: number; spaceFree: number }> {
    if (!policy.enabled) {
      return { filesDeleted: 0, spaceFree: 0 };
    }

    // Placeholder implementation
    return {
      filesDeleted: 0,
      spaceFree: 0,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const quotaManager = new QuotaManager();
