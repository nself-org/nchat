/**
 * Message Receipt Service
 *
 * Service for managing message delivery receipts (sent/delivered/read).
 * Provides methods for marking messages as delivered or read,
 * querying receipt status, and managing channel read states.
 *
 * @module services/messages/receipt.service
 * @version 1.0.0
 */

import {
  ApolloClient,
  NormalizedCacheObject,
  ApolloError,
} from "@apollo/client";
import { logger } from "@/lib/logger";
import type { APIResponse } from "@/types/api";
import { realtimeClient } from "@/services/realtime/realtime-client";

import {
  GET_MESSAGE_RECEIPTS,
  GET_USER_RECEIPT,
  GET_UNREAD_MESSAGE_COUNT,
  GET_MESSAGES_RECEIPTS,
  GET_CHANNEL_READ_STATUS,
  MARK_MESSAGE_DELIVERED,
  MARK_RECEIPT_READ,
  BULK_MARK_DELIVERED,
  MARK_CHANNEL_READ,
  CREATE_SENT_RECEIPTS,
  transformReceipt,
  transformReceipts,
  buildReceiptSummary,
  getHighestStatus,
  type DeliveryReceipt,
  type ReceiptSummary,
  type ReceiptStatus,
} from "@/graphql/messages/receipts";

// ============================================================================
// TYPES
// ============================================================================

export interface ReceiptServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
}

export interface GetReceiptsResult {
  receipts: DeliveryReceipt[];
  summary: ReceiptSummary;
}

export interface MarkDeliveredResult {
  receipt: DeliveryReceipt;
}

export interface MarkReadResult {
  receipt: DeliveryReceipt;
}

export interface MarkChannelReadResult {
  affectedRows: number;
  lastReadAt: Date;
}

export interface UnreadCountResult {
  count: number;
  channelId: string;
}

export interface CreateSentReceiptsInput {
  messageId: string;
  recipientIds: string[];
}

export interface BulkMarkDeliveredInput {
  messageId: string;
  userId: string;
}

