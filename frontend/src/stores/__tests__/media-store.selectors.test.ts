/**
 * Tests for media-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { MediaStore, MediaState } from "../media-store";
import {
  selectMediaItems,
  selectFilteredMediaItems,
  selectMediaLoading,
  selectMediaLoadingMore,
  selectMediaError,
  selectMediaFilters,
  selectMediaSorting,
  selectMediaPagination,
  selectMediaViewMode,
  selectSelectedMediaItems,
  selectIsSelectMode,
  selectMediaViewer,
  selectIsViewerOpen,
  selectCurrentViewerItem,
  selectMediaContext,
  selectMediaByType,
  selectMediaByChannel,
  selectSelectionCount,
  selectHasSelection,
} from "../media-store";

import type {
  MediaItem,
  MediaFilters,
  MediaSorting,
  MediaPagination,
  MediaViewMode,
  ViewerState,
} from "@/lib/media/media-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides?: Partial<MediaItem>): MediaItem {
  return {
    id: "i1",
    fileType: "image",
    channelId: "ch1",
    threadId: null,
    userId: "u1",
    fileName: "photo.jpg",
    fileSize: 1024,
    mimeType: "image/jpeg",
    url: "https://example.com/photo.jpg",
    thumbnailUrl: null,
    width: 800,
    height: 600,
    duration: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as MediaItem;
}

function makeFilters(overrides?: Partial<MediaFilters>): MediaFilters {
  return {
    type: "all",
    searchQuery: "",
    dateRange: { start: null, end: null },
    ...overrides,
  } as MediaFilters;
}

function makeSorting(overrides?: Partial<MediaSorting>): MediaSorting {
  return {
    sortBy: "date_desc",
    direction: "desc",
    ...overrides,
  } as MediaSorting;
}

function makePagination(overrides?: Partial<MediaPagination>): MediaPagination {
  return {
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
    hasMore: false,
    cursor: null,
    ...overrides,
  } as MediaPagination;
}

function makeViewer(overrides?: Partial<ViewerState>): ViewerState {
  return {
    isOpen: false,
    currentItem: null,
    currentIndex: -1,
    items: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    isFullscreen: false,
    showInfo: false,
    showControls: true,
    isPlaying: false,
    currentTime: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    isCarouselMode: false,
    carouselAutoplay: false,
    carouselInterval: 3000,
    ...overrides,
  } as ViewerState;
}

function makeState(overrides?: Partial<MediaState>): MediaStore {
  const defaultState: MediaState = {
    items: [],
    filteredItems: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    filters: makeFilters(),
    sorting: makeSorting(),
    pagination: makePagination(),
    viewMode: "grid",
    selectedItems: new Set(),
    isSelectMode: false,
    lastSelectedId: null,
    viewer: makeViewer(),
    context: {
      channelId: null,
      threadId: null,
      userId: null,
    },
  };
  return { ...defaultState, ...overrides } as unknown as MediaStore;
}

// ---------------------------------------------------------------------------
// selectMediaItems
// ---------------------------------------------------------------------------

describe("selectMediaItems", () => {
  it("returns empty array when no items", () => {
    expect(selectMediaItems(makeState())).toEqual([]);
  });

  it("returns the items array", () => {
    const i1 = makeItem({ id: "i1" });
    const i2 = makeItem({ id: "i2" });
    const state = makeState({ items: [i1, i2] });
    const result = selectMediaItems(state);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(i1);
    expect(result[1]).toBe(i2);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredMediaItems
// ---------------------------------------------------------------------------

describe("selectFilteredMediaItems", () => {
  it("returns empty array when no filtered items", () => {
    expect(selectFilteredMediaItems(makeState())).toEqual([]);
  });

  it("returns the filteredItems array", () => {
    const i1 = makeItem({ id: "i1" });
    const state = makeState({ filteredItems: [i1] });
    expect(selectFilteredMediaItems(state)).toHaveLength(1);
    expect(selectFilteredMediaItems(state)[0]).toBe(i1);
  });
});

// ---------------------------------------------------------------------------
// selectMediaLoading
// ---------------------------------------------------------------------------

describe("selectMediaLoading", () => {
  it("returns false when not loading", () => {
    expect(selectMediaLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectMediaLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMediaLoadingMore
// ---------------------------------------------------------------------------

describe("selectMediaLoadingMore", () => {
  it("returns false when not loading more", () => {
    expect(selectMediaLoadingMore(makeState())).toBe(false);
  });

  it("returns true when loading more", () => {
    expect(selectMediaLoadingMore(makeState({ isLoadingMore: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectMediaError
// ---------------------------------------------------------------------------

describe("selectMediaError", () => {
  it("returns null when no error", () => {
    expect(selectMediaError(makeState())).toBeNull();
  });

  it("returns the error string", () => {
    expect(selectMediaError(makeState({ error: "Failed to load" }))).toBe(
      "Failed to load",
    );
  });
});

// ---------------------------------------------------------------------------
// selectMediaFilters
// ---------------------------------------------------------------------------

describe("selectMediaFilters", () => {
  it("returns the default filters", () => {
    const filters = selectMediaFilters(makeState());
    expect(filters.type).toBe("all");
  });

  it("returns custom filters", () => {
    const customFilters = makeFilters({ type: "image" });
    const state = makeState({ filters: customFilters });
    expect(selectMediaFilters(state)).toBe(customFilters);
  });
});

// ---------------------------------------------------------------------------
// selectMediaSorting
// ---------------------------------------------------------------------------

describe("selectMediaSorting", () => {
  it("returns the default sorting", () => {
    const sorting = selectMediaSorting(makeState());
    expect(sorting.sortBy).toBe("date_desc");
    expect(sorting.direction).toBe("desc");
  });

  it("returns custom sorting", () => {
    const customSorting = makeSorting({ direction: "asc" });
    const state = makeState({ sorting: customSorting });
    expect(selectMediaSorting(state)).toBe(customSorting);
  });
});

// ---------------------------------------------------------------------------
// selectMediaPagination
// ---------------------------------------------------------------------------

describe("selectMediaPagination", () => {
  it("returns the default pagination", () => {
    const pagination = selectMediaPagination(makeState());
    expect(pagination.page).toBe(1);
    expect(pagination.hasMore).toBe(false);
  });

  it("returns custom pagination", () => {
    const customPagination = makePagination({ page: 3, total: 90 });
    const state = makeState({ pagination: customPagination });
    expect(selectMediaPagination(state)).toBe(customPagination);
  });
});

// ---------------------------------------------------------------------------
// selectMediaViewMode
// ---------------------------------------------------------------------------

describe("selectMediaViewMode", () => {
  it("returns default view mode 'grid'", () => {
    expect(selectMediaViewMode(makeState())).toBe("grid");
  });

  it("returns 'list' view mode", () => {
    const state = makeState({ viewMode: "list" as MediaViewMode });
    expect(selectMediaViewMode(state)).toBe("list");
  });

  it("returns 'masonry' view mode", () => {
    const state = makeState({ viewMode: "masonry" as MediaViewMode });
    expect(selectMediaViewMode(state)).toBe("masonry");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedMediaItems
// ---------------------------------------------------------------------------

describe("selectSelectedMediaItems", () => {
  it("returns empty Set when nothing selected", () => {
    const result = selectSelectedMediaItems(makeState());
    expect(result.size).toBe(0);
  });

  it("returns the selected items Set", () => {
    const selectedItems = new Set(["i1", "i2"]);
    const state = makeState({ selectedItems });
    const result = selectSelectedMediaItems(state);
    expect(result.has("i1")).toBe(true);
    expect(result.has("i2")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsSelectMode
// ---------------------------------------------------------------------------

describe("selectIsSelectMode", () => {
  it("returns false when not in select mode", () => {
    expect(selectIsSelectMode(makeState())).toBe(false);
  });

  it("returns true when in select mode", () => {
    expect(selectIsSelectMode(makeState({ isSelectMode: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMediaViewer
// ---------------------------------------------------------------------------

describe("selectMediaViewer", () => {
  it("returns the viewer state", () => {
    const viewer = makeViewer({ zoom: 1.5 });
    const state = makeState({ viewer });
    expect(selectMediaViewer(state)).toBe(viewer);
  });

  it("returns default viewer state with isOpen false", () => {
    const viewer = selectMediaViewer(makeState());
    expect(viewer.isOpen).toBe(false);
    expect(viewer.currentItem).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectIsViewerOpen
// ---------------------------------------------------------------------------

describe("selectIsViewerOpen", () => {
  it("returns false when viewer is not open", () => {
    expect(selectIsViewerOpen(makeState())).toBe(false);
  });

  it("returns true when viewer is open", () => {
    const viewer = makeViewer({ isOpen: true });
    expect(selectIsViewerOpen(makeState({ viewer }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCurrentViewerItem
// ---------------------------------------------------------------------------

describe("selectCurrentViewerItem", () => {
  it("returns null when no item is displayed", () => {
    expect(selectCurrentViewerItem(makeState())).toBeNull();
  });

  it("returns the current viewer item", () => {
    const item = makeItem({ id: "i1" });
    const viewer = makeViewer({ currentItem: item, isOpen: true });
    expect(selectCurrentViewerItem(makeState({ viewer }))).toBe(item);
  });
});

// ---------------------------------------------------------------------------
// selectMediaContext
// ---------------------------------------------------------------------------

describe("selectMediaContext", () => {
  it("returns null context by default", () => {
    const ctx = selectMediaContext(makeState());
    expect(ctx.channelId).toBeNull();
    expect(ctx.threadId).toBeNull();
    expect(ctx.userId).toBeNull();
  });

  it("returns the set context", () => {
    const state = makeState({
      context: { channelId: "ch1", threadId: "t1", userId: "u1" },
    });
    const ctx = selectMediaContext(state);
    expect(ctx.channelId).toBe("ch1");
    expect(ctx.threadId).toBe("t1");
    expect(ctx.userId).toBe("u1");
  });
});

// ---------------------------------------------------------------------------
// selectMediaByType
// ---------------------------------------------------------------------------

describe("selectMediaByType", () => {
  it("returns empty array when no items match the type", () => {
    const state = makeState({ items: [makeItem({ id: "i1", fileType: "image" })] });
    const selector = selectMediaByType("video" as never);
    expect(selector(state)).toHaveLength(0);
  });

  it("returns items of the requested type", () => {
    const img1 = makeItem({ id: "i1", fileType: "image" });
    const vid1 = makeItem({ id: "i2", fileType: "video" as never });
    const img2 = makeItem({ id: "i3", fileType: "image" });
    const state = makeState({ items: [img1, vid1, img2] });
    const result = selectMediaByType("image")(state);
    expect(result).toHaveLength(2);
    const ids = result.map((i) => i.id);
    expect(ids).toContain("i1");
    expect(ids).toContain("i3");
  });
});

// ---------------------------------------------------------------------------
// selectMediaByChannel
// ---------------------------------------------------------------------------

describe("selectMediaByChannel", () => {
  it("returns empty array when no items in channel", () => {
    const state = makeState({ items: [makeItem({ channelId: "ch1" })] });
    expect(selectMediaByChannel("ch2")(state)).toHaveLength(0);
  });

  it("returns items from the specified channel", () => {
    const i1 = makeItem({ id: "i1", channelId: "ch1" });
    const i2 = makeItem({ id: "i2", channelId: "ch2" });
    const i3 = makeItem({ id: "i3", channelId: "ch1" });
    const state = makeState({ items: [i1, i2, i3] });
    const result = selectMediaByChannel("ch1")(state);
    expect(result).toHaveLength(2);
    const ids = result.map((i) => i.id);
    expect(ids).toContain("i1");
    expect(ids).toContain("i3");
  });
});

// ---------------------------------------------------------------------------
// selectSelectionCount
// ---------------------------------------------------------------------------

describe("selectSelectionCount", () => {
  it("returns 0 when nothing is selected", () => {
    expect(selectSelectionCount(makeState())).toBe(0);
  });

  it("returns the number of selected items", () => {
    const selectedItems = new Set(["i1", "i2", "i3"]);
    expect(selectSelectionCount(makeState({ selectedItems }))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectHasSelection
// ---------------------------------------------------------------------------

describe("selectHasSelection", () => {
  it("returns false when nothing is selected", () => {
    expect(selectHasSelection(makeState())).toBe(false);
  });

  it("returns true when at least one item is selected", () => {
    const selectedItems = new Set(["i1"]);
    expect(selectHasSelection(makeState({ selectedItems }))).toBe(true);
  });

  it("returns false for empty Set", () => {
    const selectedItems = new Set<string>();
    expect(selectHasSelection(makeState({ selectedItems }))).toBe(false);
  });
});
