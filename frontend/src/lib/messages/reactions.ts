/**
 * Reactions Module
 *
 * Provides functionality for managing emoji reactions on messages.
 * Supports adding, removing, and querying reactions.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * User who added a reaction
 */
export interface ReactionUser {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * A single reaction on a message
 */
export interface Reaction {
  /** Emoji character or custom emoji ID */
  emoji: string;
  /** Number of users who reacted with this emoji */
  count: number;
  /** List of user IDs who reacted */
  users: string[];
  /** Whether the current user has reacted */
  hasReacted: boolean;
}

/**
 * Detailed reaction with full user info
 */
export interface DetailedReaction extends Reaction {
  /** Full user objects */
  userDetails: ReactionUser[];
  /** When first reaction was added */
  firstReactedAt: number;
  /** When last reaction was added */
  lastReactedAt: number;
}

/**
 * Reaction record from database/API
 */
export interface ReactionRecord {
  /** Reaction ID */
  id: string;
  /** Message ID */
  messageId: string;
  /** User ID */
  userId: string;
  /** Emoji */
  emoji: string;
  /** When added */
  createdAt: string;
  /** User details */
  user?: ReactionUser;
}

/**
 * Message reactions data
 */
export interface MessageReactions {
  /** Message ID */
  messageId: string;
  /** Grouped reactions */
  reactions: Reaction[];
  /** Total reaction count */
  totalCount: number;
  /** Total unique users who reacted */
  uniqueUsers: number;
}

/**
 * Reaction update event
 */
export interface ReactionUpdateEvent {
  /** Event type */
  type: "add" | "remove";
  /** Message ID */
  messageId: string;
  /** Emoji */
  emoji: string;
  /** User who changed the reaction */
  userId: string;
  /** User details */
  user?: ReactionUser;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum reactions per message */
export const MAX_REACTIONS_PER_MESSAGE = 20;

/** Maximum reactions per user per message */
export const MAX_REACTIONS_PER_USER = 10;

/** Default quick reactions */
export const DEFAULT_QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👀"];

/** Common reaction categories */
export const REACTION_CATEGORIES = {
  positive: ["👍", "❤️", "🎉", "🔥", "💯", "⭐", "✨"],
  negative: ["👎", "😢", "😡", "💔"],
  funny: ["😂", "🤣", "😆", "😹"],
  thinking: ["🤔", "🧐", "❓", "💭"],
  surprised: ["😮", "😱", "🤯", "😲"],
  acknowledgment: ["👀", "✅", "☑️", "🙏"],
} as const;

// ============================================================================
// Reaction Utilities
// ============================================================================

/**
 * Check if an emoji is a custom emoji (vs native)
 */
export function isCustomEmoji(emoji: string): boolean {
  return emoji.startsWith(":") && emoji.endsWith(":");
}

/**
 * Parse custom emoji shortcode
 */
export function parseCustomEmoji(
  emoji: string,
): { name: string; id?: string } | null {
  if (!isCustomEmoji(emoji)) return null;

  // Format: :name: or :name:id:
  const parts = emoji.slice(1, -1).split(":");
  return {
    name: parts[0],
    id: parts[1],
  };
}

/**
 * Format emoji for display
 */
export function formatEmoji(emoji: string): string {
  if (isCustomEmoji(emoji)) {
    const parsed = parseCustomEmoji(emoji);
    return parsed?.name || emoji;
  }
  return emoji;
}

/**
 * Check if two emojis are the same
 */
export function isSameEmoji(a: string, b: string): boolean {
  // Handle variation selectors and ZWJ sequences
  const normalizeEmoji = (e: string): string => {
    // Remove variation selectors (U+FE0E and U+FE0F)
    return e.replace(/[\uFE0E\uFE0F]/g, "");
  };

  return normalizeEmoji(a) === normalizeEmoji(b);
}

/**
 * Get emoji skin tone
 */
export function getEmojiSkinTone(emoji: string): string | null {
  const skinTones: Record<string, string> = {
    "\u{1F3FB}": "light",
    "\u{1F3FC}": "medium-light",
    "\u{1F3FD}": "medium",
    "\u{1F3FE}": "medium-dark",
    "\u{1F3FF}": "dark",
  };

  for (const [modifier, tone] of Object.entries(skinTones)) {
    if (emoji.includes(modifier)) {
      return tone;
    }
  }

  return null;
}

/**
 * Remove skin tone from emoji
 */
export function removeEmojiSkinTone(emoji: string): string {
  return emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
}

// ============================================================================
// Reaction Processing
// ============================================================================

/**
 * Group reaction records by emoji
 */
export function groupReactionsByEmoji(
  records: ReactionRecord[],
  currentUserId?: string,
): Reaction[] {
  const groups = new Map<string, Reaction>();

  for (const record of records) {
    const existing = groups.get(record.emoji);

    if (existing) {
      existing.count++;
      existing.users.push(record.userId);
      if (currentUserId && record.userId === currentUserId) {
        existing.hasReacted = true;
      }
    } else {
      groups.set(record.emoji, {
        emoji: record.emoji,
        count: 1,
        users: [record.userId],
        hasReacted: currentUserId ? record.userId === currentUserId : false,
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * Group reaction records with full user details
 */
export function groupReactionsWithDetails(
  records: ReactionRecord[],
  currentUserId?: string,
): DetailedReaction[] {
  const groups = new Map<string, DetailedReaction>();

  for (const record of records) {
    const timestamp = new Date(record.createdAt).getTime();
    const existing = groups.get(record.emoji);

    if (existing) {
      existing.count++;
      existing.users.push(record.userId);
      if (record.user) {
        existing.userDetails.push(record.user);
      }
      if (currentUserId && record.userId === currentUserId) {
        existing.hasReacted = true;
      }
      existing.lastReactedAt = Math.max(existing.lastReactedAt, timestamp);
    } else {
      groups.set(record.emoji, {
        emoji: record.emoji,
        count: 1,
        users: [record.userId],
        hasReacted: currentUserId ? record.userId === currentUserId : false,
        userDetails: record.user ? [record.user] : [],
        firstReactedAt: timestamp,
        lastReactedAt: timestamp,
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * Create message reactions summary
 */
export function createMessageReactions(
  messageId: string,
  records: ReactionRecord[],
  currentUserId?: string,
): MessageReactions {
  const reactions = groupReactionsByEmoji(records, currentUserId);
  const uniqueUserIds = new Set(records.map((r) => r.userId));

  return {
    messageId,
    reactions,
    totalCount: records.length,
    uniqueUsers: uniqueUserIds.size,
  };
}

/**
 * Add a reaction to a reactions list
 */
export function addReaction(
  reactions: Reaction[],
  emoji: string,
  userId: string,
  currentUserId?: string,
): Reaction[] {
  const existingIndex = reactions.findIndex((r) => isSameEmoji(r.emoji, emoji));

  if (existingIndex >= 0) {
    // Update existing reaction
    const existing = reactions[existingIndex];
    if (!existing.users.includes(userId)) {
      return [
        ...reactions.slice(0, existingIndex),
        {
          ...existing,
          count: existing.count + 1,
          users: [...existing.users, userId],
          hasReacted: existing.hasReacted || userId === currentUserId,
        },
        ...reactions.slice(existingIndex + 1),
      ];
    }
    return reactions; // User already reacted
  }

  // Add new reaction
  return [
    ...reactions,
    {
      emoji,
      count: 1,
      users: [userId],
      hasReacted: userId === currentUserId,
    },
  ];
}

/**
 * Remove a reaction from a reactions list
 */
export function removeReaction(
  reactions: Reaction[],
  emoji: string,
  userId: string,
  currentUserId?: string,
): Reaction[] {
  const existingIndex = reactions.findIndex((r) => isSameEmoji(r.emoji, emoji));

  if (existingIndex < 0) {
    return reactions; // Reaction doesn't exist
  }

  const existing = reactions[existingIndex];
  const userIndex = existing.users.indexOf(userId);

  if (userIndex < 0) {
    return reactions; // User hasn't reacted
  }

  const newUsers = [
    ...existing.users.slice(0, userIndex),
    ...existing.users.slice(userIndex + 1),
  ];

  if (newUsers.length === 0) {
    // Remove reaction entirely
    return [
      ...reactions.slice(0, existingIndex),
      ...reactions.slice(existingIndex + 1),
    ];
  }

  // Update reaction
  return [
    ...reactions.slice(0, existingIndex),
    {
      ...existing,
      count: newUsers.length,
      users: newUsers,
      hasReacted: currentUserId ? newUsers.includes(currentUserId) : false,
    },
    ...reactions.slice(existingIndex + 1),
  ];
}

/**
 * Toggle a reaction for a user
 */
export function toggleReaction(
  reactions: Reaction[],
  emoji: string,
  userId: string,
  currentUserId?: string,
): Reaction[] {
  const existing = reactions.find((r) => isSameEmoji(r.emoji, emoji));

  if (existing && existing.users.includes(userId)) {
    return removeReaction(reactions, emoji, userId, currentUserId);
  }

  return addReaction(reactions, emoji, userId, currentUserId);
}

// ============================================================================
// Reaction Queries
// ============================================================================

/**
 * Check if user has reacted with a specific emoji
 */
export function hasUserReacted(
  reactions: Reaction[],
  emoji: string,
  userId: string,
): boolean {
  const reaction = reactions.find((r) => isSameEmoji(r.emoji, emoji));
  return reaction ? reaction.users.includes(userId) : false;
}

/**
 * Get user's reactions on a message
 */
export function getUserReactions(
  reactions: Reaction[],
  userId: string,
): string[] {
  return reactions.filter((r) => r.users.includes(userId)).map((r) => r.emoji);
}

/**
 * Get reaction count for a specific emoji
 */
export function getReactionCount(reactions: Reaction[], emoji: string): number {
  const reaction = reactions.find((r) => isSameEmoji(r.emoji, emoji));
  return reaction?.count ?? 0;
}

/**
 * Get total reaction count
 */
export function getTotalReactionCount(reactions: Reaction[]): number {
  return reactions.reduce((sum, r) => sum + r.count, 0);
}

/**
 * Get unique reactor count
 */
export function getUniqueReactorCount(reactions: Reaction[]): number {
  const uniqueUsers = new Set<string>();
  for (const reaction of reactions) {
    for (const userId of reaction.users) {
      uniqueUsers.add(userId);
    }
  }
  return uniqueUsers.size;
}

/**
 * Get most used reaction
 */
export function getMostUsedReaction(reactions: Reaction[]): Reaction | null {
  if (reactions.length === 0) return null;

  return reactions.reduce((max, r) => (r.count > max.count ? r : max));
}

/**
 * Get reactions sorted by count
 */
export function sortReactionsByCount(
  reactions: Reaction[],
  ascending = false,
): Reaction[] {
  return [...reactions].sort((a, b) =>
    ascending ? a.count - b.count : b.count - a.count,
  );
}

/**
 * Get reactions sorted by recent activity
 */
export function sortReactionsByRecent(
  reactions: DetailedReaction[],
): DetailedReaction[] {
  return [...reactions].sort((a, b) => b.lastReactedAt - a.lastReactedAt);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if user can add reaction
 */
export function canAddReaction(
  reactions: Reaction[],
  userId: string,
  _maxReactionsPerMessage = MAX_REACTIONS_PER_MESSAGE,
  maxReactionsPerUser = MAX_REACTIONS_PER_USER,
): { allowed: boolean; reason?: string } {
  const userReactionCount = getUserReactions(reactions, userId).length;

  if (userReactionCount >= maxReactionsPerUser) {
    return {
      allowed: false,
      reason: `Maximum ${maxReactionsPerUser} reactions per user reached`,
    };
  }

  return { allowed: true };
}

/**
 * Validate emoji
 */
export function isValidEmoji(emoji: string): boolean {
  if (!emoji || emoji.trim().length === 0) return false;

  // Check custom emoji format
  if (isCustomEmoji(emoji)) {
    const parsed = parseCustomEmoji(emoji);
    return !!parsed && parsed.name.length > 0;
  }

  // Check if it's a valid Unicode emoji (basic check)
  // This uses a simple regex that covers most emoji
  const emojiRegex = /^[\p{Emoji}\u200D\uFE0F]+$/u;
  return emojiRegex.test(emoji);
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format reaction users for display
 */
export function formatReactionUsers(
  users: string[],
  userNames: Map<string, string>,
  currentUserId?: string,
  maxDisplay = 3,
): string {
  if (users.length === 0) return "";

  // Get display names, putting current user first if they reacted
  const sortedUsers = [...users];
  if (currentUserId && sortedUsers.includes(currentUserId)) {
    sortedUsers.splice(sortedUsers.indexOf(currentUserId), 1);
    sortedUsers.unshift(currentUserId);
  }

  const displayNames = sortedUsers.map((id) =>
    id === currentUserId ? "You" : userNames.get(id) || "Unknown",
  );

  if (displayNames.length <= maxDisplay) {
    if (displayNames.length === 1) return displayNames[0];
    if (displayNames.length === 2)
      return `${displayNames[0]} and ${displayNames[1]}`;
    return `${displayNames.slice(0, -1).join(", ")}, and ${displayNames[displayNames.length - 1]}`;
  }

  const shown = displayNames.slice(0, maxDisplay);
  const remaining = displayNames.length - maxDisplay;
  return `${shown.join(", ")} and ${remaining} other${remaining === 1 ? "" : "s"}`;
}

/**
 * Format reaction tooltip
 */
export function formatReactionTooltip(
  reaction: Reaction,
  userNames: Map<string, string>,
  currentUserId?: string,
): string {
  const userText = formatReactionUsers(
    reaction.users,
    userNames,
    currentUserId,
  );
  return `${reaction.emoji} ${userText}`;
}

/**
 * Get reaction aria label
 */
export function getReactionAriaLabel(
  reaction: Reaction,
  userNames: Map<string, string>,
  currentUserId?: string,
): string {
  const emoji = formatEmoji(reaction.emoji);
  const userText = formatReactionUsers(
    reaction.users,
    userNames,
    currentUserId,
  );
  return `${emoji} reaction by ${userText}. ${reaction.count} ${reaction.count === 1 ? "reaction" : "reactions"}`;
}

// ============================================================================
// Optimistic Updates
// ============================================================================

/**
 * Create optimistic add reaction
 */
export function createOptimisticAdd(
  emoji: string,
  userId: string,
  user?: ReactionUser,
): ReactionUpdateEvent {
  return {
    type: "add",
    messageId: "",
    emoji,
    userId,
    user,
    timestamp: Date.now(),
  };
}

/**
 * Create optimistic remove reaction
 */
export function createOptimisticRemove(
  emoji: string,
  userId: string,
): ReactionUpdateEvent {
  return {
    type: "remove",
    messageId: "",
    emoji,
    userId,
    timestamp: Date.now(),
  };
}

/**
 * Apply optimistic update to reactions
 */
export function applyOptimisticUpdate(
  reactions: Reaction[],
  event: ReactionUpdateEvent,
  currentUserId?: string,
): Reaction[] {
  if (event.type === "add") {
    return addReaction(reactions, event.emoji, event.userId, currentUserId);
  }
  return removeReaction(reactions, event.emoji, event.userId, currentUserId);
}

/**
 * Revert optimistic update
 */
export function revertOptimisticUpdate(
  reactions: Reaction[],
  event: ReactionUpdateEvent,
  currentUserId?: string,
): Reaction[] {
  // Reverse the operation
  if (event.type === "add") {
    return removeReaction(reactions, event.emoji, event.userId, currentUserId);
  }
  return addReaction(reactions, event.emoji, event.userId, currentUserId);
}
