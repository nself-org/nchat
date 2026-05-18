/**
 * Disappearing Messages Scheduler
 *
 * Manages timers and schedules message deletion.
 * Uses a combination of local timers and server-side scheduled jobs.
 */

import {
  DisappearingMessageData,
  DisappearingMessageType,
  DisappearingMessageEvent,
  getRemainingTime,
  calculateExpiresAt,
} from "./disappearing-types";

// ============================================================================
// Types
// ============================================================================

interface ScheduledTimer {
  messageId: string;
  channelId: string;
  expiresAt: Date;
  type: DisappearingMessageType;
  timerId: ReturnType<typeof setTimeout>;
  callback?: (messageId: string, channelId: string) => void;
}

interface SchedulerCallbacks {
  onMessageExpired?: (messageId: string, channelId: string) => void;
  onTimerWarning?: (
    messageId: string,
    channelId: string,
    secondsRemaining: number,
  ) => void;
  onBurnComplete?: (messageId: string, channelId: string) => void;
}

// ============================================================================
// Scheduler Class
// ============================================================================

/**
 * Manages all disappearing message timers.
 */
class DisappearingScheduler {
  private timers: Map<string, ScheduledTimer> = new Map();
  private warningTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private callbacks: SchedulerCallbacks = {};
  private warningThreshold = 60; // Seconds before expiry to trigger warning

  /**
   * Set callbacks for scheduler events.
   */
  setCallbacks(callbacks: SchedulerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set warning threshold (seconds before expiry).
   */
  setWarningThreshold(seconds: number): void {
    this.warningThreshold = seconds;
  }

  /**
   * Schedule a message for deletion.
   */
  scheduleMessage(
    messageId: string,
    channelId: string,
    disappearing: DisappearingMessageData,
  ): void {
    // Don't schedule if already expired or no expiration
    if (!disappearing.expiresAt) return;

    const expiresAt = new Date(disappearing.expiresAt);
    const remaining = expiresAt.getTime() - Date.now();

    if (remaining <= 0) {
      // Already expired, trigger immediately
      this.handleExpired(messageId, channelId);
      return;
    }

    // Clear any existing timer for this message
    this.cancelTimer(messageId);

    // Set expiration timer
    const timerId = setTimeout(() => {
      this.handleExpired(messageId, channelId);
    }, remaining);

    this.timers.set(messageId, {
      messageId,
      channelId,
      expiresAt,
      type: disappearing.type,
      timerId,
    });

    // Set warning timer if close enough
    const warningTime = remaining - this.warningThreshold * 1000;
    if (warningTime > 0) {
      const warningTimerId = setTimeout(() => {
        this.handleWarning(messageId, channelId);
      }, warningTime);
      this.warningTimers.set(messageId, warningTimerId);
    }
  }

  /**
   * Schedule a view-once message (no timer, expires on view).
   */
  scheduleViewOnce(messageId: string, channelId: string): void {
    // View-once messages don't have a timer, they expire when viewed
    // Just track them without setting a timeout
    this.timers.set(messageId, {
      messageId,
      channelId,
      expiresAt: new Date(0), // Placeholder
      type: "view_once",
      timerId: 0 as unknown as ReturnType<typeof setTimeout>,
    });
  }

  /**
   * Start burn-after-reading timer.
   */
  startBurnTimer(
    messageId: string,
    channelId: string,
    burnSeconds: number,
  ): Date {
    // Clear any existing timer
    this.cancelTimer(messageId);

    const expiresAt = new Date(Date.now() + burnSeconds * 1000);

    const timerId = setTimeout(() => {
      this.handleBurnComplete(messageId, channelId);
    }, burnSeconds * 1000);

    this.timers.set(messageId, {
      messageId,
      channelId,
      expiresAt,
      type: "burn_after_reading",
      timerId,
    });

    return expiresAt;
  }

  /**
   * Cancel a scheduled timer.
   */
  cancelTimer(messageId: string): void {
    const timer = this.timers.get(messageId);
    if (timer) {
      clearTimeout(timer.timerId);
      this.timers.delete(messageId);
    }

    const warningTimer = this.warningTimers.get(messageId);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.warningTimers.delete(messageId);
    }
  }

  /**
   * Cancel all timers for a channel.
   */
  cancelChannelTimers(channelId: string): void {
    for (const [messageId, timer] of this.timers) {
      if (timer.channelId === channelId) {
        this.cancelTimer(messageId);
      }
    }
  }

