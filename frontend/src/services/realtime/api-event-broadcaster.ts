/**
 * API Event Broadcaster
 *
 * Server-side service for broadcasting realtime events from API routes.
 * This service is called from API route handlers to notify connected
 * clients of data changes.
 *
 * Note: This module is designed to run on the server side and communicates
 * with the realtime server via HTTP or internal messaging.
 *
 * @module services/realtime/api-event-broadcaster
 * @version 1.0.0
 */

import { logger } from "@/lib/logger";
import {
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
  type ReactionAddEvent,
  type ReactionRemoveEvent,
  type ChannelUpdateEvent,
  type ChannelMemberJoinEvent,
  type ChannelMemberLeaveEvent,
  type EventUser,
  type EventMetadata,
  REALTIME_EVENTS,
  getChannelRoom,
  getThreadRoom,
  getUserRoom,
} from "./events.types";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// Types
// ============================================================================

/**
 * Broadcaster configuration
 */
export interface APIEventBroadcasterConfig {
  /** Realtime server URL (for HTTP broadcasting) */
  realtimeServerUrl?: string;
  /** API key for authentication with realtime server */
  apiKey?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Use internal pub/sub instead of HTTP (for same-process server) */
  useInternalPubSub?: boolean;
  /** Timeout for broadcast requests */
  timeout?: number;
}

/**
 * Broadcast result
 */
export interface BroadcastResult {
  success: boolean;
  eventId: string;
  recipientCount?: number;
  error?: string;
}

/**
 * Internal event queue item
 */
interface QueuedEvent {
  eventType: string;
  roomNames: string[];
  payload: unknown;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<APIEventBroadcasterConfig> = {
  realtimeServerUrl: process.env.REALTIME_SERVER_URL || "http://localhost:3101",
  apiKey: process.env.REALTIME_API_KEY || "",
  debug: process.env.NODE_ENV === "development",
  useInternalPubSub: false,
  timeout: 5000,
};

// Internal event emitter for same-process communication
const internalEventListeners = new Map<
  string,
  Set<(payload: unknown) => void>
>();

// ============================================================================
// API Event Broadcaster Class
// ============================================================================

/**
 * APIEventBroadcaster - Broadcasts events from API routes to connected clients
 */
class APIEventBroadcaster {
  private config: Required<APIEventBroadcasterConfig>;
  private eventQueue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor(config: APIEventBroadcasterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the broadcaster
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.log("API event broadcaster initialized");
  }

  /**
   * Destroy the broadcaster
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.eventQueue = [];
    this.isInitialized = false;
    this.log("API event broadcaster destroyed");
  }

  // ============================================================================
  // Metadata Helper
  // ============================================================================

  /**
   * Create event metadata
   */
  private createMetadata(): EventMetadata {
    return {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      serverVersion: "0.9.1",
    };
  }

  // ============================================================================
  // Message Broadcasting
  // ============================================================================

