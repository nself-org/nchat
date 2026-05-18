/**
 * Channel Search - Advanced search functionality for channels
 */

import type { Channel, ChannelType } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchOptions {
  query: string;
  fields?: SearchField[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  limit?: number;
  offset?: number;
}

export type SearchField = "name" | "description" | "topic" | "all";

export interface SearchResult {
  channel: Channel;
  relevance: number;
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  text: string;
  matches: HighlightMatch[];
}

export interface HighlightMatch {
  start: number;
  end: number;
  text: string;
}

export interface SearchSuggestion {
  type: "channel" | "category" | "keyword";
  value: string;
  display: string;
  channelId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SEARCH_FIELDS: SearchField[] = ["name", "description", "topic"];
const MAX_SUGGESTIONS = 5;
const MIN_QUERY_LENGTH = 1;

// ============================================================================
// Search Functions
// ============================================================================

export function searchChannels(
  channels: Channel[],
  options: SearchOptions,
): SearchResult[] {
  const {
    query,
    fields = DEFAULT_SEARCH_FIELDS,
    fuzzy = true,
    caseSensitive = false,
    wholeWord = false,
    limit,
    offset = 0,
  } = options;

  if (query.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const searchPattern = createSearchPattern(normalizedQuery, {
    fuzzy,
    wholeWord,
  });

  const results: SearchResult[] = [];

  for (const channel of channels) {
    const { relevance, highlights } = calculateSearchMatch(
      channel,
      normalizedQuery,
      searchPattern,
      fields,
      caseSensitive,
    );

    if (relevance > 0) {
      results.push({ channel, relevance, highlights });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  // Apply pagination
  let paginatedResults = results.slice(offset);
  if (limit) {
    paginatedResults = paginatedResults.slice(0, limit);
  }

  return paginatedResults;
}

function createSearchPattern(
  query: string,
  options: { fuzzy: boolean; wholeWord: boolean },
): RegExp {
  let pattern = escapeRegExp(query);

  if (options.fuzzy) {
    // Insert optional characters between each character for fuzzy matching
    pattern = pattern.split("").join(".*?");
  }

  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  return new RegExp(pattern, "gi");
}

function calculateSearchMatch(
  channel: Channel,
  query: string,
  pattern: RegExp,
  fields: SearchField[],
  caseSensitive: boolean,
): { relevance: number; highlights: SearchHighlight[] } {
  let relevance = 0;
  const highlights: SearchHighlight[] = [];

  const shouldSearchAll = fields.includes("all");
  const fieldsToSearch = shouldSearchAll
    ? ["name", "description", "topic"]
    : fields;

  for (const field of fieldsToSearch) {
    const value = getFieldValue(channel, field as Exclude<SearchField, "all">);
    if (!value) continue;

    const normalizedValue = caseSensitive ? value : value.toLowerCase();
    const matches = findMatches(normalizedValue, query, pattern);

    if (matches.length > 0) {
      // Calculate field-specific relevance
      const fieldWeight = getFieldWeight(field as Exclude<SearchField, "all">);
      const exactMatchBonus = normalizedValue === query ? 5 : 0;
      const startsWithBonus = normalizedValue.startsWith(query) ? 3 : 0;
      const wordBoundaryBonus = matches.some((m) =>
        isWordBoundary(normalizedValue, m.start),
      )
        ? 2
        : 0;

      relevance +=
        matches.length * fieldWeight +
        exactMatchBonus +
        startsWithBonus +
        wordBoundaryBonus;

      highlights.push({
        field,
        text: value,
        matches,
      });
    }
  }

  return { relevance, highlights };
}

function getFieldValue(
  channel: Channel,
  field: Exclude<SearchField, "all">,
): string | null {
  switch (field) {
    case "name":
      return channel.name;
    case "description":
      return channel.description;
    case "topic":
      return channel.topic;
    default:
      return null;
  }
}

function getFieldWeight(field: Exclude<SearchField, "all">): number {
  switch (field) {
    case "name":
      return 3;
    case "description":
      return 2;
    case "topic":
      return 1;
    default:
      return 1;
  }
}

function findMatches(
  text: string,
  query: string,
  pattern: RegExp,
): HighlightMatch[] {
  const matches: HighlightMatch[] = [];

  // First try exact match
  let index = text.indexOf(query);
  if (index !== -1) {
    while (index !== -1) {
      matches.push({
        start: index,
        end: index + query.length,
        text: text.slice(index, index + query.length),
      });
      index = text.indexOf(query, index + 1);
    }
    return matches;
  }

  // Fall back to pattern matching
  let match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
    // Prevent infinite loop
    if (match.index === pattern.lastIndex) {
      pattern.lastIndex++;
    }
  }

  return matches;
}

function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prevChar = text[index - 1];
  return /\s|[^\w]/.test(prevChar);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Search Suggestions
// ============================================================================

export function getSearchSuggestions(
  channels: Channel[],
  query: string,
  recentSearches: string[] = [],
): SearchSuggestion[] {
  if (query.length < MIN_QUERY_LENGTH) {
    // Return recent searches when query is empty
    return recentSearches.slice(0, MAX_SUGGESTIONS).map((search) => ({
      type: "keyword",
      value: search,
      display: search,
    }));
  }

  const normalizedQuery = query.toLowerCase();
  const suggestions: SearchSuggestion[] = [];

  // Find matching channels
  const matchingChannels = channels
    .filter((c) => c.name.toLowerCase().includes(normalizedQuery))
    .slice(0, MAX_SUGGESTIONS);

  for (const channel of matchingChannels) {
    suggestions.push({
      type: "channel",
      value: channel.name,
      display: channel.name,
      channelId: channel.id,
    });
  }

  // Extract keywords from descriptions
  const keywordSet = new Set<string>();
  for (const channel of channels) {
    if (channel.description) {
      const words = channel.description.split(/\s+/);
      for (const word of words) {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
        if (cleanWord.length > 3 && cleanWord.includes(normalizedQuery)) {
          keywordSet.add(cleanWord);
        }
      }
    }
  }

  const keywords = Array.from(keywordSet).slice(
    0,
    MAX_SUGGESTIONS - suggestions.length,
  );
  for (const keyword of keywords) {
    suggestions.push({
      type: "keyword",
      value: keyword,
      display: keyword,
    });
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

// ============================================================================
// Search History
// ============================================================================

const SEARCH_HISTORY_KEY = "nchat-channel-search-history";
const MAX_HISTORY_ITEMS = 10;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  const history = localStorage.getItem(SEARCH_HISTORY_KEY);
  return history ? JSON.parse(history) : [];
}

export function addToSearchHistory(query: string): void {
  if (typeof window === "undefined") return;
  if (query.length < MIN_QUERY_LENGTH) return;

  const history = getSearchHistory();
  const newHistory = [query, ...history.filter((h) => h !== query)].slice(
    0,
    MAX_HISTORY_ITEMS,
  );
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// ============================================================================
// Highlighting
// ============================================================================

export function highlightText(
  text: string,
  matches: HighlightMatch[],
): Array<{ text: string; highlighted: boolean }> {
  if (matches.length === 0) {
    return [{ text, highlighted: false }];
  }

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const mergedMatches: HighlightMatch[] = [];
  for (const match of sortedMatches) {
    const last = mergedMatches[mergedMatches.length - 1];
    if (last && match.start <= last.end) {
      last.end = Math.max(last.end, match.end);
      last.text = text.slice(last.start, last.end);
    } else {
      mergedMatches.push({ ...match });
    }
  }

  // Build segments
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let currentIndex = 0;

  for (const match of mergedMatches) {
    // Add non-highlighted segment before match
    if (match.start > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, match.start),
        highlighted: false,
      });
    }

    // Add highlighted segment
    segments.push({
      text: text.slice(match.start, match.end),
      highlighted: true,
    });

    currentIndex = match.end;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      highlighted: false,
    });
  }

  return segments;
}

// ============================================================================
// Quick Filters
// ============================================================================

export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  filter: (channel: Channel) => boolean;
}

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "public",
    label: "Public",
    icon: "Hash",
    filter: (c) => c.type === "public",
  },
  {
    id: "private",
    label: "Private",
    icon: "Lock",
    filter: (c) => c.type === "private",
  },
  {
    id: "active",
    label: "Recently Active",
    icon: "Activity",
    filter: (c) => {
      if (!c.lastMessageAt) return false;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(c.lastMessageAt) > dayAgo;
    },
  },
  {
    id: "new",
    label: "New Channels",
    icon: "Sparkles",
    filter: (c) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(c.createdAt) > weekAgo;
    },
  },
  {
    id: "popular",
    label: "Popular",
    icon: "TrendingUp",
    filter: (c) => c.memberCount >= 10,
  },
];

export function applyQuickFilter(
  channels: Channel[],
  filterId: string,
): Channel[] {
  const filter = QUICK_FILTERS.find((f) => f.id === filterId);
  if (!filter) return channels;
  return channels.filter(filter.filter);
}
