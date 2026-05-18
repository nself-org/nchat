/**
 * Search Client Unit Tests
 *
 * Tests for the search client including query building, filtering,
 * pagination, caching, and result highlighting.
 */

import {
  SearchClient,
  SearchQueryBuilder,
  SearchError,
  getSearchClient,
  createSearchClient,
  type SearchRequest,
  type SearchResponse,
  type MessageSearchResult,
  type ChannelSearchResult,
  type UserSearchResult,
  type FileSearchResult,
  type SearchFilters,
  type SearchOptions,
} from "../search-client";

// ============================================================================
// Mocks
// ============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockResponse = <T>(data: T, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
  }) as Response;

const createMockMessageResult = (
  overrides?: Partial<MessageSearchResult>,
): MessageSearchResult => ({
  id: "msg-1",
  type: "message",
  score: 1.0,
  highlights: [],
  content: "Test message",
  channelId: "channel-1",
  channelName: "general",
  authorId: "user-1",
  authorName: "John Doe",
  timestamp: new Date("2024-01-15"),
  isPinned: false,
  isStarred: false,
  attachments: [],
  ...overrides,
});

const createMockChannelResult = (
  overrides?: Partial<ChannelSearchResult>,
): ChannelSearchResult => ({
  id: "channel-1",
  type: "channel",
  score: 1.0,
  highlights: [],
  name: "general",
  slug: "general",
  channelType: "public",
  memberCount: 10,
  isMember: true,
  ...overrides,
});

const createMockUserResult = (
  overrides?: Partial<UserSearchResult>,
): UserSearchResult => ({
  id: "user-1",
  type: "user",
  score: 1.0,
  highlights: [],
  username: "johndoe",
  displayName: "John Doe",
  status: "online",
  ...overrides,
});

const createMockFileResult = (
  overrides?: Partial<FileSearchResult>,
): FileSearchResult => ({
  id: "file-1",
  type: "file",
  score: 1.0,
  highlights: [],
  fileName: "document.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  messageId: "msg-1",
  channelId: "channel-1",
  uploaderId: "user-1",
  uploadedAt: new Date("2024-01-15"),
  ...overrides,
});

// ============================================================================
// SearchQueryBuilder Tests
// ============================================================================

