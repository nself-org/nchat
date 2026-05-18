/**
 * Status Manager
 *
 * Centralized logic for managing user presence status:
 * - Status validation and transitions
 * - Custom status management with expiration
 * - Status presets and quick actions
 * - Privacy-aware status display
 * - Multi-device status synchronization
 * - Status persistence and restoration
 * - Scheduled status changes (DND schedules)
 *
 * @example
 * ```ts
 * const manager = new StatusManager(userId);
 *
 * // Set status
 * await manager.setStatus('dnd');
 *
 * // Set custom status with expiration
 * await manager.setCustomStatus({
 *   emoji: '📅',
 *   text: 'In a meeting',
 *   expiresAt: new Date(Date.now() + 3600000),
 * });
 *
 * // Use preset
 * await manager.applyPreset('in_meeting');
 *
 * // Check if status expired
 * const isExpired = manager.isCustomStatusExpired();
 * ```
 */

import type {
  PresenceStatus,
  CustomStatus,
  ActivityType,
  StatusDuration,
  PresenceSettings,
} from "./presence-types";

import { logger } from "@/lib/logger";
import {
  PRESET_ACTIVITIES,
  DURATION_OPTIONS,
  getPresetActivity,
  getDurationOption,
  isStatusExpired,
} from "./presence-types";

// ============================================================================
// Types
// ============================================================================

export interface StatusChangeEvent {
  userId: string;
  previousStatus: PresenceStatus;
  newStatus: PresenceStatus;
  timestamp: Date;
  reason?: "manual" | "auto-away" | "schedule" | "device-sync";
}

export interface CustomStatusChangeEvent {
  userId: string;
  previousCustomStatus: CustomStatus | null;
  newCustomStatus: CustomStatus | null;
  timestamp: Date;
}

export interface StatusManagerOptions {
  /** User ID */
  userId: string;
  /** Initial status */
  initialStatus?: PresenceStatus;
  /** Initial custom status */
  initialCustomStatus?: CustomStatus | null;
  /** Presence settings */
  settings?: PresenceSettings;
  /** Callback when status changes */
  onStatusChange?: (event: StatusChangeEvent) => void;
  /** Callback when custom status changes */
  onCustomStatusChange?: (event: CustomStatusChangeEvent) => void;
  /** Storage adapter for persistence */
  storage?: StatusStorage;
}

export interface StatusStorage {
  save(key: string, value: any): Promise<void>;
  load(key: string): Promise<any>;
  remove(key: string): Promise<void>;
}

// ============================================================================
// Default Storage (localStorage)
// ============================================================================

class LocalStatusStorage implements StatusStorage {
  private prefix = "nchat:status:";

  async save(key: string, value: any): Promise<void> {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  async load(key: string): Promise<any> {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem(this.prefix + key);
    return value ? JSON.parse(value) : null;
  }

  async remove(key: string): Promise<void> {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(this.prefix + key);
  }
}

// ============================================================================
// StatusManager Class
// ============================================================================

export class StatusManager {
  private userId: string;
  private currentStatus: PresenceStatus;
  private previousStatus: PresenceStatus;
  private customStatus: CustomStatus | null;
  private settings: PresenceSettings;
  private storage: StatusStorage;
  private onStatusChange?: (event: StatusChangeEvent) => void;
  private onCustomStatusChange?: (event: CustomStatusChangeEvent) => void;
  private expirationCheckInterval?: NodeJS.Timeout;
  private scheduleCheckInterval?: NodeJS.Timeout;

