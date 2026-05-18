/**
 * Livestream Moderation Service
 *
 * Chat moderation controls for live streams including slow mode,
 * subscriber-only mode, user bans/timeouts, and auto-moderation.
 *
 * @module services/livestream/moderation.service
 */

import { logger } from "@/lib/logger";
import type {
  Stream,
  StreamModerator,
  ModeratorPermissions,
  StreamBan,
  StreamTimeout,
  ModerationLog,
  ModerationAction,
  AutoModConfig,
  ChatMode,
} from "./types";
import {
  StreamNotFoundError,
  StreamUnauthorizedError,
  ViewerBannedError,
  ChatDisabledError,
  SlowModeError,
} from "./types";

// ============================================================================
// Types
// ============================================================================

interface ModerationStore {
  moderators: Map<string, StreamModerator[]>;
  bans: Map<string, StreamBan[]>;
  timeouts: Map<string, StreamTimeout[]>;
  logs: Map<string, ModerationLog[]>;
  chatSettings: Map<string, ChatSettings>;
  autoModConfigs: Map<string, AutoModConfig>;
  lastMessageTimes: Map<string, Map<string, number>>;
}

interface ChatSettings {
  mode: ChatMode;
  slowModeSeconds: number;
  minAccountAge?: number;
  followerOnly: boolean;
  subscriberOnly: boolean;
}

interface ProfanityResult {
  hasProfanity: boolean;
  matches: string[];
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_AUTOMOD_CONFIG: AutoModConfig = {
  enabled: false,
  profanityFilter: true,
  spamDetection: true,
  linkBlocking: false,
  capsLimit: 80,
  emoteLimit: 20,
  duplicateDetection: true,
  blockedWords: [],
  allowedLinks: [],
};

const DEFAULT_MODERATOR_PERMISSIONS: ModeratorPermissions = {
  canDeleteMessages: true,
  canTimeoutUsers: true,
  canBanUsers: false,
  canSlowMode: true,
  canSubscriberOnlyMode: false,
  canPinMessages: true,
};

// Simple profanity list for demo (production would use a proper library)
const PROFANITY_LIST = ["spam", "scam", "fake"];

// ============================================================================
// Livestream Moderation Service
// ============================================================================

export class LivestreamModerationService {
  private store: ModerationStore;

  constructor() {
    this.store = {
      moderators: new Map(),
      bans: new Map(),
      timeouts: new Map(),
      logs: new Map(),
      chatSettings: new Map(),
      autoModConfigs: new Map(),
      lastMessageTimes: new Map(),
    };
  }

  // ==========================================================================
  // Moderator Management
  // ==========================================================================

  /**
   * Add moderator to stream
   */
  async addModerator(
    streamId: string,
    userId: string,
    addedBy: string,
    permissions?: Partial<ModeratorPermissions>,
  ): Promise<StreamModerator> {
    const moderators = this.store.moderators.get(streamId) ?? [];

    // Check if already a moderator
    if (moderators.some((m) => m.userId === userId)) {
      throw new Error("User is already a moderator");
    }

    const moderator: StreamModerator = {
      id: crypto.randomUUID(),
      streamId,
      userId,
      addedBy,
      addedAt: new Date().toISOString(),
      permissions: {
        ...DEFAULT_MODERATOR_PERMISSIONS,
        ...permissions,
      },
    };

    moderators.push(moderator);
    this.store.moderators.set(streamId, moderators);

    this.logAction(streamId, addedBy, "warn", `Added moderator: ${userId}`);
    logger.info("Moderator added", { streamId, userId, addedBy });

    return moderator;
  }

  /**
   * Remove moderator from stream
   */
  async removeModerator(
    streamId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    const moderators = this.store.moderators.get(streamId) ?? [];
    const filtered = moderators.filter((m) => m.userId !== userId);

    this.store.moderators.set(streamId, filtered);
    this.logAction(streamId, removedBy, "warn", `Removed moderator: ${userId}`);

    logger.info("Moderator removed", { streamId, userId, removedBy });
  }

