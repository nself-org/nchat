/**
 * Command Search
 *
 * Search and filter utilities for the command palette.
 * Implements fuzzy matching and relevance scoring.
 */

import type {
  Command,
  CommandSearchOptions,
  CommandSearchResult,
  CommandMatch,
  CommandCategory,
} from "./command-types";

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_SEARCH_OPTIONS: Required<CommandSearchOptions> = {
  limit: 50,
  categories: [],
  includeHidden: false,
  minScore: 0.1,
  includeRecent: true,
  customScorer: () => 0,
};

// ============================================================================
// Fuzzy Match Utility
// ============================================================================

interface FuzzyMatchResult {
  score: number;
  matches: Array<{ start: number; end: number }>;
}

/**
 * Perform fuzzy matching between query and text
 */
function fuzzyMatch(query: string, text: string): FuzzyMatchResult {
  if (!query) {
    return { score: 1, matches: [] };
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower === queryLower) {
    return {
      score: 1,
      matches: [{ start: 0, end: text.length }],
    };
  }

  // Contains match
  const containsIndex = textLower.indexOf(queryLower);
  if (containsIndex !== -1) {
    return {
      score: 0.9 - containsIndex * 0.01,
      matches: [{ start: containsIndex, end: containsIndex + query.length }],
    };
  }

  // Starts with match
  if (textLower.startsWith(queryLower)) {
    return {
      score: 0.95,
      matches: [{ start: 0, end: query.length }],
    };
  }

  // Word start match
  const words = textLower.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith(queryLower)) {
      const startIndex = textLower.indexOf(words[i]);
      return {
        score: 0.8 - i * 0.05,
        matches: [{ start: startIndex, end: startIndex + query.length }],
      };
    }
  }

  // Fuzzy character match
  let queryIndex = 0;
  let textIndex = 0;
  const matches: Array<{ start: number; end: number }> = [];
  let consecutiveMatches = 0;
  let totalMatches = 0;

  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      if (
        matches.length === 0 ||
        matches[matches.length - 1].end !== textIndex
      ) {
        matches.push({ start: textIndex, end: textIndex + 1 });
      } else {
        matches[matches.length - 1].end = textIndex + 1;
        consecutiveMatches++;
      }
      totalMatches++;
      queryIndex++;
    }
    textIndex++;
  }

  // All query characters must be found
  if (queryIndex !== queryLower.length) {
    return { score: 0, matches: [] };
  }

  // Calculate score based on matches
  const coverage = totalMatches / text.length;
  const consecutiveBonus = consecutiveMatches * 0.05;
  const positionBonus =
    matches.length > 0 ? (1 - matches[0].start / text.length) * 0.1 : 0;

  const score = Math.min(
    0.7,
    coverage * 0.5 + consecutiveBonus + positionBonus,
  );

  return { score, matches };
}

// ============================================================================
// Search Command
// ============================================================================

/**
 * Search commands with fuzzy matching
 */
