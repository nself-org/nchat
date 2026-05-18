/**
 * Queue Service
 *
 * Manages BullMQ job queues for nchat background task processing.
 * Provides methods to add, get, retry, and cancel jobs.
 *
 * @module services/jobs/queue.service
 * @version 1.0.0
 */

import {
  Queue,
  QueueEvents,
  Job,
  JobsOptions,
  type ConnectionOptions,
} from "bullmq";
import IORedis from "ioredis";
import { createLogger } from "@/lib/logger";
import {
  type JobsServiceConfig,
  type NchatJobType,
  type QueueName,
  type JobPayload,
  type CreateJobOptions,
  type JobStatus,
  type JobPriority,
  type QueueStats,
  type GlobalStats,
  type JobEvent,
  type JobEventListener,
  type JobEventType,
  DEFAULT_JOBS_CONFIG,
  JobPriorityValue,
} from "./types";

const log = createLogger("QueueService");

// ============================================================================
// Constants
// ============================================================================

/**
 * Default queue names
 */
export const QUEUE_NAMES: QueueName[] = [
  "default",
  "high-priority",
  "low-priority",
  "scheduled",
];

/**
 * Default job options
 */
const DEFAULT_JOB_OPTIONS: Partial<JobsOptions> = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: {
    age: 86400, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 604800, // 7 days
    count: 5000,
  },
};

// ============================================================================
// Queue Service Class
// ============================================================================

/**
 * QueueService manages all BullMQ queues for the application
 */
export class QueueService {
  private config: JobsServiceConfig;
  private connection: IORedis | null = null;
  private queues = new Map<QueueName, Queue>();
  private queueEvents = new Map<QueueName, QueueEvents>();
  private eventListeners = new Map<string, Set<JobEventListener>>();
  private isInitialized = false;

