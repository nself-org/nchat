/**
 * Presence Tracker - Tracks presence of other users
 *
 * Maintains a cache of user presence states and handles updates.
 */

import type {
  PresenceStatus,
  CustomStatus,
  UserPresence,
} from "./presence-types";
import { isActiveStatus, isStatusExpired } from "./presence-types";

export interface PresenceTrackerOptions {
  /**
   * Maximum number of users to track
   * @default 1000
   */
  maxUsers?: number;

  /**
   * How long to keep offline users in cache (ms)
   * @default 3600000 (1 hour)
   */
  offlineCacheDuration?: number;

  /**
   * Callback when presence changes
   */
  onPresenceChange?: (userId: string, presence: UserPresence) => void;
}

export class PresenceTracker {
  private maxUsers: number;
  private offlineCacheDuration: number;
  private onPresenceChange?: (userId: string, presence: UserPresence) => void;

  private presenceMap: Map<string, UserPresence> = new Map();
  private lastCleanup: number = Date.now();

  constructor(options: PresenceTrackerOptions = {}) {
    this.maxUsers = options.maxUsers ?? 1000;
    this.offlineCacheDuration = options.offlineCacheDuration ?? 60 * 60 * 1000;
    this.onPresenceChange = options.onPresenceChange;
  }

  // ============================================================================
  // Presence Management
  // ============================================================================

  /**
   * Update a user's presence
   */
  updatePresence(
    userId: string,
    status: PresenceStatus,
    customStatus?: CustomStatus,
    lastSeenAt?: Date,
  ): void {
    const existing = this.presenceMap.get(userId);
    const updated: UserPresence = {
      userId,
      status,
      customStatus: customStatus
        ? {
            ...customStatus,
            // Check if custom status has expired
            ...(isStatusExpired(customStatus)
              ? { emoji: undefined, text: undefined }
              : {}),
          }
        : undefined,
      lastSeenAt:
        lastSeenAt ?? (status !== "online" ? new Date() : existing?.lastSeenAt),
    };

    this.presenceMap.set(userId, updated);
    this.onPresenceChange?.(userId, updated);

    // Run cleanup periodically
    this.maybeCleanup();
  }

  /**
   * Update presence from socket event
   */
  updateFromEvent(event: {
    userId: string;
    status: PresenceStatus;
    customStatus?: string;
    customEmoji?: string;
    lastSeen?: string;
  }): void {
    this.updatePresence(
      event.userId,
      event.status,
      event.customStatus || event.customEmoji
        ? { text: event.customStatus, emoji: event.customEmoji }
        : undefined,
      event.lastSeen ? new Date(event.lastSeen) : undefined,
    );
  }

  /**
   * Update multiple users at once
   */
  updateBulk(
    presences: Array<{
      userId: string;
      status: PresenceStatus;
      customStatus?: CustomStatus;
      lastSeenAt?: Date;
    }>,
  ): void {
    presences.forEach((p) => {
      this.updatePresence(p.userId, p.status, p.customStatus, p.lastSeenAt);
    });
  }

  /**
   * Get a user's presence
   */
  getPresence(userId: string): UserPresence | undefined {
    return this.presenceMap.get(userId);
  }

  /**
   * Get a user's status
   */
  getStatus(userId: string): PresenceStatus {
    return this.presenceMap.get(userId)?.status ?? "offline";
  }

  /**
   * Get a user's custom status
   */
  getCustomStatus(userId: string): CustomStatus | undefined {
    const presence = this.presenceMap.get(userId);
    if (!presence?.customStatus) return undefined;

    // Check if expired
    if (isStatusExpired(presence.customStatus)) {
      return undefined;
    }

    return presence.customStatus;
  }

  /**
   * Check if a user is online (online or dnd)
   */
  isOnline(userId: string): boolean {
    const status = this.getStatus(userId);
    return status === "online" || status === "dnd";
  }

  /**
   * Check if a user is active (not offline or invisible)
   */
  isActive(userId: string): boolean {
    return isActiveStatus(this.getStatus(userId));
  }

