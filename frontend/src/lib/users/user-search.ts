/**
 * User Search Functionality
 *
 * Advanced search utilities for the user directory including fuzzy matching,
 * relevance scoring, and search suggestions.
 */

import { type ExtendedUserProfile } from "@/components/users/UserCard";

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  user: ExtendedUserProfile;
  score: number;
  matchedFields: string[];
}

export interface SearchOptions {
  fuzzy?: boolean;
  threshold?: number;
  maxResults?: number;
  searchFields?: SearchField[];
}

export type SearchField =
  | "displayName"
  | "username"
  | "email"
  | "title"
  | "department"
  | "team"
  | "bio"
  | "location";

export interface SearchSuggestion {
  text: string;
  type: "user" | "department" | "team" | "role";
  count?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SEARCH_FIELDS: SearchField[] = [
  "displayName",
  "username",
  "email",
  "title",
  "department",
];

const FIELD_WEIGHTS: Record<SearchField, number> = {
  displayName: 10,
  username: 8,
  email: 6,
  title: 5,
  department: 4,
  team: 4,
  bio: 2,
  location: 3,
};

// ============================================================================
// Search Functions
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings
 * Returns value between 0 (no match) and 1 (exact match)
 */
function calculateSimilarity(source: string, target: string): number {
  if (!source || !target) return 0;

  const sourceLower = source.toLowerCase();
  const targetLower = target.toLowerCase();

  // Exact match
  if (sourceLower === targetLower) return 1;

  // Contains match
  if (sourceLower.includes(targetLower)) {
    // Score based on position and length ratio
    const positionScore =
      1 - sourceLower.indexOf(targetLower) / sourceLower.length;
    const lengthRatio = targetLower.length / sourceLower.length;
    return 0.7 + positionScore * 0.15 + lengthRatio * 0.15;
  }

  // Starts with match
  if (sourceLower.startsWith(targetLower)) {
    return 0.8;
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(sourceLower, targetLower);
  const maxLength = Math.max(sourceLower.length, targetLower.length);
  const similarity = 1 - distance / maxLength;

  return similarity > 0.5 ? similarity * 0.5 : 0;
}

/**
 * Search users with scoring and ranking
 */
export function searchUsers(
  users: ExtendedUserProfile[],
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const {
    fuzzy = true,
    threshold = 0.3,
    maxResults = 50,
    searchFields = DEFAULT_SEARCH_FIELDS,
  } = options;

  if (!query.trim()) {
    return users.map((user) => ({
      user,
      score: 0,
      matchedFields: [],
    }));
  }

  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/);
  const results: SearchResult[] = [];

  users.forEach((user) => {
    let totalScore = 0;
    const matchedFields: string[] = [];

    searchFields.forEach((field) => {
      const value = user[field as keyof ExtendedUserProfile];
      if (typeof value !== "string") return;

      const fieldWeight = FIELD_WEIGHTS[field];
      let fieldScore = 0;

      // Check each query term
      queryTerms.forEach((term) => {
        const similarity = calculateSimilarity(value, term);

        if (
          similarity > threshold ||
          (!fuzzy && value.toLowerCase().includes(term))
        ) {
          fieldScore += similarity * fieldWeight;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
        }
      });

      totalScore += fieldScore;
    });

    // Normalize score by number of query terms
    totalScore /= queryTerms.length;

    if (totalScore > 0 || matchedFields.length > 0) {
      results.push({
        user,
        score: totalScore,
        matchedFields,
      });
    }
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults);
}

/**
 * Get search suggestions based on user data
 */
export function getSearchSuggestions(
  users: ExtendedUserProfile[],
  query: string,
  maxSuggestions: number = 5,
): SearchSuggestion[] {
  if (!query.trim() || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();

  // User suggestions
  users.forEach((user) => {
    if (
      user.displayName.toLowerCase().includes(normalizedQuery) ||
      user.username.toLowerCase().includes(normalizedQuery)
    ) {
      const key = `user:${user.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          text: user.displayName,
          type: "user",
        });
      }
    }
  });

  // Department suggestions
  const departments = new Map<string, number>();
  users.forEach((user) => {
    if (user.department?.toLowerCase().includes(normalizedQuery)) {
      departments.set(
        user.department,
        (departments.get(user.department) || 0) + 1,
      );
    }
  });
  departments.forEach((count, dept) => {
    const key = `department:${dept}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({
        text: dept,
        type: "department",
        count,
      });
    }
  });

  // Team suggestions
  const teams = new Map<string, number>();
  users.forEach((user) => {
    if (user.team?.toLowerCase().includes(normalizedQuery)) {
      teams.set(user.team, (teams.get(user.team) || 0) + 1);
    }
  });
  teams.forEach((count, team) => {
    const key = `team:${team}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({
        text: team,
        type: "team",
        count,
      });
    }
  });

  // Sort by relevance (users first, then by count)
  suggestions.sort((a, b) => {
    if (a.type === "user" && b.type !== "user") return -1;
    if (b.type === "user" && a.type !== "user") return 1;
    return (b.count || 0) - (a.count || 0);
  });

  return suggestions.slice(0, maxSuggestions);
}

/**
 * Highlight matching text in search results
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim() || !text) return text;

  const terms = query.toLowerCase().split(/\s+/);
  let result = text;

  terms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    result = result.replace(regex, "<mark>$1</mark>");
  });

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get recent searches from localStorage
 */
export function getRecentSearches(
  key: string = "nchat-recent-user-searches",
): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a search to recent searches
 */
export function saveRecentSearch(
  query: string,
  key: string = "nchat-recent-user-searches",
  maxItems: number = 10,
): void {
  if (typeof window === "undefined" || !query.trim()) return;

  try {
    const recent = getRecentSearches(key);
    const filtered = recent.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, maxItems);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear recent searches
 */
export function clearRecentSearches(
  key: string = "nchat-recent-user-searches",
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}