  /**
   * Broadcast a new message event
   */
  async broadcastMessageNew(data: {
    id: string;
    channelId: string;
    content: string;
    contentHtml?: string;
    type?: string;
    threadId?: string;
    parentMessageId?: string;
    mentions?: string[];
    mentionedRoles?: string[];
    mentionedChannels?: string[];
    attachments?: Array<{
      id: string;
      type: string;
      url: string;
      filename: string;
      size?: number;
      mimeType?: string;
    }>;
    metadata?: Record<string, unknown>;
    ttlSeconds?: number;
    expiresAt?: string;
    createdAt: string;
    user: EventUser;
  }): Promise<BroadcastResult> {
    const payload: MessageNewEvent = {
      meta: this.createMetadata(),
      id: data.id,
      channelId: data.channelId,
      user: data.user,
      content: data.content,
      contentHtml: data.contentHtml,
      type: (data.type as MessageNewEvent["type"]) || "text",
      threadId: data.threadId,
      parentMessageId: data.parentMessageId,
      mentionedUserIds: data.mentions,
      mentionedRoles: data.mentionedRoles,
      mentionedChannelIds: data.mentionedChannels,
      attachments: data.attachments?.map((a) => ({
        id: a.id,
        type: a.type as "image" | "video" | "audio" | "file" | "code",
        url: a.url,
        filename: a.filename,
        size: a.size,
        mimeType: a.mimeType,
      })),
      metadata: data.metadata,
      ttlSeconds: data.ttlSeconds,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
    };

    const rooms = [getChannelRoom(data.channelId)];

    // Also broadcast to thread room if this is a thread reply
    if (data.threadId) {
      rooms.push(getThreadRoom(data.threadId));
    }

    const result = await this.broadcast(
      REALTIME_EVENTS.MESSAGE_NEW,
      rooms,
      payload,
    );

    // Send notifications to mentioned users
    if (data.mentions?.length) {
      const notificationPayload = {
        id: uuidv4(),
        type: "mention" as const,
        title: `${data.user.displayName || data.user.username} mentioned you`,
        body: data.content.substring(0, 100),
        data: {
          channelId: data.channelId,
          messageId: data.id,
          threadId: data.threadId,
        },
        createdAt: new Date().toISOString(),
      };

      for (const userId of data.mentions) {
        await this.broadcast(
          REALTIME_EVENTS.NOTIFICATION,
          [getUserRoom(userId)],
          notificationPayload,
        );
      }
    }

    return result;
  }

