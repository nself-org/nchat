/**
 * Reactions Module
 *
 * Complete reaction system with platform-specific configurations.
 * Supports WhatsApp, Telegram, Signal, Slack, Discord, and custom platforms.
 */

// Platform-specific reaction configurations
export {
  // Types
  type ReactionMode,
  type EmojiSetType,
  type AnimationSupport,
  type ReactionDisplayStyle,
  type PlatformReactionConfig,
  type CanReactResult,
  type ReactionAggregate,
  type RenderReactionsOptions,
  type ChannelReactionPermissions,
  // Configurations
  defaultReactionConfig,
  whatsappReactionConfig,
  telegramReactionConfig,
  slackReactionConfig,
  discordReactionConfig,
  platformReactionConfigs,
  defaultChannelPermissions,
  // Functions
  getReactionConfig,
  createCustomReactionConfig,
  canUserReact,
  canUseCustomEmoji,
  supportsAnimatedEmoji,
  getDisplayOptions,
  sortReactions,
  areReactionsAllowed,
  isEmojiAllowed,
} from "./platform-reactions";

// Re-export core reactions utilities
export {
  // Types
  type Reaction,
  type DetailedReaction,
  type ReactionRecord,
  type ReactionUser,
  type MessageReactions,
  type ReactionUpdateEvent,
  // Constants
  MAX_REACTIONS_PER_MESSAGE,
  MAX_REACTIONS_PER_USER,
  DEFAULT_QUICK_REACTIONS,
  REACTION_CATEGORIES,
  // Emoji utilities
  isCustomEmoji,
  parseCustomEmoji,
  formatEmoji,
  isSameEmoji,
  getEmojiSkinTone,
  removeEmojiSkinTone,
  // Reaction processing
  groupReactionsByEmoji,
  groupReactionsWithDetails,
  createMessageReactions,
  addReaction,
  removeReaction,
  toggleReaction,
  // Queries
  hasUserReacted,
  getUserReactions,
  getReactionCount,
  getTotalReactionCount,
  getUniqueReactorCount,
  getMostUsedReaction,
  sortReactionsByCount,
  sortReactionsByRecent,
  // Validation
  canAddReaction,
  isValidEmoji,
  // Formatting
  formatReactionUsers,
  formatReactionTooltip,
  getReactionAriaLabel,
  // Optimistic updates
  createOptimisticAdd,
  createOptimisticRemove,
  applyOptimisticUpdate,
  revertOptimisticUpdate,
} from "../messages/reactions";
