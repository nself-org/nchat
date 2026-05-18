/**
 * Message Cleanup Job Handler
 *
 * Handles periodic cleanup of expired ephemeral messages.
 * Should run every minute to ensure timely deletion of expired messages.
 *
 * Features:
 * - Batch deletion for efficiency (100 messages at a time)
 * - Logs deletion counts and affected channels
 * - Handles errors gracefully with retry support
 * - Supports dry-run mode for testing
 *
 * @module lib/jobs/handlers/message-cleanup
 * @version 1.0.0
 */

import { apolloClient } from "@/lib/apollo-client";
import { getEphemeralMessageService } from "@/services/messages/ephemeral.service";
import { createLogger } from "@/lib/logger";
import { addJob, getSchedulerService } from "@/services/jobs";

const log = createLogger("MessageCleanupJob");

// ============================================================================
// TYPES
// ============================================================================

export interface MessageCleanupResult {
  success: boolean;
  totalDeleted: number;
  batchesProcessed: number;
  affectedChannels: string[];
  duration: number;
  errors: string[];
}

export interface MessageCleanupOptions {
  batchSize?: number;
  maxBatches?: number;
  dryRun?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_BATCHES = 10; // Process at most 1000 messages per run
const CLEANUP_INTERVAL = 60000; // 1 minute in ms

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

/**
 * Clean up expired messages
 *
 * Runs in batches to avoid overwhelming the database.
 * Continues until no more expired messages are found or max batches reached.
 *
 * @param options Configuration options
 * @returns Cleanup result with statistics
 */
export async function cleanupExpiredMessages(
  options: MessageCleanupOptions = {},
): Promise<MessageCleanupResult> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    maxBatches = DEFAULT_MAX_BATCHES,
    dryRun = false,
  } = options;

  const startTime = Date.now();
  const result: MessageCleanupResult = {
    success: true,
    totalDeleted: 0,
    batchesProcessed: 0,
    affectedChannels: [],
    duration: 0,
    errors: [],
  };

  log.info("Starting message cleanup job", { batchSize, maxBatches, dryRun });

  try {
    const ephemeralService = getEphemeralMessageService(apolloClient);
    const channelSet = new Set<string>();

    // Process batches
    for (let batch = 0; batch < maxBatches; batch++) {
      try {
        if (dryRun) {
          // In dry-run mode, just count expired messages
          const expiredResult =
            await ephemeralService.getExpiredMessages(batchSize);

          if (!expiredResult.success || !expiredResult.data) {
            result.errors.push(
              `Batch ${batch + 1}: Failed to get expired messages`,
            );
            continue;
          }

          const { messages, totalExpiredCount } = expiredResult.data;

          if (messages.length === 0) {
            log.debug("No more expired messages found", { batch: batch + 1 });
            break;
          }

          result.totalDeleted += messages.length;
          messages.forEach((m) => channelSet.add(m.channelId));

          log.info("Dry run: Would delete messages", {
            batch: batch + 1,
            count: messages.length,
            totalRemaining: totalExpiredCount - messages.length,
          });

          // In dry-run, stop after first batch to avoid counting same messages
          break;
        } else {
          // Actually delete expired messages
          const deleteResult =
            await ephemeralService.deleteExpiredMessages(batchSize);

          if (!deleteResult.success || !deleteResult.data) {
            result.errors.push(
              `Batch ${batch + 1}: Failed to delete expired messages`,
            );
            continue;
          }

          const { deletedCount, channelIds } = deleteResult.data;

          if (deletedCount === 0) {
            log.debug("No more expired messages to delete", {
              batch: batch + 1,
            });
            break;
          }

          result.totalDeleted += deletedCount;
          result.batchesProcessed++;
          channelIds.forEach((id) => channelSet.add(id));

          log.info("Deleted expired messages", {
            batch: batch + 1,
            deletedCount,
            totalDeleted: result.totalDeleted,
            channelCount: channelIds.length,
          });

          // If we deleted fewer than batch size, we're done
          if (deletedCount < batchSize) {
            break;
          }
        }
      } catch (batchError) {
        const errorMessage =
          batchError instanceof Error ? batchError.message : "Unknown error";
        result.errors.push(`Batch ${batch + 1}: ${errorMessage}`);
        log.error("Batch processing failed", batchError as Error, {
          batch: batch + 1,
        });

        // Continue to next batch despite error
        continue;
      }
    }

    result.affectedChannels = Array.from(channelSet);
    result.duration = Date.now() - startTime;

    if (result.errors.length > 0) {
      result.success = result.totalDeleted > 0; // Partial success if some deleted
    }

    log.info("Message cleanup job completed", {
      success: result.success,
      totalDeleted: result.totalDeleted,
      batchesProcessed: result.batchesProcessed,
      affectedChannels: result.affectedChannels.length,
      duration: result.duration,
      errors: result.errors.length,
      dryRun,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Critical error: ${errorMessage}`);
    result.success = false;
    result.duration = Date.now() - startTime;

    log.error("Message cleanup job failed", error as Error);
    return result;
  }
}

// ============================================================================
// SCHEDULED JOB REGISTRATION
// ============================================================================

/**
 * Queue a cleanup job
 *
 * This queues a cleanup job to be processed by the job queue.
 * Use this for on-demand cleanup or when initializing scheduled cleanup.
 */
export async function queueMessageCleanup(
  options?: MessageCleanupOptions,
): Promise<string | null> {
  try {
    // Use 'messages' as target type since that's what's allowed
    // The handler will specifically handle ephemeral message cleanup
    const { jobId } = await addJob(
      "cleanup-expired",
      {
        targetType: "messages",
        batchSize: options?.batchSize || DEFAULT_BATCH_SIZE,
        olderThanHours: 0, // We use expires_at field instead
        dryRun: options?.dryRun || false,
      },
      {
        queue: "low-priority",
        priority: "low",
        tags: ["cleanup", "messages", "ephemeral"],
        metadata: {
          scheduledBy: "message-cleanup-handler",
          maxBatches: options?.maxBatches || DEFAULT_MAX_BATCHES,
          isEphemeralCleanup: true,
        },
      },
    );

    log.info("Message cleanup job queued", { jobId });
    return jobId;
  } catch (error) {
    log.error("Failed to queue message cleanup job", error as Error);
    return null;
  }
}

/**
 * Start the periodic cleanup scheduler
 *
 * Registers a recurring job that runs every minute to clean up
 * expired ephemeral messages.
 */
export async function startCleanupScheduler(): Promise<{
  success: boolean;
  scheduleId?: string;
  error?: string;
}> {
  try {
    const scheduler = getSchedulerService();

    if (!scheduler.initialized) {
      await scheduler.initialize();
    }

    // Check if schedule already exists
    const existingSchedule = scheduler.getScheduleByName(
      "ephemeral-message-cleanup",
    );
    if (existingSchedule) {
      log.info("Cleanup schedule already exists", {
        scheduleId: existingSchedule.id,
      });
      return { success: true, scheduleId: existingSchedule.id };
    }

    // Create new schedule
    const schedule = await scheduler.createSchedule({
      name: "ephemeral-message-cleanup",
      description: "Periodically clean up expired ephemeral messages",
      cronExpression: "* * * * *", // Every minute
      timezone: "UTC",
      jobType: "cleanup-expired",
      payload: {
        targetType: "messages",
        batchSize: DEFAULT_BATCH_SIZE,
        olderThanHours: 0, // We use expires_at field
        dryRun: false,
      },
      enabled: true,
      metadata: {
        maxBatches: DEFAULT_MAX_BATCHES,
        isEphemeralCleanup: true,
      },
    });

    log.info("Cleanup scheduler started", {
      scheduleId: schedule.scheduleId,
      cronExpression: "* * * * *",
    });

    return { success: true, scheduleId: schedule.scheduleId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to start cleanup scheduler", error as Error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Stop the periodic cleanup scheduler
 */
export async function stopCleanupScheduler(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const scheduler = getSchedulerService();

    if (!scheduler.initialized) {
      return { success: true }; // Nothing to stop
    }

    const existingSchedule = scheduler.getScheduleByName(
      "ephemeral-message-cleanup",
    );
    if (!existingSchedule) {
      return { success: true }; // Already stopped
    }

    const deleted = await scheduler.deleteSchedule(existingSchedule.id);

    if (deleted) {
      log.info("Cleanup scheduler stopped", {
        scheduleId: existingSchedule.id,
      });
      return { success: true };
    }

    return { success: false, error: "Failed to delete schedule" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to stop cleanup scheduler", error as Error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get cleanup scheduler status
 */
export function getCleanupSchedulerStatus(): {
  isRunning: boolean;
  scheduleId?: string;
  lastRun?: Date;
  nextRun?: Date;
} {
  try {
    const scheduler = getSchedulerService();

    if (!scheduler.initialized) {
      return { isRunning: false };
    }

    const schedule = scheduler.getScheduleByName("ephemeral-message-cleanup");

    if (!schedule) {
      return { isRunning: false };
    }

    return {
      isRunning: schedule.enabled,
      scheduleId: schedule.id,
      lastRun: schedule.lastRunAt ? new Date(schedule.lastRunAt) : undefined,
      nextRun: schedule.nextRunAt ? new Date(schedule.nextRunAt) : undefined,
    };
  } catch {
    return { isRunning: false };
  }
}

// ============================================================================
// JOB HANDLER (for queue processing)
// ============================================================================

/**
 * Job handler function for the queue system
 *
 * This is called by the job queue when processing a cleanup-expired-messages job.
 */
export async function handleMessageCleanupJob(payload: {
  batchSize?: number;
  maxBatches?: number;
  dryRun?: boolean;
}): Promise<MessageCleanupResult> {
  return cleanupExpiredMessages({
    batchSize: payload.batchSize,
    maxBatches: payload.maxBatches,
    dryRun: payload.dryRun,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  cleanupExpiredMessages,
  queueMessageCleanup,
  startCleanupScheduler,
  stopCleanupScheduler,
  getCleanupSchedulerStatus,
  handleMessageCleanupJob,
};