  /**
   * Broadcast a message update event
   */
  async broadcastMessageUpdate(data: {
    id: string;
    channelId: string;
    content: string;
    contentHtml?: string;
    editedBy: EventUser;
    threadId?: string;
    mentionedUserIds?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<BroadcastResult> {
    const payload: MessageUpdateEvent = {
      meta: this.createMetadata(),
      id: data.id,
      channelId: data.channelId,
      content: data.content,
      contentHtml: data.contentHtml,
      editedBy: data.editedBy,
      editedAt: new Date().toISOString(),
      mentionedUserIds: data.mentionedUserIds,
      metadata: data.metadata,
    };

    const rooms = [getChannelRoom(data.channelId)];
    if (data.threadId) {
      rooms.push(getThreadRoom(data.threadId));
    }

    return this.broadcast(REALTIME_EVENTS.MESSAGE_UPDATE, rooms, payload);
  }

  /**
   * Broadcast a message delete event
   */
  async broadcastMessageDelete(data: {
    id: string;
    channelId: string;
    deletedBy?: EventUser;
    threadId?: string;
    hardDelete?: boolean;
  }): Promise<BroadcastResult> {
    const payload: MessageDeleteEvent = {
      meta: this.createMetadata(),
      id: data.id,
      channelId: data.channelId,
      threadId: data.threadId,
      deletedBy: data.deletedBy,
      deletedAt: new Date().toISOString(),
      hardDelete: data.hardDelete ?? false,
    };

    const rooms = [getChannelRoom(data.channelId)];
    if (data.threadId) {
      rooms.push(getThreadRoom(data.threadId));
    }

    return this.broadcast(REALTIME_EVENTS.MESSAGE_DELETE, rooms, payload);
  }

  // ============================================================================
  // Reaction Broadcasting
  // ============================================================================

  /**
   * Broadcast a reaction add event
   */
  async broadcastReactionAdd(data: {
    messageId: string;
    channelId: string;
    emoji: string;
    user: EventUser;
    totalCount: number;
  }): Promise<BroadcastResult> {
    const payload: ReactionAddEvent = {
      meta: this.createMetadata(),
      messageId: data.messageId,
      channelId: data.channelId,
      emoji: data.emoji,
      user: data.user,
      totalCount: data.totalCount,
      createdAt: new Date().toISOString(),
    };

    return this.broadcast(
      REALTIME_EVENTS.REACTION_ADD,
      [getChannelRoom(data.channelId)],
      payload,
    );
  }

  /**
   * Broadcast a reaction remove event
   */
  async broadcastReactionRemove(data: {
    messageId: string;
    channelId: string;
    emoji: string;
    userId: string;
    remainingCount: number;
  }): Promise<BroadcastResult> {
    const payload: ReactionRemoveEvent = {
      meta: this.createMetadata(),
      messageId: data.messageId,
      channelId: data.channelId,
      emoji: data.emoji,
      userId: data.userId,
      remainingCount: data.remainingCount,
    };

    return this.broadcast(
      REALTIME_EVENTS.REACTION_REMOVE,
      [getChannelRoom(data.channelId)],
      payload,
    );
  }

  // ============================================================================
  // Channel Broadcasting
  // ============================================================================

  /**
   * Broadcast a channel update event
   */
  async broadcastChannelUpdate(data: {
    channelId: string;
    updates: Record<string, unknown>;
    updatedBy: EventUser;
  }): Promise<BroadcastResult> {
    const payload: ChannelUpdateEvent = {
      meta: this.createMetadata(),
      channelId: data.channelId,
      updates: data.updates as ChannelUpdateEvent["updates"],
      updatedBy: data.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    return this.broadcast(
      REALTIME_EVENTS.CHANNEL_UPDATE,
      [getChannelRoom(data.channelId)],
      payload,
    );
  }

  /**
   * Broadcast a member join event
   */
  async broadcastMemberJoin(data: {
    channelId: string;
    channelName: string;
    user: EventUser;
    role: "owner" | "admin" | "moderator" | "member" | "guest";
    addedBy?: EventUser;
    memberCount: number;
  }): Promise<BroadcastResult> {
    const payload: ChannelMemberJoinEvent = {
      meta: this.createMetadata(),
      channelId: data.channelId,
      channelName: data.channelName,
      user: data.user,
      role: data.role,
      addedBy: data.addedBy,
      joinedAt: new Date().toISOString(),
      memberCount: data.memberCount,
    };

    return this.broadcast(
      REALTIME_EVENTS.CHANNEL_MEMBER_JOIN,
      [getChannelRoom(data.channelId)],
      payload,
    );
  }

  /**
   * Broadcast a member leave event
   */
  async broadcastMemberLeave(data: {
    channelId: string;
    channelName: string;
    userId: string;
    username?: string;
    removedBy?: EventUser;
    reason?: "left" | "kicked" | "banned";
    memberCount: number;
  }): Promise<BroadcastResult> {
    const payload: ChannelMemberLeaveEvent = {
      meta: this.createMetadata(),
      channelId: data.channelId,
      channelName: data.channelName,
      userId: data.userId,
      username: data.username,
      removedBy: data.removedBy,
      reason: data.reason,
      leftAt: new Date().toISOString(),
      memberCount: data.memberCount,
    };

    const rooms = [
      getChannelRoom(data.channelId),
      getUserRoom(data.userId), // Notify the user who left/was removed
    ];

    return this.broadcast(REALTIME_EVENTS.CHANNEL_MEMBER_LEAVE, rooms, payload);
  }

  // ============================================================================
  // Core Broadcast Method
  // ============================================================================

  /**
   * Broadcast an event to specified rooms
   */
  async broadcast(
    eventType: string,
    roomNames: string[],
    payload: unknown,
  ): Promise<BroadcastResult> {
    const eventId =
      (payload as { meta?: EventMetadata })?.meta?.eventId || uuidv4();

    if (this.config.useInternalPubSub) {
      return this.broadcastInternal(eventType, roomNames, payload, eventId);
    }

    return this.broadcastHTTP(eventType, roomNames, payload, eventId);
  }

  /**
   * Broadcast via internal pub/sub (for same-process)
   */
  private broadcastInternal(
    eventType: string,
    roomNames: string[],
    payload: unknown,
    eventId: string,
  ): BroadcastResult {
    let recipientCount = 0;

    for (const roomName of roomNames) {
      const key = `${eventType}:${roomName}`;
      const listeners = internalEventListeners.get(key);

      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(payload);
            recipientCount++;
          } catch (error) {
            this.log("Internal broadcast listener error:", error);
          }
        });
      }

      // Also broadcast to room-level listeners (any event in room)
      const roomListeners = internalEventListeners.get(`*:${roomName}`);
      if (roomListeners) {
        roomListeners.forEach((listener) => {
          try {
            listener({ eventType, payload });
            recipientCount++;
          } catch (error) {
            this.log("Internal broadcast listener error:", error);
          }
        });
      }
    }

