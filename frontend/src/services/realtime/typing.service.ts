/**
 * Typing Indicator Service
 *
 * Manages typing indicators for channels, threads, and direct messages.
 * Integrates with the nself-plugins realtime server.
 *
 * Features:
 * - Channel-scoped typing (users typing in a specific channel)
 * - Thread-scoped typing (users typing in a specific thread)
 * - Direct message typing
 * - Automatic timeout (stop showing typing after 5 seconds of inactivity)
 * - Debouncing (don't send typing events more than once per second)
 * - Privacy controls (respect user settings)
 * - Redis pub/sub compatible (no database persistence)
 *
 * @module services/realtime/typing.service
 * @version 1.0.0
 */

import { realtimeClient } from "./realtime-client";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Room type for typing context
 */
export type TypingRoomType = "channel" | "thread" | "dm";

/**
 * Typing user information
 */
export interface TypingUser {
  userId: string;
  userName?: string;
  userAvatar?: string;
  startedAt: Date;
}

/**
 * Extended typing user with privacy info
 */
export interface TypingUserWithPrivacy extends TypingUser {
  /** Whether typing indicator is allowed based on privacy settings */
  isAllowed: boolean;
  /** Whether user has enabled typing broadcast */
  broadcastEnabled: boolean;
}

/**
 * Typing context (channel, thread, or DM)
 */
export interface TypingContext {
  roomName: string;
  roomType: TypingRoomType;
  threadId?: string;
  /** For DMs, the other user's ID */
  recipientId?: string;
}

/**
 * Typing start payload to server
 */
interface TypingStartPayload {
  roomName: string;
  roomType: TypingRoomType;
  threadId?: string;
  recipientId?: string;
}

/**
 * Typing stop payload to server
 */
interface TypingStopPayload {
  roomName: string;
  roomType: TypingRoomType;
  threadId?: string;
}

/**
 * Typing event from server
 */
interface TypingEvent {
  roomName: string;
  roomType: TypingRoomType;
  threadId?: string;
  users: Array<{
    userId: string;
    userName?: string;
    userAvatar?: string;
    startedAt: string;
  }>;
}

/**
 * Batch typing update from server (optimized for multiple rooms)
 */
interface BatchTypingEvent {
  updates: Array<{
    roomName: string;
    roomType: TypingRoomType;
    threadId?: string;
    users: Array<{
      userId: string;
      userName?: string;
      userAvatar?: string;
      startedAt: string;
    }>;
  }>;
}

/**
 * User typing privacy settings
 */
export interface TypingPrivacySettings {
  /** Whether the user broadcasts their typing status */
  broadcastTyping: boolean;
  /** Who can see typing status: 'everyone', 'contacts', 'nobody' */
  typingVisibility: "everyone" | "contacts" | "nobody";
}

/**
 * Typing service configuration
 */
export interface TypingServiceConfig {
  /** Typing indicator timeout (default: 5 seconds) */
  typingTimeout?: number;
  /** Debounce interval for input changes (default: 300ms) */
  debounceInterval?: number;
  /** Throttle interval for server emissions (default: 1 second) */
  throttleInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable privacy filtering (default: true) */
  enablePrivacyFiltering?: boolean;
  /** Batch update interval for reducing network traffic (default: 500ms) */
  batchUpdateInterval?: number;
  /** Current user's privacy settings */
  privacySettings?: TypingPrivacySettings;
}

/**
 * Typing change listener
 */
export type TypingChangeListener = (
  roomName: string,
  users: TypingUser[],
  threadId?: string,
) => void;

// ============================================================================
// Constants
// ============================================================================

const SOCKET_EVENTS = {
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  TYPING_EVENT: "typing:event",
  TYPING_BATCH: "typing:batch",
} as const;

const DEFAULT_CONFIG: Required<TypingServiceConfig> = {
  typingTimeout: 5000,
  debounceInterval: 300,
  throttleInterval: 1000,
  debug: false,
  enablePrivacyFiltering: true,
  batchUpdateInterval: 500,
  privacySettings: {
    broadcastTyping: true,
    typingVisibility: "everyone",
  },
};

