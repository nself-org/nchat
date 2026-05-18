/**
 * Tests for emoji-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { EmojiStore } from "@/lib/emoji/emoji-types";
import {
  selectRecentEmojis,
  selectRecentEmojiStrings,
  selectFrequentEmojis,
  selectTopEmojis,
  selectCustomEmojis,
  selectEnabledCustomEmojis,
  selectCustomEmojisByCategory,
  selectCustomEmojiCategories,
  selectCustomEmojisLoaded,
  selectCustomEmojisLoading,
  selectSkinTone,
  selectPicker,
  selectPickerIsOpen,
  selectPickerCategory,
  selectPickerSearch,
  selectPreviewEmoji,
  selectAutocomplete,
  selectAutocompleteIsActive,
  selectAutocompleteSuggestions,
  selectAutocompleteIndex,
  selectQuickReactions,
  selectAutoReplaceShortcodes,
  selectShowRecentFirst,
  selectCurrentAutocompleteSuggestion,
  selectPickerTarget,
} from "../emoji-store";

import type {
  RecentEmoji,
  EmojiUsage,
  CustomEmoji,
  PickerState,
  AutocompleteState,
  AutocompleteSuggestion,
} from "@/lib/emoji/emoji-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecentEmoji(overrides?: Partial<RecentEmoji>): RecentEmoji {
  return {
    emoji: "👍",
    isCustom: false,
    usedAt: Date.now(),
    ...overrides,
  };
}

function makeEmojiUsage(overrides?: Partial<EmojiUsage>): EmojiUsage {
  return {
    emoji: "👍",
    isCustom: false,
    count: 1,
    lastUsedAt: Date.now(),
    firstUsedAt: Date.now(),
    ...overrides,
  };
}

function makeCustomEmoji(overrides?: Partial<CustomEmoji>): CustomEmoji {
  return {
    id: "custom1",
    name: "logo",
    shortcode: ":logo:",
    url: "https://example.com/logo.png",
    aliases: [],
    createdBy: "user1",
    createdAt: "2026-01-01T00:00:00Z",
    enabled: true,
    usageCount: 0,
    ...overrides,
  } as CustomEmoji;
}

function makePicker(overrides?: Partial<PickerState>): PickerState {
  return {
    isOpen: false,
    targetMessageId: null,
    targetChannelId: null,
    position: null,
    activeCategory: "recent",
    searchQuery: "",
    previewEmoji: null,
    ...overrides,
  } as PickerState;
}

function makeAutocomplete(
  overrides?: Partial<AutocompleteState>,
): AutocompleteState {
  return {
    isActive: false,
    query: "",
    suggestions: [],
    selectedIndex: 0,
    triggerPosition: 0,
    cursorPosition: 0,
    ...overrides,
  } as AutocompleteState;
}

function makeState(overrides?: Partial<EmojiStore>): EmojiStore {
  const defaultState = {
    recentEmojis: [] as RecentEmoji[],
    maxRecentEmojis: 36,
    frequentEmojis: new Map<string, EmojiUsage>(),
    customEmojis: new Map<string, CustomEmoji>(),
    customEmojiCategories: [] as string[],
    customEmojisLoaded: false,
    customEmojisLoading: false,
    customEmojisError: null as string | null,
    skinTone: "" as const,
    picker: makePicker(),
    autocomplete: makeAutocomplete(),
    quickReactions: ["👍", "❤️", "😂", "🎉", "🤔", "👀"],
    autoReplaceShortcodes: true,
    showRecentFirst: true,
  };
  return { ...defaultState, ...overrides } as unknown as EmojiStore;
}

// ---------------------------------------------------------------------------
// selectRecentEmojis
// ---------------------------------------------------------------------------

describe("selectRecentEmojis", () => {
  it("returns empty array by default", () => {
    expect(selectRecentEmojis(makeState())).toEqual([]);
  });

  it("returns the recent emojis array", () => {
    const recentEmojis = [makeRecentEmoji({ emoji: "😀" })];
    expect(selectRecentEmojis(makeState({ recentEmojis }))).toBe(recentEmojis);
  });
});

// ---------------------------------------------------------------------------
// selectRecentEmojiStrings
// ---------------------------------------------------------------------------

describe("selectRecentEmojiStrings", () => {
  it("returns empty array when no recents", () => {
    expect(selectRecentEmojiStrings(makeState())).toEqual([]);
  });

  it("returns just the emoji strings", () => {
    const recentEmojis = [
      makeRecentEmoji({ emoji: "😀" }),
      makeRecentEmoji({ emoji: "👍" }),
    ];
    const result = selectRecentEmojiStrings(makeState({ recentEmojis }));
    expect(result).toEqual(["😀", "👍"]);
  });
});

// ---------------------------------------------------------------------------
// selectFrequentEmojis
// ---------------------------------------------------------------------------

describe("selectFrequentEmojis", () => {
  it("returns empty map by default", () => {
    const result = selectFrequentEmojis(makeState());
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("returns the frequent emojis map", () => {
    const frequentEmojis = new Map([
      ["👍", makeEmojiUsage({ emoji: "👍", count: 5 })],
    ]);
    expect(selectFrequentEmojis(makeState({ frequentEmojis }))).toBe(
      frequentEmojis,
    );
  });
});

// ---------------------------------------------------------------------------
// selectTopEmojis (factory selector)
// ---------------------------------------------------------------------------

describe("selectTopEmojis", () => {
  it("returns empty array when no frequent emojis", () => {
    const selector = selectTopEmojis(5);
    expect(selector(makeState())).toEqual([]);
  });

  it("returns emojis sorted by count descending", () => {
    const frequentEmojis = new Map([
      ["😀", makeEmojiUsage({ emoji: "😀", count: 3 })],
      ["👍", makeEmojiUsage({ emoji: "👍", count: 10 })],
      ["❤️", makeEmojiUsage({ emoji: "❤️", count: 7 })],
    ]);
    const selector = selectTopEmojis(3);
    const result = selector(makeState({ frequentEmojis }));
    expect(result).toEqual(["👍", "❤️", "😀"]);
  });

  it("respects the count limit", () => {
    const frequentEmojis = new Map([
      ["😀", makeEmojiUsage({ emoji: "😀", count: 3 })],
      ["👍", makeEmojiUsage({ emoji: "👍", count: 10 })],
      ["❤️", makeEmojiUsage({ emoji: "❤️", count: 7 })],
    ]);
    const selector = selectTopEmojis(2);
    const result = selector(makeState({ frequentEmojis }));
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("👍");
    expect(result[1]).toBe("❤️");
  });

  it("returns all if count is larger than available", () => {
    const frequentEmojis = new Map([
      ["👍", makeEmojiUsage({ emoji: "👍", count: 5 })],
    ]);
    const selector = selectTopEmojis(10);
    const result = selector(makeState({ frequentEmojis }));
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojis
// ---------------------------------------------------------------------------

describe("selectCustomEmojis", () => {
  it("returns empty array when no custom emojis", () => {
    expect(selectCustomEmojis(makeState())).toEqual([]);
  });

  it("returns values from the custom emoji map", () => {
    const ce1 = makeCustomEmoji({ id: "c1", name: "logo" });
    const ce2 = makeCustomEmoji({ id: "c2", name: "rocket" });
    const customEmojis = new Map([
      ["c1", ce1],
      ["c2", ce2],
    ]);
    const result = selectCustomEmojis(makeState({ customEmojis }));
    expect(result).toHaveLength(2);
    expect(result).toContain(ce1);
    expect(result).toContain(ce2);
  });
});

// ---------------------------------------------------------------------------
// selectEnabledCustomEmojis
// ---------------------------------------------------------------------------

describe("selectEnabledCustomEmojis", () => {
  it("returns empty array when no custom emojis", () => {
    expect(selectEnabledCustomEmojis(makeState())).toEqual([]);
  });

  it("filters out disabled emojis", () => {
    const enabled = makeCustomEmoji({ id: "c1", name: "logo", enabled: true });
    const disabled = makeCustomEmoji({
      id: "c2",
      name: "draft",
      enabled: false,
    });
    const customEmojis = new Map([
      ["c1", enabled],
      ["c2", disabled],
    ]);
    const result = selectEnabledCustomEmojis(makeState({ customEmojis }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(enabled);
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojisByCategory (factory selector)
// ---------------------------------------------------------------------------

describe("selectCustomEmojisByCategory", () => {
  it("returns empty array when no custom emojis", () => {
    const selector = selectCustomEmojisByCategory("branding");
    expect(selector(makeState())).toEqual([]);
  });

  it("returns only emojis in the given category", () => {
    const branding = makeCustomEmoji({
      id: "c1",
      name: "logo",
      category: "branding",
    });
    const fun = makeCustomEmoji({ id: "c2", name: "rocket", category: "fun" });
    const customEmojis = new Map([
      ["c1", branding],
      ["c2", fun],
    ]);
    const selector = selectCustomEmojisByCategory("branding");
    const result = selector(makeState({ customEmojis }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(branding);
  });

  it("returns empty array when category has no emojis", () => {
    const customEmojis = new Map([
      ["c1", makeCustomEmoji({ id: "c1", category: "fun" })],
    ]);
    const selector = selectCustomEmojisByCategory("branding");
    expect(selector(makeState({ customEmojis }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojiCategories
// ---------------------------------------------------------------------------

describe("selectCustomEmojiCategories", () => {
  it("returns empty array by default", () => {
    expect(selectCustomEmojiCategories(makeState())).toEqual([]);
  });

  it("returns the category list", () => {
    const customEmojiCategories = ["branding", "fun", "reactions"];
    expect(
      selectCustomEmojiCategories(makeState({ customEmojiCategories })),
    ).toEqual(customEmojiCategories);
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojisLoaded
// ---------------------------------------------------------------------------

describe("selectCustomEmojisLoaded", () => {
  it("returns false by default", () => {
    expect(selectCustomEmojisLoaded(makeState())).toBe(false);
  });

  it("returns true when loaded", () => {
    expect(
      selectCustomEmojisLoaded(makeState({ customEmojisLoaded: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojisLoading
// ---------------------------------------------------------------------------

describe("selectCustomEmojisLoading", () => {
  it("returns false by default", () => {
    expect(selectCustomEmojisLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(
      selectCustomEmojisLoading(makeState({ customEmojisLoading: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectSkinTone
// ---------------------------------------------------------------------------

describe("selectSkinTone", () => {
  it("returns empty string by default", () => {
    expect(selectSkinTone(makeState())).toBe("");
  });

  it("returns the skin tone when set", () => {
    expect(selectSkinTone(makeState({ skinTone: "1F3FB" }))).toBe("1F3FB");
  });
});

// ---------------------------------------------------------------------------
// selectPicker
// ---------------------------------------------------------------------------

describe("selectPicker", () => {
  it("returns the picker state", () => {
    const picker = makePicker({ isOpen: true });
    expect(selectPicker(makeState({ picker }))).toBe(picker);
  });

  it("returns default picker with isOpen false", () => {
    expect(selectPicker(makeState()).isOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectPickerIsOpen
// ---------------------------------------------------------------------------

describe("selectPickerIsOpen", () => {
  it("returns false by default", () => {
    expect(selectPickerIsOpen(makeState())).toBe(false);
  });

  it("returns true when open", () => {
    const picker = makePicker({ isOpen: true });
    expect(selectPickerIsOpen(makeState({ picker }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPickerCategory
// ---------------------------------------------------------------------------

describe("selectPickerCategory", () => {
  it("returns recent by default", () => {
    expect(selectPickerCategory(makeState())).toBe("recent");
  });

  it("returns the active category", () => {
    const picker = makePicker({ activeCategory: "smileys" });
    expect(selectPickerCategory(makeState({ picker }))).toBe("smileys");
  });
});

// ---------------------------------------------------------------------------
// selectPickerSearch
// ---------------------------------------------------------------------------

describe("selectPickerSearch", () => {
  it("returns empty string by default", () => {
    expect(selectPickerSearch(makeState())).toBe("");
  });

  it("returns the search query", () => {
    const picker = makePicker({ searchQuery: "smile" });
    expect(selectPickerSearch(makeState({ picker }))).toBe("smile");
  });
});

// ---------------------------------------------------------------------------
// selectPreviewEmoji
// ---------------------------------------------------------------------------

describe("selectPreviewEmoji", () => {
  it("returns null by default", () => {
    expect(selectPreviewEmoji(makeState())).toBeNull();
  });

  it("returns the preview emoji when set", () => {
    const previewEmoji = {
      id: "thumbsup",
      emoji: "👍",
      name: "thumbsup",
      displayName: "Thumbs Up",
      category: "people" as const,
      keywords: [],
      aliases: [],
      supportsSkinTone: true,
    };
    const picker = makePicker({ previewEmoji });
    expect(selectPreviewEmoji(makeState({ picker }))).toBe(previewEmoji);
  });
});

// ---------------------------------------------------------------------------
// selectAutocomplete
// ---------------------------------------------------------------------------

describe("selectAutocomplete", () => {
  it("returns the autocomplete state", () => {
    const autocomplete = makeAutocomplete({ isActive: true });
    expect(selectAutocomplete(makeState({ autocomplete }))).toBe(autocomplete);
  });
});

// ---------------------------------------------------------------------------
// selectAutocompleteIsActive
// ---------------------------------------------------------------------------

describe("selectAutocompleteIsActive", () => {
  it("returns false by default", () => {
    expect(selectAutocompleteIsActive(makeState())).toBe(false);
  });

  it("returns true when active", () => {
    const autocomplete = makeAutocomplete({ isActive: true });
    expect(selectAutocompleteIsActive(makeState({ autocomplete }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectAutocompleteSuggestions
// ---------------------------------------------------------------------------

describe("selectAutocompleteSuggestions", () => {
  it("returns empty array by default", () => {
    expect(selectAutocompleteSuggestions(makeState())).toEqual([]);
  });

  it("returns the suggestions array", () => {
    const suggestion: AutocompleteSuggestion = {
      id: "thumbsup",
      emoji: "👍",
      shortcode: ":thumbsup:",
      isCustom: false,
      displayName: "Thumbs Up",
      preview: "👍",
    };
    const autocomplete = makeAutocomplete({ suggestions: [suggestion] });
    const result = selectAutocompleteSuggestions(makeState({ autocomplete }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(suggestion);
  });
});

// ---------------------------------------------------------------------------
// selectAutocompleteIndex
// ---------------------------------------------------------------------------

describe("selectAutocompleteIndex", () => {
  it("returns 0 by default", () => {
    expect(selectAutocompleteIndex(makeState())).toBe(0);
  });

  it("returns the selected index", () => {
    const autocomplete = makeAutocomplete({ selectedIndex: 2 });
    expect(selectAutocompleteIndex(makeState({ autocomplete }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectQuickReactions
// ---------------------------------------------------------------------------

describe("selectQuickReactions", () => {
  it("returns the quick reactions array", () => {
    const quickReactions = ["👍", "❤️"];
    const result = selectQuickReactions(makeState({ quickReactions }));
    expect(result).toBe(quickReactions);
  });

  it("returns default quick reactions when not overridden", () => {
    const result = selectQuickReactions(makeState());
    expect(result).toHaveLength(6);
    expect(result[0]).toBe("👍");
  });
});

// ---------------------------------------------------------------------------
// selectAutoReplaceShortcodes
// ---------------------------------------------------------------------------

describe("selectAutoReplaceShortcodes", () => {
  it("returns true by default", () => {
    expect(selectAutoReplaceShortcodes(makeState())).toBe(true);
  });

  it("returns false when disabled", () => {
    expect(
      selectAutoReplaceShortcodes(makeState({ autoReplaceShortcodes: false })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectShowRecentFirst
// ---------------------------------------------------------------------------

describe("selectShowRecentFirst", () => {
  it("returns true by default", () => {
    expect(selectShowRecentFirst(makeState())).toBe(true);
  });

  it("returns false when disabled", () => {
    expect(selectShowRecentFirst(makeState({ showRecentFirst: false }))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// selectCurrentAutocompleteSuggestion (derived)
// ---------------------------------------------------------------------------

describe("selectCurrentAutocompleteSuggestion", () => {
  it("returns null when no suggestions", () => {
    expect(selectCurrentAutocompleteSuggestion(makeState())).toBeNull();
  });

  it("returns the suggestion at the selected index", () => {
    const s0: AutocompleteSuggestion = {
      id: "thumbsup",
      emoji: "👍",
      shortcode: ":thumbsup:",
      isCustom: false,
      displayName: "Thumbs Up",
      preview: "👍",
    };
    const s1: AutocompleteSuggestion = {
      id: "joy",
      emoji: "😂",
      shortcode: ":joy:",
      isCustom: false,
      displayName: "Joy",
      preview: "😂",
    };
    const autocomplete = makeAutocomplete({
      suggestions: [s0, s1],
      selectedIndex: 1,
    });
    expect(
      selectCurrentAutocompleteSuggestion(makeState({ autocomplete })),
    ).toBe(s1);
  });

  it("returns null when selectedIndex is out of bounds", () => {
    const autocomplete = makeAutocomplete({
      suggestions: [],
      selectedIndex: 5,
    });
    expect(
      selectCurrentAutocompleteSuggestion(makeState({ autocomplete })),
    ).toBeNull();
  });

  it("returns first suggestion when selectedIndex is 0", () => {
    const s0: AutocompleteSuggestion = {
      id: "thumbsup",
      emoji: "👍",
      shortcode: ":thumbsup:",
      isCustom: false,
      displayName: "Thumbs Up",
      preview: "👍",
    };
    const autocomplete = makeAutocomplete({
      suggestions: [s0],
      selectedIndex: 0,
    });
    expect(
      selectCurrentAutocompleteSuggestion(makeState({ autocomplete })),
    ).toBe(s0);
  });
});

// ---------------------------------------------------------------------------
// selectPickerTarget (derived)
// ---------------------------------------------------------------------------

describe("selectPickerTarget", () => {
  it("returns null messageId and channelId by default", () => {
    const target = selectPickerTarget(makeState());
    expect(target.messageId).toBeNull();
    expect(target.channelId).toBeNull();
  });

  it("returns the target messageId and channelId", () => {
    const picker = makePicker({
      targetMessageId: "msg123",
      targetChannelId: "ch456",
    });
    const target = selectPickerTarget(makeState({ picker }));
    expect(target.messageId).toBe("msg123");
    expect(target.channelId).toBe("ch456");
  });

  it("returns just the messageId when channelId is null", () => {
    const picker = makePicker({
      targetMessageId: "msg1",
      targetChannelId: null,
    });
    const target = selectPickerTarget(makeState({ picker }));
    expect(target.messageId).toBe("msg1");
    expect(target.channelId).toBeNull();
  });
});
