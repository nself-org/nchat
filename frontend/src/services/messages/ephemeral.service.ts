/**
 * Ephemeral Message Service
 *
 * Manages disappearing messages with server-side TTL enforcement.
 * Provides methods to set, extend, and clear TTL on messages,
 * as well as channel-wide default TTL settings.
 *
 * @module services/messages/ephemeral
 * @version 1.0.0
 */

import {
  ApolloClient,
  NormalizedCacheObject,
  ApolloError,
} from "@apollo/client";
import { logger } from "@/lib/logger";
import type { APIResponse } from "@/types/api";

import {
  GET_EPHEMERAL_MESSAGES,
  GET_EXPIRED_MESSAGES,
  GET_MESSAGE_TTL,
  GET_CHANNEL_TTL,
  SET_MESSAGE_TTL,
  UPDATE_CHANNEL_DEFAULT_TTL,
  DELETE_EXPIRED_MESSAGES,
  CLEAR_MESSAGE_TTL,
  EXTEND_MESSAGE_TTL,
  calculateExpiresAt,
  calculateRemainingSeconds,
  validateTTL,
  transformEphemeralMessage,
  type EphemeralMessagesResult,
  type ExpiredMessagesResult,
  type SetMessageTTLResult,
  type UpdateChannelTTLResult,
  type DeleteExpiredMessagesResult,
  type ClearMessageTTLResult,
  type GetMessageTTLResult,
  type GetChannelTTLResult,
} from "@/graphql/messages/ephemeral";

// ============================================================================
// TYPES
// ============================================================================

export interface EphemeralMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  ttlSeconds: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  isExpired: boolean;
  remainingSeconds: number | null;
}

export interface ChannelTTLInfo {
  id: string;
  name: string;
  defaultTTLSeconds: number | null;
  createdBy: string;
}

export interface MessageTTLInfo {
  id: string;
  ttlSeconds: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  userId: string;
  channelId: string;
  channel: ChannelTTLInfo;
  remainingSeconds: number | null;
  isExpired: boolean;
}

export interface ExpiredMessage {
  id: string;
  channelId: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface GetEphemeralMessagesResult {
  messages: EphemeralMessage[];
  totalCount: number;
  hasMore: boolean;
}

export interface GetExpiredMessagesResult {
  messages: ExpiredMessage[];
  totalExpiredCount: number;
}

export interface DeleteExpiredResult {
  deletedCount: number;
  deletedIds: string[];
  channelIds: string[];
}

export interface EphemeralMessageServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
}

// ============================================================================
// EPHEMERAL MESSAGE SERVICE CLASS
// ============================================================================

