/**
 * Disappearing Messages Manager
 *
 * Central manager for disappearing messages functionality.
 * Coordinates between settings, scheduler, and UI.
 */

import {
  DisappearingMessageData,
  DisappearingMessageType,
  DisappearingSettings,
  DisappearingMessageEvent,
  DisappearingUserPreferences,
  hasDisappearingData,
  isMessageExpired,
  getRemainingTime,
  formatCountdown,
} from "./disappearing-types";
import {
  getChannelSettings,
  saveChannelSettings,
  getSecretChatSettings,
  getUserPreferences,
  isDisappearingEnabled,
} from "./disappearing-settings";
import {
  getScheduler,
  createDisappearingData,
  markAsViewed,
  startBurnReading,
} from "./disappearing-scheduler";

// ============================================================================
// Types
// ============================================================================

export interface DisappearingManagerCallbacks {
  /** Called when a message expires and should be removed from UI */
  onMessageExpired?: (messageId: string, channelId: string) => void;
  /** Called when a message is about to expire (warning) */
  onExpiryWarning?: (
    messageId: string,
    channelId: string,
    secondsRemaining: number,
  ) => void;
  /** Called when a view-once message is viewed */
  onViewOnceViewed?: (
    messageId: string,
    channelId: string,
    viewedBy: string,
  ) => void;
  /** Called when burn timer completes */
  onBurnComplete?: (messageId: string, channelId: string) => void;
  /** Called when settings change for a channel */
  onSettingsChanged?: (
    channelId: string,
    settings: DisappearingSettings,
  ) => void;
  /** Called to emit socket event */
  emitSocketEvent?: (event: DisappearingMessageEvent) => void;
}

export interface MessageWithDisappearing {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  disappearing?: DisappearingMessageData | null;
}

// ============================================================================
// Manager Class
// ============================================================================

/**
 * Central manager for disappearing messages.
 */
class DisappearingManager {
  private callbacks: DisappearingManagerCallbacks = {};
  private viewedMessages: Set<string> = new Set();
  private initialized = false;

  /**
   * Initialize the manager with callbacks.
   */
  initialize(callbacks: DisappearingManagerCallbacks): void {
    if (this.initialized) return;

    this.callbacks = callbacks;

    // Set up scheduler callbacks
    const scheduler = getScheduler();
    scheduler.setCallbacks({
      onMessageExpired: (messageId, channelId) => {
        this.handleMessageExpired(messageId, channelId);
      },
      onTimerWarning: (messageId, channelId, secondsRemaining) => {
        this.callbacks.onExpiryWarning?.(
          messageId,
          channelId,
          secondsRemaining,
        );
      },
      onBurnComplete: (messageId, channelId) => {
        this.handleBurnComplete(messageId, channelId);
      },
    });

    // Set warning threshold from user preferences
    const prefs = getUserPreferences();
    scheduler.setWarningThreshold(prefs.expiryWarningSeconds);

    this.initialized = true;
  }

