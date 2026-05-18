/**
 * Message Jobs Integration
 *
 * Connects the scheduled messages system to the jobs queue.
 * Handles synchronization between local state and background processing.
 *
 * @module lib/jobs/message-jobs
 * @version 1.0.0
 */

import {
  addJob,
  scheduleMessage as queueScheduleMessage,
  getQueueService,
  type ScheduledMessagePayload,
} from "@/services/jobs";
import {
  useScheduledMessagesStore,
  type ScheduledMessage,
  type CreateScheduledMessageOptions,
} from "@/lib/messages/scheduled-messages";
import { createLogger } from "@/lib/logger";

const log = createLogger("MessageJobs");

// ============================================================================
// Job Queue Integration
// ============================================================================

/**
 * Schedule a message using the job queue
 *
 * This function:
 * 1. Creates a local scheduled message entry
 * 2. Queues a job to send the message at the scheduled time
 * 3. Links the job ID to the scheduled message for tracking
 */
export async function scheduleMessageWithQueue(
  options: CreateScheduledMessageOptions,
): Promise<{
  scheduledMessage: ScheduledMessage;
  jobId: string;
} | null> {
  const store = useScheduledMessagesStore.getState();

  try {
    // Calculate delay
    const scheduledAt =
      typeof options.scheduledAt === "number"
        ? options.scheduledAt
        : options.scheduledAt.getTime();

    const delay = scheduledAt - Date.now();

    if (delay < 60000) {
      log.warn("Schedule time too close, minimum is 1 minute");
      return null;
    }

    // Create local scheduled message entry
    const scheduledMessage = store.addMessage(options);

    log.debug("Created local scheduled message", {
      messageId: scheduledMessage.id,
      scheduledAt: new Date(scheduledAt).toISOString(),
    });

    // Queue the job
    const { jobId } = await addJob<ScheduledMessagePayload>(
      "scheduled-message",
      {
        scheduledMessageId: scheduledMessage.id,
        channelId: options.channelId,
        userId: options.userId,
        content: options.content,
        threadId: options.threadId,
        replyToId: options.replyToId,
        attachments: options.attachments?.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          url: a.url,
        })),
      },
      {
        delay,
        queue: "scheduled",
        priority: "normal",
        tags: [
          "scheduled-message",
          `channel:${options.channelId}`,
          `user:${options.userId}`,
        ],
        metadata: {
          scheduledMessageId: scheduledMessage.id,
          scheduledAt: new Date(scheduledAt).toISOString(),
          channelId: options.channelId,
          userId: options.userId,
          recurrence: options.recurrence,
        },
        jobId: scheduledMessage.id, // Use message ID for deduplication
      },
    );

    log.info("Scheduled message queued", {
      messageId: scheduledMessage.id,
      jobId,
      delay,
    });

    return {
      scheduledMessage,
      jobId,
    };
  } catch (error) {
    log.error("Failed to schedule message with queue", error);
    return null;
  }
}

/**
 * Cancel a scheduled message and its associated job
 */
export async function cancelScheduledMessageWithQueue(
  messageId: string,
): Promise<boolean> {
  const store = useScheduledMessagesStore.getState();

  try {
    // Cancel local scheduled message
    const cancelled = store.cancelMessage(messageId);
    if (!cancelled) {
      log.warn("Failed to cancel local scheduled message", { messageId });
      return false;
    }

    // Cancel the job (message ID is used as job ID)
    try {
      const queueService = getQueueService();
      if (queueService.initialized) {
        await queueService.cancelJob(messageId, "scheduled");
      }
    } catch (jobError) {
      // Job may have already been processed or not exist
      log.debug("Could not cancel job (may already be processed)", {
        messageId,
        error: jobError,
      });
    }

    log.info("Scheduled message cancelled", { messageId });
    return true;
  } catch (error) {
    log.error("Failed to cancel scheduled message", error);
    return false;
  }
}

/**
 * Update a scheduled message and reschedule the job
 */
