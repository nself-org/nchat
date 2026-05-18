/**
 * Search Service
 *
 * Provides comprehensive search operations across all indexed content
 * including messages, files, users, and channels using MeiliSearch.
 *
 * Features:
 * - Full-text search with highlighting
 * - Faceted search and filtering
 * - Multi-index search
 * - Search suggestions and autocomplete
 * - Query parsing with operators
 *
 * @module services/search/search.service
 */

import {
  getMeiliClient,
  getMessagesIndex,
  getFilesIndex,
  getUsersIndex,
  getChannelsIndex,
  INDEXES,
  type MeiliMessageDocument,
  type MeiliFileDocument,
  type MeiliUserDocument,
  type MeiliChannelDocument,
} from "@/lib/search/meilisearch-config";
import {
  parseQuery,
  buildMeiliSearchFilter,
  type ParsedQuery,
} from "@/lib/search/query-parser";
import type {
  SearchParams,
  SearchResponse,
  MultiSearchParams,
  MultiSearchResponse,
} from "meilisearch";

// ============================================================================
// Types
// ============================================================================

export type SearchType = "messages" | "files" | "users" | "channels";

export interface SearchFilters {
  channelIds?: string[];
  userIds?: string[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  hasLink?: boolean;
  hasFile?: boolean;
  hasImage?: boolean;
  hasVideo?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  fileTypes?: string[];
  mimeTypes?: string[];
  roles?: string[];
  isPrivate?: boolean;
  isArchived?: boolean;
}

export interface SearchOptions {
  query: string;
  types?: SearchType[];
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sort?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  cropLength?: number;
  matchingStrategy?: "all" | "last" | "frequency";
}

export interface SearchHit<T = unknown> {
  document: T;
  id: string;
  score?: number;
  _formatted?: Partial<T>;
  _matchesPosition?: Record<string, Array<{ start: number; length: number }>>;
}

export interface MessageSearchHit extends SearchHit<MeiliMessageDocument> {
  type: "message";
}

export interface FileSearchHit extends SearchHit<MeiliFileDocument> {
  type: "file";
}

export interface UserSearchHit extends SearchHit<MeiliUserDocument> {
  type: "user";
}

export interface ChannelSearchHit extends SearchHit<MeiliChannelDocument> {
  type: "channel";
}

export type AnySearchHit =
  | MessageSearchHit
  | FileSearchHit
  | UserSearchHit
  | ChannelSearchHit;

export interface SearchResults {
  hits: AnySearchHit[];
  totalHits: number;
  estimatedTotalHits: number;
  facets?: {
    messages: number;
    files: number;
    users: number;
    channels: number;
  };
  processingTimeMs: number;
  query: string;
  parsedQuery: ParsedQuery;
}

export interface TypedSearchResults<T> {
  hits: SearchHit<T>[];
  totalHits: number;
  estimatedTotalHits: number;
  processingTimeMs: number;
  query: string;
  offset: number;
  limit: number;
}

export interface SearchSuggestion {
  text: string;
  type: "query" | "user" | "channel" | "file" | "operator";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Search Service Class
// ============================================================================

export class SearchService {
  private client = getMeiliClient();
  private defaultLimit = 20;
  private maxLimit = 100;
  private defaultCropLength = 200;

  // --------------------------------------------------------------------------
  // Main Search Methods
  // --------------------------------------------------------------------------

