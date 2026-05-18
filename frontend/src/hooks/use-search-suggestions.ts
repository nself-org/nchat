"use client";

/**
 * useSearchSuggestions Hook
 *
 * Hook for fetching autocomplete suggestions as the user types.
 * Supports user mentions, channel mentions, and search operators.
 *
 * @module hooks/use-search-suggestions
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDebounce } from "./use-debounce";

// ============================================================================
// Types
// ============================================================================

export interface SearchSuggestion {
  id: string;
  text: string;
  type: "query" | "user" | "channel" | "file" | "operator" | "recent";
  displayText?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  icon?: string;
}

export interface UseSearchSuggestionsOptions {
  /** Debounce delay in ms (default: 200) */
  debounceMs?: number;
  /** Maximum suggestions to show (default: 10) */
  maxSuggestions?: number;
  /** Types of suggestions to include */
  types?: Array<"query" | "user" | "channel" | "file" | "operator" | "recent">;
  /** Whether to include recent searches */
  includeRecent?: boolean;
  /** Current channel ID for context-aware suggestions */
  channelId?: string;
  /** Minimum query length to trigger suggestions (default: 1) */
  minQueryLength?: number;
}

export interface UseSearchSuggestionsReturn {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  error: string | null;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectSuggestion: (suggestion: SearchSuggestion) => void;
  clearSuggestions: () => void;
  navigateUp: () => void;
  navigateDown: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const OPERATOR_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: "op-from",
    text: "from:",
    type: "operator",
    displayText: "from:username",
    description: "Filter by message sender",
    icon: "user",
  },
  {
    id: "op-in",
    text: "in:",
    type: "operator",
    displayText: "in:channel",
    description: "Filter by channel",
    icon: "hash",
  },
  {
    id: "op-has-link",
    text: "has:link",
    type: "operator",
    displayText: "has:link",
    description: "Messages with links",
    icon: "link",
  },
  {
    id: "op-has-file",
    text: "has:file",
    type: "operator",
    displayText: "has:file",
    description: "Messages with attachments",
    icon: "paperclip",
  },
  {
    id: "op-has-image",
    text: "has:image",
    type: "operator",
    displayText: "has:image",
    description: "Messages with images",
    icon: "image",
  },
  {
    id: "op-is-pinned",
    text: "is:pinned",
    type: "operator",
    displayText: "is:pinned",
    description: "Pinned messages",
    icon: "pin",
  },
  {
    id: "op-before",
    text: "before:",
    type: "operator",
    displayText: "before:YYYY-MM-DD",
    description: "Messages before date",
    icon: "calendar",
  },
  {
    id: "op-after",
    text: "after:",
    type: "operator",
    displayText: "after:YYYY-MM-DD",
    description: "Messages after date",
    icon: "calendar",
  },
];

const RECENT_SEARCHES_KEY = "nchat_recent_searches";
const MAX_RECENT_SEARCHES = 10;

// ============================================================================
// Helper Functions
// ============================================================================

function getRecentSearches(): SearchSuggestion[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];

    const recent = JSON.parse(stored) as Array<{
      query: string;
      timestamp: number;
    }>;
    return recent.slice(0, MAX_RECENT_SEARCHES).map((item, index) => ({
      id: `recent-${index}`,
      text: item.query,
      type: "recent" as const,
      displayText: item.query,
      description: "Recent search",
      icon: "clock",
    }));
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;

  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    const recent = stored
      ? (JSON.parse(stored) as Array<{ query: string; timestamp: number }>)
      : [];

    // Remove duplicates
    const filtered = recent.filter(
      (item) => item.query.toLowerCase() !== query.toLowerCase(),
    );

    // Add new search at the beginning
    filtered.unshift({ query: query.trim(), timestamp: Date.now() });

    // Keep only max items
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(filtered.slice(0, MAX_RECENT_SEARCHES)),
    );
  } catch {
    // Ignore storage errors
  }
}

