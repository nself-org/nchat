/**
 * Keyword Matcher - Matches keywords in message content for notifications
 *
 * Supports:
 * - Case-sensitive and case-insensitive matching
 * - Whole word matching
 * - Multiple keyword matching
 * - Regex patterns (optional)
 */

import type { KeywordNotification, KeywordMatch } from "./notification-types";

// ============================================================================
// Types
// ============================================================================

export interface MatchOptions {
  /** Whether to highlight matches in the text */
  highlight?: boolean;
  /** HTML tag for highlighting */
  highlightTag?: string;
  /** CSS class for highlighting */
  highlightClass?: string;
  /** Maximum number of matches to return */
  maxMatches?: number;
}

export interface HighlightedResult {
  text: string;
  matches: KeywordMatch[];
}

// ============================================================================
// Core Matching Functions
// ============================================================================

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create a regex pattern for keyword matching
 */
export function createKeywordPattern(
  keyword: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean },
): RegExp {
  const { caseSensitive = false, wholeWord = false } = options;

  let pattern = escapeRegex(keyword);

  if (wholeWord) {
    // Use word boundaries for whole word matching
    pattern = `\\b${pattern}\\b`;
  }

  const flags = caseSensitive ? "g" : "gi";
  return new RegExp(pattern, flags);
}

/**
 * Match a single keyword in text
 */
export function matchKeyword(
  text: string,
  keyword: KeywordNotification,
  options?: MatchOptions,
): KeywordMatch[] {
  if (!keyword.enabled || !keyword.keyword.trim()) {
    return [];
  }

  const pattern = createKeywordPattern(keyword.keyword, {
    caseSensitive: keyword.caseSensitive,
    wholeWord: keyword.wholeWord,
  });

  const matches: KeywordMatch[] = [];
  let match: RegExpExecArray | null;
  const maxMatches = options?.maxMatches ?? 100;

  while ((match = pattern.exec(text)) !== null && matches.length < maxMatches) {
    matches.push({
      keyword: keyword.keyword,
      matchedText: match[0],
      position: match.index,
      length: match[0].length,
    });

    // Prevent infinite loop for zero-length matches
    if (match.index === pattern.lastIndex) {
      pattern.lastIndex++;
    }
  }

  return matches;
}

/**
 * Match multiple keywords in text
 */
export function matchKeywords(
  text: string,
  keywords: KeywordNotification[],
  options?: MatchOptions,
): KeywordMatch[] {
  const allMatches: KeywordMatch[] = [];
  const maxMatches = options?.maxMatches ?? 100;

  for (const keyword of keywords) {
    if (allMatches.length >= maxMatches) break;

    const remaining = maxMatches - allMatches.length;
    const matches = matchKeyword(text, keyword, {
      ...options,
      maxMatches: remaining,
    });
    allMatches.push(...matches);
  }

  // Sort by position
  allMatches.sort((a, b) => a.position - b.position);

  return allMatches;
}

/**
 * Check if any keyword matches in text
 */
