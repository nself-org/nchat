/**
 * Tests for saved-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { SavedStore } from "../saved-store";
import {
  selectSavedCount,
  selectStarredCount,
  selectCollectionCount,
  selectAllCollections,
  selectIsPanelOpen,
  selectIsLoading,
  selectError,
} from "../saved-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): SavedStore {
  const defaultState = {
    savedMessages: new Map(),
    savedByMessageId: new Map(),
    collections: new Map(),
    selectedCollectionId: null,
    selectedChannelFilter: null,
    selectedTagFilter: [],
    isPanelOpen: false,
    isAddToCollectionOpen: false,
    selectedSavedId: null,
    isCreateCollectionOpen: false,
    filters: {},
    sortBy: "savedAt",
    sortOrder: "desc",
    searchQuery: "",
    isLoading: false,
    isLoadingCollections: false,
    isSaving: false,
    isExporting: false,
    error: null,
    hasMore: false,
    cursor: 0,
    totalCount: 0,
  };
  return { ...defaultState, ...overrides } as unknown as SavedStore;
}

// ---------------------------------------------------------------------------
// selectSavedCount
// ---------------------------------------------------------------------------

describe("selectSavedCount", () => {
  it("returns 0 by default", () => {
    expect(selectSavedCount(makeState())).toBe(0);
  });

  it("returns the totalCount value", () => {
    expect(selectSavedCount(makeState({ totalCount: 42 }))).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// selectStarredCount
// ---------------------------------------------------------------------------

describe("selectStarredCount", () => {
  it("returns 0 when savedMessages is empty", () => {
    expect(selectStarredCount(makeState())).toBe(0);
  });

  it("counts only starred messages", () => {
    const savedMessages = new Map([
      ["s1", { id: "s1", isStarred: true } as never],
      ["s2", { id: "s2", isStarred: false } as never],
      ["s3", { id: "s3", isStarred: true } as never],
    ]);
    expect(selectStarredCount(makeState({ savedMessages }))).toBe(2);
  });

  it("returns 0 when no messages are starred", () => {
    const savedMessages = new Map([
      ["s1", { id: "s1", isStarred: false } as never],
    ]);
    expect(selectStarredCount(makeState({ savedMessages }))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectCollectionCount
// ---------------------------------------------------------------------------

describe("selectCollectionCount", () => {
  it("returns 0 when collections map is empty", () => {
    expect(selectCollectionCount(makeState())).toBe(0);
  });

  it("returns the number of collections", () => {
    const collections = new Map([
      ["col1", { id: "col1", name: "Work" } as never],
      ["col2", { id: "col2", name: "Personal" } as never],
    ]);
    expect(selectCollectionCount(makeState({ collections }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectAllCollections
// ---------------------------------------------------------------------------

describe("selectAllCollections", () => {
  it("returns empty array when collections is empty", () => {
    expect(selectAllCollections(makeState())).toEqual([]);
  });

  it("returns collections sorted by position ascending", () => {
    const col1 = { id: "col1", name: "Second", position: 2 } as never;
    const col2 = { id: "col2", name: "First", position: 1 } as never;
    const col3 = { id: "col3", name: "Third", position: 3 } as never;
    const collections = new Map([
      ["col1", col1],
      ["col2", col2],
      ["col3", col3],
    ]);
    const result = selectAllCollections(makeState({ collections }));
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(col2); // position=1
    expect(result[1]).toBe(col1); // position=2
    expect(result[2]).toBe(col3); // position=3
  });
});

// ---------------------------------------------------------------------------
// selectIsPanelOpen
// ---------------------------------------------------------------------------

describe("selectIsPanelOpen", () => {
  it("returns false by default", () => {
    expect(selectIsPanelOpen(makeState())).toBe(false);
  });

  it("returns true when panel is open", () => {
    expect(selectIsPanelOpen(makeState({ isPanelOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false by default", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null by default", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(
      selectError(makeState({ error: "Failed to load saved messages" })),
    ).toBe("Failed to load saved messages");
  });
});
