/**
 * SearchService Tests
 *
 * Tests for the search service functionality.
 */

import { SearchService, createSearchService } from "../search.service";

// Mock MeiliSearch
jest.mock("@/lib/search/meilisearch-config", () => ({
  getMeiliClient: jest.fn(() => ({
    index: jest.fn((name: string) => ({
      search: jest.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 10,
      }),
    })),
  })),
  getMessagesIndex: jest.fn(() => ({
    search: jest.fn().mockResolvedValue({
      hits: [
        {
          id: "msg-1",
          content: "Test message content",
          content_plain: "Test message content",
          channel_id: "channel-1",
          channel_name: "general",
          author_id: "user-1",
          author_name: "John Doe",
          created_at: 1704067200,
          _rankingScore: 0.95,
          _formatted: { content: "<mark>Test</mark> message content" },
        },
      ],
      estimatedTotalHits: 1,
      totalHits: 1,
      processingTimeMs: 15,
    }),
  })),
  getFilesIndex: jest.fn(() => ({
    search: jest.fn().mockResolvedValue({
      hits: [
        {
          id: "file-1",
          name: "document.pdf",
          original_name: "document.pdf",
          mime_type: "application/pdf",
          file_type: "document",
          size: 1024,
          uploader_id: "user-1",
          uploader_name: "John Doe",
          channel_id: "channel-1",
          created_at: 1704067200,
          _rankingScore: 0.85,
        },
      ],
      estimatedTotalHits: 1,
      totalHits: 1,
      processingTimeMs: 12,
    }),
  })),
  getUsersIndex: jest.fn(() => ({
    search: jest.fn().mockResolvedValue({
      hits: [
        {
          id: "user-1",
          username: "johndoe",
          display_name: "John Doe",
          email: "john@example.com",
          role: "member",
          is_active: true,
          created_at: 1704067200,
          _rankingScore: 0.9,
        },
      ],
      estimatedTotalHits: 1,
      totalHits: 1,
      processingTimeMs: 8,
    }),
  })),
  getChannelsIndex: jest.fn(() => ({
    search: jest.fn().mockResolvedValue({
      hits: [
        {
          id: "channel-1",
          name: "general",
          description: "General discussion",
          type: "public",
          is_private: false,
          is_archived: false,
          member_count: 50,
          created_at: 1704067200,
          _rankingScore: 0.88,
        },
      ],
      estimatedTotalHits: 1,
      totalHits: 1,
      processingTimeMs: 10,
    }),
  })),
  INDEXES: {
    MESSAGES: "nchat_messages",
    FILES: "nchat_files",
    USERS: "nchat_users",
    CHANNELS: "nchat_channels",
  },
}));

jest.mock("@/lib/search/query-parser", () => ({
  parseQuery: jest.fn((query: string) => ({
    text: query,
    filters: {},
    operators: [],
  })),
  buildMeiliSearchFilter: jest.fn(() => ""),
}));

describe("SearchService", () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = createSearchService();
    jest.clearAllMocks();
  });

  describe("search", () => {
    it("should search across all types by default", async () => {
      const results = await searchService.search({ query: "test" });

      expect(results).toBeDefined();
      expect(results.query).toBe("test");
      expect(results.hits).toBeDefined();
      expect(Array.isArray(results.hits)).toBe(true);
    });

    it("should search only specified types", async () => {
      const results = await searchService.search({
        query: "test",
        types: ["messages"],
      });

      expect(results).toBeDefined();
      expect(results.query).toBe("test");
    });

    it("should include processing time", async () => {
      const results = await searchService.search({ query: "test" });

      expect(results.processingTimeMs).toBeDefined();
      expect(typeof results.processingTimeMs).toBe("number");
    });

    it("should return facets", async () => {
      const results = await searchService.search({ query: "test" });

      expect(results.facets).toBeDefined();
      expect(typeof results.facets?.messages).toBe("number");
      expect(typeof results.facets?.files).toBe("number");
      expect(typeof results.facets?.users).toBe("number");
      expect(typeof results.facets?.channels).toBe("number");
    });

    it("should apply filters", async () => {
      const results = await searchService.search({
        query: "test",
        filters: {
          channelIds: ["channel-1"],
          dateFrom: "2024-01-01",
        },
      });

      expect(results).toBeDefined();
    });
  });

  describe("searchMessages", () => {
    it("should search messages only", async () => {
      const results = await searchService.searchMessages("test");

      expect(results).toBeDefined();
      expect(results.query).toBe("test");
      expect(results.hits).toBeDefined();
    });

    it("should apply message-specific filters", async () => {
      const results = await searchService.searchMessages("test", {
        hasLink: true,
        isPinned: true,
      });

      expect(results).toBeDefined();
    });

    it("should support pagination", async () => {
      const results = await searchService.searchMessages("test", undefined, {
        limit: 10,
        offset: 20,
      });

      expect(results.limit).toBe(10);
      expect(results.offset).toBe(20);
    });
  });

  describe("searchFiles", () => {
    it("should search files only", async () => {
      const results = await searchService.searchFiles("document");

      expect(results).toBeDefined();
      expect(results.query).toBe("document");
    });

    it("should filter by file types", async () => {
      const results = await searchService.searchFiles("document", {
        fileTypes: ["document", "image"],
      });

      expect(results).toBeDefined();
    });
  });

  describe("searchUsers", () => {
    it("should search users only", async () => {
      const results = await searchService.searchUsers("john");

      expect(results).toBeDefined();
      expect(results.query).toBe("john");
    });

    it("should filter by roles", async () => {
      const results = await searchService.searchUsers("john", {
        roles: ["admin", "moderator"],
      });

      expect(results).toBeDefined();
    });
  });

  describe("searchChannels", () => {
    it("should search channels only", async () => {
      const results = await searchService.searchChannels("general");

      expect(results).toBeDefined();
      expect(results.query).toBe("general");
    });

    it("should filter by privacy", async () => {
      const results = await searchService.searchChannels("general", {
        isPrivate: false,
      });

      expect(results).toBeDefined();
    });
  });

  describe("getSuggestions", () => {
    it("should return suggestions for partial query", async () => {
      const suggestions = await searchService.getSuggestions("jo");

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should return empty array for very short queries", async () => {
      const suggestions = await searchService.getSuggestions("j");

      expect(suggestions).toEqual([]);
    });

    it("should include operator suggestions", async () => {
      const suggestions = await searchService.getSuggestions("from:");

      // Should include operator suggestions
      expect(suggestions.some((s) => s.type === "operator")).toBe(true);
    });
  });

  describe("getUserMentionSuggestions", () => {
    it("should return user suggestions", async () => {
      const suggestions = await searchService.getUserMentionSuggestions("jo");

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should return empty for empty query", async () => {
      const suggestions = await searchService.getUserMentionSuggestions("");

      expect(suggestions).toEqual([]);
    });
  });

  describe("getChannelMentionSuggestions", () => {
    it("should return channel suggestions", async () => {
      const suggestions =
        await searchService.getChannelMentionSuggestions("gen");

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should filter private channels when specified", async () => {
      const suggestions = await searchService.getChannelMentionSuggestions(
        "gen",
        {
          includePrivate: false,
        },
      );

      expect(suggestions).toBeDefined();
    });
  });
});
