/**
 * Retention Policy Service
 *
 * Manages recording retention policies:
 * - Default retention periods
 * - Per-workspace settings
 * - Auto-deletion on expiry
 * - Legal hold override
 * - Storage quota tracking
 *
 * @module services/recordings/retention-policy.service
 */

import { logger } from "@/lib/logger";
import type {
  RetentionPolicy,
  RetentionPeriod,
  RetentionSchedule,
  StorageQuota,
  Recording,
  RecordingSource,
} from "./types";
import { RetentionPolicyError, StorageQuotaExceededError } from "./types";
import {
  getRecordingPipeline,
  RecordingPipelineService,
} from "./recording-pipeline.service";

// ============================================================================
// Constants
// ============================================================================

const RETENTION_PERIOD_DAYS: Record<RetentionPeriod, number> = {
  "7_days": 7,
  "30_days": 30,
  "90_days": 90,
  "180_days": 180,
  "1_year": 365,
  "2_years": 730,
  "5_years": 1825,
  forever: -1,
};

const DEFAULT_QUOTA_BYTES = 100 * 1024 * 1024 * 1024; // 100GB

// ============================================================================
// Types
// ============================================================================

interface RetentionStore {
  policies: Map<string, RetentionPolicy>;
  schedules: Map<string, RetentionSchedule>;
  quotas: Map<string, StorageQuota>;
}

interface RetentionConfig {
  defaultPeriod: RetentionPeriod;
  defaultQuotaBytes: number;
  warningDaysBefore: number;
  maxPoliciesPerWorkspace: number;
  enableAutoArchive: boolean;
  archiveLocation?: string;
}

// ============================================================================
// Retention Policy Service
// ============================================================================

export class RetentionPolicyService {
  private store: RetentionStore;
  private config: RetentionConfig;
  private pipeline: RecordingPipelineService;

  constructor(
    customConfig?: Partial<RetentionConfig>,
    pipelineInstance?: RecordingPipelineService,
  ) {
    this.store = {
      policies: new Map(),
      schedules: new Map(),
      quotas: new Map(),
    };

    this.config = {
      defaultPeriod: customConfig?.defaultPeriod ?? "90_days",
      defaultQuotaBytes: customConfig?.defaultQuotaBytes ?? DEFAULT_QUOTA_BYTES,
      warningDaysBefore: customConfig?.warningDaysBefore ?? 7,
      maxPoliciesPerWorkspace: customConfig?.maxPoliciesPerWorkspace ?? 10,
      enableAutoArchive: customConfig?.enableAutoArchive ?? true,
      archiveLocation: customConfig?.archiveLocation,
    };

    this.pipeline = pipelineInstance ?? getRecordingPipeline();
  }

  // ==========================================================================
  // Policy Management
  // ==========================================================================

  /**
   * Create a new retention policy
   */
  async createPolicy(
    workspaceId: string,
    options: {
      name: string;
      description?: string;
      retentionPeriod: RetentionPeriod;
      isDefault?: boolean;
      autoDeleteEnabled?: boolean;
      warningDaysBefore?: number;
      legalHoldExempt?: boolean;
      enforceQuota?: boolean;
      quotaBytes?: number;
      onExpiry?: "delete" | "archive" | "notify";
      archiveLocation?: string;
      applyToSources?: RecordingSource[];
      applyToChannelIds?: string[];
    },
    userId: string,
  ): Promise<RetentionPolicy> {
    // Check policy limit
    const existingPolicies = await this.getPolicies(workspaceId);
    if (existingPolicies.length >= this.config.maxPoliciesPerWorkspace) {
      throw new RetentionPolicyError(
        `Maximum of ${this.config.maxPoliciesPerWorkspace} policies per workspace`,
      );
    }

    // If setting as default, unset other defaults
    if (options.isDefault) {
      for (const policy of existingPolicies) {
        if (policy.isDefault) {
          policy.isDefault = false;
          this.store.policies.set(policy.id, policy);
        }
      }
    }

    const policy: RetentionPolicy = {
      id: crypto.randomUUID(),
      workspaceId,
      name: options.name,
      description: options.description,
      isDefault: options.isDefault ?? false,
      isActive: true,
      retentionPeriod: options.retentionPeriod,
      retentionDays: RETENTION_PERIOD_DAYS[options.retentionPeriod],
      autoDeleteEnabled: options.autoDeleteEnabled ?? true,
      warningDaysBefore:
        options.warningDaysBefore ?? this.config.warningDaysBefore,
      legalHoldExempt: options.legalHoldExempt ?? false,
      enforceQuota: options.enforceQuota ?? false,
      quotaBytes: options.quotaBytes,
      currentUsageBytes: 0,
      onExpiry: options.onExpiry ?? "delete",
      archiveLocation: options.archiveLocation ?? this.config.archiveLocation,
      applyToSources: options.applyToSources ?? [
        "call",
        "livestream",
        "screen_share",
        "voice_chat",
      ],
      applyToChannelIds: options.applyToChannelIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
    };

    this.store.policies.set(policy.id, policy);

    logger.info("Retention policy created", {
      policyId: policy.id,
      workspaceId,
      retentionPeriod: policy.retentionPeriod,
    });

    return policy;
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string): Promise<RetentionPolicy | null> {
    return this.store.policies.get(policyId) || null;
  }