export function hasKeywordMatch(
  text: string,
  keywords: KeywordNotification[],
): boolean {
  for (const keyword of keywords) {
    if (!keyword.enabled || !keyword.keyword.trim()) continue;

    const pattern = createKeywordPattern(keyword.keyword, {
      caseSensitive: keyword.caseSensitive,
      wholeWord: keyword.wholeWord,
    });

    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Highlighting Functions
// ============================================================================

/**
 * Highlight matches in text with HTML
 */
export function highlightMatches(
  text: string,
  matches: KeywordMatch[],
  options?: MatchOptions,
): string {
  if (matches.length === 0) return text;

  const tag = options?.highlightTag ?? "mark";
  const className = options?.highlightClass ?? "keyword-highlight";

  // Sort matches by position in reverse order
  const sortedMatches = [...matches].sort((a, b) => b.position - a.position);

  let result = text;
  for (const match of sortedMatches) {
    const before = result.slice(0, match.position);
    const matched = result.slice(match.position, match.position + match.length);
    const after = result.slice(match.position + match.length);

    result = `${before}<${tag} class="${className}">${matched}</${tag}>${after}`;
  }

  return result;
}

/**
 * Get highlighted result with matches
 */
export function getHighlightedResult(
  text: string,
  keywords: KeywordNotification[],
  options?: MatchOptions,
): HighlightedResult {
  const matches = matchKeywords(text, keywords, options);
  const highlightedText = options?.highlight
    ? highlightMatches(text, matches, options)
    : text;

  return {
    text: highlightedText,
    matches,
  };
}

// ============================================================================
// Keyword Management Functions
// ============================================================================

/**
 * Create a new keyword notification
 */
export function createKeyword(
  keyword: string,
  options?: Partial<Omit<KeywordNotification, "id" | "keyword" | "createdAt">>,
): KeywordNotification {
  return {
    id: `kw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    keyword: keyword.trim(),
    caseSensitive: options?.caseSensitive ?? false,
    wholeWord: options?.wholeWord ?? true,
    enabled: options?.enabled ?? true,
    highlightColor: options?.highlightColor,
    soundId: options?.soundId,
    channelIds: options?.channelIds ?? [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate a keyword
 */
export function validateKeyword(keyword: string): {
  valid: boolean;
  error?: string;
} {
  if (!keyword.trim()) {
    return { valid: false, error: "Keyword cannot be empty" };
  }

  if (keyword.length < 2) {
    return { valid: false, error: "Keyword must be at least 2 characters" };
  }

  if (keyword.length > 100) {
    return { valid: false, error: "Keyword cannot exceed 100 characters" };
  }

  // Check for problematic patterns
  if (/^[\s\W]+$/.test(keyword)) {
    return {
      valid: false,
      error: "Keyword must contain at least one letter or number",
    };
  }

  return { valid: true };
}

/**
 * Check for duplicate keywords
 */
export function isDuplicateKeyword(
  keyword: string,
  existingKeywords: KeywordNotification[],
  options?: { caseSensitive?: boolean },
): boolean {
  const normalizedNew = options?.caseSensitive
    ? keyword.trim()
    : keyword.trim().toLowerCase();

  return existingKeywords.some((k) => {
    const normalizedExisting = options?.caseSensitive
      ? k.keyword.trim()
      : k.keyword.trim().toLowerCase();
    return normalizedNew === normalizedExisting;
  });
}

/**
 * Filter keywords by channel
 */
export function getKeywordsForChannel(
  keywords: KeywordNotification[],
  channelId: string,
): KeywordNotification[] {
  return keywords.filter(
    (k) =>
      k.enabled &&
      (k.channelIds.length === 0 || k.channelIds.includes(channelId)),
  );
}

// ============================================================================
// Sorting and Filtering
// ============================================================================

/**
 * Sort keywords by different criteria
 */
export function sortKeywords(
  keywords: KeywordNotification[],
  sortBy: "keyword" | "createdAt" | "enabled" = "keyword",
  direction: "asc" | "desc" = "asc",
): KeywordNotification[] {
  const sorted = [...keywords].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "keyword":
        comparison = a.keyword.localeCompare(b.keyword);
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "enabled":
        comparison = (a.enabled ? 1 : 0) - (b.enabled ? 1 : 0);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Filter keywords by search term
 */
export function searchKeywords(
  keywords: KeywordNotification[],
  searchTerm: string,
): KeywordNotification[] {
  if (!searchTerm.trim()) return keywords;

  const normalizedSearch = searchTerm.toLowerCase().trim();

  return keywords.filter((k) =>
    k.keyword.toLowerCase().includes(normalizedSearch),
  );
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get keyword statistics
 */
export function getKeywordStats(keywords: KeywordNotification[]): {
  total: number;
  enabled: number;
  disabled: number;
  withChannelRestriction: number;
  withCustomSound: number;
  caseSensitive: number;
  wholeWord: number;
} {
  return {
    total: keywords.length,
    enabled: keywords.filter((k) => k.enabled).length,
    disabled: keywords.filter((k) => !k.enabled).length,
    withChannelRestriction: keywords.filter((k) => k.channelIds.length > 0)
      .length,
    withCustomSound: keywords.filter((k) => !!k.soundId).length,
    caseSensitive: keywords.filter((k) => k.caseSensitive).length,
    wholeWord: keywords.filter((k) => k.wholeWord).length,
  };
}
