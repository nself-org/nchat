/**
 * Search Engine - Complete Message Search Engine
 *
 * Provides comprehensive search capabilities including:
 * - All search scopes (global, channel, DM, thread, date range)
 * - Advanced filters (from, in, has, before/after, type)
 * - Search modifiers (exact phrase, exclude, wildcard, boolean)
 * - Recent/saved queries
 * - Semantic search toggle
 * - Performance optimizations
 *
 * @module lib/search/search-engine
 */

import {
  parseSearchQuery,
  type ParseResult,
  type SearchFilters,
} from "./search-parser";

// ============================================================================
// Types
// ============================================================================

export type SearchScope = "global" | "channel" | "dm" | "thread" | "user";

export type ResultType = "message" | "file" | "user" | "channel";

export type SortField = "relevance" | "date" | "author" | "channel";

export type SortOrder = "asc" | "desc";

export interface SearchOptions {
  /** The search query string */
  query: string;
  /** Search scope */
  scope: SearchScope;
  /** Scope-specific ID (channel ID, thread ID, user ID) */
  scopeId?: string;
  /** Result types to search for */
  types?: ResultType[];
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: SortField;
  /** Sort order */
  sortOrder?: SortOrder;
  /** Enable semantic search */
  semantic?: boolean;
  /** User ID for permission filtering */
  userId?: string;
  /** Include archived content */
  includeArchived?: boolean;
}

export interface MessageResult {
  id: string;
  type: "message";
  content: string;
  contentPlain: string;
  contentHighlighted?: string;
  channelId: string;
  channelName: string;
  channelType: "public" | "private" | "dm" | "thread";
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  threadId?: string;
  threadRoot?: string;
  timestamp: Date;
  editedAt?: Date;
  isPinned: boolean;
  isStarred: boolean;
  reactions: Array<{ emoji: string; count: number }>;
  attachments: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
  }>;
  mentions: string[];
  hasLink: boolean;
  hasCode: boolean;
  score: number;
  matchPositions?: Array<{ start: number; length: number }>;
}

export interface FileResult {
  id: string;
  type: "file";
  name: string;
  originalName: string;
  nameHighlighted?: string;
  description?: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  channelId: string;
  channelName: string;
  messageId: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar?: string;
  uploadedAt: Date;
  score: number;
}

export interface UserResult {
  id: string;
  type: "user";
  username: string;
  displayName: string;
  displayNameHighlighted?: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen?: Date;
  score: number;
}

export interface ChannelResult {
  id: string;
  type: "channel";
  name: string;
  nameHighlighted?: string;
  description?: string;
  descriptionHighlighted?: string;
  topic?: string;
  channelType: "public" | "private" | "dm" | "guild";
  isPrivate: boolean;
  isArchived: boolean;
  memberCount: number;
  isMember: boolean;
  createdAt: Date;
  lastActivityAt?: Date;
  score: number;
}

export type SearchResult =
  | MessageResult
  | FileResult
  | UserResult
  | ChannelResult;

export interface SearchResponse {
  results: SearchResult[];
  totalHits: number;
  facets: {
    messages: number;
    files: number;
    users: number;
    channels: number;
  };
  query: string;
  parsedQuery: ParseResult;
  processingTimeMs: number;
  hasMore: boolean;
  offset: number;
  limit: number;
  scope: SearchScope;
  scopeId?: string;
  semanticMode: boolean;
}

export interface RecentQuery {
  id: string;
  query: string;
  filters: Partial<SearchFilters>;
  scope: SearchScope;
  scopeId?: string;
  timestamp: Date;
  resultCount: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  scope: SearchScope;
  scopeId?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  useCount: number;
  isDefault: boolean;
}

export interface SearchSuggestion {
  type: "query" | "user" | "channel" | "file" | "operator" | "recent" | "saved";
  text: string;
  display?: string;
  description?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchStats {
  totalSearches: number;
  averageResponseTimeMs: number;
  topQueries: Array<{ query: string; count: number }>;
  searchesByType: Record<ResultType, number>;
  searchesByScope: Record<SearchScope, number>;
  indexStatus: {
    messagesIndexed: number;
    filesIndexed: number;
    usersIndexed: number;
    channelsIndexed: number;
    lastIndexedAt: Date;
  };
}

// ============================================================================
// Search Engine Class
// ============================================================================

export class SearchEngine {
  private cache: Map<string, { response: SearchResponse; timestamp: number }> =
    new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 100;
  private recentQueries: RecentQuery[] = [];
  private maxRecentQueries = 50;
  private savedQueries: Map<string, SavedQuery> = new Map();