export function searchCommands(
  commands: Command[],
  query: string,
  options: CommandSearchOptions = {},
): CommandSearchResult[] {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const normalizedQuery = query.trim().toLowerCase();

  // If no query, return all commands (optionally filtered by category)
  if (!normalizedQuery) {
    let filtered = commands;

    // Filter by categories if specified
    if (opts.categories && opts.categories.length > 0) {
      filtered = filtered.filter((cmd) =>
        opts.categories!.includes(cmd.category),
      );
    }

    // Filter hidden commands
    if (!opts.includeHidden) {
      filtered = filtered.filter((cmd) => cmd.status !== "hidden");
    }

    return filtered.slice(0, opts.limit).map((command) => ({
      command,
      score: command.isRecent ? 1 : 0.5,
      matches: [],
    }));
  }

  const results: CommandSearchResult[] = [];

  for (const command of commands) {
    // Filter by categories if specified
    if (opts.categories && opts.categories.length > 0) {
      if (!opts.categories.includes(command.category)) {
        continue;
      }
    }

    // Skip hidden commands unless explicitly included
    if (!opts.includeHidden && command.status === "hidden") {
      continue;
    }

    // Calculate scores for different fields
    const scores: Array<{ score: number; matches: CommandMatch[] }> = [];

    // Match against name (highest weight)
    const nameMatch = fuzzyMatch(normalizedQuery, command.name);
    if (nameMatch.score > 0) {
      scores.push({
        score: nameMatch.score * 1.0,
        matches: nameMatch.matches.map((m) => ({
          field: "name" as const,
          start: m.start,
          end: m.end,
        })),
      });
    }

    // Match against description
    if (command.description) {
      const descMatch = fuzzyMatch(normalizedQuery, command.description);
      if (descMatch.score > 0) {
        scores.push({
          score: descMatch.score * 0.6,
          matches: descMatch.matches.map((m) => ({
            field: "description" as const,
            start: m.start,
            end: m.end,
          })),
        });
      }
    }

    // Match against keywords
    if (command.keywords) {
      for (const keyword of command.keywords) {
        const keywordMatch = fuzzyMatch(normalizedQuery, keyword);
        if (keywordMatch.score > 0) {
          scores.push({
            score: keywordMatch.score * 0.8,
            matches: keywordMatch.matches.map((m) => ({
              field: "keywords" as const,
              start: m.start,
              end: m.end,
            })),
          });
        }
      }
    }

    // Apply custom scorer if provided
    if (opts.customScorer) {
      const customScore = opts.customScorer(command, normalizedQuery);
      if (customScore > 0) {
        scores.push({ score: customScore, matches: [] });
      }
    }

    // Calculate final score (take best match)
    if (scores.length > 0) {
      const bestScore = Math.max(...scores.map((s) => s.score));

      // Apply priority boost
      let finalScore = bestScore;
      if (command.priority === "high") {
        finalScore *= 1.2;
      } else if (command.priority === "low") {
        finalScore *= 0.8;
      }

      // Apply recent boost
      if (command.isRecent && opts.includeRecent) {
        finalScore *= 1.1;
      }

      // Clamp score to 0-1
      finalScore = Math.min(1, Math.max(0, finalScore));

      if (finalScore >= opts.minScore) {
        const allMatches = scores.flatMap((s) => s.matches);
        results.push({
          command,
          score: finalScore,
          matches: allMatches,
        });
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  return results.slice(0, opts.limit);
}

// ============================================================================
// Filter Commands
// ============================================================================

/**
 * Filter commands by category
 */
export function filterByCategory(
  commands: Command[],
  category: CommandCategory,
): Command[] {
  return commands.filter((cmd) => cmd.category === category);
}

/**
 * Filter commands by multiple categories
 */
export function filterByCategories(
  commands: Command[],
  categories: CommandCategory[],
): Command[] {
  if (categories.length === 0) return commands;
  return commands.filter((cmd) => categories.includes(cmd.category));
}

/**
 * Filter commands by status
 */
export function filterByStatus(
  commands: Command[],
  statuses: Array<"ready" | "loading" | "disabled" | "hidden">,
): Command[] {
  return commands.filter((cmd) => statuses.includes(cmd.status || "ready"));
}

/**
 * Filter available (non-disabled, non-hidden) commands
 */
export function filterAvailable(commands: Command[]): Command[] {
  return commands.filter(
    (cmd) => cmd.status !== "disabled" && cmd.status !== "hidden",
  );
}

// ============================================================================
// Sort Commands
// ============================================================================

/**
 * Sort commands by name alphabetically
 */
export function sortByName(commands: Command[]): Command[] {
  return [...commands].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sort commands by priority
 */
export function sortByPriority(commands: Command[]): Command[] {
  const priorityOrder = { high: 0, normal: 1, low: 2 };
  return [...commands].sort((a, b) => {
    const priorityA = priorityOrder[a.priority || "normal"];
    const priorityB = priorityOrder[b.priority || "normal"];
    return priorityA - priorityB;
  });
}

/**
 * Sort commands by recent usage
 */
export function sortByRecent(commands: Command[]): Command[] {
  return [...commands].sort((a, b) => {
    if (a.isRecent && !b.isRecent) return -1;
    if (!a.isRecent && b.isRecent) return 1;
    return 0;
  });
}

/**
 * Combined sort: recent first, then priority, then name
 */
export function sortCommands(commands: Command[]): Command[] {
  const priorityOrder = { high: 0, normal: 1, low: 2 };

  return [...commands].sort((a, b) => {
    // Recent commands first
    if (a.isRecent && !b.isRecent) return -1;
    if (!a.isRecent && b.isRecent) return 1;

    // Then by priority
    const priorityA = priorityOrder[a.priority || "normal"];
    const priorityB = priorityOrder[b.priority || "normal"];
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

// ============================================================================
// Highlight Matches
// ============================================================================

/**
 * Generate highlighted text segments based on matches
 */
export function getHighlightedSegments(
  text: string,
  matches: Array<{ start: number; end: number }>,
): Array<{ text: string; highlighted: boolean }> {
  if (matches.length === 0) {
    return [{ text, highlighted: false }];
  }

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const mergedMatches: Array<{ start: number; end: number }> = [];
  for (const match of sortedMatches) {
    if (mergedMatches.length === 0) {
      mergedMatches.push({ ...match });
    } else {
      const last = mergedMatches[mergedMatches.length - 1];
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end);
      } else {
        mergedMatches.push({ ...match });
      }
    }
  }

  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let currentIndex = 0;

  for (const match of mergedMatches) {
    // Add non-highlighted text before this match
    if (match.start > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, match.start),
        highlighted: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: text.slice(match.start, match.end),
      highlighted: true,
    });

    currentIndex = match.end;
  }

  // Add remaining non-highlighted text
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      highlighted: false,
    });
  }

  return segments;
}

