/**
 * Extended Message Search Service
 *
 * Provides comprehensive search functionality for all message types with:
 * - Full-text search across message content
 * - Type-specific filtering (location, contact, poll, code, etc.)
 * - Advanced query syntax support
 * - Faceted search results
 * - Search highlighting
 * - Export integration
 */

import { logger } from "@/lib/logger";
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import type { Message } from "@/types/message";
import type { APIResponse, PaginationMeta } from "@/types/api";
import type {
  ExtendedMessage,
  ExtendedMessageType,
  ExtendedMessageSearchFilters,
  MessageExportFormat,
  MessageExportOptions,
  MessageExportResult,
  ExportedMessage,
} from "@/types/message-extended";
import type {
  SearchQuery,
  SearchFilters,
  MessageSearchFilters,
  SearchResponse,
  MessageSearchResult,
  SearchFacets,
  SearchMetadata,
  SearchHighlight,
} from "@/types/search";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended search query with message type filters.
 */
export interface ExtendedSearchQuery extends SearchQuery {
  /** Extended filters for message types */
  extendedFilters?: ExtendedMessageSearchFilters;
  /** Include deleted messages (admin only) */
  includeDeleted?: boolean;
  /** Include system messages */
  includeSystemMessages?: boolean;
  /** Search in attachments */
  searchAttachments?: boolean;
  /** Search in polls */
  searchPolls?: boolean;
  /** Code language filter */
  codeLanguage?: string;
}

/**
 * Extended search result with additional metadata.
 */
export interface ExtendedMessageSearchResult extends MessageSearchResult {
  /** Extended message data */
  extendedMessage?: ExtendedMessage;
  /** Matched filters */
  matchedFilters: string[];
  /** Content preview with highlights */
  contentPreview: string;
  /** Attachment matches */
  attachmentMatches?: Array<{
    name: string;
    type: string;
    matchedText: string;
  }>;
}

/**
 * Search response with extended results.
 */
export interface ExtendedSearchResponse extends SearchResponse<ExtendedMessageSearchResult> {
  /** Extended facets */
  extendedFacets?: ExtendedSearchFacets;
}

/**
 * Extended facets for search results.
 */
export interface ExtendedSearchFacets extends SearchFacets {
  /** Results by extended message type */
  byMessageType?: Array<{ type: ExtendedMessageType; count: number }>;
  /** Results with location */
  withLocation?: number;
  /** Results with contact */
  withContact?: number;
  /** Results with poll */
  withPoll?: number;
  /** Results with code */
  withCode?: number;
  /** Results with GIF */
  withGif?: number;
  /** Results by code language */
  byCodeLanguage?: Array<{ language: string; count: number }>;
  /** Results by poll status */
  byPollStatus?: Array<{ status: "active" | "closed"; count: number }>;
}

/**
 * Search options.
 */
export interface SearchOptions {
  /** Page number (1-based) */
  page?: number;
  /** Results per page */
  perPage?: number;
  /** Sort by */
  sortBy?: "relevance" | "date" | "popularity";
  /** Sort order */
  sortOrder?: "asc" | "desc";
  /** Highlight matches */
  highlight?: boolean;
  /** Include facets */
  includeFacets?: boolean;
}

/**
 * Quick search result for instant search.
 */
