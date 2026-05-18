/**
 * Retention Executor Service
 *
 * Executes retention policies by identifying expired content,
 * archiving if required, and deleting content according to policy rules.
 * Integrates with the job queue for scheduled execution.
 *
 * @module services/retention/retention-executor.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import {
  type RetentionPolicy,
  type RetentionRule,
  type RetentionContentType,
  type RetentionAction,
  type RetentionCandidate,
  type RetentionJob,
  type RetentionJobStatus,
  type RetentionJobResult,
  type RetentionJobError,
  type ArchivedContent,
  type RetentionConfig,
  type LegalHold,
  DEFAULT_RETENTION_CONFIG,
  generateRetentionId,
  calculateExpirationDate,
  isItemCoveredByLegalHold,
  periodToMilliseconds,
} from "@/lib/retention/retention-types";
import {
  getRetentionPolicyService,
  type RetentionPolicyService,
} from "./retention-policy.service";

const log = createLogger("RetentionExecutor");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Content item from database (simplified for executor)
 */
interface ContentItem {
  id: string;
  contentType: RetentionContentType;
  createdAt: Date;
  channelId?: string;
  userId?: string;
  workspaceId?: string;
  data?: Record<string, unknown>;
}

/**
 * Batch processing result
 */
interface BatchResult {
  processed: number;
  deleted: number;
  archived: number;
  skipped: number;
  failed: number;
  errors: RetentionJobError[];
}

/**
 * Content provider interface for different content types
 */
interface ContentProvider {
  getExpiredItems(
    contentType: RetentionContentType,
    olderThan: Date,
    limit: number,
    excludeIds?: string[],
  ): Promise<ContentItem[]>;

  deleteItems(
    contentType: RetentionContentType,
    ids: string[],
  ): Promise<{ deleted: number; failed: string[] }>;

  archiveItems(
    contentType: RetentionContentType,
    items: ContentItem[],
    destination: string,
  ): Promise<{ archived: number; failed: string[] }>;

  markInGracePeriod(
    contentType: RetentionContentType,
    ids: string[],
    gracePeriodEnds: Date,
  ): Promise<void>;
}

// ============================================================================
// DEFAULT CONTENT PROVIDER (In-Memory for testing)
// ============================================================================

/**
 * In-memory content provider for testing and development
 */
class InMemoryContentProvider implements ContentProvider {
  private items = new Map<string, ContentItem>();
  private deletedIds = new Set<string>();
  private archivedItems = new Map<string, ArchivedContent>();
  private gracePeriodItems = new Map<string, Date>();

  /**
   * Add test items
   */
  addItems(items: ContentItem[]): void {
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  /**
   * Get all items
   */
  getAllItems(): ContentItem[] {
    return Array.from(this.items.values());
  }

  async getExpiredItems(
    contentType: RetentionContentType,
    olderThan: Date,
    limit: number,
    excludeIds?: string[],
  ): Promise<ContentItem[]> {
    const excludeSet = new Set(excludeIds || []);
    const expiredItems: ContentItem[] = [];

    for (const item of this.items.values()) {
      if (
        item.contentType === contentType &&
        item.createdAt < olderThan &&
        !this.deletedIds.has(item.id) &&
        !excludeSet.has(item.id)
      ) {
        expiredItems.push(item);
        if (expiredItems.length >= limit) break;
      }
    }

    return expiredItems;
  }

  async deleteItems(
    contentType: RetentionContentType,
    ids: string[],
  ): Promise<{ deleted: number; failed: string[] }> {
    let deleted = 0;
    const failed: string[] = [];

    for (const id of ids) {
      const item = this.items.get(id);
      if (item && item.contentType === contentType) {
        this.items.delete(id);
        this.deletedIds.add(id);
        deleted++;
      } else {
        failed.push(id);
      }
    }

    return { deleted, failed };
  }

  async archiveItems(
    contentType: RetentionContentType,
    items: ContentItem[],
    destination: string,
  ): Promise<{ archived: number; failed: string[] }> {
    let archived = 0;
    const failed: string[] = [];

    for (const item of items) {
      if (item.contentType === contentType) {
        const archivedContent: ArchivedContent = {
          id: generateRetentionId("arch"),
          originalId: item.id,
          contentType,
          data: JSON.stringify(item),
          originalCreatedAt: item.createdAt,
          archivedAt: new Date(),
          policyId: "test",
          jobId: "test",
          storageLocation: destination,
          checksum: "test-checksum",
          sizeBytes: JSON.stringify(item).length,
          channelId: item.channelId,
          userId: item.userId,
          workspaceId: item.workspaceId,
        };
        this.archivedItems.set(archivedContent.id, archivedContent);
        archived++;
      } else {
        failed.push(item.id);
      }
    }

    return { archived, failed };
  }

  async markInGracePeriod(
    contentType: RetentionContentType,
    ids: string[],
    gracePeriodEnds: Date,
  ): Promise<void> {
    for (const id of ids) {
      this.gracePeriodItems.set(id, gracePeriodEnds);
    }
  }

  /**
   * Get archived items
   */
  getArchivedItems(): ArchivedContent[] {
    return Array.from(this.archivedItems.values());
  }

  /**
   * Get deleted IDs
   */
  getDeletedIds(): string[] {
    return Array.from(this.deletedIds);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.items.clear();
    this.deletedIds.clear();
    this.archivedItems.clear();
    this.gracePeriodItems.clear();
  }
}

// ============================================================================
// RETENTION EXECUTOR SERVICE
// ============================================================================

/**
 * Service that executes retention policies
 */
export class RetentionExecutorService {
  private policyService: RetentionPolicyService;
  private contentProvider: ContentProvider;
  private jobs = new Map<string, RetentionJob>();
  private config: RetentionConfig;
  private isInitialized = false;
  private isRunning = false;

