/**
 * Presence Broadcaster - Broadcasts presence changes via Socket.io
 *
 * Handles emitting presence updates, typing indicators, and subscribing
 * to other users' presence changes.
 */

import { emit, on, off, isConnected } from "../socket/client";
import {
  SocketEvents,
  type PresenceEvent,
  type PresenceBulkEvent,
  type PresenceStatus as SocketPresenceStatus,
} from "../socket/events";
import type {
  PresenceStatus,
  CustomStatus,
  UserPresence,
} from "./presence-types";

/**
 * Convert our presence status to socket-compatible status
 * 'invisible' is treated as 'offline' for the socket layer
 */
const toSocketStatus = (status: PresenceStatus): SocketPresenceStatus => {
  if (status === "invisible") {
    return "offline";
  }
  return status;
};

export interface PresenceBroadcasterOptions {
  /**
   * Minimum time between presence broadcasts (ms)
   * @default 30000 (30 seconds)
   */
  throttleInterval?: number;

  /**
   * Callback when presence update is received
   */
  onPresenceUpdate?: (presence: PresenceEvent) => void;

  /**
   * Callback when bulk presence is received
   */
  onPresenceBulk?: (presences: PresenceEvent[]) => void;

  /**
   * Callback when typing start is received
   */
  onTypingStart?: (event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }) => void;

  /**
   * Callback when typing stop is received
   */
  onTypingStop?: (event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }) => void;
}

export class PresenceBroadcaster {
  private throttleInterval: number;
  private lastBroadcast: number = 0;
  private subscribedUsers: Set<string> = new Set();
  private isInitialized = false;

