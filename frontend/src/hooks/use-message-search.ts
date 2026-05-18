/**
 * useMessageSearch Hook
 *
 * Comprehensive message search hook with support for:
 * - All search scopes (global, channel, DM, thread)
 * - Advanced filters and modifiers
 * - Recent/saved queries
 * - Semantic search toggle
 * - Debounced searching
 * - Infinite scroll pagination
 * - Result caching
 *
 * @module hooks/use-message-search
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  SearchEngine,
  getSearchEngine,
  type SearchOptions,
  type SearchResponse,
  type SearchResult,
  type SearchScope,
  type ResultType,
  type SortField,
  type SortOrder,
  type RecentQuery,
  type SavedQuery,
  type SearchSuggestion,
} from "@/lib/search/search-engine";
import {
  parseSearchQuery,
  type SearchFilters,
} from "@/lib/search/search-parser";
import { useDebounce } from "@/hooks/use-debounce";

// ============================================================================
// Types
// ============================================================================

export interface UseMessageSearchOptions {
  /** Initial search scope */
  scope?: SearchScope;
  /** Scope ID for channel/dm/thread search */
  scopeId?: string;
  /** Initial result types to include */
  types?: ResultType[];
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Results per page */
  pageSize?: number;
  /** Enable semantic search by default */
  semanticDefault?: boolean;
  /** Auto-search on mount with initial query */
  initialQuery?: string;
  /** User ID for permission filtering */
  userId?: string;
}

export interface UseMessageSearchReturn {
  // State
  query: string;
  debouncedQuery: string;
  scope: SearchScope;
  scopeId: string | undefined;
  types: ResultType[];
  sortBy: SortField;
  sortOrder: SortOrder;
  semantic: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;

  // Results
  results: SearchResult[];
  totalHits: number;
  facets: SearchResponse["facets"];
  hasMore: boolean;
  processingTimeMs: number;

  // Parsed query info
  parsedFilters: SearchFilters;
  hasActiveFilters: boolean;

  // Actions
  setQuery: (query: string) => void;
  setScope: (scope: SearchScope, scopeId?: string) => void;
  setTypes: (types: ResultType[]) => void;
  setSortBy: (sortBy: SortField) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  toggleSemantic: () => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;

  // Recent & Saved Queries
  recentQueries: RecentQuery[];
  savedQueries: SavedQuery[];
  clearRecentQueries: () => void;
  removeRecentQuery: (id: string) => void;
  saveQuery: (name: string) => SavedQuery | null;
  loadSavedQuery: (id: string) => void;
  deleteSavedQuery: (id: string) => void;

  // Suggestions
  suggestions: SearchSuggestion[];
  loadSuggestions: (partial: string) => Promise<void>;
  clearSuggestions: () => void;