  /**
   * Get last seen time
   */
  getLastSeen(userId: string): Date | undefined {
    return this.presenceMap.get(userId)?.lastSeenAt;
  }

  /**
   * Mark a user as offline
   */
  setOffline(userId: string): void {
    this.updatePresence(userId, "offline", undefined, new Date());
  }

  /**
   * Remove a user from tracking
   */
  removeUser(userId: string): void {
    this.presenceMap.delete(userId);
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Get all tracked users
   */
  getAllPresences(): UserPresence[] {
    return Array.from(this.presenceMap.values());
  }

  /**
   * Get online users
   */
  getOnlineUsers(): UserPresence[] {
    return this.getAllPresences().filter(
      (p) => p.status === "online" || p.status === "dnd",
    );
  }

  /**
   * Get active users (not offline/invisible)
   */
  getActiveUsers(): UserPresence[] {
    return this.getAllPresences().filter((p) => isActiveStatus(p.status));
  }

  /**
   * Get users by status
   */
  getUsersByStatus(status: PresenceStatus): UserPresence[] {
    return this.getAllPresences().filter((p) => p.status === status);
  }

  /**
   * Get users with custom status set
   */
  getUsersWithCustomStatus(): UserPresence[] {
    return this.getAllPresences().filter(
      (p) => p.customStatus && !isStatusExpired(p.customStatus),
    );
  }

  /**
   * Get online count
   */
  getOnlineCount(): number {
    return this.getOnlineUsers().length;
  }

  /**
   * Check if a user exists in the tracker
   */
  hasUser(userId: string): boolean {
    return this.presenceMap.has(userId);
  }

  /**
   * Get all tracked user IDs
   */
  getTrackedUserIds(): string[] {
    return Array.from(this.presenceMap.keys());
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Run cleanup if enough time has passed
   */
  private maybeCleanup(): void {
    const now = Date.now();
    // Run cleanup every 5 minutes
    if (now - this.lastCleanup < 5 * 60 * 1000) return;

    this.cleanup();
    this.lastCleanup = now;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();

    // Remove old offline users
    this.presenceMap.forEach((presence, userId) => {
      if (
        presence.status === "offline" &&
        presence.lastSeenAt &&
        now - presence.lastSeenAt.getTime() > this.offlineCacheDuration
      ) {
        this.presenceMap.delete(userId);
      }
    });

    // Enforce max users limit (remove oldest offline first)
    if (this.presenceMap.size > this.maxUsers) {
      const offline = Array.from(this.presenceMap.entries())
        .filter(([_, p]) => p.status === "offline")
        .sort((a, b) => {
          const aTime = a[1].lastSeenAt?.getTime() ?? 0;
          const bTime = b[1].lastSeenAt?.getTime() ?? 0;
          return aTime - bTime;
        });

      const toRemove = offline.slice(0, this.presenceMap.size - this.maxUsers);
      toRemove.forEach(([userId]) => this.presenceMap.delete(userId));
    }
  }

  /**
   * Clear all tracked presence
   */
  clear(): void {
    this.presenceMap.clear();
  }

  /**
   * Clear expired custom statuses
   */
  clearExpiredStatuses(): void {
    this.presenceMap.forEach((presence, userId) => {
      if (presence.customStatus && isStatusExpired(presence.customStatus)) {
        this.presenceMap.set(userId, {
          ...presence,
          customStatus: undefined,
        });
        this.onPresenceChange?.(userId, {
          ...presence,
          customStatus: undefined,
        });
      }
    });
  }

  /**
   * Set callback
   */
  setOnPresenceChange(
    callback: (userId: string, presence: UserPresence) => void,
  ): void {
    this.onPresenceChange = callback;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultTracker: PresenceTracker | null = null;

export const getPresenceTracker = (
  options?: PresenceTrackerOptions,
): PresenceTracker => {
  if (!defaultTracker) {
    defaultTracker = new PresenceTracker(options);
  }
  return defaultTracker;
};

export const destroyPresenceTracker = (): void => {
  if (defaultTracker) {
    defaultTracker.clear();
    defaultTracker = null;
  }
};
