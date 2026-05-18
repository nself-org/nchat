"use client";

/**
 * useGif Hook - React hook for GIF picker functionality
 *
 * Provides search with debounce, trending GIFs, pagination, and recent GIF tracking.
 *
 * @example
 * ```tsx
 * import { useGif, useGifSearch, useGifTrending } from '@/lib/gif/use-gif'
 *
 * function GifPicker() {
 *   const { search, trending, categories, loading, error } = useGif()
 *
 *   // Or use individual hooks
 *   const { gifs, loading, search: doSearch } = useGifSearch()
 *   const { gifs: trendingGifs } = useGifTrending()
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { gifClientService, DEFAULT_GIF_CATEGORIES } from "./gif-service";
import { useGifStore } from "./gif-store";
import type {
  Gif,
  GifCategory,
  GifSearchResponse,
  GifTrendingResponse,
  GifCategoriesResponse,
} from "@/types/gif";

// ============================================================================
// Types
// ============================================================================

export interface UseGifSearchOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Number of results per page (default: 25) */
  pageSize?: number;
  /** Content rating filter */
  rating?: "g" | "pg" | "pg-13" | "r";
  /** Whether to auto-search on mount */
  autoSearch?: boolean;
  /** Initial search query */
  initialQuery?: string;
}

export interface UseGifSearchResult {
  /** Current search query */
  query: string;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Search results */
  gifs: Gif[];
  /** Whether search is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Total count of results */
  totalCount: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Load more results */
  loadMore: () => void;
  /** Clear search results */
  clear: () => void;
  /** Execute search with current query */
  search: (query?: string) => Promise<void>;
  /** Current offset */
  offset: number;
}

export interface UseGifTrendingOptions {
  /** Number of results per page (default: 25) */
  pageSize?: number;
  /** Content rating filter */
  rating?: "g" | "pg" | "pg-13" | "r";
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseGifTrendingResult {
  /** Trending GIFs */
  gifs: Gif[];
  /** Whether loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether there are more results */
  hasMore: boolean;
  /** Load more results */
  loadMore: () => void;
  /** Refresh trending */
  refresh: () => void;
  /** Current offset */
  offset: number;
}

export interface UseGifCategoriesResult {
  /** Categories list */
  categories: GifCategory[];
  /** Whether loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh categories */
  refresh: () => void;
}

export interface UseGifResult {
  /** Search functionality */
  search: UseGifSearchResult;
  /** Trending functionality */
  trending: UseGifTrendingResult;
  /** Categories functionality */
  categories: UseGifCategoriesResult;
  /** Recent GIFs from store */
  recentGifs: Gif[];
  /** Add GIF to recent */
  addToRecent: (gif: Gif) => void;
  /** Favorite GIFs from store */
  favoriteGifs: Gif[];
  /** Toggle favorite */
  toggleFavorite: (gif: Gif) => void;
  /** Check if GIF is favorited */
  isFavorite: (gifId: string) => boolean;
  /** Current provider */
  provider: string;
}

// ============================================================================
// useGifSearch Hook
// ============================================================================

/**
 * Hook for searching GIFs with debounce and pagination
 */
export function useGifSearch(
  options: UseGifSearchOptions = {},
): UseGifSearchResult {
  const {
    debounceMs = 300,
    pageSize = 25,
    rating = "pg-13",
    autoSearch = false,
    initialQuery = "",
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const debouncedQuery = useDebounce(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add to search history
  const { addSearchHistory } = useGifStore();

  const executeSearch = useCallback(
    async (searchQuery: string, searchOffset = 0, append = false) => {
      if (!searchQuery.trim()) {
        if (!append) {
          setGifs([]);
          setTotalCount(0);
          setHasMore(false);
        }
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response: GifSearchResponse = await gifClientService.search({
          query: searchQuery,
          limit: pageSize,
          offset: searchOffset,
          rating,
        });

        if (append) {
          setGifs((prev) => [...prev, ...response.gifs]);
        } else {
          setGifs(response.gifs);
          // Add to search history on new search
          addSearchHistory(searchQuery);
        }

        setTotalCount(response.pagination.totalCount);
        setHasMore(response.pagination.hasMore);
        setOffset(searchOffset);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore abort errors
        }
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, rating, addSearchHistory],
  );

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && autoSearch) {
      executeSearch(debouncedQuery);
    }
  }, [debouncedQuery, autoSearch, executeSearch]);