  constructor(
    policyService?: RetentionPolicyService,
    contentProvider?: ContentProvider,
    config?: Partial<RetentionConfig>,
  ) {
    this.policyService = policyService || getRetentionPolicyService();
    this.contentProvider = contentProvider || new InMemoryContentProvider();
    this.config = { ...DEFAULT_RETENTION_CONFIG, ...config };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the executor service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug("Executor service already initialized");
      return;
    }

    log.info("Initializing retention executor service");

    // Ensure policy service is initialized
    if (!this.policyService.initialized) {
      await this.policyService.initialize();
    }

    this.isInitialized = true;
    log.info("Retention executor service initialized");
  }

  /**
   * Close the executor service
   */
  async close(): Promise<void> {
    log.info("Closing retention executor service");
    this.jobs.clear();
    this.isInitialized = false;
  }

  // ============================================================================
  // JOB EXECUTION
  // ============================================================================

  /**
   * Execute a retention policy
   */
  async executePolicy(
    policyId: string,
    options?: {
      dryRun?: boolean;
      batchSize?: number;
      maxBatches?: number;
    },
  ): Promise<RetentionJobResult> {
    this.ensureInitialized();

    const policy = this.policyService.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (policy.status !== "active") {
      throw new Error(`Policy is not active: ${policyId}`);
    }

    return this.runRetentionJob(policy, options);
  }