  constructor(config?: Partial<JobsServiceConfig>) {
    this.config = { ...DEFAULT_JOBS_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug("Queue service already initialized");
      return;
    }

    try {
      log.info("Initializing queue service", {
        redisUrl: this.config.redisUrl,
      });

      // Create Redis connection
      this.connection = new IORedis(this.config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 10) return null;
          return Math.min(times * 200, 5000);
        },
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (this.connection!.status === "ready") {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error("Redis connection timeout"));
        }, 10000);

        this.connection!.once("ready", () => {
          clearTimeout(timeout);
          resolve();
        });

        this.connection!.once("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Create queues
      for (const queueName of QUEUE_NAMES) {
        const queue = new Queue(queueName, {
          connection: this.connection as unknown as ConnectionOptions,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
        this.queues.set(queueName, queue);

        // Create queue events listener
        const events = new QueueEvents(queueName, {
          connection:
            this.connection.duplicate() as unknown as ConnectionOptions,
        });
        this.queueEvents.set(queueName, events);
        this.setupQueueEventHandlers(queueName, events);
      }

      this.isInitialized = true;
      log.info("Queue service initialized successfully");
    } catch (error) {
      log.error("Failed to initialize queue service", error);
      throw error;
    }
  }

  /**
   * Setup event handlers for a queue
   */
  private setupQueueEventHandlers(
    queueName: QueueName,
    events: QueueEvents,
  ): void {
    events.on("completed", ({ jobId, returnvalue }) => {
      this.emitEvent({
        type: "completed",
        jobId,
        queueName,
        jobType: "custom", // Will be populated from job data
        data: returnvalue,
        timestamp: new Date(),
      });
    });

    events.on("failed", ({ jobId, failedReason }) => {
      this.emitEvent({
        type: "failed",
        jobId,
        queueName,
        jobType: "custom",
        error: failedReason,
        timestamp: new Date(),
      });
    });

    events.on("progress", ({ jobId, data }) => {
      this.emitEvent({
        type: "progress",
        jobId,
        queueName,
        jobType: "custom",
        progress: typeof data === "number" ? data : 0,
        timestamp: new Date(),
      });
    });

    events.on("stalled", ({ jobId }) => {
      this.emitEvent({
        type: "stalled",
        jobId,
        queueName,
        jobType: "custom",
        timestamp: new Date(),
      });
    });
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: JobEvent): void {
    // Emit to type-specific listeners
    const typeListeners = this.eventListeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (err) {
          log.error("Event listener error", err);
        }
      }
    }

    // Emit to wildcard listeners
    const allListeners = this.eventListeners.get("*");
    if (allListeners) {
      for (const listener of allListeners) {
        try {
          listener(event);
        } catch (err) {
          log.error("Event listener error", err);
        }
      }
    }
  }

  /**
   * Close the queue service
   */
  async close(): Promise<void> {
    log.info("Closing queue service");

    // Close queue events
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
    this.queueEvents.clear();

    // Close queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();

    // Close Redis connection
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }

    this.eventListeners.clear();
    this.isInitialized = false;

    log.info("Queue service closed");
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  /**
   * Add a job to the queue
   */
  async addJob<T extends JobPayload>(
    type: NchatJobType,
    payload: T,
    options?: CreateJobOptions,
  ): Promise<{ jobId: string; queueName: QueueName }> {
    this.ensureInitialized();

    const queueName = options?.queue || this.getDefaultQueueForType(type);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobOptions = this.buildJobOptions(options);
    const jobData = {
      type,
      payload,
      metadata: options?.metadata || {},
      tags: options?.tags || [],
      createdAt: new Date().toISOString(),
    };

    const job = await queue.add(type, jobData, {
      ...jobOptions,
      jobId: options?.jobId,
    });

    log.info("Job added", { jobId: job.id, type, queueName });

    this.emitEvent({
      type: "created",
      jobId: job.id!,
      queueName,
      jobType: type,
      timestamp: new Date(),
    });

    return { jobId: job.id!, queueName };
  }

  /**
   * Add multiple jobs at once
   */
  async addJobs<T extends JobPayload>(
    jobs: Array<{ type: NchatJobType; payload: T; options?: CreateJobOptions }>,
  ): Promise<Array<{ jobId: string; queueName: QueueName }>> {
    const results: Array<{ jobId: string; queueName: QueueName }> = [];

    // Group jobs by queue
    const jobsByQueue = new Map<
      QueueName,
      Array<{ type: NchatJobType; payload: T; options?: CreateJobOptions }>
    >();

    for (const job of jobs) {
      const queueName =
        job.options?.queue || this.getDefaultQueueForType(job.type);
      const existing = jobsByQueue.get(queueName) || [];
      existing.push(job);
      jobsByQueue.set(queueName, existing);
    }

    // Add jobs by queue
    for (const [queueName, queueJobs] of jobsByQueue) {
      const queue = this.queues.get(queueName);
      if (!queue) continue;

      const bullJobs = queueJobs.map((job) => ({
        name: job.type,
        data: {
          type: job.type,
          payload: job.payload,
          metadata: job.options?.metadata || {},
          tags: job.options?.tags || [],
          createdAt: new Date().toISOString(),
        },
        opts: this.buildJobOptions(job.options),
      }));

      const addedJobs = await queue.addBulk(bullJobs);

      for (const addedJob of addedJobs) {
        results.push({ jobId: addedJob.id!, queueName });
      }
    }

    log.info("Bulk jobs added", { count: results.length });
    return results;
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string, queueName?: QueueName): Promise<Job | null> {
    this.ensureInitialized();

    // If queue name provided, search only that queue
    if (queueName) {
      const queue = this.queues.get(queueName);
      if (!queue) return null;
      return (await queue.getJob(jobId)) ?? null;
    }

    // Search all queues
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) return job;
    }

    return null;
  }

  /**
   * Get job status
   */
  async getJobStatus(
    jobId: string,
    queueName?: QueueName,
  ): Promise<JobStatus | null> {
    const job = await this.getJob(jobId, queueName);
    if (!job) return null;

    const state = await job.getState();
    return state as JobStatus;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, queueName?: QueueName): Promise<boolean> {
    const job = await this.getJob(jobId, queueName);
    if (!job) return false;

    const state = await job.getState();
    if (state === "active") {
      log.warn("Cannot cancel active job", { jobId });
      return false;
    }

    await job.remove();
    log.info("Job cancelled", { jobId });

    this.emitEvent({
      type: "removed",
      jobId,
      queueName: queueName || "default",
      jobType: "custom",
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, queueName?: QueueName): Promise<boolean> {
    const job = await this.getJob(jobId, queueName);
    if (!job) return false;

    const state = await job.getState();
    if (state !== "failed") {
      log.warn("Can only retry failed jobs", { jobId, state });
      return false;
    }

    await job.retry();
    log.info("Job retried", { jobId });

    this.emitEvent({
      type: "retry",
      jobId,
      queueName: queueName || "default",
      jobType: "custom",
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get jobs by status
   */
  async getJobs(
    queueName: QueueName,
    status: JobStatus | JobStatus[],
    options?: { start?: number; end?: number },
  ): Promise<Job[]> {
    this.ensureInitialized();

    const queue = this.queues.get(queueName);
    if (!queue) return [];

    const statuses = Array.isArray(status) ? status : [status];
    const { start = 0, end = 100 } = options || {};

    return await queue.getJobs(statuses as any, start, end);
  }

  /**
   * Get job counts by status
   */
  async getJobCounts(queueName: QueueName): Promise<Record<JobStatus, number>> {
    this.ensureInitialized();

    const queue = this.queues.get(queueName);
    if (!queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        stuck: 0,
        paused: 0,
      };
    }

    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused",
    );

    return {
      ...counts,
      stuck: 0, // BullMQ doesn't track stuck separately
    } as Record<JobStatus, number>;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get statistics for a single queue
   */
  async getQueueStats(queueName: QueueName): Promise<QueueStats> {
    this.ensureInitialized();

    const counts = await this.getJobCounts(queueName);
    const queue = this.queues.get(queueName);

    let avgDurationSeconds: number | null = null;
    let lastJobAt: Date | null = null;

    if (queue) {
      // Get recent completed jobs for average duration
      const completedJobs = await queue.getJobs(["completed"], 0, 100);
      if (completedJobs.length > 0) {
        const durations = completedJobs
          .map((job) => {
            const finished = job.finishedOn;
            const started = job.processedOn;
            if (finished && started) {
              return (finished - started) / 1000;
            }
            return null;
          })
          .filter((d): d is number => d !== null);

        if (durations.length > 0) {
          avgDurationSeconds =
            durations.reduce((a, b) => a + b, 0) / durations.length;
        }

        // Get last job timestamp
        const latestJob = completedJobs.reduce(
          (latest, job) => {
            const finished = job.finishedOn;
            if (finished && (!latest || finished > latest)) {
              return finished;
            }
            return latest;
          },
          null as number | null,
        );

        if (latestJob) {
          lastJobAt = new Date(latestJob);
        }
      }
    }

    return {
      queueName,
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      stuck: counts.stuck,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      avgDurationSeconds,
      lastJobAt,
    };
  }

  /**
   * Get global statistics across all queues
   */
  async getGlobalStats(): Promise<GlobalStats> {
    this.ensureInitialized();

    const queues: QueueStats[] = [];
    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const queueName of QUEUE_NAMES) {
      const stats = await this.getQueueStats(queueName);
      queues.push(stats);
      totalWaiting += stats.waiting;
      totalActive += stats.active;
      totalCompleted += stats.completed;
      totalFailed += stats.failed;
    }

    return {
      totalJobs: queues.reduce((sum, q) => sum + q.total, 0),
      waiting: totalWaiting,
      active: totalActive,
      completed: totalCompleted,
      failed: totalFailed,
      queues,
      jobTypes: [], // Would need database query for per-type stats
    };
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Subscribe to job events
   */
  onEvent(type: JobEventType | "*", listener: JobEventListener): () => void {
    const listeners = this.eventListeners.get(type) || new Set();
    listeners.add(listener);
    this.eventListeners.set(type, listeners);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(type);
      }
    };
  }

  // ============================================================================
  // Queue Operations
  // ============================================================================

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    this.ensureInitialized();

    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      log.info("Queue paused", { queueName });
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    this.ensureInitialized();

    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      log.info("Queue resumed", { queueName });
    }
  }

  /**
   * Drain a queue (remove all waiting and delayed jobs)
   */
  async drainQueue(queueName: QueueName): Promise<void> {
    this.ensureInitialized();

    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.drain();
      log.info("Queue drained", { queueName });
    }
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueue(
    queueName: QueueName,
    grace: number = 86400000, // 24 hours
    status: "completed" | "failed" = "completed",
    limit: number = 1000,
  ): Promise<string[]> {
    this.ensureInitialized();

    const queue = this.queues.get(queueName);
    if (!queue) return [];

    const removed = await queue.clean(grace, limit, status);
    log.info("Queue cleaned", {
      queueName,
      status,
      removedCount: removed.length,
    });
    return removed;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "Queue service not initialized. Call initialize() first.",
      );
    }
  }

  /**
   * Get default queue for job type
   */
  private getDefaultQueueForType(type: NchatJobType): QueueName {
    switch (type) {
      case "scheduled-message":
        return "scheduled";
      case "send-notification":
      case "send-email":
        return "high-priority";
      case "cleanup-expired":
      case "index-search":
        return "low-priority";
      default:
        return "default";
    }
  }

  /**
   * Build BullMQ job options from CreateJobOptions
   */
  private buildJobOptions(options?: CreateJobOptions): Partial<JobsOptions> {
    if (!options) return DEFAULT_JOB_OPTIONS;

    const priority = options.priority
      ? JobPriorityValue[options.priority]
      : JobPriorityValue.normal;

    return {
      ...DEFAULT_JOB_OPTIONS,
      priority,
      delay: options.delay,
      attempts: options.maxRetries ?? this.config.defaultRetryAttempts,
      backoff: options.retryDelay
        ? { type: "exponential", delay: options.retryDelay }
        : DEFAULT_JOB_OPTIONS.backoff,
      removeOnComplete:
        options.removeOnComplete !== undefined
          ? options.removeOnComplete
          : DEFAULT_JOB_OPTIONS.removeOnComplete,
      removeOnFail:
        options.removeOnFail !== undefined
          ? options.removeOnFail
          : DEFAULT_JOB_OPTIONS.removeOnFail,
    };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get Redis connection status
   */
  get connectionStatus(): string {
    return this.connection?.status || "disconnected";
  }

  /**
   * Get queue instance
   */
  getQueue(name: QueueName): Queue | undefined {
    return this.queues.get(name);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let queueService: QueueService | null = null;

/**
 * Get or create the queue service singleton
 */
export function getQueueService(
  config?: Partial<JobsServiceConfig>,
): QueueService {
  if (!queueService) {
    queueService = new QueueService(config);
  }
  return queueService;
}

/**
 * Create a new queue service instance
 */
export function createQueueService(
  config?: Partial<JobsServiceConfig>,
): QueueService {
  return new QueueService(config);
}

/**
 * Initialize the queue service
 */
export async function initializeQueueService(
  config?: Partial<JobsServiceConfig>,
): Promise<QueueService> {
  const service = getQueueService(config);
  await service.initialize();
  return service;
}

export default QueueService;
