/**
 * Typing Tracker - Tracks and manages typing status for channels and threads
 *
 * Handles typing indicator state, debouncing, and broadcasting typing events.
 */

import type { TypingStatus } from "./presence-types";

export interface TypingTrackerOptions {
  /**
   * How long typing indicator should show after last keystroke (ms)
   * @default 5000
   */
  typingTimeout?: number;

  /**
   * Minimum time between sending typing events to server (ms)
   * @default 2000
   */
  throttleInterval?: number;

  /**
   * Callback when typing should be broadcast
   */
  onTypingStart?: (contextKey: string) => void;

  /**
   * Callback when typing stops should be broadcast
   */
  onTypingStop?: (contextKey: string) => void;
}

export interface TypingContext {
  channelId?: string;
  threadId?: string;
}

export class TypingTracker {
  private typingTimeout: number;
  private throttleInterval: number;
  private onTypingStart?: (contextKey: string) => void;
  private onTypingStop?: (contextKey: string) => void;

  // Current user's typing state
  private currentContext: string | null = null;
  private typingTimer: NodeJS.Timeout | null = null;
  private lastBroadcast: number = 0;

  // Other users' typing state
  private typingUsers: Map<string, Map<string, TypingStatus>> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: TypingTrackerOptions = {}) {
    this.typingTimeout = options.typingTimeout ?? 5000;
    this.throttleInterval = options.throttleInterval ?? 2000;
    this.onTypingStart = options.onTypingStart;
    this.onTypingStop = options.onTypingStop;
  }

  /**
   * Create context key from channel/thread IDs
   */
  static createContextKey(context: TypingContext): string {
    if (context.threadId) {
      return `thread:${context.threadId}`;
    }
    if (context.channelId) {
      return `channel:${context.channelId}`;
    }
    return "";
  }

  /**
   * Parse context key to get type and ID
   */
  static parseContextKey(contextKey: string): TypingContext {
    const [type, id] = contextKey.split(":");
    if (type === "thread") {
      return { threadId: id };
    }
    if (type === "channel") {
      return { channelId: id };
    }
    return {};
  }

  // ============================================================================
  // Current User Typing
  // ============================================================================

  /**
   * Handle keypress in input - call this on input change
   */
  handleTyping(context: TypingContext): void {
    const contextKey = TypingTracker.createContextKey(context);
    if (!contextKey) return;

    const now = Date.now();
    const shouldBroadcast = now - this.lastBroadcast >= this.throttleInterval;

    // If context changed, stop typing in old context
    if (this.currentContext && this.currentContext !== contextKey) {
      this.stopTyping();
    }

    this.currentContext = contextKey;

    // Broadcast if enough time has passed
    if (shouldBroadcast) {
      this.lastBroadcast = now;
      this.onTypingStart?.(contextKey);
    }

    // Reset timeout
    this.resetTypingTimer();
  }

  /**
   * Stop typing manually (e.g., on message send or input blur)
   */
  stopTyping(): void {
    if (!this.currentContext) return;

    const contextKey = this.currentContext;
    this.currentContext = null;

    // Clear timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    // Broadcast stop
    this.onTypingStop?.(contextKey);
  }

  /**
   * Get current typing context
   */
  getCurrentContext(): string | null {
    return this.currentContext;
  }

  /**
   * Check if currently typing
   */
  isTyping(): boolean {
    return this.currentContext !== null;
  }

  private resetTypingTimer(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, this.typingTimeout);
  }

  // ============================================================================
  // Other Users Typing
  // ============================================================================

  /**
   * Set a user as typing in a context
   */
  setUserTyping(contextKey: string, user: TypingStatus): void {
    let contextUsers = this.typingUsers.get(contextKey);
    if (!contextUsers) {
      contextUsers = new Map();
      this.typingUsers.set(contextKey, contextUsers);
    }

    // Update or add user
    contextUsers.set(user.userId, {
      ...user,
      startedAt: new Date(),
    });

    // Set cleanup timer for this user
    const timerKey = `${contextKey}:${user.userId}`;
    const existingTimer = this.cleanupTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.clearUserTyping(contextKey, user.userId);
    }, this.typingTimeout);

    this.cleanupTimers.set(timerKey, timer);
  }

  /**
   * Clear a user's typing status
   */
  clearUserTyping(contextKey: string, userId: string): void {
    const contextUsers = this.typingUsers.get(contextKey);
    if (contextUsers) {
      contextUsers.delete(userId);
      if (contextUsers.size === 0) {
        this.typingUsers.delete(contextKey);
      }
    }

    // Clear timer
    const timerKey = `${contextKey}:${userId}`;
    const timer = this.cleanupTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(timerKey);
    }
  }

  /**
   * Set all typing users for a context (from server)
   */
  setTypingUsers(contextKey: string, users: TypingStatus[]): void {
    // Clear existing users for this context
    this.clearContextTyping(contextKey);

    // Add new users
    users.forEach((user) => {
      this.setUserTyping(contextKey, user);
    });
  }

  /**
   * Clear all typing in a context
   */
  clearContextTyping(contextKey: string): void {
    const contextUsers = this.typingUsers.get(contextKey);
    if (contextUsers) {
      // Clear all timers for this context
      contextUsers.forEach((_, userId) => {
        const timerKey = `${contextKey}:${userId}`;
        const timer = this.cleanupTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          this.cleanupTimers.delete(timerKey);
        }
      });
      this.typingUsers.delete(contextKey);
    }
  }

  /**
   * Get typing users for a context
   */
  getTypingUsers(contextKey: string): TypingStatus[] {
    const contextUsers = this.typingUsers.get(contextKey);
    if (!contextUsers) return [];
    return Array.from(contextUsers.values());
  }

  /**
   * Get typing users for a channel
   */
  getChannelTypingUsers(channelId: string): TypingStatus[] {
    return this.getTypingUsers(`channel:${channelId}`);
  }

  /**
   * Get typing users for a thread
   */
  getThreadTypingUsers(threadId: string): TypingStatus[] {
    return this.getTypingUsers(`thread:${threadId}`);
  }

  /**
   * Check if anyone is typing in a context
   */
  hasTypingUsers(contextKey: string): boolean {
    const contextUsers = this.typingUsers.get(contextKey);
    return !!contextUsers && contextUsers.size > 0;
  }

  /**
   * Get count of typing users in a context
   */
  getTypingCount(contextKey: string): number {
    const contextUsers = this.typingUsers.get(contextKey);
    return contextUsers?.size ?? 0;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clear all state
   */
  reset(): void {
    // Stop current user typing
    this.stopTyping();

    // Clear all timers
    this.cleanupTimers.forEach((timer) => clearTimeout(timer));
    this.cleanupTimers.clear();

    // Clear all typing users
    this.typingUsers.clear();
  }

  /**
   * Cleanup expired typing indicators
   */
  cleanupExpired(): void {
    const now = Date.now();

    this.typingUsers.forEach((contextUsers, contextKey) => {
      contextUsers.forEach((user, userId) => {
        const elapsed = now - new Date(user.startedAt).getTime();
        if (elapsed >= this.typingTimeout) {
          this.clearUserTyping(contextKey, userId);
        }
      });
    });
  }
}

// ============================================================================
// Typing Text Helpers
// ============================================================================

/**
 * Generate typing indicator text from typing users
 */
export const getTypingText = (typingUsers: TypingStatus[]): string => {
  if (typingUsers.length === 0) return "";

  const names = typingUsers.map((u) => u.userName);

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
};

/**
 * Singleton instance
 */
let defaultTypingTracker: TypingTracker | null = null;

export const getTypingTracker = (
  options?: TypingTrackerOptions,
): TypingTracker => {
  if (!defaultTypingTracker) {
    defaultTypingTracker = new TypingTracker(options);
  }
  return defaultTypingTracker;
};

export const destroyTypingTracker = (): void => {
  if (defaultTypingTracker) {
    defaultTypingTracker.reset();
    defaultTypingTracker = null;
  }
};
