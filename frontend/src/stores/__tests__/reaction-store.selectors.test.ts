/**
 * Tests for reaction-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  ReactionStore,
  ReactionPickerState,
  CustomEmoji,
  ReactionUsage,
} from "../reaction-store";
import {
  selectRecentReactions,
  selectQuickReactions,
  selectSkinTone,
  selectPickerState,
  selectIsPickerOpen,
  selectPickerTarget,
  selectCustomEmojis,
  selectCustomEmojisByCategory,
  selectTopReactions,
} from "../reaction-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePicker(
  overrides?: Partial<ReactionPickerState>,
): ReactionPickerState {
  return {
    isOpen: false,
    targetMessageId: null,
    targetChannelId: null,
    position: null,
    activeCategory: "recent",
    searchQuery: "",
    ...overrides,
  };
}

function makeState(
  overrides?: Partial<Record<string, unknown>>,
): ReactionStore {
  const defaultState = {
    recentReactions: [] as string[],
    frequentReactions: new Map<string, ReactionUsage>(),
    quickReactions: ["👍", "❤️", "😂", "😮", "😢", "🎉"],
    customEmojis: new Map<string, CustomEmoji>(),
    customEmojiCategories: [] as string[],
    skinTone: "" as ReactionStore["skinTone"],
    picker: makePicker(),
    maxRecentReactions: 24,
    maxQuickReactions: 6,
  };
  return { ...defaultState, ...overrides } as unknown as ReactionStore;
}

// ---------------------------------------------------------------------------
// selectRecentReactions
// ---------------------------------------------------------------------------

describe("selectRecentReactions", () => {
  it("returns empty array by default", () => {
    expect(selectRecentReactions(makeState())).toEqual([]);
  });

  it("returns the recentReactions array", () => {
    const recentReactions = ["👍", "❤️"];
    expect(selectRecentReactions(makeState({ recentReactions }))).toBe(
      recentReactions,
    );
  });
});

// ---------------------------------------------------------------------------
// selectQuickReactions
// ---------------------------------------------------------------------------

describe("selectQuickReactions", () => {
  it("returns the default quick reactions", () => {
    const result = selectQuickReactions(makeState());
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns the quickReactions array", () => {
    const quickReactions = ["👍", "❤️", "🔥"];
    expect(selectQuickReactions(makeState({ quickReactions }))).toBe(
      quickReactions,
    );
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
    expect(selectSkinTone(makeState({ skinTone: "1F3FB" as never }))).toBe(
      "1F3FB",
    );
  });
});

// ---------------------------------------------------------------------------
// selectPickerState
// ---------------------------------------------------------------------------

describe("selectPickerState", () => {
  it("returns the picker object", () => {
    const picker = makePicker({ isOpen: true, targetMessageId: "m1" });
    const result = selectPickerState(makeState({ picker }));
    expect(result).toBe(picker);
  });
});

// ---------------------------------------------------------------------------
// selectIsPickerOpen
// ---------------------------------------------------------------------------

describe("selectIsPickerOpen", () => {
  it("returns false by default", () => {
    expect(selectIsPickerOpen(makeState())).toBe(false);
  });

  it("returns true when picker is open", () => {
    const picker = makePicker({ isOpen: true });
    expect(selectIsPickerOpen(makeState({ picker }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPickerTarget
// ---------------------------------------------------------------------------

describe("selectPickerTarget", () => {
  it("returns null targets by default", () => {
    const result = selectPickerTarget(makeState());
    expect(result.messageId).toBeNull();
    expect(result.channelId).toBeNull();
  });

  it("returns messageId and channelId from picker", () => {
    const picker = makePicker({ targetMessageId: "m1", targetChannelId: "c1" });
    const result = selectPickerTarget(makeState({ picker }));
    expect(result.messageId).toBe("m1");
    expect(result.channelId).toBe("c1");
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojis
// ---------------------------------------------------------------------------

describe("selectCustomEmojis", () => {
  it("returns empty array when customEmojis map is empty", () => {
    expect(selectCustomEmojis(makeState())).toEqual([]);
  });

  it("returns array of all custom emojis", () => {
    const emoji1 = {
      id: "e1",
      name: "wave",
      shortcode: ":wave:",
      url: "/wave.png",
      createdAt: "2024-01-01",
    } as never;
    const emoji2 = {
      id: "e2",
      name: "fire",
      shortcode: ":fire:",
      url: "/fire.png",
      createdAt: "2024-01-01",
    } as never;
    const customEmojis = new Map([
      ["e1", emoji1],
      ["e2", emoji2],
    ]);
    const result = selectCustomEmojis(makeState({ customEmojis }));
    expect(result).toHaveLength(2);
    expect(result).toContain(emoji1);
    expect(result).toContain(emoji2);
  });
});

// ---------------------------------------------------------------------------
// selectCustomEmojisByCategory (factory)
// ---------------------------------------------------------------------------

describe("selectCustomEmojisByCategory", () => {
  it("returns empty array when customEmojis map is empty", () => {
    expect(selectCustomEmojisByCategory("fun")(makeState())).toEqual([]);
  });

  it("returns only emojis for the specified category", () => {
    const emoji1 = {
      id: "e1",
      name: "wave",
      shortcode: ":wave:",
      url: "/w.png",
      category: "fun",
      createdAt: "2024-01-01",
    } as never;
    const emoji2 = {
      id: "e2",
      name: "star",
      shortcode: ":star:",
      url: "/s.png",
      category: "work",
      createdAt: "2024-01-01",
    } as never;
    const emoji3 = {
      id: "e3",
      name: "fire",
      shortcode: ":fire:",
      url: "/f.png",
      category: "fun",
      createdAt: "2024-01-01",
    } as never;
    const customEmojis = new Map([
      ["e1", emoji1],
      ["e2", emoji2],
      ["e3", emoji3],
    ]);
    const result = selectCustomEmojisByCategory("fun")(
      makeState({ customEmojis }),
    );
    expect(result).toHaveLength(2);
    expect(
      result.every((e: { category: string }) => e.category === "fun"),
    ).toBe(true);
  });

  it("returns empty array when no emojis match the category", () => {
    const emoji1 = {
      id: "e1",
      name: "wave",
      shortcode: ":wave:",
      url: "/w.png",
      category: "fun",
      createdAt: "2024-01-01",
    } as never;
    const customEmojis = new Map([["e1", emoji1]]);
    expect(
      selectCustomEmojisByCategory("work")(makeState({ customEmojis })),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectTopReactions (factory)
// ---------------------------------------------------------------------------

describe("selectTopReactions", () => {
  it("returns empty array when frequentReactions map is empty", () => {
    expect(selectTopReactions(5)(makeState())).toEqual([]);
  });

  it("returns top N emojis sorted by count descending", () => {
    const frequentReactions = new Map([
      ["👍", { emoji: "👍", count: 10, lastUsedAt: 1000 }],
      ["❤️", { emoji: "❤️", count: 25, lastUsedAt: 2000 }],
      ["😂", { emoji: "😂", count: 5, lastUsedAt: 500 }],
    ]);
    const result = selectTopReactions(2)(makeState({ frequentReactions }));
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("❤️"); // count=25
    expect(result[1]).toBe("👍"); // count=10
  });

  it("returns all emojis when count exceeds map size", () => {
    const frequentReactions = new Map([
      ["👍", { emoji: "👍", count: 3, lastUsedAt: 1000 }],
    ]);
    const result = selectTopReactions(10)(makeState({ frequentReactions }));
    expect(result).toHaveLength(1);
  });
});
