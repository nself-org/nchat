/**
 * Subscription Bridge Service
 *
 * Bridges GraphQL subscriptions with Socket.io events, ensuring that
 * changes from both sources are properly synchronized and broadcast
 * to all connected clients.
 *
 * This service:
 * 1. Listens to GraphQL subscriptions for database changes
 * 2. Converts subscription data to Socket.io event payloads
 * 3. Manages room subscriptions for efficient event routing
 * 4. Handles reconnection and resubscription logic
 *
 * @module services/realtime/subscription-bridge.service
 * @version 1.0.0
 */

import {
  ApolloClient,
  NormalizedCacheObject,
  Observable,
} from "@apollo/client";
import { realtimeClient, RealtimeConnectionState } from "./realtime-client";
import { getRoomsService } from "./rooms.service";
import { getEventDispatcher } from "./event-dispatcher.service";
import {
  MESSAGE_SUBSCRIPTION,
  MESSAGE_UPDATED_SUBSCRIPTION,
  MESSAGE_DELETED_SUBSCRIPTION,
  CHANNEL_REACTIONS_SUBSCRIPTION,
  TYPING_SUBSCRIPTION,
  READ_RECEIPTS_SUBSCRIPTION,
  THREAD_MESSAGES_SUBSCRIPTION,
  THREAD_SUBSCRIPTION,
} from "@/graphql/messages/subscriptions";
import {
  REALTIME_EVENTS,
  getChannelRoom,
  getThreadRoom,
  type EventUser,
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
  type ReactionAddEvent,
  type TypingEvent,
  type ReadReceiptEvent,
} from "./events.types";

// ============================================================================
// Types
// ============================================================================

/**
 * Subscription bridge configuration
 */
export interface SubscriptionBridgeConfig {
  /** Apollo client for GraphQL subscriptions */
  apolloClient?: ApolloClient<NormalizedCacheObject>;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-subscribe to joined rooms */
  autoSubscribe?: boolean;
  /** Retry subscription on error */
  retryOnError?: boolean;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Active subscription record
 */
interface ActiveSubscription {
  /** Subscription ID */
  id: string;
  /** Room name */
  roomName: string;
  /** Subscription type */
  type: "channel" | "thread" | "typing" | "reactions" | "read_receipts";
  /** Apollo subscription */
  subscription: ZenObservable.Subscription;
  /** Creation timestamp */
  createdAt: number;
  /** Retry count */
  retryCount: number;
}

/**
 * GraphQL subscription data types
 */
interface GraphQLMessage {
  id: string;
  channel_id: string;
  content: string;
  content_html?: string;
  type: string;
  thread_id?: string;
  parent_message_id?: string;
  mentions?: string[];
  mentioned_roles?: string[];
  mentioned_channels?: string[];
  metadata?: Record<string, unknown>;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    filename: string;
    size_bytes?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    thumbnail_url?: string;
  }>;
  reactions?: Array<{
    id: string;
    emoji: string;
    user_id: string;
    user?: {
      id: string;
      username: string;
    };
  }>;
}

interface GraphQLReaction {
  id: string;
  message_id: string;
  emoji: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
  };
}

interface GraphQLTypingIndicator {
  id: string;
  user_id: string;
  channel_id: string;
  thread_id?: string;
  started_at: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
  };
}

interface GraphQLReadReceipt {
  user_id: string;
  last_read_message_id: string;
  last_read_at: string;
  unread_count: number;
  user?: {
    id: string;
    username: string;
  };
}

// ZenObservable namespace for type compatibility
namespace ZenObservable {
  export interface Subscription {
    readonly closed: boolean;
    unsubscribe(): void;
  }
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<SubscriptionBridgeConfig, "apolloClient">> =
  {
    debug: false,
    autoSubscribe: true,
    retryOnError: true,
    retryDelay: 5000,
    maxRetries: 5,
  };

// ============================================================================
// Subscription Bridge Class
// ============================================================================

/**
 * SubscriptionBridgeService - Bridges GraphQL subscriptions with Socket.io
 */
class SubscriptionBridgeService {
  private config: Required<Omit<SubscriptionBridgeConfig, "apolloClient">>;
  private apolloClient: ApolloClient<NormalizedCacheObject> | null = null;
  private activeSubscriptions = new Map<string, ActiveSubscription>();
  private roomSubscriptions = new Map<string, Set<string>>(); // roomName -> subscription IDs
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;
  private currentUserId: string | null = null;