  /**
   * Execute all active policies
   */
  async executeAllPolicies(options?: {
    dryRun?: boolean;
    batchSize?: number;
  }): Promise<RetentionJobResult[]> {
    this.ensureInitialized();

    const policies = this.policyService.listPolicies({ status: "active" });
    const results: RetentionJobResult[] = [];

    for (const policy of policies) {
      try {
        const result = await this.runRetentionJob(policy, options);
        results.push(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        log.error("Policy execution failed", error as Error, {
          policyId: policy.id,
        });
        results.push({
          jobId: generateRetentionId("job"),
          success: false,
          itemsProcessed: 0,
          itemsDeleted: 0,
          itemsArchived: 0,
          itemsSkipped: 0,
          itemsFailed: 0,
          durationMs: 0,
          errors: [
            {
              timestamp: new Date(),
              message: errorMessage,
              recoverable: false,
            },
          ],
          affectedEntities: { channels: [], users: [], workspaces: [] },
        });
      }
    }

    return results;
  }

  /**
   * Run a retention job for a policy
   */
  private async runRetentionJob(
    policy: RetentionPolicy,
    options?: {
      dryRun?: boolean;
      batchSize?: number;
      maxBatches?: number;
    },
  ): Promise<RetentionJobResult> {
    const jobId = generateRetentionId("job");
    const startTime = Date.now();
    const dryRun = options?.dryRun ?? false;
    const batchSize = options?.batchSize ?? this.config.jobSettings.batchSize;
    const maxBatches = options?.maxBatches ?? 100;

    log.info("Starting retention job", {
      jobId,
      policyId: policy.id,
      policyName: policy.name,
      dryRun,
    });

    // Create job record
    const job: RetentionJob = {
      id: jobId,
      policyId: policy.id,
      status: "running",
      startedAt: new Date(),
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsArchived: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
      errors: [],
      currentBatch: 0,
      totalBatches: 0,
      progress: 0,
    };
    this.jobs.set(jobId, job);
    this.isRunning = true;

    const affectedChannels = new Set<string>();
    const affectedUsers = new Set<string>();
    const affectedWorkspaces = new Set<string>();

    try {
      // Get active legal holds
      const activeLegalHolds = this.policyService.getActiveLegalHolds();

      // Process each rule in the policy
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        const ruleResult = await this.processRule(
          policy,
          rule,
          activeLegalHolds,
          {
            dryRun,
            batchSize,
            maxBatches,
          },
        );

        // Update job stats
        job.itemsProcessed += ruleResult.processed;
        job.itemsDeleted += ruleResult.deleted;
        job.itemsArchived += ruleResult.archived;
        job.itemsSkipped += ruleResult.skipped;
        job.itemsFailed += ruleResult.failed;
        job.errors.push(...ruleResult.errors);
      }

      // Mark job as completed
      job.status = "completed";
      job.completedAt = new Date();
      job.progress = 100;

      log.info("Retention job completed", {
        jobId,
        itemsProcessed: job.itemsProcessed,
        itemsDeleted: job.itemsDeleted,
        itemsArchived: job.itemsArchived,
        itemsSkipped: job.itemsSkipped,
        itemsFailed: job.itemsFailed,
        dryRun,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      job.status = "failed";
      job.completedAt = new Date();
      job.errors.push({
        timestamp: new Date(),
        message: errorMessage,
        recoverable: false,
      });

      log.error("Retention job failed", error as Error, { jobId });
    } finally {
      this.isRunning = false;
    }

    return {
      jobId,
      success: job.status === "completed",
      itemsProcessed: job.itemsProcessed,
      itemsDeleted: job.itemsDeleted,
      itemsArchived: job.itemsArchived,
      itemsSkipped: job.itemsSkipped,
      itemsFailed: job.itemsFailed,
      durationMs: Date.now() - startTime,
      errors: job.errors,
      affectedEntities: {
        channels: Array.from(affectedChannels),
        users: Array.from(affectedUsers),
        workspaces: Array.from(affectedWorkspaces),
      },
    };
  }

  /**
   * Process a single retention rule
   */
  private async processRule(
    policy: RetentionPolicy,
    rule: RetentionRule,
    legalHolds: LegalHold[],
    options: {
      dryRun: boolean;
      batchSize: number;
      maxBatches: number;
    },
  ): Promise<BatchResult> {
    const result: BatchResult = {
      processed: 0,
      deleted: 0,
      archived: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Calculate the cutoff date
    const cutoffDate = new Date(Date.now() - periodToMilliseconds(rule.period));

    log.debug("Processing retention rule", {
      contentType: rule.contentType,
      action: rule.action,
      cutoffDate: cutoffDate.toISOString(),
    });

    let batchNumber = 0;
    const processedIds = new Set<string>();

    while (batchNumber < options.maxBatches) {
      batchNumber++;

      // Get expired items
      const items = await this.contentProvider.getExpiredItems(
        rule.contentType,
        cutoffDate,
        options.batchSize,
        Array.from(processedIds),
      );

      if (items.length === 0) {
        log.debug("No more items to process", { batchNumber });
        break;
      }

      // Process each item
      const toDelete: ContentItem[] = [];
      const toArchive: ContentItem[] = [];
      const toGracePeriod: ContentItem[] = [];

      for (const item of items) {
        processedIds.add(item.id);
        result.processed++;

        // Check legal holds
        const holdResult = this.checkLegalHolds(item, legalHolds);
        if (holdResult.blocked) {
          log.debug("Item blocked by legal hold", {
            itemId: item.id,
            holds: holdResult.holds,
          });
          result.skipped++;
          continue;
        }

        // Check grace period
        if (rule.gracePeriod?.enabled) {
          const expirationDate = calculateExpirationDate(
            item.createdAt,
            rule.period,
          );
          const gracePeriodEnd = calculateExpirationDate(
            expirationDate,
            rule.gracePeriod.duration,
          );

          if (new Date() < gracePeriodEnd) {
            toGracePeriod.push(item);
            continue;
          }
        }

        // Determine action
        switch (rule.action) {
          case "delete":
            toDelete.push(item);
            break;
          case "archive":
            toArchive.push(item);
            break;
          case "archive_then_delete":
            toArchive.push(item);
            toDelete.push(item);
            break;
        }
      }

      // Execute actions (if not dry run)
      if (!options.dryRun) {
        // Archive first
        if (toArchive.length > 0) {
          const archiveResult = await this.contentProvider.archiveItems(
            rule.contentType,
            toArchive,
            rule.archiveDestination || "default",
          );
          result.archived += archiveResult.archived;
          result.failed += archiveResult.failed.length;

          for (const failedId of archiveResult.failed) {
            result.errors.push({
              timestamp: new Date(),
              itemId: failedId,
              contentType: rule.contentType,
              message: "Failed to archive item",
              recoverable: true,
            });
          }
        }

        // Then delete
        if (toDelete.length > 0) {
          const deleteResult = await this.contentProvider.deleteItems(
            rule.contentType,
            toDelete.map((i) => i.id),
          );
          result.deleted += deleteResult.deleted;
          result.failed += deleteResult.failed.length;

          for (const failedId of deleteResult.failed) {
            result.errors.push({
              timestamp: new Date(),
              itemId: failedId,
              contentType: rule.contentType,
              message: "Failed to delete item",
              recoverable: true,
            });
          }
        }

        // Mark grace period items
        if (toGracePeriod.length > 0 && rule.gracePeriod) {
          const gracePeriodEnd = new Date(
            Date.now() + periodToMilliseconds(rule.gracePeriod.duration),
          );
          await this.contentProvider.markInGracePeriod(
            rule.contentType,
            toGracePeriod.map((i) => i.id),
            gracePeriodEnd,
          );
          result.skipped += toGracePeriod.length;
        }
      } else {
        // Dry run - just count what would happen
        result.deleted += toDelete.length;
        result.archived += toArchive.length;
        result.skipped += toGracePeriod.length;
      }

      // Delay between batches
      if (this.config.jobSettings.batchDelayMs > 0) {
        await this.delay(this.config.jobSettings.batchDelayMs);
      }
    }

    return result;
  }

  /**
   * Check if an item is blocked by legal holds
   */
  private checkLegalHolds(
    item: ContentItem,
    legalHolds: LegalHold[],
  ): { blocked: boolean; holds: string[] } {
    const blockingHolds: string[] = [];

    for (const hold of legalHolds) {
      if (
        isItemCoveredByLegalHold(hold, {
          userId: item.userId,
          channelId: item.channelId,
          workspaceId: item.workspaceId,
          contentType: item.contentType,
          createdAt: item.createdAt,
        })
      ) {
        blockingHolds.push(hold.id);
      }
    }

    return {
      blocked: blockingHolds.length > 0,
      holds: blockingHolds,
    };
  }

  // ============================================================================
  // CANDIDATE IDENTIFICATION
  // ============================================================================

  /**
   * Get candidates for retention action
   */
  async getCandidates(
    policyId: string,
    options?: {
      contentType?: RetentionContentType;
      limit?: number;
      includeGracePeriod?: boolean;
    },
  ): Promise<RetentionCandidate[]> {
    this.ensureInitialized();

    const policy = this.policyService.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const candidates: RetentionCandidate[] = [];
    const legalHolds = this.policyService.getActiveLegalHolds();
    const limit = options?.limit ?? 100;

    for (const rule of policy.rules) {
      if (!rule.enabled) continue;
      if (options?.contentType && rule.contentType !== options.contentType)
        continue;

      const cutoffDate = new Date(
        Date.now() - periodToMilliseconds(rule.period),
      );

      const items = await this.contentProvider.getExpiredItems(
        rule.contentType,
        cutoffDate,
        limit,
      );

      for (const item of items) {
        const holdResult = this.checkLegalHolds(item, legalHolds);
        const expiresAt = calculateExpirationDate(item.createdAt, rule.period);

        let inGracePeriod = false;
        let gracePeriodEndsAt: Date | undefined;

        if (rule.gracePeriod?.enabled) {
          gracePeriodEndsAt = calculateExpirationDate(
            expiresAt,
            rule.gracePeriod.duration,
          );
          inGracePeriod = new Date() < gracePeriodEndsAt;
        }

        if (!options?.includeGracePeriod && inGracePeriod) {
          continue;
        }

        candidates.push({
          id: item.id,
          contentType: item.contentType,
          createdAt: item.createdAt,
          expiresAt,
          inGracePeriod,
          gracePeriodEndsAt,
          policyId: policy.id,
          action: rule.action,
          channelId: item.channelId,
          userId: item.userId,
          workspaceId: item.workspaceId,
          blockedByLegalHold: holdResult.blocked,
          blockingLegalHolds: holdResult.holds,
        });

        if (candidates.length >= limit) break;
      }

      if (candidates.length >= limit) break;
    }

    return candidates;
  }

  /**
   * Preview retention execution without making changes
   */
  async previewExecution(
    policyId: string,
    options?: {
      contentType?: RetentionContentType;
      limit?: number;
    },
  ): Promise<{
    wouldDelete: number;
    wouldArchive: number;
    wouldSkip: number;
    blockedByLegalHold: number;
    inGracePeriod: number;
    candidates: RetentionCandidate[];
  }> {
    const candidates = await this.getCandidates(policyId, {
      ...options,
      includeGracePeriod: true,
    });

    const policy = this.policyService.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    let wouldDelete = 0;
    let wouldArchive = 0;
    let wouldSkip = 0;
    let blockedByLegalHold = 0;
    let inGracePeriod = 0;

    for (const candidate of candidates) {
      if (candidate.blockedByLegalHold) {
        blockedByLegalHold++;
        wouldSkip++;
        continue;
      }

      if (candidate.inGracePeriod) {
        inGracePeriod++;
        wouldSkip++;
        continue;
      }

      switch (candidate.action) {
        case "delete":
          wouldDelete++;
          break;
        case "archive":
          wouldArchive++;
          break;
        case "archive_then_delete":
          wouldArchive++;
          wouldDelete++;
          break;
      }
    }

    return {
      wouldDelete,
      wouldArchive,
      wouldSkip,
      blockedByLegalHold,
      inGracePeriod,
      candidates,
    };
  }

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  /**
   * Get a job by ID
   */
  getJob(jobId: string): RetentionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getJobs(options?: {
    status?: RetentionJobStatus;
    policyId?: string;
    limit?: number;
  }): RetentionJob[] {
    let jobs = Array.from(this.jobs.values());

    if (options?.status) {
      jobs = jobs.filter((j) => j.status === options.status);
    }

    if (options?.policyId) {
      jobs = jobs.filter((j) => j.policyId === options.policyId);
    }

    // Sort by start time descending
    jobs.sort((a, b) => {
      const aTime = a.startedAt?.getTime() ?? 0;
      const bTime = b.startedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    const limit = options?.limit ?? 100;
    return jobs.slice(0, limit);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status !== "running") {
      return false;
    }

    job.status = "cancelled";
    job.completedAt = new Date();

    log.info("Job cancelled", { jobId });

    return true;
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    let cleared = 0;
    for (const [id, job] of this.jobs) {
      if (["completed", "failed", "cancelled"].includes(job.status)) {
        this.jobs.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "RetentionExecutorService not initialized. Call initialize() first.",
      );
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if a job is currently running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get the content provider (for testing)
   */
  getContentProvider(): ContentProvider {
    return this.contentProvider;
  }

  /**
   * Set the content provider (for testing)
   */
  setContentProvider(provider: ContentProvider): void {
    this.contentProvider = provider;
  }

  /**
   * Get configuration
   */
  getConfig(): RetentionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RetentionConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let retentionExecutorService: RetentionExecutorService | null = null;

/**
 * Get or create the retention executor service singleton
 */
export function getRetentionExecutorService(): RetentionExecutorService {
  if (!retentionExecutorService) {
    retentionExecutorService = new RetentionExecutorService();
  }
  return retentionExecutorService;
}

/**
 * Create a new retention executor service instance
 */
export function createRetentionExecutorService(
  policyService?: RetentionPolicyService,
  contentProvider?: ContentProvider,
  config?: Partial<RetentionConfig>,
): RetentionExecutorService {
  return new RetentionExecutorService(policyService, contentProvider, config);
}

/**
 * Initialize the retention executor service
 */
export async function initializeRetentionExecutorService(): Promise<RetentionExecutorService> {
  const service = getRetentionExecutorService();
  await service.initialize();
  return service;
}

/**
 * Reset the singleton (for testing)
 */
export function resetRetentionExecutorService(): void {
  if (retentionExecutorService) {
    retentionExecutorService.close();
    retentionExecutorService = null;
  }
}

// Export the in-memory content provider for testing
export { InMemoryContentProvider };
export type { ContentProvider, ContentItem };

export default RetentionExecutorService;
