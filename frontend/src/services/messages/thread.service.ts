/**
 * Thread Service
 *
 * Operations for message threads including creation, replies, and participants.
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { logger } from "@/lib/logger";
import type { Message, Thread, ThreadInfo, MessageType } from "@/types/message";
import type { APIResponse } from "@/types/api";

import {
  GET_THREAD,
  GET_THREAD_MESSAGES,
  GET_THREAD_PARTICIPANTS,
  GET_CHANNEL_THREADS,
  GET_USER_THREADS,
  CREATE_THREAD,
  REPLY_TO_THREAD,
  JOIN_THREAD,
  LEAVE_THREAD,
  UPDATE_THREAD_NOTIFICATIONS,
  MARK_THREAD_READ,
  DELETE_THREAD,
} from "@/graphql/threads";

// ============================================================================
// TYPES
// ============================================================================

export interface GetThreadsOptions {
  channelId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateThreadInput {
  channelId: string;
  parentMessageId: string;
  userId: string;
  content: string;
}

export interface ReplyToThreadInput {
  threadId: string;
  channelId: string;
  userId: string;
  content: string;
  type?: string;
}

export interface ThreadServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
}

export interface ThreadParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: Date;
  lastReadAt?: Date;
  notificationsEnabled: boolean;
}

// ============================================================================
// THREAD SERVICE CLASS
// ============================================================================

export class ThreadService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(config: ThreadServiceConfig) {
    this.client = config.apolloClient;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get thread details by ID
   */
  async getThread(threadId: string): Promise<APIResponse<Thread | null>> {
    try {
      logger.debug("ThreadService.getThread", { threadId });

      const { data, error } = await this.client.query({
        query: GET_THREAD,
        variables: { threadId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const thread = data.nchat_threads_by_pk
        ? this.transformThread(data.nchat_threads_by_pk)
        : null;

      return {
        success: true,
        data: thread,
      };
    } catch (error) {
      logger.error("ThreadService.getThread failed", error as Error, {
        threadId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get messages in a thread
   */
  async getThreadMessages(
    threadId: string,
    options: { limit?: number; offset?: number; before?: string } = {},
  ): Promise<
    APIResponse<{
      messages: Message[];
      totalCount: number;
      rootMessage: Message | null;
    }>
  > {
    const { limit = 50, offset = 0, before } = options;

    try {
      logger.debug("ThreadService.getThreadMessages", {
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

      const messages = this.transformMessages(data.nchat_messages || []);
      const totalCount = data.nchat_messages_aggregate?.aggregate?.count || 0;
      const rootMessage = data.nchat_threads_by_pk?.parent_message
        ? this.transformMessage(data.nchat_threads_by_pk.parent_message)
        : null;

      return {
        success: true,
        data: {
          messages,
          totalCount,
          rootMessage,
        },
      };
    } catch (error) {
      logger.error("ThreadService.getThreadMessages failed", error as Error, {
        threadId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get thread participants
   */
  async getThreadParticipants(
    threadId: string,
  ): Promise<APIResponse<ThreadParticipant[]>> {
    try {
      logger.debug("ThreadService.getThreadParticipants", { threadId });

      const { data, error } = await this.client.query({
        query: GET_THREAD_PARTICIPANTS,
        variables: { threadId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const participants = (data.nchat_thread_participants || []).map(
        (p: Record<string, unknown>) => this.transformParticipant(p),
      );

      return {
        success: true,
        data: participants,
      };
    } catch (error) {
      logger.error(
        "ThreadService.getThreadParticipants failed",
        error as Error,
        { threadId },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get threads in a channel
   */
  async getChannelThreads(
    channelId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<APIResponse<Thread[]>> {
    const { limit = 20, offset = 0 } = options;

    try {
      logger.debug("ThreadService.getChannelThreads", {
        channelId,
        limit,
        offset,
      });

      const { data, error } = await this.client.query({
        query: GET_CHANNEL_THREADS,
        variables: { channelId, limit, offset },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const threads = (data.nchat_threads || []).map(
        (t: Record<string, unknown>) => this.transformThread(t),
      );

      return {
        success: true,
        data: threads,
      };
    } catch (error) {
      logger.error("ThreadService.getChannelThreads failed", error as Error, {
        channelId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get threads a user is participating in
   */
  async getUserThreads(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<APIResponse<Thread[]>> {
    const { limit = 20, offset = 0 } = options;

    try {
      logger.debug("ThreadService.getUserThreads", { userId, limit, offset });

      const { data, error } = await this.client.query({
        query: GET_USER_THREADS,
        variables: { userId, limit, offset },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const threads = (data.nchat_thread_participants || []).map(
        (p: Record<string, unknown>) =>
          this.transformThread(p.thread as Record<string, unknown>),
      );

      return {
        success: true,
        data: threads,
      };
    } catch (error) {
      logger.error("ThreadService.getUserThreads failed", error as Error, {
        userId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new thread from a message
   */
  async createThread(input: CreateThreadInput): Promise<APIResponse<Thread>> {
    try {
      logger.debug("ThreadService.createThread", {
        channelId: input.channelId,
        parentMessageId: input.parentMessageId,
      });

      const { data, errors } = await this.client.mutate({
        mutation: CREATE_THREAD,
        variables: {
          channelId: input.channelId,
          parentMessageId: input.parentMessageId,
          userId: input.userId,
          content: input.content,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const thread = this.transformThread(data.insert_nchat_threads_one);

      logger.info("ThreadService.createThread success", {
        threadId: thread.id,
      });

      return {
        success: true,
        data: thread,
      };
    } catch (error) {
      logger.error("ThreadService.createThread failed", error as Error, {
        parentMessageId: input.parentMessageId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Reply to an existing thread
   */
  async replyToThread(
    input: ReplyToThreadInput,
  ): Promise<APIResponse<Message>> {
    try {
      logger.debug("ThreadService.replyToThread", { threadId: input.threadId });

      const { data, errors } = await this.client.mutate({
        mutation: REPLY_TO_THREAD,
        variables: {
          threadId: input.threadId,
          channelId: input.channelId,
          userId: input.userId,
          content: input.content,
          type: input.type || "text",
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const message = this.transformMessage(data.insert_nchat_messages_one);

      logger.info("ThreadService.replyToThread success", {
        threadId: input.threadId,
        messageId: message.id,
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error("ThreadService.replyToThread failed", error as Error, {
        threadId: input.threadId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Join a thread (subscribe for notifications)
   */
  async joinThread(
    threadId: string,
    userId: string,
  ): Promise<APIResponse<{ joined: boolean }>> {
    try {
      logger.debug("ThreadService.joinThread", { threadId, userId });

      const { errors } = await this.client.mutate({
        mutation: JOIN_THREAD,
        variables: { threadId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("ThreadService.joinThread success", { threadId, userId });

      return {
        success: true,
        data: { joined: true },
      };
    } catch (error) {
      logger.error("ThreadService.joinThread failed", error as Error, {
        threadId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Leave a thread (unsubscribe from notifications)
   */
  async leaveThread(
    threadId: string,
    userId: string,
  ): Promise<APIResponse<{ left: boolean }>> {
    try {
      logger.debug("ThreadService.leaveThread", { threadId, userId });

      const { errors } = await this.client.mutate({
        mutation: LEAVE_THREAD,
        variables: { threadId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("ThreadService.leaveThread success", { threadId, userId });

      return {
        success: true,
        data: { left: true },
      };
    } catch (error) {
      logger.error("ThreadService.leaveThread failed", error as Error, {
        threadId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Update thread notification settings
   */
  async updateNotificationSettings(
    threadId: string,
    userId: string,
    enabled: boolean,
  ): Promise<APIResponse<{ updated: boolean }>> {
    try {
      logger.debug("ThreadService.updateNotificationSettings", {
        threadId,
        userId,
        enabled,
      });

      const { errors } = await this.client.mutate({
        mutation: UPDATE_THREAD_NOTIFICATIONS,
        variables: { threadId, userId, enabled },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { updated: true },
      };
    } catch (error) {
      logger.error(
        "ThreadService.updateNotificationSettings failed",
        error as Error,
        {
          threadId,
          userId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Mark thread as read
   */
  async markAsRead(
    threadId: string,
    userId: string,
  ): Promise<APIResponse<{ marked: boolean }>> {
    try {
      logger.debug("ThreadService.markAsRead", { threadId, userId });

      const { errors } = await this.client.mutate({
        mutation: MARK_THREAD_READ,
        variables: { threadId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { marked: true },
      };
    } catch (error) {
      logger.error("ThreadService.markAsRead failed", error as Error, {
        threadId,
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Delete a thread (admin only)
   */
  async deleteThread(
    threadId: string,
  ): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      logger.debug("ThreadService.deleteThread", { threadId });

      const { errors } = await this.client.mutate({
        mutation: DELETE_THREAD,
        variables: { threadId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("ThreadService.deleteThread success", { threadId });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      logger.error("ThreadService.deleteThread failed", error as Error, {
        threadId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Transform thread data
   */
  private transformThread(data: Record<string, unknown>): Thread {
    const rootMessage = data.parent_message
      ? this.transformMessage(data.parent_message as Record<string, unknown>)
      : null;

    return {
      id: data.id as string,
      channelId: data.channel_id as string,
      rootMessage: rootMessage!,
      replies: data.messages
        ? this.transformMessages(data.messages as unknown[])
        : [],
      participants: data.participants
        ? (data.participants as unknown[]).map((p: unknown) =>
            this.transformUser(
              (p as Record<string, unknown>).user as Record<string, unknown>,
            ),
          )
        : [],
      replyCount: (data.message_count as number) || 0,
      createdAt: new Date(data.created_at as string),
      lastReplyAt: data.last_reply_at
        ? new Date(data.last_reply_at as string)
        : new Date(data.created_at as string),
      isArchived: (data.is_archived as boolean) || false,
      isLocked: (data.is_locked as boolean) || false,
    };
  }

  /**
   * Transform message data
   */
  private transformMessage(data: Record<string, unknown>): Message {
    return {
      id: data.id as string,
      channelId: data.channel_id as string,
      content: data.content as string,
      type: ((data.type as string) || "text") as MessageType,
      userId: data.user_id as string,
      user: this.transformUser(data.user as Record<string, unknown>),
      createdAt: new Date(data.created_at as string),
      updatedAt: data.updated_at
        ? new Date(data.updated_at as string)
        : undefined,
      isEdited: (data.is_edited as boolean) || false,
      editedAt: data.edited_at ? new Date(data.edited_at as string) : undefined,
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
    };
  }

  /**
   * Transform participant data
   */
  private transformParticipant(
    data: Record<string, unknown>,
  ): ThreadParticipant {
    const user = data.user as Record<string, unknown>;

    return {
      id: data.id as string,
      userId: data.user_id as string,
      displayName:
        (user?.display_name as string) ||
        (user?.username as string) ||
        "Unknown",
      avatarUrl: user?.avatar_url as string | undefined,
      joinedAt: new Date(data.joined_at as string),
      lastReadAt: data.last_read_at
        ? new Date(data.last_read_at as string)
        : undefined,
      notificationsEnabled: (data.notifications_enabled as boolean) ?? true,
    };
  }

  /**
   * Transform attachment data
   */
  private transformAttachment(
    data: Record<string, unknown>,
  ): NonNullable<Message["attachments"]>[number] {
    return {
      id: data.id as string,
      type:
        (data.type as "image" | "video" | "audio" | "file" | "link") || "file",
      url: (data.url as string) || (data.file_path as string),
      name: (data.filename as string) || (data.original_filename as string),
      size: data.size_bytes as number | undefined,
      mimeType: data.mime_type as string | undefined,
    };
  }

  /**
   * Transform reactions data
   */
  private transformReactions(data: unknown[]): Message["reactions"] {
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
      hasReacted: false,
    }));
  }

  /**
   * Handle errors
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

let threadServiceInstance: ThreadService | null = null;

/**
 * Get or create the thread service singleton
 */
export function getThreadService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ThreadService {
  if (!threadServiceInstance) {
    threadServiceInstance = new ThreadService({ apolloClient });
  }
  return threadServiceInstance;
}

/**
 * Create a new thread service instance
 */
export function createThreadService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ThreadService {
  return new ThreadService({ apolloClient });
}

export default ThreadService;
