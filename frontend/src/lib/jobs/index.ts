/**
 * Jobs Integration Module
 *
 * Client-side utilities for working with background jobs.
 * Connects various features to the jobs queue system.
 *
 * @module lib/jobs
 * @version 1.0.0
 */

// ============================================================================
// Message Jobs
// ============================================================================

export {
  scheduleMessageWithQueue,
  cancelScheduledMessageWithQueue,
  updateScheduledMessageWithQueue,
  queueMessageNotification,
  queueMessageIndexing,
  queueChannelReindex,
} from "./message-jobs";

// ============================================================================
// Job Handlers
// ============================================================================

export {
  processScheduledMessageJob,
  processScheduledMessages,
  calculateRetryDelay,
  getBackoffConfig,
  cleanupOldScheduledMessages,
  registerScheduledMessageProcessor,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  BATCH_SIZE,
  type ProcessScheduledMessagesResult,
} from "./handlers";

// ============================================================================
// Message Cleanup (Ephemeral Messages)
// ============================================================================

export {
  cleanupExpiredMessages,
  queueMessageCleanup,
  startCleanupScheduler,
  stopCleanupScheduler,
  getCleanupSchedulerStatus,
  handleMessageCleanupJob,
  type MessageCleanupResult,
  type MessageCleanupOptions,
} from "./handlers/message-cleanup";

// ============================================================================
// Digest Jobs
// ============================================================================

import { addJob, getSchedulerService } from "@/services/jobs";
import { createLogger } from "@/lib/logger";

const log = createLogger("Jobs");

/**
 * Create a daily digest subscription for a user
 */
export async function createDailyDigest(
  userId: string,
  email: string,
  options?: {
    hour?: number;
    timezone?: string;
    channelIds?: string[];
  },
): Promise<{ scheduleId: string } | null> {
  try {
    const scheduler = getSchedulerService();
    if (!scheduler.initialized) {
      await scheduler.initialize();
    }

    const result = await scheduler.createDailyDigestSchedule(
      userId,
      email,
      options,
    );

    log.info("Daily digest schedule created", {
      scheduleId: result.scheduleId,
      userId,
      email,
    });

    return { scheduleId: result.scheduleId };
  } catch (error) {
    log.error("Failed to create daily digest", error);
    return null;
  }
}

/**
 * Create a weekly digest subscription for a user
 */
export async function createWeeklyDigest(
  userId: string,
  email: string,
  options?: {
    dayOfWeek?: number;
    hour?: number;
    timezone?: string;
    channelIds?: string[];
  },
): Promise<{ scheduleId: string } | null> {
  try {
    const scheduler = getSchedulerService();
    if (!scheduler.initialized) {
      await scheduler.initialize();
    }

    const result = await scheduler.createWeeklyDigestSchedule(
      userId,
      email,
      options,
    );

    log.info("Weekly digest schedule created", {
      scheduleId: result.scheduleId,
      userId,
      email,
    });

    return { scheduleId: result.scheduleId };
  } catch (error) {
    log.error("Failed to create weekly digest", error);
    return null;
  }
}

/**
 * Cancel a digest subscription
 */
export async function cancelDigest(
  userId: string,
  type: "daily" | "weekly",
): Promise<boolean> {
  try {
    const scheduler = getSchedulerService();
    if (!scheduler.initialized) {
      await scheduler.initialize();
    }

    const scheduleName = `${type}-digest-${userId}`;
    const schedule = scheduler.getScheduleByName(scheduleName);

    if (!schedule) {
      log.warn("Digest schedule not found", { userId, type });
      return false;
    }

    const deleted = await scheduler.deleteSchedule(schedule.id);

    if (deleted) {
      log.info("Digest schedule cancelled", { userId, type });
    }

    return deleted;
  } catch (error) {
    log.error("Failed to cancel digest", error);
    return false;
  }
}

// ============================================================================
// Cleanup Jobs
// ============================================================================

/**
 * Queue cleanup of expired content
 */
export async function queueCleanup(
  targetType:
    | "messages"
    | "attachments"
    | "sessions"
    | "drafts"
    | "scheduled_messages"
    | "job_results",
  options?: {
    olderThanHours?: number;
    olderThanDays?: number;
    batchSize?: number;
    dryRun?: boolean;
  },
): Promise<string | null> {
  try {
    const { jobId } = await addJob(
      "cleanup-expired",
      {
        targetType,
        olderThanHours: options?.olderThanHours,
        olderThanDays: options?.olderThanDays,
        batchSize: options?.batchSize || 1000,
        dryRun: options?.dryRun || false,
      },
      {
        queue: "low-priority",
        priority: "low",
        tags: ["cleanup", targetType],
      },
    );

    log.info("Cleanup job queued", { jobId, targetType });
    return jobId;
  } catch (error) {
    log.error("Failed to queue cleanup", error);
    return null;
  }
}

// ============================================================================
// File Processing Jobs
// ============================================================================

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
): Promise<string | null> {
  try {
    const { jobId } = await addJob(
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
          fileSize,
        },
      },
    );

    log.debug("File processing job queued", { jobId, fileId, operations });
    return jobId;
  } catch (error) {
    log.error("Failed to queue file processing", error);
    return null;
  }
}

// ============================================================================
// Webhook Jobs
// ============================================================================

/**
 * Queue a webhook delivery
 */
export async function queueWebhook(
  url: string,
  payload: unknown,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    secret?: string;
    eventType?: string;
    timeout?: number;
    retryOnStatus?: number[];
  },
): Promise<string | null> {
  try {
    const { jobId } = await addJob(
      "http-webhook",
      {
        url,
        method: options?.method || "POST",
        headers: options?.headers,
        body: payload,
        secret: options?.secret,
        eventType: options?.eventType,
        timeout: options?.timeout,
        retryOnStatus: options?.retryOnStatus || [502, 503, 504],
      },
      {
        queue: "default",
        priority: "normal",
        maxRetries: 5,
        tags: ["webhook", options?.eventType || "generic"],
        metadata: {
          url,
          eventType: options?.eventType,
        },
      },
    );

    log.debug("Webhook job queued", {
      jobId,
      url,
      eventType: options?.eventType,
    });
    return jobId;
  } catch (error) {
    log.error("Failed to queue webhook", error);
    return null;
  }
}

// ============================================================================
// Email Jobs
// ============================================================================

/**
 * Queue an email to be sent
 */
export async function queueEmail(
  to: string | string[],
  subject: string,
  body: string,
  options?: {
    from?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>;
    templateId?: string;
    templateVars?: Record<string, unknown>;
  },
): Promise<string | null> {
  try {
    const { jobId } = await addJob(
      "send-email",
      {
        to,
        from: options?.from,
        subject,
        body,
        html: options?.html,
        cc: options?.cc,
        bcc: options?.bcc,
        attachments: options?.attachments,
        templateId: options?.templateId,
        templateVars: options?.templateVars,
      },
      {
        queue: "high-priority",
        priority: "normal",
        tags: [
          "email",
          options?.templateId ? `template:${options.templateId}` : "custom",
        ],
      },
    );

    log.debug("Email job queued", {
      jobId,
      to: Array.isArray(to) ? to.length : 1,
      subject,
    });
    return jobId;
  } catch (error) {
    log.error("Failed to queue email", error);
    return null;
  }
}