const DEFAULT_PRIVACY_SETTINGS: TypingPrivacySettings = {
  broadcastTyping: true,
  typingVisibility: "everyone",
};

// ============================================================================
// Typing Service Class
// ============================================================================

/**
 * TypingService - Manages typing indicators
 *
 * Room key format:
 * - Channel: "channel:${channelId}"
 * - Thread: "channel:${channelId}:thread:${threadId}"
 * - DM: "dm:${dmId}" or "dm:${sortedUserIds}"
 */
class TypingService {
  private config: Required<TypingServiceConfig>;
  private typingUsers = new Map<string, Map<string, TypingUser>>(); // roomKey -> (userId -> TypingUser)
  private currentTypingContext: TypingContext | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEmitTime = 0;
  private lastEmitTimeByRoom = new Map<string, number>(); // roomKey -> lastEmitTime
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private typingListeners = new Set<TypingChangeListener>();
  private roomListeners = new Map<string, Set<TypingChangeListener>>(); // roomKey -> listeners
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;
  private currentUserId: string | null = null;
  private contactsCache = new Set<string>();
  private pendingBatchUpdates = new Map<string, TypingUser[]>();
  private batchUpdateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: TypingServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // User and Privacy Management
  // ============================================================================

  /**
   * Set the current user ID for filtering and privacy
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
    this.log("Current user ID set:", userId);
  }

  /**
   * Update the user's privacy settings
   */
  updatePrivacySettings(settings: Partial<TypingPrivacySettings>): void {
    this.config.privacySettings = {
      ...this.config.privacySettings,
      ...settings,
    };
    this.log("Privacy settings updated:", this.config.privacySettings);
  }

  /**
   * Set contacts cache for privacy filtering
   */
  setContacts(contactIds: string[]): void {
    this.contactsCache = new Set(contactIds);
    this.log("Contacts cache updated:", contactIds.length, "contacts");
  }

  /**
   * Add a contact to the cache
   */
  addContact(contactId: string): void {
    this.contactsCache.add(contactId);
  }

  /**
   * Remove a contact from the cache
   */
  removeContact(contactId: string): void {
    this.contactsCache.delete(contactId);
  }

  /**
   * Check if a user is a contact
   */
  isContact(userId: string): boolean {
    return this.contactsCache.has(userId);
  }

  /**
   * Check if typing should be broadcast based on privacy settings
   */
  private shouldBroadcastTyping(): boolean {
    if (!this.config.enablePrivacyFiltering) return true;
    return this.config.privacySettings.broadcastTyping;
  }

  /**
   * Check if typing from a user should be visible
   */
  private shouldShowTypingFrom(
    userId: string,
    _roomType: TypingRoomType,
  ): boolean {
    // Always hide own typing
    if (userId === this.currentUserId) return false;

    // If privacy filtering is disabled, show all
    if (!this.config.enablePrivacyFiltering) return true;

    // For DMs, always show typing from the other party
    if (_roomType === "dm") return true;

    return true;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the typing service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();
    this.startCleanupTimer();

    this.isInitialized = true;
    this.log("Typing service initialized");
  }

  /**
   * Destroy the typing service
   */
  destroy(): void {
    // Clear timers
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }

    // Cleanup socket listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear state
    this.typingUsers.clear();
    this.typingListeners.clear();
    this.roomListeners.clear();
    this.lastEmitTimeByRoom.clear();
    this.pendingBatchUpdates.clear();
    this.contactsCache.clear();
    this.currentTypingContext = null;

