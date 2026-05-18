/**
 * Platform-Specific Reaction Configuration
 *
 * Implements reaction behavior parity across different messaging platforms:
 * - WhatsApp: Single reaction per user (tap to change)
 * - Telegram: Multiple reactions per user
 * - Signal: Single reaction with limited emoji set
 * - Slack: Multiple reactions with custom emoji support
 * - Discord: Multiple reactions with animated emoji support
 */

import type { TemplateId } from "@/templates/types";

// ============================================================================
// Reaction Mode Types
// ============================================================================

/**
 * Reaction mode determines how users can react to messages
 */
export type ReactionMode = "single" | "multiple";

/**
 * Emoji set restrictions for platforms like Signal
 */
export type EmojiSetType = "full" | "limited" | "custom";

/**
 * Animation support level
 */
export type AnimationSupport = "none" | "static" | "animated";

/**
 * Reaction display style
 */
export type ReactionDisplayStyle = "inline" | "floating" | "hover" | "bar";

// ============================================================================
// Platform Reaction Configuration
// ============================================================================

/**
 * Complete reaction configuration for a platform
 */
export interface PlatformReactionConfig {
  /** Platform identifier */
  platform: TemplateId;

  /** How reactions work - single (replace) or multiple per user */
  mode: ReactionMode;

  /** Emoji set restrictions */
  emojiSet: EmojiSetType;

  /** Quick reactions shown in the reaction picker */
  quickReactions: string[];

  /** Limited emoji set (if emojiSet is 'limited') */
  allowedEmojis?: string[];

  /** Support for custom workspace emojis */
  customEmojis: boolean;

  /** Support for animated emojis */
  animationSupport: AnimationSupport;

  /** Maximum reactions per message (0 = unlimited) */
  maxReactionsPerMessage: number;

  /** Maximum reactions per user per message (only relevant for 'multiple' mode) */
  maxReactionsPerUser: number;

  /** Display style for reactions */
  displayStyle: ReactionDisplayStyle;

  /** Show reaction count */
  showCount: boolean;

  /** Show who reacted (on hover/tap) */
  showReactors: boolean;

  /** Maximum reactors to display in tooltip */
  maxReactorsDisplay: number;

  /** Allow anonymous reactions */
  anonymousReactions: boolean;

  /** Reaction cooldown in milliseconds (anti-spam) */
  cooldownMs: number;

  /** Skin tone support */
  skinToneSupport: boolean;

  /** Show skin tone selector */
  showSkinTonePicker: boolean;

  /** Enable reaction sounds */
  reactionSounds: boolean;

  /** Enable reaction animations on add */
  animateOnAdd: boolean;

  /** Features specific to this platform */
  features: {
    /** Double-tap to react with default emoji */
    doubleTapReact: boolean;
    /** Long-press to open reaction picker */
    longPressReact: boolean;
    /** Swipe to react */
    swipeToReact: boolean;
    /** Show reaction bar on hover */
    hoverReactionBar: boolean;
    /** Allow reaction on own messages */
    reactToOwnMessages: boolean;
    /** Show "Add reaction" button */
    showAddButton: boolean;
  };
}

// ============================================================================
// Platform-Specific Configurations
// ============================================================================

/**
 * Default/nchat platform configuration
 */
export const defaultReactionConfig: PlatformReactionConfig = {
  platform: "default",
  mode: "multiple",
  emojiSet: "full",
  quickReactions: ["👍", "❤️", "😂", "🎉", "🤔", "👀"],
  customEmojis: true,
  animationSupport: "animated",
  maxReactionsPerMessage: 20,
  maxReactionsPerUser: 10,
  displayStyle: "inline",
  showCount: true,
  showReactors: true,
  maxReactorsDisplay: 10,
  anonymousReactions: false,
  cooldownMs: 0,
  skinToneSupport: true,
  showSkinTonePicker: true,
  reactionSounds: true,
  animateOnAdd: true,
  features: {
    doubleTapReact: true,
    longPressReact: true,
    swipeToReact: false,
    hoverReactionBar: true,
    reactToOwnMessages: true,
    showAddButton: true,
  },
};

