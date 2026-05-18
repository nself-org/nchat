/**
 * Search Store Unit Tests
 *
 * Tests for the search store including query management, filters, results,
 * history, in-channel search, and quick switcher functionality.
 */

// Mock crypto.randomUUID for Node.js environment
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () =>
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  },
});

import { act } from "@testing-library/react";
import {
  useSearchStore,
  selectHasActiveFilters,
  selectActiveFilterCount,
  selectFilteredResults,
  selectResultsByType,
  selectInChannelSearchState,
  type SearchResult,
  type MessageSearchResult,
  type FileSearchResult,
  type UserSearchResult,
  type ChannelSearchResult,
  type SearchFilters,
  type DateRange,
} from "../search-store";

// ============================================================================
// Test Helpers
// ============================================================================

const createMessageResult = (
  overrides?: Partial<MessageSearchResult>,
): MessageSearchResult => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "message",
  score: 1.0,
  highlights: ["test"],
  channelId: "channel-1",
  channelName: "general",
  authorId: "user-1",
  authorName: "John Doe",
  authorAvatar: null,
  content: "Test message content",
  timestamp: new Date(),
  threadId: null,
  isPinned: false,
  isStarred: false,
  reactions: [],
  hasAttachments: false,
  ...overrides,
});

const createFileResult = (
  overrides?: Partial<FileSearchResult>,
): FileSearchResult => ({
  id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "file",
  score: 1.0,
  highlights: ["document"],
  messageId: "msg-1",
  channelId: "channel-1",
  channelName: "general",
  uploaderId: "user-1",
  uploaderName: "John Doe",
  fileName: "document.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  thumbnailUrl: null,
  uploadedAt: new Date(),
  ...overrides,
});

const createUserResult = (
  overrides?: Partial<UserSearchResult>,
): UserSearchResult => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "user",
  score: 1.0,
  highlights: ["john"],
  userId: "user-1",
  displayName: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  avatar: null,
  role: "member",
  status: "online",
  lastSeen: new Date(),
  ...overrides,
});