export interface QuickSearchItem {
  id: string;
  type: ExtendedMessageType;
  title: string;
  subtitle?: string;
  preview: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: Date;
  highlights?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const PREVIEW_LENGTH = 150;
const MAX_HIGHLIGHTS = 3;

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ExtendedMessageSearchService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client;
  }

  /**
   * Search messages with extended filters.
   */
  async search(
    query: ExtendedSearchQuery,
    options: SearchOptions = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const {
      page = 1,
      perPage = DEFAULT_PAGE_SIZE,
      sortBy = "relevance",
      sortOrder = "desc",
      highlight = true,
      includeFacets = true,
    } = options;

    const limit = Math.min(perPage, MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    try {
      logger.debug("ExtendedMessageSearchService.search", {
        query: query.query,
        scope: query.scope,
        hasExtendedFilters: !!query.extendedFilters,
      });

      // Build search query
      const searchParams = this.buildSearchParams(
        query,
        offset,
        limit,
        sortBy,
        sortOrder,
      );

      // Execute search (this would call the GraphQL API or MeiliSearch)
      const searchResult = await this.executeSearch(searchParams);

      // Transform results
      const results = this.transformResults(
        searchResult.messages,
        query.query,
        highlight,
      );

      // Calculate facets if requested
      const facets = includeFacets
        ? this.calculateFacets(searchResult.messages)
        : undefined;
      const extendedFacets = includeFacets
        ? this.calculateExtendedFacets(searchResult.messages)
        : undefined;

      // Build response
      const response: ExtendedSearchResponse = {
        results,
        totalCount: searchResult.totalCount,
        pagination: {
          page,
          perPage: limit,
          totalPages: Math.ceil(searchResult.totalCount / limit),
          hasMore: offset + results.length < searchResult.totalCount,
        },
        metadata: {
          query: query.query,
          took: searchResult.took,
          scope: query.scope,
          appliedFilters: this.getAppliedFilters(query),
          suggestions: searchResult.suggestions,
        },
        facets,
        extendedFacets,
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error(
        "ExtendedMessageSearchService.search failed",
        error as Error,
        {
          query: query.query,
        },
      );
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message || "Search failed",
        },
      };
    }
  }

  /**
   * Quick search for instant results.
   */
  async quickSearch(
    query: string,
    options: {
      channelId?: string;
      limit?: number;
      includeTypes?: ExtendedMessageType[];
    } = {},
  ): Promise<APIResponse<QuickSearchItem[]>> {
    const { limit = 10, channelId, includeTypes } = options;

    try {
      logger.debug("ExtendedMessageSearchService.quickSearch", {
        query,
        limit,
      });

      // Execute quick search
      const searchParams = {
        query,
        channelId,
        limit,
        includeTypes,
      };

      const searchResult = await this.executeQuickSearch(searchParams);

      return {
        success: true,
        data: searchResult,
      };
    } catch (error) {
      logger.error(
        "ExtendedMessageSearchService.quickSearch failed",
        error as Error,
        {
          query,
        },
      );
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message || "Quick search failed",
        },
      };
    }
  }

  /**
   * Search messages by type.
   */
  async searchByType(
    messageType: ExtendedMessageType,
    options: {
      channelId?: string;
      page?: number;
      perPage?: number;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const query: ExtendedSearchQuery = {
      query: "",
      scope: "messages",
      extendedFilters: {
        messageTypes: [messageType],
      },
      filters: {
        channelIds: options.channelId ? [options.channelId] : undefined,
        dateRange: {
          from: options.dateFrom,
          to: options.dateTo,
        },
      },
    };

    return this.search(query, {
      page: options.page,
      perPage: options.perPage,
      sortBy: "date",
      sortOrder: "desc",
    });
  }

  /**
   * Search for locations.
   */
  async searchLocations(
    options: {
      channelId?: string;
      query?: string;
      bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const query: ExtendedSearchQuery = {
      query: options.query || "",
      scope: "messages",
      extendedFilters: {
        hasLocation: true,
        messageTypes: ["location", "live_location"],
      },
      filters: {
        channelIds: options.channelId ? [options.channelId] : undefined,
      },
    };

    return this.search(query, {
      page: options.page,
      perPage: options.perPage,
      sortBy: "date",
      sortOrder: "desc",
    });
  }

  /**
   * Search for contacts.
   */
  async searchContacts(
    query: string,
    options: {
      channelId?: string;
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const searchQuery: ExtendedSearchQuery = {
      query,
      scope: "messages",
      extendedFilters: {
        hasContact: true,
        messageTypes: ["contact", "contact_card"],
      },
      filters: {
        channelIds: options.channelId ? [options.channelId] : undefined,
      },
    };

    return this.search(searchQuery, {
      page: options.page,
      perPage: options.perPage,
      sortBy: "relevance",
    });
  }

  /**
   * Search for polls.
   */
  async searchPolls(
    options: {
      channelId?: string;
      query?: string;
      status?: "active" | "closed" | "all";
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const query: ExtendedSearchQuery = {
      query: options.query || "",
      scope: "messages",
      extendedFilters: {
        hasPoll: true,
        messageTypes: ["poll", "quiz"],
        pollStatus: options.status !== "all" ? options.status : undefined,
      },
      filters: {
        channelIds: options.channelId ? [options.channelId] : undefined,
      },
      searchPolls: true,
    };

    return this.search(query, {
      page: options.page,
      perPage: options.perPage,
      sortBy: "date",
      sortOrder: "desc",
    });
  }

  /**
   * Search for code blocks.
   */
  async searchCode(
    query: string,
    options: {
      channelId?: string;
      language?: string;
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const searchQuery: ExtendedSearchQuery = {
      query,
      scope: "messages",
      extendedFilters: {
        hasCodeBlock: true,
        codeLanguage: options.language,
      },
      filters: {
        channelIds: options.channelId ? [options.channelId] : undefined,
      },
      codeLanguage: options.language,
    };

    return this.search(searchQuery, {
      page: options.page,
      perPage: options.perPage,
      sortBy: "relevance",
    });
  }

  /**
   * Search forwarded messages.
   */
  async searchForwarded(
    options: {
      channelId?: string;
      originalAuthorId?: string;
      originalChannelId?: string;
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<APIResponse<ExtendedSearchResponse>> {
    const query: ExtendedSearchQuery = {
      query: "",
      scope: "messages",
      extendedFilters: {
        isForwarded: true,
      },
      filters: {
        channelIds: options.channelId ? [options.channelId] : undefined,
        userIds: options.originalAuthorId
          ? [options.originalAuthorId]
          : undefined,
      },
    };

    return this.search(query, {
      page: options.page,
      perPage: options.perPage,
      sortBy: "date",
      sortOrder: "desc",
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Build search parameters from query.
   */
  private buildSearchParams(
    query: ExtendedSearchQuery,
    offset: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      query: query.query,
      offset,
      limit,
      sortBy,
      sortOrder,
    };

    // Add basic filters
    if (query.filters) {
      if (query.filters.channelIds?.length) {
        params.channelIds = query.filters.channelIds;
      }
      if (query.filters.userIds?.length) {
        params.userIds = query.filters.userIds;
      }
      if (query.filters.dateRange) {
        params.dateFrom = query.filters.dateRange.from;
        params.dateTo = query.filters.dateRange.to;
      }
    }

    // Add extended filters
    if (query.extendedFilters) {
      if (query.extendedFilters.messageTypes?.length) {
        params.messageTypes = query.extendedFilters.messageTypes;
      }
      if (query.extendedFilters.hasLocation) {
        params.hasLocation = true;
      }
      if (query.extendedFilters.hasContact) {
        params.hasContact = true;
      }
      if (query.extendedFilters.hasPoll) {
        params.hasPoll = true;
      }
      if (query.extendedFilters.hasCodeBlock) {
        params.hasCodeBlock = true;
      }
      if (query.extendedFilters.hasGif) {
        params.hasGif = true;
      }
      if (query.extendedFilters.isForwarded) {
        params.isForwarded = true;
      }
      if (query.extendedFilters.codeLanguage) {
        params.codeLanguage = query.extendedFilters.codeLanguage;
      }
      if (query.extendedFilters.pollStatus) {
        params.pollStatus = query.extendedFilters.pollStatus;
      }
    }

    // Add search options
    if (query.includeDeleted) {
      params.includeDeleted = true;
    }
    if (query.includeSystemMessages !== false) {
      params.includeSystemMessages = true;
    }
    if (query.searchAttachments) {
      params.searchAttachments = true;
    }
    if (query.searchPolls) {
      params.searchPolls = true;
    }

    return params;
  }

  /**
   * Execute search query (mock implementation).
   */
  private async executeSearch(params: Record<string, unknown>): Promise<{
    messages: ExtendedMessage[];
    totalCount: number;
    took: number;
    suggestions?: string[];
  }> {
    // This would call the actual search API (MeiliSearch, PostgreSQL, etc.)
    // For now, return mock data structure
    const startTime = Date.now();

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      messages: [],
      totalCount: 0,
      took: Date.now() - startTime,
      suggestions: [],
    };
  }

  /**
   * Execute quick search.
   */
  private async executeQuickSearch(params: {
    query: string;
    channelId?: string;
    limit: number;
    includeTypes?: ExtendedMessageType[];
  }): Promise<QuickSearchItem[]> {
    // This would call the actual quick search API
    // For now, return empty array
    return [];
  }

  /**
   * Transform search results to extended format.
   */
  private transformResults(
    messages: ExtendedMessage[],
    query: string,
    highlight: boolean,
  ): ExtendedMessageSearchResult[] {
    return messages.map((message) => {
      const highlights = highlight
        ? this.extractHighlights(message.content, query)
        : [];
      const contentPreview = this.generateContentPreview(
        message.content,
        query,
      );
      const matchedFilters = this.getMatchedFilters(message);

      return {
        type: "message" as const,
        message,
        channel: {
          id: message.channelId,
          name: "", // Would be populated from channel lookup
          type: "public",
        },
        score: 1.0,
        highlights,
        extendedMessage: message,
        matchedFilters,
        contentPreview,
      };
    });
  }

  /**
   * Extract highlights from content.
   */
  private extractHighlights(content: string, query: string): SearchHighlight[] {
    if (!query || !content) return [];

    const highlights: SearchHighlight[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const contentLower = content.toLowerCase();

    for (const term of queryTerms.slice(0, MAX_HIGHLIGHTS)) {
      const index = contentLower.indexOf(term);
      if (index >= 0) {
        const start = Math.max(0, index - 20);
        const end = Math.min(content.length, index + term.length + 20);
        const text = content.slice(start, end);

        highlights.push({
          field: "content",
          text: `...${text}...`,
          positions: [{ start: index, end: index + term.length }],
        });
      }
    }

    return highlights;
  }

  /**
   * Generate content preview with highlights.
   */
  private generateContentPreview(content: string, query: string): string {
    if (!content) return "";

    if (content.length <= PREVIEW_LENGTH) {
      return content;
    }

    // If query exists, try to center preview around first match
    if (query) {
      const queryLower = query.toLowerCase();
      const contentLower = content.toLowerCase();
      const index = contentLower.indexOf(queryLower);

      if (index >= 0) {
        const start = Math.max(0, index - PREVIEW_LENGTH / 2);
        const end = Math.min(content.length, index + PREVIEW_LENGTH / 2);
        return (
          (start > 0 ? "..." : "") +
          content.slice(start, end) +
          (end < content.length ? "..." : "")
        );
      }
    }

    return content.slice(0, PREVIEW_LENGTH) + "...";
  }

  /**
   * Get matched filters for a message.
   */
  private getMatchedFilters(message: ExtendedMessage): string[] {
    const filters: string[] = [];

    if (message.locationData || message.liveLocationData) {
      filters.push("location");
    }
    if (message.contactData) {
      filters.push("contact");
    }
    if (message.poll) {
      filters.push("poll");
    }
    if (message.codeBlocks?.length) {
      filters.push("code");
    }
    if (message.gifUrl) {
      filters.push("gif");
    }
    if (message.forwardAttribution) {
      filters.push("forwarded");
    }
    if (message.attachments?.length) {
      filters.push("attachments");
    }

    return filters;
  }

  /**
   * Calculate basic facets.
   */
  private calculateFacets(messages: ExtendedMessage[]): SearchFacets {
    const byChannel = new Map<
      string,
      { channelId: string; channelName: string; count: number }
    >();
    const byUser = new Map<
      string,
      { userId: string; userName: string; count: number }
    >();
    const byDate = new Map<string, { date: string; count: number }>();

    for (const message of messages) {
      // By channel
      const channelKey = message.channelId;
      const channelEntry = byChannel.get(channelKey) || {
        channelId: message.channelId,
        channelName: "",
        count: 0,
      };
      channelEntry.count++;
      byChannel.set(channelKey, channelEntry);

      // By user
      const userKey = message.userId;
      const userEntry = byUser.get(userKey) || {
        userId: message.userId,
        userName: message.user?.displayName || "",
        count: 0,
      };
      userEntry.count++;
      byUser.set(userKey, userEntry);

      // By date
      const date = new Date(message.createdAt).toISOString().split("T")[0];
      const dateEntry = byDate.get(date) || { date, count: 0 };
      dateEntry.count++;
      byDate.set(date, dateEntry);
    }

    return {
      byChannel: Array.from(byChannel.values()),
      byUser: Array.from(byUser.values()),
      byDate: Array.from(byDate.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    };
  }

  /**
   * Calculate extended facets.
   */
  private calculateExtendedFacets(
    messages: ExtendedMessage[],
  ): ExtendedSearchFacets {
    const byMessageType = new Map<ExtendedMessageType, number>();
    const byCodeLanguage = new Map<string, number>();
    let withLocation = 0;
    let withContact = 0;
    let withPoll = 0;
    let withCode = 0;
    let withGif = 0;
    let activePollCount = 0;
    let closedPollCount = 0;

    for (const message of messages) {
      // By message type
      const type = (message.extendedType ||
        message.type) as ExtendedMessageType;
      byMessageType.set(type, (byMessageType.get(type) || 0) + 1);

      // Specific type counts
      if (message.locationData || message.liveLocationData) {
        withLocation++;
      }
      if (message.contactData) {
        withContact++;
      }
      if (message.poll) {
        withPoll++;
        if (message.poll.status === "active") {
          activePollCount++;
        } else {
          closedPollCount++;
        }
      }
      if (message.codeBlocks?.length) {
        withCode++;
        for (const block of message.codeBlocks) {
          if (block.language) {
            byCodeLanguage.set(
              block.language,
              (byCodeLanguage.get(block.language) || 0) + 1,
            );
          }
        }
      }
      if (message.gifUrl) {
        withGif++;
      }
    }

    return {
      byMessageType: Array.from(byMessageType.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      withLocation,
      withContact,
      withPoll,
      withCode,
      withGif,
      byCodeLanguage: Array.from(byCodeLanguage.entries())
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count),
      byPollStatus: [
        { status: "active" as const, count: activePollCount },
        { status: "closed" as const, count: closedPollCount },
      ],
    };
  }

  /**
   * Get list of applied filters from query.
   */
  private getAppliedFilters(query: ExtendedSearchQuery): string[] {
    const filters: string[] = [];

    if (query.filters?.channelIds?.length) {
      filters.push(`channels: ${query.filters.channelIds.length}`);
    }
    if (query.filters?.userIds?.length) {
      filters.push(`users: ${query.filters.userIds.length}`);
    }
    if (query.filters?.dateRange?.from || query.filters?.dateRange?.to) {
      filters.push("date range");
    }
    if (query.extendedFilters?.messageTypes?.length) {
      filters.push(`types: ${query.extendedFilters.messageTypes.join(", ")}`);
    }
    if (query.extendedFilters?.hasLocation) {
      filters.push("has location");
    }
    if (query.extendedFilters?.hasContact) {
      filters.push("has contact");
    }
    if (query.extendedFilters?.hasPoll) {
      filters.push("has poll");
    }
    if (query.extendedFilters?.hasCodeBlock) {
      filters.push("has code");
    }
    if (query.extendedFilters?.isForwarded) {
      filters.push("forwarded");
    }

    return filters;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let searchServiceInstance: ExtendedMessageSearchService | null = null;

/**
 * Get or create the search service singleton.
 */
export function getExtendedSearchService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ExtendedMessageSearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new ExtendedMessageSearchService(apolloClient);
  }
  return searchServiceInstance;
}

/**
 * Create a new search service instance (for testing).
 */
export function createExtendedSearchService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ExtendedMessageSearchService {
  return new ExtendedMessageSearchService(apolloClient);
}
