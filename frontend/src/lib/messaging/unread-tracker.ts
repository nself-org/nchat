/**
 * Unread Message Tracker
 *
 * Core system for tracking unread messages and mentions across channels.
 * Provides persistent storage, real-time tracking, and cross-tab synchronization.
 *
 * Features:
 * - Per-channel last read position tracking
 * - Unread count calculation (messages + mentions)
 * - Persistent storage with localStorage
 * - Cross-tab synchronization via BroadcastChannel
 * - Automatic cleanup of stale data
 * - Efficient batch updates
 */

import type { Message } from "@/types/message";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UnreadPosition {
  /** Last read message ID */
  lastReadMessageId: string;
  /** Timestamp of last read */
  lastReadAt: Date;
  /** Message timestamp (for ordering) */
  messageTimestamp: Date;
}

export interface ChannelUnreadState {
  /** Channel ID */
  channelId: string;
  /** Last read position */
  position?: UnreadPosition;
  /** Cached unread count */
  unreadCount: number;
  /** Cached mention count */
  mentionCount: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

export interface UnreadTrackerState {
  /** Per-channel unread states */
  channels: Record<string, ChannelUnreadState>;
  /** Last sync timestamp */
  lastSyncAt: Date;
  /** Current user ID */
  userId?: string;
}

export interface UnreadSyncEvent {
  type: "mark-read" | "mark-unread" | "reset" | "sync";
  channelId?: string;
  messageId?: string;
  timestamp: number;
  userId: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "nchat-unread-tracker";
const STORAGE_VERSION = 1;
const SYNC_CHANNEL = "nchat-unread-sync";
const MAX_STORAGE_AGE_DAYS = 30;
const BATCH_UPDATE_DELAY = 100; // ms

// ============================================================================
// UnreadTracker Class
// ============================================================================

export class UnreadTracker {
  private state: UnreadTrackerState;
  private userId: string | null = null;
  private currentUserId: string | null = null;
  private syncChannel?: BroadcastChannel;
  private updateTimer?: NodeJS.Timeout;
  private pendingUpdates: Set<string> = new Set();
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.state = this.loadState();
    this.initializeSyncChannel();
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize the tracker with user context
   */
  initialize(userId: string): void {
    this.userId = userId;
    this.currentUserId = userId;
    this.state.userId = userId;

    // Clean up old data for different users
    this.cleanupOldData();

    // Persist initial state
    this.persistState();
  }