  const search = useCallback(
    async (searchQuery?: string) => {
      const q = searchQuery ?? query;
      await executeSearch(q, 0, false);
    },
    [query, executeSearch],
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      executeSearch(query, offset + pageSize, true);
    }
  }, [loading, hasMore, query, offset, pageSize, executeSearch]);

  const clear = useCallback(() => {
    setQuery("");
    setGifs([]);
    setTotalCount(0);
    setOffset(0);
    setHasMore(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    gifs,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    clear,
    search,
    offset,
  };
}

// ============================================================================
// useGifTrending Hook
// ============================================================================

/**
 * Hook for fetching trending GIFs with pagination
 */
export function useGifTrending(
  options: UseGifTrendingOptions = {},
): UseGifTrendingResult {
  const { pageSize = 25, rating = "pg-13", autoFetch = true } = options;

  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchTrending = useCallback(
    async (fetchOffset = 0, append = false) => {
      setLoading(true);
      setError(null);

      try {
        const response: GifTrendingResponse =
          await gifClientService.getTrending({
            limit: pageSize,
            offset: fetchOffset,
            rating,
          });

        if (append) {
          setGifs((prev) => [...prev, ...response.gifs]);
        } else {
          setGifs(response.gifs);
        }

        setHasMore(response.pagination.hasMore);
        setOffset(fetchOffset);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch trending",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize, rating],
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchTrending();
    }
  }, [autoFetch, fetchTrending]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTrending(offset + pageSize, true);
    }
  }, [loading, hasMore, offset, pageSize, fetchTrending]);

  const refresh = useCallback(() => {
    setGifs([]);
    setOffset(0);
    setHasMore(true);
    fetchTrending(0, false);
  }, [fetchTrending]);

  return {
    gifs,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    offset,
  };
}

// ============================================================================
// useGifCategories Hook
// ============================================================================

/**
 * Hook for fetching GIF categories
 */
export function useGifCategories(): UseGifCategoriesResult {
  const [categories, setCategories] = useState<GifCategory[]>(
    DEFAULT_GIF_CATEGORIES,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: GifCategoriesResponse =
        await gifClientService.getCategories();
      setCategories(
        response.categories.length > 0
          ? response.categories
          : DEFAULT_GIF_CATEGORIES,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch categories",
      );
      // Keep default categories on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
  };
}

// ============================================================================
// useGif Hook (Combined)
// ============================================================================

/**
 * Combined hook for full GIF picker functionality
 */
export function useGif(searchOptions?: UseGifSearchOptions): UseGifResult {
  const search = useGifSearch({ ...searchOptions, autoSearch: true });
  const trending = useGifTrending();
  const categoriesHook = useGifCategories();

  // Store integration
  const {
    recentGifs,
    favoriteGifs,
    addRecentGif,
    addFavoriteGif,
    removeFavoriteGif,
    isFavoriteGif,
  } = useGifStore();

  const addToRecent = useCallback(
    (gif: Gif) => {
      addRecentGif(gif);
    },
    [addRecentGif],
  );

  const toggleFavorite = useCallback(
    (gif: Gif) => {
      if (isFavoriteGif(gif.id)) {
        removeFavoriteGif(gif.id);
      } else {
        addFavoriteGif(gif);
      }
    },
    [isFavoriteGif, addFavoriteGif, removeFavoriteGif],
  );

  const isFavorite = useCallback(
    (gifId: string) => {
      return isFavoriteGif(gifId);
    },
    [isFavoriteGif],
  );

  const provider = useMemo(() => gifClientService.getProvider(), []);

  return {
    search,
    trending,
    categories: categoriesHook,
    recentGifs,
    addToRecent,
    favoriteGifs,
    toggleFavorite,
    isFavorite,
    provider,
  };
}

// Note: All hooks are exported directly via their function declarations above
