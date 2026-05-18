/**
 * Jobs Service
 *
 * Background job processing system for nchat.
 * Integrates with the nself-plugins jobs plugin (BullMQ-based).
 *
 * @module services/jobs
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { getQueueService, getSchedulerService } from '@/services/jobs'
 *
 * // Initialize services
 * const queueService = await initializeQueueService()
 * const schedulerService = await initializeSchedulerService()
 *
 * // Add a job
 * await queueService.addJob('scheduled-message', {
 *   scheduledMessageId: 'msg123',
 *   channelId: 'channel456',
 *   userId: 'user789',
 *   content: 'Hello!',
 * }, {
 *   delay: 60000, // 1 minute
 *   priority: 'high',
 * })
 *
 * // Create a recurring schedule
 * await schedulerService.createSchedule({
 *   name: 'daily-cleanup',
 *   jobType: 'cleanup-expired',
 *   cronExpression: '0 3 * * *', // 3 AM daily
 *   timezone: 'UTC',
 *   payload: {
 *     targetType: 'job_results',
 *     olderThanDays: 7,
 *   },
 * })
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Configuration
  JobsServiceConfig,

  // Status and Priority
  JobStatus,
  JobPriority,

  // Job Types
  NchatJobType,
  QueueName,

  // Payloads
  JobPayload,
  ScheduledMessagePayload,
  EmailDigestPayload,
  CleanupExpiredPayload,
  IndexSearchPayload,
  ProcessFilePayload,
  SendNotificationPayload,
  SendEmailPayload,
  HttpWebhookPayload,
  CustomJobPayload,

  // Options
  CreateJobOptions,
  CreateJobData,
  ScheduleOptions,

  // Records
  JobRecord,
  JobResultRecord,
  JobFailureRecord,
  ScheduleRecord,

  // Statistics
  QueueStats,
  JobTypeStats,
  GlobalStats,

  // Events
  JobEventType,
  JobEvent,
  JobEventListener,

  // Results
  JobResult,
  ScheduledMessageResult,
  EmailDigestResult,
  CleanupResult,
  IndexSearchResult,
  ProcessFileResult,
  SendNotificationResult,

  // Processors
  JobProcessor,
  RegisteredProcessor,
} from "./types";

export { DEFAULT_JOBS_CONFIG, JobPriorityValue } from "./types";

// ============================================================================
// Queue Service
// ============================================================================

export {
  QueueService,
  getQueueService,
  createQueueService,
  initializeQueueService,
  QUEUE_NAMES,
} from "./queue.service";

// ============================================================================
// Scheduler Service
// ============================================================================

export {
  SchedulerService,
  getSchedulerService,
  createSchedulerService,
  initializeSchedulerService,
  type CreateScheduleResult,
  type UpdateScheduleResult,
} from "./scheduler.service";

// ============================================================================
// Processor Service
// ============================================================================

export {
  ProcessorService,
  getProcessorService,
  createProcessorService,
  initializeProcessorService,
} from "./processor.service";

// ============================================================================
// Convenience Functions
// ============================================================================

import { getQueueService, initializeQueueService } from "./queue.service";
import {
  getSchedulerService,
  initializeSchedulerService,
} from "./scheduler.service";
import type { NchatJobType, JobPayload, CreateJobOptions } from "./types";

/**
 * Initialize all job services
 */
export async function initializeJobServices(): Promise<{
  queueService: ReturnType<typeof getQueueService>;
  schedulerService: ReturnType<typeof getSchedulerService>;
}> {
  const queueService = await initializeQueueService();
  const schedulerService = await initializeSchedulerService();

  return { queueService, schedulerService };
}

/**
 * Add a job to the queue (convenience function)
 */
export async function addJob<T extends JobPayload>(
  type: NchatJobType,
  payload: T,
  options?: CreateJobOptions,
): Promise<{ jobId: string }> {
  const service = getQueueService();
  if (!service.initialized) {
    await service.initialize();
  }
  return service.addJob(type, payload, options);
}

/**
 * Schedule a message for future delivery
 */
export async function scheduleMessage(
  channelId: string,
  userId: string,
  content: string,
  scheduledAt: Date,
  options?: {
    threadId?: string;
    replyToId?: string;
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
    }>;
    mentions?: string[];
  },
): Promise<{ jobId: string; scheduledMessageId: string }> {
  const scheduledMessageId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { jobId } = await addJob(
    "scheduled-message",
    {
      scheduledMessageId,
      channelId,
      userId,
      content,
      threadId: options?.threadId,
      replyToId: options?.replyToId,
      attachments: options?.attachments,
      mentions: options?.mentions,
    },
    {
      delay: scheduledAt.getTime() - Date.now(),
      queue: "scheduled",
      priority: "normal",
      tags: ["scheduled-message", `channel:${channelId}`, `user:${userId}`],
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
        channelId,
        userId,
      },
    },
  );

  return { jobId, scheduledMessageId };
}

/**
 * Queue a notification to be sent
 */
export async function queueNotification(
  userIds: string[],
  title: string,
  body: string,
  options?: {
    type?: "push" | "email" | "in-app" | "sms";
    url?: string;
    iconUrl?: string;
    data?: Record<string, unknown>;
    priority?: "critical" | "high" | "normal" | "low";
  },
): Promise<{ jobId: string }> {
  return addJob(
    "send-notification",
    {
      notificationType: options?.type || "push",
      userIds,
      title,
      body,
      url: options?.url,
      iconUrl: options?.iconUrl,
      data: options?.data,
    },
    {
      queue: "high-priority",
      priority: options?.priority || "normal",
      tags: ["notification", options?.type || "push"],
    },
  );
}

/**
 * Queue a search indexing operation
 */
export async function queueSearchIndex(
  operation: "index" | "update" | "delete" | "reindex",
  entityType: "message" | "channel" | "user" | "file",
  entityIds: string[],
  options?: {
    channelId?: string;
    fullReindex?: boolean;
  },
): Promise<{ jobId: string }> {
  return addJob(
    "index-search",
    {
      operation,
      entityType,
      entityIds,
      channelId: options?.channelId,
      fullReindex: options?.fullReindex,
    },
    {
      queue: "low-priority",
      priority: "low",
      tags: ["search-index", entityType, operation],
    },
  );
}

/**
 * Queue file processing
 */
export async function queueFileProcessing(
  fileId: string,
  fileUrl: string,
  mimeType: string,
  fileSize: number,
  operations: Array<
    | "thumbnail"
    | "preview"
    | "extract_text"
    | "virus_scan"
    | "compress"
    | "transcode"
  >,
  options?: {
    userId?: string;
    channelId?: string;
    messageId?: string;
  },
): Promise<{ jobId: string }> {
  return addJob(
    "process-file",
    {
      fileId,
      fileUrl,
      mimeType,
      fileSize,
      operations,
      userId: options?.userId || "",
      channelId: options?.channelId,
      messageId: options?.messageId,
    },
    {
      queue: "default",
      priority: "normal",
      tags: ["file-processing", ...operations],
      metadata: {
        fileId,
        mimeType,
      },
    },
  );
}
