/**
 * Scheduled Messages Job Handler
 *
 * Handles processing of scheduled messages when they become due.
 * Integrates with the ScheduledMessageService for actual message delivery.
 *
 * Features:
 * - Exponential backoff retry (3 max retries)
 * - Status tracking (sent/failed)
 * - Batch processing for due messages
 * - Error handling with detailed logging
 *
 * @module lib/jobs/handlers/scheduled-messages
 * @version 1.0.0
 */

import { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import { getScheduledMessageService } from "@/services/messages/scheduled.service";
import type {
  JobResult,
  ScheduledMessagePayload,
  ScheduledMessageResult,
} from "@/services/jobs/types";

const log = createLogger("ScheduledMessagesHandler");

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum retries for scheduled message delivery
 */
export const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (in milliseconds)
 */
export const BASE_RETRY_DELAY = 5000;

/**
 * Batch size for processing due messages
 */
export const BATCH_SIZE = 100;

// ============================================================================
// TYPES
// ============================================================================

interface JobData {
  type: string;
  payload: ScheduledMessagePayload;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
}

export interface ProcessScheduledMessagesResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// INDIVIDUAL MESSAGE HANDLER
// ============================================================================

/**
 * Process a single scheduled message job
 * Called by the job processor when a scheduled message job is ready
 */
export async function processScheduledMessageJob(
  job: Job<JobData>,
): Promise<JobResult<ScheduledMessageResult>> {
  const payload = job.data.payload;
  const jobLog = createLogger(`ScheduledMessage:${job.id}`);

  jobLog.info("Processing scheduled message job", {
    scheduledMessageId: payload.scheduledMessageId,
    channelId: payload.channelId,
    userId: payload.userId,
    attemptsMade: job.attemptsMade,
  });

  try {
    // Update progress
    await job.updateProgress(10);

    // Get the scheduled message service
    const service = getScheduledMessageService();

    // Process the scheduled message (send it)
    await job.updateProgress(30);
    const result = await service.processScheduledMessage(
      payload.scheduledMessageId,
    );

    await job.updateProgress(90);

    if (!result.success) {
      // Check if we should retry
      const shouldRetry = job.attemptsMade < MAX_RETRIES;

      if (shouldRetry) {
        jobLog.warn("Scheduled message failed, will retry", {
          scheduledMessageId: payload.scheduledMessageId,
          error: result.error,
          attemptsMade: job.attemptsMade,
          maxRetries: MAX_RETRIES,
        });

        // Throw error to trigger retry with exponential backoff
        throw new Error(result.error || "Failed to send scheduled message");
      }

      jobLog.error("Scheduled message failed permanently", undefined, {
        scheduledMessageId: payload.scheduledMessageId,
        error: result.error,
        attemptsMade: job.attemptsMade,
      });

      return {
        success: false,
        error: result.error,
        metadata: {
          scheduledMessageId: payload.scheduledMessageId,
          channelId: payload.channelId,
          attemptsMade: job.attemptsMade,
        },
      };
    }

    await job.updateProgress(100);

    jobLog.info("Scheduled message sent successfully", {
      scheduledMessageId: payload.scheduledMessageId,
      messageId: result.messageId,
      channelId: payload.channelId,
    });

    return {
      success: true,
      data: {
        messageId: result.messageId!,
        channelId: payload.channelId,
        sentAt: new Date(),
      },
      metadata: {
        scheduledMessageId: payload.scheduledMessageId,
        attemptsMade: job.attemptsMade,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    jobLog.error("Error processing scheduled message", error as Error, {
      scheduledMessageId: payload.scheduledMessageId,
      channelId: payload.channelId,
    });

    // Throw to trigger retry if attempts remaining
    throw error;
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process all due scheduled messages
 * Can be called periodically to catch any messages that might have been missed
 * (e.g., if the job system was down when messages were due)
 */
export async function processScheduledMessages(): Promise<ProcessScheduledMessagesResult> {
  log.info("Starting batch processing of scheduled messages");

  const result: ProcessScheduledMessagesResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const service = getScheduledMessageService();

    // Get all due messages
    const dueMessagesResult = await service.getDueMessages(BATCH_SIZE);

    if (!dueMessagesResult.success || !dueMessagesResult.data) {
      log.error("Failed to get due messages", undefined, {
        error: dueMessagesResult.error,
      });
      return result;
    }

    const dueMessages = dueMessagesResult.data;
    log.info("Found due messages", { count: dueMessages.length });

    // Process each message
    for (const message of dueMessages) {
      result.processed++;

      try {
        // Skip if already processed (status != pending)
        if (message.status !== "pending") {
          log.debug("Skipping non-pending message", {
            id: message.id,
            status: message.status,
          });
          result.skipped++;
          continue;
        }

        // Check if max retries exceeded
        if (message.retryCount >= message.maxRetries) {
          log.warn("Message exceeded max retries", {
            id: message.id,
            retryCount: message.retryCount,
            maxRetries: message.maxRetries,
          });
          result.skipped++;
          continue;
        }

        // Process the message
        const processResult = await service.processScheduledMessage(message.id);

        if (processResult.success) {
          result.succeeded++;
          log.debug("Message processed successfully", {
            id: message.id,
            messageId: processResult.messageId,
          });
        } else {
          result.failed++;
          result.errors.push({
            id: message.id,
            error: processResult.error || "Unknown error",
          });
          log.warn("Message processing failed", {
            id: message.id,
            error: processResult.error,
            retryCount: message.retryCount + 1,
          });
        }
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push({
          id: message.id,
          error: errorMessage,
        });
        log.error("Unexpected error processing message", error as Error, {
          id: message.id,
        });
      }
    }

    log.info("Batch processing completed", {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
    });

    return result;
  } catch (error) {
    log.error("Batch processing failed", error as Error);
    return result;
  }
}

// ============================================================================
// RETRY CALCULATION
// ============================================================================

/**
 * Calculate exponential backoff delay for retries
 * @param attemptsMade Number of attempts already made
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attemptsMade: number): number {
  // Exponential backoff: 5s, 10s, 20s, 40s, etc.
  const delay = BASE_RETRY_DELAY * Math.pow(2, attemptsMade);
  // Cap at 5 minutes
  return Math.min(delay, 5 * 60 * 1000);
}

/**
 * Get backoff configuration for BullMQ
 */
export function getBackoffConfig() {
  return {
    type: "exponential" as const,
    delay: BASE_RETRY_DELAY,
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old completed/failed scheduled messages
 * Called periodically to remove old records from the database
 */
export async function cleanupOldScheduledMessages(
  olderThanDays: number = 30,
): Promise<{ deletedCount: number }> {
  log.info("Cleaning up old scheduled messages", { olderThanDays });

  // This would be implemented to delete old sent/failed/cancelled messages
  // from the database to prevent table bloat

  // For now, return a placeholder
  return { deletedCount: 0 };
}

// ============================================================================
// REGISTRATION HELPER
// ============================================================================

/**
 * Register the scheduled message processor with the processor service
 * Call this during application initialization
 */
export function registerScheduledMessageProcessor(processorService: {
  registerProcessor: (
    type: string,
    processor: (job: Job<JobData>) => Promise<JobResult<unknown>>,
  ) => void;
}): void {
  processorService.registerProcessor(
    "scheduled-message",
    processScheduledMessageJob as (
      job: Job<JobData>,
    ) => Promise<JobResult<unknown>>,
  );
  log.info("Scheduled message processor registered");
}

export default {
  processScheduledMessageJob,
  processScheduledMessages,
  calculateRetryDelay,
  getBackoffConfig,
  cleanupOldScheduledMessages,
  registerScheduledMessageProcessor,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  BATCH_SIZE,
};