  constructor(options: StatusManagerOptions) {
    this.userId = options.userId;
    this.currentStatus = options.initialStatus ?? "online";
    this.previousStatus = this.currentStatus;
    this.customStatus = options.initialCustomStatus ?? null;
    this.settings = options.settings ?? this.getDefaultSettings();
    this.storage = options.storage ?? new LocalStatusStorage();
    this.onStatusChange = options.onStatusChange;
    this.onCustomStatusChange = options.onCustomStatusChange;

    // Start expiration and schedule checks
    this.startExpirationCheck();
    this.startScheduleCheck();

    // Load persisted state
    this.loadPersistedState();
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Get current status
   */
  getStatus(): PresenceStatus {
    return this.currentStatus;
  }

  /**
   * Get custom status
   */
  getCustomStatus(): CustomStatus | null {
    return this.customStatus;
  }

  /**
   * Set status with validation and persistence
   */
  async setStatus(
    status: PresenceStatus,
    reason: StatusChangeEvent["reason"] = "manual",
  ): Promise<void> {
    if (status === this.currentStatus) return;

    const previousStatus = this.currentStatus;
    this.previousStatus = previousStatus;
    this.currentStatus = status;

    // Persist
    await this.persistState();

    // Emit event
    this.onStatusChange?.({
      userId: this.userId,
      previousStatus,
      newStatus: status,
      timestamp: new Date(),
      reason,
    });
  }

  /**
   * Restore previous status
   */
  async restorePreviousStatus(): Promise<void> {
    await this.setStatus(this.previousStatus, "manual");
  }

  /**
   * Set custom status with optional expiration
   */
  async setCustomStatus(customStatus: CustomStatus | null): Promise<void> {
    const previousCustomStatus = this.customStatus;
    this.customStatus = customStatus;

    // Persist
    await this.persistState();

    // Emit event
    this.onCustomStatusChange?.({
      userId: this.userId,
      previousCustomStatus,
      newCustomStatus: customStatus,
      timestamp: new Date(),
    });
  }

  /**
   * Clear custom status
   */
  async clearCustomStatus(): Promise<void> {
    await this.setCustomStatus(null);
  }

  /**
   * Check if custom status has expired
   */
  isCustomStatusExpired(): boolean {
    return isStatusExpired(this.customStatus ?? undefined);
  }

  /**
   * Apply a preset activity
   */
  async applyPreset(
    activityType: ActivityType,
    duration?: StatusDuration,
  ): Promise<void> {
    const preset = getPresetActivity(activityType);
    if (!preset) {
      throw new Error(`Unknown activity type: ${activityType}`);
    }

    const durationValue = duration ?? preset.defaultDuration ?? "indefinite";
    const durationOption = getDurationOption(durationValue);
    const expiresAt = durationOption?.getExpiresAt() ?? null;

    await this.setCustomStatus({
      emoji: preset.emoji,
      text: preset.text,
      expiresAt,
      activity: activityType,
    });
  }

  // ============================================================================
  // Status Validation
  // ============================================================================

  /**
   * Check if status transition is allowed
   */
  canTransitionTo(newStatus: PresenceStatus): boolean {
    // All transitions allowed except offline can only go to online
    if (this.currentStatus === "offline" && newStatus !== "online") {
      return false;
    }
    return true;
  }

  /**
   * Get allowed status transitions from current status
   */
  getAllowedTransitions(): PresenceStatus[] {
    if (this.currentStatus === "offline") {
      return ["online"];
    }
    return ["online", "away", "dnd", "invisible", "offline"];
  }

  // ============================================================================
  // Scheduled Status
  // ============================================================================

  /**
   * Check if DND schedule should be active
   */
  shouldBeDndNow(): boolean {
    if (!this.settings.dndSchedule.enabled) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const { days, startTime, endTime } = this.settings.dndSchedule;

    // Check if today is in schedule
    if (!days.includes(currentDay)) return false;

    // Check if current time is in range
    if (startTime <= endTime) {
      // Same day (e.g., 09:00 to 17:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Crosses midnight (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Apply DND schedule if needed
   */
  async applyDndSchedule(): Promise<void> {
    if (this.shouldBeDndNow() && this.currentStatus !== "dnd") {
      await this.setStatus("dnd", "schedule");
    } else if (!this.shouldBeDndNow() && this.currentStatus === "dnd") {
      await this.restorePreviousStatus();
    }
  }

  // ============================================================================
  // Privacy
  // ============================================================================

  /**
   * Get status respecting privacy settings
   */
  getPublicStatus(): PresenceStatus {
    if (this.currentStatus === "invisible") {
      return "offline";
    }
    return this.currentStatus;
  }

  /**
   * Get custom status respecting privacy settings
   */
  getPublicCustomStatus(): CustomStatus | null {
    if (!this.settings.privacy.shareActivityStatus) {
      return null;
    }
    return this.customStatus;
  }

  /**
   * Check if last seen should be visible
   */
  shouldShowLastSeen(): boolean {
    return this.settings.privacy.showLastSeen;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Persist current state
   */
  private async persistState(): Promise<void> {
    await this.storage.save(`${this.userId}:status`, {
      currentStatus: this.currentStatus,
      previousStatus: this.previousStatus,
      customStatus: this.customStatus,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const state = await this.storage.load(`${this.userId}:status`);
      if (!state) return;

      this.currentStatus = state.currentStatus ?? "online";
      this.previousStatus = state.previousStatus ?? this.currentStatus;
      this.customStatus = state.customStatus ?? null;

      // Check if custom status expired
      if (this.isCustomStatusExpired()) {
        this.customStatus = null;
      }
    } catch (error) {
      logger.error("Failed to load persisted status:", error);
    }
  }

  // ============================================================================
  // Expiration & Scheduling
  // ============================================================================

  /**
   * Start checking for custom status expiration
   */
  private startExpirationCheck(): void {
    // Check every minute
    this.expirationCheckInterval = setInterval(() => {
      if (this.isCustomStatusExpired()) {
        this.clearCustomStatus();
      }
    }, 60 * 1000);
  }

  /**
   * Start checking for scheduled status changes
   */
  private startScheduleCheck(): void {
    // Check every minute
    this.scheduleCheckInterval = setInterval(() => {
      this.applyDndSchedule();
    }, 60 * 1000);

    // Check immediately
    this.applyDndSchedule();
  }

  /**
   * Stop all timers
   */
  destroy(): void {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
    }
    if (this.scheduleCheckInterval) {
      clearInterval(this.scheduleCheckInterval);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getDefaultSettings(): PresenceSettings {
    return {
      autoAway: {
        enabled: true,
        timeout: 5,
        setStatus: "away",
      },
      idleDetection: {
        enabled: true,
        timeout: 5,
      },
      privacy: {
        showLastSeen: true,
        showTypingIndicator: true,
        shareActivityStatus: true,
      },
      dndSchedule: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a status manager instance
 */
export function createStatusManager(
  options: StatusManagerOptions,
): StatusManager {
  return new StatusManager(options);
}

/**
 * Validate status value
 */
export function isValidStatus(status: string): status is PresenceStatus {
  return ["online", "away", "dnd", "invisible", "offline"].includes(status);
}

/**
 * Sanitize custom status text
 */
export function sanitizeCustomStatusText(text: string): string {
  return text.trim().slice(0, 100); // Max 100 characters
}

/**
 * Sanitize custom status emoji
 */
export function sanitizeCustomStatusEmoji(emoji: string): string {
  // Remove non-emoji characters and take first emoji
  const emojiRegex = /\p{Emoji}/u;
  const match = emoji.match(emojiRegex);
  return match ? match[0] : "";
}

/**
 * Create custom status from user input
 */
export function createCustomStatus(
  text?: string,
  emoji?: string,
  duration?: StatusDuration,
): CustomStatus {
  const durationOption = duration ? getDurationOption(duration) : null;
  const expiresAt = durationOption?.getExpiresAt() ?? null;

  return {
    text: text ? sanitizeCustomStatusText(text) : undefined,
    emoji: emoji ? sanitizeCustomStatusEmoji(emoji) : undefined,
    expiresAt,
  };
}

export default StatusManager;
