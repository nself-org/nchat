/**
 * Emoji Search - Search logic for finding emojis
 *
 * This module provides fuzzy search, keyword matching, and relevance
 * scoring for emoji search functionality.
 */

import { EMOJI_DATA, EMOJI_BY_NAME, getEmojisByCategory } from "./emoji-data";
import type {
  Emoji,
  CustomEmoji,
  EmojiSearchResult,
  EmojiSearchOptions,
  EmojiCategory,
} from "./emoji-types";

// ============================================================================
// Search Configuration
// ============================================================================

const DEFAULT_SEARCH_OPTIONS: Required<EmojiSearchOptions> = {
  limit: 50,
  includeCustom: true,
  category: "all",
  minScore: 0,
  fuzzy: true,
};

// ============================================================================
// Fuzzy Matching
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score (0-100)
 * Higher score = better match
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (q === t) return 100;

  // Starts with query
  if (t.startsWith(q)) return 90 - (t.length - q.length);

  // Contains query
  if (t.includes(q)) return 70 - t.indexOf(q);

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const similarity = ((maxLen - distance) / maxLen) * 60;

  return Math.max(0, similarity);
}

/**
 * Check if characters of query appear in order in target
 * Used for "thum" matching "thumbsup"
 */
function subsequenceMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
    }
  }

  return qi === q.length;
}

/**
 * Calculate subsequence match score
 */
function subsequenceScore(query: string, target: string): number {
  if (!subsequenceMatch(query, target)) return 0;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Higher score for consecutive matches
  let consecutive = 0;
  let maxConsecutive = 0;
  let qi = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
      qi++;
    } else {
      consecutive = 0;
    }
  }

  // Base score for matching
  const baseScore = 50;
  // Bonus for consecutive matches
  const consecutiveBonus = (maxConsecutive / q.length) * 30;
  // Penalty for longer targets
  const lengthPenalty = Math.min(20, (t.length - q.length) * 2);

  return baseScore + consecutiveBonus - lengthPenalty;
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Score an emoji against a search query
 */
function scoreEmoji(
  emoji: Emoji,
  query: string,
  fuzzy: boolean,
): {
  score: number;
  matchedField: "name" | "keyword" | "alias";
  matchedText: string;
} | null {
  const q = query.toLowerCase();

  // Check name (highest priority)
  let nameScore = 0;
  if (emoji.name.toLowerCase() === q) {
    nameScore = 100;
  } else if (emoji.name.toLowerCase().startsWith(q)) {
    nameScore = 90;
  } else if (emoji.name.toLowerCase().includes(q)) {
    nameScore = 70;
  } else if (fuzzy) {
    nameScore = Math.max(
      fuzzyScore(q, emoji.name),
      subsequenceScore(q, emoji.name),
    );
  }

  if (nameScore >= 40) {
    return { score: nameScore, matchedField: "name", matchedText: emoji.name };
  }

  // Check aliases
  for (const alias of emoji.aliases) {
    let aliasScore = 0;
    if (alias.toLowerCase() === q) {
      aliasScore = 95;
    } else if (alias.toLowerCase().startsWith(q)) {
      aliasScore = 85;
    } else if (alias.toLowerCase().includes(q)) {
      aliasScore = 65;
    } else if (fuzzy) {
      aliasScore = Math.max(fuzzyScore(q, alias), subsequenceScore(q, alias));
    }

    if (aliasScore >= 40) {
      return { score: aliasScore, matchedField: "alias", matchedText: alias };
    }
  }

  // Check keywords
  for (const keyword of emoji.keywords) {
    let keywordScore = 0;
    if (keyword.toLowerCase() === q) {
      keywordScore = 80;
    } else if (keyword.toLowerCase().startsWith(q)) {
      keywordScore = 60;
    } else if (keyword.toLowerCase().includes(q)) {
      keywordScore = 40;
    }

    if (keywordScore >= 30) {
      return {
        score: keywordScore,
        matchedField: "keyword",
        matchedText: keyword,
      };
    }
  }

  // Check display name
  if (emoji.displayName.toLowerCase().includes(q)) {
    return { score: 50, matchedField: "name", matchedText: emoji.displayName };
  }

  return null;
}

/**
 * Score a custom emoji against a search query
 */
