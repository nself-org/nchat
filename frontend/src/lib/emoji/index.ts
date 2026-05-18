/**
 * Emoji Library - Central exports for emoji functionality
 *
 * This module provides a unified API for all emoji-related operations
 * including search, autocomplete, custom emojis, and skin tones.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core types
  Emoji,
  EmojiCategory,
  EmojiCategoryInfo,
  CustomEmoji,
  CreateCustomEmojiRequest,
  UpdateCustomEmojiRequest,

  // Skin tone types
  SkinTone,
  SkinToneInfo,

  // Search types
  EmojiSearchResult,
  EmojiSearchOptions,

  // Autocomplete types
  AutocompleteSuggestion,
  AutocompleteState,
  AutocompleteOptions,

  // Tracking types
  EmojiUsage,
  RecentEmoji,

  // Picker types
  PickerPosition,
  PickerState,

  // Event types
  EmojiSelectEvent,
  EmojiSelectHandler,

  // Shortcode types
  ShortcodeEntry,
  ShortcodeParseResult,

  // Store types
  EmojiStoreState,
  EmojiStoreActions,
  EmojiStore,

  // Hook return types
  UseEmojiAutocompleteReturn,
  UseEmojiSearchReturn,
  UseRecentEmojisReturn,

  // Admin types
  EmojiAnalytics,
  BulkEmojiOperationResult,
} from "./emoji-types";

// ============================================================================
// Data
// ============================================================================

export {
  EMOJI_DATA,
  EMOJI_CATEGORIES,
  SKIN_TONES,
  QUICK_REACTIONS,
  EMOJI_BY_NAME,
  EMOJI_BY_CHAR,
  getCategoryById,
  getEmojisByCategory,
  getEmojiById,
  getEmojiByChar,
  getEmojiByName,
  getSkinToneEmojis,
  getSkinToneInfo,
  getEmojiCount,
  getCategoriesWithCounts,
} from "./emoji-data";

// ============================================================================
// Shortcodes
// ============================================================================

export {
  SHORTCODE_TO_EMOJI,
  EMOJI_TO_SHORTCODE,
  shortcodeToEmoji,
  emojiToShortcode,
  emojiToFormattedShortcode,
  parseShortcodes,
  parseShortcodesDetailed,
  emojisToShortcodes,
  containsShortcodes,
  extractShortcodes,
  isValidShortcode,
  getAllShortcodes,
  getShortcodeEntries,
  getShortcodesForEmoji,
  registerCustomShortcode,
  unregisterCustomShortcode,
  getCustomEmojiUrl,
  isCustomShortcode,
  clearCustomShortcodes,
  registerCustomShortcodes,
  findMatchingShortcodes,
  getShortcodeSuggestions,
} from "./emoji-shortcodes";

// ============================================================================
// Search
// ============================================================================

export {
  searchEmojis,
  searchEmojisWithCustom,
  quickSearch,
  searchByCategory,
  getContextualSuggestions,
  getSearchIndex,
  fastPrefixSearch,
} from "./emoji-search";

// ============================================================================
// Autocomplete
// ============================================================================

export {
  INITIAL_AUTOCOMPLETE_STATE,
  updateAutocompleteState,
  detectAutocompleteTrigger,
  isCursorInShortcode,
  generateSuggestions,
  generateQuickSuggestions,
  getReplacementText,
  applyAutocompleteSuggestion,
  navigateUp,
  navigateDown,
  getSelectedSuggestion,
  createAutocompleteController,
  isAutocompleteKey,
  handleAutocompleteKey,
} from "./emoji-autocomplete";

// ============================================================================
// Recent/Frequent Tracking
// ============================================================================

export {
  getRecentEmojis,
  saveRecentEmojis,
  addRecentEmoji,
  clearRecentEmojis,
  getRecentEmojiStrings,
  getFrequentEmojis,
  saveFrequentEmojis,
  recordEmojiUsage,
  getTopFrequentEmojis,
  getEmojiUsageCount,
  clearFrequentEmojis,
  trackEmojiUse,
  clearAllEmojiTracking,
  applyFrequentDecay,
  exportEmojiTrackingData,
  importEmojiTrackingData,
  getEmojiStats,
} from "./emoji-recent";

// ============================================================================
// Custom Emojis
// ============================================================================

export {
  validateEmojiName,
  validateEmojiFile,
  getLocalCustomEmojis,
  saveLocalCustomEmojis,
  addLocalCustomEmoji,
  updateLocalCustomEmoji,
  removeLocalCustomEmoji,
  clearLocalCustomEmojis,
  generateEmojiId,
  createShortcode,
  isShortcodeTaken,
  fileToDataUrl,
  createCustomEmojiFromFile,
  searchCustomEmojis,
  getCustomEmojisByCategory,
  getCustomEmojiCategories,
  getEnabledCustomEmojis,
  recordCustomEmojiUsage,
  getTopCustomEmojis,
  mergeCustomEmojis,
  exportCustomEmojis,
  importCustomEmojis,
} from "./emoji-custom";

// ============================================================================
// Skin Tones
// ============================================================================

export {
  SKIN_TONE_MODIFIERS,
  applySkinTone,
  removeSkinTone,
  supportsSkinTone,
  getEmojiSkinTone,
  getSavedSkinTone,
  saveSkinTone,
  clearSkinTone,
  getSkinToneOptions,
  getSkinToneName,
  getSkinTonePreview,
  applySkintoneToAll,
  removeSkinToneFromAll,
  getSkinToneVariants,
  getSkinToneVariantsWithLabels,
  isSameEmoji,
  isSameEmojiExact,
  parseSkinTone,
  getSkinToneClass,
  getSkinToneColor,
} from "./emoji-skin-tone";