  constructor(config: SubscriptionBridgeConfig = {}) {
    this.config = {
      debug: config.debug ?? DEFAULT_CONFIG.debug,
      autoSubscribe: config.autoSubscribe ?? DEFAULT_CONFIG.autoSubscribe,
      retryOnError: config.retryOnError ?? DEFAULT_CONFIG.retryOnError,
      retryDelay: config.retryDelay ?? DEFAULT_CONFIG.retryDelay,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    };

    if (config.apolloClient) {
      this.apolloClient = config.apolloClient;
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the subscription bridge
   */
  initialize(apolloClient?: ApolloClient<NormalizedCacheObject>): void {
    if (this.isInitialized) {
      return;
    }

    if (apolloClient) {
      this.apolloClient = apolloClient;
    }

    this.setupConnectionListener();
    this.setupRoomListener();

    this.isInitialized = true;
    this.log("Subscription bridge initialized");
  }

  /**
   * Set the current user ID
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  /**
   * Destroy the subscription bridge
   */
  destroy(): void {
    // Unsubscribe from all active subscriptions
    for (const [id, sub] of this.activeSubscriptions) {
      try {
        sub.subscription.unsubscribe();
      } catch (error) {
        this.log("Error unsubscribing:", id, error);
      }
    }

    this.activeSubscriptions.clear();
    this.roomSubscriptions.clear();

    // Cleanup listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    this.isInitialized = false;
    this.log("Subscription bridge destroyed");
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Set up connection state listener
   */
  private setupConnectionListener(): void {
    const unsub = realtimeClient.onConnectionStateChange(
      (state: RealtimeConnectionState) => {
        if (state === "authenticated") {
          // Resubscribe to all rooms on reconnection
          this.resubscribeAll();
        } else if (state === "disconnected") {
          // Pause subscriptions when disconnected
          this.pauseSubscriptions();
        }
      },
    );

    this.unsubscribers.push(unsub);
  }

  /**
   * Set up room state listener
   */
  private setupRoomListener(): void {
    if (!this.config.autoSubscribe) {
      return;
    }

    const roomsService = getRoomsService();

    const unsub = roomsService.onRoomStateChange((rooms) => {
      // Subscribe to new rooms
      for (const roomName of rooms) {
        if (!this.roomSubscriptions.has(roomName)) {
          this.subscribeToRoom(roomName);
        }
      }

      // Unsubscribe from rooms we've left
      for (const roomName of this.roomSubscriptions.keys()) {
        if (!rooms.includes(roomName)) {
          this.unsubscribeFromRoom(roomName);
        }
      }
    });

    this.unsubscribers.push(unsub);
  }

  /**
   * Resubscribe to all rooms after reconnection
   */
  private resubscribeAll(): void {
    this.log("Resubscribing to all rooms after reconnection");

    const roomNames = Array.from(this.roomSubscriptions.keys());

    for (const roomName of roomNames) {
      // Clear existing subscriptions for this room
      this.unsubscribeFromRoom(roomName);

      // Resubscribe
      this.subscribeToRoom(roomName);
    }
  }

  /**
   * Pause all subscriptions during disconnect
   */
  private pauseSubscriptions(): void {
    this.log("Pausing subscriptions during disconnect");
    // Subscriptions will automatically retry when connection is restored
  }

  // ============================================================================
  // Room Subscription Management
  // ============================================================================

  /**
   * Subscribe to all events for a room
   */
  subscribeToRoom(roomName: string): void {
    if (!this.apolloClient) {
      this.log("Cannot subscribe: Apollo client not initialized");
      return;
    }

    // Parse room name to determine type
    const parts = roomName.split(":");
    if (parts.length !== 2) {
      this.log("Invalid room name:", roomName);
      return;
    }

    const [type, id] = parts;

    if (!this.roomSubscriptions.has(roomName)) {
      this.roomSubscriptions.set(roomName, new Set());
    }

    if (type === "channel") {
      this.subscribeToChannelMessages(id);
      this.subscribeToChannelReactions(id);
      this.subscribeToChannelTyping(id);
      this.subscribeToChannelReadReceipts(id);
    } else if (type === "thread") {
      this.subscribeToThreadMessages(id);
    }

    this.log("Subscribed to room:", roomName);
  }

  /**
   * Unsubscribe from all events for a room
   */
  unsubscribeFromRoom(roomName: string): void {
    const subscriptionIds = this.roomSubscriptions.get(roomName);
    if (!subscriptionIds) {
      return;
    }

    for (const subId of subscriptionIds) {
      const sub = this.activeSubscriptions.get(subId);
      if (sub) {
        try {
          sub.subscription.unsubscribe();
        } catch (error) {
          this.log("Error unsubscribing:", subId, error);
        }
        this.activeSubscriptions.delete(subId);
      }
    }

    this.roomSubscriptions.delete(roomName);
    this.log("Unsubscribed from room:", roomName);
  }

  // ============================================================================
  // Channel Subscriptions
  // ============================================================================

  /**
   * Subscribe to new messages in a channel
   */
  private subscribeToChannelMessages(channelId: string): void {
    if (!this.apolloClient) return;

    const roomName = getChannelRoom(channelId);
    const subId = `message:${channelId}`;

    // Check if already subscribed
    if (this.activeSubscriptions.has(subId)) {
      return;
    }

    const observable = this.apolloClient.subscribe({
      query: MESSAGE_SUBSCRIPTION,
      variables: { channelId },
    });

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.nchat_messages?.length > 0) {
          const message = data.nchat_messages[0] as GraphQLMessage;
          this.handleNewMessage(message, channelId);
        }
      },
      error: (error) => {
        this.handleSubscriptionError(subId, error);
      },
    });

