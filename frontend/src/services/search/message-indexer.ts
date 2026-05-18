/**
 * Message Indexer Service
 *
 * Handles indexing of messages to MeiliSearch for full-text search.
 * Supports real-time indexing, batch operations, and reindexing.
 *
 * @module services/search/message-indexer
 */

import type { Message } from "@/types/message";
import type { Channel } from "@/types/channel";
import type { User } from "@/types/user";
import {
  getMessagesIndex,
  INDEXES,
  getMeiliClient,
  type MeiliMessageDocument,
} from "@/lib/search/meilisearch-config";

// ============================================================================
// Types
// ============================================================================

export interface IndexingStatus {
  indexed: number;
  pending: number;
  failed: number;
  lastIndexedAt: Date | null;
  isIndexing: boolean;
}

export interface IndexingResult {
  success: boolean;
  taskId?: number;
  error?: string;
}

export interface BatchIndexingResult {
  total: number;
  successful: number;
  failed: number;
  errors: { id: string; error: string }[];
  taskIds: number[];
}

export interface MessageWithContext {
  message: Message;
  channel?: Pick<Channel, "id" | "name">;
  author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

// ============================================================================
// Message Transformation
// ============================================================================

/**
 * Strip HTML tags from content for plain text indexing
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect if content contains a URL
 */
function hasLink(content: string): boolean {
  const urlPattern = /https?:\/\/[^\s]+/i;
  return urlPattern.test(content);
}

/**
 * Transform a Message to MeiliSearch document format
 */
export function transformMessageToDocument(
  message: Message,
  channel?: Pick<Channel, "id" | "name">,
  author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">,
): MeiliMessageDocument {
  const attachments = message.attachments || [];
  const hasImage = attachments.some((a) => a.type === "image");
  const hasVideo = attachments.some((a) => a.type === "video");
  const hasFile = attachments.some(
    (a) => a.type === "file" || a.type === "audio",
  );

  return {
    id: message.id,
    content: message.content,
    content_plain: stripHtml(message.contentHtml || message.content),
    channel_id: message.channelId,
    channel_name: channel?.name || "",
    author_id: message.userId,
    author_name: author?.displayName || message.user?.displayName || "",
    author_username: author?.username || message.user?.username || "",
    author_avatar_url: author?.avatarUrl || message.user?.avatarUrl,
    created_at: Math.floor(new Date(message.createdAt).getTime() / 1000),
    updated_at: message.updatedAt
      ? Math.floor(new Date(message.updatedAt).getTime() / 1000)
      : undefined,
    message_type: message.type,
    has_attachment: attachments.length > 0,
    has_link: hasLink(message.content),
    has_image: hasImage,
    has_video: hasVideo,
    has_file: hasFile,
    is_pinned: message.isPinned || false,
    is_edited: message.isEdited || false,
    is_deleted: message.isDeleted || false,
    thread_id: message.threadInfo ? message.id : undefined,
    parent_thread_id: message.parentThreadId,
    mentioned_users: message.mentionedUsers || [],
    mentions_everyone: message.mentionsEveryone || false,
    mentions_here: message.mentionsHere || false,
    attachment_count: attachments.length,
    reaction_count: message.reactions?.length || 0,
  };
}

// ============================================================================
// Message Indexer Class
// ============================================================================

export class MessageIndexer {
  private batchQueue: MeiliMessageDocument[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private flushInterval: number;
  private isProcessing = false;

  constructor(options?: { batchSize?: number; flushInterval?: number }) {
    this.batchSize = options?.batchSize || 100;
    this.flushInterval = options?.flushInterval || 1000; // 1 second
  }

  /**
   * Index a single message
   */
  async indexMessage(
    message: Message,
    channel?: Pick<Channel, "id" | "name">,
    author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">,
  ): Promise<IndexingResult> {
    try {
      const document = transformMessageToDocument(message, channel, author);
      const index = getMessagesIndex();
      const task = await index.addDocuments([document]);

      return {
        success: true,
        taskId: task.taskUid,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Index multiple messages at once
   */
  async indexMessages(
    messagesWithContext: MessageWithContext[],
  ): Promise<BatchIndexingResult> {
    const documents: MeiliMessageDocument[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const { message, channel, author } of messagesWithContext) {
      try {
        const document = transformMessageToDocument(message, channel, author);
        documents.push(document);
      } catch (error) {
        errors.push({
          id: message.id,
          error: error instanceof Error ? error.message : "Transform failed",
        });
      }
    }

    if (documents.length === 0) {
      return {
        total: messagesWithContext.length,
        successful: 0,
        failed: errors.length,
        errors,
        taskIds: [],
      };
    }

    try {
      const index = getMessagesIndex();
      const task = await index.addDocuments(documents);

      return {
        total: messagesWithContext.length,
        successful: documents.length,
        failed: errors.length,
        errors,
        taskIds: [task.taskUid],
      };
    } catch (error) {
      return {
        total: messagesWithContext.length,
        successful: 0,
        failed: messagesWithContext.length,
        errors: [
          ...errors,
          ...documents.map((d) => ({
            id: d.id,
            error: error instanceof Error ? error.message : "Index failed",
          })),
        ],
        taskIds: [],
      };
    }
  }

  /**
   * Add message to batch queue for efficient bulk indexing
   */
  queueMessage(
    message: Message,
    channel?: Pick<Channel, "id" | "name">,
    author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">,
  ): void {
    const document = transformMessageToDocument(message, channel, author);
    this.batchQueue.push(document);

    // Flush if batch size reached
    if (this.batchQueue.length >= this.batchSize) {
      this.flush();
    }

    // Set up auto-flush timer
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  /**
   * Flush the batch queue to MeiliSearch
   */
  async flush(): Promise<BatchIndexingResult> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchQueue.length === 0 || this.isProcessing) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        taskIds: [],
      };
    }

    this.isProcessing = true;
    const documents = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const index = getMessagesIndex();
      const task = await index.addDocuments(documents);

      this.isProcessing = false;
      return {
        total: documents.length,
        successful: documents.length,
        failed: 0,
        errors: [],
        taskIds: [task.taskUid],
      };
    } catch (error) {
      this.isProcessing = false;
      return {
        total: documents.length,
        successful: 0,
        failed: documents.length,
        errors: documents.map((d) => ({
          id: d.id,
          error: error instanceof Error ? error.message : "Flush failed",
        })),
        taskIds: [],
      };
    }
  }