export interface ChannelReadStatus {
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// Re-export types for consumers
export type { DeliveryReceipt, ReceiptSummary, ReceiptStatus };

// ============================================================================
// RECEIPT SERVICE CLASS
// ============================================================================

export class ReceiptService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(config: ReceiptServiceConfig) {
    this.client = config.apolloClient;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get all receipts for a specific message
   */
  async getReceiptsForMessage(
    messageId: string,
  ): Promise<APIResponse<GetReceiptsResult>> {
    try {
      logger.debug("ReceiptService.getReceiptsForMessage", { messageId });

      const { data, error } = await this.client.query({
        query: GET_MESSAGE_RECEIPTS,
        variables: { messageId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const receipts = transformReceipts(data.nchat_message_receipts);
      const totalCount =
        data.nchat_message_receipts_aggregate?.aggregate?.count || 0;
      const deliveredCount = data.delivered?.aggregate?.count || 0;
      const readCount = data.read?.aggregate?.count || 0;

      const summary = buildReceiptSummary(
        messageId,
        receipts,
        totalCount,
        deliveredCount,
        readCount,
      );

      return {
        success: true,
        data: { receipts, summary },
      };
    } catch (error) {
      logger.error(
        "ReceiptService.getReceiptsForMessage failed",
        error as Error,
        { messageId },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get receipt status for a specific user and message
   */
  async getUserReceipt(
    messageId: string,
    userId: string,
  ): Promise<APIResponse<DeliveryReceipt | null>> {
    try {
      logger.debug("ReceiptService.getUserReceipt", { messageId, userId });

      const { data, error } = await this.client.query({
        query: GET_USER_RECEIPT,
        variables: { messageId, userId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const receipt = data.nchat_message_receipts?.[0]
        ? transformReceipt(data.nchat_message_receipts[0])
        : null;

      return {
        success: true,
        data: receipt,
      };
    } catch (error) {
      logger.error("ReceiptService.getUserReceipt failed", error as Error, {
        messageId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get unread message count for a user in a channel
   */
  async getUnreadCount(
    channelId: string,
    userId: string,
  ): Promise<APIResponse<UnreadCountResult>> {
    try {
      logger.debug("ReceiptService.getUnreadCount", { channelId, userId });

      const { data, error } = await this.client.query({
        query: GET_UNREAD_MESSAGE_COUNT,
        variables: { channelId, userId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const count = data.nchat_messages_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: { count, channelId },
      };
    } catch (error) {
      logger.error("ReceiptService.getUnreadCount failed", error as Error, {
        channelId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get receipts for multiple messages (batch query)
   */
  async getReceiptsForMessages(
    messageIds: string[],
  ): Promise<APIResponse<Map<string, DeliveryReceipt[]>>> {
    try {
      logger.debug("ReceiptService.getReceiptsForMessages", {
        count: messageIds.length,
      });

      const { data, error } = await this.client.query({
        query: GET_MESSAGES_RECEIPTS,
        variables: { messageIds },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const receipts = transformReceipts(data.nchat_message_receipts);

      // Group by message ID
      const receiptsByMessage = new Map<string, DeliveryReceipt[]>();
      for (const receipt of receipts) {
        const existing = receiptsByMessage.get(receipt.messageId) || [];
        existing.push(receipt);
        receiptsByMessage.set(receipt.messageId, existing);
      }

      return {
        success: true,
        data: receiptsByMessage,
      };
    } catch (error) {
      logger.error(
        "ReceiptService.getReceiptsForMessages failed",
        error as Error,
        {
          count: messageIds.length,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get read status for all channel members
   */
  async getChannelReadStatus(
    channelId: string,
  ): Promise<APIResponse<ChannelReadStatus[]>> {
    try {
      logger.debug("ReceiptService.getChannelReadStatus", { channelId });

      const { data, error } = await this.client.query({
        query: GET_CHANNEL_READ_STATUS,
        variables: { channelId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const statuses: ChannelReadStatus[] = (
        data.nchat_channel_members || []
      ).map((member: Record<string, unknown>) => ({
        userId: member.user_id as string,
        lastReadMessageId: member.last_read_message_id as string | null,
        lastReadAt: member.last_read_at
          ? new Date(member.last_read_at as string)
          : null,
        user: {
          id: (member.user as Record<string, unknown>)?.id as string,
          username: (member.user as Record<string, unknown>)
            ?.username as string,
          displayName:
            ((member.user as Record<string, unknown>)
              ?.display_name as string) ||
            ((member.user as Record<string, unknown>)?.username as string),
          avatarUrl: (member.user as Record<string, unknown>)?.avatar_url as
            | string
            | undefined,
        },
      }));

      return {
        success: true,
        data: statuses,
      };
    } catch (error) {
      logger.error(
        "ReceiptService.getChannelReadStatus failed",
        error as Error,
        { channelId },
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Mark a message as delivered
   * Called when a message reaches the client
   */
  async markDelivered(
    messageId: string,
    userId: string,
  ): Promise<APIResponse<MarkDeliveredResult>> {
    try {
      logger.debug("ReceiptService.markDelivered", { messageId, userId });

      const { data, errors } = await this.client.mutate({
        mutation: MARK_MESSAGE_DELIVERED,
        variables: { messageId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const receipt = transformReceipt(data.insert_nchat_message_receipts_one);

      // Broadcast receipt update via realtime
      this.broadcastReceiptUpdate(receipt);

      logger.info("ReceiptService.markDelivered success", {
        messageId,
        userId,
      });

      return {
        success: true,
        data: { receipt },
      };
    } catch (error) {
      logger.error("ReceiptService.markDelivered failed", error as Error, {
        messageId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Mark a message as read
   * Called when a message is viewed by the user
   */
  async markRead(
    messageId: string,
    userId: string,
  ): Promise<APIResponse<MarkReadResult>> {
    try {
      logger.debug("ReceiptService.markRead", { messageId, userId });

      const { data, errors } = await this.client.mutate({
        mutation: MARK_RECEIPT_READ,
        variables: { messageId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const receipt = transformReceipt(data.insert_nchat_message_receipts_one);

      // Broadcast receipt update via realtime
      this.broadcastReceiptUpdate(receipt);

      logger.info("ReceiptService.markRead success", { messageId, userId });

      return {
        success: true,
        data: { receipt },
      };
    } catch (error) {
      logger.error("ReceiptService.markRead failed", error as Error, {
        messageId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Bulk mark multiple messages as delivered
   */
  async bulkMarkDelivered(
    inputs: BulkMarkDeliveredInput[],
  ): Promise<APIResponse<{ affectedRows: number }>> {
    try {
      logger.debug("ReceiptService.bulkMarkDelivered", {
        count: inputs.length,
      });

      const objects = inputs.map((input) => ({
        message_id: input.messageId,
        user_id: input.userId,
        status: "delivered",
        delivered_at: "now()",
      }));

      const { data, errors } = await this.client.mutate({
        mutation: BULK_MARK_DELIVERED,
        variables: { objects },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const affectedRows =
        data.insert_nchat_message_receipts?.affected_rows || 0;

      logger.info("ReceiptService.bulkMarkDelivered success", { affectedRows });

      return {
        success: true,
        data: { affectedRows },
      };
    } catch (error) {
      logger.error("ReceiptService.bulkMarkDelivered failed", error as Error, {
        count: inputs.length,
      });
      return this.handleError(error);
    }
  }

  /**
   * Mark all messages in a channel as read for a user
   */
  async markChannelRead(
    channelId: string,
    userId: string,
  ): Promise<APIResponse<MarkChannelReadResult>> {
    try {
      logger.debug("ReceiptService.markChannelRead", { channelId, userId });

      const { data, errors } = await this.client.mutate({
        mutation: MARK_CHANNEL_READ,
        variables: { channelId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const memberUpdate = data.update_nchat_channel_members?.returning?.[0];
      const receiptUpdate =
        data.update_nchat_message_receipts?.affected_rows || 0;

      const result: MarkChannelReadResult = {
        affectedRows: receiptUpdate,
        lastReadAt: memberUpdate?.last_read_at
          ? new Date(memberUpdate.last_read_at)
          : new Date(),
      };

      // Broadcast channel read update via realtime
      this.broadcastChannelRead(channelId, userId);

      logger.info("ReceiptService.markChannelRead success", {
        channelId,
        userId,
        affectedRows: result.affectedRows,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("ReceiptService.markChannelRead failed", error as Error, {
        channelId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Create initial sent receipts for message recipients
   * Called when a new message is sent
   */
  async createSentReceipts(
    input: CreateSentReceiptsInput,
  ): Promise<APIResponse<{ affectedRows: number }>> {
    try {
      const { messageId, recipientIds } = input;
      logger.debug("ReceiptService.createSentReceipts", {
        messageId,
        recipientCount: recipientIds.length,
      });

      const objects = recipientIds.map((userId) => ({
        message_id: messageId,
        user_id: userId,
        status: "sent",
      }));

      const { data, errors } = await this.client.mutate({
        mutation: CREATE_SENT_RECEIPTS,
        variables: { objects },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const affectedRows =
        data.insert_nchat_message_receipts?.affected_rows || 0;

      logger.info("ReceiptService.createSentReceipts success", {
        messageId,
        affectedRows,
      });

      return {
        success: true,
        data: { affectedRows },
      };
    } catch (error) {
      logger.error("ReceiptService.createSentReceipts failed", error as Error, {
        messageId: input.messageId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // REALTIME BROADCASTING
  // ==========================================================================

  /**
   * Broadcast receipt update to message sender
   */
  private broadcastReceiptUpdate(receipt: DeliveryReceipt): void {
    if (!realtimeClient.isConnected) {
      logger.debug(
        "ReceiptService.broadcastReceiptUpdate skipped - not connected",
      );
      return;
    }

    try {
      realtimeClient.emit("receipt:update", {
        messageId: receipt.messageId,
        userId: receipt.userId,
        status: receipt.status,
        deliveredAt: receipt.deliveredAt?.toISOString(),
        readAt: receipt.readAt?.toISOString(),
      });
    } catch (error) {
      logger.warn("ReceiptService.broadcastReceiptUpdate failed", { error });
    }
  }

  /**
   * Broadcast channel read event
   */
  private broadcastChannelRead(channelId: string, userId: string): void {
    if (!realtimeClient.isConnected) {
      logger.debug(
        "ReceiptService.broadcastChannelRead skipped - not connected",
      );
      return;
    }

    try {
      realtimeClient.emit("channel:read", {
        channelId,
        userId,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("ReceiptService.broadcastChannelRead failed", { error });
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get the overall receipt status for a message
   * Returns the "highest" status among all receipts
   */
  getMessageStatus(receipts: DeliveryReceipt[]): ReceiptStatus {
    return getHighestStatus(receipts);
  }

  /**
   * Handle errors and return API response
   */
  private handleError<T>(error: unknown): APIResponse<T> {
    const apolloError = error as ApolloError;

    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        status: 500,
        message: apolloError.message || "An error occurred",
        details: apolloError.graphQLErrors?.[0]?.message,
      },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let receiptServiceInstance: ReceiptService | null = null;

/**
 * Get or create the receipt service singleton
 */
export function getReceiptService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ReceiptService {
  if (!receiptServiceInstance) {
    receiptServiceInstance = new ReceiptService({ apolloClient });
  }
  return receiptServiceInstance;
}

/**
 * Create a new receipt service instance (for testing)
 */
export function createReceiptService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ReceiptService {
  return new ReceiptService({ apolloClient });
}

export default ReceiptService;
