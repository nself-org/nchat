/**
 * Emoji Types - TypeScript type definitions for the emoji system
 *
 * This module provides comprehensive type definitions for all emoji-related
 * functionality including autocomplete, search, custom emojis, and skin tones.
 */

// ============================================================================
// Core Emoji Types
// ============================================================================

/**
 * Represents a single emoji with all its metadata
 */
export interface Emoji {
  /** The emoji character itself (e.g., "thumbsup") */
  id: string;
  /** The emoji character (e.g., "👍") */
  emoji: string;
  /** Primary name/shortcode without colons (e.g., "thumbsup") */
  name: string;
  /** Display name for UI (e.g., "Thumbs Up") */
  displayName: string;
  /** Category ID (e.g., "people", "nature") */
  category: EmojiCategory;
  /** Search keywords for finding this emoji */
  keywords: string[];
  /** Alternative shortcodes (e.g., ["+1"]) */
  aliases: string[];
  /** Whether this emoji supports skin tone modifiers */
  supportsSkinTone: boolean;
  /** Unicode version when this emoji was added */
  version?: string;
  /** Sort order within category */
  order?: number;
}

/**
 * Emoji categories matching Unicode standard
 */
export type EmojiCategory =
  | "recent"
  | "frequent"
  | "smileys"
  | "people"
  | "animals"
  | "food"
  | "travel"
  | "activities"
  | "objects"
  | "symbols"
  | "flags"
  | "custom";

/**
 * Category metadata for display
 */
export interface EmojiCategoryInfo {
  id: EmojiCategory;
  name: string;
  icon: string;
  order: number;
}

// ============================================================================
// Custom Emoji Types
// ============================================================================

/**
 * Custom emoji uploaded by admins
 */
export interface CustomEmoji {
  /** Unique identifier */
  id: string;
  /** Shortcode without colons (e.g., "company_logo") */
  name: string;
  /** Full shortcode with colons (e.g., ":company_logo:") */
  shortcode: string;
  /** URL to the emoji image */
  url: string;
  /** Thumbnail URL for smaller displays */
  thumbnailUrl?: string;
  /** Custom category for organization */
  category?: string;
  /** Alternative names/aliases */
  aliases: string[];
  /** User ID who uploaded this emoji */
  createdBy: string;
  /** Username of uploader for display */
  createdByUsername?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
  /** Whether this emoji is enabled */
  enabled: boolean;
  /** Usage count for analytics */
  usageCount: number;
}

/**
 * Request payload for creating a custom emoji
 */
export interface CreateCustomEmojiRequest {
  name: string;
  file: File;
  category?: string;
  aliases?: string[];
}

/**
 * Request payload for updating a custom emoji
 */
export interface UpdateCustomEmojiRequest {
  id: string;
  name?: string;
  category?: string;
  aliases?: string[];
  enabled?: boolean;
}

// ============================================================================
// Skin Tone Types
// ============================================================================

/**
 * Fitzpatrick skin tone scale values
 * Empty string = default yellow
 */
export type SkinTone =
  | "" // Default (yellow)
  | "1F3FB" // Light skin tone
  | "1F3FC" // Medium-light skin tone
  | "1F3FD" // Medium skin tone
  | "1F3FE" // Medium-dark skin tone
  | "1F3FF"; // Dark skin tone

/**
 * Skin tone information for display
 */
export interface SkinToneInfo {
  value: SkinTone;
  name: string;
  emoji: string;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search result for emoji search
 */
export interface EmojiSearchResult {
  /** The emoji object */
  emoji: Emoji | CustomEmoji;
  /** Whether this is a custom emoji */
  isCustom: boolean;
  /** Relevance score (higher = more relevant) */
  score: number;
  /** Matched field (name, keyword, alias) */
  matchedField: "name" | "keyword" | "alias";
  /** The matched portion for highlighting */
  matchedText: string;
}

/**
 * Options for emoji search
 */
export interface EmojiSearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Include custom emojis in results */
  includeCustom?: boolean;
  /** Filter by category */
  category?: EmojiCategory | "all";
  /** Minimum score threshold */
  minScore?: number;
  /** Enable fuzzy matching */
  fuzzy?: boolean;
}

// ============================================================================
// Autocomplete Types
// ============================================================================

/**
 * Autocomplete suggestion item
 */
