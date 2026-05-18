/**
 * Saved Search
 *
 * Search functionality for saved messages.
 */

import type { SavedMessage, SavedFilters } from "./saved-types";

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  /** The saved message */
  item: SavedMessage;
  /** Search score (higher is better) */
  score: number;
  /** Highlighted matches in content */
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  /** Field where match was found */
  field: "content" | "note" | "author" | "tag";
  /** Matched text */
  text: string;
  /** Start index in original text */
  startIndex: number;
  /** End index in original text */
  endIndex: number;
}

export interface SearchOptions {
  /** Search query */
  query: string;
  /** Additional filters */
  filters?: SavedFilters;
  /** Maximum results */
  limit?: number;
  /** Fuzzy matching */
  fuzzy?: boolean;
  /** Search in specific fields only */
  fields?: ("content" | "note" | "author" | "tag")[];
}

// ============================================================================
// Search Implementation
// ============================================================================

/**
 * Search saved messages.
 */
export function searchSavedMessages(
  saved: SavedMessage[],
  options: SearchOptions,
): SearchResult[] {
  const query = options.query.toLowerCase().trim();

  if (!query) {
    return saved.map((item) => ({
      item,
      score: 0,
      highlights: [],
    }));
  }

  const fields = options.fields ?? ["content", "note", "author", "tag"];
  const results: SearchResult[] = [];

  for (const item of saved) {
    let score = 0;
    const highlights: SearchHighlight[] = [];

    // Search in message content
    if (fields.includes("content")) {
      const contentMatches = findMatches(
        item.message.content,
        query,
        options.fuzzy,
      );
      if (contentMatches.length > 0) {
        score += contentMatches.length * 10;
        highlights.push(
          ...contentMatches.map((m) => ({
            field: "content" as const,
            ...m,
          })),
        );
      }
    }

    // Search in note
    if (fields.includes("note") && item.note) {
      const noteMatches = findMatches(item.note, query, options.fuzzy);
      if (noteMatches.length > 0) {
        score += noteMatches.length * 8;
        highlights.push(
          ...noteMatches.map((m) => ({
            field: "note" as const,
            ...m,
          })),
        );
      }
    }

    // Search in author name
    if (fields.includes("author")) {
      const authorMatches = findMatches(
        item.message.user.displayName,
        query,
        options.fuzzy,
      );
      if (authorMatches.length > 0) {
        score += authorMatches.length * 5;
        highlights.push(
          ...authorMatches.map((m) => ({
            field: "author" as const,
            ...m,
          })),
        );
      }
    }

    // Search in tags
    if (fields.includes("tag")) {
      for (const tag of item.tags) {
        const tagMatches = findMatches(tag, query, options.fuzzy);
        if (tagMatches.length > 0) {
          score += tagMatches.length * 7;
          highlights.push(
            ...tagMatches.map((m) => ({
              field: "tag" as const,
              ...m,
            })),
          );
        }
      }
    }

    // Apply starred boost
    if (item.isStarred && score > 0) {
      score *= 1.2;
    }

    // Apply recency boost
    const daysSinceSaved = Math.floor(
      (Date.now() - item.savedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceSaved < 7 && score > 0) {
      score *= 1.1;
    }

    if (score > 0) {
      results.push({ item, score, highlights });
    }
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  if (options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}

// ============================================================================
// Match Finding
// ============================================================================

interface Match {
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Find all matches of query in text.
 */
function findMatches(
  text: string,
  query: string,
  fuzzy: boolean = false,
): Match[] {
  const matches: Match[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (fuzzy) {
    // Fuzzy matching - find words that start with query
    const words = lowerText.split(/\s+/);
    let currentIndex = 0;

    for (const word of words) {
      const wordStart = lowerText.indexOf(word, currentIndex);

      if (word.startsWith(lowerQuery) || lowerQuery.startsWith(word)) {
        matches.push({
          text: text.slice(wordStart, wordStart + word.length),
          startIndex: wordStart,
          endIndex: wordStart + word.length,
        });
      }

      currentIndex = wordStart + word.length;
    }
  } else {
    // Exact substring matching
    let index = 0;
    while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
      matches.push({
        text: text.slice(index, index + query.length),
        startIndex: index,
        endIndex: index + query.length,
      });
      index += query.length;
    }
  }

  return matches;
}

// ============================================================================
// Highlight Rendering
// ============================================================================

/**
 * Apply highlights to text for rendering.
 */
export function applyHighlights(
  text: string,
  highlights: SearchHighlight[],
  wrapper: (text: string) => string = (t) => `<mark>${t}</mark>`,
): string {
  if (highlights.length === 0) return text;

  // Sort highlights by start index (descending to avoid index shifting)
  const sorted = [...highlights].sort((a, b) => b.startIndex - a.startIndex);

  let result = text;
  for (const highlight of sorted) {
    const before = result.slice(0, highlight.startIndex);
    const match = result.slice(highlight.startIndex, highlight.endIndex);
    const after = result.slice(highlight.endIndex);
    result = before + wrapper(match) + after;
  }

  return result;
}

/**
 * Get context around a highlight.
 */
export function getHighlightContext(
  text: string,
  highlight: SearchHighlight,
  contextLength: number = 50,
): string {
  const start = Math.max(0, highlight.startIndex - contextLength);
  const end = Math.min(text.length, highlight.endIndex + contextLength);

  let context = text.slice(start, end);

  if (start > 0) {
    context = "..." + context;
  }
  if (end < text.length) {
    context = context + "...";
  }

  return context;
}

// ============================================================================
// Search History
// ============================================================================

const MAX_SEARCH_HISTORY = 20;

/**
 * Add a search query to history (stored in localStorage).
 */
export function addToSearchHistory(query: string): void {
  if (typeof window === "undefined") return;

  const history = getSearchHistory();
  const normalized = query.trim().toLowerCase();

  // Remove if already exists
  const filtered = history.filter((h) => h.toLowerCase() !== normalized);

  // Add to beginning
  filtered.unshift(query.trim());

  // Limit size
  const limited = filtered.slice(0, MAX_SEARCH_HISTORY);

  localStorage.setItem("nchat-saved-search-history", JSON.stringify(limited));
}

/**
 * Get search history from localStorage.
 */
export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem("nchat-saved-search-history");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }

  return [];
}

/**
 * Clear search history.
 */
export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nchat-saved-search-history");
}
