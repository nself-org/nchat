/**
 * Search Client
 *
 * Provides a unified interface for search operations including query building,
 * filtering, pagination, and result highlighting.
 */

import {
  parseSearchQuery,
  buildQueryFromFilters,
  type ParseResult,
  type SearchFilters as ParserFilters,
} from "./search-parser";

// ============================================================================
// Types
// ============================================================================

export type SearchEntityType = "message" | "channel" | "user" | "file";

export type SortOrder =
  | "relevance"
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "name_desc";

export interface SearchOptions {
  types?: SearchEntityType[];
  sort?: SortOrder;
  limit?: number;
  offset?: number;
  cursor?: string;
  highlightTag?: string;
  highlightClass?: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SearchFilters {
  fromUsers?: string[];
  inChannels?: string[];
  dateRange?: DateRange;
  hasAttachments?: boolean;
  hasLinks?: boolean;
  hasImages?: boolean;
  hasCode?: boolean;
  hasMentions?: boolean;
  hasReactions?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  isThread?: boolean;
  isUnread?: boolean;
  fileTypes?: string[];
  channelTypes?: ("public" | "private" | "direct")[];
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
}

export interface SearchResultBase {
  id: string;
  type: SearchEntityType;
  score: number;
  highlights: SearchHighlight[];
}

export interface MessageSearchResult extends SearchResultBase {
  type: "message";
  content: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: Date;
  threadId?: string;
  isPinned: boolean;
  isStarred: boolean;
  attachments: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export interface ChannelSearchResult extends SearchResultBase {
  type: "channel";
  name: string;
  description?: string;
  slug: string;
  channelType: "public" | "private" | "direct";
  memberCount: number;
  isMember: boolean;
  lastActivityAt?: Date;
}

export interface UserSearchResult extends SearchResultBase {
  type: "user";
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeenAt?: Date;
}

export interface FileSearchResult extends SearchResultBase {
  type: "file";
  fileName: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  messageId: string;
  channelId: string;
  uploaderId: string;
  uploadedAt: Date;
}

export type SearchResult =
  | MessageSearchResult
  | ChannelSearchResult
  | UserSearchResult
  | FileSearchResult;

export interface SearchResponse<T extends SearchResult = SearchResult> {
  results: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  took: number; // milliseconds
  query: string;
}

export interface SearchClientConfig {
  baseUrl?: string;
  defaultLimit?: number;
  maxLimit?: number;
  highlightTag?: string;
  highlightClass?: string;
  cacheResults?: boolean;
  cacheTTL?: number;
}

// ============================================================================
// Search Query Builder
// ============================================================================

export class SearchQueryBuilder {
  private _query: string = "";
  private _filters: SearchFilters = {};
  private _options: SearchOptions = {};
  private _types: Set<SearchEntityType> = new Set();

  /**
   * Sets the search text query
   */
  query(text: string): this {
    this._query = text;
    return this;
  }

  /**
   * Filters by message author
   */
  from(userIds: string | string[]): this {
    const users = Array.isArray(userIds) ? userIds : [userIds];
    this._filters.fromUsers = [...(this._filters.fromUsers ?? []), ...users];
    return this;
  }

  /**
   * Filters by channel
   */
  inChannel(channelIds: string | string[]): this {
    const channels = Array.isArray(channelIds) ? channelIds : [channelIds];
    this._filters.inChannels = [
      ...(this._filters.inChannels ?? []),
      ...channels,
    ];
    return this;
  }

  /**
   * Filters by date range
   */
  dateRange(range: DateRange): this {
    this._filters.dateRange = range;
    return this;
  }

  /**
   * Filters messages before a date
   */
  before(date: Date): this {
    this._filters.dateRange = {
      ...this._filters.dateRange,
      to: date,
    };
    return this;
  }

  /**
   * Filters messages after a date
   */
  after(date: Date): this {
    this._filters.dateRange = {
      ...this._filters.dateRange,
      from: date,
    };
    return this;
  }

  /**
   * Filters to messages with attachments
   */
  hasAttachments(value = true): this {
    this._filters.hasAttachments = value;
    return this;
  }