    this.isInitialized = false;
    this.log("Typing service destroyed");
  }

  // ============================================================================
  // Typing Management
  // ============================================================================

  /**
   * Start typing indicator in a channel
   */
  startTyping(roomName: string, threadId?: string): void {
    this.startTypingInRoom(roomName, threadId ? "thread" : "channel", threadId);
  }

  /**
   * Start typing indicator in a DM
   */
  startTypingInDM(dmId: string, recipientId?: string): void {
    this.startTypingInRoom(dmId, "dm", undefined, recipientId);
  }

  /**
   * Start typing indicator in a thread
   */
  startTypingInThread(channelId: string, threadId: string): void {
    this.startTypingInRoom(channelId, "thread", threadId);
  }

  /**
   * Internal method to start typing in any room type
   */
  private startTypingInRoom(
    roomName: string,
    roomType: TypingRoomType,
    threadId?: string,
    recipientId?: string,
  ): void {
    if (!realtimeClient.isConnected) {
      return;
    }

    // Check privacy settings - don't broadcast if disabled
    if (!this.shouldBroadcastTyping()) {
      this.log("Typing broadcast disabled by privacy settings");
      return;
    }

    const roomKey = this.getRoomKey(roomName, roomType, threadId);
    const now = Date.now();

    // Per-room throttling
    const lastRoomEmit = this.lastEmitTimeByRoom.get(roomKey) || 0;
    if (now - lastRoomEmit < this.config.throttleInterval) {
      // Still update context and reset timer even if throttled
      this.currentTypingContext = { roomName, roomType, threadId, recipientId };
      this.resetTypingTimer();
      return;
    }

    // Update current context
    this.currentTypingContext = { roomName, roomType, threadId, recipientId };
    this.lastEmitTime = now;
    this.lastEmitTimeByRoom.set(roomKey, now);

    // Send to server
    const payload: TypingStartPayload = { roomName, roomType };
    if (threadId) {
      payload.threadId = threadId;
    }
    if (recipientId) {
      payload.recipientId = recipientId;
    }
    realtimeClient.emit(SOCKET_EVENTS.TYPING_START, payload);

    // Reset auto-stop timer
    this.resetTypingTimer();

    this.log("Started typing in:", roomType, roomName, threadId);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(roomName?: string, threadId?: string): void {
    const roomType: TypingRoomType = threadId ? "thread" : "channel";
    this.stopTypingInRoom(roomName, roomType, threadId);
  }

  /**
   * Stop typing in a DM
   */
  stopTypingInDM(dmId?: string): void {
    this.stopTypingInRoom(dmId, "dm");
  }

  /**
   * Internal method to stop typing in any room type
   */
  private stopTypingInRoom(
    roomName?: string,
    roomType?: TypingRoomType,
    threadId?: string,
  ): void {
    if (!realtimeClient.isConnected) {
      return;
    }

    // Use current context if not specified
    const context = roomName
      ? { roomName, roomType: roomType || "channel", threadId }
      : this.currentTypingContext;

    if (!context) {
      return;
    }

    // Clear timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    // Clear room-specific throttle
    const roomKey = this.getRoomKey(
      context.roomName,
      context.roomType,
      context.threadId,
    );
    this.lastEmitTimeByRoom.delete(roomKey);

    // Send to server
    const payload: TypingStopPayload = {
      roomName: context.roomName,
      roomType: context.roomType,
    };
    if (context.threadId) {
      payload.threadId = context.threadId;
    }
    realtimeClient.emit(SOCKET_EVENTS.TYPING_STOP, payload);

    // Clear context if matching
    if (
      this.currentTypingContext?.roomName === context.roomName &&
      this.currentTypingContext?.threadId === context.threadId &&
      this.currentTypingContext?.roomType === context.roomType
    ) {
      this.currentTypingContext = null;
    }

    this.log(
      "Stopped typing in:",
      context.roomType,
      context.roomName,
      context.threadId,
    );
  }

  /**
   * Handle input change with debouncing (for channels/threads)
   */
  handleInputChange(roomName: string, value: string, threadId?: string): void {
    const roomType: TypingRoomType = threadId ? "thread" : "channel";
    this.handleInputChangeInRoom(roomName, roomType, value, threadId);
  }

  /**
   * Handle input change in a DM
   */
  handleDMInputChange(dmId: string, value: string, recipientId?: string): void {
    // Clear existing debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // If empty, stop typing
    if (!value.trim()) {
      this.stopTypingInDM(dmId);
      return;
    }

    // Debounce start typing
    this.debounceTimer = setTimeout(() => {
      this.startTypingInDM(dmId, recipientId);
    }, this.config.debounceInterval);
  }

  /**
   * Internal method to handle input change in any room type
   */
  private handleInputChangeInRoom(
    roomName: string,
    roomType: TypingRoomType,
    value: string,
    threadId?: string,
    recipientId?: string,
  ): void {
    // Clear existing debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // If empty, stop typing
    if (!value.trim()) {
      this.stopTypingInRoom(roomName, roomType, threadId);
      return;
    }

    // Debounce start typing
    this.debounceTimer = setTimeout(() => {
      this.startTypingInRoom(roomName, roomType, threadId, recipientId);
    }, this.config.debounceInterval);
  }

  /**
   * Reset typing auto-stop timer
   */
  private resetTypingTimer(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, this.config.typingTimeout);
  }

  // ============================================================================
  // Typing Users
  // ============================================================================

  /**
   * Get typing users for a channel or thread
   */
  getTypingUsers(roomName: string, threadId?: string): TypingUser[] {
    const roomType: TypingRoomType = threadId ? "thread" : "channel";
    return this.getTypingUsersInRoom(roomName, roomType, threadId);
  }

  /**
   * Get typing users in a DM
   */
  getTypingUsersInDM(dmId: string): TypingUser[] {
    return this.getTypingUsersInRoom(dmId, "dm");
  }

  /**
   * Get typing users for any room type with privacy filtering
   */
  getTypingUsersInRoom(
    roomName: string,
    roomType: TypingRoomType,
    threadId?: string,
  ): TypingUser[] {
    const key = this.getRoomKey(roomName, roomType, threadId);
    const users = this.typingUsers.get(key);

    if (!users) return [];

    // Filter based on privacy settings
    return Array.from(users.values()).filter((user) =>
      this.shouldShowTypingFrom(user.userId, roomType),
    );
  }

  /**
   * Get typing user names for display
   */
  getTypingText(roomName: string, threadId?: string): string | null {
    const users = this.getTypingUsers(roomName, threadId);
    return this.formatTypingText(users);
  }

  /**
   * Get typing text for a DM
   */
  getTypingTextInDM(dmId: string): string | null {
    const users = this.getTypingUsersInDM(dmId);
    return this.formatTypingText(users);
  }

  /**
   * Format typing indicator text
   */
  private formatTypingText(users: TypingUser[]): string | null {
    if (users.length === 0) return null;

    const names = users.map((u) => u.userName || "Someone");

    if (names.length === 1) {
      return `${names[0]} is typing...`;
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    }

    if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    }

    return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
  }

  /**
   * Check if anyone is typing in a room
   */
  hasTypingUsers(roomName: string, threadId?: string): boolean {
    return this.getTypingUsers(roomName, threadId).length > 0;
  }

  /**
   * Check if anyone is typing in a DM
   */
  hasTypingUsersInDM(dmId: string): boolean {
    return this.getTypingUsersInDM(dmId).length > 0;
  }

  /**
   * Subscribe to typing changes (global)
   */
  onTypingChange(listener: TypingChangeListener): () => void {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  /**
   * Subscribe to typing changes for a specific room
   */
  onRoomTypingChange(
    roomName: string,
    roomType: TypingRoomType,
    listener: TypingChangeListener,
    threadId?: string,
  ): () => void {
    const key = this.getRoomKey(roomName, roomType, threadId);

    if (!this.roomListeners.has(key)) {
      this.roomListeners.set(key, new Set());
    }
    this.roomListeners.get(key)!.add(listener);

    // Immediately notify with current state
    const users = this.getTypingUsersInRoom(roomName, roomType, threadId);
    listener(roomName, users, threadId);

    return () => {
      this.roomListeners.get(key)?.delete(listener);
      if (this.roomListeners.get(key)?.size === 0) {
        this.roomListeners.delete(key);
      }
    };
  }

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    // Handle typing events from server
    const unsubTyping = realtimeClient.on<TypingEvent>(
      SOCKET_EVENTS.TYPING_EVENT,
      this.handleTypingEvent.bind(this),
    );
    this.unsubscribers.push(unsubTyping);

    // Handle batch typing updates from server
    const unsubBatch = realtimeClient.on<BatchTypingEvent>(
      SOCKET_EVENTS.TYPING_BATCH,
      this.handleBatchTypingEvent.bind(this),
    );
    this.unsubscribers.push(unsubBatch);

    // Handle disconnection - clear all typing
    const unsubConnection = realtimeClient.onConnectionStateChange((state) => {
      if (state === "disconnected") {
        this.typingUsers.clear();
        this.lastEmitTimeByRoom.clear();
        this.currentTypingContext = null;
        this.pendingBatchUpdates.clear();
        if (this.batchUpdateTimer) {
          clearTimeout(this.batchUpdateTimer);
          this.batchUpdateTimer = null;
        }
      }
    });
    this.unsubscribers.push(unsubConnection);
  }

  /**
   * Handle typing event from server
   */
  private handleTypingEvent(event: TypingEvent): void {
    const roomType = event.roomType || "channel";
    const key = this.getRoomKey(event.roomName, roomType, event.threadId);

    // Convert to TypingUser objects
    const users = new Map<string, TypingUser>();
    event.users.forEach((u) => {
      users.set(u.userId, {
        userId: u.userId,
        userName: u.userName,
        userAvatar: u.userAvatar,
        startedAt: new Date(u.startedAt),
      });
    });

    this.typingUsers.set(key, users);

    // Get filtered users for notification
    const filteredUsers = this.getTypingUsersInRoom(
      event.roomName,
      roomType,
      event.threadId,
    );

    // Notify listeners
    this.notifyTypingListeners(
      event.roomName,
      roomType,
      filteredUsers,
      event.threadId,
    );

    this.log(
      "Typing event:",
      roomType,
      event.roomName,
      event.users.length,
      "users",
    );
  }

  /**
   * Handle batch typing updates from server
   */
  private handleBatchTypingEvent(event: BatchTypingEvent): void {
    event.updates.forEach((update) => {
      const roomType = update.roomType || "channel";
      const key = this.getRoomKey(update.roomName, roomType, update.threadId);

      const users = new Map<string, TypingUser>();
      update.users.forEach((u) => {
        users.set(u.userId, {
          userId: u.userId,
          userName: u.userName,
          userAvatar: u.userAvatar,
          startedAt: new Date(u.startedAt),
        });
      });

      this.typingUsers.set(key, users);

      // Queue for batched notification
      const filteredUsers = this.getTypingUsersInRoom(
        update.roomName,
        roomType,
        update.threadId,
      );
      this.pendingBatchUpdates.set(key, filteredUsers);
    });

    // Schedule batch notification
    this.scheduleBatchNotification();

    this.log("Batch typing event:", event.updates.length, "rooms");
  }

  /**
   * Schedule batch notification to reduce UI updates
   */
  private scheduleBatchNotification(): void {
    if (this.batchUpdateTimer) return;

    this.batchUpdateTimer = setTimeout(() => {
      this.flushBatchNotifications();
      this.batchUpdateTimer = null;
    }, this.config.batchUpdateInterval);
  }

  /**
   * Flush pending batch notifications
   */
  private flushBatchNotifications(): void {
    Array.from(this.pendingBatchUpdates.entries()).forEach(([key, users]) => {
      const [roomName, roomType, threadId] = this.parseRoomKey(key);
      this.notifyTypingListeners(
        roomName,
        roomType as TypingRoomType,
        users,
        threadId,
      );
    });
    this.pendingBatchUpdates.clear();
  }

  /**
   * Notify typing listeners
   */
  private notifyTypingListeners(
    roomName: string,
    roomType: TypingRoomType,
    users: TypingUser[],
    threadId?: string,
  ): void {
    const key = this.getRoomKey(roomName, roomType, threadId);

    // Notify global listeners
    this.typingListeners.forEach((listener) => {
      try {
        listener(roomName, users, threadId);
      } catch (error) {
        logger.error("[TypingService] Global listener error:", error);
      }
    });

    // Notify room-specific listeners
    const roomSpecificListeners = this.roomListeners.get(key);
    if (roomSpecificListeners) {
      roomSpecificListeners.forEach((listener) => {
        try {
          listener(roomName, users, threadId);
        } catch (error) {
          logger.error("[TypingService] Room listener error:", error);
        }
      });
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Start periodic cleanup of stale typing indicators
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 1000);
  }

  /**
   * Clean up expired typing indicators
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const timeout = this.config.typingTimeout;

    Array.from(this.typingUsers.entries()).forEach(([key, users]) => {
      let hasChanges = false;

      Array.from(users.entries()).forEach(([userId, user]) => {
        if (now - user.startedAt.getTime() > timeout) {
          users.delete(userId);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        // Parse key to get room info
        const [roomName, roomType, threadId] = this.parseRoomKey(key);
        const filteredUsers = this.getTypingUsersInRoom(
          roomName,
          roomType as TypingRoomType,
          threadId,
        );
        this.notifyTypingListeners(
          roomName,
          roomType as TypingRoomType,
          filteredUsers,
          threadId,
        );
      }

      if (users.size === 0) {
        this.typingUsers.delete(key);
      }
    });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get room key for storage
   *
   * Format:
   * - Channel: "channel:${channelId}"
   * - Thread: "channel:${channelId}:thread:${threadId}"
   * - DM: "dm:${dmId}"
   */
  private getRoomKey(
    roomName: string,
    roomType: TypingRoomType,
    threadId?: string,
  ): string {
    switch (roomType) {
      case "dm":
        return `dm:${roomName}`;
      case "thread":
        return `channel:${roomName}:thread:${threadId}`;
      case "channel":
      default:
        return `channel:${roomName}`;
    }
  }

  /**
   * Parse room key back to components
   */
  private parseRoomKey(key: string): [string, string, string | undefined] {
    if (key.startsWith("dm:")) {
      return [key.slice(3), "dm", undefined];
    }

    if (key.includes(":thread:")) {
      const parts = key.split(":thread:");
      const roomName = parts[0].replace("channel:", "");
      return [roomName, "thread", parts[1]];
    }

    return [key.replace("channel:", ""), "channel", undefined];
  }

  /**
   * Generate a stable DM room key from two user IDs
   */
  static getDMRoomKey(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[TypingService]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if currently typing
   */
  get isTyping(): boolean {
    return this.currentTypingContext !== null;
  }

  /**
   * Get current typing context
   */
  get currentContext(): TypingContext | null {
    return this.currentTypingContext;
  }

  /**
   * Get current user's privacy settings
   */
  get privacySettings(): TypingPrivacySettings {
    return this.config.privacySettings;
  }

  /**
   * Get all rooms with active typing
   */
  getActiveTypingRooms(): string[] {
    return Array.from(this.typingUsers.keys()).filter((key) => {
      const users = this.typingUsers.get(key);
      return users && users.size > 0;
    });
  }

  /**
   * Clear typing state for a specific room
   */
  clearRoomTypingState(
    roomName: string,
    roomType: TypingRoomType,
    threadId?: string,
  ): void {
    const key = this.getRoomKey(roomName, roomType, threadId);
    this.typingUsers.delete(key);
    this.lastEmitTimeByRoom.delete(key);
    this.pendingBatchUpdates.delete(key);
  }

  /**
   * Clear all typing state
   */
  clearAllTypingState(): void {
    this.typingUsers.clear();
    this.lastEmitTimeByRoom.clear();
    this.pendingBatchUpdates.clear();
    this.currentTypingContext = null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let typingServiceInstance: TypingService | null = null;

/**
 * Get the typing service instance
 */
export function getTypingService(config?: TypingServiceConfig): TypingService {
  if (!typingServiceInstance) {
    typingServiceInstance = new TypingService(config);
  }
  return typingServiceInstance;
}

/**
 * Initialize the typing service
 */
export function initializeTypingService(
  config?: TypingServiceConfig,
): TypingService {
  const service = getTypingService(config);
  service.initialize();
  return service;
}

/**
 * Reset the typing service
 */
export function resetTypingService(): void {
  if (typingServiceInstance) {
    typingServiceInstance.destroy();
    typingServiceInstance = null;
  }
}

export { TypingService };
export default TypingService;