export class EphemeralMessageService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(config: EphemeralMessageServiceConfig) {
    this.client = config.apolloClient;
  }

  // ==========================================================================
  // TTL MANAGEMENT
  // ==========================================================================

  /**
   * Set TTL on an existing message
   *
   * @param messageId - ID of the message
   * @param ttlSeconds - TTL in seconds (30 to 604800)
   * @param userId - ID of user making the request (for authorization)
   */
  async setMessageTTL(
    messageId: string,
    ttlSeconds: number,
    userId: string,
  ): Promise<APIResponse<{ id: string; ttlSeconds: number; expiresAt: Date }>> {
    try {
      logger.debug("EphemeralMessageService.setMessageTTL", {
        messageId,
        ttlSeconds,
        userId,
      });

      // Validate TTL
      const validation = validateTTL(ttlSeconds);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: validation.error || "Invalid TTL value",
          },
        };
      }

      // Check if user owns the message
      const messageCheck = await this.getMessageTTL(messageId);
      if (!messageCheck.success || !messageCheck.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Message not found",
          },
        };
      }

      if (messageCheck.data.userId !== userId) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            status: 403,
            message: "Only the message author can set TTL",
          },
        };
      }

      // Calculate expires_at
      const expiresAt = calculateExpiresAt(ttlSeconds);

      const { data, errors } = await this.client.mutate<SetMessageTTLResult>({
        mutation: SET_MESSAGE_TTL,
        variables: {
          messageId,
          ttlSeconds,
          expiresAt: expiresAt.toISOString(),
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      if (!data?.update_nchat_messages_by_pk) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Message not found",
          },
        };
      }

      logger.info("EphemeralMessageService.setMessageTTL success", {
        messageId,
        ttlSeconds,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        success: true,
        data: {
          id: data.update_nchat_messages_by_pk.id,
          ttlSeconds: data.update_nchat_messages_by_pk.ttl_seconds!,
          expiresAt: new Date(data.update_nchat_messages_by_pk.expires_at!),
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.setMessageTTL failed",
        error as Error,
        {
          messageId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Set default TTL for a channel
   * Only channel owners/admins can set this
   *
   * @param channelId - ID of the channel
   * @param ttlSeconds - Default TTL in seconds (null to disable)
   * @param userId - ID of user making the request (for authorization)
   */
  async setChannelDefaultTTL(
    channelId: string,
    ttlSeconds: number | null,
    userId: string,
  ): Promise<
    APIResponse<{ id: string; name: string; defaultTTLSeconds: number | null }>
  > {
    try {
      logger.debug("EphemeralMessageService.setChannelDefaultTTL", {
        channelId,
        ttlSeconds,
        userId,
      });

      // Validate TTL if provided
      if (ttlSeconds !== null) {
        const validation = validateTTL(ttlSeconds);
        if (!validation.valid) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              status: 400,
              message: validation.error || "Invalid TTL value",
            },
          };
        }
      }

      // Check channel ownership/admin rights
      const channelCheck = await this.getChannelTTL(channelId);
      if (!channelCheck.success || !channelCheck.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Channel not found",
          },
        };
      }

      // Note: In production, this should check against channel_members role
      // For now, we check if user is the channel creator
      if (channelCheck.data.createdBy !== userId) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            status: 403,
            message: "Only channel owners/admins can set default TTL",
          },
        };
      }

      const { data, errors } = await this.client.mutate<UpdateChannelTTLResult>(
        {
          mutation: UPDATE_CHANNEL_DEFAULT_TTL,
          variables: {
            channelId,
            ttlSeconds,
          },
        },
      );

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      if (!data?.update_nchat_channels_by_pk) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Channel not found",
          },
        };
      }

      logger.info("EphemeralMessageService.setChannelDefaultTTL success", {
        channelId,
        ttlSeconds,
      });

      return {
        success: true,
        data: {
          id: data.update_nchat_channels_by_pk.id,
          name: data.update_nchat_channels_by_pk.name,
          defaultTTLSeconds:
            data.update_nchat_channels_by_pk.default_message_ttl_seconds,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.setChannelDefaultTTL failed",
        error as Error,
        {
          channelId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Extend the TTL of a message by additional seconds
   *
   * @param messageId - ID of the message
   * @param additionalSeconds - Additional seconds to add to current TTL
   */
  async extendMessageTTL(
    messageId: string,
    additionalSeconds: number,
  ): Promise<
    APIResponse<{ id: string; expiresAt: Date; remainingSeconds: number }>
  > {
    try {
      logger.debug("EphemeralMessageService.extendMessageTTL", {
        messageId,
        additionalSeconds,
      });

      if (additionalSeconds <= 0) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: "Additional seconds must be positive",
          },
        };
      }

      // Get current message TTL info
      const messageInfo = await this.getMessageTTL(messageId);
      if (!messageInfo.success || !messageInfo.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Message not found",
          },
        };
      }

      if (!messageInfo.data.expiresAt) {
        return {
          success: false,
          error: {
            code: "BAD_REQUEST",
            status: 400,
            message: "Message does not have TTL set",
          },
        };
      }

      // Calculate new expiry (from current expiry or now, whichever is later)
      const baseTime = new Date(
        Math.max(messageInfo.data.expiresAt.getTime(), Date.now()),
      );
      const newExpiresAt = new Date(
        baseTime.getTime() + additionalSeconds * 1000,
      );

      // Validate total TTL doesn't exceed maximum
      const totalTTL = Math.floor(
        (newExpiresAt.getTime() - messageInfo.data.createdAt.getTime()) / 1000,
      );
      const validation = validateTTL(totalTTL);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: `Extended TTL would exceed maximum: ${validation.error}`,
          },
        };
      }

      const { data, errors } = await this.client.mutate({
        mutation: EXTEND_MESSAGE_TTL,
        variables: {
          messageId,
          expiresAt: newExpiresAt.toISOString(),
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("EphemeralMessageService.extendMessageTTL success", {
        messageId,
        additionalSeconds,
        newExpiresAt: newExpiresAt.toISOString(),
      });

      return {
        success: true,
        data: {
          id: data.update_nchat_messages_by_pk.id,
          expiresAt: newExpiresAt,
          remainingSeconds: calculateRemainingSeconds(newExpiresAt),
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.extendMessageTTL failed",
        error as Error,
        {
          messageId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Clear TTL from a message (make it permanent)
   *
   * @param messageId - ID of the message
   */
  async clearMessageTTL(
    messageId: string,
  ): Promise<APIResponse<{ id: string; ttlSeconds: null; expiresAt: null }>> {
    try {
      logger.debug("EphemeralMessageService.clearMessageTTL", { messageId });

      const { data, errors } = await this.client.mutate<ClearMessageTTLResult>({
        mutation: CLEAR_MESSAGE_TTL,
        variables: { messageId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      if (!data?.update_nchat_messages_by_pk) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Message not found",
          },
        };
      }

      logger.info("EphemeralMessageService.clearMessageTTL success", {
        messageId,
      });

      return {
        success: true,
        data: {
          id: data.update_nchat_messages_by_pk.id,
          ttlSeconds: null,
          expiresAt: null,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.clearMessageTTL failed",
        error as Error,
        {
          messageId,
        },
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Get ephemeral messages for a channel
   */
  async getEphemeralMessages(
    channelId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<APIResponse<GetEphemeralMessagesResult>> {
    const { limit = 50, offset = 0 } = options;

    try {
      logger.debug("EphemeralMessageService.getEphemeralMessages", {
        channelId,
        limit,
        offset,
      });

      const { data, error } = await this.client.query<EphemeralMessagesResult>({
        query: GET_EPHEMERAL_MESSAGES,
        variables: { channelId, limit, offset },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = data.nchat_messages.map(transformEphemeralMessage);
      const totalCount = data.nchat_messages_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          messages,
          totalCount,
          hasMore: offset + messages.length < totalCount,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.getEphemeralMessages failed",
        error as Error,
        {
          channelId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get messages that have expired and are ready for deletion
   */
  async getExpiredMessages(
    limit: number = 100,
  ): Promise<APIResponse<GetExpiredMessagesResult>> {
    try {
      logger.debug("EphemeralMessageService.getExpiredMessages", { limit });

      const now = new Date().toISOString();

      const { data, error } = await this.client.query<ExpiredMessagesResult>({
        query: GET_EXPIRED_MESSAGES,
        variables: { now, limit },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages: ExpiredMessage[] = data.nchat_messages.map((m) => ({
        id: m.id,
        channelId: m.channel_id,
        userId: m.user_id,
        expiresAt: new Date(m.expires_at),
        createdAt: new Date(m.created_at),
      }));

      const totalExpiredCount =
        data.nchat_messages_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          messages,
          totalExpiredCount,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.getExpiredMessages failed",
        error as Error,
      );
      return this.handleError(error);
    }
  }

  /**
   * Get TTL information for a specific message
   */
  async getMessageTTL(
    messageId: string,
  ): Promise<APIResponse<MessageTTLInfo | null>> {
    try {
      logger.debug("EphemeralMessageService.getMessageTTL", { messageId });

      const { data, error } = await this.client.query<GetMessageTTLResult>({
        query: GET_MESSAGE_TTL,
        variables: { messageId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      if (!data.nchat_messages_by_pk) {
        return {
          success: true,
          data: null,
        };
      }

      const message = data.nchat_messages_by_pk;
      const expiresAt = message.expires_at
        ? new Date(message.expires_at)
        : null;

      return {
        success: true,
        data: {
          id: message.id,
          ttlSeconds: message.ttl_seconds,
          expiresAt,
          createdAt: new Date(message.created_at),
          userId: message.user_id,
          channelId: message.channel_id,
          channel: {
            id: message.channel.id,
            name: message.channel.name,
            defaultTTLSeconds: message.channel.default_message_ttl_seconds,
            createdBy: message.channel.created_by,
          },
          remainingSeconds: expiresAt
            ? calculateRemainingSeconds(expiresAt)
            : null,
          isExpired: expiresAt ? expiresAt.getTime() <= Date.now() : false,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.getMessageTTL failed",
        error as Error,
        {
          messageId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get default TTL setting for a channel
   */
  async getChannelTTL(
    channelId: string,
  ): Promise<APIResponse<ChannelTTLInfo | null>> {
    try {
      logger.debug("EphemeralMessageService.getChannelTTL", { channelId });

      const { data, error } = await this.client.query<GetChannelTTLResult>({
        query: GET_CHANNEL_TTL,
        variables: { channelId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      if (!data.nchat_channels_by_pk) {
        return {
          success: true,
          data: null,
        };
      }

      const channel = data.nchat_channels_by_pk;

      return {
        success: true,
        data: {
          id: channel.id,
          name: channel.name,
          defaultTTLSeconds: channel.default_message_ttl_seconds,
          createdBy: channel.created_by,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.getChannelTTL failed",
        error as Error,
        {
          channelId,
        },
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // CLEANUP OPERATIONS
  // ==========================================================================

  /**
   * Delete expired messages in bulk
   * Used by the cleanup job for periodic cleanup
   */
  async deleteExpiredMessages(
    limit: number = 100,
  ): Promise<APIResponse<DeleteExpiredResult>> {
    try {
      logger.debug("EphemeralMessageService.deleteExpiredMessages", { limit });

      const now = new Date().toISOString();

      const { data, errors } =
        await this.client.mutate<DeleteExpiredMessagesResult>({
          mutation: DELETE_EXPIRED_MESSAGES,
          variables: { now, limit },
        });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const result = data?.delete_nchat_messages;
      const deletedIds = result?.returning?.map((m) => m.id) || [];
      const channelIds = [
        ...new Set(result?.returning?.map((m) => m.channel_id) || []),
      ];

      logger.info("EphemeralMessageService.deleteExpiredMessages success", {
        deletedCount: result?.affected_rows || 0,
        channelCount: channelIds.length,
      });

      return {
        success: true,
        data: {
          deletedCount: result?.affected_rows || 0,
          deletedIds,
          channelIds,
        },
      };
    } catch (error) {
      logger.error(
        "EphemeralMessageService.deleteExpiredMessages failed",
        error as Error,
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

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

let ephemeralServiceInstance: EphemeralMessageService | null = null;

/**
 * Get or create the ephemeral message service singleton
 */
export function getEphemeralMessageService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): EphemeralMessageService {
  if (!ephemeralServiceInstance) {
    ephemeralServiceInstance = new EphemeralMessageService({ apolloClient });
  }
  return ephemeralServiceInstance;
}

/**
 * Create a new ephemeral message service instance (for testing)
 */
export function createEphemeralMessageService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): EphemeralMessageService {
  return new EphemeralMessageService({ apolloClient });
}

export default EphemeralMessageService;
