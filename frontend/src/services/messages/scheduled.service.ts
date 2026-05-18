/**
 * Scheduled Message Service
 *
 * Service for managing scheduled messages with database persistence.
 * Integrates with the jobs system for delayed message delivery.
 *
 * @module services/messages/scheduled.service
 * @version 1.0.0
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { createLogger } from "@/lib/logger";
import { getApolloClient } from "@/lib/apollo-client";
import { addJob, getQueueService } from "@/services/jobs";
import type { APIResponse } from "@/types/api";
import type { ScheduledMessagePayload } from "@/services/jobs/types";

import {
  GET_SCHEDULED_MESSAGES,
  GET_SCHEDULED_MESSAGE,
  GET_DUE_SCHEDULED_MESSAGES,
  GET_SCHEDULED_MESSAGES_COUNT,
  INSERT_SCHEDULED_MESSAGE,
  UPDATE_SCHEDULED_MESSAGE,
  DELETE_SCHEDULED_MESSAGE,
  UPDATE_SCHEDULED_MESSAGE_STATUS,
  INCREMENT_SCHEDULED_MESSAGE_RETRY,
  transformScheduledMessage,
  transformScheduledMessages,
  type ScheduledMessage,
  type ScheduledMessageStatus,
} from "@/graphql/messages/scheduled";

// Response data key - using singular to match table name
const SCHEDULED_MESSAGE_KEY = "nchat_scheduled_message";
const SCHEDULED_MESSAGE_PK_KEY = "nchat_scheduled_message_by_pk";
const SCHEDULED_MESSAGE_AGGREGATE_KEY = "nchat_scheduled_message_aggregate";

import { SEND_MESSAGE } from "@/graphql/messages/mutations";
import { getFormatterService } from "./formatter.service";

const log = createLogger("ScheduledMessageService");

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduleMessageInput {
  userId: string;
  channelId: string;
  content: string;
  scheduledAt: Date;
  threadId?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  maxRetries?: number;
}

export interface GetScheduledMessagesOptions {
  userId: string;
  status?: ScheduledMessageStatus;
  channelId?: string;
  isSent?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetScheduledMessagesResult {
  messages: ScheduledMessage[];
  totalCount: number;
  hasMore: boolean;
}

export interface UpdateScheduledMessageInput {
  content?: string;
  scheduledAt?: Date;
  threadId?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

export interface ScheduledMessagesCount {
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export interface ProcessScheduledMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// SCHEDULED MESSAGE SERVICE CLASS
// ============================================================================

export class ScheduledMessageService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(client?: ApolloClient<NormalizedCacheObject>) {
    this.client = client || getApolloClient();
  }

  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Schedule a message for future delivery
   */
  async scheduleMessage(
    input: ScheduleMessageInput,
  ): Promise<APIResponse<ScheduledMessage>> {
    const {
      userId,
      channelId,
      content,
      scheduledAt,
      threadId,
      attachments,
      maxRetries = 3,
    } = input;

    try {
      log.debug("Scheduling message", {
        userId,
        channelId,
        scheduledAt: scheduledAt.toISOString(),
      });

      // Validate scheduled time is at least 1 minute in the future
      const minScheduleTime = Date.now() + 60000;
      if (scheduledAt.getTime() < minScheduleTime) {
        return {
          success: false,
          error: {
            code: "INVALID_INPUT",
            status: 400,
            message: "Scheduled time must be at least 1 minute in the future",
          },
        };
      }

      // Validate content length
      if (!content.trim()) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: "Message content cannot be empty",
          },
        };
      }

      if (content.length > 4000) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: "Message content too long (max 4000 characters)",
          },
        };
      }

      // Insert scheduled message into database
      const { data, errors } = await this.client.mutate({
        mutation: INSERT_SCHEDULED_MESSAGE,
        variables: {
          userId,
          channelId,
          content,
          scheduledAt: scheduledAt.toISOString(),
          threadId,
          attachments: attachments ? JSON.stringify(attachments) : null,
          maxRetries,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const scheduledMessage = transformScheduledMessage(
        data.insert_nchat_scheduled_message_one,
      );

      // Queue the job for processing at the scheduled time
      const delay = scheduledAt.getTime() - Date.now();
      await addJob<ScheduledMessagePayload>(
        "scheduled-message",
        {
          scheduledMessageId: scheduledMessage.id,
          channelId,
          userId,
          content,
          threadId,
          attachments,
        },
        {
          delay,
          queue: "scheduled",
          priority: "normal",
          maxRetries,
          tags: ["scheduled-message", `channel:${channelId}`, `user:${userId}`],
          metadata: {
            scheduledAt: scheduledAt.toISOString(),
            channelId,
            userId,
          },
          jobId: `scheduled-msg-${scheduledMessage.id}`,
        },
      );

      log.info("Message scheduled successfully", {
        id: scheduledMessage.id,
        scheduledAt: scheduledAt.toISOString(),
      });

      return {
        success: true,
        data: scheduledMessage,
      };
    } catch (error) {
      log.error("Failed to schedule message", error as Error, {
        userId,
        channelId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get scheduled messages for a user with pagination and filtering
   */
  async getScheduledMessages(
    options: GetScheduledMessagesOptions,
  ): Promise<APIResponse<GetScheduledMessagesResult>> {
    const { userId, status, channelId, limit = 50, offset = 0 } = options;

    try {
      log.debug("Getting scheduled messages", {
        userId,
        status,
        channelId,
        limit,
        offset,
      });

      const { data, error } = await this.client.query({
        query: GET_SCHEDULED_MESSAGES,
        variables: {
          userId,
          status,
          channelId,
          limit,
          offset,
        },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = transformScheduledMessages(
        data[SCHEDULED_MESSAGE_KEY] || [],
      );
      const totalCount =
        data[SCHEDULED_MESSAGE_AGGREGATE_KEY]?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          messages,
          totalCount,
          hasMore: offset + messages.length < totalCount,
        },
      };
    } catch (error) {
      log.error("Failed to get scheduled messages", error as Error, { userId });
      return this.handleError(error);
    }
  }

  /**
   * Get a single scheduled message by ID
   */
  async getScheduledMessage(
    id: string,
  ): Promise<APIResponse<ScheduledMessage | null>> {
    try {
      log.debug("Getting scheduled message", { id });

      const { data, error } = await this.client.query({
        query: GET_SCHEDULED_MESSAGE,
        variables: { id },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const message = data[SCHEDULED_MESSAGE_PK_KEY]
        ? transformScheduledMessage(data[SCHEDULED_MESSAGE_PK_KEY])
        : null;

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      log.error("Failed to get scheduled message", error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Get count of scheduled messages by status for a user
   */
  async getScheduledMessagesCount(
    userId: string,
  ): Promise<APIResponse<ScheduledMessagesCount>> {
    try {
      log.debug("Getting scheduled messages count", { userId });

      const { data, error } = await this.client.query({
        query: GET_SCHEDULED_MESSAGES_COUNT,
        variables: { userId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          pending: data.pending?.aggregate?.count || 0,
          sent: data.sent?.aggregate?.count || 0,
          failed: data.failed?.aggregate?.count || 0,
          cancelled: data.cancelled?.aggregate?.count || 0,
        },
      };
    } catch (error) {
      log.error("Failed to get scheduled messages count", error as Error, {
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get messages that are due for sending
   */
  async getDueMessages(
    limit: number = 100,
  ): Promise<APIResponse<ScheduledMessage[]>> {
    try {
      log.debug("Getting due messages", { limit });

      const { data, error } = await this.client.query({
        query: GET_DUE_SCHEDULED_MESSAGES,
        variables: {
          currentTime: new Date().toISOString(),
          limit,
        },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = transformScheduledMessages(
        data[SCHEDULED_MESSAGE_KEY] || [],
      );

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      log.error("Failed to get due messages", error as Error);
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Update a scheduled message (only allowed for pending messages)
   */
  async updateScheduledMessage(
    id: string,
    userId: string,
    updates: UpdateScheduledMessageInput,
  ): Promise<APIResponse<ScheduledMessage>> {
    try {
      log.debug("Updating scheduled message", {
        id,
        updates: Object.keys(updates),
      });

      // Get the existing message to verify ownership and status
      const existingResult = await this.getScheduledMessage(id);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Scheduled message not found",
          },
        };
      }

      const existing = existingResult.data;

      // Verify ownership
      if (existing.userId !== userId) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            status: 403,
            message: "You can only update your own scheduled messages",
          },
        };
      }

      // Only allow updates to pending messages
      if (existing.status !== "pending") {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: `Cannot update a ${existing.status} scheduled message`,
          },
        };
      }

      // Validate new scheduled time if provided
      if (updates.scheduledAt) {
        const minScheduleTime = Date.now() + 60000;
        if (updates.scheduledAt.getTime() < minScheduleTime) {
          return {
            success: false,
            error: {
              code: "INVALID_INPUT",
              status: 400,
              message: "Scheduled time must be at least 1 minute in the future",
            },
          };
        }
      }

      // Validate content if provided
      if (updates.content !== undefined) {
        if (!updates.content.trim()) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              status: 400,
              message: "Message content cannot be empty",
            },
          };
        }

        if (updates.content.length > 4000) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              status: 400,
              message: "Message content too long (max 4000 characters)",
            },
          };
        }
      }

      // Update in database
      const { data, errors } = await this.client.mutate({
        mutation: UPDATE_SCHEDULED_MESSAGE,
        variables: {
          id,
          content: updates.content,
          scheduledAt: updates.scheduledAt?.toISOString(),
          threadId: updates.threadId,
          attachments: updates.attachments
            ? JSON.stringify(updates.attachments)
            : undefined,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const updatedMessage = transformScheduledMessage(
        data.update_nchat_scheduled_message_by_pk,
      );

      // If schedule time changed, update the job
      if (updates.scheduledAt) {
        const queueService = getQueueService();
        const jobId = `scheduled-msg-${id}`;

        // Cancel existing job
        await queueService.cancelJob(jobId, "scheduled");

        // Create new job with updated delay
        const delay = updates.scheduledAt.getTime() - Date.now();
        await addJob<ScheduledMessagePayload>(
          "scheduled-message",
          {
            scheduledMessageId: id,
            channelId: updatedMessage.channelId,
            userId: updatedMessage.userId,
            content: updates.content || existing.content,
            threadId: updates.threadId || existing.threadId,
            attachments: updates.attachments || existing.attachments,
          },
          {
            delay,
            queue: "scheduled",
            priority: "normal",
            maxRetries: existing.maxRetries,
            tags: [
              "scheduled-message",
              `channel:${updatedMessage.channelId}`,
              `user:${userId}`,
            ],
            metadata: {
              scheduledAt: updates.scheduledAt.toISOString(),
              channelId: updatedMessage.channelId,
              userId,
            },
            jobId,
          },
        );
      }

      log.info("Scheduled message updated", { id });

      return {
        success: true,
        data: updatedMessage,
      };
    } catch (error) {
      log.error("Failed to update scheduled message", error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(
    id: string,
    userId: string,
  ): Promise<APIResponse<{ cancelled: boolean }>> {
    try {
      log.debug("Cancelling scheduled message", { id });

      // Get the existing message to verify ownership and status
      const existingResult = await this.getScheduledMessage(id);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Scheduled message not found",
          },
        };
      }

      const existing = existingResult.data;

      // Verify ownership
      if (existing.userId !== userId) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            status: 403,
            message: "You can only cancel your own scheduled messages",
          },
        };
      }

      // Only allow cancellation of pending messages
      if (existing.status !== "pending") {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: `Cannot cancel a ${existing.status} scheduled message`,
          },
        };
      }

      // Update status to cancelled
      const { errors } = await this.client.mutate({
        mutation: DELETE_SCHEDULED_MESSAGE,
        variables: { id },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      // Cancel the queued job
      const queueService = getQueueService();
      await queueService.cancelJob(`scheduled-msg-${id}`, "scheduled");

      log.info("Scheduled message cancelled", { id });

      return {
        success: true,
        data: { cancelled: true },
      };
    } catch (error) {
      log.error("Failed to cancel scheduled message", error as Error, { id });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // JOB PROCESSING
  // ==========================================================================

  /**
   * Process a scheduled message (send it)
   * Called by the job handler when the scheduled time arrives
   */
  async processScheduledMessage(
    id: string,
  ): Promise<ProcessScheduledMessageResult> {
    try {
      log.debug("Processing scheduled message", { id });

      // Get the scheduled message
      const messageResult = await this.getScheduledMessage(id);
      if (!messageResult.success || !messageResult.data) {
        log.warn("Scheduled message not found for processing", { id });
        return { success: false, error: "Scheduled message not found" };
      }

      const scheduledMessage = messageResult.data;

      // Verify it's still pending
      if (scheduledMessage.status !== "pending") {
        log.warn("Scheduled message already processed", {
          id,
          status: scheduledMessage.status,
        });
        return {
          success: false,
          error: `Message already ${scheduledMessage.status}`,
        };
      }

      // Format the message content
      const formatter = getFormatterService();
      const formatted = formatter.formatMessage(scheduledMessage.content);

      // Send the message
      const { data, errors } = await this.client.mutate({
        mutation: SEND_MESSAGE,
        variables: {
          channelId: scheduledMessage.channelId,
          userId: scheduledMessage.userId,
          content: scheduledMessage.content,
          contentHtml: formatted.html,
          type: "text",
          threadId: scheduledMessage.threadId,
          mentions: formatted.mentions,
          metadata: {
            scheduled: true,
            scheduledAt: scheduledMessage.scheduledAt.toISOString(),
          },
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const sentMessage = data.insert_nchat_messages_one;

      // Update scheduled message status to sent
      await this.client.mutate({
        mutation: UPDATE_SCHEDULED_MESSAGE_STATUS,
        variables: {
          id,
          status: "sent",
          sentAt: new Date().toISOString(),
        },
      });

      log.info("Scheduled message sent successfully", {
        scheduledMessageId: id,
        messageId: sentMessage.id,
      });

      return {
        success: true,
        messageId: sentMessage.id,
      };
    } catch (error) {
      log.error("Failed to process scheduled message", error as Error, { id });

      // Update retry count and possibly mark as failed
      await this.handleProcessingError(id, error as Error);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle processing error - increment retry count or mark as failed
   */
  private async handleProcessingError(id: string, error: Error): Promise<void> {
    try {
      // Increment retry count
      const { data } = await this.client.mutate({
        mutation: INCREMENT_SCHEDULED_MESSAGE_RETRY,
        variables: {
          id,
          errorMessage: error.message,
        },
      });

      const result = data?.update_nchat_scheduled_messages_by_pk;
      if (result && result.retry_count >= result.max_retries) {
        // Max retries reached, mark as failed
        await this.client.mutate({
          mutation: UPDATE_SCHEDULED_MESSAGE_STATUS,
          variables: {
            id,
            status: "failed",
            errorMessage: `Max retries (${result.max_retries}) exceeded: ${error.message}`,
          },
        });

        log.warn("Scheduled message marked as failed after max retries", {
          id,
          retryCount: result.retry_count,
          maxRetries: result.max_retries,
        });
      }
    } catch (updateError) {
      log.error("Failed to update retry count", updateError as Error, { id });
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Handle errors and return API response
   */
  private handleError<T>(error: unknown): APIResponse<T> {
    const err = error as Error;

    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        status: 500,
        message: err.message || "An error occurred",
      },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let scheduledMessageServiceInstance: ScheduledMessageService | null = null;

/**
 * Get or create the scheduled message service singleton
 */
export function getScheduledMessageService(
  client?: ApolloClient<NormalizedCacheObject>,
): ScheduledMessageService {
  if (!scheduledMessageServiceInstance) {
    scheduledMessageServiceInstance = new ScheduledMessageService(client);
  }
  return scheduledMessageServiceInstance;
}

/**
 * Create a new scheduled message service instance (for testing)
 */
export function createScheduledMessageService(
  client: ApolloClient<NormalizedCacheObject>,
): ScheduledMessageService {
  return new ScheduledMessageService(client);
}

export default ScheduledMessageService;