export async function updateScheduledMessageWithQueue(
  messageId: string,
  updates: {
    content?: string;
    scheduledAt?: Date | number;
  },
): Promise<boolean> {
  const store = useScheduledMessagesStore.getState();

  try {
    const message = store.getMessage(messageId);
    if (!message) {
      log.warn("Scheduled message not found", { messageId });
      return false;
    }

    // Update local message
    const updated = store.updateMessage(messageId, updates);
    if (!updated) {
      log.warn("Failed to update local scheduled message", { messageId });
      return false;
    }

    // If schedule time changed, cancel old job and create new one
    if (updates.scheduledAt !== undefined) {
      const newScheduledAt =
        typeof updates.scheduledAt === "number"
          ? updates.scheduledAt
          : updates.scheduledAt.getTime();

      const newDelay = newScheduledAt - Date.now();

      // Cancel old job
      try {
        const queueService = getQueueService();
        if (queueService.initialized) {
          await queueService.cancelJob(messageId, "scheduled");
        }
      } catch {
        // Ignore cancellation errors
      }

      // Create new job with updated schedule
      await addJob<ScheduledMessagePayload>(
        "scheduled-message",
        {
          scheduledMessageId: messageId,
          channelId: message.channelId,
          userId: message.userId,
          content: updates.content || message.content,
          threadId: message.threadId,
          replyToId: message.replyToId,
          attachments: message.attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            url: a.url,
          })),
        },
        {
          delay: newDelay,
          queue: "scheduled",
          priority: "normal",
          tags: [
            "scheduled-message",
            `channel:${message.channelId}`,
            `user:${message.userId}`,
          ],
          metadata: {
            scheduledMessageId: messageId,
            scheduledAt: new Date(newScheduledAt).toISOString(),
            channelId: message.channelId,
            userId: message.userId,
            recurrence: message.recurrence,
          },
          jobId: messageId,
        },
      );

      log.info("Scheduled message rescheduled", { messageId, newDelay });
    }

    return true;
  } catch (error) {
    log.error("Failed to update scheduled message", error);
    return false;
  }
}

// ============================================================================
// Notification Jobs
// ============================================================================

/**
 * Queue notification for message delivery
 */
export async function queueMessageNotification(
  messageId: string,
  channelId: string,
  senderId: string,
  recipientIds: string[],
  options?: {
    title?: string;
    body?: string;
    isMention?: boolean;
    isThreadReply?: boolean;
  },
): Promise<string | null> {
  try {
    const { jobId } = await addJob(
      "send-notification",
      {
        notificationType: "push",
        userIds: recipientIds,
        title: options?.title || "New message",
        body: options?.body || "You have a new message",
        url: `/chat/${channelId}?message=${messageId}`,
        data: {
          messageId,
          channelId,
          senderId,
          isMention: options?.isMention || false,
          isThreadReply: options?.isThreadReply || false,
        },
      },
      {
        queue: "high-priority",
        priority: options?.isMention ? "high" : "normal",
        tags: [
          "message-notification",
          `channel:${channelId}`,
          options?.isMention ? "mention" : "message",
        ],
      },
    );

    log.debug("Message notification queued", {
      jobId,
      messageId,
      recipientCount: recipientIds.length,
    });
    return jobId;
  } catch (error) {
    log.error("Failed to queue message notification", error);
    return null;
  }
}

// ============================================================================
// Search Indexing Jobs
// ============================================================================

/**
 * Queue message indexing for search
 */
export async function queueMessageIndexing(
  messageIds: string[],
  operation: "index" | "update" | "delete" = "index",
  channelId?: string,
): Promise<string | null> {
  if (messageIds.length === 0) return null;

  try {
    const { jobId } = await addJob(
      "index-search",
      {
        operation,
        entityType: "message",
        entityIds: messageIds,
        channelId,
      },
      {
        queue: "low-priority",
        priority: "low",
        tags: [
          "search-index",
          "message",
          operation,
          channelId ? `channel:${channelId}` : "",
        ].filter(Boolean),
      },
    );

    log.debug("Message indexing queued", {
      jobId,
      operation,
      count: messageIds.length,
    });
    return jobId;
  } catch (error) {
    log.error("Failed to queue message indexing", error);
    return null;
  }
}

/**
 * Queue full channel reindex
 */
export async function queueChannelReindex(
  channelId: string,
): Promise<string | null> {
  try {
    const { jobId } = await addJob(
      "index-search",
      {
        operation: "reindex",
        entityType: "message",
        entityIds: [],
        channelId,
        fullReindex: false,
      },
      {
        queue: "low-priority",
        priority: "low",
        tags: ["search-index", "channel-reindex", `channel:${channelId}`],
      },
    );

    log.info("Channel reindex queued", { jobId, channelId });
    return jobId;
  } catch (error) {
    log.error("Failed to queue channel reindex", error);
    return null;
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  scheduleMessageWithQueue,
  cancelScheduledMessageWithQueue,
  updateScheduledMessageWithQueue,
  queueMessageNotification,
  queueMessageIndexing,
  queueChannelReindex,
};