  /**
   * Update callbacks.
   */
  setCallbacks(callbacks: Partial<DisappearingManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Cleanup on unmount.
   */
  cleanup(): void {
    getScheduler().cancelAllTimers();
    this.viewedMessages.clear();
    this.initialized = false;
  }

  // ==========================================================================
  // Message Creation
  // ==========================================================================

  /**
   * Create disappearing data for a new message based on channel settings.
   */
  createMessageDisappearingData(
    channelId: string,
    type?: DisappearingMessageType,
    options?: { timerDuration?: number; burnTimer?: number },
  ): DisappearingMessageData | null {
    // Check if channel has disappearing enabled
    const settings = getChannelSettings(channelId);
    const secretSettings = getSecretChatSettings(channelId);

    // Secret chats always have disappearing
    if (secretSettings) {
      return createDisappearingData(type || "regular", {
        timerDuration: options?.timerDuration || secretSettings.defaultDuration,
        burnTimer: options?.burnTimer,
      });
    }

    // Regular channels only if enabled
    if (!settings.enabled) return null;

    return createDisappearingData(type || "regular", {
      timerDuration: options?.timerDuration || settings.defaultDuration,
      burnTimer: options?.burnTimer,
    });
  }

  /**
   * Create view-once message data.
   */
  createViewOnceData(): DisappearingMessageData {
    return createDisappearingData("view_once");
  }

  /**
   * Create burn-after-reading message data.
   */
  createBurnAfterReadingData(burnSeconds: number): DisappearingMessageData {
    return createDisappearingData("burn_after_reading", {
      burnTimer: burnSeconds,
    });
  }

  // ==========================================================================
  // Message Tracking
  // ==========================================================================

  /**
   * Register a message with the scheduler.
   */
  trackMessage(message: MessageWithDisappearing): void {
    if (!message.disappearing) return;

    const scheduler = getScheduler();

    if (message.disappearing.type === "view_once") {
      if (!message.disappearing.hasBeenViewed) {
        scheduler.scheduleViewOnce(message.id, message.channelId);
      }
    } else if (message.disappearing.type === "burn_after_reading") {
      if (message.disappearing.isReading && message.disappearing.expiresAt) {
        // Burn timer already started, schedule it
        const remaining = getRemainingTime(message.disappearing);
        if (remaining > 0) {
          scheduler.startBurnTimer(message.id, message.channelId, remaining);
        }
      }
      // Otherwise, wait until user starts reading
    } else {
      // Regular disappearing message
      scheduler.scheduleMessage(
        message.id,
        message.channelId,
        message.disappearing,
      );
    }
  }

  /**
   * Track multiple messages (e.g., on channel load).
   */
  trackMessages(messages: MessageWithDisappearing[]): void {
    for (const message of messages) {
      this.trackMessage(message);
    }
  }

  /**
   * Stop tracking a message.
   */
  untrackMessage(messageId: string): void {
    getScheduler().cancelTimer(messageId);
  }

  /**
   * Stop tracking all messages in a channel.
   */
  untrackChannel(channelId: string): void {
    getScheduler().cancelChannelTimers(channelId);
  }

  // ==========================================================================
  // Message Viewing
  // ==========================================================================

  /**
   * Handle viewing a view-once message.
   */
  viewViewOnceMessage(
    messageId: string,
    channelId: string,
    viewerId: string,
  ): boolean {
    if (this.viewedMessages.has(messageId)) {
      return false; // Already viewed
    }

    this.viewedMessages.add(messageId);
    getScheduler().cancelTimer(messageId);

    // Emit event
    this.callbacks.onViewOnceViewed?.(messageId, channelId, viewerId);
    this.emitEvent({
      type: "message_viewed",
      messageId,
      channelId,
      timestamp: new Date().toISOString(),
      data: { viewedBy: viewerId },
    });

    return true;
  }

  /**
   * Start reading a burn-after-reading message.
   */
  startBurnAfterReading(
    messageId: string,
    channelId: string,
    burnSeconds: number,
  ): Date {
    const scheduler = getScheduler();
    const expiresAt = scheduler.startBurnTimer(
      messageId,
      channelId,
      burnSeconds,
    );

    // Emit event
    this.emitEvent({
      type: "burn_started",
      messageId,
      channelId,
      timestamp: new Date().toISOString(),
      data: { burnEndsAt: expiresAt.toISOString() },
    });

    return expiresAt;
  }

  /**
   * Check if a view-once message has been viewed.
   */
  hasBeenViewed(messageId: string): boolean {
    return this.viewedMessages.has(messageId);
  }

  // ==========================================================================
  // Settings Management
  // ==========================================================================

  /**
   * Enable disappearing messages for a channel.
   */
  enableForChannel(channelId: string, duration: number, userId?: string): void {
    const settings = saveChannelSettings(
      channelId,
      { enabled: true, defaultDuration: duration },
      userId,
    );
    this.callbacks.onSettingsChanged?.(channelId, settings);
  }

  /**
   * Disable disappearing messages for a channel.
   */
  disableForChannel(channelId: string, userId?: string): void {
    const settings = saveChannelSettings(channelId, { enabled: false }, userId);
    this.callbacks.onSettingsChanged?.(channelId, settings);
  }

  /**
   * Update channel settings.
   */
  updateChannelSettings(
    channelId: string,
    settings: Partial<DisappearingSettings>,
    userId?: string,
  ): void {
    const updated = saveChannelSettings(channelId, settings, userId);
    this.callbacks.onSettingsChanged?.(channelId, updated);
  }

  /**
   * Get settings for a channel.
   */
  getSettings(channelId: string): DisappearingSettings {
    return getChannelSettings(channelId);
  }

  /**
   * Check if disappearing is enabled for a channel.
   */
  isEnabled(channelId: string): boolean {
    return isDisappearingEnabled(channelId);
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get remaining time for a message in seconds.
   */
  getMessageRemainingTime(messageId: string): number {
    return getScheduler().getRemainingTime(messageId);
  }

  /**
   * Get formatted remaining time for display.
   */
  getFormattedRemainingTime(messageId: string): string {
    const seconds = this.getMessageRemainingTime(messageId);
    if (seconds < 0) return "";
    return formatCountdown(seconds);
  }

  /**
   * Check if a message is about to expire (within warning threshold).
   */
  isAboutToExpire(messageId: string): boolean {
    const prefs = getUserPreferences();
    const remaining = this.getMessageRemainingTime(messageId);
    return remaining >= 0 && remaining <= prefs.expiryWarningSeconds;
  }

  /**
   * Get all active timers.
   */
  getActiveTimers() {
    return getScheduler().getActiveTimers();
  }

  /**
   * Get active timers for a channel.
   */
  getChannelTimers(channelId: string) {
    return getScheduler().getChannelTimers(channelId);
  }

  /**
   * Get scheduler statistics.
   */
  getStats() {
    return getScheduler().getStats();
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handle message expiration.
   */
  private handleMessageExpired(messageId: string, channelId: string): void {
    this.callbacks.onMessageExpired?.(messageId, channelId);
    this.emitEvent({
      type: "message_expired",
      messageId,
      channelId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle burn timer completion.
   */
  private handleBurnComplete(messageId: string, channelId: string): void {
    this.callbacks.onBurnComplete?.(messageId, channelId);
    this.callbacks.onMessageExpired?.(messageId, channelId);
    this.emitEvent({
      type: "message_expired",
      messageId,
      channelId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a socket event.
   */
  private emitEvent(event: DisappearingMessageEvent): void {
    this.callbacks.emitSocketEvent?.(event);
  }

  // ==========================================================================
  // Socket Event Handlers
  // ==========================================================================

  /**
   * Handle incoming socket event.
   */
  handleSocketEvent(event: DisappearingMessageEvent): void {
    switch (event.type) {
      case "timer_started":
        // Another client started a timer, sync it
        if (event.data?.expiresAt) {
          // Re-schedule with new expiration
          getScheduler().scheduleMessage(event.messageId, event.channelId, {
            type: "regular",
            sentAt: event.timestamp,
            expiresAt: event.data.expiresAt,
          });
        }
        break;

      case "message_expired":
        // Message expired on another client or server
        getScheduler().cancelTimer(event.messageId);
        this.callbacks.onMessageExpired?.(event.messageId, event.channelId);
        break;

      case "message_viewed":
        // View-once message viewed by another user
        if (event.data?.viewedBy) {
          this.viewedMessages.add(event.messageId);
          getScheduler().cancelTimer(event.messageId);
          this.callbacks.onViewOnceViewed?.(
            event.messageId,
            event.channelId,
            event.data.viewedBy,
          );
        }
        break;

      case "burn_started":
        // Burn timer started on another client
        if (event.data?.burnEndsAt) {
          const remaining = Math.floor(
            (new Date(event.data.burnEndsAt).getTime() - Date.now()) / 1000,
          );
          if (remaining > 0) {
            getScheduler().startBurnTimer(
              event.messageId,
              event.channelId,
              remaining,
            );
          }
        }
        break;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: DisappearingManager | null = null;

/**
 * Get the manager singleton instance.
 */
export function getDisappearingManager(): DisappearingManager {
  if (!managerInstance) {
    managerInstance = new DisappearingManager();
  }
  return managerInstance;
}

/**
 * Create a new manager instance (for testing).
 */
export function createDisappearingManager(): DisappearingManager {
  return new DisappearingManager();
}

// ============================================================================
// React Hook Helper
// ============================================================================

/**
 * Create a disappearing manager with React callbacks.
 */
export function initializeDisappearingManager(
  callbacks: DisappearingManagerCallbacks,
): DisappearingManager {
  const manager = getDisappearingManager();
  manager.initialize(callbacks);
  return manager;
}
