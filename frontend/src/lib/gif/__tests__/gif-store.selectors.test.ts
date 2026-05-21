/**
 * Tests for gif-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { GifStore } from "../gif-store";
import {
  selectRecentGifs,
  selectFavoriteGifs,
  selectSearchHistory,
  selectPickerState,
  selectIsPickerOpen,
  selectActiveTab,
  selectSearchQuery,
  selectSelectedCategory,
} from "../gif-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePickerState(overrides?: Partial<Record<string, unknown>>) {
  return {
    isOpen: false,
    activeTab: "trending" as const,
    searchQuery: "",
    selectedCategory: null,
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): GifStore {
  const defaultState = {
    recentGifs: [],
    favoriteGifs: [],
    searchHistory: [],
    picker: makePickerState(),
    maxRecentGifs: 20,
    maxFavoriteGifs: 50,
    maxSearchHistory: 10,
  };
  return { ...defaultState, ...overrides } as unknown as GifStore;
}

// ---------------------------------------------------------------------------
// selectRecentGifs
// ---------------------------------------------------------------------------

describe("selectRecentGifs", () => {
  it("returns empty array by default", () => {
    expect(selectRecentGifs(makeState())).toEqual([]);
  });

  it("returns the recentGifs array", () => {
    const recentGifs = [
      { id: "g1", url: "https://example.com/g1.gif" } as never,
    ];
    expect(selectRecentGifs(makeState({ recentGifs }))).toBe(recentGifs);
  });
});

// ---------------------------------------------------------------------------
// selectFavoriteGifs
// ---------------------------------------------------------------------------

describe("selectFavoriteGifs", () => {
  it("returns empty array by default", () => {
    expect(selectFavoriteGifs(makeState())).toEqual([]);
  });

  it("returns the favoriteGifs array", () => {
    const favoriteGifs = [
      { id: "g2", url: "https://example.com/g2.gif" } as never,
    ];
    expect(selectFavoriteGifs(makeState({ favoriteGifs }))).toBe(favoriteGifs);
  });
});

// ---------------------------------------------------------------------------
// selectSearchHistory
// ---------------------------------------------------------------------------

describe("selectSearchHistory", () => {
  it("returns empty array by default", () => {
    expect(selectSearchHistory(makeState())).toEqual([]);
  });

  it("returns the searchHistory array", () => {
    const searchHistory = [{ query: "cats", searchedAt: 1234567890 } as never];
    expect(selectSearchHistory(makeState({ searchHistory }))).toBe(
      searchHistory,
    );
  });
});

// ---------------------------------------------------------------------------
// selectPickerState
// ---------------------------------------------------------------------------

describe("selectPickerState", () => {
  it("returns the default picker state", () => {
    const result = selectPickerState(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.activeTab).toBe("trending");
    expect(result.searchQuery).toBe("");
    expect(result.selectedCategory).toBeNull();
  });

  it("returns updated picker state", () => {
    const picker = makePickerState({
      isOpen: true,
      activeTab: "favorites" as const,
    });
    const result = selectPickerState(makeState({ picker }));
    expect(result.isOpen).toBe(true);
    expect(result.activeTab).toBe("favorites");
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
    const picker = makePickerState({ isOpen: true });
    expect(selectIsPickerOpen(makeState({ picker }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectActiveTab
// ---------------------------------------------------------------------------

describe("selectActiveTab", () => {
  it("returns trending by default", () => {
    expect(selectActiveTab(makeState())).toBe("trending");
  });

  it("returns the current active tab", () => {
    const picker = makePickerState({ activeTab: "search" as const });
    expect(selectActiveTab(makeState({ picker }))).toBe("search");
  });

  it("returns recent when set", () => {
    const picker = makePickerState({ activeTab: "recent" as const });
    expect(selectActiveTab(makeState({ picker }))).toBe("recent");
  });
});

// ---------------------------------------------------------------------------
// selectSearchQuery
// ---------------------------------------------------------------------------

describe("selectSearchQuery", () => {
  it("returns empty string by default", () => {
    expect(selectSearchQuery(makeState())).toBe("");
  });

  it("returns the current search query from picker", () => {
    const picker = makePickerState({ searchQuery: "funny cats" });
    expect(selectSearchQuery(makeState({ picker }))).toBe("funny cats");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedCategory
// ---------------------------------------------------------------------------

describe("selectSelectedCategory", () => {
  it("returns null by default", () => {
    expect(selectSelectedCategory(makeState())).toBeNull();
  });

  it("returns the selected category when set", () => {
    const picker = makePickerState({ selectedCategory: "reactions" });
    expect(selectSelectedCategory(makeState({ picker }))).toBe("reactions");
  });
});
