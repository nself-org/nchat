/**
 * Emoji Types for nself-chat
 *
 * Type definitions for emojis, custom emojis, reactions, and emoji categories.
 * Supports standard Unicode emojis and custom server emojis.
 */

import type { UserBasicInfo } from "./user";

// ============================================================================
// Emoji Category Types
// ============================================================================

/**
 * Standard emoji categories.
 */
export type StandardEmojiCategory =
  | "smileys"
  | "people"
  | "animals"
  | "food"
  | "travel"
  | "activities"
  | "objects"
  | "symbols"
  | "flags";

/**
 * All emoji category types.
 */
export type EmojiCategory =
  | StandardEmojiCategory
  | "custom"
  | "recent"
  | "search";

/**
 * Category metadata.
 */
export interface EmojiCategoryInfo {
  /** Category ID */
  id: EmojiCategory;
  /** Display name */
  name: string;
  /** Category icon (emoji) */
  icon: string;
  /** Display order */
  order: number;
}

/**
 * Standard emoji categories metadata.
 */
export const EmojiCategories: EmojiCategoryInfo[] = [
  { id: "recent", name: "Recently Used", icon: "🕐", order: 0 },
  { id: "custom", name: "Custom", icon: "⭐", order: 1 },
  { id: "smileys", name: "Smileys & Emotion", icon: "😀", order: 2 },
  { id: "people", name: "People & Body", icon: "👋", order: 3 },
  { id: "animals", name: "Animals & Nature", icon: "🐻", order: 4 },
  { id: "food", name: "Food & Drink", icon: "🍔", order: 5 },
  { id: "travel", name: "Travel & Places", icon: "✈️", order: 6 },
  { id: "activities", name: "Activities", icon: "⚽", order: 7 },
  { id: "objects", name: "Objects", icon: "💡", order: 8 },
  { id: "symbols", name: "Symbols", icon: "❤️", order: 9 },
  { id: "flags", name: "Flags", icon: "🏳️", order: 10 },
];

// ============================================================================
// Emoji Types
// ============================================================================

/**
 * Skin tone modifiers.
 */
export type SkinTone =
  | "default"
  | "light"
  | "medium-light"
  | "medium"
  | "medium-dark"
  | "dark";

/**
 * Skin tone emoji modifiers.
 */
export const SkinToneModifiers: Record<SkinTone, string> = {
  default: "",
  light: "🏻",
  "medium-light": "🏼",
  medium: "🏽",
  "medium-dark": "🏾",
  dark: "🏿",
};

/**
 * Standard Unicode emoji.
 */
export interface Emoji {
  /** Emoji character(s) */
  emoji: string;
  /** Short name (e.g., :smile:) */
  shortName: string;
  /** Alternative short names */
  shortNames?: string[];
  /** Unicode code points */
  unicode: string;
  /** Category */
  category: StandardEmojiCategory;
  /** Emoji version introduced */
  version?: string;
  /** Keywords for search */
  keywords?: string[];
  /** Supports skin tone modifiers */
  hasSkinTones?: boolean;
  /** Skin tone variants */
  skinToneVariants?: Record<SkinTone, string>;
  /** Display order within category */
  order?: number;
}

/**
 * Custom emoji uploaded to the server.
 */
export interface CustomEmoji {
  /** Unique emoji ID */
  id: string;
  /** Short name (without colons) */
  name: string;
  /** Image URL */
  url: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Whether emoji is animated */
  isAnimated: boolean;
  /** Who uploaded the emoji */
  uploadedBy: string;
  /** Uploader info */
  uploader?: UserBasicInfo;
  /** When emoji was uploaded */
  createdAt: Date;
  /** Category/group name */
  category?: string;
  /** Alias names */
  aliases?: string[];
  /** Keywords for search */
  keywords?: string[];
  /** Usage count */
  usageCount?: number;
  /** Whether emoji is available (not disabled) */
  isAvailable: boolean;
  /** Roles that can use this emoji (empty = all) */
  allowedRoles?: string[];
}

/**
 * Unified emoji type (standard or custom).
 */
