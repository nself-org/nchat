/**
 * Advanced Search Plugin Hooks
 * React hooks for using Advanced Search plugin functionality
 */

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import {
  searchService,
  type SearchResponse,
  type SearchSuggestionsResponse,
  type SearchFilters,
} from "@/services/plugins/search.service";

interface UseAdvancedSearchOptions {
  initialQuery?: string;
  initialFilters?: SearchFilters;
  limit?: number;
  autoSearch?: boolean;
}

export function useAdvancedSearch(options: UseAdvancedSearchOptions = {}) {
  const {
    initialQuery = "",
    initialFilters = {},
    limit = 20,
    autoSearch = false,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [offset, setOffset] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await searchService.search(
        query,
        filters,
        limit,
        offset,
      );
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Search failed"));
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [query, filters, limit, offset]);

  useEffect(() => {
    if (autoSearch) {
      const timer = setTimeout(performSearch, 300); // Debounce
      return () => clearTimeout(timer);
    }
  }, [autoSearch, performSearch]);

  const nextPage = useCallback(() => {
    if (results && results.results.length === limit) {
      setOffset((prev) => prev + limit);
    }
  }, [results, limit]);

  const prevPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - limit));
  }, [limit]);

  const reset = useCallback(() => {
    setQuery("");
    setFilters({});
    setOffset(0);
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    isSearching,
    error,
    search: performSearch,
    nextPage,
    prevPage,
    reset,
    hasMore: results ? results.results.length === limit : false,
    hasPrev: offset > 0,
  };
}

interface UseSearchSuggestionsOptions {
  debounceMs?: number;
}

export function useSearchSuggestions(
  query: string,
  options: UseSearchSuggestionsOptions = {},
) {
  const { debounceMs = 300 } = options;
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const { data, error, isLoading } = useSWR<SearchSuggestionsResponse>(
    debouncedQuery.trim() ? `/search/suggestions/${debouncedQuery}` : null,
    () => searchService.getSuggestions(debouncedQuery),
  );

  return {
    suggestions: data?.suggestions || [],
    isLoading: isLoading && debouncedQuery.trim().length > 0,
    error,
  };
}

export function useSearchHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    "/search/health",
    () => searchService.checkHealth(),
    { refreshInterval: 30000 },
  );

  return {
    health: data,
    isHealthy: data?.status === "healthy",
    isLoading,
    error,
    checkHealth: mutate,
  };
}