  /**
   * Update an existing message in the index
   */
  async updateMessage(
    message: Message,
    channel?: Pick<Channel, "id" | "name">,
    author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">,
  ): Promise<IndexingResult> {
    // MeiliSearch handles updates via addDocuments with same ID
    return this.indexMessage(message, channel, author);
  }

  /**
   * Remove a message from the index
   */
  async removeMessage(messageId: string): Promise<IndexingResult> {
    try {
      const index = getMessagesIndex();
      const task = await index.deleteDocument(messageId);

      return {
        success: true,
        taskId: task.taskUid,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Remove multiple messages from the index
   */
  async removeMessages(messageIds: string[]): Promise<BatchIndexingResult> {
    try {
      const index = getMessagesIndex();
      const task = await index.deleteDocuments(messageIds);

      return {
        total: messageIds.length,
        successful: messageIds.length,
        failed: 0,
        errors: [],
        taskIds: [task.taskUid],
      };
    } catch (error) {
      return {
        total: messageIds.length,
        successful: 0,
        failed: messageIds.length,
        errors: messageIds.map((id) => ({
          id,
          error: error instanceof Error ? error.message : "Delete failed",
        })),
        taskIds: [],
      };
    }
  }

  /**
   * Reindex all messages in a channel
   */
  async reindexChannel(
    channelId: string,
    getMessages: () => Promise<MessageWithContext[]>,
  ): Promise<BatchIndexingResult> {
    // First, delete all existing messages for this channel
    try {
      const index = getMessagesIndex();
      await index.deleteDocuments({
        filter: `channel_id = "${channelId}"`,
      });
    } catch {
      // Ignore delete errors, just proceed with reindex
    }

    // Get all messages for the channel
    const messagesWithContext = await getMessages();

    // Index them
    return this.indexMessages(messagesWithContext);
  }

  /**
   * Reindex all messages
   */
  async reindexAll(
    getMessages: () => Promise<MessageWithContext[]>,
    onProgress?: (progress: { indexed: number; total: number }) => void,
  ): Promise<BatchIndexingResult> {
    // Clear the index
    try {
      const index = getMessagesIndex();
      await index.deleteAllDocuments();
    } catch {
      // Ignore errors, proceed with reindex
    }

    // Get all messages
    const messagesWithContext = await getMessages();
    const total = messagesWithContext.length;

    // Process in batches
    const results: BatchIndexingResult = {
      total,
      successful: 0,
      failed: 0,
      errors: [],
      taskIds: [],
    };

    for (let i = 0; i < messagesWithContext.length; i += this.batchSize) {
      const batch = messagesWithContext.slice(i, i + this.batchSize);
      const batchResult = await this.indexMessages(batch);

      results.successful += batchResult.successful;
      results.failed += batchResult.failed;
      results.errors.push(...batchResult.errors);
      results.taskIds.push(...batchResult.taskIds);

      if (onProgress) {
        onProgress({ indexed: Math.min(i + this.batchSize, total), total });
      }
    }

    return results;
  }

  /**
   * Get indexing status
   */
  async getStatus(): Promise<IndexingStatus> {
    try {
      const client = getMeiliClient();
      const index = getMessagesIndex();
      const stats = await index.getStats();

      // Get pending tasks
      const tasks = await client.tasks.getTasks({
        indexUids: [INDEXES.MESSAGES],
        statuses: ["enqueued", "processing"],
      });

      // Get last completed task
      const completedTasks = await client.tasks.getTasks({
        indexUids: [INDEXES.MESSAGES],
        statuses: ["succeeded"],
        limit: 1,
      });

      return {
        indexed: stats.numberOfDocuments,
        pending: tasks.total,
        failed: 0, // Would need to track this separately
        lastIndexedAt:
          completedTasks.results.length > 0
            ? new Date(completedTasks.results[0].finishedAt || Date.now())
            : null,
        isIndexing: stats.isIndexing || tasks.total > 0,
      };
    } catch {
      return {
        indexed: 0,
        pending: this.batchQueue.length,
        failed: 0,
        lastIndexedAt: null,
        isIndexing: this.isProcessing,
      };
    }
  }

  /**
   * Wait for all indexing tasks to complete
   */
  async waitForCompletion(timeout = 30000): Promise<void> {
    // First flush any pending items
    await this.flush();

    // Then wait for MeiliSearch tasks
    const client = getMeiliClient();
    const tasks = await client.tasks.getTasks({
      indexUids: [INDEXES.MESSAGES],
      statuses: ["enqueued", "processing"],
    });

    for (const task of tasks.results) {
      await client.tasks.waitForTask(task.uid, { timeout: timeout });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let defaultIndexer: MessageIndexer | null = null;

/**
 * Get or create the default message indexer
 */
export function getMessageIndexer(): MessageIndexer {
  if (!defaultIndexer) {
    defaultIndexer = new MessageIndexer();
  }
  return defaultIndexer;
}

/**
 * Create a new message indexer instance
 */
export function createMessageIndexer(options?: {
  batchSize?: number;
  flushInterval?: number;
}): MessageIndexer {
  return new MessageIndexer(options);
}

// ============================================================================
// Event Subscription
// ============================================================================

import { realtimeClient } from "@/services/realtime/realtime-client";
import {
  REALTIME_EVENTS,
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
} from "@/services/realtime/events.types";
import { logger } from "@/lib/logger";

export type MessageEventType = "created" | "updated" | "deleted";

export interface MessageEvent {
  type: MessageEventType;
  message: Message;
  channel?: Pick<Channel, "id" | "name">;
  author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

/**
 * Configuration for message event subscription
 */
export interface MessageEventSubscriptionConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Process events immediately or queue for batch processing */
  immediate?: boolean;
  /** Retry failed index operations */
  retryOnFailure?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Subscription state tracking
 */
interface SubscriptionState {
  isActive: boolean;
  unsubscribeFunctions: Array<() => void>;
  pendingRetries: Map<string, { retries: number; timeout: NodeJS.Timeout }>;
}

/**
 * Transform realtime event user to indexer author format
 */
function transformEventUser(
  user?: MessageNewEvent["user"] | MessageUpdateEvent["editedBy"],
): Pick<User, "id" | "username" | "displayName" | "avatarUrl"> | undefined {
  if (!user) return undefined;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Transform realtime message event to Message type
 */
function transformEventToMessage(event: MessageNewEvent): Message {
  return {
    id: event.id,
    channelId: event.channelId,
    userId: event.user.id,
    content: event.content,
    contentHtml: event.contentHtml,
    type: event.type as Message["type"],
    createdAt: new Date(event.createdAt),
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    mentionedUsers: event.mentionedUserIds || [],
    mentionsEveryone: event.mentionedRoles?.includes("@everyone") || false,
    mentionsHere: event.mentionedRoles?.includes("@here") || false,
    parentThreadId: event.threadId,
    attachments:
      event.attachments?.map((a) => ({
        id: a.id,
        type: a.type as "image" | "video" | "audio" | "file" | "link",
        url: a.url,
        name: a.filename,
        size: a.size,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        thumbnailUrl: a.thumbnailUrl,
      })) || [],
    reactions: [],
    user: {
      id: event.user.id,
      username: event.user.username,
      displayName: event.user.displayName || event.user.username,
      avatarUrl: event.user.avatarUrl,
    },
  };
}

/**
 * Transform realtime update event to partial Message
 */
function transformUpdateEventToMessage(
  event: MessageUpdateEvent,
  existingMessage?: Partial<Message>,
): Message {
  return {
    id: event.id,
    channelId: event.channelId,
    userId: existingMessage?.userId || event.editedBy.id,
    content: event.content,
    contentHtml: event.contentHtml,
    type: existingMessage?.type || "text",
    createdAt: existingMessage?.createdAt || new Date(),
    updatedAt: new Date(event.editedAt),
    editedAt: new Date(event.editedAt),
    isEdited: true,
    isDeleted: false,
    isPinned: existingMessage?.isPinned || false,
    mentionedUsers: event.mentionedUserIds || [],
    mentionsEveryone: false,
    mentionsHere: false,
    attachments: existingMessage?.attachments || [],
    reactions: existingMessage?.reactions || [],
    user: existingMessage?.user || {
      id: event.editedBy.id,
      username: event.editedBy.username,
      displayName: event.editedBy.displayName || event.editedBy.username,
      avatarUrl: event.editedBy.avatarUrl,
    },
  };
}

/**
 * Subscribe to message events for real-time indexing via Socket.io
 * Returns an unsubscribe function
 *
 * @param indexer - The MessageIndexer instance to use for indexing
 * @param onEvent - Optional callback invoked for each event
 * @param config - Optional configuration options
 * @returns Unsubscribe function to stop listening to events
 */
export function subscribeToMessageEvents(
  indexer: MessageIndexer,
  onEvent?: (event: MessageEvent) => void,
  config: MessageEventSubscriptionConfig = {},
): () => void {
  const {
    debug = false,
    immediate = true,
    retryOnFailure = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = config;

  const state: SubscriptionState = {
    isActive: true,
    unsubscribeFunctions: [],
    pendingRetries: new Map(),
  };

  const log = (message: string, context?: Record<string, unknown>) => {
    if (debug) {
      logger.debug(`[MessageIndexer:Subscription] ${message}`, context);
    }
  };

  /**
   * Retry failed indexing operation with exponential backoff
   */
  const retryOperation = async (
    messageId: string,
    operation: () => Promise<IndexingResult>,
    operationType: string,
  ): Promise<void> => {
    const retryState = state.pendingRetries.get(messageId);
    const currentRetry = retryState?.retries || 0;

    if (currentRetry >= maxRetries) {
      log("Max retries reached", { operationType, messageId });
      state.pendingRetries.delete(messageId);
      return;
    }

    const delay = retryDelay * Math.pow(2, currentRetry);
    log("Scheduling retry", {
      attempt: currentRetry + 1,
      maxRetries,
      operationType,
      messageId,
      delayMs: delay,
    });

    const timeout = setTimeout(async () => {
      if (!state.isActive) return;

      try {
        const result = await operation();
        if (result.success) {
          log("Retry successful", { operationType, messageId });
          state.pendingRetries.delete(messageId);
        } else {
          state.pendingRetries.set(messageId, {
            retries: currentRetry + 1,
            timeout: timeout,
          });
          await retryOperation(messageId, operation, operationType);
        }
      } catch (error) {
        log("Retry failed", {
          operationType,
          messageId,
          error: error instanceof Error ? error.message : String(error),
        });
        state.pendingRetries.set(messageId, {
          retries: currentRetry + 1,
          timeout: timeout,
        });
        await retryOperation(messageId, operation, operationType);
      }
    }, delay);

    state.pendingRetries.set(messageId, { retries: currentRetry, timeout });
  };

  /**
   * Handle new message event
   */
  const handleMessageNew = async (payload: MessageNewEvent) => {
    if (!state.isActive) return;

    log("Received message:new event", { messageId: payload.id });

    const message = transformEventToMessage(payload);
    const author = transformEventUser(payload.user);
    const channel = { id: payload.channelId, name: "" }; // Channel name not in event

    const event: MessageEvent = {
      type: "created",
      message,
      channel,
      author,
    };

    // Notify listener
    onEvent?.(event);

    // Index the message
    if (immediate) {
      try {
        const result = await indexer.indexMessage(message, channel, author);
        if (!result.success && retryOnFailure) {
          await retryOperation(
            message.id,
            () => indexer.indexMessage(message, channel, author),
            "index",
          );
        }
        log("Indexed new message", {
          messageId: message.id,
          success: result.success,
        });
      } catch (error) {
        logger.error(
          "[MessageIndexer:Subscription] Error indexing new message",
          error instanceof Error ? error : undefined,
          { messageId: message.id },
        );
        if (retryOnFailure) {
          await retryOperation(
            message.id,
            () => indexer.indexMessage(message, channel, author),
            "index",
          );
        }
      }
    } else {
      indexer.queueMessage(message, channel, author);
    }
  };

  /**
   * Handle message update event
   */
  const handleMessageUpdate = async (payload: MessageUpdateEvent) => {
    if (!state.isActive) return;

    log("Received message:update event", { messageId: payload.id });

    const message = transformUpdateEventToMessage(payload);
    const author = transformEventUser(payload.editedBy);
    const channel = { id: payload.channelId, name: "" };

    const event: MessageEvent = {
      type: "updated",
      message,
      channel,
      author,
    };

    // Notify listener
    onEvent?.(event);

    // Update the index
    try {
      const result = await indexer.updateMessage(message, channel, author);
      if (!result.success && retryOnFailure) {
        await retryOperation(
          message.id,
          () => indexer.updateMessage(message, channel, author),
          "update",
        );
      }
      log("Updated message in index", {
        messageId: message.id,
        success: result.success,
      });
    } catch (error) {
      logger.error(
        "[MessageIndexer:Subscription] Error updating message",
        error instanceof Error ? error : undefined,
        { messageId: message.id },
      );
      if (retryOnFailure) {
        await retryOperation(
          message.id,
          () => indexer.updateMessage(message, channel, author),
          "update",
        );
      }
    }
  };

  /**
   * Handle message delete event
   */
  const handleMessageDelete = async (payload: MessageDeleteEvent) => {
    if (!state.isActive) return;

    log("Received message:delete event", { messageId: payload.id });

    // Create minimal message for event (for the callback only)
    const message: Message = {
      id: payload.id,
      channelId: payload.channelId,
      userId: payload.deletedBy?.id || "",
      content: "",
      type: "text",
      createdAt: new Date(),
      isEdited: false,
      isDeleted: true,
      deletedAt: new Date(payload.deletedAt),
      user: {
        id: payload.deletedBy?.id || "",
        username: payload.deletedBy?.username || "",
        displayName:
          payload.deletedBy?.displayName || payload.deletedBy?.username || "",
      },
    };

    const event: MessageEvent = {
      type: "deleted",
      message,
      channel: { id: payload.channelId, name: "" },
    };

    // Notify listener
    onEvent?.(event);

    // Remove from index
    try {
      const result = await indexer.removeMessage(payload.id);
      if (!result.success && retryOnFailure) {
        await retryOperation(
          payload.id,
          () => indexer.removeMessage(payload.id),
          "delete",
        );
      }
      log("Removed message from index", {
        messageId: payload.id,
        success: result.success,
      });
    } catch (error) {
      logger.error(
        "[MessageIndexer:Subscription] Error removing message",
        error instanceof Error ? error : undefined,
        { messageId: payload.id },
      );
      if (retryOnFailure) {
        await retryOperation(
          payload.id,
          () => indexer.removeMessage(payload.id),
          "delete",
        );
      }
    }
  };

  // Subscribe to realtime events via Socket.io
  log("Subscribing to realtime message events", {
    events: ["message:new", "message:update", "message:delete"],
  });

  // Subscribe to message:new events
  const unsubNew = realtimeClient.on<MessageNewEvent>(
    REALTIME_EVENTS.MESSAGE_NEW,
    handleMessageNew,
  );
  state.unsubscribeFunctions.push(unsubNew);

  // Subscribe to message:update events
  const unsubUpdate = realtimeClient.on<MessageUpdateEvent>(
    REALTIME_EVENTS.MESSAGE_UPDATE,
    handleMessageUpdate,
  );
  state.unsubscribeFunctions.push(unsubUpdate);

  // Subscribe to message:delete events
  const unsubDelete = realtimeClient.on<MessageDeleteEvent>(
    REALTIME_EVENTS.MESSAGE_DELETE,
    handleMessageDelete,
  );
  state.unsubscribeFunctions.push(unsubDelete);

  log("Subscribed to realtime message events", { subscriptionCount: 3 });

  // Return unsubscribe function
  return () => {
    log("Unsubscribing from realtime message events");
    state.isActive = false;

    // Clear all pending retries
    for (const [, retryState] of state.pendingRetries) {
      clearTimeout(retryState.timeout);
    }
    state.pendingRetries.clear();

    // Unsubscribe from all events
    for (const unsubscribe of state.unsubscribeFunctions) {
      unsubscribe();
    }
    state.unsubscribeFunctions = [];

    log("Unsubscribed from realtime message events");
  };
}

/**
 * Create a GraphQL subscription-based message event handler
 * This is an alternative to Socket.io for environments where
 * GraphQL subscriptions are preferred
 */
export interface GraphQLSubscriptionAdapter {
  subscribe: <T>(
    subscription: unknown,
    variables: unknown,
    onData: (data: T) => void,
    onError?: (error: Error) => void,
  ) => () => void;
}

/**
 * Subscribe to message events via GraphQL subscriptions
 * Returns an unsubscribe function
 *
 * @param indexer - The MessageIndexer instance
 * @param adapter - GraphQL subscription adapter
 * @param channelId - Channel ID to subscribe to
 * @param onEvent - Optional callback for each event
 * @returns Unsubscribe function
 */
export function subscribeToMessageEventsViaGraphQL(
  indexer: MessageIndexer,
  adapter: GraphQLSubscriptionAdapter,
  channelId: string,
  onEvent?: (event: MessageEvent) => void,
): () => void {
  const unsubscribeFunctions: Array<() => void> = [];

  // Subscribe to new messages
  // Note: The actual GraphQL subscription documents would be imported from
  // @/graphql/messages/subscriptions but we keep this generic for flexibility
  const handleNewMessage = (data: { nchat_messages: Array<Message> }) => {
    const messages = data.nchat_messages;
    if (messages && messages.length > 0) {
      const message = messages[0];
      const event: MessageEvent = {
        type: "created",
        message,
        channel: { id: channelId, name: "" },
        author: message.user
          ? {
              id: message.user.id,
              username: message.user.username,
              displayName: message.user.displayName,
              avatarUrl: message.user.avatarUrl,
            }
          : undefined,
      };
      onEvent?.(event);
      indexer.queueMessage(message, event.channel, event.author);
    }
  };

  // This is a template for GraphQL subscription integration
  // Actual implementation would use Apollo Client subscriptions
  logger.info("[MessageIndexer] GraphQL subscription adapter ready", {
    channelId,
  });

  return () => {
    for (const unsubscribe of unsubscribeFunctions) {
      unsubscribe();
    }
  };
}

// ============================================================================
// Export
// ============================================================================

export default MessageIndexer;