const createChannelResult = (
  overrides?: Partial<ChannelSearchResult>,
): ChannelSearchResult => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "channel",
  score: 1.0,
  highlights: ["general"],
  channelId: "channel-1",
  name: "general",
  description: "General discussion",
  isPrivate: false,
  memberCount: 10,
  isMember: true,
  createdAt: new Date(),
  lastActivityAt: new Date(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe("Search Store", () => {
  beforeEach(() => {
    act(() => {
      // Reset persisted arrays directly — avoid stale snapshot infinite loop
      // (capturing getState() once and using .savedSearches.length in a while loop
      // never terminates because the snapshot reference never updates)
      useSearchStore.setState({ savedSearches: [], recentSearches: [] });
      useSearchStore.getState().reset();
    });
  });

  // ==========================================================================
  // Query Actions Tests
  // ==========================================================================

  describe("Query Actions", () => {
    describe("setQuery", () => {
      it("should set query", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello world");
        });

        expect(useSearchStore.getState().query).toBe("hello world");
      });

      it("should not affect debounced query", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello");
        });

        expect(useSearchStore.getState().debouncedQuery).toBe("");
      });
    });

    describe("setDebouncedQuery", () => {
      it("should set debounced query", () => {
        act(() => {
          useSearchStore.getState().setDebouncedQuery("hello world");
        });

        expect(useSearchStore.getState().debouncedQuery).toBe("hello world");
      });
    });

    describe("clearQuery", () => {
      it("should clear both query and debounced query", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello");
          useSearchStore.getState().setDebouncedQuery("hello");
          useSearchStore.getState().clearQuery();
        });

        expect(useSearchStore.getState().query).toBe("");
        expect(useSearchStore.getState().debouncedQuery).toBe("");
      });
    });
  });

  // ==========================================================================
  // Tab Actions Tests
  // ==========================================================================

  describe("Tab Actions", () => {
    describe("setActiveTab", () => {
      it("should set active tab", () => {
        act(() => {
          useSearchStore.getState().setActiveTab("messages");
        });

        expect(useSearchStore.getState().activeTab).toBe("messages");
      });

      it("should clear results when switching tabs", () => {
        act(() => {
          useSearchStore
            .getState()
            .setResults([createMessageResult()], 1, false);
          useSearchStore.getState().setActiveTab("files");
        });

        expect(useSearchStore.getState().results).toHaveLength(0);
      });

      it("should reset current page", () => {
        act(() => {
          useSearchStore.getState().setCurrentPage(5);
          useSearchStore.getState().setActiveTab("people");
        });

        expect(useSearchStore.getState().currentPage).toBe(1);
      });
    });
  });

  // ==========================================================================
  // Filter Actions Tests
  // ==========================================================================

  describe("Filter Actions", () => {
    describe("setFilters", () => {
      it("should merge filters", () => {
        act(() => {
          useSearchStore.getState().setFilters({ fromUsers: ["user-1"] });
          useSearchStore.getState().setFilters({ inChannels: ["channel-1"] });
        });

        const { filters } = useSearchStore.getState();
        expect(filters.fromUsers).toEqual(["user-1"]);
        expect(filters.inChannels).toEqual(["channel-1"]);
      });

      it("should clear results and reset page", () => {
        act(() => {
          useSearchStore
            .getState()
            .setResults([createMessageResult()], 1, false);
          useSearchStore.getState().setCurrentPage(3);
          useSearchStore.getState().setFilters({ fromUsers: ["user-1"] });
        });

        expect(useSearchStore.getState().results).toHaveLength(0);
        expect(useSearchStore.getState().currentPage).toBe(1);
      });
    });

    describe("addFromUser", () => {
      it("should add user to from filter", () => {
        act(() => {
          useSearchStore.getState().addFromUser("user-1");
        });

        expect(useSearchStore.getState().filters.fromUsers).toContain("user-1");
      });

      it("should not add duplicate user", () => {
        act(() => {
          useSearchStore.getState().addFromUser("user-1");
          useSearchStore.getState().addFromUser("user-1");
        });

        expect(useSearchStore.getState().filters.fromUsers).toHaveLength(1);
      });
    });

    describe("removeFromUser", () => {
      it("should remove user from filter", () => {
        act(() => {
          useSearchStore.getState().addFromUser("user-1");
          useSearchStore.getState().addFromUser("user-2");
          useSearchStore.getState().removeFromUser("user-1");
        });

        expect(useSearchStore.getState().filters.fromUsers).not.toContain(
          "user-1",
        );
        expect(useSearchStore.getState().filters.fromUsers).toContain("user-2");
      });
    });

    describe("addInChannel", () => {
      it("should add channel to in filter", () => {
        act(() => {
          useSearchStore.getState().addInChannel("channel-1");
        });

        expect(useSearchStore.getState().filters.inChannels).toContain(
          "channel-1",
        );
      });

      it("should not add duplicate channel", () => {
        act(() => {
          useSearchStore.getState().addInChannel("channel-1");
          useSearchStore.getState().addInChannel("channel-1");
        });

        expect(useSearchStore.getState().filters.inChannels).toHaveLength(1);
      });
    });

    describe("removeInChannel", () => {
      it("should remove channel from filter", () => {
        act(() => {
          useSearchStore.getState().addInChannel("channel-1");
          useSearchStore.getState().addInChannel("channel-2");
          useSearchStore.getState().removeInChannel("channel-1");
        });

        expect(useSearchStore.getState().filters.inChannels).not.toContain(
          "channel-1",
        );
      });
    });

    describe("setDateRange", () => {
      it("should set date range", () => {
        const range: DateRange = {
          from: new Date("2024-01-01"),
          to: new Date("2024-12-31"),
        };

        act(() => {
          useSearchStore.getState().setDateRange(range);
        });

        expect(useSearchStore.getState().filters.dateRange).toEqual(range);
      });
    });

    describe("toggleHasFilter", () => {
      it("should add has filter", () => {
        act(() => {
          useSearchStore.getState().toggleHasFilter("link");
        });

        expect(useSearchStore.getState().filters.has).toContain("link");
      });

      it("should remove has filter when toggled again", () => {
        act(() => {
          useSearchStore.getState().toggleHasFilter("link");
          useSearchStore.getState().toggleHasFilter("link");
        });

        expect(useSearchStore.getState().filters.has).not.toContain("link");
      });
    });

    describe("toggleIsFilter", () => {
      it("should add is filter", () => {
        act(() => {
          useSearchStore.getState().toggleIsFilter("pinned");
        });

        expect(useSearchStore.getState().filters.is).toContain("pinned");
      });

      it("should remove is filter when toggled again", () => {
        act(() => {
          useSearchStore.getState().toggleIsFilter("pinned");
          useSearchStore.getState().toggleIsFilter("pinned");
        });

        expect(useSearchStore.getState().filters.is).not.toContain("pinned");
      });
    });

    describe("clearFilters", () => {
      it("should clear all filters", () => {
        act(() => {
          useSearchStore.getState().addFromUser("user-1");
          useSearchStore.getState().addInChannel("channel-1");
          useSearchStore.getState().toggleHasFilter("link");
          useSearchStore.getState().toggleIsFilter("pinned");
          useSearchStore.getState().clearFilters();
        });

        const { filters } = useSearchStore.getState();
        expect(filters.fromUsers).toHaveLength(0);
        expect(filters.inChannels).toHaveLength(0);
        expect(filters.has).toHaveLength(0);
        expect(filters.is).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // Sort Actions Tests
  // ==========================================================================

  describe("Sort Actions", () => {
    describe("setSortBy", () => {
      it("should set sort option", () => {
        act(() => {
          useSearchStore.getState().setSortBy("date_desc");
        });

        expect(useSearchStore.getState().sortBy).toBe("date_desc");
      });

      it("should clear results and reset page", () => {
        act(() => {
          useSearchStore
            .getState()
            .setResults([createMessageResult()], 1, false);
          useSearchStore.getState().setCurrentPage(3);
          useSearchStore.getState().setSortBy("date_asc");
        });

        expect(useSearchStore.getState().results).toHaveLength(0);
        expect(useSearchStore.getState().currentPage).toBe(1);
      });
    });
  });

  // ==========================================================================
  // Result Actions Tests
  // ==========================================================================

  describe("Result Actions", () => {
    describe("setResults", () => {
      it("should set results", () => {
        const results = [createMessageResult(), createFileResult()];

        act(() => {
          useSearchStore.getState().setResults(results, 10, true);
        });

        const state = useSearchStore.getState();
        expect(state.results).toHaveLength(2);
        expect(state.totalResults).toBe(10);
        expect(state.hasMore).toBe(true);
      });
    });

    describe("appendResults", () => {
      it("should append to existing results", () => {
        const initial = [createMessageResult()];
        const more = [createMessageResult()];

        act(() => {
          useSearchStore.getState().setResults(initial, 10, true);
          useSearchStore.getState().appendResults(more, false);
        });

        const state = useSearchStore.getState();
        expect(state.results).toHaveLength(2);
        expect(state.hasMore).toBe(false);
      });
    });

    describe("clearResults", () => {
      it("should clear all results", () => {
        act(() => {
          useSearchStore
            .getState()
            .setResults([createMessageResult()], 10, true);
          useSearchStore.getState().setCurrentPage(5);
          useSearchStore.getState().clearResults();
        });

        const state = useSearchStore.getState();
        expect(state.results).toHaveLength(0);
        expect(state.totalResults).toBe(0);
        expect(state.hasMore).toBe(false);
        expect(state.currentPage).toBe(1);
      });
    });

    describe("setCurrentPage", () => {
      it("should set current page", () => {
        act(() => {
          useSearchStore.getState().setCurrentPage(5);
        });

        expect(useSearchStore.getState().currentPage).toBe(5);
      });
    });
  });

  // ==========================================================================
  // Loading Actions Tests
  // ==========================================================================

  describe("Loading Actions", () => {
    describe("setSearching", () => {
      it("should set searching state", () => {
        act(() => {
          useSearchStore.getState().setSearching(true);
        });

        expect(useSearchStore.getState().isSearching).toBe(true);
      });
    });

    describe("setLoadingMore", () => {
      it("should set loading more state", () => {
        act(() => {
          useSearchStore.getState().setLoadingMore(true);
        });

        expect(useSearchStore.getState().isLoadingMore).toBe(true);
      });
    });
  });

  // ==========================================================================
  // UI Actions Tests
  // ==========================================================================

  describe("UI Actions", () => {
    describe("openSearch", () => {
      it("should set isOpen to true", () => {
        act(() => {
          useSearchStore.getState().openSearch();
        });

        expect(useSearchStore.getState().isOpen).toBe(true);
      });
    });

    describe("closeSearch", () => {
      it("should set isOpen to false", () => {
        act(() => {
          useSearchStore.getState().openSearch();
          useSearchStore.getState().closeSearch();
        });

        expect(useSearchStore.getState().isOpen).toBe(false);
      });

      it("should disable quick switcher mode", () => {
        act(() => {
          useSearchStore.getState().enableQuickSwitcherMode();
          useSearchStore.getState().closeSearch();
        });

        expect(useSearchStore.getState().quickSwitcherMode).toBe(false);
      });
    });

    describe("toggleFilters", () => {
      it("should toggle showFilters", () => {
        act(() => {
          useSearchStore.getState().toggleFilters();
        });

        expect(useSearchStore.getState().showFilters).toBe(true);

        act(() => {
          useSearchStore.getState().toggleFilters();
        });

        expect(useSearchStore.getState().showFilters).toBe(false);
      });
    });

    describe("setShowFilters", () => {
      it("should set showFilters explicitly", () => {
        act(() => {
          useSearchStore.getState().setShowFilters(true);
        });

        expect(useSearchStore.getState().showFilters).toBe(true);
      });
    });

    describe("toggleAdvanced", () => {
      it("should toggle showAdvanced", () => {
        act(() => {
          useSearchStore.getState().toggleAdvanced();
        });

        expect(useSearchStore.getState().showAdvanced).toBe(true);
      });
    });

    describe("setShowAdvanced", () => {
      it("should set showAdvanced explicitly", () => {
        act(() => {
          useSearchStore.getState().setShowAdvanced(true);
        });

        expect(useSearchStore.getState().showAdvanced).toBe(true);
      });
    });
  });

  // ==========================================================================
  // History Actions Tests
  // ==========================================================================

  describe("History Actions", () => {
    describe("addRecentSearch", () => {
      it("should add search to history", () => {
        act(() => {
          useSearchStore.getState().addRecentSearch("hello world");
        });

        const { recentSearches } = useSearchStore.getState();
        expect(recentSearches).toHaveLength(1);
        expect(recentSearches[0].query).toBe("hello world");
      });

      it("should add to beginning of history", () => {
        act(() => {
          useSearchStore.getState().addRecentSearch("first");
          useSearchStore.getState().addRecentSearch("second");
        });

        const { recentSearches } = useSearchStore.getState();
        expect(recentSearches[0].query).toBe("second");
      });

      it("should remove duplicate queries", () => {
        act(() => {
          useSearchStore.getState().addRecentSearch("hello");
          useSearchStore.getState().addRecentSearch("world");
          useSearchStore.getState().addRecentSearch("hello");
        });

        const { recentSearches } = useSearchStore.getState();
        expect(recentSearches).toHaveLength(2);
        expect(recentSearches[0].query).toBe("hello");
      });

      it("should limit history to 10 items", () => {
        act(() => {
          for (let i = 0; i < 15; i++) {
            useSearchStore.getState().addRecentSearch(`search-${i}`);
          }
        });

        expect(useSearchStore.getState().recentSearches).toHaveLength(10);
      });

      it("should store filters with search", () => {
        act(() => {
          useSearchStore
            .getState()
            .addRecentSearch("hello", { fromUsers: ["user-1"] });
        });

        expect(useSearchStore.getState().recentSearches[0].filters).toEqual({
          fromUsers: ["user-1"],
        });
      });
    });

    describe("removeRecentSearch", () => {
      it("should remove search from history", () => {
        act(() => {
          useSearchStore.getState().addRecentSearch("hello");
        });

        const id = useSearchStore.getState().recentSearches[0].id;

        act(() => {
          useSearchStore.getState().removeRecentSearch(id);
        });

        expect(useSearchStore.getState().recentSearches).toHaveLength(0);
      });
    });

    describe("clearRecentSearches", () => {
      it("should clear all recent searches", () => {
        act(() => {
          useSearchStore.getState().addRecentSearch("one");
          useSearchStore.getState().addRecentSearch("two");
          useSearchStore.getState().clearRecentSearches();
        });

        expect(useSearchStore.getState().recentSearches).toHaveLength(0);
      });
    });

    describe("saveSearch", () => {
      it("should save current search", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello");
        });

        act(() => {
          useSearchStore.getState().saveSearch("My Search");
        });

        const { savedSearches } = useSearchStore.getState();
        expect(savedSearches).toHaveLength(1);
        expect(savedSearches[0].name).toBe("My Search");
        expect(savedSearches[0].query).toBe("hello");
      });
    });

    describe("removeSavedSearch", () => {
      it("should remove saved search", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello");
          useSearchStore.getState().saveSearch("My Search");
        });

        const id = useSearchStore.getState().savedSearches[0].id;

        act(() => {
          useSearchStore.getState().removeSavedSearch(id);
        });

        expect(useSearchStore.getState().savedSearches).toHaveLength(0);
      });
    });

    describe("loadSavedSearch", () => {
      it("should load saved search", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello");
        });

        act(() => {
          useSearchStore.getState().saveSearch("My Search");
        });

        const saved = useSearchStore.getState().savedSearches[0];

        act(() => {
          useSearchStore.getState().setQuery("other");
          useSearchStore.getState().loadSavedSearch(saved);
        });

        const state = useSearchStore.getState();
        expect(state.query).toBe("hello");
      });
    });
  });

  // ==========================================================================
  // In-Channel Search Tests
  // ==========================================================================

  describe("In-Channel Search", () => {
    describe("startInChannelSearch", () => {
      it("should activate in-channel search", () => {
        act(() => {
          useSearchStore.getState().startInChannelSearch();
        });

        expect(useSearchStore.getState().inChannelSearchActive).toBe(true);
      });

      it("should reset in-channel search state", () => {
        act(() => {
          useSearchStore.getState().setInChannelQuery("test");
          useSearchStore.getState().startInChannelSearch();
        });

        expect(useSearchStore.getState().inChannelSearchQuery).toBe("");
        expect(useSearchStore.getState().inChannelSearchResults).toHaveLength(
          0,
        );
      });
    });

    describe("endInChannelSearch", () => {
      it("should deactivate in-channel search", () => {
        act(() => {
          useSearchStore.getState().startInChannelSearch();
          useSearchStore.getState().endInChannelSearch();
        });

        expect(useSearchStore.getState().inChannelSearchActive).toBe(false);
      });

      it("should clear in-channel search state", () => {
        act(() => {
          useSearchStore.getState().startInChannelSearch();
          useSearchStore.getState().setInChannelQuery("test");
          useSearchStore.getState().endInChannelSearch();
        });

        expect(useSearchStore.getState().inChannelSearchQuery).toBe("");
      });
    });

    describe("setInChannelQuery", () => {
      it("should set in-channel query", () => {
        act(() => {
          useSearchStore.getState().setInChannelQuery("hello");
        });

        expect(useSearchStore.getState().inChannelSearchQuery).toBe("hello");
      });
    });

    describe("setInChannelResults", () => {
      it("should set in-channel results", () => {
        const results = [createMessageResult()];

        act(() => {
          useSearchStore.getState().setInChannelResults(results);
        });

        expect(useSearchStore.getState().inChannelSearchResults).toHaveLength(
          1,
        );
      });

      it("should reset current index", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([createMessageResult()]);
          useSearchStore.getState().navigateInChannelResult("next");
          useSearchStore
            .getState()
            .setInChannelResults([createMessageResult()]);
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(0);
      });
    });

    describe("navigateInChannelResult", () => {
      it("should navigate to next result", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([
              createMessageResult(),
              createMessageResult(),
              createMessageResult(),
            ]);
          useSearchStore.getState().navigateInChannelResult("next");
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(1);
      });

      it("should wrap to beginning", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([
              createMessageResult(),
              createMessageResult(),
            ]);
          useSearchStore.getState().navigateInChannelResult("next");
          useSearchStore.getState().navigateInChannelResult("next");
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(0);
      });

      it("should navigate to previous result", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([
              createMessageResult(),
              createMessageResult(),
            ]);
          useSearchStore.getState().navigateInChannelResult("next");
          useSearchStore.getState().navigateInChannelResult("prev");
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(0);
      });

      it("should wrap to end when going prev from first", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([
              createMessageResult(),
              createMessageResult(),
            ]);
          useSearchStore.getState().navigateInChannelResult("prev");
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(1);
      });

      it("should not navigate with empty results", () => {
        act(() => {
          useSearchStore.getState().navigateInChannelResult("next");
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(0);
      });
    });

    describe("jumpToInChannelResult", () => {
      it("should jump to specific index", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([
              createMessageResult(),
              createMessageResult(),
              createMessageResult(),
            ]);
          useSearchStore.getState().jumpToInChannelResult(2);
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(2);
      });

      it("should not jump to invalid index", () => {
        act(() => {
          useSearchStore
            .getState()
            .setInChannelResults([createMessageResult()]);
          useSearchStore.getState().jumpToInChannelResult(5);
        });

        expect(useSearchStore.getState().inChannelCurrentIndex).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Quick Switcher Tests
  // ==========================================================================

  describe("Quick Switcher", () => {
    describe("enableQuickSwitcherMode", () => {
      it("should enable quick switcher mode", () => {
        act(() => {
          useSearchStore.getState().enableQuickSwitcherMode();
        });

        expect(useSearchStore.getState().quickSwitcherMode).toBe(true);
      });

      it("should open search", () => {
        act(() => {
          useSearchStore.getState().enableQuickSwitcherMode();
        });

        expect(useSearchStore.getState().isOpen).toBe(true);
      });

      it("should clear query and results", () => {
        act(() => {
          useSearchStore.getState().setQuery("hello");
          useSearchStore
            .getState()
            .setResults([createMessageResult()], 1, false);
          useSearchStore.getState().enableQuickSwitcherMode();
        });

        expect(useSearchStore.getState().query).toBe("");
        expect(useSearchStore.getState().results).toHaveLength(0);
      });
    });

    describe("disableQuickSwitcherMode", () => {
      it("should disable quick switcher mode", () => {
        act(() => {
          useSearchStore.getState().enableQuickSwitcherMode();
          useSearchStore.getState().disableQuickSwitcherMode();
        });

        expect(useSearchStore.getState().quickSwitcherMode).toBe(false);
      });

      it("should clear quick switcher results", () => {
        act(() => {
          useSearchStore.getState().enableQuickSwitcherMode();
          useSearchStore
            .getState()
            .setQuickSwitcherResults([createChannelResult()]);
          useSearchStore.getState().disableQuickSwitcherMode();
        });

        expect(useSearchStore.getState().quickSwitcherResults).toHaveLength(0);
      });
    });

    describe("setQuickSwitcherResults", () => {
      it("should set quick switcher results", () => {
        const results = [createChannelResult(), createUserResult()];

        act(() => {
          useSearchStore.getState().setQuickSwitcherResults(results);
        });

        expect(useSearchStore.getState().quickSwitcherResults).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("Reset", () => {
    it("should reset store state", () => {
      act(() => {
        useSearchStore.getState().setQuery("hello");
        useSearchStore.getState().setResults([createMessageResult()], 10, true);
        useSearchStore.getState().addFromUser("user-1");
        useSearchStore.getState().reset();
      });

      const state = useSearchStore.getState();
      expect(state.query).toBe("");
      expect(state.results).toHaveLength(0);
    });

    it("should preserve recent and saved searches", () => {
      act(() => {
        useSearchStore.getState().addRecentSearch("hello");
        useSearchStore.getState().setQuery("test");
        useSearchStore.getState().saveSearch("My Search");
        useSearchStore.getState().reset();
      });

      const state = useSearchStore.getState();
      expect(state.recentSearches.length).toBeGreaterThan(0);
      expect(state.savedSearches.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    describe("selectHasActiveFilters", () => {
      it("should return true when filters are active", () => {
        act(() => {
          useSearchStore.getState().addFromUser("user-1");
        });

        expect(selectHasActiveFilters(useSearchStore.getState())).toBe(true);
      });

      it("should return false when no filters", () => {
        expect(selectHasActiveFilters(useSearchStore.getState())).toBe(false);
      });

      it("should return true for date range filter", () => {
        act(() => {
          useSearchStore
            .getState()
            .setDateRange({ from: new Date(), to: null });
        });

        expect(selectHasActiveFilters(useSearchStore.getState())).toBe(true);
      });
    });

    describe("selectActiveFilterCount", () => {
      it("should count active filters", () => {
        act(() => {
          useSearchStore.getState().addFromUser("user-1");
          useSearchStore.getState().addFromUser("user-2");
          useSearchStore.getState().addInChannel("channel-1");
          useSearchStore.getState().toggleHasFilter("link");
        });

        expect(selectActiveFilterCount(useSearchStore.getState())).toBe(4);
      });

      it("should count date range as one filter", () => {
        act(() => {
          useSearchStore.getState().setDateRange({
            from: new Date(),
            to: new Date(),
          });
        });

        expect(selectActiveFilterCount(useSearchStore.getState())).toBe(1);
      });
    });

    describe("selectFilteredResults", () => {
      it('should return all results for "all" tab', () => {
        act(() => {
          useSearchStore.getState().setActiveTab("all");
          useSearchStore
            .getState()
            .setResults([createMessageResult(), createFileResult()], 2, false);
        });

        expect(selectFilteredResults(useSearchStore.getState())).toHaveLength(
          2,
        );
      });

      it("should filter by type for specific tab", () => {
        act(() => {
          useSearchStore.getState().setActiveTab("messages");
          useSearchStore
            .getState()
            .setResults([createMessageResult(), createFileResult()], 2, false);
        });

        const filtered = selectFilteredResults(useSearchStore.getState());
        expect(filtered.every((r) => r.type === "message")).toBe(true);
      });
    });

    describe("selectResultsByType", () => {
      it("should group results by type", () => {
        act(() => {
          useSearchStore
            .getState()
            .setResults(
              [
                createMessageResult(),
                createMessageResult(),
                createFileResult(),
                createUserResult(),
                createChannelResult(),
              ],
              5,
              false,
            );
        });

        const grouped = selectResultsByType(useSearchStore.getState());
        expect(grouped.messages).toHaveLength(2);
        expect(grouped.files).toHaveLength(1);
        expect(grouped.users).toHaveLength(1);
        expect(grouped.channels).toHaveLength(1);
      });
    });

    describe("selectInChannelSearchState", () => {
      it("should return in-channel search state", () => {
        act(() => {
          useSearchStore.getState().startInChannelSearch();
          useSearchStore.getState().setInChannelQuery("hello");
          useSearchStore
            .getState()
            .setInChannelResults([createMessageResult()]);
        });

        const state = selectInChannelSearchState(useSearchStore.getState());
        expect(state.active).toBe(true);
        expect(state.query).toBe("hello");
        expect(state.total).toBe(1);
        expect(state.currentIndex).toBe(0);
      });
    });
  });
});
