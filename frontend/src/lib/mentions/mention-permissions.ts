/**
 * Mention Permissions - Permission checking for mention features
 *
 * Provides utilities for:
 * - Checking who can use @everyone, @here, @channel
 * - Role-based permission checks
 * - Channel-specific mention settings
 *
 * @example
 * ```typescript
 * import { canUseMention, getMentionPermissions } from '@/lib/mentions/mention-permissions'
 *
 * if (canUseMention('everyone', userRole, channelSettings)) {
 *   // Allow @everyone mention
 * }
 * ```
 */

import type {
  MentionType,
  MentionPermissions,
  ChannelMentionSettings,
} from "./mention-types";
import {
  DEFAULT_MENTION_PERMISSIONS,
  DEFAULT_CHANNEL_MENTION_SETTINGS,
} from "./mention-types";

// ============================================================================
// Types
// ============================================================================

/**
 * User roles in the system
 */
export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  moderator: 60,
  member: 40,
  guest: 20,
};

/**
 * Context for permission checks
 */
export interface PermissionContext {
  /** Current user's role */
  userRole: UserRole;
  /** User's role in the specific channel (may differ from global role) */
  channelRole?: UserRole;
  /** Whether user is the channel creator */
  isChannelCreator?: boolean;
  /** Whether user is the workspace owner */
  isWorkspaceOwner?: boolean;
  /** Channel-specific mention settings */
  channelSettings?: ChannelMentionSettings;
  /** Whether the channel is a DM */
  isDirectMessage?: boolean;
  /** Whether the channel is archived */
  isArchived?: boolean;
}

// ============================================================================
// Role Hierarchy Helpers
// ============================================================================

/**
 * Check if a role meets or exceeds a minimum role requirement
 */
export function roleAtLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get the effective role (highest of global and channel role)
 */