/**
 * WhatsApp-style reaction configuration
 * - Single reaction per user (tap to change)
 * - Limited quick reactions
 * - Double-tap to like
 */
export const whatsappReactionConfig: PlatformReactionConfig = {
  platform: "whatsapp",
  mode: "single",
  emojiSet: "full",
  quickReactions: ["👍", "❤️", "😂", "😮", "😢", "🙏"],
  customEmojis: false,
  animationSupport: "static",
  maxReactionsPerMessage: 0, // Unlimited unique emojis
  maxReactionsPerUser: 1, // Single reaction per user
  displayStyle: "inline",
  showCount: true,
  showReactors: true,
  maxReactorsDisplay: 20,
  anonymousReactions: false,
  cooldownMs: 500,
  skinToneSupport: true,
  showSkinTonePicker: false,
  reactionSounds: false,
  animateOnAdd: true,
  features: {
    doubleTapReact: true,
    longPressReact: true,
    swipeToReact: false,
    hoverReactionBar: false,
    reactToOwnMessages: true,
    showAddButton: true,
  },
};

/**
 * Telegram-style reaction configuration
 * - Multiple reactions per user
 * - Custom reactions with premium
 * - Animated reactions
 */
export const telegramReactionConfig: PlatformReactionConfig = {
  platform: "telegram",
  mode: "multiple",
  emojiSet: "full",
  quickReactions: ["👍", "❤️", "🔥", "🎉", "😢", "👎", "🤔"],
  customEmojis: true, // Premium feature
  animationSupport: "animated",
  maxReactionsPerMessage: 0,
  maxReactionsPerUser: 3,
  displayStyle: "inline",
  showCount: true,
  showReactors: true,
  maxReactorsDisplay: 50,
  anonymousReactions: false,
  cooldownMs: 0,
  skinToneSupport: false,
  showSkinTonePicker: false,
  reactionSounds: true,
  animateOnAdd: true,
  features: {
    doubleTapReact: true,
    longPressReact: true,
    swipeToReact: false,
    hoverReactionBar: false,
    reactToOwnMessages: true,
    showAddButton: true,
  },
};

/**
 * Signal-style reaction configuration
 * - Single reaction per user
 * - Limited emoji set (7 emojis)
 * - Privacy-focused
 */
export const signalReactionConfig: PlatformReactionConfig = {
  platform: "default", // Signal uses default template as base
  mode: "single",
  emojiSet: "limited",
  quickReactions: ["❤️", "👍", "👎", "😂", "😮", "😢", "😡"],
  allowedEmojis: ["❤️", "👍", "👎", "😂", "😮", "😢", "😡"],
  customEmojis: false,
  animationSupport: "none",
  maxReactionsPerMessage: 7, // Only 7 possible reactions
  maxReactionsPerUser: 1,
  displayStyle: "inline",
  showCount: true,
  showReactors: true,
  maxReactorsDisplay: 5,
  anonymousReactions: false,
  cooldownMs: 0,
  skinToneSupport: false,
  showSkinTonePicker: false,
  reactionSounds: false,
  animateOnAdd: false,
  features: {
    doubleTapReact: true,
    longPressReact: true,
    swipeToReact: false,
    hoverReactionBar: false,
    reactToOwnMessages: true,
    showAddButton: true,
  },
};

/**
 * Slack-style reaction configuration
 * - Multiple reactions per user
 * - Custom workspace emojis
 * - Reaction bar on hover
 */
export const slackReactionConfig: PlatformReactionConfig = {
  platform: "slack",
  mode: "multiple",
  emojiSet: "full",
  quickReactions: ["👍", "✅", "👀", "🎉", "❤️", "😂"],
  customEmojis: true,
  animationSupport: "animated",
  maxReactionsPerMessage: 23, // Slack's actual limit
  maxReactionsPerUser: 23,
  displayStyle: "hover",
  showCount: true,
  showReactors: true,
  maxReactorsDisplay: 50,
  anonymousReactions: false,
  cooldownMs: 0,
  skinToneSupport: true,
  showSkinTonePicker: true,
  reactionSounds: false,
  animateOnAdd: false,
  features: {
    doubleTapReact: false,
    longPressReact: false,
    swipeToReact: false,
    hoverReactionBar: true,
    reactToOwnMessages: true,
    showAddButton: true,
  },
};

