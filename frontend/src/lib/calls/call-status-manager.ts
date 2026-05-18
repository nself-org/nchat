/**
 * Call Status Manager
 *
 * Manages user availability status for calls (online, busy, away, DND, offline).
 * Handles busy status, call waiting, and automatic status updates.
 */

import { EventEmitter } from "events";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * User availability status
 */
export type UserStatus =
  | "online" // Available for calls
  | "busy" // In a call
  | "away" // Idle (no activity for a while)
  | "dnd" // Do Not Disturb (explicit)
  | "offline"; // Not connected

/**
 * Status with metadata
 */
export interface UserCallStatus {
  userId: string;
  status: UserStatus;
  customMessage?: string;
  inCall: boolean;
  callId?: string;
  availableForCallWaiting: boolean;
  lastActivity: Date;
  lastStatusChange: Date;
}

/**
 * Status manager configuration
 */
export interface StatusManagerConfig {
  awayTimeout?: number; // milliseconds until auto-away
  enableCallWaiting?: boolean;
  maxConcurrentCalls?: number;
  onStatusChange?: (status: UserCallStatus) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<StatusManagerConfig> = {
  awayTimeout: 5 * 60 * 1000, // 5 minutes
  enableCallWaiting: true,
  maxConcurrentCalls: 1,
  onStatusChange: () => {},
};

// =============================================================================
// Call Status Manager
// =============================================================================

export class CallStatusManager extends EventEmitter {
  private statuses = new Map<string, UserCallStatus>();
  private config: Required<StatusManagerConfig>;
  private awayTimers = new Map<string, NodeJS.Timeout>();
  private activityListeners = new Map<string, () => void>();