function scoreCustomEmoji(
  emoji: CustomEmoji,
  query: string,
  fuzzy: boolean,
): {
  score: number;
  matchedField: "name" | "keyword" | "alias";
  matchedText: string;
} | null {
  const q = query.toLowerCase();

  // Check name
  let nameScore = 0;
  if (emoji.name.toLowerCase() === q) {
    nameScore = 100;
  } else if (emoji.name.toLowerCase().startsWith(q)) {
    nameScore = 90;
  } else if (emoji.name.toLowerCase().includes(q)) {
    nameScore = 70;
  } else if (fuzzy) {
    nameScore = Math.max(
      fuzzyScore(q, emoji.name),
      subsequenceScore(q, emoji.name),
    );
  }

  if (nameScore >= 40) {
    return { score: nameScore, matchedField: "name", matchedText: emoji.name };
  }

  // Check aliases
  for (const alias of emoji.aliases) {
    let aliasScore = 0;
    if (alias.toLowerCase() === q) {
      aliasScore = 95;
    } else if (alias.toLowerCase().startsWith(q)) {
      aliasScore = 85;
    } else if (alias.toLowerCase().includes(q)) {
      aliasScore = 65;
    } else if (fuzzy) {
      aliasScore = Math.max(fuzzyScore(q, alias), subsequenceScore(q, alias));
    }

    if (aliasScore >= 40) {
      return { score: aliasScore, matchedField: "alias", matchedText: alias };
    }
  }

  return null;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search emojis by query
 *
 * @param query - The search query
 * @param options - Search options
 * @returns Array of search results sorted by relevance
 *
 * @example
 * searchEmojis('thum') // finds :thumbsup:
 * searchEmojis('smile', { category: 'smileys' })
 * searchEmojis('fire', { fuzzy: false })
 */
export function searchEmojis(
  query: string,
  options: EmojiSearchOptions = {},
): EmojiSearchResult[] {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const results: EmojiSearchResult[] = [];

  if (!query || query.length < 1) {
    return results;
  }

  // Get emojis to search
  const emojisToSearch =
    opts.category === "all"
      ? EMOJI_DATA
      : getEmojisByCategory(opts.category as EmojiCategory);

  // Score each emoji
  for (const emoji of emojisToSearch) {
    const result = scoreEmoji(emoji, query, opts.fuzzy);
    if (result && result.score >= opts.minScore) {
      results.push({
        emoji,
        isCustom: false,
        score: result.score,
        matchedField: result.matchedField,
        matchedText: result.matchedText,
      });
    }
  }

  // Sort by score (descending) and limit results
  return results.sort((a, b) => b.score - a.score).slice(0, opts.limit);
}

/**
 * Search emojis including custom emojis
 *
 * @param query - The search query
 * @param customEmojis - Array of custom emojis to include
 * @param options - Search options
 */
export function searchEmojisWithCustom(
  query: string,
  customEmojis: CustomEmoji[],
  options: EmojiSearchOptions = {},
): EmojiSearchResult[] {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const results = searchEmojis(query, { ...opts, limit: opts.limit });

  if (!opts.includeCustom || !customEmojis.length) {
    return results;
  }

  // Search custom emojis
  for (const emoji of customEmojis) {
    if (!emoji.enabled) continue;

    const result = scoreCustomEmoji(emoji, query, opts.fuzzy);
    if (result && result.score >= opts.minScore) {
      results.push({
        emoji,
        isCustom: true,
        score: result.score,
        matchedField: result.matchedField,
        matchedText: result.matchedText,
      });
    }
  }

  // Re-sort and limit
  return results.sort((a, b) => b.score - a.score).slice(0, opts.limit);
}

/**
 * Quick search for autocomplete (optimized for speed)
 *
 * @param query - The search query
 * @param limit - Maximum results
 * @returns Quick search results
 */
export function quickSearch(
  query: string,
  limit: number = 8,
): Array<{ emoji: string; shortcode: string; name: string }> {
  const q = query.toLowerCase().replace(/^:|:$/g, "");

  if (!q) return [];

  const results: Array<{
    emoji: string;
    shortcode: string;
    name: string;
    score: number;
  }> = [];

  for (const emoji of EMOJI_DATA) {
    // Check name only for speed
    if (emoji.name.startsWith(q)) {
      results.push({
        emoji: emoji.emoji,
        shortcode: emoji.name,
        name: emoji.displayName,
        score: 100 - emoji.name.length,
      });
    } else if (emoji.name.includes(q)) {
      results.push({
        emoji: emoji.emoji,
        shortcode: emoji.name,
        name: emoji.displayName,
        score: 50 - emoji.name.indexOf(q),
      });
    } else {
      // Check aliases
      for (const alias of emoji.aliases) {
        if (alias.startsWith(q)) {
          results.push({
            emoji: emoji.emoji,
            shortcode: alias,
            name: emoji.displayName,
            score: 90 - alias.length,
          });
          break;
        } else if (alias.includes(q)) {
          results.push({
            emoji: emoji.emoji,
            shortcode: alias,
            name: emoji.displayName,
            score: 40 - alias.indexOf(q),
          });
          break;
        }
      }
    }

    // Early exit if we have enough results
    if (results.length >= limit * 2) break;
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ emoji, shortcode, name }) => ({ emoji, shortcode, name }));
}