export type AnyEmoji =
  | { type: "standard"; emoji: Emoji }
  | { type: "custom"; emoji: CustomEmoji };

// ============================================================================
// Reaction Types
// ============================================================================

/**
 * Reaction on a message.
 */
export interface Reaction {
  /** Emoji character or custom emoji ID */
  emoji: string;
  /** Whether this is a custom emoji */
  isCustom: boolean;
  /** Custom emoji details (if custom) */
  customEmoji?: CustomEmoji;
  /** Number of users who reacted */
  count: number;
  /** Users who reacted (partial list) */
  users: UserBasicInfo[];
  /** Whether current user has reacted */
  hasReacted: boolean;
  /** First reaction timestamp */
  firstReactionAt?: Date;
  /** Most recent reaction timestamp */
  lastReactionAt?: Date;
}

/**
 * Reaction with full user list.
 */
export interface ReactionWithUsers extends Reaction {
  /** Complete list of users who reacted */
  allUsers: UserBasicInfo[];
}

/**
 * Reaction summary for a message.
 */
export interface ReactionSummary {
  /** Message ID */
  messageId: string;
  /** Total reaction count */
  totalCount: number;
  /** Unique reactor count */
  uniqueReactors: number;
  /** Reactions grouped by emoji */
  reactions: Reaction[];
  /** Top reactors */
  topReactors?: UserBasicInfo[];
}

// ============================================================================
// Emoji Picker Types
// ============================================================================

/**
 * Recently used emoji record.
 */
export interface RecentEmoji {
  /** Emoji character or custom emoji ID */
  emoji: string;
  /** Whether it's a custom emoji */
  isCustom: boolean;
  /** Custom emoji ID (if custom) */
  customEmojiId?: string;
  /** Last used timestamp */
  lastUsedAt: Date;
  /** Usage count */
  usageCount: number;
}

/**
 * Frequently used emoji with statistics.
 */
export interface FrequentEmoji extends RecentEmoji {
  /** Usage frequency score */
  frequencyScore: number;
}

/**
 * Emoji search result.
 */
export interface EmojiSearchResult {
  /** The emoji */
  emoji: AnyEmoji;
  /** Match score */
  score: number;
  /** Matched keyword/term */
  matchedTerm?: string;
}

/**
 * Emoji picker state.
 */
export interface EmojiPickerState {
  /** Current search query */
  searchQuery: string;
  /** Selected category */
  selectedCategory: EmojiCategory;
  /** Selected skin tone */
  skinTone: SkinTone;
  /** Recent emojis */
  recentEmojis: RecentEmoji[];
  /** Frequently used emojis */
  frequentEmojis: FrequentEmoji[];
  /** Custom emojis available */
  customEmojis: CustomEmoji[];
  /** Whether picker is loading */
  isLoading: boolean;
}

// ============================================================================
// Custom Emoji Management Types
// ============================================================================

/**
 * Input for creating a custom emoji.
 */
export interface CreateCustomEmojiInput {
  /** Emoji name (without colons) */
  name: string;
  /** Image file to upload */
  file: File;
  /** Category name */
  category?: string;
  /** Alias names */
  aliases?: string[];
  /** Roles that can use this emoji */
  allowedRoles?: string[];
}

/**
 * Input for updating a custom emoji.
 */
export interface UpdateCustomEmojiInput {
  /** Emoji ID */
  id: string;
  /** New name */
  name?: string;
  /** New category */
  category?: string;
  /** Updated aliases */
  aliases?: string[];
  /** Updated allowed roles */
  allowedRoles?: string[];
  /** Enable/disable emoji */
  isAvailable?: boolean;
}

/**
 * Custom emoji upload validation result.
 */
export interface EmojiUploadValidation {
  /** Is the upload valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
  /** Detected file type */
  fileType?: string;
  /** Detected dimensions */
  dimensions?: { width: number; height: number };
  /** File size in bytes */
  fileSize?: number;
  /** Whether image is animated */
  isAnimated?: boolean;
}

/**
 * Custom emoji upload constraints.
 */
