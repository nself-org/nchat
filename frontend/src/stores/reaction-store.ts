/**
 * Reaction Store - Manages reaction state for the nself-chat application
 *
 * Handles recent reactions, frequently used reactions, and reaction preferences
 * Includes custom emoji support and reaction quick-access
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface CustomEmoji {
  id: string;
  name: string;
  shortcode: string; // :emoji_name:
  url: string;
  category?: string;
  createdBy?: string;
  createdAt: string;
  aliases?: string[];
}

export interface ReactionUsage {
  emoji: string;
  count: number;
  lastUsedAt: number;
}

export interface ReactionPickerState {
  isOpen: boolean;
  targetMessageId: string | null;
  targetChannelId: string | null;
  position: { x: number; y: number } | null;
  activeCategory: string;
  searchQuery: string;
}

export interface ReactionState {
  // Recent reactions (most recently used)
  recentReactions: string[];

  // Frequently used reactions (by usage count)
  frequentReactions: Map<string, ReactionUsage>;

  // Quick reactions (customizable bar)
  quickReactions: string[];

  // Custom emoji
  customEmojis: Map<string, CustomEmoji>;
  customEmojiCategories: string[];

  // Skin tone preference
  skinTone: "" | "1F3FB" | "1F3FC" | "1F3FD" | "1F3FE" | "1F3FF";

  // Reaction picker state
  picker: ReactionPickerState;

  // Configuration
  maxRecentReactions: number;
  maxQuickReactions: number;
}

export interface ReactionActions {
  // Recording reactions
  recordReaction: (emoji: string) => void;

  // Recent reactions
  addRecentReaction: (emoji: string) => void;
  clearRecentReactions: () => void;

  // Frequent reactions
  getTopReactions: (count: number) => string[];
  clearFrequentReactions: () => void;

  // Quick reactions
  setQuickReactions: (emojis: string[]) => void;
  addQuickReaction: (emoji: string) => void;
  removeQuickReaction: (emoji: string) => void;
  reorderQuickReaction: (fromIndex: number, toIndex: number) => void;
  resetQuickReactions: () => void;

  // Custom emoji
  addCustomEmoji: (emoji: CustomEmoji) => void;
  removeCustomEmoji: (emojiId: string) => void;
  updateCustomEmoji: (emojiId: string, updates: Partial<CustomEmoji>) => void;
  setCustomEmojis: (emojis: CustomEmoji[]) => void;
  getCustomEmojiByShortcode: (shortcode: string) => CustomEmoji | undefined;

  // Skin tone
  setSkinTone: (tone: ReactionState["skinTone"]) => void;

  // Picker state
  openPicker: (
    messageId: string,
    channelId: string,
    position?: { x: number; y: number },
  ) => void;
  closePicker: () => void;
  setPickerCategory: (category: string) => void;
  setPickerSearchQuery: (query: string) => void;

  // Configuration
  setMaxRecentReactions: (max: number) => void;
  setMaxQuickReactions: (max: number) => void;

  // Utility
  reset: () => void;
}

export type ReactionStore = ReactionState & ReactionActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_QUICK_REACTIONS = [
  "👍", // thumbs up
  "❤️", // heart
  "😂", // joy
  "😮", // open mouth (wow)
  "😢", // sad
  "🎉", // celebration
];

const DEFAULT_MAX_RECENT = 24;
const DEFAULT_MAX_QUICK = 6;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ReactionState = {
  recentReactions: [],
  frequentReactions: new Map(),
  quickReactions: [...DEFAULT_QUICK_REACTIONS],
  customEmojis: new Map(),
  customEmojiCategories: [],
  skinTone: "",
  picker: {
    isOpen: false,
    targetMessageId: null,
    targetChannelId: null,
    position: null,
    activeCategory: "recent",
    searchQuery: "",
  },
  maxRecentReactions: DEFAULT_MAX_RECENT,
  maxQuickReactions: DEFAULT_MAX_QUICK,
};

// ============================================================================
// Store
// ============================================================================

export const useReactionStore = create<ReactionStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Recording reactions (updates both recent and frequent)
          recordReaction: (emoji) =>
            set(
              (state) => {
                // Update recent reactions
                state.recentReactions = [
                  emoji,
                  ...state.recentReactions.filter((e) => e !== emoji),
                ].slice(0, state.maxRecentReactions);

                // Update frequent reactions
                const usage = state.frequentReactions.get(emoji) || {
                  emoji,
                  count: 0,
                  lastUsedAt: 0,
                };
                state.frequentReactions.set(emoji, {
                  ...usage,
                  count: usage.count + 1,
                  lastUsedAt: Date.now(),
                });
              },
              false,
              "reaction/recordReaction",
            ),

          // Recent reactions
          addRecentReaction: (emoji) =>
            set(
              (state) => {
                state.recentReactions = [
                  emoji,
                  ...state.recentReactions.filter((e) => e !== emoji),
                ].slice(0, state.maxRecentReactions);
              },
              false,
              "reaction/addRecentReaction",
            ),

          clearRecentReactions: () =>
            set(
              (state) => {
                state.recentReactions = [];
              },
              false,
              "reaction/clearRecentReactions",
            ),

          // Frequent reactions
          getTopReactions: (count) => {
            const state = get();
            return Array.from(state.frequentReactions.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, count)
              .map((r) => r.emoji);
          },

          clearFrequentReactions: () =>
            set(
              (state) => {
                state.frequentReactions.clear();
              },
              false,
              "reaction/clearFrequentReactions",
            ),

          // Quick reactions
          setQuickReactions: (emojis) =>
            set(
              (state) => {
                state.quickReactions = emojis.slice(0, state.maxQuickReactions);
              },
              false,
              "reaction/setQuickReactions",
            ),

          addQuickReaction: (emoji) =>
            set(
              (state) => {
                if (!state.quickReactions.includes(emoji)) {
                  state.quickReactions = [...state.quickReactions, emoji].slice(
                    0,
                    state.maxQuickReactions,
                  );
                }
              },
              false,
              "reaction/addQuickReaction",
            ),

          removeQuickReaction: (emoji) =>
            set(
              (state) => {
                state.quickReactions = state.quickReactions.filter(
                  (e) => e !== emoji,
                );
              },
              false,
              "reaction/removeQuickReaction",
            ),

          reorderQuickReaction: (fromIndex, toIndex) =>
            set(
              (state) => {
                const newQuickReactions = [...state.quickReactions];
                const [removed] = newQuickReactions.splice(fromIndex, 1);
                newQuickReactions.splice(toIndex, 0, removed);
                state.quickReactions = newQuickReactions;
              },
              false,
              "reaction/reorderQuickReaction",
            ),

          resetQuickReactions: () =>
            set(
              (state) => {
                state.quickReactions = [...DEFAULT_QUICK_REACTIONS];
              },
              false,
              "reaction/resetQuickReactions",
            ),

          // Custom emoji
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
              "reaction/addCustomEmoji",
            ),

          removeCustomEmoji: (emojiId) =>
            set(
              (state) => {
                state.customEmojis.delete(emojiId);
              },
              false,
              "reaction/removeCustomEmoji",
            ),

          updateCustomEmoji: (emojiId, updates) =>
            set(
              (state) => {
                const emoji = state.customEmojis.get(emojiId);
                if (emoji) {
                  state.customEmojis.set(emojiId, { ...emoji, ...updates });
                }
              },
              false,
              "reaction/updateCustomEmoji",
            ),

          setCustomEmojis: (emojis) =>
            set(
              (state) => {
                state.customEmojis = new Map(emojis.map((e) => [e.id, e]));
                const categories = new Set<string>();
                emojis.forEach((e) => {
                  if (e.category) categories.add(e.category);
                });
                state.customEmojiCategories = Array.from(categories);
              },
              false,
              "reaction/setCustomEmojis",
            ),

          getCustomEmojiByShortcode: (shortcode) => {
            const state = get();
            return Array.from(state.customEmojis.values()).find(
              (e) =>
                e.shortcode === shortcode || e.aliases?.includes(shortcode),
            );
          },

          // Skin tone
          setSkinTone: (tone) =>
            set(
              (state) => {
                state.skinTone = tone;
              },
              false,
              "reaction/setSkinTone",
            ),

          // Picker state
          openPicker: (messageId, channelId, position) =>
            set(
              (state) => {
                state.picker.isOpen = true;
                state.picker.targetMessageId = messageId;
                state.picker.targetChannelId = channelId;
                state.picker.position = position ?? null;
                state.picker.searchQuery = "";
              },
              false,
              "reaction/openPicker",
            ),

          closePicker: () =>
            set(
              (state) => {
                state.picker.isOpen = false;
                state.picker.targetMessageId = null;
                state.picker.targetChannelId = null;
                state.picker.position = null;
                state.picker.searchQuery = "";
              },
              false,
              "reaction/closePicker",
            ),

          setPickerCategory: (category) =>
            set(
              (state) => {
                state.picker.activeCategory = category;
              },
              false,
              "reaction/setPickerCategory",
            ),

          setPickerSearchQuery: (query) =>
            set(
              (state) => {
                state.picker.searchQuery = query;
              },
              false,
              "reaction/setPickerSearchQuery",
            ),

          // Configuration
          setMaxRecentReactions: (max) =>
            set(
              (state) => {
                state.maxRecentReactions = max;
                // Trim recent if necessary
                if (state.recentReactions.length > max) {
                  state.recentReactions = state.recentReactions.slice(0, max);
                }
              },
              false,
              "reaction/setMaxRecentReactions",
            ),

          setMaxQuickReactions: (max) =>
            set(
              (state) => {
                state.maxQuickReactions = max;
                // Trim quick reactions if necessary
                if (state.quickReactions.length > max) {
                  state.quickReactions = state.quickReactions.slice(0, max);
                }
              },
              false,
              "reaction/setMaxQuickReactions",
            ),

          // Utility
          reset: () =>
            set(
              () => ({
                ...initialState,
                frequentReactions: new Map(),
                customEmojis: new Map(),
              }),
              false,
              "reaction/reset",
            ),
        })),
      ),
      {
        name: "nchat-reactions",
        // Custom serialization for Map objects
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const data = JSON.parse(str);
            return {
              ...data,
              state: {
                ...data.state,
                frequentReactions: new Map(data.state.frequentReactions || []),
                customEmojis: new Map(data.state.customEmojis || []),
              },
            };
          },
          setItem: (name, value) => {
            const data = {
              ...value,
              state: {
                ...value.state,
                frequentReactions: Array.from(
                  value.state.frequentReactions.entries(),
                ),
                customEmojis: Array.from(value.state.customEmojis.entries()),
              },
            };
            localStorage.setItem(name, JSON.stringify(data));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
        // Only persist certain fields (picker state is transient)
        partialize: (state) =>
          ({
            recentReactions: state.recentReactions,
            frequentReactions: state.frequentReactions,
            quickReactions: state.quickReactions,
            customEmojis: state.customEmojis,
            customEmojiCategories: state.customEmojiCategories,
            skinTone: state.skinTone,
            maxRecentReactions: state.maxRecentReactions,
            maxQuickReactions: state.maxQuickReactions,
          }) as ReactionStore,
      },
    ),
    { name: "reaction-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectRecentReactions = (state: ReactionStore) =>
  state.recentReactions;

export const selectQuickReactions = (state: ReactionStore) =>
  state.quickReactions;

export const selectSkinTone = (state: ReactionStore) => state.skinTone;

export const selectPickerState = (state: ReactionStore) => state.picker;

export const selectIsPickerOpen = (state: ReactionStore) => state.picker.isOpen;

export const selectPickerTarget = (state: ReactionStore) => ({
  messageId: state.picker.targetMessageId,
  channelId: state.picker.targetChannelId,
});

export const selectCustomEmojis = (state: ReactionStore) =>
  Array.from(state.customEmojis.values());

export const selectCustomEmojisByCategory =
  (category: string) => (state: ReactionStore) =>
    Array.from(state.customEmojis.values()).filter(
      (e) => e.category === category,
    );

export const selectTopReactions = (count: number) => (state: ReactionStore) =>
  Array.from(state.frequentReactions.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map((r) => r.emoji);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Apply skin tone modifier to an emoji
 */
