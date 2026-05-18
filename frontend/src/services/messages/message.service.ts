/**
 * Message Service
 *
 * Core CRUD operations for messages using GraphQL.
 * Provides a clean abstraction over the GraphQL layer.
 */

import {
  ApolloClient,
  NormalizedCacheObject,
  ApolloError,
} from "@apollo/client";
import { logger } from "@/lib/logger";
import type {
  Message,
  Reaction,
  Attachment,
  MessageType,
} from "@/types/message";
import type { APIResponse, PaginationMeta } from "@/types/api";

import {
  GET_MESSAGES,
  GET_MESSAGE,
  GET_THREAD_MESSAGES,
  GET_PINNED_MESSAGES,
  GET_MESSAGES_AROUND,
  SEARCH_MESSAGES,
  GET_USER_MENTIONS,
} from "@/graphql/messages/queries";

import {
  SEND_MESSAGE,
  UPDATE_MESSAGE,
  SOFT_DELETE_MESSAGE,
  HARD_DELETE_MESSAGE,
  BULK_DELETE_MESSAGES,
  PIN_MESSAGE,
  UNPIN_MESSAGE,
  ADD_REACTION,
  REMOVE_REACTION,
  FORWARD_MESSAGE,
  BOOKMARK_MESSAGE,
  REMOVE_BOOKMARK,
  MARK_MESSAGE_READ,
  UPDATE_CHANNEL_LAST_MESSAGE,
} from "@/graphql/messages/mutations";

import {
  GET_MESSAGE_EDIT_HISTORY,
  GET_MESSAGE_EDIT_BY_ID,
  INSERT_MESSAGE_EDIT,
  transformMessageEdit,
  transformMessageEdits,
  generateChangeSummary,
  type MessageEdit,
  type GetEditHistoryResult as GraphQLEditHistoryResult,
  type GetEditByIdResult,
  type InsertMessageEditResult,
} from "@/graphql/messages/edit-history";

import {
  GET_CHANNEL_TTL,
  SEND_MESSAGE_WITH_TTL,
  calculateExpiresAt,
  validateTTL,
  type GetChannelTTLResult,
  type SendMessageWithTTLResult,
} from "@/graphql/messages/ephemeral";

// Re-export MessageEdit type for consumers
export type { MessageEdit } from "@/graphql/messages/edit-history";

import { logAuditEvent } from "@/lib/audit";
import { getFormatterService } from "./formatter.service";

// ============================================================================
// TYPES
// ============================================================================

export interface GetMessagesOptions {
  channelId: string;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
}

export interface GetMessagesResult {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
}

export interface SendMessageInput {
  channelId: string;
  userId: string;
  content: string;
  type?: string;
  threadId?: string;
  parentMessageId?: string;
  mentions?: string[];
  mentionedRoles?: string[];
  mentionedChannels?: string[];
  metadata?: Record<string, unknown>;
  /** Optional TTL in seconds (30-604800). If set, message will auto-expire. */
  ttlSeconds?: number;
}