    this.log("Internal broadcast:", eventType, "to", roomNames.length, "rooms");

    return {
      success: true,
      eventId,
      recipientCount,
    };
  }

  /**
   * Broadcast via HTTP to realtime server
   */
  private async broadcastHTTP(
    eventType: string,
    roomNames: string[],
    payload: unknown,
    eventId: string,
  ): Promise<BroadcastResult> {
    try {
      const response = await fetch(
        `${this.config.realtimeServerUrl}/api/broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey,
          },
          body: JSON.stringify({
            eventType,
            rooms: roomNames,
            payload,
            eventId,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Broadcast failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      this.log("HTTP broadcast:", eventType, "to", roomNames.length, "rooms");

      return {
        success: true,
        eventId,
        recipientCount: result.recipientCount,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("API broadcast failed", new Error(errorMessage), {
        eventType,
        rooms: roomNames,
        eventId,
      });

      return {
        success: false,
        eventId,
        error: errorMessage,
      };
    }
  }

  /**
   * Queue an event for batched broadcast
   */
  queueBroadcast(
    eventType: string,
    roomNames: string[],
    payload: unknown,
  ): void {
    this.eventQueue.push({
      eventType,
      roomNames,
      payload,
      timestamp: Date.now(),
    });

    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushQueue();
      }, 50);
    }
  }

  /**
   * Flush queued events
   */
  private async flushQueue(): Promise<void> {
    this.flushTimer = null;

    if (this.eventQueue.length === 0) {
      return;
    }

    const events = this.eventQueue;
    this.eventQueue = [];

    // Send batched events
    try {
      await fetch(`${this.config.realtimeServerUrl}/api/broadcast/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      this.log("Flushed", events.length, "queued events");
    } catch (error) {
      logger.error("Batch broadcast failed", error as Error, {
        eventCount: events.length,
      });
    }
  }

  // ============================================================================
  // Internal Pub/Sub Subscription (for testing/development)
  // ============================================================================

  /**
   * Subscribe to internal broadcasts (for same-process listeners)
   */
  static subscribeInternal(
    eventType: string,
    roomName: string,
    listener: (payload: unknown) => void,
  ): () => void {
    const key = `${eventType}:${roomName}`;

    if (!internalEventListeners.has(key)) {
      internalEventListeners.set(key, new Set());
    }

    internalEventListeners.get(key)!.add(listener);

    return () => {
      internalEventListeners.get(key)?.delete(listener);
    };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[APIBroadcaster]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let broadcasterInstance: APIEventBroadcaster | null = null;

/**
 * Get the API event broadcaster instance
 */
export function getAPIEventBroadcaster(
  config?: APIEventBroadcasterConfig,
): APIEventBroadcaster {
  if (!broadcasterInstance) {
    broadcasterInstance = new APIEventBroadcaster(config);
  }
  return broadcasterInstance;
}

/**
 * Initialize the API event broadcaster
 */
export function initializeAPIEventBroadcaster(
  config?: APIEventBroadcasterConfig,
): APIEventBroadcaster {
  const broadcaster = getAPIEventBroadcaster(config);
  broadcaster.initialize();
  return broadcaster;
}

/**
 * Reset the API event broadcaster
 */
export function resetAPIEventBroadcaster(): void {
  if (broadcasterInstance) {
    broadcasterInstance.destroy();
    broadcasterInstance = null;
  }
}

export { APIEventBroadcaster };
export default APIEventBroadcaster;
