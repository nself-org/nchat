"use client";

/**
 * useEmojiSearch - Hook for searching emojis
 *
 * Provides emoji search functionality with fuzzy matching,
 * custom emoji support, and category filtering.
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { useEmojiStore } from "@/stores/emoji-store";
import {
  searchEmojisWithCustom,
  quickSearch,
  searchByCategory,
} from "@/lib/emoji/emoji-search";
import type {
  EmojiSearchResult,
  EmojiSearchOptions,
  EmojiCategory,
  Emoji,
  UseEmojiSearchReturn,
} from "@/lib/emoji/emoji-types";

// ============================================================================
// Hook Options
// ============================================================================

interface UseEmojiSearchOptions extends EmojiSearchOptions {
  /** Debounce delay in ms */
  debounceMs?: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEmojiSearch(
  options: UseEmojiSearchOptions = {},
): UseEmojiSearchReturn {
  const {
    limit = 50,
    includeCustom = true,
    category = "all",
    minScore = 0,
    fuzzy = true,
    debounceMs = 150,
  } = options;

  // State
  const [results, setResults] = useState<EmojiSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store state
  const customEmojis = useEmojiStore((state) => state.customEmojis);

  // Refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

  // Memoized custom emojis
  const customEmojisArray = useMemo(
    () => Array.from(customEmojis.values()).filter((e) => e.enabled),
    [customEmojis],
  );

  /**
   * Perform search
   */
  const search = useCallback(
    (query: string, searchOptions?: EmojiSearchOptions) => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Track last query
      lastQueryRef.current = query;

      // Empty query clears results
      if (!query.trim()) {
        setResults([]);
        setIsSearching(false);
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      // Debounce the actual search
      debounceRef.current = setTimeout(() => {
        try {
          // Don't search if query has changed
          if (query !== lastQueryRef.current) {
            return;
          }

          const mergedOptions: EmojiSearchOptions = {
            limit,
            includeCustom,
            category,
            minScore,
            fuzzy,
            ...searchOptions,
          };

          const searchResults = searchEmojisWithCustom(
            query,
            includeCustom ? customEmojisArray : [],
            mergedOptions,
          );

          // Verify query hasn't changed
          if (query === lastQueryRef.current) {
            setResults(searchResults);
            setIsSearching(false);
          }
        } catch (err) {
          if (query === lastQueryRef.current) {
            setError(err instanceof Error ? err.message : "Search failed");
            setResults([]);
            setIsSearching(false);
          }
        }
      }, debounceMs);
    },
    [
      limit,
      includeCustom,
      category,
      minScore,
      fuzzy,
      debounceMs,
      customEmojisArray,
    ],
  );

  /**
   * Clear search results
   */
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    lastQueryRef.current = "";
    setResults([]);
    setIsSearching(false);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clear,
  };
}

// ============================================================================
// Quick Search Hook
// ============================================================================

interface UseQuickSearchReturn {
  results: Array<{ emoji: string; shortcode: string; name: string }>;
  search: (query: string) => void;
  clear: () => void;
}

/**
 * Simplified hook for quick emoji search (optimized for autocomplete)
 */
export function useQuickSearch(limit: number = 8): UseQuickSearchReturn {
  const [results, setResults] = useState<
    Array<{ emoji: string; shortcode: string; name: string }>
  >([]);

  const search = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setResults(quickSearch(query, limit));
    },
    [limit],
  );

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, search, clear };
}

// ============================================================================
// Category Search Hook
// ============================================================================

interface UseCategorySearchReturn {
  emojis: Emoji[];
  search: (query?: string) => void;
  clear: () => void;
}

/**
 * Hook for searching within a specific category
 */
export function useCategorySearch(
  category: EmojiCategory,
): UseCategorySearchReturn {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [lastQuery, setLastQuery] = useState<string | undefined>();

  const search = useCallback(
    (query?: string) => {
      setLastQuery(query);
      setEmojis(searchByCategory(category, query));
    },
    [category],
  );

  const clear = useCallback(() => {
    setLastQuery(undefined);
    setEmojis(searchByCategory(category));
  }, [category]);

  // Initial load
  useMemo(() => {
    setEmojis(searchByCategory(category, lastQuery));
  }, [category, lastQuery]);

  return { emojis, search, clear };
}

export default useEmojiSearch;