  /**
   * Perform a unified search across all specified types
   */
  async search(options: SearchOptions): Promise<SearchResults> {
    const startTime = Date.now();

    // Parse the query for operators
    const parsedQuery = parseQuery(options.query);

    // Determine which types to search
    const types = options.types || ["messages", "files", "users", "channels"];

    // Build base search params
    const baseParams: Partial<SearchParams> = {
      limit: Math.min(options.limit || this.defaultLimit, this.maxLimit),
      offset: options.offset || 0,
      attributesToHighlight: ["*"],
      highlightPreTag: options.highlightPreTag || "<mark>",
      highlightPostTag: options.highlightPostTag || "</mark>",
      attributesToCrop: ["content", "content_plain", "description", "bio"],
      cropLength: options.cropLength || this.defaultCropLength,
      showMatchesPosition: true,
      matchingStrategy: options.matchingStrategy || "last",
    };

    if (options.sort && options.sort.length > 0) {
      baseParams.sort = options.sort;
    }

    // Search all types in parallel
    const searchPromises: Promise<{
      type: SearchType;
      results: SearchResponse<Record<string, unknown>> | null;
    }>[] = [];

    if (types.includes("messages")) {
      const filter = this.buildMessagesFilter(parsedQuery, options.filters);
      searchPromises.push(
        this.searchIndex(INDEXES.MESSAGES, parsedQuery.text, {
          ...baseParams,
          filter,
        })
          .then((results) => ({ type: "messages" as SearchType, results }))
          .catch(() => ({ type: "messages" as SearchType, results: null })),
      );
    }

    if (types.includes("files")) {
      const filter = this.buildFilesFilter(parsedQuery, options.filters);
      searchPromises.push(
        this.searchIndex(INDEXES.FILES, parsedQuery.text, {
          ...baseParams,
          filter,
        })
          .then((results) => ({ type: "files" as SearchType, results }))
          .catch(() => ({ type: "files" as SearchType, results: null })),
      );
    }

    if (types.includes("users")) {
      const filter = this.buildUsersFilter(parsedQuery, options.filters);
      searchPromises.push(
        this.searchIndex(INDEXES.USERS, parsedQuery.text, {
          ...baseParams,
          filter,
        })
          .then((results) => ({ type: "users" as SearchType, results }))
          .catch(() => ({ type: "users" as SearchType, results: null })),
      );
    }

    if (types.includes("channels")) {
      const filter = this.buildChannelsFilter(parsedQuery, options.filters);
      searchPromises.push(
        this.searchIndex(INDEXES.CHANNELS, parsedQuery.text, {
          ...baseParams,
          filter,
        })
          .then((results) => ({ type: "channels" as SearchType, results }))
          .catch(() => ({ type: "channels" as SearchType, results: null })),
      );
    }

    const allResults = await Promise.all(searchPromises);

    // Combine and transform results
    const hits: AnySearchHit[] = [];
    const facets = { messages: 0, files: 0, users: 0, channels: 0 };

    for (const { type, results } of allResults) {
      if (!results) continue;

      facets[type] = results.estimatedTotalHits || 0;

      for (const hit of results.hits) {
        hits.push({
          type:
            type === "messages"
              ? "message"
              : type === "files"
                ? "file"
                : type === "users"
                  ? "user"
                  : "channel",
          document: hit as unknown as Record<string, unknown>,
          id: (hit as { id: string }).id,
          score: (hit as { _rankingScore?: number })._rankingScore,
          _formatted: (hit as { _formatted?: Record<string, unknown> })
            ._formatted as Partial<Record<string, unknown>>,
          _matchesPosition: (
            hit as {
              _matchesPosition?: Record<
                string,
                Array<{ start: number; length: number }>
              >;
            }
          )._matchesPosition,
        } as AnySearchHit);
      }
    }

    // Sort combined results by score
    hits.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      hits,
      totalHits: Object.values(facets).reduce((a, b) => a + b, 0),
      estimatedTotalHits: Object.values(facets).reduce((a, b) => a + b, 0),
      facets,
      processingTimeMs: Date.now() - startTime,
      query: options.query,
      parsedQuery,
    };
  }

