/**
 * Presence Manager - Central coordinator for user presence
 *
 * Orchestrates idle detection, presence tracking, typing, and broadcasting.
 */

import type {
  PresenceStatus,
  CustomStatus,
  UserPresence,
  PresenceSettings,
  TypingStatus,
} from "./presence-types";
import {
  DEFAULT_PRESENCE_SETTINGS,
  isActiveStatus,
  isStatusExpired,
} from "./presence-types";
import {
  IdleDetector,
  getIdleDetector,
  destroyIdleDetector,
} from "./idle-detector";
import {
  TypingTracker,
  getTypingTracker,
  destroyTypingTracker,
} from "./typing-tracker";
import {
  PresenceTracker,
  getPresenceTracker,
  destroyPresenceTracker,
} from "./presence-tracker";
import {
  PresenceBroadcaster,
  getPresenceBroadcaster,
  destroyPresenceBroadcaster,
} from "./presence-broadcaster";

export interface PresenceManagerOptions {
  /**
   * Current user ID
   */
  userId: string;

  /**
   * Initial status
   * @default 'online'
   */
  initialStatus?: PresenceStatus;

  /**
   * Initial custom status
   */
  initialCustomStatus?: CustomStatus;

  /**
   * User's presence settings
   */
  settings?: Partial<PresenceSettings>;

  /**
   * Callback when own presence changes
   */
  onOwnPresenceChange?: (presence: UserPresence) => void;

  /**
   * Callback when other user's presence changes
   */
  onUserPresenceChange?: (userId: string, presence: UserPresence) => void;

  /**
   * Callback when typing users change
   */
  onTypingChange?: (contextKey: string, users: TypingStatus[]) => void;
}

export class PresenceManager {
  private userId: string;
  private settings: PresenceSettings;

  private currentStatus: PresenceStatus;
  private currentCustomStatus?: CustomStatus;
  private previousStatus: PresenceStatus;
  private isIdle = false;

  private idleDetector: IdleDetector;
  private typingTracker: TypingTracker;
  private presenceTracker: PresenceTracker;
  private broadcaster: PresenceBroadcaster;

  private onOwnPresenceChange?: (presence: UserPresence) => void;
  private onUserPresenceChange?: (
    userId: string,
    presence: UserPresence,
  ) => void;
  private onTypingChange?: (contextKey: string, users: TypingStatus[]) => void;

  private statusExpirationTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(options: PresenceManagerOptions) {
    this.userId = options.userId;
    this.settings = { ...DEFAULT_PRESENCE_SETTINGS, ...options.settings };
    this.currentStatus = options.initialStatus ?? "online";
    this.currentCustomStatus = options.initialCustomStatus;
    this.previousStatus = this.currentStatus;

    this.onOwnPresenceChange = options.onOwnPresenceChange;
    this.onUserPresenceChange = options.onUserPresenceChange;
    this.onTypingChange = options.onTypingChange;

    // Get/create component instances
    this.idleDetector = getIdleDetector({
      timeout: this.settings.idleDetection.timeout * 60 * 1000,
      onIdle: this.handleIdle.bind(this),
      onActive: this.handleActive.bind(this),
      onVisibilityChange: this.handleVisibilityChange.bind(this),
    });

    this.typingTracker = getTypingTracker({
      onTypingStart: this.handleTypingStart.bind(this),
      onTypingStop: this.handleTypingStop.bind(this),
    });

    this.presenceTracker = getPresenceTracker({
      onPresenceChange: this.handlePresenceChange.bind(this),
    });

    this.broadcaster = getPresenceBroadcaster({
      onPresenceUpdate: this.handlePresenceUpdate.bind(this),
      onPresenceBulk: this.handlePresenceBulk.bind(this),
      onTypingStart: this.handleRemoteTypingStart.bind(this),
      onTypingStop: this.handleRemoteTypingStop.bind(this),
    });
  }

