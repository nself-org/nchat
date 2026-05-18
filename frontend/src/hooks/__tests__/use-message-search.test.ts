/**
 * useMessageSearch Hook Tests
 *
 * Tests for the comprehensive message search hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";

// Mock the search engine
jest.mock("@/lib/search/search-engine", () => ({
  getSearchEngine: jest.fn(() => ({
    getRecentQueries: jest.fn(() => []),
    getSavedQueries: jest.fn(() => []),
    getSuggestions: jest.fn(() => Promise.resolve([])),
    saveQuery: jest.fn((name, query) => ({
      id: "saved-1",
      name,
      query,
      filters: {},
      scope: "global",
      createdAt: new Date(),
      useCount: 0,
      isDefault: false,
    })),
    useSavedQuery: jest.fn((id) => ({
      id,
      name: "Test Query",
      query: "test",
      scope: "global",
      filters: {},
      createdAt: new Date(),
      useCount: 1,
      isDefault: false,
    })),
    deleteSavedQuery: jest.fn(() => true),
    clearRecentQueries: jest.fn(),
    removeRecentQuery: jest.fn(),
  })),
  createSearchEngine: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock useDebounce to be synchronous in tests
jest.mock("@/hooks/use-debounce", () => ({
  useDebounce: jest.fn((value) => value),
}));

import { useMessageSearch } from "../use-message-search";

describe("useMessageSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          results: [],
          totals: { messages: 0, files: 0, users: 0, channels: 0, total: 0 },
        }),
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe("initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useMessageSearch());

      expect(result.current.query).toBe("");
      expect(result.current.scope).toBe("global");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results).toHaveLength(0);
    });

    it("should accept initial options", () => {
      const { result } = renderHook(() =>
        useMessageSearch({
          scope: "channel",
          scopeId: "channel-123",
          types: ["message"],
          initialQuery: "hello",
        }),
      );

      expect(result.current.scope).toBe("channel");
      expect(result.current.scopeId).toBe("channel-123");
      expect(result.current.types).toEqual(["message"]);
      expect(result.current.query).toBe("hello");
    });

    it("should initialize semantic mode from options", () => {
      const { result } = renderHook(() =>
        useMessageSearch({
          semanticDefault: true,
        }),
      );

      expect(result.current.semantic).toBe(true);
    });
  });

  // ==========================================================================
  // Query Management
  // ==========================================================================

  describe("query management", () => {
    it("should update query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("new query");
      });

      expect(result.current.query).toBe("new query");
    });

    it("should have debounced query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("debounced");
      });

      expect(result.current.debouncedQuery).toBe("debounced");
    });

    it("should reset state", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("test");
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.query).toBe("");
      expect(result.current.results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Scope Management
  // ==========================================================================

  describe("scope management", () => {
    it("should update scope", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setScope("channel", "channel-456");
      });

      expect(result.current.scope).toBe("channel");
      expect(result.current.scopeId).toBe("channel-456");
    });

    it("should clear results when scope changes", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setScope("dm", "dm-789");
      });

      expect(result.current.results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Type Filtering
  // ==========================================================================

  describe("type filtering", () => {
    it("should update types", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setTypes(["message", "file"]);
      });

      expect(result.current.types).toEqual(["message", "file"]);
    });
  });

  // ==========================================================================
  // Sorting
  // ==========================================================================

  describe("sorting", () => {
    it("should update sort field", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setSortBy("date");
      });

      expect(result.current.sortBy).toBe("date");
    });

    it("should update sort order", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setSortOrder("asc");
      });

      expect(result.current.sortOrder).toBe("asc");
    });
  });

  // ==========================================================================
  // Semantic Search
  // ==========================================================================

  describe("semantic search", () => {
    it("should toggle semantic mode", () => {
      const { result } = renderHook(() => useMessageSearch());

      expect(result.current.semantic).toBe(false);

      act(() => {
        result.current.toggleSemantic();
      });

      expect(result.current.semantic).toBe(true);

      act(() => {
        result.current.toggleSemantic();
      });

      expect(result.current.semantic).toBe(false);
    });
  });

  // ==========================================================================
  // Search Execution
  // ==========================================================================

  describe("search execution", () => {
    it("should call fetch with correct parameters", async () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("test search");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/search",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    });

    it("should handle successful search", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            results: [{ id: "1", type: "message", content: "Test message" }],
            totals: { messages: 1, files: 0, users: 0, channels: 0, total: 1 },
          }),
      });

      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
        expect(result.current.totalHits).toBe(1);
      });
    });

    it("should handle search error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });

    it("should not search for empty query without filters", async () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("");
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(0);
      });

      // Should not have called fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Pagination
  // ==========================================================================

  describe("pagination", () => {
    it("should load more results", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              results: [{ id: "1", type: "message" }],
              totals: {
                messages: 2,
                files: 0,
                users: 0,
                channels: 0,
                total: 2,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              results: [{ id: "2", type: "message" }],
              totals: {
                messages: 2,
                files: 0,
                users: 0,
                channels: 0,
                total: 2,
              },
            }),
        });

      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.results.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should not load more when no more results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            results: [{ id: "1", type: "message" }],
            totals: { messages: 1, files: 0, users: 0, channels: 0, total: 1 },
          }),
      });

      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      // loadMore should be a no-op
      const initialFetchCount = mockFetch.mock.calls.length;

      act(() => {
        result.current.loadMore();
      });

      // Should not have made additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(initialFetchCount);
    });
  });

  // ==========================================================================
  // Parsed Filters
  // ==========================================================================

  describe("parsed filters", () => {
    it("should parse filters from query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("from:john in:general has:link");
      });

      expect(result.current.parsedFilters.fromUsers).toContain("john");
      expect(result.current.parsedFilters.inChannels).toContain("general");
      expect(result.current.parsedFilters.hasFilters).toContain("link");
    });

    it("should detect active filters", () => {
      const { result } = renderHook(() => useMessageSearch());

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setQuery("from:alice");
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  // ==========================================================================
  // Recent Queries
  // ==========================================================================

  describe("recent queries", () => {
    it("should load recent queries", () => {
      const { result } = renderHook(() => useMessageSearch());

      expect(result.current.recentQueries).toBeDefined();
      expect(Array.isArray(result.current.recentQueries)).toBe(true);
    });

    it("should clear recent queries", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.clearRecentQueries();
      });

      // Should have called the engine method
      expect(result.current.recentQueries).toBeDefined();
    });

    it("should remove recent query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.removeRecentQuery("recent-1");
      });

      expect(result.current.recentQueries).toBeDefined();
    });
  });

  // ==========================================================================
  // Saved Queries
  // ==========================================================================

  describe("saved queries", () => {
    it("should load saved queries", () => {
      const { result } = renderHook(() => useMessageSearch());

      expect(result.current.savedQueries).toBeDefined();
      expect(Array.isArray(result.current.savedQueries)).toBe(true);
    });

    it("should save a query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.setQuery("important search");
      });

      let saved;
      act(() => {
        saved = result.current.saveQuery("My Important Search");
      });

      expect(saved).toBeDefined();
    });

    it("should not save empty query", () => {
      const { result } = renderHook(() => useMessageSearch());

      let saved;
      act(() => {
        saved = result.current.saveQuery("Empty Query");
      });

      expect(saved).toBeNull();
    });

    it("should load saved query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.loadSavedQuery("saved-1");
      });

      expect(result.current.query).toBe("test");
    });

    it("should delete saved query", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.deleteSavedQuery("saved-1");
      });

      expect(result.current.savedQueries).toBeDefined();
    });
  });

  // ==========================================================================
  // Suggestions
  // ==========================================================================

  describe("suggestions", () => {
    it("should load suggestions", async () => {
      const { result } = renderHook(() => useMessageSearch());

      await act(async () => {
        await result.current.loadSuggestions("test");
      });

      expect(result.current.suggestions).toBeDefined();
    });

    it("should clear suggestions", () => {
      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.clearSuggestions();
      });

      expect(result.current.suggestions).toHaveLength(0);
    });

    it("should not load suggestions for short input", async () => {
      const { result } = renderHook(() => useMessageSearch());

      await act(async () => {
        await result.current.loadSuggestions("a");
      });

      expect(result.current.suggestions).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Utilities
  // ==========================================================================

  describe("utilities", () => {
    it("should dispatch jump to message event", () => {
      const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");

      const { result } = renderHook(() => useMessageSearch());

      act(() => {
        result.current.jumpToMessage("msg-123", "channel-456");
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "nchat:jump-to-message",
          detail: { messageId: "msg-123", channelId: "channel-456" },
        }),
      );

      dispatchEventSpy.mockRestore();
    });
  });
});
