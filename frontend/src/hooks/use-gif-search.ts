"use client";

/**
 * Hook for GIF search using Tenor API
 */

import { useState, useEffect, useCallback } from "react";
import { tenorClient, type TenorGif } from "@/lib/tenor-client";

import { logger } from "@/lib/logger";

export interface UseGifSearchResult {
  gifs: TenorGif[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  trendingTerms: string[];
  loadMore: () => void;
  isConfigured: boolean;
}

/**
 * Hook for searching GIFs via Tenor API
 * @param query - Search query (empty for featured/trending)
 * @param limit - Number of results per page
 */
export function useGifSearch(query?: string, limit = 20): UseGifSearchResult {
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPos, setNextPos] = useState<string>();
  const [hasMore, setHasMore] = useState(true);
  const [trendingTerms, setTrendingTerms] = useState<string[]>([]);

  const isConfigured = tenorClient.isConfigured();

  // Fetch trending terms on mount
  useEffect(() => {
    if (!isConfigured) return;

    tenorClient
      .trendingTerms(10)
      .then((terms) => setTrendingTerms(terms))
      .catch((err) => logger.error("Failed to fetch trending terms:", err));
  }, [isConfigured]);

  // Fetch GIFs
  const fetchGifs = useCallback(
    async (searchQuery?: string, position?: string, append = false) => {
      if (!isConfigured) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = searchQuery
          ? await tenorClient.search(searchQuery, limit, position)
          : await tenorClient.featured(limit, position);

        setGifs((prev) =>
          append ? [...prev, ...response.results] : response.results,
        );
        setNextPos(response.next);
        setHasMore(response.results.length === limit);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load GIFs";
        setError(errorMessage);
        logger.error("GIF search error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured, limit],
  );

  // Reset and fetch when query changes
  useEffect(() => {
    if (!isConfigured) return;

    setGifs([]);
    setNextPos(undefined);
    setHasMore(true);
    fetchGifs(query);
  }, [query, isConfigured, fetchGifs]);

  // Load more GIFs (pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || !nextPos) return;
    fetchGifs(query, nextPos, true);
  }, [hasMore, isLoading, nextPos, query, fetchGifs]);

  return {
    gifs,
    isLoading,
    error,
    hasMore,
    trendingTerms,
    loadMore,
    isConfigured,
  };
}