    this.registerSubscription(subId, roomName, "channel", subscription);
  }

  /**
   * Subscribe to reactions in a channel
   */
  private subscribeToChannelReactions(channelId: string): void {
    if (!this.apolloClient) return;

    const roomName = getChannelRoom(channelId);
    const subId = `reactions:${channelId}`;

    if (this.activeSubscriptions.has(subId)) {
      return;
    }

    const observable = this.apolloClient.subscribe({
      query: CHANNEL_REACTIONS_SUBSCRIPTION,
      variables: { channelId },
    });

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.nchat_reactions?.length > 0) {
          for (const reaction of data.nchat_reactions as GraphQLReaction[]) {
            this.handleReaction(reaction, channelId);
          }
        }
      },
      error: (error) => {
        this.handleSubscriptionError(subId, error);
      },
    });

    this.registerSubscription(subId, roomName, "reactions", subscription);
  }

  /**
   * Subscribe to typing indicators in a channel
   */
  private subscribeToChannelTyping(channelId: string): void {
    if (!this.apolloClient) return;

    const roomName = getChannelRoom(channelId);
    const subId = `typing:${channelId}`;

    if (this.activeSubscriptions.has(subId)) {
      return;
    }

    const observable = this.apolloClient.subscribe({
      query: TYPING_SUBSCRIPTION,
      variables: { channelId },
    });

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.nchat_typing_indicators) {
          this.handleTypingIndicators(
            data.nchat_typing_indicators as GraphQLTypingIndicator[],
            channelId,
          );
        }
      },
      error: (error) => {
        this.handleSubscriptionError(subId, error);
      },
    });

    this.registerSubscription(subId, roomName, "typing", subscription);
  }

  /**
   * Subscribe to read receipts in a channel
   */
  private subscribeToChannelReadReceipts(channelId: string): void {
    if (!this.apolloClient) return;

    const roomName = getChannelRoom(channelId);
    const subId = `read_receipts:${channelId}`;

    if (this.activeSubscriptions.has(subId)) {
      return;
    }

    const observable = this.apolloClient.subscribe({
      query: READ_RECEIPTS_SUBSCRIPTION,
      variables: { channelId },
    });

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.nchat_channel_members) {
          for (const receipt of data.nchat_channel_members as GraphQLReadReceipt[]) {
            this.handleReadReceipt(receipt, channelId);
          }
        }
      },
      error: (error) => {
        this.handleSubscriptionError(subId, error);
      },
    });

    this.registerSubscription(subId, roomName, "read_receipts", subscription);
  }

  // ============================================================================
  // Thread Subscriptions
  // ============================================================================

  /**
   * Subscribe to messages in a thread
   */
  private subscribeToThreadMessages(threadId: string): void {
    if (!this.apolloClient) return;

    const roomName = getThreadRoom(threadId);
    const subId = `thread:${threadId}`;

    if (this.activeSubscriptions.has(subId)) {
      return;
    }

    const observable = this.apolloClient.subscribe({
      query: THREAD_MESSAGES_SUBSCRIPTION,
      variables: { threadId },
    });

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.nchat_messages?.length > 0) {
          const message = data.nchat_messages[0] as GraphQLMessage;
          this.handleNewMessage(message, message.channel_id, threadId);
        }
      },
      error: (error) => {
        this.handleSubscriptionError(subId, error);
      },
    });

    this.registerSubscription(subId, roomName, "thread", subscription);
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle a new message from subscription
   */
  private handleNewMessage(
    message: GraphQLMessage,
    channelId: string,
    threadId?: string,
  ): void {
    const dispatcher = getEventDispatcher();

    const user: EventUser = {
      id: message.user.id,
      username: message.user.username,
      displayName: message.user.display_name,
      avatarUrl: message.user.avatar_url,
    };

    dispatcher.dispatchMessageNew({
      id: message.id,
      channelId,
      content: message.content,
      contentHtml: message.content_html,
      type: message.type,
      threadId: message.thread_id,
      parentMessageId: message.parent_message_id,
      mentions: message.mentions,
      mentionedRoles: message.mentioned_roles,
      mentionedChannels: message.mentioned_channels,
      attachments: message.attachments?.map((a) => ({
        id: a.id,
        type: a.type,
        url: a.url,
        filename: a.filename,
        size: a.size_bytes,
        mimeType: a.mime_type,
        width: a.width,
        height: a.height,
        thumbnailUrl: a.thumbnail_url,
      })),
      metadata: message.metadata,
      createdAt: message.created_at,
      user,
    });

    this.log("Handled new message:", message.id);
  }

  /**
   * Handle a reaction from subscription
   */
  private handleReaction(reaction: GraphQLReaction, channelId: string): void {
    const dispatcher = getEventDispatcher();

    const user: EventUser = {
      id: reaction.user_id,
      username: reaction.user?.username || "unknown",
      displayName: reaction.user?.display_name,
    };

    dispatcher.dispatchReactionAdd({
      messageId: reaction.message_id,
      channelId,
      emoji: reaction.emoji,
      user,
      totalCount: 1, // Will be calculated on client side
    });

    this.log(
      "Handled reaction:",
      reaction.emoji,
      "on message",
      reaction.message_id,
    );
  }

  /**
   * Handle typing indicators from subscription
   */
  private handleTypingIndicators(
    indicators: GraphQLTypingIndicator[],
    channelId: string,
  ): void {
    const roomName = getChannelRoom(channelId);
    const dispatcher = getEventDispatcher();

    // Filter out current user from typing indicators
    const filteredIndicators = indicators.filter(
      (i) => i.user_id !== this.currentUserId,
    );

    const typingEvent: TypingEvent = {
      roomName,
      typingUsers: filteredIndicators.map((i) => ({
        userId: i.user_id,
        userName: i.user?.display_name || i.user?.username,
        startedAt: i.started_at,
      })),
    };

    // Dispatch directly to local listeners
    dispatcher.subscribe((type, room, payload) => {
      // The dispatcher will handle this
    });

    // Use rooms service to emit to socket
    realtimeClient.emit(REALTIME_EVENTS.TYPING_UPDATE, typingEvent);
  }

  /**
   * Handle read receipt from subscription
   */
  private handleReadReceipt(
    receipt: GraphQLReadReceipt,
    channelId: string,
  ): void {
    const dispatcher = getEventDispatcher();

    dispatcher.dispatchReadReceipt(
      channelId,
      receipt.user_id,
      receipt.last_read_message_id,
      receipt.unread_count,
    );

    this.log("Handled read receipt:", receipt.user_id, "in channel", channelId);
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Register a new subscription
   */
  private registerSubscription(
    id: string,
    roomName: string,
    type: ActiveSubscription["type"],
    subscription: ZenObservable.Subscription,
  ): void {
    const record: ActiveSubscription = {
      id,
      roomName,
      type,
      subscription,
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.activeSubscriptions.set(id, record);

    // Track which subscriptions belong to which room
    if (!this.roomSubscriptions.has(roomName)) {
      this.roomSubscriptions.set(roomName, new Set());
    }
    this.roomSubscriptions.get(roomName)!.add(id);

    this.log("Registered subscription:", id, "for room:", roomName);
  }

  /**
   * Handle subscription error
   */
  private handleSubscriptionError(subId: string, error: unknown): void {
    this.log("Subscription error:", subId, error);

    const sub = this.activeSubscriptions.get(subId);
    if (!sub) {
      return;
    }

    if (this.config.retryOnError && sub.retryCount < this.config.maxRetries) {
      // Schedule retry
      sub.retryCount++;

      setTimeout(() => {
        // Parse subscription ID to get type and resource ID
        const [type, id] = subId.split(":");
        const roomName = sub.roomName;

        // Remove old subscription
        this.activeSubscriptions.delete(subId);
        this.roomSubscriptions.get(roomName)?.delete(subId);

        // Resubscribe based on type
        if (type === "message") {
          this.subscribeToChannelMessages(id);
        } else if (type === "reactions") {
          this.subscribeToChannelReactions(id);
        } else if (type === "typing") {
          this.subscribeToChannelTyping(id);
        } else if (type === "read_receipts") {
          this.subscribeToChannelReadReceipts(id);
        } else if (type === "thread") {
          this.subscribeToThreadMessages(id);
        }

        this.log("Retrying subscription:", subId, "attempt:", sub.retryCount);
      }, this.config.retryDelay);
    } else {
      // Remove failed subscription
      this.activeSubscriptions.delete(subId);
      this.roomSubscriptions.get(sub.roomName)?.delete(subId);

      this.log("Subscription failed permanently:", subId);
    }
  }

  // ============================================================================
  // Manual Subscriptions
  // ============================================================================

  /**
   * Manually subscribe to a channel
   */
  subscribeToChannel(channelId: string): void {
    const roomName = getChannelRoom(channelId);
    this.subscribeToRoom(roomName);
  }

  /**
   * Manually unsubscribe from a channel
   */
  unsubscribeFromChannel(channelId: string): void {
    const roomName = getChannelRoom(channelId);
    this.unsubscribeFromRoom(roomName);
  }

  /**
   * Manually subscribe to a thread
   */
  subscribeToThread(threadId: string): void {
    const roomName = getThreadRoom(threadId);
    this.subscribeToRoom(roomName);
  }

  /**
   * Manually unsubscribe from a thread
   */
  unsubscribeFromThread(threadId: string): void {
    const roomName = getThreadRoom(threadId);
    this.unsubscribeFromRoom(roomName);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[SubscriptionBridge]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get active subscription count
   */
  get subscriptionCount(): number {
    return this.activeSubscriptions.size;
  }

  /**
   * Get subscribed room names
   */
  getSubscribedRooms(): string[] {
    return Array.from(this.roomSubscriptions.keys());
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let subscriptionBridgeInstance: SubscriptionBridgeService | null = null;

/**
 * Get the subscription bridge instance
 */
export function getSubscriptionBridge(
  config?: SubscriptionBridgeConfig,
): SubscriptionBridgeService {
  if (!subscriptionBridgeInstance) {
    subscriptionBridgeInstance = new SubscriptionBridgeService(config);
  }
  return subscriptionBridgeInstance;
}

/**
 * Initialize the subscription bridge
 */
export function initializeSubscriptionBridge(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  config?: SubscriptionBridgeConfig,
): SubscriptionBridgeService {
  const bridge = getSubscriptionBridge(config);
  bridge.initialize(apolloClient);
  return bridge;
}

/**
 * Reset the subscription bridge
 */
export function resetSubscriptionBridge(): void {
  if (subscriptionBridgeInstance) {
    subscriptionBridgeInstance.destroy();
    subscriptionBridgeInstance = null;
  }
}

export { SubscriptionBridgeService };
export default SubscriptionBridgeService;