// ============================================================================
// Quick Search Helpers
// ============================================================================

/**
 * Check if query matches a command prefix (for mode switching)
 * e.g., "#" for channels, "@" for users, ">" for actions
 */
export function detectQueryMode(query: string): {
  mode: CommandCategory | "all";
  cleanQuery: string;
} {
  const trimmed = query.trim();

  if (trimmed.startsWith("#")) {
    return { mode: "channel", cleanQuery: trimmed.slice(1).trim() };
  }
  if (trimmed.startsWith("@")) {
    return { mode: "user", cleanQuery: trimmed.slice(1).trim() };
  }
  if (trimmed.startsWith(">")) {
    return { mode: "action", cleanQuery: trimmed.slice(1).trim() };
  }
  if (trimmed.startsWith("/")) {
    return { mode: "action", cleanQuery: trimmed.slice(1).trim() };
  }
  if (trimmed.startsWith("?")) {
    return { mode: "search", cleanQuery: trimmed.slice(1).trim() };
  }

  return { mode: "all", cleanQuery: trimmed };
}

/**
 * Get search placeholder based on mode
 */
export function getSearchPlaceholder(mode: CommandCategory | "all"): string {
  switch (mode) {
    case "channel":
      return "Search channels...";
    case "dm":
      return "Search direct messages...";
    case "user":
      return "Search users...";
    case "action":
      return "Run a command...";
    case "search":
      return "Search messages...";
    case "settings":
      return "Search settings...";
    case "create":
      return "Create something...";
    default:
      return "Type a command or search...";
  }
}

export default {
  searchCommands,
  filterByCategory,
  filterByCategories,
  filterByStatus,
  filterAvailable,
  sortByName,
  sortByPriority,
  sortByRecent,
  sortCommands,
  getHighlightedSegments,
  detectQueryMode,
  getSearchPlaceholder,
};