  /**
   * Get all policies for a workspace
   */
  async getPolicies(workspaceId: string): Promise<RetentionPolicy[]> {
    const policies: RetentionPolicy[] = [];
    for (const policy of this.store.policies.values()) {
      if (policy.workspaceId === workspaceId) {
        policies.push(policy);
      }
    }
    return policies.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Get default policy for a workspace
   */
  async getDefaultPolicy(workspaceId: string): Promise<RetentionPolicy | null> {
    const policies = await this.getPolicies(workspaceId);
    return (
      policies.find((p) => p.isDefault && p.isActive) || policies[0] || null
    );
  }

  /**
   * Update a retention policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<
      Pick<
        RetentionPolicy,
        | "name"
        | "description"
        | "retentionPeriod"
        | "isDefault"
        | "isActive"
        | "autoDeleteEnabled"
        | "warningDaysBefore"
        | "legalHoldExempt"
        | "enforceQuota"
        | "quotaBytes"
        | "onExpiry"
        | "archiveLocation"
        | "applyToSources"
        | "applyToChannelIds"
      >
    >,
  ): Promise<RetentionPolicy> {
    const policy = await this.getPolicy(policyId);
    if (!policy) {
      throw new RetentionPolicyError("Policy not found", policyId);
    }

    // If setting as default, unset other defaults
    if (updates.isDefault && !policy.isDefault) {
      const workspacePolicies = await this.getPolicies(policy.workspaceId);
      for (const p of workspacePolicies) {
        if (p.isDefault && p.id !== policyId) {
          p.isDefault = false;
          this.store.policies.set(p.id, p);
        }
      }
    }

    // Update policy with provided updates
    Object.assign(policy, updates, { updatedAt: new Date().toISOString() });

    // Update retention days if period changed
    if (
      updates.retentionPeriod &&
      updates.retentionPeriod in RETENTION_PERIOD_DAYS
    ) {
      policy.retentionDays = RETENTION_PERIOD_DAYS[updates.retentionPeriod];
    }
    this.store.policies.set(policyId, policy);

    logger.info("Retention policy updated", { policyId, updates });

    return policy;
  }

  /**
   * Delete a retention policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    const policy = await this.getPolicy(policyId);
    if (!policy) {
      throw new RetentionPolicyError("Policy not found", policyId);
    }

    // Remove associated schedules
    for (const [scheduleId, schedule] of this.store.schedules) {
      if (schedule.policyId === policyId) {
        this.store.schedules.delete(scheduleId);
      }
    }

    this.store.policies.delete(policyId);

    logger.info("Retention policy deleted", { policyId });
  }

  /**
   * Apply policy to a recording
   */
  async applyPolicy(recordingId: string, policyId: string): Promise<void> {
    const recording = await this.pipeline.getRecording(recordingId);
    const policy = await this.getPolicy(policyId);

    if (!policy) {
      throw new RetentionPolicyError("Policy not found", policyId);
    }

    // Calculate expiry date
    let expiresAt: string | undefined;
    if (policy.retentionDays > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + policy.retentionDays);
      expiresAt = expiryDate.toISOString();
    }

    // Update recording
    (recording as any).retentionPolicyId = policyId;
    (recording as any).expiresAt = expiresAt;

    // Schedule deletion/archival
    if (expiresAt && policy.autoDeleteEnabled) {
      await this.scheduleRetentionAction(
        recordingId,
        policyId,
        expiresAt,
        policy.onExpiry,
      );

      // Schedule warning notification
      if (policy.warningDaysBefore > 0) {
        const warningDate = new Date(expiresAt);
        warningDate.setDate(warningDate.getDate() - policy.warningDaysBefore);
        if (warningDate > new Date()) {
          await this.scheduleRetentionAction(
            recordingId,
            policyId,
            warningDate.toISOString(),
            "notify",
          );
        }
      }
    }

    // Update policy usage
    if (recording.fileSize && policy.enforceQuota) {
      policy.currentUsageBytes += recording.fileSize;
      this.store.policies.set(policyId, policy);
    }

    logger.info("Retention policy applied", {
      recordingId,
      policyId,
      expiresAt,
    });
  }

