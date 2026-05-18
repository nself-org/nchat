/**
 * Tests for sticker-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { StickerStore } from "../sticker-store";
import {
  selectInstalledPacks,
  selectRecentStickers,
  selectFavoriteStickers,
  selectAvailablePacks,
  selectActivePackId,
  selectIsPickerOpen,
  selectSearchQuery,
  selectSearchResults,
  selectPreviewSticker,
  selectActivePackStickers,
  selectHasInstalledPacks,
  selectNotInstalledPacks,
} from "../sticker-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): StickerStore {
  const defaultState = {
    installedPacks: [],
    recentStickers: [],
    favoriteStickers: [],
    availablePacks: [],
    cachedStickers: {} as Record<string, never[]>,
    searchResults: [],
    searchQuery: "",
    activePackId: null,
    isPickerOpen: false,
    isManageModalOpen: false,
    isAddPackModalOpen: false,
    previewSticker: null,
    isLoadingPacks: false,
    isLoadingStickers: false,
    isSearching: false,
    // stub actions
    setInstalledPacks: () => undefined,
    addInstalledPack: () => undefined,
    removeInstalledPack: () => undefined,
    reorderInstalledPacks: () => undefined,
    setAvailablePacks: () => undefined,
    addAvailablePack: () => undefined,
    cachePackStickers: () => undefined,
    getCachedStickers: () => undefined,
    clearCachedStickers: () => undefined,
    setRecentStickers: () => undefined,
    addRecentSticker: () => undefined,
    clearRecentStickers: () => undefined,
    setFavoriteStickers: () => undefined,
    addFavoriteSticker: () => undefined,
    removeFavoriteSticker: () => undefined,
    reorderFavoriteStickers: () => undefined,
    isFavorite: () => false,
    setSearchResults: () => undefined,
    setSearchQuery: () => undefined,
    clearSearch: () => undefined,
    setActivePackId: () => undefined,
    setPickerOpen: () => undefined,
    setManageModalOpen: () => undefined,
    setAddPackModalOpen: () => undefined,
    setPreviewSticker: () => undefined,
    setLoadingPacks: () => undefined,
    setLoadingStickers: () => undefined,
    setSearching: () => undefined,
    getPackById: () => undefined,
    isPackInstalled: () => false,
    reset: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as StickerStore;
}

function makeInstalledPack(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "up1",
    user_id: "u1",
    pack_id: "p1",
    position: 0,
    pack: { id: "p1", name: "Pack 1", description: "", thumbnail_url: "" },
    ...overrides,
  } as never;
}

function makeAvailablePack(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "p1",
    name: "Pack 1",
    description: "",
    thumbnail_url: "",
    ...overrides,
  } as never;
}

function makeSticker(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "s1",
    sticker_id: "s1",
    pack_id: "p1",
    url: "https://example.com/s1.webp",
    ...overrides,
  } as never;
}

// ---------------------------------------------------------------------------
// selectInstalledPacks
// ---------------------------------------------------------------------------

describe("selectInstalledPacks", () => {
  it("returns empty array by default", () => {
    expect(selectInstalledPacks(makeState())).toEqual([]);
  });

  it("returns the installedPacks array", () => {
    const installedPacks = [makeInstalledPack()];
    expect(selectInstalledPacks(makeState({ installedPacks }))).toBe(installedPacks);
  });
});

// ---------------------------------------------------------------------------
// selectRecentStickers
// ---------------------------------------------------------------------------

describe("selectRecentStickers", () => {
  it("returns empty array by default", () => {
    expect(selectRecentStickers(makeState())).toEqual([]);
  });

  it("returns the recentStickers array", () => {
    const recentStickers = [makeSticker()];
    expect(selectRecentStickers(makeState({ recentStickers }))).toBe(recentStickers);
  });
});

// ---------------------------------------------------------------------------
// selectFavoriteStickers
// ---------------------------------------------------------------------------

describe("selectFavoriteStickers", () => {
  it("returns empty array by default", () => {
    expect(selectFavoriteStickers(makeState())).toEqual([]);
  });

  it("returns the favoriteStickers array", () => {
    const favoriteStickers = [makeSticker({ sticker_id: "fav1" })];
    expect(selectFavoriteStickers(makeState({ favoriteStickers }))).toBe(favoriteStickers);
  });
});

// ---------------------------------------------------------------------------
// selectAvailablePacks
// ---------------------------------------------------------------------------

describe("selectAvailablePacks", () => {
  it("returns empty array by default", () => {
    expect(selectAvailablePacks(makeState())).toEqual([]);
  });

  it("returns the availablePacks array", () => {
    const availablePacks = [makeAvailablePack()];
    expect(selectAvailablePacks(makeState({ availablePacks }))).toBe(availablePacks);
  });
});

// ---------------------------------------------------------------------------
// selectActivePackId
// ---------------------------------------------------------------------------

describe("selectActivePackId", () => {
  it("returns null by default", () => {
    expect(selectActivePackId(makeState())).toBeNull();
  });

  it("returns the active pack id when set", () => {
    expect(selectActivePackId(makeState({ activePackId: "p42" }))).toBe("p42");
  });
});

// ---------------------------------------------------------------------------
// selectIsPickerOpen
// ---------------------------------------------------------------------------

describe("selectIsPickerOpen", () => {
  it("returns false by default", () => {
    expect(selectIsPickerOpen(makeState())).toBe(false);
  });

  it("returns true when the picker is open", () => {
    expect(selectIsPickerOpen(makeState({ isPickerOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectSearchQuery
// ---------------------------------------------------------------------------

describe("selectSearchQuery", () => {
  it("returns empty string by default", () => {
    expect(selectSearchQuery(makeState())).toBe("");
  });

  it("returns the search query when set", () => {
    expect(selectSearchQuery(makeState({ searchQuery: "cat" }))).toBe("cat");
  });
});

// ---------------------------------------------------------------------------
// selectSearchResults
// ---------------------------------------------------------------------------

describe("selectSearchResults", () => {
  it("returns empty array by default", () => {
    expect(selectSearchResults(makeState())).toEqual([]);
  });

  it("returns the search results array", () => {
    const searchResults = [makeSticker({ id: "result1" })];
    expect(selectSearchResults(makeState({ searchResults }))).toBe(searchResults);
  });
});

// ---------------------------------------------------------------------------
// selectPreviewSticker
// ---------------------------------------------------------------------------

describe("selectPreviewSticker", () => {
  it("returns null by default", () => {
    expect(selectPreviewSticker(makeState())).toBeNull();
  });

  it("returns the preview sticker when set", () => {
    const sticker = makeSticker({ id: "preview1" });
    expect(selectPreviewSticker(makeState({ previewSticker: sticker }))).toBe(sticker);
  });
});

// ---------------------------------------------------------------------------
// selectActivePackStickers (derived)
// ---------------------------------------------------------------------------

describe("selectActivePackStickers", () => {
  it("returns empty array when activePackId is null", () => {
    expect(selectActivePackStickers(makeState())).toEqual([]);
  });

  it("returns empty array when activePackId has no cached stickers", () => {
    expect(
      selectActivePackStickers(makeState({ activePackId: "p1", cachedStickers: {} })),
    ).toEqual([]);
  });

  it("returns cached stickers for the active pack", () => {
    const stickers = [makeSticker()];
    const state = makeState({
      activePackId: "p1",
      cachedStickers: { p1: stickers },
    });
    expect(selectActivePackStickers(state)).toBe(stickers);
  });
});

// ---------------------------------------------------------------------------
// selectHasInstalledPacks (derived)
// ---------------------------------------------------------------------------

describe("selectHasInstalledPacks", () => {
  it("returns false when no packs are installed", () => {
    expect(selectHasInstalledPacks(makeState())).toBe(false);
  });

  it("returns true when at least one pack is installed", () => {
    const installedPacks = [makeInstalledPack()];
    expect(selectHasInstalledPacks(makeState({ installedPacks }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectNotInstalledPacks (derived)
// ---------------------------------------------------------------------------

describe("selectNotInstalledPacks", () => {
  it("returns all available packs when none are installed", () => {
    const availablePacks = [
      makeAvailablePack({ id: "p1" }),
      makeAvailablePack({ id: "p2" }),
    ];
    const result = selectNotInstalledPacks(makeState({ availablePacks }));
    expect(result).toHaveLength(2);
  });

  it("excludes installed packs from available packs", () => {
    const availablePacks = [
      makeAvailablePack({ id: "p1" }),
      makeAvailablePack({ id: "p2" }),
      makeAvailablePack({ id: "p3" }),
    ];
    const installedPacks = [makeInstalledPack({ pack_id: "p1" })];
    const result = selectNotInstalledPacks(makeState({ availablePacks, installedPacks }));
    expect(result).toHaveLength(2);
    expect(result.every((p: { id: string }) => p.id !== "p1")).toBe(true);
  });

  it("returns empty array when all available packs are installed", () => {
    const availablePacks = [makeAvailablePack({ id: "p1" })];
    const installedPacks = [makeInstalledPack({ pack_id: "p1" })];
    const result = selectNotInstalledPacks(makeState({ availablePacks, installedPacks }));
    expect(result).toHaveLength(0);
  });
});