function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

function getMatchingOperators(query: string): SearchSuggestion[] {
  const lastWord = query.split(" ").pop()?.toLowerCase() || "";

  if (!lastWord) return [];

  return OPERATOR_SUGGESTIONS.filter(
    (op) =>
      op.text.toLowerCase().startsWith(lastWord) ||
      op.displayText?.toLowerCase().startsWith(lastWord),
  );
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSearchSuggestions(
  query: string,
  options: UseSearchSuggestionsOptions = {},
): UseSearchSuggestionsReturn {
  const {
    debounceMs = 200,
    maxSuggestions = 10,
    types = ["query", "user", "channel", "operator", "recent"],
    includeRecent = true,
    channelId,
    minQueryLength = 1,
  } = options;

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(
    async (searchQuery: string): Promise<SearchSuggestion[]> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: String(maxSuggestions),
        });

        if (channelId) {
          params.set("channelId", channelId);
        }

        const response = await fetch(`/api/search/suggestions?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data = await response.json();

        if (data.success && data.suggestions) {
          return data.suggestions.map(
            (s: { query: string; count: number }, index: number) => ({
              id: `api-${index}`,
              text: s.query,
              type: "query" as const,
              displayText: s.query,
              description: s.count > 0 ? `${s.count} results` : undefined,
            }),
          );
        }

        return [];
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return [];
        }
        throw err;
      }
    },
    [maxSuggestions, channelId],
  );

  // Effect to fetch suggestions when query changes
  useEffect(() => {
    // Reset on empty query
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      // Show recent searches if query is empty and includeRecent is true
      if (!debouncedQuery && includeRecent && types.includes("recent")) {
        setSuggestions(getRecentSearches().slice(0, maxSuggestions));
      } else {
        setSuggestions([]);
      }
      setSelectedIndex(-1);
      setError(null);
      return;
    }

    const loadSuggestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const allSuggestions: SearchSuggestion[] = [];

        // Add matching operators
        if (types.includes("operator")) {
          const operatorSuggestions = getMatchingOperators(debouncedQuery);
          allSuggestions.push(...operatorSuggestions);
        }

        // Fetch from API
        if (
          types.some((t) => ["query", "user", "channel", "file"].includes(t))
        ) {
          const apiSuggestions = await fetchSuggestions(debouncedQuery);
          allSuggestions.push(...apiSuggestions);
        }

        // Add recent searches that match
        if (includeRecent && types.includes("recent")) {
          const recentSearches = getRecentSearches();
          const matchingRecent = recentSearches.filter(
            (r) =>
              r.text.toLowerCase().includes(debouncedQuery.toLowerCase()) &&
              !allSuggestions.some(
                (s) => s.text.toLowerCase() === r.text.toLowerCase(),
              ),
          );
          allSuggestions.push(...matchingRecent.slice(0, 3));
        }

        // Limit and set suggestions
        setSuggestions(allSuggestions.slice(0, maxSuggestions));
        setSelectedIndex(-1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load suggestions",
        );
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    debouncedQuery,
    types,
    includeRecent,
    maxSuggestions,
    minQueryLength,
    fetchSuggestions,
  ]);

  // Select a suggestion (save to recent and return the text)
  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type !== "operator") {
      saveRecentSearch(suggestion.text);
    }
  }, []);

  // Clear all suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSelectedIndex(-1);
  }, []);

  // Keyboard navigation
  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev <= 0) return suggestions.length - 1;
      return prev - 1;
    });
  }, [suggestions.length]);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev >= suggestions.length - 1) return 0;
      return prev + 1;
    });
  }, [suggestions.length]);

  return {
    suggestions,
    isLoading,
    error,
    selectedIndex,
    setSelectedIndex,
    selectSuggestion,
    clearSuggestions,
    navigateUp,
    navigateDown,
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
  saveRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  OPERATOR_SUGGESTIONS,
};

export default useSearchSuggestions;