  /**
   * Get moderators for stream
   */
  async getModerators(streamId: string): Promise<StreamModerator[]> {
    return this.store.moderators.get(streamId) ?? [];
  }

  /**
   * Check if user is moderator
   */
  async isModerator(streamId: string, userId: string): Promise<boolean> {
    const moderators = this.store.moderators.get(streamId) ?? [];
    return moderators.some((m) => m.userId === userId);
  }

  /**
   * Get moderator permissions
   */
  async getModeratorPermissions(
    streamId: string,
    userId: string,
  ): Promise<ModeratorPermissions | null> {
    const moderators = this.store.moderators.get(streamId) ?? [];
    const moderator = moderators.find((m) => m.userId === userId);
    return moderator?.permissions ?? null;
  }

  // ==========================================================================
  // Ban Management
  // ==========================================================================

  /**
   * Ban user from stream
   */
  async banUser(
    streamId: string,
    targetUserId: string,
    moderatorId: string,
    reason?: string,
    isPermanent: boolean = true,
    durationMinutes?: number,
  ): Promise<StreamBan> {
    const bans = this.store.bans.get(streamId) ?? [];

    // Check if already banned
    if (bans.some((b) => b.userId === targetUserId && !b.expiresAt)) {
      throw new Error("User is already banned");
    }

    const ban: StreamBan = {
      id: crypto.randomUUID(),
      streamId,
      userId: targetUserId,
      moderatorId,
      reason,
      isPermanent,
      expiresAt: isPermanent
        ? undefined
        : new Date(Date.now() + (durationMinutes ?? 60) * 60000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    bans.push(ban);
    this.store.bans.set(streamId, bans);

    this.logAction(streamId, moderatorId, "ban", reason, targetUserId);
    logger.info("User banned from stream", {
      streamId,
      targetUserId,
      moderatorId,
      isPermanent,
    });

    return ban;
  }

  /**
   * Unban user from stream
   */
  async unbanUser(
    streamId: string,
    targetUserId: string,
    moderatorId: string,
  ): Promise<void> {
    const bans = this.store.bans.get(streamId) ?? [];
    const filtered = bans.filter((b) => b.userId !== targetUserId);

    this.store.bans.set(streamId, filtered);
    this.logAction(streamId, moderatorId, "unban", undefined, targetUserId);

    logger.info("User unbanned from stream", {
      streamId,
      targetUserId,
      moderatorId,
    });
  }

  /**
   * Get banned users
   */
  async getBannedUsers(streamId: string): Promise<StreamBan[]> {
    const bans = this.store.bans.get(streamId) ?? [];
    const now = new Date().toISOString();

    // Filter out expired bans
    return bans.filter(
      (b) => b.isPermanent || !b.expiresAt || b.expiresAt > now,
    );
  }

  /**
   * Check if user is banned
   */
  async isUserBanned(streamId: string, userId: string): Promise<boolean> {
    const bans = await this.getBannedUsers(streamId);
    return bans.some((b) => b.userId === userId);
  }

  // ==========================================================================
  // Timeout Management
  // ==========================================================================

  /**
   * Timeout user in stream
   */
  async timeoutUser(
    streamId: string,
    targetUserId: string,
    moderatorId: string,
    durationSeconds: number,
    reason?: string,
  ): Promise<StreamTimeout> {
    const timeouts = this.store.timeouts.get(streamId) ?? [];

    const timeout: StreamTimeout = {
      id: crypto.randomUUID(),
      streamId,
      userId: targetUserId,
      moderatorId,
      reason,
      durationSeconds,
      expiresAt: new Date(Date.now() + durationSeconds * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Replace any existing timeout for this user
    const filtered = timeouts.filter((t) => t.userId !== targetUserId);
    filtered.push(timeout);
    this.store.timeouts.set(streamId, filtered);

    this.logAction(streamId, moderatorId, "timeout", reason, targetUserId, {
      duration: durationSeconds,
    });

    logger.info("User timed out", { streamId, targetUserId, durationSeconds });

    return timeout;
  }

  /**
   * Remove timeout
   */
  async removeTimeout(
    streamId: string,
    targetUserId: string,
    moderatorId: string,
  ): Promise<void> {
    const timeouts = this.store.timeouts.get(streamId) ?? [];
    const filtered = timeouts.filter((t) => t.userId !== targetUserId);

    this.store.timeouts.set(streamId, filtered);
    logger.info("Timeout removed", { streamId, targetUserId, moderatorId });
  }

  /**
   * Check if user is timed out
   */
  async isUserTimedOut(
    streamId: string,
    userId: string,
  ): Promise<StreamTimeout | null> {
    const timeouts = this.store.timeouts.get(streamId) ?? [];
    const now = new Date().toISOString();

    const activeTimeout = timeouts.find(
      (t) => t.userId === userId && t.expiresAt > now,
    );

    return activeTimeout ?? null;
  }

  // ==========================================================================
  // Chat Settings
  // ==========================================================================

  /**
   * Set chat mode
   */
  async setChatMode(
    streamId: string,
    mode: ChatMode,
    moderatorId: string,
  ): Promise<void> {
    const settings = this.getChatSettings(streamId);
    settings.mode = mode;

    // Update related settings based on mode
    switch (mode) {
      case "followers":
        settings.followerOnly = true;
        settings.subscriberOnly = false;
        break;
      case "subscribers":
        settings.followerOnly = false;
        settings.subscriberOnly = true;
        break;
      case "disabled":
        break;
      default:
        settings.followerOnly = false;
        settings.subscriberOnly = false;
    }

    this.store.chatSettings.set(streamId, settings);
    this.logAction(
      streamId,
      moderatorId,
      "warn",
      `Chat mode changed to: ${mode}`,
    );

    logger.info("Chat mode updated", { streamId, mode });
  }

  /**
   * Set slow mode
   */
  async setSlowMode(
    streamId: string,
    seconds: number,
    moderatorId: string,
  ): Promise<void> {
    const settings = this.getChatSettings(streamId);
    settings.slowModeSeconds = seconds;
    this.store.chatSettings.set(streamId, settings);

    this.logAction(
      streamId,
      moderatorId,
      "warn",
      `Slow mode set to: ${seconds}s`,
    );
    logger.info("Slow mode updated", { streamId, seconds });
  }

  /**
   * Set subscriber-only mode
   */
  async setSubscriberOnlyMode(
    streamId: string,
    enabled: boolean,
    moderatorId: string,
  ): Promise<void> {
    const settings = this.getChatSettings(streamId);
    settings.subscriberOnly = enabled;
    settings.mode = enabled ? "subscribers" : "open";
    this.store.chatSettings.set(streamId, settings);

    this.logAction(
      streamId,
      moderatorId,
      "warn",
      `Subscriber-only mode: ${enabled}`,
    );
    logger.info("Subscriber-only mode updated", { streamId, enabled });
  }

  /**
   * Set follower-only mode
   */
  async setFollowerOnlyMode(
    streamId: string,
    enabled: boolean,
    moderatorId: string,
  ): Promise<void> {
    const settings = this.getChatSettings(streamId);
    settings.followerOnly = enabled;
    settings.mode = enabled ? "followers" : "open";
    this.store.chatSettings.set(streamId, settings);

    this.logAction(
      streamId,
      moderatorId,
      "warn",
      `Follower-only mode: ${enabled}`,
    );
    logger.info("Follower-only mode updated", { streamId, enabled });
  }

  /**
   * Get chat settings
   */
  getChatSettings(streamId: string): ChatSettings {
    let settings = this.store.chatSettings.get(streamId);

    if (!settings) {
      settings = {
        mode: "open",
        slowModeSeconds: 0,
        followerOnly: false,
        subscriberOnly: false,
      };
      this.store.chatSettings.set(streamId, settings);
    }

    return settings;
  }

  // ==========================================================================
  // Auto-Moderation
  // ==========================================================================

  /**
   * Configure auto-moderation
   */
  async configureAutoMod(
    streamId: string,
    config: Partial<AutoModConfig>,
    moderatorId: string,
  ): Promise<AutoModConfig> {
    const existing = this.store.autoModConfigs.get(streamId) ?? {
      ...DEFAULT_AUTOMOD_CONFIG,
    };
    const updated = { ...existing, ...config };

    this.store.autoModConfigs.set(streamId, updated);
    this.logAction(
      streamId,
      moderatorId,
      "warn",
      "Auto-mod configuration updated",
    );

    return updated;
  }

  /**
   * Get auto-moderation config
   */
  getAutoModConfig(streamId: string): AutoModConfig {
    return (
      this.store.autoModConfigs.get(streamId) ?? { ...DEFAULT_AUTOMOD_CONFIG }
    );
  }

  /**
   * Check message against auto-moderation rules
   */
  async checkMessage(
    streamId: string,
    userId: string,
    content: string,
    userMetadata?: {
      isSubscriber?: boolean;
      isFollower?: boolean;
      accountCreatedAt?: string;
    },
  ): Promise<{
    allowed: boolean;
    reason?: string;
    action?: ModerationAction;
  }> {
    const settings = this.getChatSettings(streamId);
    const autoMod = this.getAutoModConfig(streamId);

    // Check if chat is disabled
    if (settings.mode === "disabled") {
      return { allowed: false, reason: "Chat is disabled" };
    }

    // Check if user is banned
    if (await this.isUserBanned(streamId, userId)) {
      return { allowed: false, reason: "You are banned from this stream" };
    }

    // Check timeout
    const timeout = await this.isUserTimedOut(streamId, userId);
    if (timeout) {
      const remaining = Math.ceil(
        (new Date(timeout.expiresAt).getTime() - Date.now()) / 1000,
      );
      return { allowed: false, reason: `Timed out. ${remaining}s remaining` };
    }

    // Check subscriber-only mode
    if (settings.subscriberOnly && !userMetadata?.isSubscriber) {
      return { allowed: false, reason: "Subscriber-only mode is enabled" };
    }

    // Check follower-only mode
    if (settings.followerOnly && !userMetadata?.isFollower) {
      return { allowed: false, reason: "Follower-only mode is enabled" };
    }

    // Check slow mode
    if (settings.slowModeSeconds > 0) {
      const lastMessageTimes =
        this.store.lastMessageTimes.get(streamId) ?? new Map();
      const lastTime = lastMessageTimes.get(userId) ?? 0;
      const elapsed = (Date.now() - lastTime) / 1000;

      if (elapsed < settings.slowModeSeconds) {
        const waitTime = Math.ceil(settings.slowModeSeconds - elapsed);
        return { allowed: false, reason: `Slow mode: wait ${waitTime}s` };
      }
    }

    // Check minimum account age
    if (settings.minAccountAge && userMetadata?.accountCreatedAt) {
      const accountAge =
        Date.now() - new Date(userMetadata.accountCreatedAt).getTime();
      const requiredAge = settings.minAccountAge * 24 * 60 * 60 * 1000; // Convert days to ms

      if (accountAge < requiredAge) {
        return { allowed: false, reason: "Account too new to chat" };
      }
    }

    // Auto-moderation checks
    if (autoMod.enabled) {
      // Profanity filter
      if (autoMod.profanityFilter) {
        const profanityResult = this.checkProfanity(
          content,
          autoMod.blockedWords,
        );
        if (profanityResult.hasProfanity) {
          return {
            allowed: false,
            reason: "Message contains prohibited content",
            action: "delete_message",
          };
        }
      }

      // Caps limit
      if (autoMod.capsLimit > 0) {
        const capsPercent = this.calculateCapsPercentage(content);
        if (capsPercent > autoMod.capsLimit && content.length > 10) {
          return {
            allowed: false,
            reason: "Too many capital letters",
            action: "warn",
          };
        }
      }

      // Link blocking
      if (autoMod.linkBlocking) {
        if (
          this.containsLink(content) &&
          !this.isAllowedLink(content, autoMod.allowedLinks)
        ) {
          return {
            allowed: false,
            reason: "Links are not allowed",
            action: "delete_message",
          };
        }
      }

      // Spam detection (simple duplicate check)
      if (autoMod.duplicateDetection) {
        if (this.isDuplicateMessage(streamId, userId, content)) {
          return {
            allowed: false,
            reason: "Duplicate message detected",
            action: "warn",
          };
        }
      }
    }

    // Record message time for slow mode
    const lastMessageTimes =
      this.store.lastMessageTimes.get(streamId) ?? new Map();
    lastMessageTimes.set(userId, Date.now());
    this.store.lastMessageTimes.set(streamId, lastMessageTimes);

    return { allowed: true };
  }

  // ==========================================================================
  // Moderation Log
  // ==========================================================================

  /**
   * Get moderation logs
   */
  async getModerationLogs(
    streamId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: ModerationAction;
    },
  ): Promise<ModerationLog[]> {
    let logs = this.store.logs.get(streamId) ?? [];

    if (options?.action) {
      logs = logs.filter((l) => l.action === options.action);
    }

    logs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Log moderation action
   */
  private logAction(
    streamId: string,
    moderatorId: string,
    action: ModerationAction,
    reason?: string,
    targetUserId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const logs = this.store.logs.get(streamId) ?? [];

    const log: ModerationLog = {
      id: crypto.randomUUID(),
      streamId,
      moderatorId,
      targetUserId,
      action,
      reason,
      metadata,
      createdAt: new Date().toISOString(),
    };

    logs.push(log);

    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }

    this.store.logs.set(streamId, logs);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private checkProfanity(
    content: string,
    blockedWords: string[],
  ): ProfanityResult {
    const lowerContent = content.toLowerCase();
    const matches: string[] = [];

    // Check default profanity list
    for (const word of PROFANITY_LIST) {
      if (lowerContent.includes(word)) {
        matches.push(word);
      }
    }

    // Check custom blocked words
    for (const word of blockedWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        matches.push(word);
      }
    }

    return {
      hasProfanity: matches.length > 0,
      matches,
    };
  }

  private calculateCapsPercentage(content: string): number {
    const letters = content.replace(/[^a-zA-Z]/g, "");
    if (letters.length === 0) return 0;

    const caps = letters.replace(/[^A-Z]/g, "");
    return (caps.length / letters.length) * 100;
  }

  private containsLink(content: string): boolean {
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
    return urlPattern.test(content);
  }

  private isAllowedLink(content: string, allowedLinks: string[]): boolean {
    if (allowedLinks.length === 0) return false;

    const lowerContent = content.toLowerCase();
    return allowedLinks.some((link) =>
      lowerContent.includes(link.toLowerCase()),
    );
  }

  private isDuplicateMessage(
    streamId: string,
    userId: string,
    content: string,
  ): boolean {
    // Simple implementation - in production, use a proper cache
    // Check if last message from user is the same
    return false; // Placeholder
  }

  /**
   * Cleanup stream data
   */
  async cleanupStream(streamId: string): Promise<void> {
    this.store.moderators.delete(streamId);
    this.store.bans.delete(streamId);
    this.store.timeouts.delete(streamId);
    this.store.logs.delete(streamId);
    this.store.chatSettings.delete(streamId);
    this.store.autoModConfigs.delete(streamId);
    this.store.lastMessageTimes.delete(streamId);

    logger.info("Stream moderation data cleaned up", { streamId });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: LivestreamModerationService | null = null;

/**
 * Get singleton moderation service instance
 */
export function getModerationService(): LivestreamModerationService {
  if (!serviceInstance) {
    serviceInstance = new LivestreamModerationService();
  }
  return serviceInstance;
}

/**
 * Create new moderation service instance
 */
export function createModerationService(): LivestreamModerationService {
  return new LivestreamModerationService();
}
