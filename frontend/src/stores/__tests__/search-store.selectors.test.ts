/**
 * Tests for search-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  SearchStore,
  SearchState,
  SearchFilters,
  MessageSearchResult,
  FileSearchResult,
  UserSearchResult,
  ChannelSearchResult,
} from "../search-store";
import {
  selectHasActiveFilters,
  selectActiveFilterCount,
  selectFilteredResults,
  selectResultsByType,
  selectInChannelSearchState,
} from "../search-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultFilters: SearchFilters = {
  fromUsers: [],
  inChannels: [],
  dateRange: { from: null, to: null },
  has: [],
  is: [],
};

function makeMessageResult(
  overrides?: Partial<MessageSearchResult>,
): MessageSearchResult {
  return {
    id: "r1",
    type: "message",
    score: 1,
    highlights: [],
    channelId: "ch1",
    channelName: "general",
    authorId: "u1",
    authorName: "Alice",
    authorAvatar: null,
    content: "hello",
    timestamp: new Date("2024-01-01"),
    threadId: null,
    isPinned: false,
    isStarred: false,
    reactions: [],
    hasAttachments: false,
    ...overrides,
  };
}

function makeFileResult(
  overrides?: Partial<FileSearchResult>,
): FileSearchResult {
  return {
    id: "r2",
    type: "file",
    score: 1,
    highlights: [],
    messageId: "msg1",
    channelId: "ch1",
    channelName: "general",
    uploaderId: "u1",
    uploaderName: "Alice",
    fileName: "doc.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    thumbnailUrl: null,
    uploadedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeUserResult(
  overrides?: Partial<UserSearchResult>,
): UserSearchResult {
  return {
    id: "r3",
    type: "user",
    score: 1,
    highlights: [],
    userId: "u1",
    displayName: "Alice",
    username: "alice",
    email: "alice@example.com",
    avatar: null,
    role: "member",
    status: "online",
    lastSeen: null,
    ...overrides,
  };
}

function makeChannelResult(
  overrides?: Partial<ChannelSearchResult>,
): ChannelSearchResult {
  return {
    id: "r4",
    type: "channel",
    score: 1,
    highlights: [],
    channelId: "ch1",
    name: "general",
    description: null,
    isPrivate: false,
    memberCount: 10,
    isMember: true,
    createdAt: new Date("2024-01-01"),
    lastActivityAt: null,
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): SearchStore {
  const defaultState: SearchState = {
    query: "",
    debouncedQuery: "",
    activeTab: "all",
    filters: defaultFilters,
    sortBy: "relevance",
    results: [],
    totalResults: 0,
    hasMore: false,
    currentPage: 1,
    resultsPerPage: 20,
    isSearching: false,
    isLoadingMore: false,
    isOpen: false,
    showFilters: false,
    showAdvanced: false,
    recentSearches: [],
    savedSearches: [],
    inChannelSearchActive: false,
    inChannelSearchQuery: "",
    inChannelSearchResults: [],
    inChannelCurrentIndex: 0,
    quickSwitcherMode: false,
    quickSwitcherResults: [],
  };
  const stubs = {
    setQuery: () => undefined,
    setDebouncedQuery: () => undefined,
    clearQuery: () => undefined,
    setActiveTab: () => undefined,
    setFilters: () => undefined,
    addFromUser: () => undefined,
    removeFromUser: () => undefined,
    addInChannel: () => undefined,
    removeInChannel: () => undefined,
    setDateRange: () => undefined,
    toggleHasFilter: () => undefined,
    toggleIsFilter: () => undefined,
    clearFilters: () => undefined,
    setSortBy: () => undefined,
    setResults: () => undefined,
    appendResults: () => undefined,
    clearResults: () => undefined,
    setCurrentPage: () => undefined,
    setSearching: () => undefined,
    setLoadingMore: () => undefined,
    openSearch: () => undefined,
    closeSearch: () => undefined,
    toggleFilters: () => undefined,
    setShowFilters: () => undefined,
    toggleAdvanced: () => undefined,
    setShowAdvanced: () => undefined,
    addRecentSearch: () => undefined,
    removeRecentSearch: () => undefined,
    clearRecentSearches: () => undefined,
    saveSearch: () => undefined,
    removeSavedSearch: () => undefined,
    loadSavedSearch: () => undefined,
    startInChannelSearch: () => undefined,
    endInChannelSearch: () => undefined,
    setInChannelQuery: () => undefined,
    setInChannelResults: () => undefined,
    navigateInChannelResult: () => undefined,
    jumpToInChannelResult: () => undefined,
    enableQuickSwitcherMode: () => undefined,
    disableQuickSwitcherMode: () => undefined,
    setQuickSwitcherResults: () => undefined,
    performSearch: async () => undefined,
    performInChannelSearch: async () => undefined,
    reset: () => undefined,
  };
  return { ...defaultState, ...stubs, ...overrides } as unknown as SearchStore;
}

// ---------------------------------------------------------------------------
// selectHasActiveFilters
// ---------------------------------------------------------------------------

describe("selectHasActiveFilters", () => {
  it("returns false when no filters active", () => {
    expect(selectHasActiveFilters(makeState())).toBe(false);
  });

  it("returns true when fromUsers filter is set", () => {
    const filters = { ...defaultFilters, fromUsers: ["u1"] };
    expect(selectHasActiveFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when inChannels filter is set", () => {
    const filters = { ...defaultFilters, inChannels: ["ch1"] };
    expect(selectHasActiveFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when dateRange.from is set", () => {
    const filters = {
      ...defaultFilters,
      dateRange: { from: new Date(), to: null },
    };
    expect(selectHasActiveFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when has filter is set", () => {
    const filters = { ...defaultFilters, has: ["link" as const] };
    expect(selectHasActiveFilters(makeState({ filters }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectActiveFilterCount
// ---------------------------------------------------------------------------

describe("selectActiveFilterCount", () => {
  it("returns 0 when no filters active", () => {
    expect(selectActiveFilterCount(makeState())).toBe(0);
  });

  it("counts fromUsers and inChannels individually", () => {
    const filters = {
      ...defaultFilters,
      fromUsers: ["u1", "u2"],
      inChannels: ["ch1"],
    };
    expect(selectActiveFilterCount(makeState({ filters }))).toBe(3);
  });

  it("counts dateRange as 1 when either bound is set", () => {
    const filters = {
      ...defaultFilters,
      dateRange: { from: new Date(), to: null },
    };
    expect(selectActiveFilterCount(makeState({ filters }))).toBe(1);
  });

  it("counts has and is filters individually", () => {
    const filters = {
      ...defaultFilters,
      has: ["link" as const, "image" as const],
      is: ["pinned" as const],
    };
    expect(selectActiveFilterCount(makeState({ filters }))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredResults
// ---------------------------------------------------------------------------

describe("selectFilteredResults", () => {
  it("returns all results when activeTab is all", () => {
    const msg = makeMessageResult();
    const file = makeFileResult();
    const results = [msg, file];
    expect(selectFilteredResults(makeState({ results }))).toHaveLength(2);
  });

  it("returns only message results when activeTab is messages", () => {
    const msg = makeMessageResult();
    const file = makeFileResult();
    const results = [msg, file];
    const filtered = selectFilteredResults(
      makeState({ results, activeTab: "messages" }),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(msg);
  });

  it("returns only file results when activeTab is files", () => {
    const msg = makeMessageResult();
    const file = makeFileResult();
    const results = [msg, file];
    const filtered = selectFilteredResults(
      makeState({ results, activeTab: "files" }),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(file);
  });

  it("returns only user results when activeTab is people", () => {
    const user = makeUserResult();
    const msg = makeMessageResult();
    const results = [user, msg];
    const filtered = selectFilteredResults(
      makeState({ results, activeTab: "people" }),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(user);
  });

  it("returns only channel results when activeTab is channels", () => {
    const ch = makeChannelResult();
    const msg = makeMessageResult();
    const results = [ch, msg];
    const filtered = selectFilteredResults(
      makeState({ results, activeTab: "channels" }),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(ch);
  });
});

// ---------------------------------------------------------------------------
// selectResultsByType
// ---------------------------------------------------------------------------

describe("selectResultsByType", () => {
  it("returns empty arrays when no results", () => {
    const result = selectResultsByType(makeState());
    expect(result.messages).toEqual([]);
    expect(result.files).toEqual([]);
    expect(result.users).toEqual([]);
    expect(result.channels).toEqual([]);
  });

  it("groups results by their type", () => {
    const msg = makeMessageResult();
    const file = makeFileResult();
    const user = makeUserResult();
    const ch = makeChannelResult();
    const results = [msg, file, user, ch];
    const grouped = selectResultsByType(makeState({ results }));
    expect(grouped.messages).toHaveLength(1);
    expect(grouped.files).toHaveLength(1);
    expect(grouped.users).toHaveLength(1);
    expect(grouped.channels).toHaveLength(1);
    expect(grouped.messages[0]).toBe(msg);
    expect(grouped.files[0]).toBe(file);
    expect(grouped.users[0]).toBe(user);
    expect(grouped.channels[0]).toBe(ch);
  });
});

// ---------------------------------------------------------------------------
// selectInChannelSearchState
// ---------------------------------------------------------------------------

describe("selectInChannelSearchState", () => {
  it("returns default in-channel search state", () => {
    const result = selectInChannelSearchState(makeState());
    expect(result.active).toBe(false);
    expect(result.query).toBe("");
    expect(result.results).toEqual([]);
    expect(result.currentIndex).toBe(0);
    expect(result.total).toBe(0);
  });

  it("returns current in-channel search state when active", () => {
    const msg = makeMessageResult();
    const result = selectInChannelSearchState(
      makeState({
        inChannelSearchActive: true,
        inChannelSearchQuery: "hello",
        inChannelSearchResults: [msg],
        inChannelCurrentIndex: 0,
      }),
    );
    expect(result.active).toBe(true);
    expect(result.query).toBe("hello");
    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
