/**
 * Media Search - Search and indexing functionality for media items
 *
 * Provides full-text search, fuzzy matching, and search history management.
 */

import { MediaItem, MediaType, MediaFilters } from "./media-types";

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  item: MediaItem;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: string;
  value: string;
  indices: [number, number][]; // Start and end indices of matches
}

export interface SearchOptions {
  fuzzy?: boolean;
  threshold?: number;
  limit?: number;
  fields?: string[];
  caseSensitive?: boolean;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface SearchSuggestion {
  text: string;
  type: "recent" | "popular" | "filename" | "user" | "extension";
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  fuzzy: true,
  threshold: 0.3,
  limit: 100,
  fields: [
    "fileName",
    "uploadedBy.displayName",
    "uploadedBy.username",
    "mimeType",
  ],
  caseSensitive: false,
};

const MAX_HISTORY_ITEMS = 20;
const HISTORY_STORAGE_KEY = "nchat-media-search-history";

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search media items
 */
export function searchMedia(
  items: MediaItem[],
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  if (!query.trim()) {
    return items.map((item) => ({ item, score: 1, matches: [] }));
  }

  const mergedOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const normalizedQuery = mergedOptions.caseSensitive
    ? query
    : query.toLowerCase();
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = [];

  for (const item of items) {
    const matches: SearchMatch[] = [];
    let totalScore = 0;

    for (const field of mergedOptions.fields!) {
      const value = getNestedValue(item, field);
      if (!value) continue;

      const normalizedValue = mergedOptions.caseSensitive
        ? String(value)
        : String(value).toLowerCase();

      for (const word of queryWords) {
        if (mergedOptions.fuzzy) {
          const fuzzyResult = fuzzyMatch(
            normalizedValue,
            word,
            mergedOptions.threshold!,
          );
          if (fuzzyResult.matched) {
            totalScore += fuzzyResult.score;
            matches.push({
              field,
              value: String(value),
              indices: fuzzyResult.indices,
            });
          }
        } else {
          const index = normalizedValue.indexOf(word);
          if (index !== -1) {
            totalScore += 1;
            matches.push({
              field,
              value: String(value),
              indices: [[index, index + word.length]],
            });
          }
        }
      }
    }

    if (matches.length > 0) {
      results.push({
        item,
        score: totalScore / queryWords.length,
        matches,
      });
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  if (mergedOptions.limit && results.length > mergedOptions.limit) {
    return results.slice(0, mergedOptions.limit);
  }

  return results;
}

/**
 * Simple fuzzy matching algorithm
 */
export function fuzzyMatch(
  text: string,
  pattern: string,
  threshold: number = 0.3,
): { matched: boolean; score: number; indices: [number, number][] } {
  if (pattern.length === 0) {
    return { matched: true, score: 1, indices: [] };
  }

  if (text.length === 0) {
    return { matched: false, score: 0, indices: [] };
  }

  // Exact match check first
  const exactIndex = text.indexOf(pattern);
  if (exactIndex !== -1) {
    return {
      matched: true,
      score: 1,
      indices: [[exactIndex, exactIndex + pattern.length]],
    };
  }

  // Fuzzy matching
  let patternIdx = 0;
  let textIdx = 0;
  const indices: [number, number][] = [];
  let matchStart = -1;
  let consecutiveMatches = 0;
  let totalMatches = 0;

  while (textIdx < text.length && patternIdx < pattern.length) {
    if (text[textIdx] === pattern[patternIdx]) {
      if (matchStart === -1) {
        matchStart = textIdx;
      }
      consecutiveMatches++;
      patternIdx++;
      totalMatches++;
    } else if (matchStart !== -1) {
      indices.push([matchStart, textIdx]);
      matchStart = -1;
      consecutiveMatches = 0;
    }
    textIdx++;
  }

  // Close any open match
  if (matchStart !== -1) {
    indices.push([matchStart, textIdx]);
  }

  // Calculate score
  const score =
    patternIdx === pattern.length
      ? totalMatches / text.length + (consecutiveMatches / pattern.length) * 0.5
      : 0;

  const matched = patternIdx === pattern.length && score >= threshold;

  return { matched, score, indices };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ============================================================================
// Advanced Search Functions
// ============================================================================

/**
 * Search with filters
 */
export function searchWithFilters(
  items: MediaItem[],
  query: string,
  filters: MediaFilters,
  options: SearchOptions = {},
): SearchResult[] {
  // First apply search
  let results = searchMedia(items, query, options);

  // Then apply filters
  if (filters.type !== "all") {
    const typeMap: Record<string, MediaType[]> = {
      images: ["image"],
      videos: ["video"],
      audio: ["audio"],
      documents: ["document", "archive", "other"],
    };
    const allowedTypes = typeMap[filters.type];
    if (allowedTypes) {
      results = results.filter((r) => allowedTypes.includes(r.item.fileType));
    }
  }

  if (filters.channelId) {
    results = results.filter((r) => r.item.channelId === filters.channelId);
  }

  if (filters.userId) {
    results = results.filter((r) => r.item.uploadedBy.id === filters.userId);
  }

  if (filters.dateRange.start) {
    results = results.filter(
      (r) => new Date(r.item.createdAt) >= filters.dateRange.start!,
    );
  }

  if (filters.dateRange.end) {
    results = results.filter(
      (r) => new Date(r.item.createdAt) <= filters.dateRange.end!,
    );
  }

  return results;
}

/**
 * Search by extension
 */
export function searchByExtension(
  items: MediaItem[],
  extensions: string[],
): MediaItem[] {
  const normalizedExtensions = extensions.map((ext) =>
    ext.toLowerCase().replace(/^\./, ""),
  );

  return items.filter((item) =>
    normalizedExtensions.includes(item.fileExtension.toLowerCase()),
  );
}

/**
 * Search by size range
 */
export function searchBySize(
  items: MediaItem[],
  minSize?: number,
  maxSize?: number,
): MediaItem[] {
  return items.filter((item) => {
    if (minSize !== undefined && item.fileSize < minSize) return false;
    if (maxSize !== undefined && item.fileSize > maxSize) return false;
    return true;
  });
}

/**
 * Search by date range
 */
export function searchByDateRange(
  items: MediaItem[],
  startDate?: Date,
  endDate?: Date,
): MediaItem[] {
  return items.filter((item) => {
    const itemDate = new Date(item.createdAt);
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  });
}

// ============================================================================
// Search History Functions
// ============================================================================

/**
 * Get search history from localStorage
 */
export function getSearchHistory(): SearchHistory[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add query to search history
 */
export function addToSearchHistory(
  query: string,
  resultCount: number,
): SearchHistory[] {
  if (typeof window === "undefined") return [];
  if (!query.trim()) return getSearchHistory();

  const history = getSearchHistory();

  // Remove duplicates
  const filteredHistory = history.filter((h) => h.query !== query);

  // Add new entry
  const newEntry: SearchHistory = {
    id: `search_${Date.now()}`,
    query: query.trim(),
    timestamp: Date.now(),
    resultCount,
  };

  const newHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore storage errors
  }

  return newHistory;
}

/**
 * Remove item from search history
 */
export function removeFromSearchHistory(id: string): SearchHistory[] {
  if (typeof window === "undefined") return [];

  const history = getSearchHistory();
  const newHistory = history.filter((h) => h.id !== id);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore storage errors
  }

  return newHistory;
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Search Suggestions Functions
// ============================================================================

/**
 * Get search suggestions
 */
export function getSearchSuggestions(
  items: MediaItem[],
  query: string,
  limit: number = 10,
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];
  const normalizedQuery = query.toLowerCase();

  // Add matching recent searches
  const history = getSearchHistory();
  for (const entry of history.slice(0, 3)) {
    if (entry.query.toLowerCase().includes(normalizedQuery)) {
      suggestions.push({ text: entry.query, type: "recent" });
    }
  }

  // Add matching filenames
  const seenFilenames = new Set<string>();
  for (const item of items) {
    const fileName = item.fileName.toLowerCase();
    if (fileName.includes(normalizedQuery) && !seenFilenames.has(fileName)) {
      suggestions.push({ text: item.fileName, type: "filename" });
      seenFilenames.add(fileName);
      if (suggestions.length >= limit) break;
    }
  }

  // Add matching usernames
  const seenUsers = new Set<string>();
  for (const item of items) {
    const displayName = item.uploadedBy.displayName.toLowerCase();
    const username = item.uploadedBy.username.toLowerCase();

    if (
      (displayName.includes(normalizedQuery) ||
        username.includes(normalizedQuery)) &&
      !seenUsers.has(item.uploadedBy.id)
    ) {
      suggestions.push({ text: item.uploadedBy.displayName, type: "user" });
      seenUsers.add(item.uploadedBy.id);
    }

    if (suggestions.length >= limit) break;
  }

  // Add matching extensions
  const seenExtensions = new Set<string>();
  for (const item of items) {
    const ext = item.fileExtension.toLowerCase();
    if (ext.includes(normalizedQuery) && !seenExtensions.has(ext)) {
      suggestions.push({ text: `.${ext}`, type: "extension" });
      seenExtensions.add(ext);
    }

    if (suggestions.length >= limit) break;
  }

  return suggestions.slice(0, limit);
}

// ============================================================================
// Highlight Functions
// ============================================================================

/**
 * Highlight matching text in a string
 */
export function highlightMatches(
  text: string,
  indices: [number, number][],
): { text: string; highlighted: boolean }[] {
  if (indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  // Sort indices by start position
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  // Merge overlapping indices
  const mergedIndices: [number, number][] = [];
  let current = sortedIndices[0];

  for (let i = 1; i < sortedIndices.length; i++) {
    const next = sortedIndices[i];
    if (next[0] <= current[1]) {
      current = [current[0], Math.max(current[1], next[1])];
    } else {
      mergedIndices.push(current);
      current = next;
    }
  }
  mergedIndices.push(current);

  // Build result segments
  const result: { text: string; highlighted: boolean }[] = [];
  let lastEnd = 0;

  for (const [start, end] of mergedIndices) {
    // Add non-highlighted segment before match
    if (start > lastEnd) {
      result.push({ text: text.slice(lastEnd, start), highlighted: false });
    }

    // Add highlighted match
    result.push({ text: text.slice(start, end), highlighted: true });
    lastEnd = end;
  }

  // Add remaining non-highlighted text
  if (lastEnd < text.length) {
    result.push({ text: text.slice(lastEnd), highlighted: false });
  }

  return result;
}

/**
 * Create highlighted HTML string
 */
export function createHighlightedHTML(
  text: string,
  indices: [number, number][],
  highlightClass: string = "bg-yellow-200",
): string {
  const segments = highlightMatches(text, indices);

  return segments
    .map((segment) =>
      segment.highlighted
        ? `<mark class="${highlightClass}">${escapeHTML(segment.text)}</mark>`
        : escapeHTML(segment.text),
    )
    .join("");
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