  // ==========================================================================
  // Retention Schedules
  // ==========================================================================

  /**
   * Schedule a retention action
   */
  async scheduleRetentionAction(
    recordingId: string,
    policyId: string,
    scheduledAt: string,
    action: "delete" | "archive" | "notify",
  ): Promise<RetentionSchedule> {
    const schedule: RetentionSchedule = {
      recordingId,
      policyId,
      scheduledAction: action,
      scheduledAt,
      executed: false,
    };

    const scheduleId = `${recordingId}_${action}_${scheduledAt}`;
    this.store.schedules.set(scheduleId, schedule);

    logger.info("Retention action scheduled", {
      recordingId,
      policyId,
      action,
      scheduledAt,
    });

    return schedule;
  }

  /**
   * Get pending schedules
   */
  async getPendingSchedules(before?: Date): Promise<RetentionSchedule[]> {
    const cutoff = before || new Date();
    const schedules: RetentionSchedule[] = [];

    for (const schedule of this.store.schedules.values()) {
      if (
        !schedule.executed &&
        new Date(schedule.scheduledAt).getTime() <= cutoff.getTime()
      ) {
        schedules.push(schedule);
      }
    }

    return schedules.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }

  /**
   * Execute pending retention actions
   */
  async executeScheduledActions(): Promise<{
    executed: number;
    failed: number;
    skipped: number;
  }> {
    const pendingSchedules = await this.getPendingSchedules();
    let executed = 0;
    let failed = 0;
    let skipped = 0;

    for (const schedule of pendingSchedules) {
      try {
        const recording = await this.pipeline.getRecordingIfExists(
          schedule.recordingId,
        );

        if (!recording) {
          schedule.executed = true;
          schedule.result = "skipped";
          schedule.executedAt = new Date().toISOString();
          skipped++;
          continue;
        }

        // Check for legal hold
        if (recording.legalHold && schedule.scheduledAction !== "notify") {
          schedule.result = "skipped";
          schedule.error = "Recording is under legal hold";
          skipped++;
          continue;
        }

        switch (schedule.scheduledAction) {
          case "delete":
            await this.pipeline.deleteRecordingFile(schedule.recordingId);
            break;
          case "archive":
            await this.archiveRecording(schedule.recordingId);
            break;
          case "notify":
            await this.sendRetentionWarning(schedule.recordingId);
            break;
        }

        schedule.executed = true;
        schedule.result = "success";
        schedule.executedAt = new Date().toISOString();
        executed++;

        // Emit event
        await this.pipeline.emitEvent(
          "retention.executed",
          recording,
          undefined,
          {
            action: schedule.scheduledAction,
            policyId: schedule.policyId,
          },
        );
      } catch (error) {
        schedule.result = "failed";
        schedule.error = String(error);
        failed++;

        logger.error("Failed to execute retention action", {
          recordingId: schedule.recordingId,
          action: schedule.scheduledAction,
          error: String(error),
        });
      }

      // Update schedule
      const scheduleId = `${schedule.recordingId}_${schedule.scheduledAction}_${schedule.scheduledAt}`;
      this.store.schedules.set(scheduleId, schedule);
    }

    logger.info("Retention actions executed", { executed, failed, skipped });

    return { executed, failed, skipped };
  }