/**
 * Search by category
 *
 * @param category - The category to search in
 * @param query - Optional search query within category
 * @returns Emojis in the category
 */
export function searchByCategory(
  category: EmojiCategory,
  query?: string,
): Emoji[] {
  const categoryEmojis = getEmojisByCategory(category);

  if (!query) {
    return categoryEmojis;
  }

  const q = query.toLowerCase();

  return categoryEmojis.filter(
    (emoji) =>
      emoji.name.includes(q) ||
      emoji.aliases.some((a) => a.includes(q)) ||
      emoji.keywords.some((k) => k.includes(q)),
  );
}

/**
 * Get emoji suggestions based on context
 *
 * @param context - Text context around cursor
 * @returns Suggested emojis
 */
export function getContextualSuggestions(context: string): Emoji[] {
  const keywords = context
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (!keywords.length) return [];

  const scores = new Map<string, number>();

  for (const keyword of keywords) {
    for (const emoji of EMOJI_DATA) {
      // Check if keyword matches any of the emoji's keywords
      if (
        emoji.keywords.some((k) => k.includes(keyword) || keyword.includes(k))
      ) {
        scores.set(emoji.id, (scores.get(emoji.id) ?? 0) + 1);
      }
    }
  }

  // Get emojis sorted by match count
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => EMOJI_DATA.find((e) => e.id === id)!)
    .filter(Boolean);
}

// ============================================================================
// Search Index (for larger datasets)
// ============================================================================

/**
 * Pre-built search index for fast lookups
 */
class EmojiSearchIndex {
  private prefixIndex: Map<string, Set<string>> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.buildIndex();
  }

  private buildIndex(): void {
    for (const emoji of EMOJI_DATA) {
      // Index name prefixes
      for (let i = 1; i <= emoji.name.length; i++) {
        const prefix = emoji.name.slice(0, i).toLowerCase();
        if (!this.prefixIndex.has(prefix)) {
          this.prefixIndex.set(prefix, new Set());
        }
        this.prefixIndex.get(prefix)!.add(emoji.id);
      }

      // Index alias prefixes
      for (const alias of emoji.aliases) {
        for (let i = 1; i <= alias.length; i++) {
          const prefix = alias.slice(0, i).toLowerCase();
          if (!this.prefixIndex.has(prefix)) {
            this.prefixIndex.set(prefix, new Set());
          }
          this.prefixIndex.get(prefix)!.add(emoji.id);
        }
      }

      // Index keywords
      for (const keyword of emoji.keywords) {
        const kw = keyword.toLowerCase();
        if (!this.keywordIndex.has(kw)) {
          this.keywordIndex.set(kw, new Set());
        }
        this.keywordIndex.get(kw)!.add(emoji.id);
      }
    }
  }

  /**
   * Search by prefix (fast)
   */
  searchByPrefix(prefix: string): string[] {
    const ids = this.prefixIndex.get(prefix.toLowerCase());
    return ids ? Array.from(ids) : [];
  }

  /**
   * Search by keyword (fast)
   */
  searchByKeyword(keyword: string): string[] {
    const ids = this.keywordIndex.get(keyword.toLowerCase());
    return ids ? Array.from(ids) : [];
  }
}

// Create singleton search index
let searchIndex: EmojiSearchIndex | null = null;

/**
 * Get the emoji search index (lazily initialized)
 */
export function getSearchIndex(): EmojiSearchIndex {
  if (!searchIndex) {
    searchIndex = new EmojiSearchIndex();
  }
  return searchIndex;
}

/**
 * Fast prefix search using index
 */
export function fastPrefixSearch(prefix: string, limit: number = 10): Emoji[] {
  const index = getSearchIndex();
  const ids = index.searchByPrefix(prefix);

  return ids
    .slice(0, limit)
    .map((id) => EMOJI_DATA.find((e) => e.id === id)!)
    .filter(Boolean);
}