export interface UpdateMessageInput {
  id: string;
  content: string;
  mentions?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchMessagesOptions {
  channelId?: string;
  query: string;
  limit?: number;
  offset?: number;
  userId?: string;
  hasAttachments?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetEditHistoryOptions {
  messageId: string;
  limit?: number;
  offset?: number;
}

export interface EditHistoryResult {
  edits: MessageEdit[];
  totalCount: number;
  hasMore: boolean;
}

export interface RestoreVersionInput {
  messageId: string;
  editId: string;
  restoredBy: string;
}

export interface MessageServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
}

// ============================================================================
// MESSAGE SERVICE CLASS
// ============================================================================

export class MessageService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(config: MessageServiceConfig) {
    this.client = config.apolloClient;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get messages for a channel with pagination
   */
  async getMessages(
    options: GetMessagesOptions,
  ): Promise<APIResponse<GetMessagesResult>> {
    const { channelId, limit = 50, offset = 0, before, after } = options;

    try {
      logger.debug("MessageService.getMessages", { channelId, limit, offset });

      const { data, error } = await this.client.query({
        query: GET_MESSAGES,
        variables: { channelId, limit, offset, before, after },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = this.transformMessages(data.nchat_messages);
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
      logger.error("MessageService.getMessages failed", error as Error, {
        channelId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get a single message by ID
   */
  async getMessage(id: string): Promise<APIResponse<Message | null>> {
    try {
      logger.debug("MessageService.getMessage", { id });

      const { data, error } = await this.client.query({
        query: GET_MESSAGE,
        variables: { id },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const message = data.nchat_messages_by_pk
        ? this.transformMessage(data.nchat_messages_by_pk)
        : null;

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error("MessageService.getMessage failed", error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Get messages for a thread
   */
  async getThreadMessages(
    threadId: string,
    options: { limit?: number; offset?: number; before?: string } = {},
  ): Promise<APIResponse<GetMessagesResult>> {
    const { limit = 50, offset = 0, before } = options;

    try {
      logger.debug("MessageService.getThreadMessages", {
        threadId,
        limit,
        offset,
      });

      const { data, error } = await this.client.query({
        query: GET_THREAD_MESSAGES,
        variables: { threadId, limit, offset, before },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = this.transformMessages(data.nchat_messages);
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
      logger.error("MessageService.getThreadMessages failed", error as Error, {
        threadId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get pinned messages for a channel
   */
  async getPinnedMessages(channelId: string): Promise<APIResponse<Message[]>> {
    try {
      logger.debug("MessageService.getPinnedMessages", { channelId });

      const { data, error } = await this.client.query({
        query: GET_PINNED_MESSAGES,
        variables: { channelId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = data.nchat_pinned_messages.map(
        (pin: { message: unknown }) =>
          this.transformMessage(pin.message as Record<string, unknown>),
      );

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      logger.error("MessageService.getPinnedMessages failed", error as Error, {
        channelId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get messages around a specific message (for jump-to functionality)
   */
  async getMessagesAround(
    channelId: string,
    messageId: string,
    limit: number = 25,
  ): Promise<
    APIResponse<{ before: Message[]; target: Message | null; after: Message[] }>
  > {
    try {
      logger.debug("MessageService.getMessagesAround", {
        channelId,
        messageId,
        limit,
      });

      const { data, error } = await this.client.query({
        query: GET_MESSAGES_AROUND,
        variables: { channelId, messageId, limit },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          before: this.transformMessages(data.before || []),
          target: data.target ? this.transformMessage(data.target) : null,
          after: this.transformMessages(data.after || []),
        },
      };
    } catch (error) {
      logger.error("MessageService.getMessagesAround failed", error as Error, {
        channelId,
        messageId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    options: SearchMessagesOptions,
  ): Promise<APIResponse<GetMessagesResult>> {
    const {
      query,
      channelId,
      limit = 20,
      offset = 0,
      userId,
      dateFrom,
      dateTo,
    } = options;

    try {
      logger.debug("MessageService.searchMessages", { query, channelId });

      const { data, error } = await this.client.query({
        query: SEARCH_MESSAGES,
        variables: {
          query: `%${query}%`,
          channelId,
          limit,
          offset,
          userId,
          dateFrom,
          dateTo,
        },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = this.transformMessages(data.nchat_messages);
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
      logger.error("MessageService.searchMessages failed", error as Error, {
        query,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get user mentions
   */
  async getUserMentions(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<APIResponse<GetMessagesResult>> {
    const { limit = 20, offset = 0 } = options;

    try {
      logger.debug("MessageService.getUserMentions", { userId, limit, offset });

      const { data, error } = await this.client.query({
        query: GET_USER_MENTIONS,
        variables: { userId, limit, offset },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const messages = this.transformMessages(data.nchat_messages);
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
      logger.error("MessageService.getUserMentions failed", error as Error, {
        userId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Send a new message
   *
   * Supports optional TTL (Time-To-Live) for ephemeral/disappearing messages.
   * If ttlSeconds is provided, the message will auto-expire.
   * If the channel has a default TTL and no explicit ttlSeconds is provided,
   * the channel's default TTL will be applied.
   */
  async sendMessage(input: SendMessageInput): Promise<APIResponse<Message>> {
    try {
      logger.debug("MessageService.sendMessage", {
        channelId: input.channelId,
        userId: input.userId,
        hasThread: !!input.threadId,
        hasTTL: !!input.ttlSeconds,
      });

      // Format markdown content to sanitized HTML
      const formatter = getFormatterService();
      const formatted = formatter.formatMessage(input.content);

      // Determine TTL settings
      let ttlSeconds: number | null = null;
      let expiresAt: string | null = null;

      if (input.ttlSeconds !== undefined) {
        // Explicit TTL provided - validate it
        const validation = validateTTL(input.ttlSeconds);
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
        ttlSeconds = input.ttlSeconds;
        expiresAt = calculateExpiresAt(input.ttlSeconds).toISOString();
      } else {
        // Check if channel has default TTL
        try {
          const { data: channelData } =
            await this.client.query<GetChannelTTLResult>({
              query: GET_CHANNEL_TTL,
              variables: { channelId: input.channelId },
              fetchPolicy: "network-only",
            });

          if (channelData?.nchat_channels_by_pk?.default_message_ttl_seconds) {
            ttlSeconds =
              channelData.nchat_channels_by_pk.default_message_ttl_seconds;
            expiresAt = calculateExpiresAt(ttlSeconds).toISOString();
            logger.debug(
              "MessageService.sendMessage applying channel default TTL",
              {
                channelId: input.channelId,
                ttlSeconds,
              },
            );
          }
        } catch (channelError) {
          // Log but don't fail - just send without TTL
          logger.warn(
            "MessageService.sendMessage failed to check channel TTL",
            {
              channelId: input.channelId,
              error: (channelError as Error).message,
            },
          );
        }
      }

      // Choose mutation based on whether TTL is needed
      const mutation =
        ttlSeconds !== null ? SEND_MESSAGE_WITH_TTL : SEND_MESSAGE;
      const variables = {
        channelId: input.channelId,
        userId: input.userId,
        content: input.content,
        contentHtml: formatted.html,
        type: input.type || "text",
        threadId: input.threadId,
        parentMessageId: input.parentMessageId,
        mentions: input.mentions || formatted.mentions,
        mentionedRoles: input.mentionedRoles,
        mentionedChannels: input.mentionedChannels,
        metadata: input.metadata,
        ...(ttlSeconds !== null && { ttlSeconds, expiresAt }),
      };

      const { data, errors } = await this.client.mutate({
        mutation,
        variables,
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const message = this.transformMessage(data.insert_nchat_messages_one);

      // Update channel's last message
      await this.updateChannelLastMessage(input.channelId, message.id);

      logger.info("MessageService.sendMessage success", {
        messageId: message.id,
        hasTTL: ttlSeconds !== null,
        ttlSeconds,
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error("MessageService.sendMessage failed", error as Error, {
        channelId: input.channelId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Update an existing message with edit history tracking
   */
  async updateMessage(
    input: UpdateMessageInput & { editorId?: string },
  ): Promise<APIResponse<Message>> {
    try {
      logger.debug("MessageService.updateMessage", { id: input.id });

      // Fetch current message content for edit history
      const currentMessageResult = await this.getMessage(input.id);
      if (!currentMessageResult.success || !currentMessageResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Message not found",
          },
        };
      }

      const currentMessage = currentMessageResult.data;
      const previousContent = currentMessage.content;
      const editorId = input.editorId || currentMessage.userId;

      // Only record edit history if content actually changed
      if (previousContent !== input.content) {
        // Record edit history before updating
        const changeSummary = generateChangeSummary(
          previousContent,
          input.content,
        );

        await this.recordEditHistory({
          messageId: input.id,
          editorId,
          previousContent,
          newContent: input.content,
          changeSummary,
        });

        // Log audit event for the edit
        await logAuditEvent({
          action: "edit",
          actor: editorId,
          category: "message",
          resource: { type: "message", id: input.id },
          description: `Message edited: ${changeSummary}`,
          metadata: {
            channelId: currentMessage.channelId,
            previousContentLength: previousContent.length,
            newContentLength: input.content.length,
            changeSummary,
          },
        });
      }

      // Format the new content
      const formatter = getFormatterService();
      const formatted = formatter.formatMessage(input.content);

      // Perform the actual update
      const { data, errors } = await this.client.mutate({
        mutation: UPDATE_MESSAGE,
        variables: {
          id: input.id,
          content: input.content,
          contentHtml: formatted.html,
          mentions: input.mentions || formatted.mentions,
          metadata: input.metadata,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const message = this.transformMessage(data.update_nchat_messages_by_pk);

      logger.info("MessageService.updateMessage success", {
        messageId: message.id,
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error("MessageService.updateMessage failed", error as Error, {
        id: input.id,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // EDIT HISTORY OPERATIONS
  // ==========================================================================

  /**
   * Get edit history for a message
   */
  async getEditHistory(
    options: GetEditHistoryOptions,
  ): Promise<APIResponse<EditHistoryResult>> {
    const { messageId, limit = 50, offset = 0 } = options;

    try {
      logger.debug("MessageService.getEditHistory", {
        messageId,
        limit,
        offset,
      });

      const { data, error } = await this.client.query({
        query: GET_MESSAGE_EDIT_HISTORY,
        variables: { messageId, limit, offset },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const edits = transformMessageEdits(data.nchat_message_edits);
      const totalCount =
        data.nchat_message_edits_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          edits,
          totalCount,
          hasMore: offset + edits.length < totalCount,
        },
      };
    } catch (error) {
      logger.error("MessageService.getEditHistory failed", error as Error, {
        messageId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get a specific edit by ID
   */
  async getEditById(editId: string): Promise<APIResponse<MessageEdit | null>> {
    try {
      logger.debug("MessageService.getEditById", { editId });

      const { data, error } = await this.client.query<GetEditByIdResult>({
        query: GET_MESSAGE_EDIT_BY_ID,
        variables: { editId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      if (!data.nchat_message_edits_by_pk) {
        return {
          success: true,
          data: null,
        };
      }

      return {
        success: true,
        data: transformMessageEdit(data.nchat_message_edits_by_pk),
      };
    } catch (error) {
      logger.error("MessageService.getEditById failed", error as Error, {
        editId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Restore a message to a previous version
   * This creates a new edit record and updates the message content
   */
  async restoreVersion(
    input: RestoreVersionInput,
  ): Promise<APIResponse<Message>> {
    const { messageId, editId, restoredBy } = input;

    try {
      logger.debug("MessageService.restoreVersion", {
        messageId,
        editId,
        restoredBy,
      });

      // Get the edit record to restore from
      const editResult = await this.getEditById(editId);
      if (!editResult.success || !editResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Edit record not found",
          },
        };
      }

      const editRecord = editResult.data;

      // Verify the edit belongs to the specified message
      if (editRecord.messageId !== messageId) {
        return {
          success: false,
          error: {
            code: "BAD_REQUEST",
            status: 400,
            message: "Edit record does not belong to the specified message",
          },
        };
      }

      // Get current message content
      const currentMessageResult = await this.getMessage(messageId);
      if (!currentMessageResult.success || !currentMessageResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Message not found",
          },
        };
      }

      const currentContent = currentMessageResult.data.content;
      const contentToRestore = editRecord.previousContent;

      // Record the restoration as an edit
      const changeSummary = `Restored to version from ${editRecord.editedAt.toISOString()}`;
      await this.recordEditHistory({
        messageId,
        editorId: restoredBy,
        previousContent: currentContent,
        newContent: contentToRestore,
        changeSummary,
      });

      // Log audit event for the restoration
      await logAuditEvent({
        action: "edit",
        actor: restoredBy,
        category: "message",
        severity: "info",
        resource: { type: "message", id: messageId },
        description: `Message restored to previous version from ${editRecord.editedAt.toISOString()}`,
        metadata: {
          channelId: currentMessageResult.data.channelId,
          isRestore: true,
          restoredFromEditId: editId,
          restoredFromDate: editRecord.editedAt.toISOString(),
        },
      });

      // Update the message with the restored content
      const { data, errors } = await this.client.mutate({
        mutation: UPDATE_MESSAGE,
        variables: {
          id: messageId,
          content: contentToRestore,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const message = this.transformMessage(data.update_nchat_messages_by_pk);

      logger.info("MessageService.restoreVersion success", {
        messageId,
        editId,
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error("MessageService.restoreVersion failed", error as Error, {
        messageId,
        editId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Record an edit in the edit history
   * Private helper method
   */
  private async recordEditHistory(input: {
    messageId: string;
    editorId: string;
    previousContent: string;
    newContent: string;
    changeSummary?: string;
  }): Promise<void> {
    try {
      const { data, errors } =
        await this.client.mutate<InsertMessageEditResult>({
          mutation: INSERT_MESSAGE_EDIT,
          variables: {
            messageId: input.messageId,
            editorId: input.editorId,
            previousContent: input.previousContent,
            newContent: input.newContent,
            changeSummary: input.changeSummary,
          },
        });

      if (errors && errors.length > 0) {
        logger.warn("Failed to record edit history", {
          messageId: input.messageId,
          error: errors[0].message,
        });
      } else {
        logger.debug("Edit history recorded", {
          messageId: input.messageId,
          editId: data?.insert_nchat_message_edits_one?.id,
        });
      }
    } catch (error) {
      // Log but don't fail the main operation
      logger.warn("Failed to record edit history", {
        messageId: input.messageId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Delete a message (soft delete by default)
   */
  async deleteMessage(
    id: string,
    options: { hard?: boolean } = {},
  ): Promise<APIResponse<{ id: string; deleted: boolean }>> {
    const { hard = false } = options;

    try {
      logger.debug("MessageService.deleteMessage", { id, hard });

      const mutation = hard ? HARD_DELETE_MESSAGE : SOFT_DELETE_MESSAGE;
      const { data, errors } = await this.client.mutate({
        mutation,
        variables: { id },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const result = hard
        ? data.delete_nchat_messages_by_pk
        : data.update_nchat_messages_by_pk;

      logger.info("MessageService.deleteMessage success", {
        messageId: id,
        hard,
      });

      return {
        success: true,
        data: { id: result.id, deleted: true },
      };
    } catch (error) {
      logger.error("MessageService.deleteMessage failed", error as Error, {
        id,
      });
      return this.handleError(error);
    }
  }

  /**
   * Bulk delete messages
   */
  async bulkDeleteMessages(
    ids: string[],
  ): Promise<APIResponse<{ deletedCount: number; deletedIds: string[] }>> {
    try {
      logger.debug("MessageService.bulkDeleteMessages", { count: ids.length });

      const { data, errors } = await this.client.mutate({
        mutation: BULK_DELETE_MESSAGES,
        variables: { ids },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const result = data.update_nchat_messages;

      logger.info("MessageService.bulkDeleteMessages success", {
        deletedCount: result.affected_rows,
      });

      return {
        success: true,
        data: {
          deletedCount: result.affected_rows,
          deletedIds: result.returning.map((m: { id: string }) => m.id),
        },
      };
    } catch (error) {
      logger.error("MessageService.bulkDeleteMessages failed", error as Error, {
        count: ids.length,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // PIN OPERATIONS
  // ==========================================================================

  /**
   * Pin a message
   */
  async pinMessage(
    messageId: string,
    channelId: string,
    userId: string,
  ): Promise<APIResponse<{ pinned: boolean }>> {
    try {
      logger.debug("MessageService.pinMessage", {
        messageId,
        channelId,
        userId,
      });

      const { errors } = await this.client.mutate({
        mutation: PIN_MESSAGE,
        variables: { messageId, channelId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("MessageService.pinMessage success", { messageId });

      return {
        success: true,
        data: { pinned: true },
      };
    } catch (error) {
      logger.error("MessageService.pinMessage failed", error as Error, {
        messageId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    messageId: string,
    channelId: string,
  ): Promise<APIResponse<{ unpinned: boolean }>> {
    try {
      logger.debug("MessageService.unpinMessage", { messageId, channelId });

      const { errors } = await this.client.mutate({
        mutation: UNPIN_MESSAGE,
        variables: { messageId, channelId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("MessageService.unpinMessage success", { messageId });

      return {
        success: true,
        data: { unpinned: true },
      };
    } catch (error) {
      logger.error("MessageService.unpinMessage failed", error as Error, {
        messageId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // REACTION OPERATIONS
  // ==========================================================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<APIResponse<{ added: boolean }>> {
    try {
      logger.debug("MessageService.addReaction", { messageId, userId, emoji });

      const { errors } = await this.client.mutate({
        mutation: ADD_REACTION,
        variables: { messageId, userId, emoji },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { added: true },
      };
    } catch (error) {
      logger.error("MessageService.addReaction failed", error as Error, {
        messageId,
        emoji,
      });
      return this.handleError(error);
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<APIResponse<{ removed: boolean }>> {
    try {
      logger.debug("MessageService.removeReaction", {
        messageId,
        userId,
        emoji,
      });

      const { errors } = await this.client.mutate({
        mutation: REMOVE_REACTION,
        variables: { messageId, userId, emoji },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      logger.error("MessageService.removeReaction failed", error as Error, {
        messageId,
        emoji,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // BOOKMARK OPERATIONS
  // ==========================================================================

  /**
   * Bookmark a message
   */
  async bookmarkMessage(
    messageId: string,
    userId: string,
    note?: string,
  ): Promise<APIResponse<{ bookmarked: boolean }>> {
    try {
      logger.debug("MessageService.bookmarkMessage", { messageId, userId });

      const { errors } = await this.client.mutate({
        mutation: BOOKMARK_MESSAGE,
        variables: { messageId, userId, note },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { bookmarked: true },
      };
    } catch (error) {
      logger.error("MessageService.bookmarkMessage failed", error as Error, {
        messageId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(
    messageId: string,
    userId: string,
  ): Promise<APIResponse<{ removed: boolean }>> {
    try {
      logger.debug("MessageService.removeBookmark", { messageId, userId });

      const { errors } = await this.client.mutate({
        mutation: REMOVE_BOOKMARK,
        variables: { messageId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      logger.error("MessageService.removeBookmark failed", error as Error, {
        messageId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // READ STATE OPERATIONS
  // ==========================================================================

  /**
   * Mark a message as read
   */
  async markAsRead(
    channelId: string,
    userId: string,
    messageId: string,
  ): Promise<APIResponse<{ marked: boolean }>> {
    try {
      logger.debug("MessageService.markAsRead", {
        channelId,
        userId,
        messageId,
      });

      const { errors } = await this.client.mutate({
        mutation: MARK_MESSAGE_READ,
        variables: { channelId, userId, messageId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { marked: true },
      };
    } catch (error) {
      logger.error("MessageService.markAsRead failed", error as Error, {
        channelId,
        messageId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // FORWARD OPERATIONS
  // ==========================================================================

  /**
   * Forward a message to another channel
   */
  async forwardMessage(
    originalMessageId: string,
    targetChannelId: string,
    userId: string,
    comment?: string,
  ): Promise<APIResponse<Message>> {
    try {
      logger.debug("MessageService.forwardMessage", {
        originalMessageId,
        targetChannelId,
        userId,
      });

      const { data, errors } = await this.client.mutate({
        mutation: FORWARD_MESSAGE,
        variables: { originalMessageId, targetChannelId, userId, comment },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const message = this.transformMessage(data.insert_nchat_messages_one);

      logger.info("MessageService.forwardMessage success", {
        messageId: message.id,
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error("MessageService.forwardMessage failed", error as Error, {
        originalMessageId,
        targetChannelId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Update channel's last message info
   */
  private async updateChannelLastMessage(
    channelId: string,
    messageId: string,
  ): Promise<void> {
    try {
      await this.client.mutate({
        mutation: UPDATE_CHANNEL_LAST_MESSAGE,
        variables: { channelId, messageId },
      });
    } catch (error) {
      // Log but don't fail the main operation
      logger.warn("Failed to update channel last message", {
        channelId,
        messageId,
      });
    }
  }

  /**
   * Transform GraphQL message data to Message type
   */
  private transformMessage(data: Record<string, unknown>): Message {
    return {
      id: data.id as string,
      channelId: data.channel_id as string,
      content: data.content as string,
      contentHtml: data.content_html as string | undefined,
      type: ((data.type as string) || "text") as MessageType,
      userId: data.user_id as string,
      user: this.transformUser(data.user as Record<string, unknown>),
      createdAt: new Date(data.created_at as string),
      updatedAt: data.updated_at
        ? new Date(data.updated_at as string)
        : undefined,
      isEdited: (data.is_edited as boolean) || false,
      editedAt: data.edited_at ? new Date(data.edited_at as string) : undefined,
      replyToId: data.parent_message_id as string | undefined,
      replyTo: data.parent
        ? this.transformMessage(data.parent as Record<string, unknown>)
        : undefined,
      threadInfo: data.thread
        ? this.transformThreadInfo(data.thread as Record<string, unknown>)
        : undefined,
      parentThreadId: data.thread_id as string | undefined,
      attachments: data.attachments
        ? (data.attachments as unknown[]).map((a) =>
            this.transformAttachment(a as Record<string, unknown>),
          )
        : undefined,
      reactions: data.reactions
        ? this.transformReactions(data.reactions as unknown[])
        : undefined,
      isPinned: (data.is_pinned as boolean) || false,
      isDeleted: (data.is_deleted as boolean) || false,
      deletedAt: data.deleted_at
        ? new Date(data.deleted_at as string)
        : undefined,
      mentionedUsers: data.mentions as string[] | undefined,
      mentionedChannels: data.mentioned_channels as string[] | undefined,
    };
  }

  /**
   * Transform multiple messages
   */
  private transformMessages(data: unknown[]): Message[] {
    return data.map((m) => this.transformMessage(m as Record<string, unknown>));
  }

  /**
   * Transform user data
   */
  private transformUser(
    data: Record<string, unknown> | null | undefined,
  ): Message["user"] {
    if (!data) {
      return {
        id: "unknown",
        username: "Unknown",
        displayName: "Unknown User",
      };
    }

    return {
      id: data.id as string,
      username: data.username as string,
      displayName: (data.display_name as string) || (data.username as string),
      avatarUrl: data.avatar_url as string | undefined,
      status: data.status as Message["user"]["status"],
    };
  }

  /**
   * Transform thread info
   */
  private transformThreadInfo(
    data: Record<string, unknown>,
  ): Message["threadInfo"] {
    return {
      replyCount: (data.message_count as number) || 0,
      lastReplyAt: data.last_message_at
        ? new Date(data.last_message_at as string)
        : new Date(),
      participants: data.participants
        ? (data.participants as unknown[]).map((p: unknown) =>
            this.transformUser(
              (p as Record<string, unknown>).user as Record<string, unknown>,
            ),
          )
        : [],
      isLocked: (data.is_locked as boolean) || false,
    };
  }

  /**
   * Transform attachment data
   */
  private transformAttachment(data: Record<string, unknown>): Attachment {
    return {
      id: data.id as string,
      type: (data.type as Attachment["type"]) || "file",
      url: (data.url as string) || (data.file_path as string),
      name: (data.filename as string) || (data.original_filename as string),
      size: data.size_bytes as number | undefined,
      mimeType: data.mime_type as string | undefined,
      width: data.width as number | undefined,
      height: data.height as number | undefined,
      duration: data.duration_seconds as number | undefined,
      thumbnailUrl: data.thumbnail_url as string | undefined,
      blurHash: data.blurhash as string | undefined,
    };
  }

  /**
   * Transform reactions data into grouped reactions
   */
  private transformReactions(data: unknown[]): Reaction[] {
    const grouped = new Map<
      string,
      { emoji: string; users: Message["user"][] }
    >();

    for (const r of data as Record<string, unknown>[]) {
      const emoji = r.emoji as string;
      const user = this.transformUser(r.user as Record<string, unknown>);

      if (grouped.has(emoji)) {
        grouped.get(emoji)!.users.push(user);
      } else {
        grouped.set(emoji, { emoji, users: [user] });
      }
    }

    return Array.from(grouped.values()).map(({ emoji, users }) => ({
      emoji,
      count: users.length,
      users,
      hasReacted: false, // Will be set by the component based on current user
    }));
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

let messageServiceInstance: MessageService | null = null;

/**
 * Get or create the message service singleton
 */
export function getMessageService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): MessageService {
  if (!messageServiceInstance) {
    messageServiceInstance = new MessageService({ apolloClient });
  }
  return messageServiceInstance;
}

/**
 * Create a new message service instance (for testing)
 */
export function createMessageService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): MessageService {
  return new MessageService({ apolloClient });
}

export default MessageService;