  /**
   * Filters to messages with links
   */
  hasLinks(value = true): this {
    this._filters.hasLinks = value;
    return this;
  }

  /**
   * Filters to messages with images
   */
  hasImages(value = true): this {
    this._filters.hasImages = value;
    return this;
  }

  /**
   * Filters to messages with code
   */
  hasCode(value = true): this {
    this._filters.hasCode = value;
    return this;
  }

  /**
   * Filters to messages with mentions
   */
  hasMentions(value = true): this {
    this._filters.hasMentions = value;
    return this;
  }

  /**
   * Filters to messages with reactions
   */
  hasReactions(value = true): this {
    this._filters.hasReactions = value;
    return this;
  }

  /**
   * Filters to pinned messages
   */
  isPinned(value = true): this {
    this._filters.isPinned = value;
    return this;
  }

  /**
   * Filters to starred messages
   */
  isStarred(value = true): this {
    this._filters.isStarred = value;
    return this;
  }

  /**
   * Filters to thread messages
   */
  isThread(value = true): this {
    this._filters.isThread = value;
    return this;
  }

  /**
   * Filters to unread messages
   */
  isUnread(value = true): this {
    this._filters.isUnread = value;
    return this;
  }

  /**
   * Filters files by type
   */
  fileTypes(types: string[]): this {
    this._filters.fileTypes = types;
    return this;
  }

  /**
   * Filters channels by type
   */
  channelTypes(types: ("public" | "private" | "direct")[]): this {
    this._filters.channelTypes = types;
    return this;
  }

  /**
   * Search only for messages
   */
  messages(): this {
    this._types.add("message");
    return this;
  }

  /**
   * Search only for channels
   */
  channels(): this {
    this._types.add("channel");
    return this;
  }

  /**
   * Search only for users
   */
  users(): this {
    this._types.add("user");
    return this;
  }

  /**
   * Search only for files
   */
  files(): this {
    this._types.add("file");
    return this;
  }

  /**
   * Search specific entity types
   */
  types(types: SearchEntityType[]): this {
    types.forEach((t) => this._types.add(t));
    return this;
  }

  /**
   * Sets sort order
   */
  sort(order: SortOrder): this {
    this._options.sort = order;
    return this;
  }

  /**
   * Sets result limit
   */
  limit(count: number): this {
    this._options.limit = count;
    return this;
  }

  /**
   * Sets result offset for pagination
   */
  offset(count: number): this {
    this._options.offset = count;
    return this;
  }

  /**
   * Sets cursor for cursor-based pagination
   */
  cursor(value: string): this {
    this._options.cursor = value;
    return this;
  }

  /**
   * Sets highlight configuration
   */
  highlight(tag?: string, className?: string): this {
    this._options.highlightTag = tag ?? "mark";
    this._options.highlightClass = className;
    return this;
  }

  /**
   * Builds the search request
   */
  build(): SearchRequest {
    return {
      query: this._query,
      filters: { ...this._filters },
      options: {
        ...this._options,
        types: this._types.size > 0 ? Array.from(this._types) : undefined,
      },
    };
  }

  /**
   * Resets the builder to initial state
   */
  reset(): this {
    this._query = "";
    this._filters = {};
    this._options = {};
    this._types.clear();
    return this;
  }

  /**
   * Gets the current filters (deep copy)
   */
  getFilters(): SearchFilters {
    return {
      ...this._filters,
      fromUsers: this._filters.fromUsers
        ? [...this._filters.fromUsers]
        : undefined,
      inChannels: this._filters.inChannels
        ? [...this._filters.inChannels]
        : undefined,
      fileTypes: this._filters.fileTypes
        ? [...this._filters.fileTypes]
        : undefined,
      channelTypes: this._filters.channelTypes
        ? [...this._filters.channelTypes]
        : undefined,
      dateRange: this._filters.dateRange
        ? { ...this._filters.dateRange }
        : undefined,
    };
  }

  /**
   * Gets the current options
   */
  getOptions(): SearchOptions {
    return {
      ...this._options,
      types: this._types.size > 0 ? Array.from(this._types) : undefined,
    };
  }
}

export interface SearchRequest {
  query: string;
  filters: SearchFilters;
  options: SearchOptions;
}

// ============================================================================
// Search Client
// ============================================================================

export class SearchClient {
  private config: Required<SearchClientConfig>;
  private cache: Map<string, { data: SearchResponse; timestamp: number }> =
    new Map();