/**
 * Discord-style reaction configuration
 * - Multiple reactions per user
 * - Animated emojis (Nitro)
 * - Custom server emojis
 */
export const discordReactionConfig: PlatformReactionConfig = {
  platform: "discord",
  mode: "multiple",
  emojiSet: "full",
  quickReactions: ["👍", "❤️", "😂", "😮", "😢", "😡"],
  customEmojis: true,
  animationSupport: "animated",
  maxReactionsPerMessage: 20,
  maxReactionsPerUser: 20,
  displayStyle: "hover",
  showCount: true,
  showReactors: true,
  maxReactorsDisplay: 100,
  anonymousReactions: false,
  cooldownMs: 250, // Discord has a slight cooldown
  skinToneSupport: true,
  showSkinTonePicker: true,
  reactionSounds: false,
  animateOnAdd: true,
  features: {
    doubleTapReact: false,
    longPressReact: true,
    swipeToReact: false,
    hoverReactionBar: true,
    reactToOwnMessages: true,
    showAddButton: true,
  },
};

// ============================================================================
// Configuration Registry
// ============================================================================

/**
 * Map of platform IDs to their reaction configurations
 */
export const platformReactionConfigs: Record<
  TemplateId,
  PlatformReactionConfig
> = {
  default: defaultReactionConfig,
  whatsapp: whatsappReactionConfig,
  telegram: telegramReactionConfig,
  slack: slackReactionConfig,
  discord: discordReactionConfig,
};

/**
 * Get reaction configuration for a platform
 */
export function getReactionConfig(
  platform: TemplateId,
): PlatformReactionConfig {
  return platformReactionConfigs[platform] || defaultReactionConfig;
}

/**
 * Merge custom config with platform defaults
 */