  private onPresenceUpdate?: (presence: PresenceEvent) => void;
  private onPresenceBulk?: (presences: PresenceEvent[]) => void;
  private onTypingStart?: (event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }) => void;
  private onTypingStop?: (event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }) => void;

  constructor(options: PresenceBroadcasterOptions = {}) {
    this.throttleInterval = options.throttleInterval ?? 30000;
    this.onPresenceUpdate = options.onPresenceUpdate;
    this.onPresenceBulk = options.onPresenceBulk;
    this.onTypingStart = options.onTypingStart;
    this.onTypingStop = options.onTypingStop;

    // Bind handlers
    this.handlePresenceUpdate = this.handlePresenceUpdate.bind(this);
    this.handlePresenceBulk = this.handlePresenceBulk.bind(this);
    this.handleTypingStart = this.handleTypingStart.bind(this);
    this.handleTypingStop = this.handleTypingStop.bind(this);
  }

  /**
   * Initialize the broadcaster and set up socket listeners
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Set up listeners
    on(SocketEvents.PRESENCE_UPDATE, this.handlePresenceUpdate);
    on(SocketEvents.PRESENCE_BULK, this.handlePresenceBulk);
    on(SocketEvents.TYPING_START, this.handleTypingStart);
    on(SocketEvents.TYPING_STOP, this.handleTypingStop);

    this.isInitialized = true;
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    if (!this.isInitialized) return;

    off(SocketEvents.PRESENCE_UPDATE, this.handlePresenceUpdate);
    off(SocketEvents.PRESENCE_BULK, this.handlePresenceBulk);
    off(SocketEvents.TYPING_START, this.handleTypingStart);
    off(SocketEvents.TYPING_STOP, this.handleTypingStop);

    this.subscribedUsers.clear();
    this.isInitialized = false;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: Partial<PresenceBroadcasterOptions>): void {
    if (callbacks.onPresenceUpdate !== undefined) {
      this.onPresenceUpdate = callbacks.onPresenceUpdate;
    }
    if (callbacks.onPresenceBulk !== undefined) {
      this.onPresenceBulk = callbacks.onPresenceBulk;
    }
    if (callbacks.onTypingStart !== undefined) {
      this.onTypingStart = callbacks.onTypingStart;
    }
    if (callbacks.onTypingStop !== undefined) {
      this.onTypingStop = callbacks.onTypingStop;
    }
  }

  // ============================================================================
  // Presence Broadcasting
  // ============================================================================

  /**
   * Broadcast presence status update
   */
  broadcastPresence(
    status: PresenceStatus,
    customStatus?: CustomStatus,
    force = false,
  ): boolean {
    if (!isConnected()) return false;

    const now = Date.now();
    if (!force && now - this.lastBroadcast < this.throttleInterval) {
      return false;
    }

    emit(SocketEvents.PRESENCE_UPDATE, {
      status: toSocketStatus(status),
      customStatus: customStatus?.text,
      customEmoji: customStatus?.emoji,
    });

    this.lastBroadcast = now;
    return true;
  }

  /**
   * Broadcast going offline
   */
  broadcastOffline(): void {
    if (!isConnected()) return;

    emit(SocketEvents.PRESENCE_UPDATE, {
      status: "offline",
      customStatus: undefined,
      customEmoji: undefined,
    });
  }

  /**
   * Broadcast custom status change
   */
  broadcastCustomStatus(customStatus: CustomStatus | null): void {
    if (!isConnected()) return;

    // USER_STATUS event requires a status field - use current status or default to online
    emit(SocketEvents.USER_STATUS, {
      status: "online", // This is a custom status update, not a presence change
      customStatus: customStatus?.text,
      customEmoji: customStatus?.emoji,
      expiresAt: customStatus?.expiresAt?.toISOString(),
    });
  }

  // ============================================================================
  // Typing Broadcasting
  // ============================================================================

  /**
   * Broadcast typing start
   */
  broadcastTypingStart(channelId: string, threadId?: string): void {
    if (!isConnected()) return;

    emit(SocketEvents.TYPING_START, {
      channelId,
      threadId,
    });
  }

  /**
   * Broadcast typing stop
   */
  broadcastTypingStop(channelId: string, threadId?: string): void {
    if (!isConnected()) return;

    emit(SocketEvents.TYPING_STOP, {
      channelId,
      threadId,
    });
  }

  // ============================================================================
  // Presence Subscriptions
  // ============================================================================

  /**
   * Subscribe to presence updates for specific users
   */
  subscribeToUsers(userIds: string[]): void {
    if (!isConnected()) return;

    const newUserIds = userIds.filter((id) => !this.subscribedUsers.has(id));
    if (newUserIds.length === 0) return;

    emit(SocketEvents.PRESENCE_SUBSCRIBE, { userIds: newUserIds });
    newUserIds.forEach((id) => this.subscribedUsers.add(id));
  }

  /**
   * Unsubscribe from presence updates for specific users
   */
  unsubscribeFromUsers(userIds: string[]): void {
    if (!isConnected()) return;

    const subscribedIds = userIds.filter((id) => this.subscribedUsers.has(id));
    if (subscribedIds.length === 0) return;

    emit(SocketEvents.PRESENCE_UNSUBSCRIBE, { userIds: subscribedIds });
    subscribedIds.forEach((id) => this.subscribedUsers.delete(id));
  }

  /**
   * Get list of subscribed user IDs
   */
  getSubscribedUsers(): string[] {
    return Array.from(this.subscribedUsers);
  }

  /**
   * Check if subscribed to a user
   */
  isSubscribedTo(userId: string): boolean {
    return this.subscribedUsers.has(userId);
  }

  // ============================================================================
  // Handlers
  // ============================================================================

  private handlePresenceUpdate(event: PresenceEvent): void {
    this.onPresenceUpdate?.(event);
  }

  private handlePresenceBulk(event: PresenceBulkEvent): void {
    this.onPresenceBulk?.(event.presences);
  }

  private handleTypingStart(event: {
    userId: string;
    channelId: string;
    threadId?: string;
    user?: { id: string; displayName: string; avatarUrl?: string };
  }): void {
    this.onTypingStart?.({
      userId: event.userId,
      channelId: event.channelId,
      threadId: event.threadId,
    });
  }

  private handleTypingStop(event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }): void {
    this.onTypingStop?.(event);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultBroadcaster: PresenceBroadcaster | null = null;

export const getPresenceBroadcaster = (
  options?: PresenceBroadcasterOptions,
): PresenceBroadcaster => {
  if (!defaultBroadcaster) {
    defaultBroadcaster = new PresenceBroadcaster(options);
  }
  return defaultBroadcaster;
};

export const destroyPresenceBroadcaster = (): void => {
  if (defaultBroadcaster) {
    defaultBroadcaster.destroy();
    defaultBroadcaster = null;
  }
};
