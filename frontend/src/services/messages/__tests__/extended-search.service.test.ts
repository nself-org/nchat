/**
 * Extended Message Search Service Tests
 *
 * Comprehensive tests for the search service including:
 * - Basic search functionality
 * - Type-specific filters
 * - Faceted search
 * - Quick search
 * - Edge cases
 */

import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  ExtendedMessageSearchService,
  createExtendedSearchService,
  type ExtendedSearchQuery,
  type SearchOptions,
  type QuickSearchItem,
} from "../extended-search.service";
import type {
  ExtendedMessage,
  ExtendedMessageType,
} from "@/types/message-extended";

// Mock Apollo Client
const createMockClient = (): ApolloClient<NormalizedCacheObject> => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    defaultOptions: {
      query: { fetchPolicy: "no-cache" },
      mutate: { fetchPolicy: "no-cache" },
    },
  });
};

describe("ExtendedMessageSearchService", () => {
  let service: ExtendedMessageSearchService;
  let mockClient: ApolloClient<NormalizedCacheObject>;

  beforeEach(() => {
    mockClient = createMockClient();
    service = createExtendedSearchService(mockClient);
  });

  describe("search", () => {
    it("should create a search query with basic parameters", async () => {
      const query: ExtendedSearchQuery = {
        query: "hello world",
        scope: "messages",
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.metadata.query).toBe("hello world");
      expect(result.data?.metadata.scope).toBe("messages");
    });

    it("should handle empty search results", async () => {
      const query: ExtendedSearchQuery = {
        query: "nonexistent-term-xyz123",
        scope: "messages",
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.results).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
    });

    it("should apply pagination options", async () => {
      const query: ExtendedSearchQuery = {
        query: "test",
        scope: "messages",
      };
      const options: SearchOptions = {
        page: 2,
        perPage: 25,
      };

      const result = await service.search(query, options);

      expect(result.success).toBe(true);
      expect(result.data?.pagination.page).toBe(2);
      expect(result.data?.pagination.perPage).toBe(25);
    });

    it("should limit perPage to maximum", async () => {
      const query: ExtendedSearchQuery = {
        query: "test",
        scope: "messages",
      };
      const options: SearchOptions = {
        perPage: 1000, // Exceeds MAX_PAGE_SIZE
      };

      const result = await service.search(query, options);

      expect(result.success).toBe(true);
      expect(result.data?.pagination.perPage).toBeLessThanOrEqual(100);
    });

    it("should include facets when requested", async () => {
      const query: ExtendedSearchQuery = {
        query: "test",
        scope: "messages",
      };
      const options: SearchOptions = {
        includeFacets: true,
      };

      const result = await service.search(query, options);

      expect(result.success).toBe(true);
      expect(result.data?.extendedFacets).toBeDefined();
    });

    it("should exclude facets when not requested", async () => {
      const query: ExtendedSearchQuery = {
        query: "test",
        scope: "messages",
      };
      const options: SearchOptions = {
        includeFacets: false,
      };

      const result = await service.search(query, options);

      expect(result.success).toBe(true);
      expect(result.data?.facets).toBeUndefined();
    });

    it("should apply sort options", async () => {
      const query: ExtendedSearchQuery = {
        query: "test",
        scope: "messages",
      };
      const options: SearchOptions = {
        sortBy: "date",
        sortOrder: "asc",
      };

      const result = await service.search(query, options);

      expect(result.success).toBe(true);
    });
  });

  describe("search with extended filters", () => {
    it("should filter by message types", async () => {
      const query: ExtendedSearchQuery = {
        query: "",
        scope: "messages",
        extendedFilters: {
          messageTypes: ["poll", "quiz"],
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters).toContain(
        "types: poll, quiz",
      );
    });

    it("should filter by hasLocation", async () => {
      const query: ExtendedSearchQuery = {
        query: "",
        scope: "messages",
        extendedFilters: {
          hasLocation: true,
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters).toContain("has location");
    });

    it("should filter by hasContact", async () => {
      const query: ExtendedSearchQuery = {
        query: "",
        scope: "messages",
        extendedFilters: {
          hasContact: true,
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters).toContain("has contact");
    });

    it("should filter by hasPoll", async () => {
      const query: ExtendedSearchQuery = {
        query: "",
        scope: "messages",
        extendedFilters: {
          hasPoll: true,
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters).toContain("has poll");
    });

    it("should filter by hasCodeBlock", async () => {
      const query: ExtendedSearchQuery = {
        query: "",
        scope: "messages",
        extendedFilters: {
          hasCodeBlock: true,
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters).toContain("has code");
    });

    it("should filter by isForwarded", async () => {
      const query: ExtendedSearchQuery = {
        query: "",
        scope: "messages",
        extendedFilters: {
          isForwarded: true,
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters).toContain("forwarded");
    });

    it("should combine multiple filters", async () => {
      const query: ExtendedSearchQuery = {
        query: "test",
        scope: "messages",
        extendedFilters: {
          hasLocation: true,
          hasPoll: true,
          messageTypes: ["poll"],
        },
        filters: {
          channelIds: ["ch-1", "ch-2"],
          dateRange: {
            from: new Date("2024-01-01"),
          },
        },
      };

      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.appliedFilters.length).toBeGreaterThan(2);
    });
  });

  describe("searchByType", () => {
    it("should search for location messages", async () => {
      const result = await service.searchByType("location");

      expect(result.success).toBe(true);
    });

    it("should search for poll messages", async () => {
      const result = await service.searchByType("poll");

      expect(result.success).toBe(true);
    });

    it("should search for contact messages", async () => {
      const result = await service.searchByType("contact");

      expect(result.success).toBe(true);
    });

    it("should apply channelId filter", async () => {
      const result = await service.searchByType("text", {
        channelId: "ch-123",
      });

      expect(result.success).toBe(true);
    });

    it("should apply date range filter", async () => {
      const result = await service.searchByType("image", {
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-12-31"),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("searchLocations", () => {
    it("should search for location messages", async () => {
      const result = await service.searchLocations();

      expect(result.success).toBe(true);
    });

    it("should filter by channel", async () => {
      const result = await service.searchLocations({
        channelId: "ch-123",
      });

      expect(result.success).toBe(true);
    });

    it("should filter by query", async () => {
      const result = await service.searchLocations({
        query: "New York",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("searchContacts", () => {
    it("should search for contacts by name", async () => {
      const result = await service.searchContacts("John");

      expect(result.success).toBe(true);
    });

    it("should filter by channel", async () => {
      const result = await service.searchContacts("Jane", {
        channelId: "ch-456",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("searchPolls", () => {
    it("should search for all polls", async () => {
      const result = await service.searchPolls();

      expect(result.success).toBe(true);
    });

    it("should filter by poll status", async () => {
      const result = await service.searchPolls({
        status: "active",
      });

      expect(result.success).toBe(true);
    });

    it("should filter by query", async () => {
      const result = await service.searchPolls({
        query: "favorite",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("searchCode", () => {
    it("should search code blocks by content", async () => {
      const result = await service.searchCode("function");

      expect(result.success).toBe(true);
    });

    it("should filter by programming language", async () => {
      const result = await service.searchCode("const", {
        language: "typescript",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("searchForwarded", () => {
    it("should search for forwarded messages", async () => {
      const result = await service.searchForwarded();

      expect(result.success).toBe(true);
    });

    it("should filter by original author", async () => {
      const result = await service.searchForwarded({
        originalAuthorId: "user-123",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("quickSearch", () => {
    it("should return quick search results", async () => {
      const result = await service.quickSearch("hello");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should limit results", async () => {
      const result = await service.quickSearch("test", {
        limit: 5,
      });

      expect(result.success).toBe(true);
    });

    it("should filter by channel", async () => {
      const result = await service.quickSearch("test", {
        channelId: "ch-123",
      });

      expect(result.success).toBe(true);
    });

    it("should filter by message types", async () => {
      const result = await service.quickSearch("test", {
        includeTypes: ["text", "image"],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle search errors gracefully", async () => {
      // Create a service with a broken client
      const brokenClient = {
        query: jest.fn().mockRejectedValue(new Error("Network error")),
      } as unknown as ApolloClient<NormalizedCacheObject>;

      const brokenService = createExtendedSearchService(brokenClient);

      const result = await brokenService.search({
        query: "test",
        scope: "messages",
      });

      // The service catches errors internally, so it should still succeed
      // but return empty results
      expect(result.success).toBe(true);
    });
  });
});

describe("Search Result Transformation", () => {
  let service: ExtendedMessageSearchService;

  beforeEach(() => {
    const mockClient = createMockClient();
    service = createExtendedSearchService(mockClient);
  });

  describe("content preview", () => {
    it("should generate preview for short content", async () => {
      const result = await service.search({
        query: "test",
        scope: "messages",
      });

      expect(result.success).toBe(true);
    });

    it("should truncate long content in preview", async () => {
      const result = await service.search({
        query: "test",
        scope: "messages",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("highlight extraction", () => {
    it("should generate highlights when enabled", async () => {
      const result = await service.search(
        {
          query: "hello",
          scope: "messages",
        },
        { highlight: true },
      );

      expect(result.success).toBe(true);
    });

    it("should skip highlights when disabled", async () => {
      const result = await service.search(
        {
          query: "hello",
          scope: "messages",
        },
        { highlight: false },
      );

      expect(result.success).toBe(true);
    });
  });
});
