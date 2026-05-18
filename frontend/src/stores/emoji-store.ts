/**
 * Emoji Store - Zustand store for emoji state management
 *
 * Manages emoji autocomplete, recent/frequent tracking, custom emojis,
 * skin tone preferences, and picker state.
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  SkinTone,
  CustomEmoji,
  EmojiCategory,
  PickerState,
  PickerPosition,
  AutocompleteState,
  AutocompleteSuggestion,
  RecentEmoji,
  EmojiUsage,
  Emoji,
  EmojiStore,
} from "@/lib/emoji/emoji-types";

import {
  generateSuggestions,
  detectAutocompleteTrigger,
  INITIAL_AUTOCOMPLETE_STATE,
} from "@/lib/emoji/emoji-autocomplete";

import {
  getRecentEmojis,
  saveRecentEmojis,
  getFrequentEmojis,
  saveFrequentEmojis,
  getTopFrequentEmojis,
} from "@/lib/emoji/emoji-recent";

import {
  getLocalCustomEmojis,
  saveLocalCustomEmojis,
} from "@/lib/emoji/emoji-custom";

import { getSavedSkinTone, saveSkinTone } from "@/lib/emoji/emoji-skin-tone";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_QUICK_REACTIONS = [
  "\u{1F44D}", // thumbsup
  "\u{2764}\u{FE0F}", // heart
  "\u{1F602}", // joy
  "\u{1F389}", // tada
  "\u{1F914}", // thinking
  "\u{1F440}", // eyes
];

const DEFAULT_MAX_RECENT = 36;
const DEFAULT_MAX_SUGGESTIONS = 8;

// ============================================================================
// Initial State
// ============================================================================

const initialPickerState: PickerState = {
  isOpen: false,
  targetMessageId: null,
  targetChannelId: null,
  position: null,
  activeCategory: "recent",
  searchQuery: "",
  previewEmoji: null,
};

const initialState = {
  // Recent emojis
  recentEmojis: [] as RecentEmoji[],
  maxRecentEmojis: DEFAULT_MAX_RECENT,

  // Frequent emojis
  frequentEmojis: new Map<string, EmojiUsage>(),

  // Custom emojis
  customEmojis: new Map<string, CustomEmoji>(),
  customEmojiCategories: [] as string[],
  customEmojisLoaded: false,
  customEmojisLoading: false,
  customEmojisError: null as string | null,

  // Skin tone
  skinTone: "" as SkinTone,

  // Picker state
  picker: { ...initialPickerState },

  // Autocomplete state
  autocomplete: { ...INITIAL_AUTOCOMPLETE_STATE },

  // Quick reactions
  quickReactions: [...DEFAULT_QUICK_REACTIONS],

  // Settings
  autoReplaceShortcodes: true,
  showRecentFirst: true,
};

// ============================================================================
// Store
// ============================================================================

export const useEmojiStore = create<EmojiStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // ==================================================================
          // Recent Emojis
          // ==================================================================

          addRecentEmoji: (emoji, isCustom = false, customEmojiId) =>
            set(
              (state) => {
                const now = Date.now();

                // Remove if already exists
                state.recentEmojis = state.recentEmojis.filter((r) =>
                  isCustom
                    ? r.customEmojiId !== customEmojiId
                    : r.emoji !== emoji || r.isCustom,
                );

                // Add to front
                state.recentEmojis.unshift({
                  emoji,
                  isCustom,
                  customEmojiId,
                  usedAt: now,
                });

                // Trim to max
                if (state.recentEmojis.length > state.maxRecentEmojis) {
                  state.recentEmojis = state.recentEmojis.slice(
                    0,
                    state.maxRecentEmojis,
                  );
                }

                // Also record usage
                const existing = state.frequentEmojis.get(emoji);
                if (existing) {
                  state.frequentEmojis.set(emoji, {
                    ...existing,
                    count: existing.count + 1,
                    lastUsedAt: now,
                  });
                } else {
                  state.frequentEmojis.set(emoji, {
                    emoji,
                    isCustom,
                    customEmojiId,
                    count: 1,
                    lastUsedAt: now,
                    firstUsedAt: now,
                  });
                }
              },
              false,
              "emoji/addRecentEmoji",
            ),

          clearRecentEmojis: () =>
            set(
              (state) => {
                state.recentEmojis = [];
              },
              false,
              "emoji/clearRecentEmojis",
            ),

          setMaxRecentEmojis: (max) =>
            set(
              (state) => {
                state.maxRecentEmojis = max;
                if (state.recentEmojis.length > max) {
                  state.recentEmojis = state.recentEmojis.slice(0, max);
                }
              },
              false,
              "emoji/setMaxRecentEmojis",
            ),

          // ==================================================================
          // Frequent Emojis
          // ==================================================================

          recordEmojiUsage: (emoji, isCustom = false, customEmojiId) =>
            set(
              (state) => {
                const now = Date.now();
                const existing = state.frequentEmojis.get(emoji);

                if (existing) {
                  state.frequentEmojis.set(emoji, {
                    ...existing,
                    count: existing.count + 1,
                    lastUsedAt: now,
                  });
                } else {
                  state.frequentEmojis.set(emoji, {
                    emoji,
                    isCustom,
                    customEmojiId,
                    count: 1,
                    lastUsedAt: now,
                    firstUsedAt: now,
                  });
                }
              },
              false,
              "emoji/recordEmojiUsage",
            ),

          getTopEmojis: (count) => {
            const state = get();
            return Array.from(state.frequentEmojis.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, count)
              .map((u) => u.emoji);
          },

          clearFrequentEmojis: () =>
            set(
              (state) => {
                state.frequentEmojis.clear();
              },
              false,
              "emoji/clearFrequentEmojis",
            ),

          // ==================================================================
          // Custom Emojis
          // ==================================================================

          loadCustomEmojis: async () => {
            set(
              (state) => {
                state.customEmojisLoading = true;
                state.customEmojisError = null;
              },
              false,
              "emoji/loadCustomEmojis/start",
            );

            try {
              // Load from local storage for now
              // In production, this would fetch from API
              const local = getLocalCustomEmojis();

              set(
                (state) => {
                  state.customEmojis = local;
                  state.customEmojiCategories = Array.from(
                    new Set(
                      Array.from(local.values())
                        .map((e) => e.category)
                        .filter((c): c is string => !!c),
                    ),
                  );
                  state.customEmojisLoaded = true;
                  state.customEmojisLoading = false;
                },
                false,
                "emoji/loadCustomEmojis/success",
              );
            } catch (error) {
              set(
                (state) => {
                  state.customEmojisError =
                    error instanceof Error
                      ? error.message
                      : "Failed to load custom emojis";
                  state.customEmojisLoading = false;
                },
                false,
                "emoji/loadCustomEmojis/error",
              );
            }
          },

          addCustomEmoji: (emoji) =>
            set(
              (state) => {
                state.customEmojis.set(emoji.id, emoji);
                if (
                  emoji.category &&
                  !state.customEmojiCategories.includes(emoji.category)
                ) {
                  state.customEmojiCategories.push(emoji.category);
                }
              },
              false,
              "emoji/addCustomEmoji",
            ),

          updateCustomEmoji: (id, updates) =>
            set(
              (state) => {
                const existing = state.customEmojis.get(id);
                if (existing) {
                  state.customEmojis.set(id, {
                    ...existing,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                  });
                }
              },
              false,
              "emoji/updateCustomEmoji",
            ),

          removeCustomEmoji: (id) =>
            set(
              (state) => {
                state.customEmojis.delete(id);
              },
              false,
              "emoji/removeCustomEmoji",
            ),

          getCustomEmojiByShortcode: (shortcode) => {
            const state = get();
            const normalized = shortcode.toLowerCase().replace(/^:|:$/g, "");

            for (const emoji of state.customEmojis.values()) {
              if (
                emoji.name === normalized ||
                emoji.aliases.includes(normalized)
              ) {
                return emoji;
              }
            }

            return undefined;
          },

          // ==================================================================
          // Skin Tone
          // ==================================================================

          setSkinTone: (tone) =>
            set(
              (state) => {
                state.skinTone = tone;
                saveSkinTone(tone);
              },
              false,
              "emoji/setSkinTone",
            ),

          // ==================================================================
          // Picker
          // ==================================================================

          openPicker: (messageId, channelId, position) =>
            set(
              (state) => {
                state.picker.isOpen = true;
                state.picker.targetMessageId = messageId ?? null;
                state.picker.targetChannelId = channelId ?? null;
                state.picker.position = position ?? null;
                state.picker.searchQuery = "";
                state.picker.activeCategory = "recent";
              },
              false,
              "emoji/openPicker",
            ),

          closePicker: () =>
            set(
              (state) => {
                state.picker = { ...initialPickerState };
              },
              false,
              "emoji/closePicker",
            ),

          setPickerCategory: (category) =>
            set(
              (state) => {
                state.picker.activeCategory = category;
              },
              false,
              "emoji/setPickerCategory",
            ),

          setPickerSearch: (query) =>
            set(
              (state) => {
                state.picker.searchQuery = query;
              },
              false,
              "emoji/setPickerSearch",
            ),

          setPreviewEmoji: (emoji) =>
            set(
              (state) => {
                state.picker.previewEmoji = emoji;
              },
              false,
              "emoji/setPreviewEmoji",
            ),

          // ==================================================================
          // Autocomplete
          // ==================================================================

          startAutocomplete: (query, triggerPosition, cursorPosition) =>
            set(
              (state) => {
                const customEmojis = Array.from(
                  state.customEmojis.values(),
                ).filter((e) => e.enabled);
                const recentEmojis = state.recentEmojis.map((r) => r.emoji);

                const suggestions = generateSuggestions(
                  query,
                  {
                    maxSuggestions: DEFAULT_MAX_SUGGESTIONS,
                    includeCustom: true,
                    prioritizeRecent: state.showRecentFirst,
                  },
                  customEmojis,
                  recentEmojis,
                );

                state.autocomplete = {
                  isActive: suggestions.length > 0,
                  query,
                  suggestions,
                  selectedIndex: 0,
                  triggerPosition,
                  cursorPosition,
                };
              },
              false,
              "emoji/startAutocomplete",
            ),

          updateAutocomplete: (suggestions) =>
            set(
              (state) => {
                state.autocomplete.suggestions = suggestions;
                state.autocomplete.isActive = suggestions.length > 0;
                if (state.autocomplete.selectedIndex >= suggestions.length) {
                  state.autocomplete.selectedIndex = Math.max(
                    0,
                    suggestions.length - 1,
                  );
                }
              },
              false,
              "emoji/updateAutocomplete",
            ),

          setAutocompleteIndex: (index) =>
            set(
              (state) => {
                const maxIndex = state.autocomplete.suggestions.length - 1;
                state.autocomplete.selectedIndex = Math.max(
                  0,
                  Math.min(index, maxIndex),
                );
              },
              false,
              "emoji/setAutocompleteIndex",
            ),

          closeAutocomplete: () =>
            set(
              (state) => {
                state.autocomplete = { ...INITIAL_AUTOCOMPLETE_STATE };
              },
              false,
              "emoji/closeAutocomplete",
            ),

          // ==================================================================
          // Quick Reactions
          // ==================================================================

          setQuickReactions: (emojis) =>
            set(
              (state) => {
                state.quickReactions = emojis.slice(0, 6);
              },
              false,
              "emoji/setQuickReactions",
            ),

          addQuickReaction: (emoji) =>
            set(
              (state) => {
                if (!state.quickReactions.includes(emoji)) {
                  state.quickReactions = [
                    ...state.quickReactions.slice(0, 5),
                    emoji,
                  ];
                }
              },
              false,
              "emoji/addQuickReaction",
            ),

          removeQuickReaction: (emoji) =>
            set(
              (state) => {
                state.quickReactions = state.quickReactions.filter(
                  (e) => e !== emoji,
                );
              },
              false,
              "emoji/removeQuickReaction",
            ),

          // ==================================================================
          // Settings
          // ==================================================================

          setAutoReplaceShortcodes: (enabled) =>
            set(
              (state) => {
                state.autoReplaceShortcodes = enabled;
              },
              false,
              "emoji/setAutoReplaceShortcodes",
            ),

          setShowRecentFirst: (enabled) =>
            set(
              (state) => {
                state.showRecentFirst = enabled;
              },
              false,
              "emoji/setShowRecentFirst",
            ),

          // ==================================================================
          // Reset
          // ==================================================================

          reset: () =>
            set(
              () => ({
                ...initialState,
                frequentEmojis: new Map(),
                customEmojis: new Map(),
              }),
              false,
              "emoji/reset",
            ),
        })),
      ),
      {
        name: "nchat-emoji-store",
        // Custom serialization for Map objects
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;

            try {
              const data = JSON.parse(str);
              return {
                ...data,
                state: {
                  ...data.state,
                  frequentEmojis: new Map(data.state.frequentEmojis || []),
                  customEmojis: new Map(data.state.customEmojis || []),
                  // Load skin tone from dedicated storage
                  skinTone: getSavedSkinTone(),
                },
              };
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            const data = {
              ...value,
              state: {
                ...value.state,
                frequentEmojis: Array.from(
                  value.state.frequentEmojis.entries(),
                ),
                customEmojis: Array.from(value.state.customEmojis.entries()),
              },
            };
            localStorage.setItem(name, JSON.stringify(data));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
        // Only persist certain fields
        partialize: (state) =>
          ({
            recentEmojis: state.recentEmojis,
            frequentEmojis: state.frequentEmojis,
            customEmojis: state.customEmojis,
            customEmojiCategories: state.customEmojiCategories,
            skinTone: state.skinTone,
            quickReactions: state.quickReactions,
            maxRecentEmojis: state.maxRecentEmojis,
            autoReplaceShortcodes: state.autoReplaceShortcodes,
            showRecentFirst: state.showRecentFirst,
          }) as EmojiStore,
      },
    ),
    { name: "emoji-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectRecentEmojis = (state: EmojiStore) => state.recentEmojis;

export const selectRecentEmojiStrings = (state: EmojiStore) =>
  state.recentEmojis.map((r) => r.emoji);

export const selectFrequentEmojis = (state: EmojiStore) => state.frequentEmojis;

export const selectTopEmojis = (count: number) => (state: EmojiStore) =>
  Array.from(state.frequentEmojis.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map((u) => u.emoji);

export const selectCustomEmojis = (state: EmojiStore) =>
  Array.from(state.customEmojis.values());

export const selectEnabledCustomEmojis = (state: EmojiStore) =>
  Array.from(state.customEmojis.values()).filter((e) => e.enabled);

export const selectCustomEmojisByCategory =
  (category: string) => (state: EmojiStore) =>
    Array.from(state.customEmojis.values()).filter(
      (e) => e.category === category,
    );

export const selectCustomEmojiCategories = (state: EmojiStore) =>
  state.customEmojiCategories;

export const selectCustomEmojisLoaded = (state: EmojiStore) =>
  state.customEmojisLoaded;

export const selectCustomEmojisLoading = (state: EmojiStore) =>
  state.customEmojisLoading;

export const selectSkinTone = (state: EmojiStore) => state.skinTone;

export const selectPicker = (state: EmojiStore) => state.picker;

export const selectPickerIsOpen = (state: EmojiStore) => state.picker.isOpen;

export const selectPickerCategory = (state: EmojiStore) =>
  state.picker.activeCategory;

export const selectPickerSearch = (state: EmojiStore) =>
  state.picker.searchQuery;

export const selectPreviewEmoji = (state: EmojiStore) =>
  state.picker.previewEmoji;

export const selectAutocomplete = (state: EmojiStore) => state.autocomplete;

export const selectAutocompleteIsActive = (state: EmojiStore) =>
  state.autocomplete.isActive;

export const selectAutocompleteSuggestions = (state: EmojiStore) =>
  state.autocomplete.suggestions;

export const selectAutocompleteIndex = (state: EmojiStore) =>
  state.autocomplete.selectedIndex;

export const selectQuickReactions = (state: EmojiStore) => state.quickReactions;

export const selectAutoReplaceShortcodes = (state: EmojiStore) =>
  state.autoReplaceShortcodes;

export const selectShowRecentFirst = (state: EmojiStore) =>
  state.showRecentFirst;

// ============================================================================
// Derived Selectors
// ============================================================================

export const selectCurrentAutocompleteSuggestion = (state: EmojiStore) => {
  const { suggestions, selectedIndex } = state.autocomplete;
  return suggestions[selectedIndex] ?? null;
};

export const selectPickerTarget = (state: EmojiStore) => ({
  messageId: state.picker.targetMessageId,
  channelId: state.picker.targetChannelId,
});
