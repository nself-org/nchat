/**
 * Event Dispatcher Service
 *
 * Central service for dispatching realtime events to connected clients.
 * This service bridges the API layer with Socket.io to broadcast changes
 * to all subscribed clients in real-time.
 *
 * @module services/realtime/event-dispatcher.service
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";
import { realtimeClient } from "./realtime-client";
import { getRoomsService } from "./rooms.service";
import { logger } from "@/lib/logger";
import {
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
  type MessagePinEvent,
  type ReactionAddEvent,
  type ReactionRemoveEvent,
  type ChannelUpdateEvent,
  type ChannelMemberJoinEvent,
  type ChannelMemberLeaveEvent,
  type ChannelMemberRoleUpdateEvent,
  type ThreadCreatedEvent,
  type ThreadStatsUpdateEvent,
  type ReadReceiptEvent,
  type EventMetadata,
  type EventUser,
  REALTIME_EVENTS,
  getChannelRoom,
  getThreadRoom,
  getUserRoom,
} from "./events.types";

// ============================================================================
// Types
// ============================================================================

/**
 * Dispatcher configuration
 */
export interface EventDispatcherConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Server version for event metadata */
  serverVersion?: string;
  /** Whether this is a client-side dispatcher (emits to server) */
  isClientSide?: boolean;
}

/**
 * Message data for dispatching
 */
export interface DispatchMessageData {
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
    width?: number;
    height?: number;
    thumbnailUrl?: string;
  }>;
  metadata?: Record<string, unknown>;
  ttlSeconds?: number;
  expiresAt?: string;
  createdAt: string;
  user: EventUser;
}

/**
 * Reaction data for dispatching
 */
export interface DispatchReactionData {
  messageId: string;
  channelId: string;
  emoji: string;
  user: EventUser;
  totalCount: number;
}

/**
 * Channel update data for dispatching
 */
export interface DispatchChannelUpdateData {
  channelId: string;
  updates: Record<string, unknown>;
  updatedBy: EventUser;
}

/**
 * Member join data for dispatching
 */
export interface DispatchMemberJoinData {
  channelId: string;
  channelName: string;
  user: EventUser;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  addedBy?: EventUser;
  memberCount: number;
}

/**
 * Member leave data for dispatching
 */
export interface DispatchMemberLeaveData {
  channelId: string;
  channelName: string;
  userId: string;
  username?: string;
  removedBy?: EventUser;
  reason?: "left" | "kicked" | "banned";
  memberCount: number;
}

/**
 * Event listener callback
 */
export type EventDispatchListener = (
  eventType: string,
  roomName: string,
  payload: unknown,
) => void;

// ============================================================================
// Event Dispatcher Class
// ============================================================================

/**
 * EventDispatcherService - Dispatches realtime events to connected clients
 */