  /**
   * Archive a recording
   */
  private async archiveRecording(recordingId: string): Promise<void> {
    const recording = await this.pipeline.getRecording(recordingId);

    // In production, move file to archive storage
    // For now, just update status
    const rec = recording as unknown as Record<string, unknown>;
    rec.status = "archived";
    rec.updatedAt = new Date().toISOString();

    await this.pipeline.emitEvent("recording.archived", recording);

    logger.info("Recording archived", { recordingId });
  }

  /**
   * Send retention warning notification
   */
  private async sendRetentionWarning(recordingId: string): Promise<void> {
    const recording = await this.pipeline.getRecording(recordingId);

    await this.pipeline.emitEvent("retention.warning", recording, undefined, {
      expiresAt: (recording as any).expiresAt,
    });

    logger.info("Retention warning sent", { recordingId });
  }

  // ==========================================================================
  // Storage Quota Management
  // ==========================================================================

  /**
   * Get storage quota for a workspace
   */
  async getStorageQuota(workspaceId: string): Promise<StorageQuota> {
    let quota = this.store.quotas.get(workspaceId);

    if (!quota) {
      quota = {
        workspaceId,
        totalBytes: this.config.defaultQuotaBytes,
        usedBytes: 0,
        recordingCount: 0,
        averageRecordingSizeBytes: 0,
      };
      this.store.quotas.set(workspaceId, quota);
    }

    // Calculate current usage
    await this.recalculateQuotaUsage(workspaceId);

    return this.store.quotas.get(workspaceId)!;
  }

  /**
   * Set storage quota for a workspace
   */
  async setStorageQuota(
    workspaceId: string,
    totalBytes: number,
  ): Promise<StorageQuota> {
    let quota = await this.getStorageQuota(workspaceId);

    quota.totalBytes = totalBytes;
    this.store.quotas.set(workspaceId, quota);

    logger.info("Storage quota updated", { workspaceId, totalBytes });

    return quota;
  }

  /**
   * Recalculate quota usage
   */
  async recalculateQuotaUsage(workspaceId: string): Promise<void> {
    const { recordings } = await this.pipeline.listRecordings({
      workspaceId,
      status: ["completed", "archived"],
    });

    let usedBytes = 0;
    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    for (const recording of recordings) {
      if (recording.fileSize) {
        usedBytes += recording.fileSize;
      }

      const createdAt = new Date(recording.createdAt);
      if (!oldestDate || createdAt < oldestDate) {
        oldestDate = createdAt;
      }
      if (!newestDate || createdAt > newestDate) {
        newestDate = createdAt;
      }
    }

    const quota = this.store.quotas.get(workspaceId);
    if (quota) {
      quota.usedBytes = usedBytes;
      quota.recordingCount = recordings.length;
      quota.averageRecordingSizeBytes =
        recordings.length > 0 ? Math.floor(usedBytes / recordings.length) : 0;
      quota.oldestRecordingDate = oldestDate?.toISOString();
      quota.newestRecordingDate = newestDate?.toISOString();

      // Calculate projected days until full
      if (quota.averageRecordingSizeBytes > 0 && usedBytes < quota.totalBytes) {
        const remainingBytes = quota.totalBytes - usedBytes;
        const avgDailyUsage = await this.calculateDailyUsage(workspaceId);
        if (avgDailyUsage > 0) {
          quota.projectedDaysUntilFull = Math.floor(
            remainingBytes / avgDailyUsage,
          );
        }
      }

      this.store.quotas.set(workspaceId, quota);
    }
  }

  /**
   * Calculate average daily storage usage
   */
  private async calculateDailyUsage(workspaceId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { recordings } = await this.pipeline.listRecordings({
      workspaceId,
      startDate: thirtyDaysAgo.toISOString(),
    });

    const totalSize = recordings.reduce((sum, r) => sum + (r.fileSize || 0), 0);
    return Math.floor(totalSize / 30);
  }