  // --------------------------------------------------------------------------
  // Main Search Methods
  // --------------------------------------------------------------------------

  /**
   * Perform a search with the given options
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = performance.now();

    // Parse the query
    const parsedQuery = parseSearchQuery(options.query);

    // Check cache
    const cacheKey = this.getCacheKey(options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        processingTimeMs: performance.now() - startTime,
      };
    }

    // Build the search request
    const searchRequest = this.buildSearchRequest(options, parsedQuery);

    // Execute search based on scope
    const response = await this.executeSearch(searchRequest, options);

    // Cache the results
    this.addToCache(cacheKey, response);

    // Save to recent queries
    this.addRecentQuery(options, response.totalHits);

    return {
      ...response,
      processingTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Search messages only
   */
  async searchMessages(
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "global",
      types: ["message"],
      ...options,
    });
  }

  /**
   * Search files only
   */
  async searchFiles(
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "global",
      types: ["file"],
      ...options,
    });
  }

  /**
   * Search users only
   */
  async searchUsers(
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "global",
      types: ["user"],
      ...options,
    });
  }

  /**
   * Search channels only
   */
  async searchChannels(
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "global",
      types: ["channel"],
      ...options,
    });
  }

  /**
   * Search within a specific channel
   */
  async searchInChannel(
    channelId: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "channel",
      scopeId: channelId,
      types: ["message", "file"],
      ...options,
    });
  }

  /**
   * Search within a DM conversation
   */
  async searchInDM(
    dmId: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "dm",
      scopeId: dmId,
      types: ["message", "file"],
      ...options,
    });
  }

  /**
   * Search within a thread
   */
  async searchInThread(
    threadId: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "thread",
      scopeId: threadId,
      types: ["message"],
      ...options,
    });
  }

  /**
   * Search messages from a specific user
   */
  async searchFromUser(
    userId: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResponse> {
    return this.search({
      query,
      scope: "user",
      scopeId: userId,
      types: ["message", "file"],
      ...options,
    });
  }

  // --------------------------------------------------------------------------
  // Suggestions
  // --------------------------------------------------------------------------

  /**
   * Get search suggestions as the user types
   */
  async getSuggestions(
    partialQuery: string,
    options?: {
      limit?: number;
      includeRecent?: boolean;
      includeSaved?: boolean;
      includeOperators?: boolean;
      scope?: SearchScope;
    },
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    const limit = options?.limit ?? 10;

    // Parse current query to understand context
    const lastWord = partialQuery.split(/\s+/).pop() || "";
    const isTypingOperator =
      lastWord.includes(":") || this.isOperatorPrefix(lastWord);

    // Add operator suggestions if typing an operator
    if (options?.includeOperators !== false && isTypingOperator) {
      suggestions.push(...this.getOperatorSuggestions(lastWord));
    }

    // Add recent queries
    if (options?.includeRecent !== false && this.recentQueries.length > 0) {
      const recentMatches = this.recentQueries
        .filter(
          (r) =>
            r.query.toLowerCase().includes(partialQuery.toLowerCase()) &&
            (!options?.scope || r.scope === options.scope),
        )
        .slice(0, 3)
        .map((r) => ({
          type: "recent" as const,
          text: r.query,
          description: `${r.resultCount} results`,
          icon: "clock",
          metadata: { id: r.id, timestamp: r.timestamp },
        }));

      suggestions.push(...recentMatches);
    }

    // Add saved queries
    if (options?.includeSaved !== false && this.savedQueries.size > 0) {
      const savedMatches = Array.from(this.savedQueries.values())
        .filter(
          (s) =>
            s.query.toLowerCase().includes(partialQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(partialQuery.toLowerCase()),
        )
        .slice(0, 3)
        .map((s) => ({
          type: "saved" as const,
          text: s.query,
          display: s.name,
          description: `${s.useCount} uses`,
          icon: "star",
          metadata: { id: s.id, name: s.name },
        }));

      suggestions.push(...savedMatches);
    }

    // If query is long enough, search for entities
    if (partialQuery.length >= 2 && !isTypingOperator) {
      const entitySuggestions = await this.getEntitySuggestions(
        partialQuery,
        limit - suggestions.length,
      );
      suggestions.push(...entitySuggestions);
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get operator suggestions for partial input
   */
  private getOperatorSuggestions(partial: string): SearchSuggestion[] {
    const operators = [
      { op: "from:", desc: "Filter by message author" },
      { op: "in:", desc: "Filter by channel" },
      { op: "to:", desc: "Filter by DM recipient" },
      { op: "mentions:", desc: "Filter by mentioned user" },
      { op: "has:link", desc: "Messages with links" },
      { op: "has:file", desc: "Messages with files" },
      { op: "has:image", desc: "Messages with images" },
      { op: "has:code", desc: "Messages with code blocks" },
      { op: "has:mention", desc: "Messages with mentions" },
      { op: "has:reaction", desc: "Messages with reactions" },
      { op: "is:pinned", desc: "Pinned messages" },
      { op: "is:starred", desc: "Starred messages" },
      { op: "is:thread", desc: "Thread messages" },
      { op: "is:unread", desc: "Unread messages" },
      { op: "before:", desc: "Messages before date (YYYY-MM-DD, today, 7d)" },
      { op: "after:", desc: "Messages after date (YYYY-MM-DD, today, 7d)" },
    ];

    const lowerPartial = partial.toLowerCase().replace("-", "");

    return operators
      .filter((o) => o.op.startsWith(lowerPartial))
      .map((o) => ({
        type: "operator" as const,
        text: o.op,
        description: o.desc,
        icon: "filter",
      }));
  }

  /**
   * Get entity suggestions (users, channels)
   */
  private async getEntitySuggestions(
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    // This would typically call the actual search service
    // For now, return empty array - will be filled by API
    return [];
  }

  /**
   * Check if a string is the start of an operator
   */
  private isOperatorPrefix(str: string): boolean {
    const prefixes = [
      "from",
      "in",
      "to",
      "mentions",
      "has",
      "is",
      "before",
      "after",
    ];
    const normalized = str.toLowerCase().replace("-", "");
    return prefixes.some((p) => p.startsWith(normalized));
  }

  // --------------------------------------------------------------------------
  // Recent & Saved Queries
  // --------------------------------------------------------------------------

  /**
   * Get recent queries
   */
  getRecentQueries(options?: {
    limit?: number;
    scope?: SearchScope;
  }): RecentQuery[] {
    let queries = [...this.recentQueries];

    if (options?.scope) {
      queries = queries.filter((q) => q.scope === options.scope);
    }

    return queries.slice(0, options?.limit ?? 10);
  }

  /**
   * Clear recent queries
   */
  clearRecentQueries(): void {
    this.recentQueries = [];
    this.persistRecentQueries();
  }

  /**
   * Remove a specific recent query
   */
  removeRecentQuery(id: string): void {
    this.recentQueries = this.recentQueries.filter((q) => q.id !== id);
    this.persistRecentQueries();
  }

  /**
   * Get saved queries
   */
  getSavedQueries(options?: {
    limit?: number;
    scope?: SearchScope;
  }): SavedQuery[] {
    let queries = Array.from(this.savedQueries.values());

    if (options?.scope) {
      queries = queries.filter((q) => q.scope === options.scope);
    }

    // Sort by useCount descending, then by createdAt descending
    queries.sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return queries.slice(0, options?.limit ?? 20);
  }

  /**
   * Save a query
   */
  saveQuery(
    name: string,
    query: string,
    filters: SearchFilters,
    scope: SearchScope = "global",
    scopeId?: string,
  ): SavedQuery {
    const saved: SavedQuery = {
      id: this.generateId(),
      name,
      query,
      filters,
      scope,
      scopeId,
      createdAt: new Date(),
      useCount: 0,
      isDefault: false,
    };

    this.savedQueries.set(saved.id, saved);
    this.persistSavedQueries();

    return saved;
  }

  /**
   * Update a saved query
   */
  updateSavedQuery(
    id: string,
    updates: Partial<SavedQuery>,
  ): SavedQuery | null {
    const saved = this.savedQueries.get(id);
    if (!saved) return null;

    const updated = { ...saved, ...updates };
    this.savedQueries.set(id, updated);
    this.persistSavedQueries();

    return updated;
  }

  /**
   * Delete a saved query
   */
  deleteSavedQuery(id: string): boolean {
    const deleted = this.savedQueries.delete(id);
    if (deleted) {
      this.persistSavedQueries();
    }
    return deleted;
  }

  /**
   * Use a saved query
   */
  useSavedQuery(id: string): SavedQuery | null {
    const saved = this.savedQueries.get(id);
    if (!saved) return null;

    saved.useCount++;
    saved.lastUsedAt = new Date();
    this.savedQueries.set(id, saved);
    this.persistSavedQueries();

    return saved;
  }

  /**
   * Export saved queries
   */
  exportSavedQueries(): string {
    const queries = Array.from(this.savedQueries.values());
    return JSON.stringify(queries, null, 2);
  }

  /**
   * Import saved queries
   */
  importSavedQueries(json: string, merge = true): number {
    try {
      const queries = JSON.parse(json) as SavedQuery[];

      if (!merge) {
        this.savedQueries.clear();
      }

      let imported = 0;
      for (const query of queries) {
        // Generate new ID if merging to avoid conflicts
        const id = merge ? this.generateId() : query.id;
        this.savedQueries.set(id, {
          ...query,
          id,
          createdAt: new Date(query.createdAt),
          lastUsedAt: query.lastUsedAt ? new Date(query.lastUsedAt) : undefined,
        });
        imported++;
      }

      this.persistSavedQueries();
      return imported;
    } catch {
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  /**
   * Clear the search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getCacheKey(options: SearchOptions): string {
    return JSON.stringify({
      query: options.query,
      scope: options.scope,
      scopeId: options.scopeId,
      types: options.types?.sort(),
      limit: options.limit,
      offset: options.offset,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      semantic: options.semantic,
      includeArchived: options.includeArchived,
    });
  }

  private getFromCache(key: string): SearchResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  private addToCache(key: string, response: SearchResponse): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { response, timestamp: Date.now() });
  }

  private addRecentQuery(options: SearchOptions, resultCount: number): void {
    // Don't save empty or very short queries
    if (!options.query || options.query.length < 2) return;

    // Remove existing entry with same query
    this.recentQueries = this.recentQueries.filter(
      (q) => q.query !== options.query || q.scope !== options.scope,
    );

    // Add new entry at the beginning
    const parsedQuery = parseSearchQuery(options.query);
    this.recentQueries.unshift({
      id: this.generateId(),
      query: options.query,
      filters: parsedQuery.filters,
      scope: options.scope,
      scopeId: options.scopeId,
      timestamp: new Date(),
      resultCount,
    });

    // Trim to max size
    if (this.recentQueries.length > this.maxRecentQueries) {
      this.recentQueries = this.recentQueries.slice(0, this.maxRecentQueries);
    }

    this.persistRecentQueries();
  }

  private buildSearchRequest(options: SearchOptions, parsedQuery: ParseResult) {
    return {
      query: parsedQuery.textQuery,
      filters: parsedQuery.filters,
      scope: options.scope,
      scopeId: options.scopeId,
      types: options.types ?? ["message", "file", "user", "channel"],
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      sortBy: options.sortBy ?? "relevance",
      sortOrder: options.sortOrder ?? "desc",
      semantic: options.semantic ?? false,
      userId: options.userId,
      includeArchived: options.includeArchived ?? false,
    };
  }

  private async executeSearch(
    request: ReturnType<typeof this.buildSearchRequest>,
    options: SearchOptions,
  ): Promise<SearchResponse> {
    // This would typically call the actual search API
    // For now, return mock response structure
    const parsedQuery = parseSearchQuery(options.query);

    return {
      results: [],
      totalHits: 0,
      facets: { messages: 0, files: 0, users: 0, channels: 0 },
      query: options.query,
      parsedQuery,
      processingTimeMs: 0,
      hasMore: false,
      offset: request.offset,
      limit: request.limit,
      scope: options.scope,
      scopeId: options.scopeId,
      semanticMode: request.semantic,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistRecentQueries(): void {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(
          "nchat_recent_searches",
          JSON.stringify(this.recentQueries),
        );
      } catch {
        // Ignore storage errors
      }
    }
  }

  private persistSavedQueries(): void {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(
          "nchat_saved_searches",
          JSON.stringify(Array.from(this.savedQueries.values())),
        );
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Load persisted data from storage
   */
  loadFromStorage(): void {
    if (typeof localStorage !== "undefined") {
      try {
        const recent = localStorage.getItem("nchat_recent_searches");
        if (recent) {
          const parsed = JSON.parse(recent) as RecentQuery[];
          this.recentQueries = parsed.map((q) => ({
            ...q,
            timestamp: new Date(q.timestamp),
          }));
        }

        const saved = localStorage.getItem("nchat_saved_searches");
        if (saved) {
          const parsed = JSON.parse(saved) as SavedQuery[];
          for (const query of parsed) {
            this.savedQueries.set(query.id, {
              ...query,
              createdAt: new Date(query.createdAt),
              lastUsedAt: query.lastUsedAt
                ? new Date(query.lastUsedAt)
                : undefined,
            });
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let searchEngineInstance: SearchEngine | null = null;

/**
 * Get the singleton SearchEngine instance
 */
export function getSearchEngine(): SearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new SearchEngine();
    searchEngineInstance.loadFromStorage();
  }
  return searchEngineInstance;
}

/**
 * Create a new SearchEngine instance (for testing)
 */
export function createSearchEngine(): SearchEngine {
  return new SearchEngine();
}

export default SearchEngine;