  /**
   * Search messages only
   */
  async searchMessages(
    query: string,
    filters?: SearchFilters,
    options?: { limit?: number; offset?: number; sort?: string[] },
  ): Promise<TypedSearchResults<MeiliMessageDocument>> {
    const parsedQuery = parseQuery(query);
    const filter = this.buildMessagesFilter(parsedQuery, filters);

    const results = await getMessagesIndex().search(parsedQuery.text, {
      filter,
      limit: options?.limit || this.defaultLimit,
      offset: options?.offset || 0,
      sort: options?.sort,
      attributesToHighlight: ["content", "content_plain"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      attributesToCrop: ["content", "content_plain"],
      cropLength: this.defaultCropLength,
      showMatchesPosition: true,
    });

    return {
      hits: results.hits.map((hit) => ({
        document: hit,
        id: hit.id,
        score: (hit as { _rankingScore?: number })._rankingScore,
        _formatted: (hit as { _formatted?: Partial<MeiliMessageDocument> })
          ._formatted,
        _matchesPosition: (
          hit as {
            _matchesPosition?: Record<
              string,
              Array<{ start: number; length: number }>
            >;
          }
        )._matchesPosition,
      })),
      totalHits: results.estimatedTotalHits || 0,
      estimatedTotalHits: results.estimatedTotalHits || 0,
      processingTimeMs: results.processingTimeMs || 0,
      query,
      offset: options?.offset || 0,
      limit: options?.limit || this.defaultLimit,
    };
  }

  /**
   * Search files only
   */
  async searchFiles(
    query: string,
    filters?: SearchFilters,
    options?: { limit?: number; offset?: number; sort?: string[] },
  ): Promise<TypedSearchResults<MeiliFileDocument>> {
    const parsedQuery = parseQuery(query);
    const filter = this.buildFilesFilter(parsedQuery, filters);

    const results = await getFilesIndex().search(parsedQuery.text, {
      filter,
      limit: options?.limit || this.defaultLimit,
      offset: options?.offset || 0,
      sort: options?.sort,
      attributesToHighlight: ["name", "original_name", "description"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      showMatchesPosition: true,
    });

    return {
      hits: results.hits.map((hit) => ({
        document: hit,
        id: hit.id,
        score: (hit as { _rankingScore?: number })._rankingScore,
        _formatted: (hit as { _formatted?: Partial<MeiliFileDocument> })
          ._formatted,
        _matchesPosition: (
          hit as {
            _matchesPosition?: Record<
              string,
              Array<{ start: number; length: number }>
            >;
          }
        )._matchesPosition,
      })),
      totalHits: results.estimatedTotalHits || 0,
      estimatedTotalHits: results.estimatedTotalHits || 0,
      processingTimeMs: results.processingTimeMs || 0,
      query,
      offset: options?.offset || 0,
      limit: options?.limit || this.defaultLimit,
    };
  }

  /**
   * Search users only
   */
  async searchUsers(
    query: string,
    filters?: SearchFilters,
    options?: { limit?: number; offset?: number; sort?: string[] },
  ): Promise<TypedSearchResults<MeiliUserDocument>> {
    const parsedQuery = parseQuery(query);
    const filter = this.buildUsersFilter(parsedQuery, filters);

    const results = await getUsersIndex().search(parsedQuery.text, {
      filter,
      limit: options?.limit || this.defaultLimit,
      offset: options?.offset || 0,
      sort: options?.sort,
      attributesToHighlight: ["display_name", "username", "bio"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      showMatchesPosition: true,
    });

    return {
      hits: results.hits.map((hit) => ({
        document: hit,
        id: hit.id,
        score: (hit as { _rankingScore?: number })._rankingScore,
        _formatted: (hit as { _formatted?: Partial<MeiliUserDocument> })
          ._formatted,
        _matchesPosition: (
          hit as {
            _matchesPosition?: Record<
              string,
              Array<{ start: number; length: number }>
            >;
          }
        )._matchesPosition,
      })),
      totalHits: results.estimatedTotalHits || 0,
      estimatedTotalHits: results.estimatedTotalHits || 0,
      processingTimeMs: results.processingTimeMs || 0,
      query,
      offset: options?.offset || 0,
      limit: options?.limit || this.defaultLimit,
    };
  }

  /**
   * Search channels only
   */
  async searchChannels(
    query: string,
    filters?: SearchFilters,
    options?: { limit?: number; offset?: number; sort?: string[] },
  ): Promise<TypedSearchResults<MeiliChannelDocument>> {
    const parsedQuery = parseQuery(query);
    const filter = this.buildChannelsFilter(parsedQuery, filters);

    const results = await getChannelsIndex().search(parsedQuery.text, {
      filter,
      limit: options?.limit || this.defaultLimit,
      offset: options?.offset || 0,
      sort: options?.sort,
      attributesToHighlight: ["name", "description", "topic"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      showMatchesPosition: true,
    });

    return {
      hits: results.hits.map((hit) => ({
        document: hit,
        id: hit.id,
        score: (hit as { _rankingScore?: number })._rankingScore,
        _formatted: (hit as { _formatted?: Partial<MeiliChannelDocument> })
          ._formatted,
        _matchesPosition: (
          hit as {
            _matchesPosition?: Record<
              string,
              Array<{ start: number; length: number }>
            >;
          }
        )._matchesPosition,
      })),
      totalHits: results.estimatedTotalHits || 0,
      estimatedTotalHits: results.estimatedTotalHits || 0,
      processingTimeMs: results.processingTimeMs || 0,
      query,
      offset: options?.offset || 0,
      limit: options?.limit || this.defaultLimit,
    };
  }

  // --------------------------------------------------------------------------
  // Suggestions and Autocomplete
  // --------------------------------------------------------------------------

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(
    partialQuery: string,
    options?: { limit?: number; types?: SearchType[] },
  ): Promise<SearchSuggestion[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const limit = options?.limit || 10;
    const types = options?.types || ["messages", "users", "channels"];
    const suggestions: SearchSuggestion[] = [];

    // Check for operator suggestions
    const lastWord = partialQuery.split(" ").pop() || "";
    if (
      lastWord.includes(":") ||
      ["from", "in", "has", "is", "before", "after"].some((op) =>
        lastWord.startsWith(op),
      )
    ) {
      const operators = [
        {
          text: "from:",
          type: "operator" as const,
          metadata: { description: "Filter by sender" },
        },
        {
          text: "in:",
          type: "operator" as const,
          metadata: { description: "Filter by channel" },
        },
        {
          text: "has:link",
          type: "operator" as const,
          metadata: { description: "Messages with links" },
        },
        {
          text: "has:file",
          type: "operator" as const,
          metadata: { description: "Messages with files" },
        },
        {
          text: "has:image",
          type: "operator" as const,
          metadata: { description: "Messages with images" },
        },
        {
          text: "is:pinned",
          type: "operator" as const,
          metadata: { description: "Pinned messages" },
        },
        {
          text: "before:",
          type: "operator" as const,
          metadata: { description: "Before date (YYYY-MM-DD)" },
        },
        {
          text: "after:",
          type: "operator" as const,
          metadata: { description: "After date (YYYY-MM-DD)" },
        },
      ];

      const matchingOperators = operators.filter((op) =>
        op.text.startsWith(lastWord.toLowerCase()),
      );
      suggestions.push(...matchingOperators.slice(0, 5));
    }

    // Get user suggestions
    if (types.includes("users")) {
      try {
        const userResults = await getUsersIndex().search(partialQuery, {
          limit: Math.min(5, limit),
          attributesToRetrieve: [
            "id",
            "username",
            "display_name",
            "avatar_url",
          ],
        });

        for (const hit of userResults.hits) {
          suggestions.push({
            text: `@${hit.username}`,
            type: "user",
            metadata: {
              id: hit.id,
              displayName: hit.display_name,
              avatarUrl: hit.avatar_url,
            },
          });
        }
      } catch {
        // Ignore errors
      }
    }

    // Get channel suggestions
    if (types.includes("channels")) {
      try {
        const channelResults = await getChannelsIndex().search(partialQuery, {
          limit: Math.min(5, limit),
          attributesToRetrieve: ["id", "name", "type", "is_private"],
        });

        for (const hit of channelResults.hits) {
          suggestions.push({
            text: `#${hit.name}`,
            type: "channel",
            metadata: {
              id: hit.id,
              type: hit.type,
              isPrivate: hit.is_private,
            },
          });
        }
      } catch {
        // Ignore errors
      }
    }

    // Add the query itself as a suggestion
    if (partialQuery.length >= 3) {
      suggestions.unshift({
        text: partialQuery,
        type: "query",
      });
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get user mention suggestions
   */
  async getUserMentionSuggestions(
    query: string,
    options?: { limit?: number; channelId?: string },
  ): Promise<SearchSuggestion[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const limit = options?.limit || 10;

    try {
      const results = await getUsersIndex().search(query, {
        limit,
        attributesToRetrieve: [
          "id",
          "username",
          "display_name",
          "avatar_url",
          "role",
        ],
        filter: "is_active = true",
      });

      return results.hits.map((hit) => ({
        text: hit.username,
        type: "user" as const,
        metadata: {
          id: hit.id,
          displayName: hit.display_name,
          avatarUrl: hit.avatar_url,
          role: hit.role,
        },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get channel mention suggestions
   */
  async getChannelMentionSuggestions(
    query: string,
    options?: { limit?: number; includePrivate?: boolean },
  ): Promise<SearchSuggestion[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const limit = options?.limit || 10;
    const filter = options?.includePrivate ? undefined : "is_private = false";

    try {
      const results = await getChannelsIndex().search(query, {
        limit,
        attributesToRetrieve: [
          "id",
          "name",
          "type",
          "is_private",
          "description",
        ],
        filter,
      });

      return results.hits.map((hit) => ({
        text: hit.name,
        type: "channel" as const,
        metadata: {
          id: hit.id,
          type: hit.type,
          isPrivate: hit.is_private,
          description: hit.description,
        },
      }));
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Filter Builders
  // --------------------------------------------------------------------------

  private buildMessagesFilter(
    parsedQuery: ParsedQuery,
    filters?: SearchFilters,
  ): string | undefined {
    const parts: string[] = [];

    // From query operators
    const operatorFilter = buildMeiliSearchFilter(parsedQuery);
    if (operatorFilter) {
      parts.push(operatorFilter);
    }

    // Additional filters
    if (filters) {
      if (filters.channelIds && filters.channelIds.length > 0) {
        const channelFilter = filters.channelIds
          .map((id) => `"${id}"`)
          .join(", ");
        parts.push(`channel_id IN [${channelFilter}]`);
      }

      if (filters.userIds && filters.userIds.length > 0) {
        const userFilter = filters.userIds.map((id) => `"${id}"`).join(", ");
        parts.push(`author_id IN [${userFilter}]`);
      }

      if (filters.dateFrom) {
        const timestamp = new Date(filters.dateFrom).getTime() / 1000;
        parts.push(`created_at >= ${timestamp}`);
      }

      if (filters.dateTo) {
        const timestamp = new Date(filters.dateTo).getTime() / 1000;
        parts.push(`created_at <= ${timestamp}`);
      }

      if (filters.hasLink !== undefined) {
        parts.push(`has_link = ${filters.hasLink}`);
      }

      if (filters.hasFile !== undefined) {
        parts.push(`has_file = ${filters.hasFile}`);
      }

      if (filters.hasImage !== undefined) {
        parts.push(`has_image = ${filters.hasImage}`);
      }

      if (filters.hasVideo !== undefined) {
        parts.push(`has_video = ${filters.hasVideo}`);
      }

      if (filters.isPinned !== undefined) {
        parts.push(`is_pinned = ${filters.isPinned}`);
      }
    }

    // Always exclude deleted messages
    parts.push("is_deleted = false");

    return parts.length > 0 ? parts.join(" AND ") : undefined;
  }

  private buildFilesFilter(
    parsedQuery: ParsedQuery,
    filters?: SearchFilters,
  ): string | undefined {
    const parts: string[] = [];

    if (filters) {
      if (filters.channelIds && filters.channelIds.length > 0) {
        const channelFilter = filters.channelIds
          .map((id) => `"${id}"`)
          .join(", ");
        parts.push(`channel_id IN [${channelFilter}]`);
      }

      if (filters.userIds && filters.userIds.length > 0) {
        const userFilter = filters.userIds.map((id) => `"${id}"`).join(", ");
        parts.push(`uploader_id IN [${userFilter}]`);
      }

      if (filters.dateFrom) {
        const timestamp = new Date(filters.dateFrom).getTime() / 1000;
        parts.push(`created_at >= ${timestamp}`);
      }

      if (filters.dateTo) {
        const timestamp = new Date(filters.dateTo).getTime() / 1000;
        parts.push(`created_at <= ${timestamp}`);
      }

      if (filters.fileTypes && filters.fileTypes.length > 0) {
        const typeFilter = filters.fileTypes.map((t) => `"${t}"`).join(", ");
        parts.push(`file_type IN [${typeFilter}]`);
      }

      if (filters.mimeTypes && filters.mimeTypes.length > 0) {
        const mimeFilter = filters.mimeTypes.map((m) => `"${m}"`).join(", ");
        parts.push(`mime_type IN [${mimeFilter}]`);
      }
    }

    return parts.length > 0 ? parts.join(" AND ") : undefined;
  }

  private buildUsersFilter(
    parsedQuery: ParsedQuery,
    filters?: SearchFilters,
  ): string | undefined {
    const parts: string[] = [];

    if (filters) {
      if (filters.roles && filters.roles.length > 0) {
        const roleFilter = filters.roles.map((r) => `"${r}"`).join(", ");
        parts.push(`role IN [${roleFilter}]`);
      }
    }

    // Always only search active users
    parts.push("is_active = true");

    return parts.length > 0 ? parts.join(" AND ") : undefined;
  }

  private buildChannelsFilter(
    parsedQuery: ParsedQuery,
    filters?: SearchFilters,
  ): string | undefined {
    const parts: string[] = [];

    if (filters) {
      if (filters.isPrivate !== undefined) {
        parts.push(`is_private = ${filters.isPrivate}`);
      }

      if (filters.isArchived !== undefined) {
        parts.push(`is_archived = ${filters.isArchived}`);
      }
    }

    // Default to non-archived channels
    if (!filters?.isArchived) {
      parts.push("is_archived = false");
    }

    return parts.length > 0 ? parts.join(" AND ") : undefined;
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private async searchIndex(
    indexName: string,
    query: string,
    params: SearchParams,
  ): Promise<SearchResponse<Record<string, unknown>>> {
    const index = this.client.index(indexName);
    return index.search(query, params);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let searchServiceInstance: SearchService | null = null;

/**
 * Get the singleton SearchService instance
 */
export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}

/**
 * Create a new SearchService instance
 */
export function createSearchService(): SearchService {
  return new SearchService();
}

export default SearchService;