  // Utilities
  jumpToMessage: (messageId: string, channelId: string) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMessageSearch(
  options: UseMessageSearchOptions = {},
): UseMessageSearchReturn {
  const {
    scope: initialScope = "global",
    scopeId: initialScopeId,
    types: initialTypes = ["message", "file", "user", "channel"],
    debounceMs = 300,
    pageSize = 20,
    semanticDefault = false,
    initialQuery = "",
    userId,
  } = options;

  // Refs
  const searchEngine = useRef<SearchEngine>(getSearchEngine());
  const abortController = useRef<AbortController | null>(null);

  // State
  const [query, setQueryState] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>(initialScope);
  const [scopeId, setScopeId] = useState<string | undefined>(initialScopeId);
  const [types, setTypes] = useState<ResultType[]>(initialTypes);
  const [sortBy, setSortBy] = useState<SortField>("relevance");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [semantic, setSemantic] = useState(semanticDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Results state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [facets, setFacets] = useState<SearchResponse["facets"]>({
    messages: 0,
    files: 0,
    users: 0,
    channels: 0,
  });
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  // Recent and saved queries
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  // Debounced query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Parse query for filters
  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);
  const parsedFilters = parsedQuery.filters;

  const hasActiveFilters = useMemo(() => {
    return (
      parsedFilters.fromUsers.length > 0 ||
      parsedFilters.inChannels.length > 0 ||
      parsedFilters.toUsers.length > 0 ||
      parsedFilters.mentionsUsers.length > 0 ||
      parsedFilters.beforeDate !== null ||
      parsedFilters.afterDate !== null ||
      parsedFilters.hasFilters.length > 0 ||
      parsedFilters.isFilters.length > 0
    );
  }, [parsedFilters]);

  // Load recent and saved queries on mount
  useEffect(() => {
    setRecentQueries(searchEngine.current.getRecentQueries());
    setSavedQueries(searchEngine.current.getSavedQueries());
  }, []);

  // Execute search
  const search = useCallback(async () => {
    if (!debouncedQuery.trim() && !hasActiveFilters) {
      setResults([]);
      setTotalHits(0);
      setFacets({ messages: 0, files: 0, users: 0, channels: 0 });
      setHasMore(false);
      return;
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      const searchOptions: SearchOptions = {
        query: debouncedQuery,
        scope,
        scopeId,
        types,
        limit: pageSize,
        offset: 0,
        sortBy,
        sortOrder,
        semantic,
        userId,
      };

      // Call API
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchOptions),
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setTotalHits(data.totals?.total || 0);
        setFacets(
          data.totals || { messages: 0, files: 0, users: 0, channels: 0 },
        );
        setHasMore((data.results?.length || 0) < (data.totals?.total || 0));
        setProcessingTimeMs(data.processingTimeMs || 0);
      } else {
        throw new Error(data.error || "Search failed");
      }

      // Refresh recent queries
      setRecentQueries(searchEngine.current.getRecentQueries());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedQuery,
    hasActiveFilters,
    scope,
    scopeId,
    types,
    pageSize,
    sortBy,
    sortOrder,
    semantic,
    userId,
  ]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setError(null);

    const newOffset = offset + pageSize;

    try {
      const searchOptions: SearchOptions = {
        query: debouncedQuery,
        scope,
        scopeId,
        types,
        limit: pageSize,
        offset: newOffset,
        sortBy,
        sortOrder,
        semantic,
        userId,
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchOptions),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      if (data.success) {
        setResults((prev) => [...prev, ...(data.results || [])]);
        setOffset(newOffset);
        setHasMore(
          results.length + (data.results?.length || 0) <
            (data.totals?.total || 0),
        );
      } else {
        throw new Error(data.error || "Search failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    offset,
    pageSize,
    debouncedQuery,
    scope,
    scopeId,
    types,
    sortBy,
    sortOrder,
    semantic,
    userId,
    results.length,
  ]);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== "" || hasActiveFilters) {
      search();
    }
  }, [debouncedQuery, hasActiveFilters, search]);

  // Initial search with initial query
  useEffect(() => {
    if (initialQuery) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setQueryState("");
    setResults([]);
    setTotalHits(0);
    setFacets({ messages: 0, files: 0, users: 0, channels: 0 });
    setHasMore(false);
    setOffset(0);
    setError(null);
    setSuggestions([]);
  }, []);

  // Set query with validation
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  // Set scope with optional scope ID
  const setScopeWithId = useCallback(
    (newScope: SearchScope, newScopeId?: string) => {
      setScope(newScope);
      setScopeId(newScopeId);
      setResults([]);
      setOffset(0);
    },
    [],
  );

  // Toggle semantic search
  const toggleSemantic = useCallback(() => {
    setSemantic((prev) => !prev);
  }, []);

  // Load suggestions
  const loadSuggestions = useCallback(
    async (partial: string) => {
      if (partial.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const newSuggestions = await searchEngine.current.getSuggestions(
          partial,
          {
            limit: 10,
            includeRecent: true,
            includeSaved: true,
            includeOperators: true,
            scope,
          },
        );
        setSuggestions(newSuggestions);
      } catch {
        setSuggestions([]);
      }
    },
    [scope],
  );

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Clear recent queries
  const clearRecentQueries = useCallback(() => {
    searchEngine.current.clearRecentQueries();
    setRecentQueries([]);
  }, []);

  // Remove recent query
  const removeRecentQuery = useCallback((id: string) => {
    searchEngine.current.removeRecentQuery(id);
    setRecentQueries(searchEngine.current.getRecentQueries());
  }, []);

  // Save query
  const saveQuery = useCallback(
    (name: string): SavedQuery | null => {
      if (!query.trim()) return null;

      const saved = searchEngine.current.saveQuery(
        name,
        query,
        parsedFilters,
        scope,
        scopeId,
      );
      setSavedQueries(searchEngine.current.getSavedQueries());
      return saved;
    },
    [query, parsedFilters, scope, scopeId],
  );

  // Load saved query
  const loadSavedQuery = useCallback((id: string) => {
    const saved = searchEngine.current.useSavedQuery(id);
    if (saved) {
      setQueryState(saved.query);
      setScope(saved.scope);
      setScopeId(saved.scopeId);
      setSavedQueries(searchEngine.current.getSavedQueries());
    }
  }, []);

  // Delete saved query
  const deleteSavedQuery = useCallback((id: string) => {
    searchEngine.current.deleteSavedQuery(id);
    setSavedQueries(searchEngine.current.getSavedQueries());
  }, []);

  // Jump to message
  const jumpToMessage = useCallback((messageId: string, channelId: string) => {
    // This would typically trigger navigation to the message
    // Implementation depends on the router/navigation system
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nchat:jump-to-message", {
          detail: { messageId, channelId },
        }),
      );
    }
  }, []);

  return {
    // State
    query,
    debouncedQuery,
    scope,
    scopeId,
    types,
    sortBy,
    sortOrder,
    semantic,
    isLoading,
    isLoadingMore,
    error,

    // Results
    results,
    totalHits,
    facets,
    hasMore,
    processingTimeMs,

    // Parsed query info
    parsedFilters,
    hasActiveFilters,

    // Actions
    setQuery,
    setScope: setScopeWithId,
    setTypes,
    setSortBy,
    setSortOrder,
    toggleSemantic,
    search,
    loadMore,
    reset,

    // Recent & Saved Queries
    recentQueries,
    savedQueries,
    clearRecentQueries,
    removeRecentQuery,
    saveQuery,
    loadSavedQuery,
    deleteSavedQuery,

    // Suggestions
    suggestions,
    loadSuggestions,
    clearSuggestions,

    // Utilities
    jumpToMessage,
  };
}

export default useMessageSearch;