export function createCustomReactionConfig(
  platform: TemplateId,
  overrides: Partial<PlatformReactionConfig>,
): PlatformReactionConfig {
  const baseConfig = getReactionConfig(platform);
  return {
    ...baseConfig,
    ...overrides,
    features: {
      ...baseConfig.features,
      ...(overrides.features || {}),
    },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a user can add a reaction based on platform config
 */
export interface CanReactResult {
  allowed: boolean;
  reason?: string;
  shouldReplace?: boolean; // For single-mode platforms
  existingEmoji?: string; // The emoji that would be replaced
}

/**
 * Check if a user can add a reaction
 */
export function canUserReact(
  config: PlatformReactionConfig,
  userReactions: string[], // Emojis the user has already reacted with
  targetEmoji: string,
  totalReactionCount: number,
): CanReactResult {
  // Check if emoji is allowed (for limited sets)
  if (config.emojiSet === "limited" && config.allowedEmojis) {
    if (!config.allowedEmojis.includes(targetEmoji)) {
      return {
        allowed: false,
        reason: "This emoji is not available for reactions",
      };
    }
  }

  // Check message reaction limit
  if (
    config.maxReactionsPerMessage > 0 &&
    totalReactionCount >= config.maxReactionsPerMessage
  ) {
    // Allow if user is replacing their reaction
    if (config.mode === "single" && userReactions.length > 0) {
      return {
        allowed: true,
        shouldReplace: true,
        existingEmoji: userReactions[0],
      };
    }
    return {
      allowed: false,
      reason: `Maximum ${config.maxReactionsPerMessage} reactions per message`,
    };
  }

  // Single reaction mode
  if (config.mode === "single") {
    if (userReactions.length > 0 && !userReactions.includes(targetEmoji)) {
      return {
        allowed: true,
        shouldReplace: true,
        existingEmoji: userReactions[0],
      };
    }
    // Toggle off if same emoji
    if (userReactions.includes(targetEmoji)) {
      return { allowed: true };
    }
  }

  // Multiple reaction mode
  if (config.mode === "multiple") {
    // Already reacted with this emoji - will toggle off
    if (userReactions.includes(targetEmoji)) {
      return { allowed: true };
    }

    // Check user limit
    if (
      config.maxReactionsPerUser > 0 &&
      userReactions.length >= config.maxReactionsPerUser
    ) {
      return {
        allowed: false,
        reason: `Maximum ${config.maxReactionsPerUser} reactions per message`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if custom emojis are allowed
 */
export function canUseCustomEmoji(config: PlatformReactionConfig): boolean {
  return config.customEmojis;
}

/**
 * Check if animated emojis are supported
 */
export function supportsAnimatedEmoji(config: PlatformReactionConfig): boolean {
  return config.animationSupport === "animated";
}

// ============================================================================
// Aggregate Rendering Helpers
// ============================================================================

/**
 * Reaction aggregate for display
 */
export interface ReactionAggregate {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
  isAnimated?: boolean;
  isCustom?: boolean;
  customEmojiUrl?: string;
}

/**
 * Options for rendering reactions
 */
export interface RenderReactionsOptions {
  /** Maximum reactions to display before collapsing */
  maxDisplay?: number;
  /** Sort order */
  sortBy?: "count" | "recent";
  /** Show "+X more" indicator */
  showOverflow?: boolean;
  /** Group same emojis together */
  groupByEmoji?: boolean;
}

/**
 * Get display options based on platform config
 */
export function getDisplayOptions(
  config: PlatformReactionConfig,
): RenderReactionsOptions {
  return {
    maxDisplay: config.maxReactorsDisplay,
    sortBy: "count",
    showOverflow: true,
    groupByEmoji: true,
  };
}

/**
 * Sort reactions based on platform preferences
 */
export function sortReactions(
  reactions: ReactionAggregate[],
  options: RenderReactionsOptions,
): ReactionAggregate[] {
  const sorted = [...reactions];

  if (options.sortBy === "count") {
    sorted.sort((a, b) => b.count - a.count);
  }

  if (options.maxDisplay && sorted.length > options.maxDisplay) {
    return sorted.slice(0, options.maxDisplay);
  }

  return sorted;
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Channel-level reaction permissions
 */
export interface ChannelReactionPermissions {
  /** Reactions enabled for this channel */
  enabled: boolean;
  /** Restrict to specific emoji set */
  restrictedEmojis?: string[];
  /** Only moderators can react */
  moderatorOnly: boolean;
  /** Only channel members can react */
  membersOnly: boolean;
  /** Cooldown override (in milliseconds) */
  cooldownOverride?: number;
  /** Anonymous reactions allowed */
  anonymousAllowed: boolean;
}

/**
 * Default channel permissions
 */
export const defaultChannelPermissions: ChannelReactionPermissions = {
  enabled: true,
  moderatorOnly: false,
  membersOnly: false,
  anonymousAllowed: false,
};

/**
 * Check if reactions are allowed in a channel
 */
export function areReactionsAllowed(
  permissions: ChannelReactionPermissions,
  userRole: "guest" | "member" | "moderator" | "admin" | "owner",
): boolean {
  if (!permissions.enabled) {
    return false;
  }

  if (permissions.moderatorOnly) {
    return ["moderator", "admin", "owner"].includes(userRole);
  }

  if (permissions.membersOnly) {
    return userRole !== "guest";
  }

  return true;
}

/**
 * Check if a specific emoji is allowed in a channel
 */
export function isEmojiAllowed(
  permissions: ChannelReactionPermissions,
  emoji: string,
): boolean {
  if (!permissions.enabled) {
    return false;
  }

  if (permissions.restrictedEmojis && permissions.restrictedEmojis.length > 0) {
    return permissions.restrictedEmojis.includes(emoji);
  }

  return true;
}