describe("SearchQueryBuilder", () => {
  let builder: SearchQueryBuilder;

  beforeEach(() => {
    builder = new SearchQueryBuilder();
  });

  describe("query building", () => {
    it("should set query text", () => {
      const request = builder.query("hello world").build();
      expect(request.query).toBe("hello world");
    });

    it("should chain query methods", () => {
      const request = builder
        .query("hello")
        .from("user-1")
        .inChannel("channel-1")
        .build();
      expect(request.query).toBe("hello");
      expect(request.filters.fromUsers).toEqual(["user-1"]);
      expect(request.filters.inChannels).toEqual(["channel-1"]);
    });
  });

  describe("from filter", () => {
    it("should add single user", () => {
      const request = builder.from("user-1").build();
      expect(request.filters.fromUsers).toEqual(["user-1"]);
    });

    it("should add multiple users as array", () => {
      const request = builder.from(["user-1", "user-2"]).build();
      expect(request.filters.fromUsers).toEqual(["user-1", "user-2"]);
    });

    it("should accumulate multiple from calls", () => {
      const request = builder.from("user-1").from("user-2").build();
      expect(request.filters.fromUsers).toEqual(["user-1", "user-2"]);
    });
  });

  describe("inChannel filter", () => {
    it("should add single channel", () => {
      const request = builder.inChannel("channel-1").build();
      expect(request.filters.inChannels).toEqual(["channel-1"]);
    });

    it("should add multiple channels as array", () => {
      const request = builder.inChannel(["channel-1", "channel-2"]).build();
      expect(request.filters.inChannels).toEqual(["channel-1", "channel-2"]);
    });

    it("should accumulate multiple inChannel calls", () => {
      const request = builder
        .inChannel("channel-1")
        .inChannel("channel-2")
        .build();
      expect(request.filters.inChannels).toEqual(["channel-1", "channel-2"]);
    });
  });

  describe("date filters", () => {
    it("should set date range", () => {
      const from = new Date("2024-01-01");
      const to = new Date("2024-12-31");
      const request = builder.dateRange({ from, to }).build();
      expect(request.filters.dateRange).toEqual({ from, to });
    });

    it("should set before date", () => {
      const date = new Date("2024-01-15");
      const request = builder.before(date).build();
      expect(request.filters.dateRange?.to).toEqual(date);
    });

    it("should set after date", () => {
      const date = new Date("2024-01-15");
      const request = builder.after(date).build();
      expect(request.filters.dateRange?.from).toEqual(date);
    });

    it("should combine before and after", () => {
      const before = new Date("2024-12-31");
      const after = new Date("2024-01-01");
      const request = builder.before(before).after(after).build();
      expect(request.filters.dateRange?.to).toEqual(before);
      expect(request.filters.dateRange?.from).toEqual(after);
    });
  });

  describe("has filters", () => {
    it("should set hasAttachments", () => {
      const request = builder.hasAttachments().build();
      expect(request.filters.hasAttachments).toBe(true);
    });

    it("should set hasAttachments to false", () => {
      const request = builder.hasAttachments(false).build();
      expect(request.filters.hasAttachments).toBe(false);
    });

    it("should set hasLinks", () => {
      const request = builder.hasLinks().build();
      expect(request.filters.hasLinks).toBe(true);
    });

    it("should set hasImages", () => {
      const request = builder.hasImages().build();
      expect(request.filters.hasImages).toBe(true);
    });

    it("should set hasCode", () => {
      const request = builder.hasCode().build();
      expect(request.filters.hasCode).toBe(true);
    });

    it("should set hasMentions", () => {
      const request = builder.hasMentions().build();
      expect(request.filters.hasMentions).toBe(true);
    });

    it("should set hasReactions", () => {
      const request = builder.hasReactions().build();
      expect(request.filters.hasReactions).toBe(true);
    });
  });

  describe("is filters", () => {
    it("should set isPinned", () => {
      const request = builder.isPinned().build();
      expect(request.filters.isPinned).toBe(true);
    });

    it("should set isStarred", () => {
      const request = builder.isStarred().build();
      expect(request.filters.isStarred).toBe(true);
    });

    it("should set isThread", () => {
      const request = builder.isThread().build();
      expect(request.filters.isThread).toBe(true);
    });

    it("should set isUnread", () => {
      const request = builder.isUnread().build();
      expect(request.filters.isUnread).toBe(true);
    });
  });

  describe("type filters", () => {
    it("should set fileTypes", () => {
      const request = builder.fileTypes(["pdf", "doc"]).build();
      expect(request.filters.fileTypes).toEqual(["pdf", "doc"]);
    });

    it("should set channelTypes", () => {
      const request = builder.channelTypes(["public", "private"]).build();
      expect(request.filters.channelTypes).toEqual(["public", "private"]);
    });
  });

  describe("entity type selection", () => {
    it("should select messages", () => {
      const request = builder.messages().build();
      expect(request.options.types).toEqual(["message"]);
    });

    it("should select channels", () => {
      const request = builder.channels().build();
      expect(request.options.types).toEqual(["channel"]);
    });

    it("should select users", () => {
      const request = builder.users().build();
      expect(request.options.types).toEqual(["user"]);
    });

    it("should select files", () => {
      const request = builder.files().build();
      expect(request.options.types).toEqual(["file"]);
    });

    it("should select multiple types", () => {
      const request = builder.messages().channels().build();
      expect(request.options.types).toContain("message");
      expect(request.options.types).toContain("channel");
    });

    it("should select types from array", () => {
      const request = builder.types(["message", "user"]).build();
      expect(request.options.types).toContain("message");
      expect(request.options.types).toContain("user");
    });

    it("should return undefined types when none selected", () => {
      const request = builder.query("hello").build();
      expect(request.options.types).toBeUndefined();
    });
  });

  describe("pagination options", () => {
    it("should set limit", () => {
      const request = builder.limit(50).build();
      expect(request.options.limit).toBe(50);
    });

    it("should set offset", () => {
      const request = builder.offset(20).build();
      expect(request.options.offset).toBe(20);
    });

    it("should set cursor", () => {
      const request = builder.cursor("abc123").build();
      expect(request.options.cursor).toBe("abc123");
    });
  });

  describe("sort options", () => {
    it("should set sort to relevance", () => {
      const request = builder.sort("relevance").build();
      expect(request.options.sort).toBe("relevance");
    });

    it("should set sort to date_desc", () => {
      const request = builder.sort("date_desc").build();
      expect(request.options.sort).toBe("date_desc");
    });

    it("should set sort to date_asc", () => {
      const request = builder.sort("date_asc").build();
      expect(request.options.sort).toBe("date_asc");
    });
  });

  describe("highlight options", () => {
    it("should set default highlight", () => {
      const request = builder.highlight().build();
      expect(request.options.highlightTag).toBe("mark");
    });

    it("should set custom highlight tag", () => {
      const request = builder.highlight("strong").build();
      expect(request.options.highlightTag).toBe("strong");
    });

    it("should set highlight class", () => {
      const request = builder.highlight("mark", "highlight").build();
      expect(request.options.highlightClass).toBe("highlight");
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      const request = builder
        .query("hello")
        .from("user-1")
        .inChannel("channel-1")
        .messages()
        .limit(50)
        .reset()
        .build();

      expect(request.query).toBe("");
      expect(request.filters).toEqual({});
      expect(request.options.types).toBeUndefined();
    });
  });

  describe("getFilters", () => {
    it("should return copy of filters", () => {
      builder.from("user-1");
      const filters = builder.getFilters();
      expect(filters.fromUsers).toEqual(["user-1"]);

      // Modifying returned filters should not affect builder
      filters.fromUsers?.push("user-2");
      expect(builder.getFilters().fromUsers).toEqual(["user-1"]);
    });
  });

  describe("getOptions", () => {
    it("should return copy of options", () => {
      builder.limit(50).messages();
      const options = builder.getOptions();
      expect(options.limit).toBe(50);
      expect(options.types).toContain("message");
    });
  });
});