  /**
   * Cancel all timers.
   */
  cancelAllTimers(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer.timerId);
    }
    this.timers.clear();

    for (const timer of this.warningTimers.values()) {
      clearTimeout(timer);
    }
    this.warningTimers.clear();
  }

  /**
   * Get remaining time for a message.
   */
  getRemainingTime(messageId: string): number {
    const timer = this.timers.get(messageId);
    if (!timer) return -1;
    if (timer.type === "view_once") return -1;

    const remaining = Math.floor(
      (timer.expiresAt.getTime() - Date.now()) / 1000,
    );
    return Math.max(0, remaining);
  }

  /**
   * Check if a message has an active timer.
   */
  hasActiveTimer(messageId: string): boolean {
    return this.timers.has(messageId);
  }

  /**
   * Get all active timers.
   */
  getActiveTimers(): Array<{
    messageId: string;
    channelId: string;
    expiresAt: Date;
    type: DisappearingMessageType;
    remainingSeconds: number;
  }> {
    return Array.from(this.timers.values()).map((timer) => ({
      messageId: timer.messageId,
      channelId: timer.channelId,
      expiresAt: timer.expiresAt,
      type: timer.type,
      remainingSeconds: this.getRemainingTime(timer.messageId),
    }));
  }

  /**
   * Get active timers for a specific channel.
   */
  getChannelTimers(channelId: string): Array<{
    messageId: string;
    expiresAt: Date;
    type: DisappearingMessageType;
    remainingSeconds: number;
  }> {
    return this.getActiveTimers()
      .filter((t) => t.channelId === channelId)
      .map(({ channelId: _, ...rest }) => rest);
  }

  /**
   * Handle message expiration.
   */
  private handleExpired(messageId: string, channelId: string): void {
    this.timers.delete(messageId);
    this.warningTimers.delete(messageId);
    this.callbacks.onMessageExpired?.(messageId, channelId);
  }

  /**
   * Handle expiration warning.
   */
  private handleWarning(messageId: string, channelId: string): void {
    this.warningTimers.delete(messageId);
    const remaining = this.getRemainingTime(messageId);
    this.callbacks.onTimerWarning?.(messageId, channelId, remaining);
  }

  /**
   * Handle burn-after-reading complete.
   */
  private handleBurnComplete(messageId: string, channelId: string): void {
    this.timers.delete(messageId);
    this.callbacks.onBurnComplete?.(messageId, channelId);
  }

  /**
   * Restore timers from persisted state (e.g., on page reload).
   */
  restoreTimers(
    messages: Array<{
      id: string;
      channelId: string;
      disappearing: DisappearingMessageData;
    }>,
  ): void {
    for (const message of messages) {
      if (message.disappearing.type === "view_once") {
        if (!message.disappearing.hasBeenViewed) {
          this.scheduleViewOnce(message.id, message.channelId);
        }
      } else {
        this.scheduleMessage(
          message.id,
          message.channelId,
          message.disappearing,
        );
      }
    }
  }

  /**
   * Get scheduler statistics.
   */
  getStats(): {
    totalTimers: number;
    byType: Record<DisappearingMessageType, number>;
    byChannel: Record<string, number>;
  } {
    const byType: Record<DisappearingMessageType, number> = {
      regular: 0,
      view_once: 0,
      burn_after_reading: 0,
    };
    const byChannel: Record<string, number> = {};

    for (const timer of this.timers.values()) {
      byType[timer.type]++;
      byChannel[timer.channelId] = (byChannel[timer.channelId] || 0) + 1;
    }

    return {
      totalTimers: this.timers.size,
      byType,
      byChannel,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let schedulerInstance: DisappearingScheduler | null = null;

/**
 * Get the scheduler singleton instance.
 */
export function getScheduler(): DisappearingScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new DisappearingScheduler();
  }
  return schedulerInstance;
}

/**
 * Create a new scheduler instance (for testing).
 */
export function createScheduler(): DisappearingScheduler {
  return new DisappearingScheduler();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create disappearing message data for a new message.
 */
export function createDisappearingData(
  type: DisappearingMessageType,
  options: {
    timerDuration?: number;
    burnTimer?: number;
  } = {},
): DisappearingMessageData {
  const now = new Date();
  const data: DisappearingMessageData = {
    type,
    sentAt: now.toISOString(),
  };

  switch (type) {
    case "regular":
      if (options.timerDuration && options.timerDuration > 0) {
        data.timerDuration = options.timerDuration;
        data.timerStartedAt = now.toISOString();
        const expiresAt = calculateExpiresAt(now, options.timerDuration);
        if (expiresAt) {
          data.expiresAt = expiresAt.toISOString();
        }
      }
      break;

    case "view_once":
      data.hasBeenViewed = false;
      break;

    case "burn_after_reading":
      data.burnTimer = options.burnTimer || 10;
      data.isReading = false;
      break;
  }

  return data;
}

/**
 * Mark a view-once message as viewed.
 */
export function markAsViewed(
  data: DisappearingMessageData,
  viewedBy: string,
): DisappearingMessageData {
  return {
    ...data,
    hasBeenViewed: true,
    viewedAt: new Date().toISOString(),
    viewedBy,
  };
}

/**
 * Start burn timer for a message.
 */
export function startBurnReading(
  data: DisappearingMessageData,
): DisappearingMessageData {
  const now = new Date();
  const burnTimer = data.burnTimer || 10;
  const expiresAt = calculateExpiresAt(now, burnTimer);

  return {
    ...data,
    isReading: true,
    readingStartedAt: now.toISOString(),
    timerStartedAt: now.toISOString(),
    expiresAt: expiresAt?.toISOString(),
  };
}