  constructor(config: StatusManagerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize user status
   */
  initializeUser(userId: string, initialStatus: UserStatus = "online"): void {
    const now = new Date();
    const status: UserCallStatus = {
      userId,
      status: initialStatus,
      inCall: false,
      availableForCallWaiting: this.config.enableCallWaiting,
      lastActivity: now,
      lastStatusChange: now,
    };

    this.statuses.set(userId, status);
    this.startAwayTimer(userId);

    this.emit("initialized", status);
  }

  /**
   * Get user status
   */
  getStatus(userId: string): UserCallStatus | undefined {
    return this.statuses.get(userId);
  }

  /**
   * Set user status
   */
  setStatus(
    userId: string,
    status: UserStatus,
    customMessage?: string,
  ): boolean {
    const current = this.statuses.get(userId);
    if (!current) {
      logger.warn(`User ${userId} not initialized`);
      return false;
    }

    const previous = current.status;
    current.status = status;
    current.customMessage = customMessage;
    current.lastStatusChange = new Date();

    // Update away timer
    if (status === "online") {
      this.startAwayTimer(userId);
    } else {
      this.stopAwayTimer(userId);
    }

    // Emit events
    this.emit("status-change", current, previous);
    if (this.config.onStatusChange) {
      this.config.onStatusChange(current);
    }

    return true;
  }

  /**
   * Update user activity (prevents auto-away)
   */
  updateActivity(userId: string): void {
    const status = this.statuses.get(userId);
    if (!status) return;

    status.lastActivity = new Date();

    // If was away, set back to online
    if (status.status === "away") {
      this.setStatus(userId, "online");
    }

    // Restart away timer
    this.startAwayTimer(userId);
  }

  /**
   * Mark user as in call
   */
  startCall(userId: string, callId: string): boolean {
    const status = this.statuses.get(userId);
    if (!status) {
      logger.warn(`User ${userId} not initialized`);
      return false;
    }

    status.inCall = true;
    status.callId = callId;
    status.status = "busy";
    status.lastStatusChange = new Date();

    this.emit("call-started", status);
    if (this.config.onStatusChange) {
      this.config.onStatusChange(status);
    }

    return true;
  }

  /**
   * Mark user as call ended
   */
  endCall(userId: string): boolean {
    const status = this.statuses.get(userId);
    if (!status) {
      logger.warn(`User ${userId} not initialized`);
      return false;
    }

    status.inCall = false;
    status.callId = undefined;

    // Return to previous status or online
    const newStatus = status.customMessage ? "dnd" : "online";
    status.status = newStatus;
    status.lastStatusChange = new Date();

    // Restart away timer
    this.startAwayTimer(userId);

    this.emit("call-ended", status);
    if (this.config.onStatusChange) {
      this.config.onStatusChange(status);
    }

    return true;
  }

  /**
   * Check if user is available for a call
   */
  isAvailable(userId: string): boolean {
    const status = this.statuses.get(userId);
    if (!status) return false;

    // Available if online and not in a call
    if (status.status === "online" && !status.inCall) {
      return true;
    }

    // Not available if offline or DND
    if (status.status === "offline" || status.status === "dnd") {
      return false;
    }

    // Check call waiting
    if (
      status.inCall &&
      status.availableForCallWaiting &&
      this.config.enableCallWaiting
    ) {
      // Check concurrent calls limit
      // In real implementation, would check active calls count
      return true;
    }

    return false;
  }

  /**
   * Check if user is busy
   */
  isBusy(userId: string): boolean {
    const status = this.statuses.get(userId);
    if (!status) return false;

    return status.inCall || status.status === "busy";
  }

  /**
   * Check if user is in DND mode
   */
  isDND(userId: string): boolean {
    const status = this.statuses.get(userId);
    if (!status) return false;

    return status.status === "dnd";
  }

  /**
   * Enable/disable call waiting for user
   */
  setCallWaiting(userId: string, enabled: boolean): boolean {
    const status = this.statuses.get(userId);
    if (!status) return false;

    status.availableForCallWaiting = enabled;
    this.emit("call-waiting-changed", status);

    return true;
  }

  /**
   * Get unavailability reason
   */
  getUnavailabilityReason(userId: string): string | null {
    const status = this.statuses.get(userId);
    if (!status) {
      return "User not found";
    }

    if (this.isAvailable(userId)) {
      return null;
    }

    if (status.status === "offline") {
      return "User is offline";
    }

    if (status.status === "dnd") {
      return status.customMessage || "User is in Do Not Disturb mode";
    }

    if (status.inCall) {
      if (status.availableForCallWaiting && this.config.enableCallWaiting) {
        return "User is in another call (call waiting available)";
      }
      return "User is busy in another call";
    }

    if (status.status === "away") {
      return "User is away";
    }

    return "User is unavailable";
  }

  /**
   * Get display status text
   */
  getStatusDisplay(userId: string): string {
    const status = this.statuses.get(userId);
    if (!status) return "Unknown";

    if (status.customMessage) {
      return status.customMessage;
    }

    const displays: Record<UserStatus, string> = {
      online: "Available",
      busy: "In a call",
      away: "Away",
      dnd: "Do Not Disturb",
      offline: "Offline",
    };

    return displays[status.status] || status.status;
  }

  /**
   * Get all users with status
   */
  getAllStatuses(): UserCallStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Get users by status
   */
  getUsersByStatus(status: UserStatus): UserCallStatus[] {
    return Array.from(this.statuses.values()).filter(
      (s) => s.status === status,
    );
  }

  /**
   * Get available users
   */
  getAvailableUsers(): UserCallStatus[] {
    return Array.from(this.statuses.values()).filter((s) =>
      this.isAvailable(s.userId),
    );
  }

  /**
   * Get busy users
   */
  getBusyUsers(): UserCallStatus[] {
    return Array.from(this.statuses.values()).filter((s) =>
      this.isBusy(s.userId),
    );
  }

  /**
   * Start away timer for user
   */
  private startAwayTimer(userId: string): void {
    // Clear existing timer
    this.stopAwayTimer(userId);

    // Only set timer if user is online
    const status = this.statuses.get(userId);
    if (!status || status.status !== "online") return;

    const timer = setTimeout(() => {
      const current = this.statuses.get(userId);
      if (current && current.status === "online" && !current.inCall) {
        this.setStatus(userId, "away");
      }
    }, this.config.awayTimeout);

    this.awayTimers.set(userId, timer);
  }

  /**
   * Stop away timer for user
   */
  private stopAwayTimer(userId: string): void {
    const timer = this.awayTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.awayTimers.delete(userId);
    }
  }

  /**
   * Cleanup user
   */
  removeUser(userId: string): void {
    this.stopAwayTimer(userId);
    this.statuses.delete(userId);
    this.activityListeners.delete(userId);
    this.emit("user-removed", userId);
  }

  /**
   * Cleanup all users
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.awayTimers.values()) {
      clearTimeout(timer);
    }
    this.awayTimers.clear();

    // Clear statuses
    this.statuses.clear();

    // Clear listeners
    this.activityListeners.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StatusManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart away timers if timeout changed
    if (config.awayTimeout !== undefined) {
      for (const userId of this.statuses.keys()) {
        this.startAwayTimer(userId);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    online: number;
    busy: number;
    away: number;
    dnd: number;
    offline: number;
    inCall: number;
  } {
    const statuses = Array.from(this.statuses.values());
    return {
      total: statuses.length,
      online: statuses.filter((s) => s.status === "online").length,
      busy: statuses.filter((s) => s.status === "busy").length,
      away: statuses.filter((s) => s.status === "away").length,
      dnd: statuses.filter((s) => s.status === "dnd").length,
      offline: statuses.filter((s) => s.status === "offline").length,
      inCall: statuses.filter((s) => s.inCall).length,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new call status manager
 */
export function createStatusManager(
  config?: StatusManagerConfig,
): CallStatusManager {
  return new CallStatusManager(config);
}