export const applyEmojiSkinTone = (
  emoji: string,
  skinTone: ReactionState["skinTone"],
): string => {
  if (!skinTone) return emoji;

  // List of emojis that support skin tone modifiers
  const skinToneEmojis = [
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👍",
    "👎",
    "✊",
    "👊",
    "🤛",
    "🤜",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🙏",
    "✍️",
    "💅",
    "🤳",
    "💪",
    "🦵",
    "🦶",
    "👂",
    "🦻",
    "👃",
    "👶",
    "🧒",
    "👦",
    "👧",
    "🧑",
    "👱",
    "👨",
    "🧔",
    "👩",
    "🧓",
    "👴",
    "👵",
    "🙍",
    "🙎",
    "🙅",
    "🙆",
    "💁",
    "🙋",
    "🧏",
    "🙇",
    "🤦",
    "🤷",
    "👮",
    "🕵️",
    "💂",
    "👷",
    "🤴",
    "👸",
    "👳",
    "👲",
    "🧕",
    "🤵",
    "👰",
    "🤰",
    "🤱",
    "👼",
    "🎅",
    "🤶",
    "🦸",
    "🦹",
    "🧙",
    "🧚",
    "🧛",
    "🧜",
    "🧝",
    "🧞",
    "🧟",
    "💆",
    "💇",
    "🚶",
    "🧍",
    "🧎",
    "🏃",
    "💃",
    "🕺",
    "🕴️",
    "🧖",
    "🧗",
    "🤸",
    "🏌️",
    "🏇",
    "⛷️",
    "🏂",
    "🏋️",
    "🤼",
    "🤽",
    "🤾",
    "🤺",
    "⛹️",
    "🏊",
    "🚣",
    "🧘",
    "🛀",
    "🛌",
  ];

  // Check if emoji supports skin tone
  // Remove existing skin tone modifiers (U+1F3FB through U+1F3FF)
  const skinToneModifiers = /\uD83C[\uDFFB-\uDFFF]/g;
  const baseEmoji = emoji.replace(skinToneModifiers, "");
  if (!skinToneEmojis.includes(baseEmoji)) {
    return emoji;
  }

  // Apply skin tone
  return baseEmoji + String.fromCodePoint(parseInt(skinTone, 16));
};

/**
 * Get emoji categories for picker
 */
export const getEmojiCategories = (): string[] => [
  "recent",
  "smileys",
  "people",
  "animals",
  "food",
  "travel",
  "activities",
  "objects",
  "symbols",
  "flags",
  "custom",
];

/**
 * Category labels for display
 */
export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    recent: "Recently Used",
    smileys: "Smileys & Emotion",
    people: "People & Body",
    animals: "Animals & Nature",
    food: "Food & Drink",
    travel: "Travel & Places",
    activities: "Activities",
    objects: "Objects",
    symbols: "Symbols",
    flags: "Flags",
    custom: "Custom",
  };
  return labels[category] || category;
};

/**
 * Category icons for picker tabs
 */
export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    recent: "🕐",
    smileys: "😀",
    people: "👋",
    animals: "🐱",
    food: "🍕",
    travel: "✈️",
    activities: "⚽",
    objects: "💡",
    symbols: "❤️",
    flags: "🏳️",
    custom: "⭐",
  };
  return icons[category] || "📁";
};