  /**
   * Initialize the presence manager
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Initialize broadcaster first
    this.broadcaster.initialize();

    // Start idle detection if enabled
    if (this.settings.idleDetection.enabled) {
      this.idleDetector.start();
    }

    // Broadcast initial presence
    this.broadcastPresence(true);

    // Set up status expiration timer
    this.setupStatusExpirationCheck();

    this.isInitialized = true;
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (!this.isInitialized) return;

    // Broadcast offline
    this.broadcaster.broadcastOffline();

    // Clear expiration timer
    if (this.statusExpirationTimer) {
      clearInterval(this.statusExpirationTimer);
    }

    // Stop components
    this.idleDetector.stop();
    this.typingTracker.reset();

    // Destroy singletons
    destroyIdleDetector();
    destroyTypingTracker();
    destroyPresenceTracker();
    destroyPresenceBroadcaster();

    this.isInitialized = false;
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Set own presence status
   */
  setStatus(status: PresenceStatus): void {
    if (status === this.currentStatus) return;

    // Remember previous status (except away from idle)
    if (this.currentStatus !== "away" || !this.isIdle) {
      this.previousStatus = this.currentStatus;
    }

    this.currentStatus = status;
    this.isIdle = false;

    this.broadcastPresence(true);
    this.notifyOwnPresenceChange();
  }

  /**
   * Get current status
   */
  getStatus(): PresenceStatus {
    return this.currentStatus;
  }

  /**
   * Set custom status
   */
  setCustomStatus(customStatus: CustomStatus | null): void {
    this.currentCustomStatus = customStatus ?? undefined;

    this.broadcaster.broadcastCustomStatus(customStatus);
    this.broadcastPresence(true);
    this.notifyOwnPresenceChange();
  }

  /**
   * Get current custom status
   */
  getCustomStatus(): CustomStatus | undefined {
    if (!this.currentCustomStatus) return undefined;
    if (isStatusExpired(this.currentCustomStatus)) {
      this.currentCustomStatus = undefined;
      return undefined;
    }
    return this.currentCustomStatus;
  }

  /**
   * Clear custom status
   */
  clearCustomStatus(): void {
    this.setCustomStatus(null);
  }

  /**
   * Get full presence object
   */
  getOwnPresence(): UserPresence {
    return {
      userId: this.userId,
      status: this.currentStatus,
      customStatus: this.getCustomStatus(),
      isTyping: this.typingTracker.isTyping(),
      typingInContext: this.typingTracker.getCurrentContext() ?? undefined,
    };
  }

  // ============================================================================
  // Typing Management
  // ============================================================================

  /**
   * Handle user typing (call on input change)
   */
  handleTyping(channelId: string, threadId?: string): void {
    if (!this.settings.privacy.showTypingIndicator) return;

    this.typingTracker.handleTyping({
      channelId,
      threadId,
    });
  }

  /**
   * Stop typing (call on message send or blur)
   */
  stopTyping(): void {
    this.typingTracker.stopTyping();
  }

  /**
   * Get typing users for a channel
   */
  getChannelTypingUsers(channelId: string): TypingStatus[] {
    return this.typingTracker.getChannelTypingUsers(channelId);
  }

  /**
   * Get typing users for a thread
   */
  getThreadTypingUsers(threadId: string): TypingStatus[] {
    return this.typingTracker.getThreadTypingUsers(threadId);
  }

  // ============================================================================
  // Other Users' Presence
  // ============================================================================

