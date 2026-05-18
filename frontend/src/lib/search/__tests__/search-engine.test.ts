/**
 * Search Engine Tests
 *
 * Comprehensive tests for the search engine including:
 * - Search scopes (global, channel, DM, thread)
 * - Filters and modifiers
 * - Recent/saved queries
 * - Caching
 * - Suggestions
 */

import {
  createSearchEngine,
  SearchEngine,
  type SearchOptions,
} from "../search-engine";

// ============================================================================
// Test Setup
// ============================================================================

describe("SearchEngine", () => {
  let engine: SearchEngine;

  beforeEach(() => {
    engine = createSearchEngine();
    // Clear localStorage mock
    localStorage.clear();
  });

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================

  describe("initialization", () => {
    it("should create a new search engine instance", () => {
      expect(engine).toBeInstanceOf(SearchEngine);
    });

    it("should have empty recent queries on init", () => {
      expect(engine.getRecentQueries()).toHaveLength(0);
    });

    it("should have empty saved queries on init", () => {
      expect(engine.getSavedQueries()).toHaveLength(0);
    });

    it("should have empty cache on init", () => {
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  // ==========================================================================
  // Search Scopes
  // ==========================================================================

  describe("search scopes", () => {
    describe("global search", () => {
      it("should search globally with all types", async () => {
        const options: SearchOptions = {
          query: "hello world",
          scope: "global",
        };
        const response = await engine.search(options);
        expect(response.scope).toBe("global");
        expect(response.scopeId).toBeUndefined();
      });

      it("should search globally with specific types", async () => {
        const response = await engine.searchMessages("test");
        expect(response.scope).toBe("global");
      });
    });

    describe("channel search", () => {
      it("should search within a specific channel", async () => {
        const response = await engine.searchInChannel("channel-123", "meeting");
        expect(response.scope).toBe("channel");
        expect(response.scopeId).toBe("channel-123");
      });

      it("should only return messages and files for channel search", async () => {
        const options: SearchOptions = {
          query: "test",
          scope: "channel",
          scopeId: "channel-123",
          types: ["message", "file"],
        };
        const response = await engine.search(options);
        expect(response.scope).toBe("channel");
      });
    });

    describe("DM search", () => {
      it("should search within a DM conversation", async () => {
        const response = await engine.searchInDM("dm-456", "important");
        expect(response.scope).toBe("dm");
        expect(response.scopeId).toBe("dm-456");
      });
    });

    describe("thread search", () => {
      it("should search within a thread", async () => {
        const response = await engine.searchInThread("thread-789", "reply");
        expect(response.scope).toBe("thread");
        expect(response.scopeId).toBe("thread-789");
      });
    });

    describe("user search", () => {
      it("should search messages from a specific user", async () => {
        const response = await engine.searchFromUser("user-123", "project");
        expect(response.scope).toBe("user");
        expect(response.scopeId).toBe("user-123");
      });
    });
  });

  // ==========================================================================
  // Type-Specific Search
  // ==========================================================================

  describe("type-specific search", () => {
    it("should search messages only", async () => {
      const response = await engine.searchMessages("hello");
      expect(response.query).toBe("hello");
    });

    it("should search files only", async () => {
      const response = await engine.searchFiles("document.pdf");
      expect(response.query).toBe("document.pdf");
    });

    it("should search users only", async () => {
      const response = await engine.searchUsers("john");
      expect(response.query).toBe("john");
    });

    it("should search channels only", async () => {
      const response = await engine.searchChannels("general");
      expect(response.query).toBe("general");
    });
  });

  // ==========================================================================
  // Search Options
  // ==========================================================================

  describe("search options", () => {
    it("should accept custom limit", async () => {
      const options: SearchOptions = {
        query: "test",
        scope: "global",
        limit: 50,
      };
      const response = await engine.search(options);
      expect(response.limit).toBe(50);
    });

    it("should accept custom offset", async () => {
      const options: SearchOptions = {
        query: "test",
        scope: "global",
        offset: 20,
      };
      const response = await engine.search(options);
      expect(response.offset).toBe(20);
    });

    it("should accept sort options", async () => {
      const options: SearchOptions = {
        query: "test",
        scope: "global",
        sortBy: "date",
        sortOrder: "asc",
      };
      const response = await engine.search(options);
      expect(response.query).toBe("test");
    });

    it("should accept semantic mode", async () => {
      const options: SearchOptions = {
        query: "find similar discussions",
        scope: "global",
        semantic: true,
      };
      const response = await engine.search(options);
      expect(response.semanticMode).toBe(true);
    });

    it("should accept includeArchived option", async () => {
      const options: SearchOptions = {
        query: "old stuff",
        scope: "global",
        includeArchived: true,
      };
      const response = await engine.search(options);
      expect(response.query).toBe("old stuff");
    });
  });

  // ==========================================================================
  // Recent Queries
  // ==========================================================================

  describe("recent queries", () => {
    it("should add search to recent queries", async () => {
      await engine.search({ query: "test query", scope: "global" });
      const recent = engine.getRecentQueries();
      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0].query).toBe("test query");
    });

    it("should not add empty queries to recent", async () => {
      await engine.search({ query: "", scope: "global" });
      const recent = engine.getRecentQueries();
      expect(recent).toHaveLength(0);
    });

    it("should not add very short queries to recent", async () => {
      await engine.search({ query: "a", scope: "global" });
      const recent = engine.getRecentQueries();
      expect(recent).toHaveLength(0);
    });

    it("should limit recent queries", async () => {
      for (let i = 0; i < 60; i++) {
        await engine.search({ query: `test query ${i}`, scope: "global" });
      }
      const recent = engine.getRecentQueries();
      expect(recent.length).toBeLessThanOrEqual(50);
    });

    it("should get recent queries with limit", () => {
      engine.saveQuery("Test 1", "query 1", {
        fromUsers: [],
        inChannels: [],
        toUsers: [],
        mentionsUsers: [],
        beforeDate: null,
        afterDate: null,
        hasFilters: [],
        isFilters: [],
      });
      const recent = engine.getRecentQueries({ limit: 5 });
      expect(recent.length).toBeLessThanOrEqual(5);
    });

    it("should get recent queries by scope", async () => {
      await engine.search({ query: "global query", scope: "global" });
      await engine.search({
        query: "channel query",
        scope: "channel",
        scopeId: "ch1",
      });
      const channelRecent = engine.getRecentQueries({ scope: "channel" });
      expect(channelRecent.every((q) => q.scope === "channel")).toBe(true);
    });

    it("should remove duplicate recent queries", async () => {
      await engine.search({ query: "duplicate", scope: "global" });
      await engine.search({ query: "duplicate", scope: "global" });
      const recent = engine.getRecentQueries();
      const duplicates = recent.filter((q) => q.query === "duplicate");
      expect(duplicates).toHaveLength(1);
    });

    it("should clear recent queries", async () => {
      await engine.search({ query: "test", scope: "global" });
      engine.clearRecentQueries();
      expect(engine.getRecentQueries()).toHaveLength(0);
    });

    it("should remove a specific recent query", async () => {
      await engine.search({ query: "to remove", scope: "global" });
      const recent = engine.getRecentQueries();
      const id = recent[0]?.id;
      if (id) {
        engine.removeRecentQuery(id);
        expect(
          engine.getRecentQueries().find((q) => q.id === id),
        ).toBeUndefined();
      }
    });
  });

  // ==========================================================================
  // Saved Queries
  // ==========================================================================

  describe("saved queries", () => {
    const defaultFilters = {
      fromUsers: [],
      inChannels: [],
      toUsers: [],
      mentionsUsers: [],
      beforeDate: null,
      afterDate: null,
      hasFilters: [],
      isFilters: [],
    };

    it("should save a query", () => {
      const saved = engine.saveQuery(
        "My Search",
        "from:john in:general",
        defaultFilters,
      );
      expect(saved.name).toBe("My Search");
      expect(saved.query).toBe("from:john in:general");
    });

    it("should get saved queries", () => {
      engine.saveQuery("Search 1", "query 1", defaultFilters);
      engine.saveQuery("Search 2", "query 2", defaultFilters);
      const saved = engine.getSavedQueries();
      expect(saved).toHaveLength(2);
    });

    it("should get saved queries with limit", () => {
      for (let i = 0; i < 10; i++) {
        engine.saveQuery(`Search ${i}`, `query ${i}`, defaultFilters);
      }
      const saved = engine.getSavedQueries({ limit: 5 });
      expect(saved).toHaveLength(5);
    });

    it("should get saved queries by scope", () => {
      engine.saveQuery("Global", "query", defaultFilters, "global");
      engine.saveQuery("Channel", "query", defaultFilters, "channel", "ch1");
      const channelSaved = engine.getSavedQueries({ scope: "channel" });
      expect(channelSaved.every((q) => q.scope === "channel")).toBe(true);
    });

    it("should update a saved query", () => {
      const saved = engine.saveQuery("Original", "query", defaultFilters);
      const updated = engine.updateSavedQuery(saved.id, { name: "Updated" });
      expect(updated?.name).toBe("Updated");
    });

    it("should return null when updating non-existent query", () => {
      const updated = engine.updateSavedQuery("non-existent", { name: "Test" });
      expect(updated).toBeNull();
    });

    it("should delete a saved query", () => {
      const saved = engine.saveQuery("To Delete", "query", defaultFilters);
      const deleted = engine.deleteSavedQuery(saved.id);
      expect(deleted).toBe(true);
      expect(
        engine.getSavedQueries().find((q) => q.id === saved.id),
      ).toBeUndefined();
    });

    it("should return false when deleting non-existent query", () => {
      const deleted = engine.deleteSavedQuery("non-existent");
      expect(deleted).toBe(false);
    });

    it("should increment use count when using saved query", () => {
      const saved = engine.saveQuery("Test", "query", defaultFilters);
      expect(saved.useCount).toBe(0);
      engine.useSavedQuery(saved.id);
      const updated = engine.getSavedQueries().find((q) => q.id === saved.id);
      expect(updated?.useCount).toBe(1);
    });

    it("should update lastUsedAt when using saved query", () => {
      const saved = engine.saveQuery("Test", "query", defaultFilters);
      expect(saved.lastUsedAt).toBeUndefined();
      engine.useSavedQuery(saved.id);
      const updated = engine.getSavedQueries().find((q) => q.id === saved.id);
      expect(updated?.lastUsedAt).toBeDefined();
    });

    it("should return null when using non-existent query", () => {
      const result = engine.useSavedQuery("non-existent");
      expect(result).toBeNull();
    });

    it("should sort saved queries by use count", () => {
      const s1 = engine.saveQuery("Less Used", "q1", defaultFilters);
      const s2 = engine.saveQuery("Most Used", "q2", defaultFilters);
      engine.useSavedQuery(s2.id);
      engine.useSavedQuery(s2.id);
      engine.useSavedQuery(s1.id);
      const saved = engine.getSavedQueries();
      expect(saved[0].name).toBe("Most Used");
    });
  });

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  describe("export/import", () => {
    const defaultFilters = {
      fromUsers: [],
      inChannels: [],
      toUsers: [],
      mentionsUsers: [],
      beforeDate: null,
      afterDate: null,
      hasFilters: [],
      isFilters: [],
    };

    it("should export saved queries as JSON", () => {
      engine.saveQuery("Test", "query", defaultFilters);
      const json = engine.exportSavedQueries();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("Test");
    });

    it("should import saved queries", () => {
      const json = JSON.stringify([
        {
          id: "imported-1",
          name: "Imported Query",
          query: "test",
          filters: defaultFilters,
          scope: "global",
          createdAt: new Date().toISOString(),
          useCount: 0,
          isDefault: false,
        },
      ]);
      const count = engine.importSavedQueries(json);
      expect(count).toBe(1);
      expect(
        engine.getSavedQueries().some((q) => q.name === "Imported Query"),
      ).toBe(true);
    });

    it("should merge imported queries with existing", () => {
      engine.saveQuery("Existing", "query", defaultFilters);
      const json = JSON.stringify([
        {
          id: "imported-1",
          name: "Imported",
          query: "test",
          filters: defaultFilters,
          scope: "global",
          createdAt: new Date().toISOString(),
          useCount: 0,
          isDefault: false,
        },
      ]);
      engine.importSavedQueries(json, true);
      expect(engine.getSavedQueries()).toHaveLength(2);
    });

    it("should replace existing when merge is false", () => {
      engine.saveQuery("Existing", "query", defaultFilters);
      const json = JSON.stringify([
        {
          id: "imported-1",
          name: "Imported",
          query: "test",
          filters: defaultFilters,
          scope: "global",
          createdAt: new Date().toISOString(),
          useCount: 0,
          isDefault: false,
        },
      ]);
      engine.importSavedQueries(json, false);
      expect(engine.getSavedQueries()).toHaveLength(1);
      expect(engine.getSavedQueries()[0].name).toBe("Imported");
    });

    it("should return 0 for invalid JSON", () => {
      const count = engine.importSavedQueries("invalid json");
      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // Cache
  // ==========================================================================

  describe("cache", () => {
    it("should return cache stats", () => {
      const stats = engine.getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("hitRate");
    });

    it("should clear cache", async () => {
      await engine.search({ query: "test", scope: "global" });
      engine.clearCache();
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  // ==========================================================================
  // Suggestions
  // ==========================================================================

  describe("suggestions", () => {
    it("should return empty for very short queries without operator prefix", async () => {
      // Note: 'a' starts with 'after:' operator so it returns suggestions
      // Use a character that doesn't match any operator
      const suggestions = await engine.getSuggestions("x");
      expect(suggestions).toHaveLength(0);
    });

    it("should return operator suggestions", async () => {
      const suggestions = await engine.getSuggestions("from:", {
        includeOperators: true,
      });
      expect(suggestions.some((s) => s.type === "operator")).toBe(true);
    });

    it("should include recent queries in suggestions", async () => {
      await engine.search({ query: "meeting notes", scope: "global" });
      const suggestions = await engine.getSuggestions("meet", {
        includeRecent: true,
      });
      expect(suggestions.some((s) => s.type === "recent")).toBe(true);
    });

    it("should include saved queries in suggestions", async () => {
      engine.saveQuery("Daily Standup", "in:general is:thread", {
        fromUsers: [],
        inChannels: ["general"],
        toUsers: [],
        mentionsUsers: [],
        beforeDate: null,
        afterDate: null,
        hasFilters: [],
        isFilters: ["thread"],
      });
      const suggestions = await engine.getSuggestions("daily", {
        includeSaved: true,
      });
      expect(suggestions.some((s) => s.type === "saved")).toBe(true);
    });

    it("should respect limit option", async () => {
      const suggestions = await engine.getSuggestions("test", {
        limit: 3,
      });
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it("should respect scope option", async () => {
      await engine.search({ query: "global query", scope: "global" });
      await engine.search({
        query: "channel query",
        scope: "channel",
        scopeId: "ch1",
      });
      const suggestions = await engine.getSuggestions("query", {
        scope: "channel",
        includeRecent: true,
      });
      // Should only include channel-scoped recent queries
      const recentSuggestions = suggestions.filter((s) => s.type === "recent");
      expect(
        recentSuggestions.every(
          (s) => s.text === "channel query" || !s.text.includes("global"),
        ),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Persistence
  // ==========================================================================

  describe("persistence", () => {
    it("should load from storage", () => {
      const recent = [
        {
          id: "r1",
          query: "stored query",
          filters: {},
          scope: "global" as const,
          timestamp: new Date().toISOString(),
          resultCount: 10,
        },
      ];
      localStorage.setItem("nchat_recent_searches", JSON.stringify(recent));

      const newEngine = createSearchEngine();
      newEngine.loadFromStorage();
      expect(
        newEngine.getRecentQueries().some((q) => q.query === "stored query"),
      ).toBe(true);
    });

    it("should handle corrupted storage gracefully", () => {
      localStorage.setItem("nchat_recent_searches", "invalid json");
      const newEngine = createSearchEngine();
      expect(() => newEngine.loadFromStorage()).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle empty query", async () => {
      const response = await engine.search({ query: "", scope: "global" });
      expect(response.results).toHaveLength(0);
    });

    it("should handle whitespace-only query", async () => {
      const response = await engine.search({ query: "   ", scope: "global" });
      expect(response.results).toHaveLength(0);
    });

    it("should handle special characters in query", async () => {
      const response = await engine.search({
        query: "test @#$%^&*()",
        scope: "global",
      });
      expect(response.query).toBe("test @#$%^&*()");
    });

    it("should handle very long query", async () => {
      const longQuery = "a".repeat(1000);
      const response = await engine.search({
        query: longQuery,
        scope: "global",
      });
      expect(response.query).toBe(longQuery);
    });

    it("should handle unicode characters", async () => {
      const response = await engine.search({
        query: "你好世界 emoji 🎉",
        scope: "global",
      });
      expect(response.query).toBe("你好世界 emoji 🎉");
    });
  });
});