  /**
   * Initialize cross-tab sync channel
   */
  private initializeSyncChannel(): void {
    if (
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      return;
    }

    try {
      this.syncChannel = new BroadcastChannel(SYNC_CHANNEL);
      this.syncChannel.addEventListener(
        "message",
        this.handleSyncMessage.bind(this),
      );
    } catch (error) {
      logger.warn("BroadcastChannel not available, cross-tab sync disabled:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle sync messages from other tabs
   */
  private handleSyncMessage(event: MessageEvent<UnreadSyncEvent>): void {
    const { type, channelId, messageId, userId } = event.data;

    // Ignore messages from other users
    if (userId !== this.userId) return;

    switch (type) {
      case "mark-read":
        if (channelId && messageId) {
          this.markAsReadLocal(channelId, messageId, false);
        }
        break;

      case "mark-unread":
        if (channelId && messageId) {
          this.markAsUnreadLocal(channelId, messageId, false);
        }
        break;

      case "reset":
        if (channelId) {
          this.resetChannelLocal(channelId, false);
        }
        break;

      case "sync":
        this.loadState();
        this.notifyListeners();
        break;
    }
  }

  /**
   * Broadcast sync event to other tabs
   */
  private broadcastSync(
    event: Omit<UnreadSyncEvent, "timestamp" | "userId">,
  ): void {
    if (!this.syncChannel || !this.userId) return;

    const syncEvent: UnreadSyncEvent = {
      ...event,
      timestamp: Date.now(),
      userId: this.userId,
    };

    try {
      this.syncChannel.postMessage(syncEvent);
    } catch (error) {
      logger.warn("Failed to broadcast sync event:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Load state from localStorage
   */
  private loadState(): UnreadTrackerState {
    if (typeof window === "undefined") {
      return this.getDefaultState();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.getDefaultState();
      }

      const parsed = JSON.parse(stored);

      // Validate version
      if (parsed.version !== STORAGE_VERSION) {
        logger.warn("Unread tracker storage version mismatch, resetting");
        return this.getDefaultState();
      }

      // Parse dates
      const state: UnreadTrackerState = {
        channels: {},
        lastSyncAt: new Date(parsed.lastSyncAt),
        userId: parsed.userId,
      };

      for (const [channelId, channelData] of Object.entries<any>(
        parsed.channels || {},
      )) {
        state.channels[channelId] = {
          channelId,
          position: channelData.position
            ? {
                lastReadMessageId: channelData.position.lastReadMessageId,
                lastReadAt: new Date(channelData.position.lastReadAt),
                messageTimestamp: new Date(
                  channelData.position.messageTimestamp,
                ),
              }
            : undefined,
          unreadCount: channelData.unreadCount || 0,
          mentionCount: channelData.mentionCount || 0,
          lastUpdated: new Date(channelData.lastUpdated),
        };
      }

      return state;
    } catch (error) {
      logger.error("Failed to load unread tracker state:", { context: error });
      return this.getDefaultState();
    }
  }

  /**
   * Persist state to localStorage
   */
  private persistState(): void {
    if (typeof window === "undefined") return;

    try {
      const serialized = {
        version: STORAGE_VERSION,
        userId: this.state.userId,
        lastSyncAt: this.state.lastSyncAt.toISOString(),
        channels: Object.fromEntries(
          Object.entries(this.state.channels).map(([id, channel]) => [
            id,
            {
              channelId: channel.channelId,
              position: channel.position
                ? {
                    lastReadMessageId: channel.position.lastReadMessageId,
                    lastReadAt: channel.position.lastReadAt.toISOString(),
                    messageTimestamp:
                      channel.position.messageTimestamp.toISOString(),
                  }
                : null,
              unreadCount: channel.unreadCount,
              mentionCount: channel.mentionCount,
              lastUpdated: channel.lastUpdated.toISOString(),
            },
          ]),
        ),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      logger.error("Failed to persist unread tracker state:", {
        context: error,
      });
    }
  }

  /**
   * Get default initial state
   */
  private getDefaultState(): UnreadTrackerState {
    return {
      channels: {},
      lastSyncAt: new Date(),
    };
  }

  /**
   * Clean up old data for different users or aged channels
   */
  private cleanupOldData(): void {
    if (!this.userId) return;

    // If user changed, reset all data
    if (this.state.userId && this.state.userId !== this.userId) {
      this.state = this.getDefaultState();
      this.state.userId = this.userId;
      this.persistState();
      return;
    }

    // Remove channels older than MAX_STORAGE_AGE_DAYS
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_STORAGE_AGE_DAYS);

    let cleaned = false;
    for (const [channelId, channel] of Object.entries(this.state.channels)) {
      if (channel.lastUpdated < cutoffDate) {
        delete this.state.channels[channelId];
        cleaned = true;
      }
    }

    if (cleaned) {
      this.persistState();
    }
  }

  // ========================================================================
  // Mark as Read/Unread
  // ========================================================================

  /**
   * Mark messages up to a specific message as read
   */
  markAsRead(
    channelId: string,
    messageId: string,
    messageTimestamp: Date,
  ): void {
    this.markAsReadLocal(channelId, messageId, true, messageTimestamp);
    this.broadcastSync({ type: "mark-read", channelId, messageId });
  }

  /**
   * Mark as read (local only, optionally skip broadcast)
   */
  private markAsReadLocal(
    channelId: string,
    messageId: string,
    persist = true,
    messageTimestamp?: Date,
  ): void {
    const channel = this.getOrCreateChannelState(channelId);

    // Update position
    channel.position = {
      lastReadMessageId: messageId,
      lastReadAt: new Date(),
      messageTimestamp: messageTimestamp || new Date(),
    };

    // Reset counts (will be recalculated on next message load)
    channel.unreadCount = 0;
    channel.mentionCount = 0;
    channel.lastUpdated = new Date();

    this.state.channels[channelId] = channel;

    if (persist) {
      this.schedulePersist();
    }

    this.notifyListeners(channelId);
  }

  /**
   * Mark a message as unread (mark from this message forward)
   */
  markAsUnread(
    channelId: string,
    messageId: string,
    messageTimestamp: Date,
  ): void {
    this.markAsUnreadLocal(channelId, messageId, true, messageTimestamp);
    this.broadcastSync({ type: "mark-unread", channelId, messageId });
  }

  /**
   * Mark as unread (local only)
   */
  private markAsUnreadLocal(
    channelId: string,
    messageId: string,
    persist = true,
    messageTimestamp?: Date,
  ): void {
    const channel = this.getOrCreateChannelState(channelId);

    // Find the previous message position
    // For now, we'll clear the position to mark all as unread from this point
    // In a real implementation, you'd calculate the previous message
    channel.position = messageTimestamp
      ? {
          lastReadMessageId: messageId,
          lastReadAt: new Date(),
          messageTimestamp: new Date(messageTimestamp.getTime() - 1), // 1ms before
        }
      : undefined;

    channel.lastUpdated = new Date();
    this.state.channels[channelId] = channel;

    if (persist) {
      this.schedulePersist();
    }

    this.notifyListeners(channelId);
  }

  /**
   * Reset all unread state for a channel
   */
  resetChannel(channelId: string): void {
    this.resetChannelLocal(channelId, true);
    this.broadcastSync({ type: "reset", channelId });
  }

  /**
   * Reset channel (local only)
   */
  private resetChannelLocal(channelId: string, persist = true): void {
    delete this.state.channels[channelId];

    if (persist) {
      this.schedulePersist();
    }

    this.notifyListeners(channelId);
  }

  // ========================================================================
  // Unread Calculation
  // ========================================================================

  /**
   * Calculate unread messages for a channel
   */
  calculateUnread(
    channelId: string,
    messages: Message[],
    currentUserId: string,
  ): {
    unreadCount: number;
    mentionCount: number;
    firstUnreadMessageId?: string;
  } {
    const channel = this.state.channels[channelId];

    if (!channel?.position || messages.length === 0) {
      return { unreadCount: 0, mentionCount: 0 };
    }

    const lastReadTimestamp = channel.position.messageTimestamp.getTime();
    let unreadCount = 0;
    let mentionCount = 0;
    let firstUnreadMessageId: string | undefined;

    for (const message of messages) {
      const messageTime = new Date(message.createdAt).getTime();

      // Message is newer than last read
      if (messageTime > lastReadTimestamp) {
        // Don't count our own messages
        if (message.userId !== currentUserId) {
          if (!firstUnreadMessageId) {
            firstUnreadMessageId = message.id;
          }

          unreadCount++;

          // Check for mentions
          if (this.messageHasMention(message, currentUserId)) {
            mentionCount++;
          }
        }
      }
    }

    // Cache the counts
    if (channel) {
      channel.unreadCount = unreadCount;
      channel.mentionCount = mentionCount;
      channel.lastUpdated = new Date();
      this.schedulePersist();
    }

    return { unreadCount, mentionCount, firstUnreadMessageId };
  }

  /**
   * Check if message mentions the current user
   */
  private messageHasMention(message: Message, userId: string): boolean {
    // Check direct user mentions
    if (message.mentionedUsers?.includes(userId)) {
      return true;
    }

    // Check @everyone and @here
    if (message.mentionsEveryone || message.mentionsHere) {
      return true;
    }

    return false;
  }

  /**
   * Find first unread message ID in a list
   */
  findFirstUnreadMessage(
    channelId: string,
    messages: Message[],
  ): string | undefined {
    const channel = this.state.channels[channelId];

    if (!channel?.position || messages.length === 0) {
      return undefined;
    }

    const lastReadTimestamp = channel.position.messageTimestamp.getTime();

    for (const message of messages) {
      const messageTime = new Date(message.createdAt).getTime();
      if (messageTime > lastReadTimestamp) {
        return message.id;
      }
    }

    return undefined;
  }

  /**
   * Check if a message is unread
   */
  isMessageUnread(
    channelId: string,
    message: Message,
    currentUserId: string,
  ): boolean {
    // Own messages are never unread
    if (message.userId === currentUserId) {
      return false;
    }

    const channel = this.state.channels[channelId];
    if (!channel?.position) {
      return false;
    }

    const messageTime = new Date(message.createdAt).getTime();
    const lastReadTime = channel.position.messageTimestamp.getTime();

    return messageTime > lastReadTime;
  }

  // ========================================================================
  // Getters
  // ========================================================================

  /**
   * Get last read position for a channel
   */
  getLastReadPosition(channelId: string): UnreadPosition | undefined {
    return this.state.channels[channelId]?.position;
  }

  /**
   * Get cached unread counts for a channel
   */
  getCachedUnread(channelId: string): {
    unreadCount: number;
    mentionCount: number;
  } {
    const channel = this.state.channels[channelId];
    return {
      unreadCount: channel?.unreadCount || 0,
      mentionCount: channel?.mentionCount || 0,
    };
  }

  /**
   * Get all channel states
   */
  getAllChannelStates(): Record<string, ChannelUnreadState> {
    return { ...this.state.channels };
  }

  /**
   * Get or create channel state
   */
  private getOrCreateChannelState(channelId: string): ChannelUnreadState {
    if (!this.state.channels[channelId]) {
      this.state.channels[channelId] = {
        channelId,
        unreadCount: 0,
        mentionCount: 0,
        lastUpdated: new Date(),
      };
    }
    return this.state.channels[channelId];
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  /**
   * Schedule a batched persist operation
   */
  private schedulePersist(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.state.lastSyncAt = new Date();
      this.persistState();
      this.broadcastSync({ type: "sync" });
    }, BATCH_UPDATE_DELAY);
  }

  // ========================================================================
  // Listeners
  // ========================================================================

  /**
   * Subscribe to unread changes
   */
  subscribe(channelId: string, callback: () => void): () => void {
    if (!this.listeners.has(channelId)) {
      this.listeners.set(channelId, new Set());
    }

    this.listeners.get(channelId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(channelId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(channelId);
        }
      }
    };
  }

  /**
   * Subscribe to all channel changes
   */
  subscribeAll(callback: () => void): () => void {
    return this.subscribe("*", callback);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(channelId?: string): void {
    // Notify channel-specific listeners
    if (channelId) {
      const channelListeners = this.listeners.get(channelId);
      if (channelListeners) {
        channelListeners.forEach((callback) => callback());
      }
    }

    // Notify global listeners
    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((callback) => callback());
    }
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  /**
   * Destroy the tracker and clean up resources
   */
  destroy(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    if (this.syncChannel) {
      this.syncChannel.close();
    }

    this.listeners.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalTrackerInstance: UnreadTracker | null = null;

/**
 * Get the global unread tracker instance
 */
export function getUnreadTracker(): UnreadTracker {
  if (!globalTrackerInstance) {
    globalTrackerInstance = new UnreadTracker();
  }
  return globalTrackerInstance;
}

/**
 * Reset the global tracker instance (for testing)
 */
export function resetUnreadTracker(): void {
  if (globalTrackerInstance) {
    globalTrackerInstance.destroy();
    globalTrackerInstance = null;
  }
}