  /**
   * Get another user's presence
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.presenceTracker.getPresence(userId);
  }

  /**
   * Get another user's status
   */
  getUserStatus(userId: string): PresenceStatus {
    return this.presenceTracker.getStatus(userId);
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.presenceTracker.isOnline(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    return this.presenceTracker.getOnlineUsers();
  }

  /**
   * Get online user count
   */
  getOnlineCount(): number {
    return this.presenceTracker.getOnlineCount();
  }

  /**
   * Subscribe to presence updates for users
   */
  subscribeToUsers(userIds: string[]): void {
    this.broadcaster.subscribeToUsers(userIds);
  }

  /**
   * Unsubscribe from presence updates
   */
  unsubscribeFromUsers(userIds: string[]): void {
    this.broadcaster.unsubscribeFromUsers(userIds);
  }

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Update settings
   */
  updateSettings(settings: Partial<PresenceSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Update idle detector timeout
    if (settings.idleDetection?.timeout !== undefined) {
      this.idleDetector.setTimeout(settings.idleDetection.timeout * 60 * 1000);
    }

    // Enable/disable idle detection
    if (settings.idleDetection?.enabled !== undefined) {
      if (settings.idleDetection.enabled) {
        this.idleDetector.start();
      } else {
        this.idleDetector.stop();
      }
    }
  }

  /**
   * Get current settings
   */
  getSettings(): PresenceSettings {
    return { ...this.settings };
  }

  // ============================================================================
  // Private: Handlers
  // ============================================================================

  private handleIdle(): void {
    if (!this.settings.autoAway.enabled) return;
    if (this.currentStatus === "dnd") return; // Don't override DND

    this.isIdle = true;
    this.previousStatus = this.currentStatus;
    this.currentStatus = this.settings.autoAway.setStatus;

    this.broadcastPresence(true);
    this.notifyOwnPresenceChange();
  }

  private handleActive(): void {
    if (!this.isIdle) return;

    this.isIdle = false;
    this.currentStatus = this.previousStatus;

    this.broadcastPresence(true);
    this.notifyOwnPresenceChange();
  }

  private handleVisibilityChange(isVisible: boolean): void {
    // Page visibility already handled by idle detector
    // Could add additional logic here if needed
  }

  private handleTypingStart(contextKey: string): void {
    const { channelId, threadId } = this.parseContextKey(contextKey);
    if (channelId) {
      this.broadcaster.broadcastTypingStart(channelId, threadId);
    }
  }

  private handleTypingStop(contextKey: string): void {
    const { channelId, threadId } = this.parseContextKey(contextKey);
    if (channelId) {
      this.broadcaster.broadcastTypingStop(channelId, threadId);
    }
  }

  private handlePresenceChange(userId: string, presence: UserPresence): void {
    // Don't notify for self
    if (userId === this.userId) return;
    this.onUserPresenceChange?.(userId, presence);
  }

  private handlePresenceUpdate(event: {
    userId: string;
    status: PresenceStatus;
    customStatus?: string;
    customEmoji?: string;
    lastSeen?: string;
  }): void {
    // Skip own updates
    if (event.userId === this.userId) return;

    this.presenceTracker.updateFromEvent(event);
  }

  private handlePresenceBulk(
    presences: Array<{
      userId: string;
      status: PresenceStatus;
      customStatus?: string;
      customEmoji?: string;
      lastSeen?: string;
    }>,
  ): void {
    presences.forEach((p) => {
      if (p.userId !== this.userId) {
        this.presenceTracker.updateFromEvent(p);
      }
    });
  }

  private handleRemoteTypingStart(event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }): void {
    if (event.userId === this.userId) return;

    const contextKey = event.threadId
      ? `thread:${event.threadId}`
      : `channel:${event.channelId}`;

    const user = this.presenceTracker.getPresence(event.userId);

    this.typingTracker.setUserTyping(contextKey, {
      userId: event.userId,
      userName: user?.userId ?? "Someone", // Would need user info from store
      startedAt: new Date(),
    });

    this.onTypingChange?.(
      contextKey,
      this.typingTracker.getTypingUsers(contextKey),
    );
  }

  private handleRemoteTypingStop(event: {
    userId: string;
    channelId: string;
    threadId?: string;
  }): void {
    if (event.userId === this.userId) return;

    const contextKey = event.threadId
      ? `thread:${event.threadId}`
      : `channel:${event.channelId}`;

    this.typingTracker.clearUserTyping(contextKey, event.userId);
    this.onTypingChange?.(
      contextKey,
      this.typingTracker.getTypingUsers(contextKey),
    );
  }

  // ============================================================================
  // Private: Utilities
  // ============================================================================

  private broadcastPresence(force = false): void {
    this.broadcaster.broadcastPresence(
      this.currentStatus,
      this.currentCustomStatus,
      force,
    );
  }

  private notifyOwnPresenceChange(): void {
    this.onOwnPresenceChange?.(this.getOwnPresence());
  }

  private parseContextKey(contextKey: string): {
    channelId?: string;
    threadId?: string;
  } {
    const [type, id] = contextKey.split(":");
    if (type === "thread") {
      return { threadId: id };
    }
    if (type === "channel") {
      return { channelId: id };
    }
    return {};
  }

  private setupStatusExpirationCheck(): void {
    // Check every minute for expired statuses
    this.statusExpirationTimer = setInterval(() => {
      if (
        this.currentCustomStatus &&
        isStatusExpired(this.currentCustomStatus)
      ) {
        this.clearCustomStatus();
      }
      this.presenceTracker.clearExpiredStatuses();
    }, 60 * 1000);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultManager: PresenceManager | null = null;

export const initializePresenceManager = (
  options: PresenceManagerOptions,
): PresenceManager => {
  if (defaultManager) {
    defaultManager.destroy();
  }
  defaultManager = new PresenceManager(options);
  defaultManager.initialize();
  return defaultManager;
};

export const getPresenceManager = (): PresenceManager | null => {
  return defaultManager;
};

export const destroyPresenceManager = (): void => {
  if (defaultManager) {
    defaultManager.destroy();
    defaultManager = null;
  }
};