class EventDispatcherService {
  private config: Required<EventDispatcherConfig>;
  private listeners = new Set<EventDispatchListener>();
  private isInitialized = false;
  private pendingEvents: Array<{
    type: string;
    room: string;
    payload: unknown;
  }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: EventDispatcherConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      serverVersion: config.serverVersion ?? "0.9.1",
      isClientSide: config.isClientSide ?? true,
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the event dispatcher
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.log("Event dispatcher initialized");
  }

  /**
   * Destroy the event dispatcher
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.pendingEvents = [];
    this.listeners.clear();
    this.isInitialized = false;
    this.log("Event dispatcher destroyed");
  }

  // ============================================================================
  // Event Metadata
  // ============================================================================

  /**
   * Create event metadata
   */
  private createMetadata(): EventMetadata {
    return {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      serverVersion: this.config.serverVersion,
    };
  }

  // ============================================================================
  // Message Events
  // ============================================================================

  /**
   * Dispatch a new message event
   */
  dispatchMessageNew(data: DispatchMessageData): void {
    const roomName = getChannelRoom(data.channelId);

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
        width: a.width,
        height: a.height,
        thumbnailUrl: a.thumbnailUrl,
      })),
      metadata: data.metadata,
      ttlSeconds: data.ttlSeconds,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
    };

    this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_NEW, roomName, payload);

    // Also dispatch to thread room if this is a thread reply
    if (data.threadId) {
      const threadRoom = getThreadRoom(data.threadId);
      this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_NEW, threadRoom, payload);
    }

    // Send notifications to mentioned users
    if (data.mentions?.length) {
      data.mentions.forEach((userId) => {
        const userRoom = getUserRoom(userId);
        this.dispatchToRoom("notification", userRoom, {
          id: uuidv4(),
          type: "mention",
          title: `${data.user.displayName || data.user.username} mentioned you`,
          body: data.content.substring(0, 100),
          data: {
            channelId: data.channelId,
            messageId: data.id,
            threadId: data.threadId,
          },
          createdAt: new Date().toISOString(),
        });
      });
    }

    this.log("Dispatched message:new", data.id, "to room", roomName);
  }

  /**
   * Dispatch a message update (edit) event
   */
  dispatchMessageUpdate(
    messageId: string,
    channelId: string,
    content: string,
    contentHtml: string | undefined,
    editedBy: EventUser,
    threadId?: string,
    mentionedUserIds?: string[],
    metadata?: Record<string, unknown>,
  ): void {
    const roomName = getChannelRoom(channelId);

    const payload: MessageUpdateEvent = {
      meta: this.createMetadata(),
      id: messageId,
      channelId,
      content,
      contentHtml,
      editedBy,
      editedAt: new Date().toISOString(),
      mentionedUserIds,
      metadata,
    };

    this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_UPDATE, roomName, payload);

    // Also dispatch to thread room if applicable
    if (threadId) {
      const threadRoom = getThreadRoom(threadId);
      this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_UPDATE, threadRoom, payload);
    }

    this.log("Dispatched message:update", messageId, "to room", roomName);
  }

  /**
   * Dispatch a message delete event
   */
  dispatchMessageDelete(
    messageId: string,
    channelId: string,
    deletedBy?: EventUser,
    threadId?: string,
    hardDelete = false,
  ): void {
    const roomName = getChannelRoom(channelId);

    const payload: MessageDeleteEvent = {
      meta: this.createMetadata(),
      id: messageId,
      channelId,
      threadId,
      deletedBy,
      deletedAt: new Date().toISOString(),
      hardDelete,
    };

    this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_DELETE, roomName, payload);

    // Also dispatch to thread room if applicable
    if (threadId) {
      const threadRoom = getThreadRoom(threadId);
      this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_DELETE, threadRoom, payload);
    }

    this.log("Dispatched message:delete", messageId, "to room", roomName);
  }

  /**
   * Dispatch a message pin/unpin event
   */
  dispatchMessagePin(
    messageId: string,
    channelId: string,
    pinnedBy: EventUser,
    action: "pin" | "unpin",
  ): void {
    const roomName = getChannelRoom(channelId);

    const payload: MessagePinEvent = {
      meta: this.createMetadata(),
      messageId,
      channelId,
      pinnedBy,
      pinnedAt: new Date().toISOString(),
      action,
    };

    this.dispatchToRoom(REALTIME_EVENTS.MESSAGE_PIN, roomName, payload);

    this.log("Dispatched message:pin", messageId, action, "to room", roomName);
  }

  // ============================================================================
  // Reaction Events
  // ============================================================================

  /**
   * Dispatch a reaction add event
   */
  dispatchReactionAdd(data: DispatchReactionData): void {
    const roomName = getChannelRoom(data.channelId);

    const payload: ReactionAddEvent = {
      meta: this.createMetadata(),
      messageId: data.messageId,
      channelId: data.channelId,
      emoji: data.emoji,
      user: data.user,
      totalCount: data.totalCount,
      createdAt: new Date().toISOString(),
    };

    this.dispatchToRoom(REALTIME_EVENTS.REACTION_ADD, roomName, payload);

    this.log(
      "Dispatched reaction:add",
      data.emoji,
      "on message",
      data.messageId,
    );
  }

  /**
   * Dispatch a reaction remove event
   */
  dispatchReactionRemove(
    messageId: string,
    channelId: string,
    emoji: string,
    userId: string,
    remainingCount: number,
  ): void {
    const roomName = getChannelRoom(channelId);

    const payload: ReactionRemoveEvent = {
      meta: this.createMetadata(),
      messageId,
      channelId,
      emoji,
      userId,
      remainingCount,
    };

    this.dispatchToRoom(REALTIME_EVENTS.REACTION_REMOVE, roomName, payload);

    this.log("Dispatched reaction:remove", emoji, "from message", messageId);
  }

  // ============================================================================
  // Channel Events
  // ============================================================================

  /**
   * Dispatch a channel update event
   */
  dispatchChannelUpdate(data: DispatchChannelUpdateData): void {
    const roomName = getChannelRoom(data.channelId);

    const payload: ChannelUpdateEvent = {
      meta: this.createMetadata(),
      channelId: data.channelId,
      updates: data.updates as ChannelUpdateEvent["updates"],
      updatedBy: data.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    this.dispatchToRoom(REALTIME_EVENTS.CHANNEL_UPDATE, roomName, payload);

    this.log("Dispatched channel:update for channel", data.channelId);
  }

  /**
   * Dispatch a member join event
   */
  dispatchMemberJoin(data: DispatchMemberJoinData): void {
    const roomName = getChannelRoom(data.channelId);

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

    this.dispatchToRoom(REALTIME_EVENTS.CHANNEL_MEMBER_JOIN, roomName, payload);

    this.log(
      "Dispatched channel:member_join",
      data.user.id,
      "to channel",
      data.channelId,
    );
  }

  /**
   * Dispatch a member leave event
   */
  dispatchMemberLeave(data: DispatchMemberLeaveData): void {
    const roomName = getChannelRoom(data.channelId);

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

    this.dispatchToRoom(
      REALTIME_EVENTS.CHANNEL_MEMBER_LEAVE,
      roomName,
      payload,
    );

    // Also notify the user who left/was removed
    const userRoom = getUserRoom(data.userId);
    this.dispatchToRoom(
      REALTIME_EVENTS.CHANNEL_MEMBER_LEAVE,
      userRoom,
      payload,
    );

    this.log(
      "Dispatched channel:member_leave",
      data.userId,
      "from channel",
      data.channelId,
    );
  }

  /**
   * Dispatch a member role update event
   */
  dispatchMemberRoleUpdate(
    channelId: string,
    userId: string,
    username: string | undefined,
    previousRole: ChannelMemberRoleUpdateEvent["previousRole"],
    newRole: ChannelMemberRoleUpdateEvent["newRole"],
    changedBy: EventUser,
  ): void {
    const roomName = getChannelRoom(channelId);

    const payload: ChannelMemberRoleUpdateEvent = {
      meta: this.createMetadata(),
      channelId,
      userId,
      username,
      previousRole,
      newRole,
      changedBy,
      changedAt: new Date().toISOString(),
    };

    this.dispatchToRoom(
      REALTIME_EVENTS.CHANNEL_MEMBER_ROLE_UPDATE,
      roomName,
      payload,
    );

    // Notify the affected user
    const userRoom = getUserRoom(userId);
    this.dispatchToRoom(
      REALTIME_EVENTS.CHANNEL_MEMBER_ROLE_UPDATE,
      userRoom,
      payload,
    );

    this.log(
      "Dispatched channel:member_role_update",
      userId,
      "from",
      previousRole,
      "to",
      newRole,
    );
  }

  // ============================================================================
  // Thread Events
  // ============================================================================

  /**
   * Dispatch a thread created event
   */
  dispatchThreadCreated(
    threadId: string,
    channelId: string,
    parentMessageId: string,
    startedBy: EventUser,
    title?: string,
  ): void {
    const channelRoom = getChannelRoom(channelId);

    const payload: ThreadCreatedEvent = {
      meta: this.createMetadata(),
      threadId,
      channelId,
      parentMessageId,
      startedBy,
      title,
      createdAt: new Date().toISOString(),
    };

    this.dispatchToRoom(REALTIME_EVENTS.THREAD_CREATED, channelRoom, payload);

    this.log("Dispatched thread:created", threadId, "in channel", channelId);
  }

  /**
   * Dispatch thread stats update
   */
  dispatchThreadStatsUpdate(
    threadId: string,
    channelId: string,
    messageCount: number,
    participantCount: number,
    lastMessageAt: string,
    recentParticipantIds: string[],
  ): void {
    const channelRoom = getChannelRoom(channelId);
    const threadRoom = getThreadRoom(threadId);

    const payload: ThreadStatsUpdateEvent = {
      meta: this.createMetadata(),
      threadId,
      channelId,
      messageCount,
      participantCount,
      lastMessageAt,
      recentParticipantIds,
    };

    // Dispatch to both channel and thread rooms
    this.dispatchToRoom(
      REALTIME_EVENTS.THREAD_STATS_UPDATE,
      channelRoom,
      payload,
    );
    this.dispatchToRoom(
      REALTIME_EVENTS.THREAD_STATS_UPDATE,
      threadRoom,
      payload,
    );

    this.log("Dispatched thread:stats_update", threadId);
  }

  // ============================================================================
  // Read Receipt Events
  // ============================================================================

  /**
   * Dispatch a read receipt update
   */
  dispatchReadReceipt(
    channelId: string,
    userId: string,
    lastReadMessageId: string,
    unreadCount: number,
  ): void {
    const roomName = getChannelRoom(channelId);

    const payload: ReadReceiptEvent = {
      channelId,
      userId,
      lastReadMessageId,
      readAt: new Date().toISOString(),
      unreadCount,
    };

    this.dispatchToRoom(REALTIME_EVENTS.READ_RECEIPT_UPDATE, roomName, payload);

    this.log(
      "Dispatched read_receipt:update for user",
      userId,
      "in channel",
      channelId,
    );
  }

  // ============================================================================
  // Core Dispatch Method
  // ============================================================================

  /**
   * Dispatch an event to a specific room
   */
  private dispatchToRoom(
    eventType: string,
    roomName: string,
    payload: unknown,
  ): void {
    // Notify local listeners
    this.listeners.forEach((listener) => {
      try {
        listener(eventType, roomName, payload);
      } catch (error) {
        logger.error("[EventDispatcher] Listener error:", error);
      }
    });

    // If we're on the client side, emit to the server
    if (this.config.isClientSide && realtimeClient.isConnected) {
      realtimeClient.emit("dispatch", {
        event: eventType,
        room: roomName,
        payload,
      });
    }

    // For server-side dispatching, we would emit directly to the room
    // This will be handled by the socket server
  }

  /**
   * Dispatch an event to multiple rooms
   */
  dispatchToRooms(
    eventType: string,
    roomNames: string[],
    payload: unknown,
  ): void {
    roomNames.forEach((roomName) => {
      this.dispatchToRoom(eventType, roomName, payload);
    });
  }

  /**
   * Dispatch to a user's personal room
   */
  dispatchToUser(userId: string, eventType: string, payload: unknown): void {
    const userRoom = getUserRoom(userId);
    this.dispatchToRoom(eventType, userRoom, payload);
  }

  /**
   * Dispatch to multiple users
   */
  dispatchToUsers(
    userIds: string[],
    eventType: string,
    payload: unknown,
  ): void {
    userIds.forEach((userId) => {
      this.dispatchToUser(userId, eventType, payload);
    });
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to dispatched events (for local components)
   */
  subscribe(listener: EventDispatchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ============================================================================
  // Batch Dispatching
  // ============================================================================

  /**
   * Queue an event for batched dispatch
   */
  queueEvent(eventType: string, roomName: string, payload: unknown): void {
    this.pendingEvents.push({ type: eventType, room: roomName, payload });

    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushPendingEvents();
      }, 50); // 50ms batch window
    }
  }

  /**
   * Flush all pending events
   */
  private flushPendingEvents(): void {
    this.flushTimer = null;

    if (this.pendingEvents.length === 0) {
      return;
    }

    // Group events by room for efficiency
    const eventsByRoom = new Map<
      string,
      Array<{ type: string; payload: unknown }>
    >();

    for (const event of this.pendingEvents) {
      if (!eventsByRoom.has(event.room)) {
        eventsByRoom.set(event.room, []);
      }
      eventsByRoom
        .get(event.room)!
        .push({ type: event.type, payload: event.payload });
    }

    // Dispatch grouped events
    for (const [room, events] of eventsByRoom) {
      if (events.length === 1) {
        this.dispatchToRoom(events[0].type, room, events[0].payload);
      } else {
        // Dispatch batch
        this.dispatchToRoom("events:batch", room, { events });
      }
    }

    this.pendingEvents = [];
    this.log("Flushed", this.pendingEvents.length, "pending events");
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[EventDispatcher]', ...args)
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

let eventDispatcherInstance: EventDispatcherService | null = null;

/**
 * Get the event dispatcher instance
 */
export function getEventDispatcher(
  config?: EventDispatcherConfig,
): EventDispatcherService {
  if (!eventDispatcherInstance) {
    eventDispatcherInstance = new EventDispatcherService(config);
  }
  return eventDispatcherInstance;
}

/**
 * Initialize the event dispatcher
 */
export function initializeEventDispatcher(
  config?: EventDispatcherConfig,
): EventDispatcherService {
  const dispatcher = getEventDispatcher(config);
  dispatcher.initialize();
  return dispatcher;
}

/**
 * Reset the event dispatcher
 */
export function resetEventDispatcher(): void {
  if (eventDispatcherInstance) {
    eventDispatcherInstance.destroy();
    eventDispatcherInstance = null;
  }
}

export { EventDispatcherService };
export default EventDispatcherService;