  /**
   * Check if upload would exceed quota
   */
  async checkQuotaForUpload(
    workspaceId: string,
    fileSize: number,
  ): Promise<boolean> {
    const quota = await this.getStorageQuota(workspaceId);
    return quota.usedBytes + fileSize <= quota.totalBytes;
  }

  /**
   * Enforce quota by deleting oldest recordings if needed
   */
  async enforceQuota(
    workspaceId: string,
    bytesNeeded: number,
  ): Promise<{ deletedCount: number; freedBytes: number }> {
    const quota = await this.getStorageQuota(workspaceId);
    const availableBytes = quota.totalBytes - quota.usedBytes;

    if (availableBytes >= bytesNeeded) {
      return { deletedCount: 0, freedBytes: 0 };
    }

    const bytesToFree = bytesNeeded - availableBytes;
    let freedBytes = 0;
    let deletedCount = 0;

    // Get oldest recordings not under legal hold
    const { recordings } = await this.pipeline.listRecordings({
      workspaceId,
      status: ["completed"],
      sortBy: "createdAt",
      sortOrder: "asc",
    });

    for (const recording of recordings) {
      if (freedBytes >= bytesToFree) break;
      if (recording.legalHold) continue;

      try {
        await this.pipeline.deleteRecordingFile(recording.id);
        freedBytes += recording.fileSize || 0;
        deletedCount++;
      } catch (error) {
        logger.warn("Failed to delete recording for quota enforcement", {
          recordingId: recording.id,
          error: String(error),
        });
      }
    }

    logger.info("Quota enforcement completed", {
      workspaceId,
      deletedCount,
      freedBytes,
      bytesNeeded,
    });

    return { deletedCount, freedBytes };
  }

  // ==========================================================================
  // Legal Hold
  // ==========================================================================

  /**
   * Place recording under legal hold
   */
  async setLegalHold(
    recordingId: string,
    hold: boolean,
    userId: string,
  ): Promise<void> {
    const recording = await this.pipeline.getRecording(recordingId);
    const policy = recording.retentionPolicyId
      ? await this.getPolicy(recording.retentionPolicyId)
      : null;

    if (hold && policy?.legalHoldExempt) {
      throw new RetentionPolicyError(
        "Recording policy does not allow legal hold",
        policy.id,
      );
    }

    (recording as any).legalHold = hold;
    (recording as any).updatedAt = new Date().toISOString();

    if (hold) {
      // Cancel any pending deletion schedules
      for (const [scheduleId, schedule] of this.store.schedules) {
        if (
          schedule.recordingId === recordingId &&
          schedule.scheduledAction === "delete" &&
          !schedule.executed
        ) {
          schedule.executed = true;
          schedule.result = "skipped";
          schedule.error = "Legal hold applied";
          this.store.schedules.set(scheduleId, schedule);
        }
      }
    }

    logger.info(hold ? "Legal hold applied" : "Legal hold removed", {
      recordingId,
      userId,
    });
  }

  /**
   * Get recordings under legal hold
   */
  async getRecordingsUnderLegalHold(workspaceId: string): Promise<Recording[]> {
    const { recordings } = await this.pipeline.listRecordings({ workspaceId });
    return recordings.filter((r) => r.legalHold);
  }

  // ==========================================================================
  // Utility Methods for Testing
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.store.policies.clear();
    this.store.schedules.clear();
    this.store.quotas.clear();
  }

  /**
   * Get all policies (for testing)
   */
  getAllPolicies(): RetentionPolicy[] {
    return Array.from(this.store.policies.values());
  }

  /**
   * Get all schedules (for testing)
   */
  getAllSchedules(): RetentionSchedule[] {
    return Array.from(this.store.schedules.values());
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let retentionInstance: RetentionPolicyService | null = null;

/**
 * Get singleton retention policy service instance
 */
export function getRetentionPolicyService(
  config?: Partial<RetentionConfig>,
): RetentionPolicyService {
  if (!retentionInstance) {
    retentionInstance = new RetentionPolicyService(config);
  }
  return retentionInstance;
}

/**
 * Create new retention policy service instance
 */
export function createRetentionPolicyService(
  config?: Partial<RetentionConfig>,
  pipelineInstance?: RecordingPipelineService,
): RetentionPolicyService {
  return new RetentionPolicyService(config, pipelineInstance);
}