  constructor(config: SearchClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? "/api/search",
      defaultLimit: config.defaultLimit ?? 20,
      maxLimit: config.maxLimit ?? 100,
      highlightTag: config.highlightTag ?? "mark",
      highlightClass: config.highlightClass ?? "search-highlight",
      cacheResults: config.cacheResults ?? true,
      cacheTTL: config.cacheTTL ?? 60000, // 1 minute
    };
  }

  /**
   * Creates a new query builder
   */
  createQuery(): SearchQueryBuilder {
    return new SearchQueryBuilder();
  }

  /**
   * Parses a search query string into structured filters
   */
  parseQuery(query: string): ParseResult {
    return parseSearchQuery(query);
  }

  /**
   * Builds a query string from filters
   */
  buildQueryString(filters: Partial<ParserFilters>, textQuery = ""): string {
    return buildQueryFromFilters(filters, textQuery);
  }

  /**
   * Executes a search request
   */
  async search<T extends SearchResult = SearchResult>(
    request: SearchRequest,
  ): Promise<SearchResponse<T>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check cache
    if (this.config.cacheResults) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.data as SearchResponse<T>;
      }
    }

    // Build request
    const limit = Math.min(
      request.options.limit ?? this.config.defaultLimit,
      this.config.maxLimit,
    );

    const searchParams = this.buildSearchParams(request, limit);
    const url = `${this.config.baseUrl}?${searchParams.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new SearchError(
          `Search request failed: ${response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();
      const result: SearchResponse<T> = {
        results: data.results ?? [],
        totalCount: data.totalCount ?? 0,
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor,
        took: Date.now() - startTime,
        query: request.query,
      };

      // Cache result
      if (this.config.cacheResults) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(
        `Search request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        0,
      );
    }
  }

  /**
   * Searches messages
   */
  async searchMessages(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions,
  ): Promise<SearchResponse<MessageSearchResult>> {
    const request: SearchRequest = {
      query,
      filters: filters ?? {},
      options: { ...options, types: ["message"] },
    };
    return this.search<MessageSearchResult>(request);
  }

  /**
   * Searches channels
   */
  async searchChannels(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions,
  ): Promise<SearchResponse<ChannelSearchResult>> {
    const request: SearchRequest = {
      query,
      filters: filters ?? {},
      options: { ...options, types: ["channel"] },
    };
    return this.search<ChannelSearchResult>(request);
  }

  /**
   * Searches users
   */
  async searchUsers(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions,
  ): Promise<SearchResponse<UserSearchResult>> {
    const request: SearchRequest = {
      query,
      filters: filters ?? {},
      options: { ...options, types: ["user"] },
    };
    return this.search<UserSearchResult>(request);
  }

  /**
   * Searches files
   */
  async searchFiles(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions,
  ): Promise<SearchResponse<FileSearchResult>> {
    const request: SearchRequest = {
      query,
      filters: filters ?? {},
      options: { ...options, types: ["file"] },
    };
    return this.search<FileSearchResult>(request);
  }

  /**
   * Quick search across all entity types
   */
  async quickSearch(
    query: string,
    limit = 5,
  ): Promise<{
    messages: MessageSearchResult[];
    channels: ChannelSearchResult[];
    users: UserSearchResult[];
  }> {
    const [messages, channels, users] = await Promise.all([
      this.searchMessages(query, {}, { limit }),
      this.searchChannels(query, {}, { limit }),
      this.searchUsers(query, {}, { limit }),
    ]);

    return {
      messages: messages.results,
      channels: channels.results,
      users: users.results,
    };
  }

  /**
   * Highlights search terms in text
   */
  highlightText(
    text: string,
    query: string,
    tag = this.config.highlightTag,
    className = this.config.highlightClass,
  ): string {
    if (!query.trim()) return text;

    const parsed = parseSearchQuery(query);
    const terms = parsed.query.terms
      .filter((t) => !t.negated)
      .map((t) => t.value)
      .filter((v) => v.length > 0);

    if (terms.length === 0) return text;

    // Escape special regex characters
    const escapedTerms = terms.map((term) =>
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );

    const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const classAttr = className ? ` class="${className}"` : "";

    return text.replace(pattern, `<${tag}${classAttr}>$1</${tag}>`);
  }

  /**
   * Extracts highlight fragments from text
   */
  extractHighlights(text: string, query: string, contextLength = 50): string[] {
    if (!query.trim()) return [];

    const parsed = parseSearchQuery(query);
    const terms = parsed.query.terms
      .filter((t) => !t.negated)
      .map((t) => t.value.toLowerCase())
      .filter((v) => v.length > 0);

    if (terms.length === 0) return [];

    const fragments: string[] = [];
    const lowerText = text.toLowerCase();

    for (const term of terms) {
      let startIndex = 0;
      let index = lowerText.indexOf(term, startIndex);

      while (index !== -1 && fragments.length < 3) {
        const contextStart = Math.max(0, index - contextLength);
        const contextEnd = Math.min(
          text.length,
          index + term.length + contextLength,
        );

        let fragment = text.substring(contextStart, contextEnd);

        // Add ellipsis if we cut off text
        if (contextStart > 0) fragment = "..." + fragment;
        if (contextEnd < text.length) fragment = fragment + "...";

        fragments.push(fragment);
        startIndex = index + term.length;
        index = lowerText.indexOf(term, startIndex);
      }
    }

    return fragments;
  }

  /**
   * Clears the search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Builds URL search params from request
   */
  private buildSearchParams(
    request: SearchRequest,
    limit: number,
  ): URLSearchParams {
    const params = new URLSearchParams();

    params.set("q", request.query);
    params.set("limit", String(limit));

    if (request.options.offset) {
      params.set("offset", String(request.options.offset));
    }

    if (request.options.cursor) {
      params.set("cursor", request.options.cursor);
    }

    if (request.options.sort) {
      params.set("sort", request.options.sort);
    }

    if (request.options.types?.length) {
      params.set("types", request.options.types.join(","));
    }

    // Add filters
    const { filters } = request;

    if (filters.fromUsers?.length) {
      params.set("from", filters.fromUsers.join(","));
    }

    if (filters.inChannels?.length) {
      params.set("in", filters.inChannels.join(","));
    }

    if (filters.dateRange?.from) {
      params.set("after", filters.dateRange.from.toISOString());
    }

    if (filters.dateRange?.to) {
      params.set("before", filters.dateRange.to.toISOString());
    }

    if (filters.hasAttachments) params.set("has_attachments", "true");
    if (filters.hasLinks) params.set("has_links", "true");
    if (filters.hasImages) params.set("has_images", "true");
    if (filters.hasCode) params.set("has_code", "true");
    if (filters.hasMentions) params.set("has_mentions", "true");
    if (filters.hasReactions) params.set("has_reactions", "true");
    if (filters.isPinned) params.set("is_pinned", "true");
    if (filters.isStarred) params.set("is_starred", "true");
    if (filters.isThread) params.set("is_thread", "true");
    if (filters.isUnread) params.set("is_unread", "true");

    if (filters.fileTypes?.length) {
      params.set("file_types", filters.fileTypes.join(","));
    }

    if (filters.channelTypes?.length) {
      params.set("channel_types", filters.channelTypes.join(","));
    }

    return params;
  }

  /**
   * Generates cache key from request
   */
  private getCacheKey(request: SearchRequest): string {
    return JSON.stringify({
      q: request.query,
      f: request.filters,
      o: request.options,
    });
  }
}

// ============================================================================
// Search Error
// ============================================================================

export class SearchError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let defaultClient: SearchClient | null = null;

/**
 * Gets or creates the default search client
 */
export function getSearchClient(config?: SearchClientConfig): SearchClient {
  if (!defaultClient) {
    defaultClient = new SearchClient(config);
  }
  return defaultClient;
}

/**
 * Creates a new search client instance
 */
export function createSearchClient(config?: SearchClientConfig): SearchClient {
  return new SearchClient(config);
}

export default SearchClient;