export interface AutocompleteSuggestion {
  /** Unique ID for React key */
  id: string;
  /** The emoji character or image URL */
  emoji: string;
  /** Shortcode to display (e.g., ":thumbsup:") */
  shortcode: string;
  /** Whether this is a custom emoji */
  isCustom: boolean;
  /** Display name */
  displayName: string;
  /** Preview text for the suggestion */
  preview: string;
}

/**
 * Autocomplete state
 */
export interface AutocompleteState {
  /** Whether autocomplete is active */
  isActive: boolean;
  /** Current search query (without colon prefix) */
  query: string;
  /** Suggestions to display */
  suggestions: AutocompleteSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Position in the text where autocomplete started */
  triggerPosition: number;
  /** Current cursor position */
  cursorPosition: number;
}

/**
 * Options for autocomplete behavior
 */
export interface AutocompleteOptions {
  /** Minimum characters before showing suggestions */
  minChars?: number;
  /** Maximum suggestions to show */
  maxSuggestions?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Include custom emojis */
  includeCustom?: boolean;
  /** Show recent emojis first */
  prioritizeRecent?: boolean;
}

// ============================================================================
// Recent/Frequent Tracking Types
// ============================================================================

/**
 * Single emoji usage record
 */
export interface EmojiUsage {
  /** Emoji character or shortcode */
  emoji: string;
  /** Whether this is a custom emoji */
  isCustom: boolean;
  /** Custom emoji ID if applicable */
  customEmojiId?: string;
  /** Total usage count */
  count: number;
  /** Last used timestamp */
  lastUsedAt: number;
  /** First used timestamp */
  firstUsedAt: number;
}

/**
 * Recent emoji entry
 */
export interface RecentEmoji {
  /** Emoji character or URL */
  emoji: string;
  /** Whether this is a custom emoji */
  isCustom: boolean;
  /** Custom emoji ID if applicable */
  customEmojiId?: string;
  /** When this was used */
  usedAt: number;
}

// ============================================================================
// Picker Types
// ============================================================================

/**
 * Emoji picker position
 */
export interface PickerPosition {
  x: number;
  y: number;
  anchor?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/**
 * Emoji picker state
 */
export interface PickerState {
  /** Whether picker is open */
  isOpen: boolean;
  /** Target message ID for reactions */
  targetMessageId: string | null;
  /** Target channel ID */
  targetChannelId: string | null;
  /** Picker position on screen */
  position: PickerPosition | null;
  /** Active category tab */
  activeCategory: EmojiCategory;
  /** Current search query */
  searchQuery: string;
  /** Preview emoji on hover */
  previewEmoji: Emoji | CustomEmoji | null;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Emoji selection event data
 */
export interface EmojiSelectEvent {
  /** The selected emoji character */
  emoji: string;
  /** The emoji shortcode */
  shortcode: string;
  /** Whether this is a custom emoji */
  isCustom: boolean;
  /** Custom emoji data if applicable */
  customEmoji?: CustomEmoji;
  /** Full emoji metadata */
  metadata?: Emoji;
}

/**
 * Handler for emoji selection
 */
export type EmojiSelectHandler = (event: EmojiSelectEvent) => void;

// ============================================================================
// Shortcode Types
// ============================================================================

/**
 * Shortcode mapping entry
 */
export interface ShortcodeEntry {
  shortcode: string;
  emoji: string;
  aliases: string[];
}

/**
 * Shortcode parse result
 */
export interface ShortcodeParseResult {
  /** Original text */
  original: string;
  /** Parsed text with emojis */
  parsed: string;
  /** List of replacements made */
  replacements: Array<{
    shortcode: string;
    emoji: string;
    start: number;
    end: number;
  }>;
}

// ============================================================================
// Store Types
// ============================================================================

/**
 * Emoji store state
 */
export interface EmojiStoreState {
  // Recent emojis
  recentEmojis: RecentEmoji[];
  maxRecentEmojis: number;

  // Frequent emojis
  frequentEmojis: Map<string, EmojiUsage>;

  // Custom emojis
  customEmojis: Map<string, CustomEmoji>;
  customEmojiCategories: string[];
  customEmojisLoaded: boolean;
  customEmojisLoading: boolean;
  customEmojisError: string | null;

  // Skin tone preference
  skinTone: SkinTone;

  // Picker state
  picker: PickerState;

  // Autocomplete state
  autocomplete: AutocompleteState;

  // Quick reactions (frequently used for message reactions)
  quickReactions: string[];