// ============================================================================
// SearchClient Tests
// ============================================================================

describe("SearchClient", () => {
  let client: SearchClient;

  beforeEach(() => {
    client = new SearchClient();
    mockFetch.mockReset();
  });

  describe("constructor", () => {
    it("should use default config", () => {
      const defaultClient = new SearchClient();
      expect(defaultClient).toBeDefined();
    });

    it("should accept custom config", () => {
      const customClient = new SearchClient({
        baseUrl: "/custom/search",
        defaultLimit: 50,
        maxLimit: 200,
      });
      expect(customClient).toBeDefined();
    });
  });

  describe("createQuery", () => {
    it("should return a new SearchQueryBuilder", () => {
      const builder = client.createQuery();
      expect(builder).toBeInstanceOf(SearchQueryBuilder);
    });
  });

  describe("parseQuery", () => {
    it("should parse search query", () => {
      const result = client.parseQuery("hello from:john");
      expect(result.textQuery).toBe("hello");
      expect(result.filters.fromUsers).toContain("john");
    });
  });

  describe("buildQueryString", () => {
    it("should build query string from filters", () => {
      const query = client.buildQueryString(
        { fromUsers: ["john"], inChannels: ["general"] },
        "hello",
      );
      expect(query).toContain("hello");
      expect(query).toContain("from:john");
      expect(query).toContain("in:general");
    });
  });

  describe("search", () => {
    it("should make search request", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [createMockMessageResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const request: SearchRequest = {
        query: "hello",
        filters: {},
        options: {},
      };

      const response = await client.search(request);

      expect(mockFetch).toHaveBeenCalled();
      expect(response.results).toHaveLength(1);
      expect(response.totalCount).toBe(1);
    });

    it("should include query in URL params", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [], totalCount: 0, hasMore: false }),
      );

      await client.search({ query: "test query", filters: {}, options: {} });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("q=test+query");
    });

    it("should include filters in URL params", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [], totalCount: 0, hasMore: false }),
      );

      await client.search({
        query: "hello",
        filters: {
          fromUsers: ["user-1"],
          inChannels: ["channel-1"],
          hasAttachments: true,
          isPinned: true,
        },
        options: {},
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("from=user-1");
      expect(url).toContain("in=channel-1");
      expect(url).toContain("has_attachments=true");
      expect(url).toContain("is_pinned=true");
    });

    it("should include pagination options", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [], totalCount: 0, hasMore: false }),
      );

      await client.search({
        query: "hello",
        filters: {},
        options: { limit: 50, offset: 20, cursor: "abc" },
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=50");
      expect(url).toContain("offset=20");
      expect(url).toContain("cursor=abc");
    });

    it("should respect maxLimit", async () => {
      const limitedClient = new SearchClient({ maxLimit: 10 });
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [], totalCount: 0, hasMore: false }),
      );

      await limitedClient.search({
        query: "hello",
        filters: {},
        options: { limit: 100 },
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=10");
    });

    it("should throw SearchError on failed request", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500));

      await expect(
        client.search({ query: "hello", filters: {}, options: {} }),
      ).rejects.toThrow(SearchError);
    });

    it("should throw SearchError on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        client.search({ query: "hello", filters: {}, options: {} }),
      ).rejects.toThrow(SearchError);
    });

    it("should return took time", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [], totalCount: 0, hasMore: false }),
      );

      const response = await client.search({
        query: "hello",
        filters: {},
        options: {},
      });

      expect(response.took).toBeGreaterThanOrEqual(0);
    });
  });

  describe("searchMessages", () => {
    it("should search messages", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [createMockMessageResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const response = await client.searchMessages("hello");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("types=message");
      expect(response.results[0].type).toBe("message");
    });

    it("should pass filters", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [], totalCount: 0, hasMore: false }),
      );

      await client.searchMessages("hello", { fromUsers: ["user-1"] });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("from=user-1");
    });
  });

  describe("searchChannels", () => {
    it("should search channels", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [createMockChannelResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const response = await client.searchChannels("general");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("types=channel");
      expect(response.results[0].type).toBe("channel");
    });
  });

  describe("searchUsers", () => {
    it("should search users", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [createMockUserResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const response = await client.searchUsers("john");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("types=user");
      expect(response.results[0].type).toBe("user");
    });
  });

  describe("searchFiles", () => {
    it("should search files", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [createMockFileResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const response = await client.searchFiles("document");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("types=file");
      expect(response.results[0].type).toBe("file");
    });
  });

  describe("quickSearch", () => {
    it("should search all types", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            results: [createMockMessageResult()],
            totalCount: 1,
            hasMore: false,
          }),
        )
        .mockResolvedValueOnce(
          createMockResponse({
            results: [createMockChannelResult()],
            totalCount: 1,
            hasMore: false,
          }),
        )
        .mockResolvedValueOnce(
          createMockResponse({
            results: [createMockUserResult()],
            totalCount: 1,
            hasMore: false,
          }),
        );

      const response = await client.quickSearch("test");

      expect(response.messages).toHaveLength(1);
      expect(response.channels).toHaveLength(1);
      expect(response.users).toHaveLength(1);
    });
  });

  describe("caching", () => {
    it("should cache results", async () => {
      const clientWithCache = new SearchClient({ cacheResults: true });
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [createMockMessageResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const request: SearchRequest = {
        query: "hello",
        filters: {},
        options: {},
      };

      await clientWithCache.search(request);
      await clientWithCache.search(request);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should bypass cache when disabled", async () => {
      const clientNoCache = new SearchClient({ cacheResults: false });
      mockFetch.mockResolvedValue(
        createMockResponse({
          results: [createMockMessageResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const request: SearchRequest = {
        query: "hello",
        filters: {},
        options: {},
      };

      await clientNoCache.search(request);
      await clientNoCache.search(request);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should clear cache", async () => {
      const clientWithCache = new SearchClient({ cacheResults: true });
      mockFetch.mockResolvedValue(
        createMockResponse({
          results: [createMockMessageResult()],
          totalCount: 1,
          hasMore: false,
        }),
      );

      const request: SearchRequest = {
        query: "hello",
        filters: {},
        options: {},
      };

      await clientWithCache.search(request);
      clientWithCache.clearCache();
      await clientWithCache.search(request);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return cache stats", () => {
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
      expect(typeof stats.hitRate).toBe("number");
    });
  });

  describe("highlightText", () => {
    it("should highlight search terms", () => {
      const result = client.highlightText("Hello world", "world");
      expect(result).toBe('Hello <mark class="search-highlight">world</mark>');
    });

    it("should highlight multiple terms", () => {
      const result = client.highlightText("Hello world today", "hello world");
      expect(result).toContain("<mark");
      expect(result).toMatch(/hello/i);
      expect(result).toMatch(/world/i);
    });

    it("should use custom highlight tag", () => {
      const result = client.highlightText("Hello world", "world", "strong");
      expect(result).toContain("<strong");
    });

    it("should use custom highlight class", () => {
      const result = client.highlightText(
        "Hello world",
        "world",
        "mark",
        "custom",
      );
      expect(result).toContain('class="custom"');
    });

    it("should return original text for empty query", () => {
      const result = client.highlightText("Hello world", "");
      expect(result).toBe("Hello world");
    });

    it("should handle special regex characters", () => {
      const result = client.highlightText("Hello (world)", "(world)");
      expect(result).toContain("(world)");
    });

    it("should be case insensitive", () => {
      const result = client.highlightText("Hello World", "world");
      expect(result).toContain("<mark");
    });

    it("should not highlight negated terms", () => {
      const result = client.highlightText("Hello world", "-world");
      expect(result).toBe("Hello world");
    });
  });

  describe("extractHighlights", () => {
    it("should extract highlight fragments", () => {
      const text =
        "This is a long text with the search term hello in the middle of it";
      const fragments = client.extractHighlights(text, "hello");
      expect(fragments.length).toBeGreaterThan(0);
      expect(fragments[0]).toContain("hello");
    });

    it("should add ellipsis for context", () => {
      const text =
        "Start of text. This is a long text with the search term hello in the middle of it. End of text.";
      const fragments = client.extractHighlights(text, "hello", 20);
      expect(fragments[0]).toContain("...");
    });

    it("should return empty array for empty query", () => {
      const fragments = client.extractHighlights("Hello world", "");
      expect(fragments).toEqual([]);
    });

    it("should limit number of fragments", () => {
      const text = "hello hello hello hello hello";
      const fragments = client.extractHighlights(text, "hello");
      expect(fragments.length).toBeLessThanOrEqual(3);
    });

    it("should not extract for negated terms", () => {
      const fragments = client.extractHighlights("Hello world", "-hello");
      expect(fragments).toEqual([]);
    });
  });
});

// ============================================================================
// SearchError Tests
// ============================================================================

describe("SearchError", () => {
  it("should create error with message and status", () => {
    const error = new SearchError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("SearchError");
  });

  it("should be instanceof Error", () => {
    const error = new SearchError("Test", 500);
    expect(error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("getSearchClient", () => {
    it("should return singleton instance", () => {
      const client1 = getSearchClient();
      const client2 = getSearchClient();
      expect(client1).toBe(client2);
    });
  });

  describe("createSearchClient", () => {
    it("should create new instance each time", () => {
      const client1 = createSearchClient();
      const client2 = createSearchClient();
      expect(client1).not.toBe(client2);
    });

    it("should accept config", () => {
      const client = createSearchClient({ baseUrl: "/custom" });
      expect(client).toBeDefined();
    });
  });
});