export interface EmojiUploadConstraints {
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Maximum dimensions (pixels) */
  maxDimensions: number;
  /** Minimum dimensions (pixels) */
  minDimensions: number;
  /** Allowed file types */
  allowedTypes: string[];
  /** Allow animated images */
  allowAnimated: boolean;
  /** Maximum name length */
  maxNameLength: number;
  /** Minimum name length */
  minNameLength: number;
  /** Name pattern (regex) */
  namePattern: RegExp;
}

/**
 * Default emoji upload constraints.
 */
export const DefaultEmojiUploadConstraints: EmojiUploadConstraints = {
  maxFileSize: 256 * 1024, // 256KB
  maxDimensions: 128,
  minDimensions: 32,
  allowedTypes: ["image/png", "image/gif", "image/jpeg", "image/webp"],
  allowAnimated: true,
  maxNameLength: 32,
  minNameLength: 2,
  namePattern: /^[a-z0-9_]+$/,
};

// ============================================================================
// Emoji Pack Types
// ============================================================================

/**
 * Emoji pack (collection of custom emojis).
 */
export interface EmojiPack {
  /** Pack ID */
  id: string;
  /** Pack name */
  name: string;
  /** Pack description */
  description?: string;
  /** Pack thumbnail/icon */
  iconUrl?: string;
  /** Emojis in the pack */
  emojis: CustomEmoji[];
  /** Number of emojis */
  emojiCount: number;
  /** Pack creator */
  createdBy: string;
  /** Creator info */
  creator?: UserBasicInfo;
  /** When pack was created */
  createdAt: Date;
  /** Whether pack is official/verified */
  isOfficial?: boolean;
  /** Whether pack is installed/enabled */
  isInstalled?: boolean;
  /** Install count */
  installCount?: number;
}

/**
 * Input for creating an emoji pack.
 */
export interface CreateEmojiPackInput {
  name: string;
  description?: string;
  icon?: File;
  emojis: CreateCustomEmojiInput[];
}

// ============================================================================
// Reaction Events
// ============================================================================

/**
 * Reaction added event.
 */
export interface ReactionAddedEvent {
  messageId: string;
  channelId: string;
  emoji: string;
  isCustom: boolean;
  customEmojiId?: string;
  userId: string;
  user: UserBasicInfo;
  timestamp: Date;
}

/**
 * Reaction removed event.
 */
export interface ReactionRemovedEvent {
  messageId: string;
  channelId: string;
  emoji: string;
  isCustom: boolean;
  customEmojiId?: string;
  userId: string;
  timestamp: Date;
}

/**
 * Reactions cleared event.
 */
export interface ReactionsClearedEvent {
  messageId: string;
  channelId: string;
  emoji?: string; // If specified, only this emoji was cleared
  timestamp: Date;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert emoji short name to display format.
 */
export function formatEmojiShortName(name: string): string {
  return `:${name.replace(/^:|:$/g, "")}:`;
}

/**
 * Parse emoji short name from text.
 */
export function parseEmojiShortName(text: string): string | null {
  const match = text.match(/^:([a-z0-9_+-]+):$/);
  return match ? match[1] : null;
}

/**
 * Check if emoji name is valid.
 */
export function isValidEmojiName(name: string): boolean {
  return (
    DefaultEmojiUploadConstraints.namePattern.test(name) &&
    name.length >= DefaultEmojiUploadConstraints.minNameLength &&
    name.length <= DefaultEmojiUploadConstraints.maxNameLength
  );
}

/**
 * Apply skin tone to emoji.
 */
export function applyEmojiSkinTone(emoji: string, skinTone: SkinTone): string {
  if (skinTone === "default") return emoji;
  const modifier = SkinToneModifiers[skinTone];
  // This is a simplified implementation - real implementation would need
  // to handle multi-codepoint emojis properly
  return emoji + modifier;
}

/**
 * Get emoji display text (for accessibility).
 */
export function getEmojiLabel(emoji: AnyEmoji): string {
  if (emoji.type === "standard") {
    return emoji.emoji.shortName.replace(/_/g, " ");
  }
  return emoji.emoji.name.replace(/_/g, " ");
}
