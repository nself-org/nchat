/**
 * useSearch Hook
 *
 * Hook for performing searches and managing search state
 */

import { useState, useCallback } from "react";

import { logger } from "@/lib/logger";

interface SearchFilters {
  type?: "all" | "messages" | "files" | "users" | "channels";
  channelIds?: string[];
  userIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  hasLink?: boolean;
  hasFile?: boolean;
  hasImage?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  sortBy?: "relevance" | "date";
  sortOrder?: "asc" | "desc";
}

interface SearchResults {
  items: Array<{
    id: string;
    type: "messages" | "files" | "users" | "channels";
    title: string;
    content?: string;
    snippet?: string;
    highlight?: string;
    channelId?: string;
    channelName?: string;
    userId?: string;
    userName?: string;
    avatarUrl?: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
    score?: number;
  }>;
  totals: {
    messages: number;
    files: number;
    users: number;
    channels: number;
    total: number;
  };
}

export function useSearch() {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const search = useCallback(
    async (query: string, searchFilters?: SearchFilters) => {
      if (!query.trim()) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            types:
              searchFilters?.type === "all" || !searchFilters?.type
                ? ["messages", "files", "users", "channels"]
                : [searchFilters.type],
            channelIds: searchFilters?.channelIds,
            userIds: searchFilters?.userIds,
            dateFrom: searchFilters?.dateFrom,
            dateTo: searchFilters?.dateTo,
            sortBy: searchFilters?.sortBy || "relevance",
            sortOrder: searchFilters?.sortOrder || "desc",
            limit: 50,
            offset: 0,
          }),
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();

        // Transform API response to match SearchResults interface
        if (data.success && data.results) {
          setResults({
            items: data.results,
            totals: data.totals,
          });
        } else {
          throw new Error(data.error || "Search failed");
        }

        // Save to search history (in localStorage for now)
        saveSearchHistory(
          query,
          (searchFilters || {}) as Record<string, unknown>,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const saveSearch = useCallback(
    async (
      name: string,
      query: string,
      searchFilters: Record<string, unknown>,
    ) => {
      try {
        // In production, save to API
        // For now, use localStorage
        const saved = localStorage.getItem("saved_searches");
        const savedSearches = saved ? JSON.parse(saved) : [];

        const newSearch = {
          id: `search-${Date.now()}`,
          name,
          query,
          filters: searchFilters,
          createdAt: new Date().toISOString(),
          useCount: 0,
        };

        savedSearches.push(newSearch);
        localStorage.setItem("saved_searches", JSON.stringify(savedSearches));

        return newSearch;
      } catch (err) {
        logger.error("Error saving search:", err);
        throw err;
      }
    },
    [],
  );

  const loadSavedSearch = useCallback(
    (savedQuery: string, savedFilters: Record<string, unknown>) => {
      setFilters(savedFilters);
      return search(savedQuery, savedFilters as SearchFilters);
    },
    [search],
  );

  const loadSearchHistory = useCallback(() => {
    try {
      const history = localStorage.getItem("search_history");
      return history ? JSON.parse(history) : [];
    } catch (err) {
      logger.error("Error loading search history:", err);
      return [];
    }
  }, []);

  const clearSearchHistory = useCallback(() => {
    try {
      localStorage.removeItem("search_history");
    } catch (err) {
      logger.error("Error clearing search history:", err);
    }
  }, []);

  return {
    search,
    results,
    isLoading,
    error,
    filters,
    setFilters,
    saveSearch,
    loadSavedSearch,
    loadSearchHistory,
    clearSearchHistory,
  };
}

/**
 * Save search to history
 */
function saveSearchHistory(query: string, filters: Record<string, unknown>) {
  try {
    const history = localStorage.getItem("search_history");
    const searches = history ? JSON.parse(history) : [];

    // Add new search to beginning
    searches.unshift({
      query,
      filters,
      searchedAt: new Date().toISOString(),
    });

    // Keep only last 50 searches
    const trimmed = searches.slice(0, 50);

    localStorage.setItem("search_history", JSON.stringify(trimmed));
  } catch (err) {
    logger.error("Error saving search history:", err);
  }
}

export default useSearch;