export function getEffectiveRole(
  globalRole: UserRole,
  channelRole?: UserRole,
): UserRole {
  if (!channelRole) return globalRole;
  return ROLE_HIERARCHY[globalRole] >= ROLE_HIERARCHY[channelRole]
    ? globalRole
    : channelRole;
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(role: UserRole): boolean {
  return roleAtLeast(role, "admin");
}

/**
 * Check if user has moderator privileges
 */
export function isModerator(role: UserRole): boolean {
  return roleAtLeast(role, "moderator");
}

// ============================================================================
// Mention Permission Checks
// ============================================================================

/**
 * Check if a user can use a specific mention type
 */
export function canUseMention(
  mentionType: MentionType,
  context: PermissionContext,
): boolean {
  const {
    userRole,
    channelRole,
    isChannelCreator = false,
    isWorkspaceOwner = false,
    channelSettings = DEFAULT_CHANNEL_MENTION_SETTINGS,
    isDirectMessage = false,
    isArchived = false,
  } = context;

  // Can't mention in archived channels
  if (isArchived) {
    return false;
  }

  // Get effective role
  const effectiveRole = getEffectiveRole(userRole, channelRole);

  // Workspace owner can do anything
  if (isWorkspaceOwner) {
    return true;
  }

  switch (mentionType) {
    case "user":
      // Everyone can mention users
      return true;

    case "channel":
      // Everyone can link to channels
      return true;

    case "everyone":
      // Check if @everyone is allowed in this channel
      if (!channelSettings.allowEveryone) {
        return false;
      }
      // Check role requirement
      return roleAtLeast(effectiveRole, channelSettings.everyoneMinRole);

    case "here":
      // Check if @here is allowed in this channel
      if (!channelSettings.allowHere) {
        return false;
      }
      // In DMs, @here is always allowed
      if (isDirectMessage) {
        return true;
      }
      // Check role requirement
      return roleAtLeast(effectiveRole, channelSettings.hereMinRole);

    case "role":
      // Role mentions require moderator or higher by default
      return isModerator(effectiveRole);

    default:
      return false;
  }
}

/**
 * Get all mention permissions for a user in a context
 */
export function getMentionPermissions(
  context: PermissionContext,
): MentionPermissions {
  return {
    canMentionUsers: canUseMention("user", context),
    canMentionChannels: canUseMention("channel", context),
    canMentionEveryone: canUseMention("everyone", context),
    canMentionHere: canUseMention("here", context),
    canMentionChannel: canUseMention("channel", context),
    canMentionRoles: canUseMention("role", context),
  };
}

/**
 * Check if user can use any group mention
 */
export function canUseAnyGroupMention(context: PermissionContext): boolean {
  return canUseMention("everyone", context) || canUseMention("here", context);
}

// ============================================================================
// Channel Settings Helpers
// ============================================================================

/**
 * Merge channel settings with defaults
 */
export function mergeChannelSettings(
  settings?: Partial<ChannelMentionSettings>,
): ChannelMentionSettings {
  return {
    ...DEFAULT_CHANNEL_MENTION_SETTINGS,
    ...settings,
  };
}

/**
 * Check if channel allows any group mentions
 */
export function channelAllowsGroupMentions(
  settings: ChannelMentionSettings = DEFAULT_CHANNEL_MENTION_SETTINGS,
): boolean {
  return settings.allowEveryone || settings.allowHere || settings.allowChannel;
}

/**
 * Get the minimum role needed for any group mention in a channel
 */
export function getMinRoleForGroupMentions(
  settings: ChannelMentionSettings = DEFAULT_CHANNEL_MENTION_SETTINGS,
): UserRole {
  const roles: UserRole[] = [];

  if (settings.allowEveryone) {
    roles.push(settings.everyoneMinRole);
  }
  if (settings.allowHere) {
    roles.push(settings.hereMinRole);
  }
  if (settings.allowChannel) {
    roles.push(settings.channelMinRole);
  }

  if (roles.length === 0) {
    return "owner"; // No group mentions allowed
  }

  // Return the lowest required role (most permissive)
  return roles.reduce((lowest, role) =>
    ROLE_HIERARCHY[role] < ROLE_HIERARCHY[lowest] ? role : lowest,
  );
}

// ============================================================================
// Permission Validation
// ============================================================================

/**
 * Validate mentions before sending a message
 */
export interface MentionValidationResult {
  valid: boolean;
  errors: MentionValidationError[];
  warnings: MentionValidationWarning[];
}

export interface MentionValidationError {
  type: MentionType;
  message: string;
  identifier: string;
}

export interface MentionValidationWarning {
  type: MentionType;
  message: string;
  identifier: string;
}

/**
 * Validate that user can use the mentions in their message
 */
export function validateMentions(
  mentionTypes: Array<{ type: MentionType; identifier: string }>,
  context: PermissionContext,
): MentionValidationResult {
  const errors: MentionValidationError[] = [];
  const warnings: MentionValidationWarning[] = [];

  for (const { type, identifier } of mentionTypes) {
    if (!canUseMention(type, context)) {
      if (type === "everyone") {
        errors.push({
          type,
          identifier,
          message:
            "You do not have permission to use @everyone in this channel",
        });
      } else if (type === "here") {
        errors.push({
          type,
          identifier,
          message: "You do not have permission to use @here in this channel",
        });
      } else if (type === "role") {
        errors.push({
          type,
          identifier,
          message: `You do not have permission to mention @${identifier}`,
        });
      }
    }
  }

  // Add warnings for large group mentions
  const everyoneMention = mentionTypes.find((m) => m.type === "everyone");
  if (everyoneMention && !errors.some((e) => e.type === "everyone")) {
    warnings.push({
      type: "everyone",
      identifier: "everyone",
      message: "This will notify all members in the workspace",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitState {
  count: number;
  windowStart: number;
}

const mentionRateLimits = new Map<string, RateLimitState>();

/**
 * Rate limit configuration for group mentions
 */
export const GROUP_MENTION_RATE_LIMIT = {
  maxMentions: 5, // Max group mentions
  windowMs: 60 * 1000, // Per minute
};

/**
 * Check if a user is rate limited for group mentions
 */
export function isRateLimitedForGroupMentions(userId: string): boolean {
  const now = Date.now();
  const state = mentionRateLimits.get(userId);

  if (!state) {
    return false;
  }

  // Reset if window has passed
  if (now - state.windowStart > GROUP_MENTION_RATE_LIMIT.windowMs) {
    mentionRateLimits.delete(userId);
    return false;
  }

  return state.count >= GROUP_MENTION_RATE_LIMIT.maxMentions;
}

/**
 * Record a group mention for rate limiting
 */
export function recordGroupMention(userId: string): void {
  const now = Date.now();
  const state = mentionRateLimits.get(userId);

  if (!state || now - state.windowStart > GROUP_MENTION_RATE_LIMIT.windowMs) {
    mentionRateLimits.set(userId, { count: 1, windowStart: now });
  } else {
    state.count++;
  }
}

/**
 * Get remaining group mentions for a user
 */
export function getRemainingGroupMentions(userId: string): number {
  const now = Date.now();
  const state = mentionRateLimits.get(userId);

  if (!state || now - state.windowStart > GROUP_MENTION_RATE_LIMIT.windowMs) {
    return GROUP_MENTION_RATE_LIMIT.maxMentions;
  }

  return Math.max(0, GROUP_MENTION_RATE_LIMIT.maxMentions - state.count);
}

// ============================================================================
// Permission Display Helpers
// ============================================================================

/**
 * Get human-readable permission message
 */
export function getPermissionMessage(
  mentionType: MentionType,
  allowed: boolean,
  context: PermissionContext,
): string {
  const { channelSettings = DEFAULT_CHANNEL_MENTION_SETTINGS } = context;

  if (allowed) {
    return `You can use @${mentionType} in this channel`;
  }

  switch (mentionType) {
    case "everyone":
      if (!channelSettings.allowEveryone) {
        return "@everyone is disabled in this channel";
      }
      return `Only ${channelSettings.everyoneMinRole}s and above can use @everyone`;

    case "here":
      if (!channelSettings.allowHere) {
        return "@here is disabled in this channel";
      }
      return `Only ${channelSettings.hereMinRole}s and above can use @here`;

    case "role":
      return "Only moderators and above can mention roles";

    default:
      return `You cannot use @${mentionType} in this channel`;
  }
}

/**
 * Get tooltip content for mention permission
 */
export function getMentionPermissionTooltip(
  mentionType: MentionType,
  context: PermissionContext,
): string {
  const allowed = canUseMention(mentionType, context);
  return getPermissionMessage(mentionType, allowed, context);
}

// ============================================================================
// Platform-Specific Permission Rules
// ============================================================================

/**
 * Platform type for mention permission rules
 */
export type PlatformType =
  | "default"
  | "whatsapp"
  | "telegram"
  | "slack"
  | "discord";

/**
 * Platform-specific mention rules configuration
 */
export interface PlatformMentionRules {
  /** Who can use @everyone in this platform */
  everyoneAllowedRoles: UserRole[];
  /** Who can use @here in this platform */
  hereAllowedRoles: UserRole[];
  /** Who can use @channel in this platform */
  channelAllowedRoles: UserRole[];
  /** Who can use @role mentions */
  roleAllowedRoles: UserRole[];
  /** Maximum mentions per message */
  maxMentionsPerMessage: number;
  /** Cooldown between group mentions (ms) */
  groupMentionCooldownMs: number;
  /** Whether @everyone/@here is even supported */
  supportsGroupMentions: boolean;
  /** Whether role mentions are supported */
  supportsRoleMentions: boolean;
  /** Description for the platform rules */
  description: string;
}

/**
 * Platform-specific mention rules
 * Based on real-world platform behaviors:
 * - WhatsApp: Anyone in group can mention
 * - Telegram: Admins for @everyone
 * - Slack: Channel-level controls
 * - Discord: Role-based permissions
 */
export const PLATFORM_MENTION_RULES: Record<
  PlatformType,
  PlatformMentionRules
> = {
  default: {
    everyoneAllowedRoles: ["admin", "owner"],
    hereAllowedRoles: ["moderator", "admin", "owner"],
    channelAllowedRoles: ["moderator", "admin", "owner"],
    roleAllowedRoles: ["moderator", "admin", "owner"],
    maxMentionsPerMessage: 25,
    groupMentionCooldownMs: 60 * 1000, // 1 minute
    supportsGroupMentions: true,
    supportsRoleMentions: true,
    description:
      "Default platform rules with configurable per-channel controls",
  },
  whatsapp: {
    everyoneAllowedRoles: ["member", "moderator", "admin", "owner"], // Anyone in group
    hereAllowedRoles: ["member", "moderator", "admin", "owner"],
    channelAllowedRoles: ["member", "moderator", "admin", "owner"],
    roleAllowedRoles: [], // WhatsApp doesn't have roles
    maxMentionsPerMessage: 256, // WhatsApp broadcast limit
    groupMentionCooldownMs: 0, // No cooldown
    supportsGroupMentions: true,
    supportsRoleMentions: false,
    description: "WhatsApp-style: Any group member can mention anyone",
  },
  telegram: {
    everyoneAllowedRoles: ["admin", "owner"], // Only admins can ping everyone
    hereAllowedRoles: ["admin", "owner"],
    channelAllowedRoles: ["admin", "owner"],
    roleAllowedRoles: [], // Telegram doesn't have role mentions
    maxMentionsPerMessage: 50,
    groupMentionCooldownMs: 30 * 1000, // 30 seconds
    supportsGroupMentions: true,
    supportsRoleMentions: false,
    description:
      "Telegram-style: Admins only for group mentions, users can mention individuals",
  },
  slack: {
    everyoneAllowedRoles: ["admin", "owner"], // Workspace admins by default
    hereAllowedRoles: ["member", "moderator", "admin", "owner"], // Channel members
    channelAllowedRoles: ["member", "moderator", "admin", "owner"],
    roleAllowedRoles: ["member", "moderator", "admin", "owner"], // User groups
    maxMentionsPerMessage: 100,
    groupMentionCooldownMs: 60 * 1000, // 1 minute
    supportsGroupMentions: true,
    supportsRoleMentions: true,
    description:
      "Slack-style: Channel-level controls, @here allowed for members",
  },
  discord: {
    everyoneAllowedRoles: ["admin", "owner"], // MENTION_EVERYONE permission
    hereAllowedRoles: ["admin", "owner"],
    channelAllowedRoles: ["moderator", "admin", "owner"],
    roleAllowedRoles: ["member", "moderator", "admin", "owner"], // Based on role mentionable setting
    maxMentionsPerMessage: 100,
    groupMentionCooldownMs: 5 * 60 * 1000, // 5 minutes for anti-spam
    supportsGroupMentions: true,
    supportsRoleMentions: true,
    description:
      "Discord-style: Role-based permissions, @everyone requires specific permission",
  },
};

/**
 * Get platform-specific mention rules
 */
export function getPlatformMentionRules(
  platform: PlatformType,
): PlatformMentionRules {
  return PLATFORM_MENTION_RULES[platform] || PLATFORM_MENTION_RULES.default;
}

/**
 * Check if a user can use a mention type based on platform rules
 */
export function canUseMentionOnPlatform(
  mentionType: MentionType,
  userRole: UserRole,
  platform: PlatformType,
): boolean {
  const rules = getPlatformMentionRules(platform);

  switch (mentionType) {
    case "user":
      return true; // Always allowed for user mentions

    case "channel":
      return true; // Channel links always allowed

    case "everyone":
      if (!rules.supportsGroupMentions) return false;
      return rules.everyoneAllowedRoles.includes(userRole);

    case "here":
      if (!rules.supportsGroupMentions) return false;
      return rules.hereAllowedRoles.includes(userRole);

    case "role":
      if (!rules.supportsRoleMentions) return false;
      return rules.roleAllowedRoles.includes(userRole);

    default:
      return false;
  }
}

/**
 * Get all mention permissions for a user on a specific platform
 */
export function getPlatformMentionPermissions(
  userRole: UserRole,
  platform: PlatformType,
): MentionPermissions {
  return {
    canMentionUsers: canUseMentionOnPlatform("user", userRole, platform),
    canMentionChannels: canUseMentionOnPlatform("channel", userRole, platform),
    canMentionEveryone: canUseMentionOnPlatform("everyone", userRole, platform),
    canMentionHere: canUseMentionOnPlatform("here", userRole, platform),
    canMentionChannel: canUseMentionOnPlatform("channel", userRole, platform),
    canMentionRoles: canUseMentionOnPlatform("role", userRole, platform),
  };
}

/**
 * Validate mentions count against platform limits
 */
export function validateMentionCount(
  mentionCount: number,
  platform: PlatformType,
): { valid: boolean; maxAllowed: number; message?: string } {
  const rules = getPlatformMentionRules(platform);

  if (mentionCount > rules.maxMentionsPerMessage) {
    return {
      valid: false,
      maxAllowed: rules.maxMentionsPerMessage,
      message: `Maximum ${rules.maxMentionsPerMessage} mentions allowed per message`,
    };
  }

  return { valid: true, maxAllowed: rules.maxMentionsPerMessage };
}

// ============================================================================
// Notification Fanout Controls
// ============================================================================

/**
 * User notification preferences for fanout control
 */
export interface UserNotificationStatus {
  userId: string;
  isDND: boolean; // Do Not Disturb
  isMuted: boolean;
  mutedUntil?: Date;
  isOnline: boolean;
  lastSeenAt?: Date;
  allowMentionNotifications: boolean;
  allowGroupMentionNotifications: boolean;
}

/**
 * Fanout result for a mention
 */
export interface MentionFanoutResult {
  /** Users who should receive notifications */
  notifyUsers: string[];
  /** Users skipped due to DND */
  skippedDND: string[];
  /** Users skipped due to mute */
  skippedMuted: string[];
  /** Users skipped due to preferences */
  skippedPreferences: string[];
  /** Total potential recipients */
  totalRecipients: number;
  /** Was rate limited? */
  rateLimited: boolean;
  /** Rate limit message if applicable */
  rateLimitMessage?: string;
}

/**
 * Fanout options
 */
export interface FanoutOptions {
  /** Respect DND status */
  respectDND: boolean;
  /** Respect mute settings */
  respectMute: boolean;
  /** Respect user preferences */
  respectPreferences: boolean;
  /** Maximum notifications to send (for @everyone/@here) */
  maxNotifications?: number;
  /** Whether this is a high-priority mention (override DND) */
  highPriority: boolean;
}

/**
 * Default fanout options
 */
export const DEFAULT_FANOUT_OPTIONS: FanoutOptions = {
  respectDND: true,
  respectMute: true,
  respectPreferences: true,
  maxNotifications: 1000,
  highPriority: false,
};

/**
 * Calculate notification fanout for a mention
 */
export function calculateMentionFanout(
  mentionType: MentionType,
  potentialRecipients: UserNotificationStatus[],
  senderId: string,
  options: FanoutOptions = DEFAULT_FANOUT_OPTIONS,
): MentionFanoutResult {
  const notifyUsers: string[] = [];
  const skippedDND: string[] = [];
  const skippedMuted: string[] = [];
  const skippedPreferences: string[] = [];

  // Don't notify the sender
  const recipients = potentialRecipients.filter((r) => r.userId !== senderId);

  for (const recipient of recipients) {
    // Check max notifications limit
    if (
      options.maxNotifications &&
      notifyUsers.length >= options.maxNotifications
    ) {
      break;
    }

    // Check DND (unless high priority)
    if (options.respectDND && recipient.isDND && !options.highPriority) {
      skippedDND.push(recipient.userId);
      continue;
    }

    // Check mute status
    if (options.respectMute && recipient.isMuted) {
      if (recipient.mutedUntil && new Date() < recipient.mutedUntil) {
        skippedMuted.push(recipient.userId);
        continue;
      }
    }

    // Check user preferences
    if (options.respectPreferences) {
      if (!recipient.allowMentionNotifications) {
        skippedPreferences.push(recipient.userId);
        continue;
      }

      // For group mentions, check group mention preferences
      if (
        (mentionType === "everyone" ||
          mentionType === "here" ||
          mentionType === "channel") &&
        !recipient.allowGroupMentionNotifications
      ) {
        skippedPreferences.push(recipient.userId);
        continue;
      }
    }

    // For @here, only notify online users
    if (mentionType === "here" && !recipient.isOnline) {
      continue;
    }

    notifyUsers.push(recipient.userId);
  }

  return {
    notifyUsers,
    skippedDND,
    skippedMuted,
    skippedPreferences,
    totalRecipients: recipients.length,
    rateLimited: false,
  };
}

// ============================================================================
// Anti-Abuse Measures
// ============================================================================

/**
 * Anti-abuse configuration
 */
export interface AntiAbuseConfig {
  /** Maximum @everyone/@here per hour per user */
  maxGroupMentionsPerHour: number;
  /** Maximum individual mentions per message */
  maxMentionsPerMessage: number;
  /** Cooldown between @everyone uses (ms) */
  everyoneCooldownMs: number;
  /** Cooldown between @here uses (ms) */
  hereCooldownMs: number;
  /** Minimum account age to use @everyone (ms) */
  minAccountAgeForEveryone: number;
  /** Minimum messages sent before @everyone allowed */
  minMessagesForEveryone: number;
  /** Enable spam detection for repeated mentions */
  enableSpamDetection: boolean;
  /** Spam threshold (same mention within window) */
  spamThreshold: number;
  /** Spam detection window (ms) */
  spamWindowMs: number;
}

/**
 * Default anti-abuse configuration
 */
export const DEFAULT_ANTI_ABUSE_CONFIG: AntiAbuseConfig = {
  maxGroupMentionsPerHour: 5,
  maxMentionsPerMessage: 25,
  everyoneCooldownMs: 5 * 60 * 1000, // 5 minutes
  hereCooldownMs: 60 * 1000, // 1 minute
  minAccountAgeForEveryone: 24 * 60 * 60 * 1000, // 24 hours
  minMessagesForEveryone: 10,
  enableSpamDetection: true,
  spamThreshold: 3,
  spamWindowMs: 60 * 1000, // 1 minute
};

/**
 * User mention history for anti-abuse
 */
interface UserMentionHistory {
  everyoneMentions: number[];
  hereMentions: number[];
  recentMentions: Array<{ type: MentionType; timestamp: number }>;
}

const userMentionHistories = new Map<string, UserMentionHistory>();

/**
 * Get or create user mention history
 */
function getUserMentionHistory(userId: string): UserMentionHistory {
  if (!userMentionHistories.has(userId)) {
    userMentionHistories.set(userId, {
      everyoneMentions: [],
      hereMentions: [],
      recentMentions: [],
    });
  }
  return userMentionHistories.get(userId)!;
}

/**
 * Clean up old entries from mention history
 */
function cleanupMentionHistory(
  history: UserMentionHistory,
  windowMs: number,
): void {
  const now = Date.now();
  history.everyoneMentions = history.everyoneMentions.filter(
    (t) => now - t < windowMs,
  );
  history.hereMentions = history.hereMentions.filter((t) => now - t < windowMs);
  history.recentMentions = history.recentMentions.filter(
    (m) => now - m.timestamp < windowMs,
  );
}

/**
 * Anti-abuse check result
 */
export interface AntiAbuseCheckResult {
  allowed: boolean;
  reason?: string;
  cooldownRemainingMs?: number;
  suggestedAction?: "wait" | "reduce_mentions" | "use_direct_mention";
}

/**
 * Check if a mention passes anti-abuse rules
 */
export function checkAntiAbuse(
  userId: string,
  mentionType: MentionType,
  mentionCount: number,
  userAccountAge: number,
  userMessageCount: number,
  config: AntiAbuseConfig = DEFAULT_ANTI_ABUSE_CONFIG,
): AntiAbuseCheckResult {
  const now = Date.now();
  const history = getUserMentionHistory(userId);

  // Clean up old entries
  cleanupMentionHistory(history, 60 * 60 * 1000); // 1 hour window

  // Check mention count per message
  if (mentionCount > config.maxMentionsPerMessage) {
    return {
      allowed: false,
      reason: `Maximum ${config.maxMentionsPerMessage} mentions per message`,
      suggestedAction: "reduce_mentions",
    };
  }

  // Special checks for @everyone
  if (mentionType === "everyone") {
    // Check account age
    if (userAccountAge < config.minAccountAgeForEveryone) {
      const remainingMs = config.minAccountAgeForEveryone - userAccountAge;
      return {
        allowed: false,
        reason: "Account too new to use @everyone",
        cooldownRemainingMs: remainingMs,
        suggestedAction: "wait",
      };
    }

    // Check message count
    if (userMessageCount < config.minMessagesForEveryone) {
      return {
        allowed: false,
        reason: `Send at least ${config.minMessagesForEveryone} messages before using @everyone`,
        suggestedAction: "use_direct_mention",
      };
    }

    // Check hourly limit
    if (history.everyoneMentions.length >= config.maxGroupMentionsPerHour) {
      const oldestMention = Math.min(...history.everyoneMentions);
      const cooldownRemainingMs = 60 * 60 * 1000 - (now - oldestMention);
      return {
        allowed: false,
        reason: "Hourly @everyone limit reached",
        cooldownRemainingMs,
        suggestedAction: "wait",
      };
    }

    // Check cooldown
    const lastEveryoneMention = Math.max(...history.everyoneMentions, 0);
    if (
      lastEveryoneMention > 0 &&
      now - lastEveryoneMention < config.everyoneCooldownMs
    ) {
      return {
        allowed: false,
        reason: "Please wait before using @everyone again",
        cooldownRemainingMs:
          config.everyoneCooldownMs - (now - lastEveryoneMention),
        suggestedAction: "wait",
      };
    }
  }

  // Special checks for @here
  if (mentionType === "here") {
    // Check hourly limit
    if (history.hereMentions.length >= config.maxGroupMentionsPerHour) {
      const oldestMention = Math.min(...history.hereMentions);
      const cooldownRemainingMs = 60 * 60 * 1000 - (now - oldestMention);
      return {
        allowed: false,
        reason: "Hourly @here limit reached",
        cooldownRemainingMs,
        suggestedAction: "wait",
      };
    }

    // Check cooldown
    const lastHereMention = Math.max(...history.hereMentions, 0);
    if (lastHereMention > 0 && now - lastHereMention < config.hereCooldownMs) {
      return {
        allowed: false,
        reason: "Please wait before using @here again",
        cooldownRemainingMs: config.hereCooldownMs - (now - lastHereMention),
        suggestedAction: "wait",
      };
    }
  }

  // Spam detection
  if (config.enableSpamDetection) {
    const recentSameMentions = history.recentMentions.filter(
      (m) => m.type === mentionType && now - m.timestamp < config.spamWindowMs,
    );

    if (recentSameMentions.length >= config.spamThreshold) {
      return {
        allowed: false,
        reason: "Too many mentions in a short time. Please slow down.",
        suggestedAction: "wait",
        cooldownRemainingMs: config.spamWindowMs,
      };
    }
  }

  return { allowed: true };
}

/**
 * Record a mention for anti-abuse tracking
 */
export function recordMention(userId: string, mentionType: MentionType): void {
  const now = Date.now();
  const history = getUserMentionHistory(userId);

  if (mentionType === "everyone") {
    history.everyoneMentions.push(now);
  } else if (mentionType === "here") {
    history.hereMentions.push(now);
  }

  history.recentMentions.push({ type: mentionType, timestamp: now });

  // Clean up to prevent memory leak
  cleanupMentionHistory(history, 60 * 60 * 1000);
}

/**
 * Reset anti-abuse tracking for a user (admin action)
 */
export function resetAntiAbuseTracking(userId: string): void {
  userMentionHistories.delete(userId);
}

/**
 * Clear all anti-abuse tracking (for testing)
 */
export function clearAllAntiAbuseTracking(): void {
  userMentionHistories.clear();
}

/**
 * Admin override for anti-abuse (bypass all checks)
 */
export function adminCanBypassAntiAbuse(userRole: UserRole): boolean {
  return userRole === "owner" || userRole === "admin";
}