  // Settings
  autoReplaceShortcodes: boolean;
  showRecentFirst: boolean;
}

/**
 * Emoji store actions
 */
export interface EmojiStoreActions {
  // Recent emojis
  addRecentEmoji: (
    emoji: string,
    isCustom?: boolean,
    customEmojiId?: string,
  ) => void;
  clearRecentEmojis: () => void;
  setMaxRecentEmojis: (max: number) => void;

  // Frequent emojis
  recordEmojiUsage: (
    emoji: string,
    isCustom?: boolean,
    customEmojiId?: string,
  ) => void;
  getTopEmojis: (count: number) => string[];
  clearFrequentEmojis: () => void;

  // Custom emojis
  loadCustomEmojis: () => Promise<void>;
  addCustomEmoji: (emoji: CustomEmoji) => void;
  updateCustomEmoji: (id: string, updates: Partial<CustomEmoji>) => void;
  removeCustomEmoji: (id: string) => void;
  getCustomEmojiByShortcode: (shortcode: string) => CustomEmoji | undefined;

  // Skin tone
  setSkinTone: (tone: SkinTone) => void;

  // Picker
  openPicker: (
    messageId?: string,
    channelId?: string,
    position?: PickerPosition,
  ) => void;
  closePicker: () => void;
  setPickerCategory: (category: EmojiCategory) => void;
  setPickerSearch: (query: string) => void;
  setPreviewEmoji: (emoji: Emoji | CustomEmoji | null) => void;

  // Autocomplete
  startAutocomplete: (
    query: string,
    triggerPosition: number,
    cursorPosition: number,
  ) => void;
  updateAutocomplete: (suggestions: AutocompleteSuggestion[]) => void;
  setAutocompleteIndex: (index: number) => void;
  closeAutocomplete: () => void;

  // Quick reactions
  setQuickReactions: (emojis: string[]) => void;
  addQuickReaction: (emoji: string) => void;
  removeQuickReaction: (emoji: string) => void;

  // Settings
  setAutoReplaceShortcodes: (enabled: boolean) => void;
  setShowRecentFirst: (enabled: boolean) => void;

  // Reset
  reset: () => void;
}

/**
 * Combined emoji store type
 */
export type EmojiStore = EmojiStoreState & EmojiStoreActions;

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useEmojiAutocomplete hook
 */
export interface UseEmojiAutocompleteReturn {
  /** Whether autocomplete is active */
  isActive: boolean;
  /** Current query string */
  query: string;
  /** Autocomplete suggestions */
  suggestions: AutocompleteSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Handle text change to detect : trigger */
  handleTextChange: (text: string, cursorPosition: number) => void;
  /** Select suggestion at index */
  selectSuggestion: (index: number) => void;
  /** Select current suggestion */
  selectCurrent: () => void;
  /** Navigate up in suggestions */
  navigateUp: () => void;
  /** Navigate down in suggestions */
  navigateDown: () => void;
  /** Close autocomplete */
  close: () => void;
  /** Get replacement text for selected suggestion */
  getReplacementText: () => { text: string; cursorOffset: number } | null;
}

/**
 * Return type for useEmojiSearch hook
 */
export interface UseEmojiSearchReturn {
  /** Search results */
  results: EmojiSearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Search error if any */
  error: string | null;
  /** Perform search */
  search: (query: string, options?: EmojiSearchOptions) => void;
  /** Clear search results */
  clear: () => void;
}

/**
 * Return type for useRecentEmojis hook
 */
export interface UseRecentEmojisReturn {
  /** Recent emojis list */
  recentEmojis: RecentEmoji[];
  /** Frequently used emojis */
  frequentEmojis: string[];
  /** Add emoji to recent */
  addRecent: (emoji: string, isCustom?: boolean) => void;
  /** Clear recent emojis */
  clearRecent: () => void;
  /** Get top N frequent emojis */
  getTopFrequent: (count: number) => string[];
}

// ============================================================================
// Admin Types
// ============================================================================

/**
 * Emoji analytics data
 */
export interface EmojiAnalytics {
  /** Total emoji usages */
  totalUsages: number;
  /** Usages by emoji */
  usagesByEmoji: Array<{
    emoji: string;
    isCustom: boolean;
    count: number;
    percentage: number;
  }>;
  /** Usages over time */
  usageOverTime: Array<{
    date: string;
    count: number;
  }>;
  /** Top users by emoji usage */
  topUsers: Array<{
    userId: string;
    username: string;
    count: number;
  }>;
}

/**
 * Bulk emoji operation result
 */
export interface BulkEmojiOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}
