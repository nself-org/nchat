/**
 * Emoji Autocomplete - Autocomplete logic for emoji input
 *
 * This module handles the detection and completion of :shortcode: patterns
 * in text input, providing suggestions as users type.
 */

import { quickSearch, searchEmojisWithCustom } from "./emoji-search";
import { getShortcodeSuggestions } from "./emoji-shortcodes";
import type {
  AutocompleteSuggestion,
  AutocompleteState,
  AutocompleteOptions,
  CustomEmoji,
} from "./emoji-types";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_AUTOCOMPLETE_OPTIONS: Required<AutocompleteOptions> = {
  minChars: 1,
  maxSuggestions: 8,
  debounceMs: 100,
  fuzzy: true,
  includeCustom: true,
  prioritizeRecent: true,
};

// ============================================================================
// Autocomplete State Management
// ============================================================================

/**
 * Initial autocomplete state
 */
export const INITIAL_AUTOCOMPLETE_STATE: AutocompleteState = {
  isActive: false,
  query: "",
  suggestions: [],
  selectedIndex: 0,
  triggerPosition: -1,
  cursorPosition: -1,
};

/**
 * Create a new autocomplete state with updates
 */
export function updateAutocompleteState(
  state: AutocompleteState,
  updates: Partial<AutocompleteState>,
): AutocompleteState {
  return { ...state, ...updates };
}

// ============================================================================
// Trigger Detection
// ============================================================================

/**
 * Detect if autocomplete should be triggered
 *
 * @param text - The full text content
 * @param cursorPosition - Current cursor position
 * @returns Trigger information or null
 */
export function detectAutocompleteTrigger(
  text: string,
  cursorPosition: number,
): { query: string; triggerPosition: number } | null {
  // Find the position of the last colon before cursor
  let colonPosition = -1;

  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];

    // Stop at whitespace or newline
    if (char === " " || char === "\n" || char === "\t") {
      break;
    }

    // Found a colon
    if (char === ":") {
      colonPosition = i;
      break;
    }

    // Stop at another colon (already completed shortcode)
    if (i > 0 && text[i - 1] === ":") {
      break;
    }
  }

  if (colonPosition === -1) {
    return null;
  }

  // Extract the query (text between colon and cursor)
  const query = text.slice(colonPosition + 1, cursorPosition);

  // Validate query (alphanumeric, underscore, plus, minus)
  if (!/^[a-zA-Z0-9_+-]*$/.test(query)) {
    return null;
  }

  return {
    query,
    triggerPosition: colonPosition,
  };
}

/**
 * Check if cursor is within a shortcode
 *
 * @param text - The full text content
 * @param cursorPosition - Current cursor position
 * @returns Whether cursor is in a potential shortcode
 */
export function isCursorInShortcode(
  text: string,
  cursorPosition: number,
): boolean {
  const trigger = detectAutocompleteTrigger(text, cursorPosition);
  return trigger !== null && trigger.query.length > 0;
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Generate autocomplete suggestions
 *
 * @param query - The search query (text after :)
 * @param options - Autocomplete options
 * @param customEmojis - Optional custom emojis to include
 * @param recentEmojis - Optional recent emojis for prioritization
 * @returns Array of suggestions
 */
export function generateSuggestions(
  query: string,
  options: AutocompleteOptions = {},
  customEmojis: CustomEmoji[] = [],
  recentEmojis: string[] = [],
): AutocompleteSuggestion[] {
  const opts = { ...DEFAULT_AUTOCOMPLETE_OPTIONS, ...options };

  if (query.length < opts.minChars) {
    return [];
  }

  const suggestions: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  // First, add matching recent emojis if prioritizing
  if (opts.prioritizeRecent && recentEmojis.length > 0) {
    const recentMatches = getShortcodeSuggestions(query, {
      limit: 3,
      includeAliases: true,
    }).filter((s) => recentEmojis.includes(s.emoji));

    for (const match of recentMatches) {
      if (!seen.has(match.emoji)) {
        seen.add(match.emoji);
        suggestions.push({
          id: `recent-${match.shortcode}`,
          emoji: match.emoji,
          shortcode: `:${match.shortcode}:`,
          isCustom: false,
          displayName: match.displayName,
          preview: `${match.emoji} :${match.shortcode}:`,
        });
      }
    }
  }

  // Add matching custom emojis
  if (opts.includeCustom && customEmojis.length > 0) {
    const enabledCustom = customEmojis.filter((e) => e.enabled);
    const q = query.toLowerCase();

    for (const emoji of enabledCustom) {
      if (
        emoji.name.toLowerCase().includes(q) ||
        emoji.aliases.some((a) => a.toLowerCase().includes(q))
      ) {
        if (!seen.has(emoji.shortcode)) {
          seen.add(emoji.shortcode);
          suggestions.push({
            id: `custom-${emoji.id}`,
            emoji: emoji.url,
            shortcode: emoji.shortcode,
            isCustom: true,
            displayName: emoji.name,
            preview: emoji.shortcode,
          });
        }

        if (suggestions.length >= opts.maxSuggestions) {
          return suggestions;
        }
      }
    }
  }

  // Add standard emoji suggestions
  const standardSuggestions = getShortcodeSuggestions(query, {
    limit: opts.maxSuggestions - suggestions.length,
    includeAliases: true,
    prioritizeExact: true,
  });

  for (const suggestion of standardSuggestions) {
    if (!seen.has(suggestion.emoji)) {
      seen.add(suggestion.emoji);
      suggestions.push({
        id: `emoji-${suggestion.shortcode}`,
        emoji: suggestion.emoji,
        shortcode: `:${suggestion.shortcode}:`,
        isCustom: false,
        displayName: suggestion.displayName,
        preview: `${suggestion.emoji} :${suggestion.shortcode}:`,
      });
    }

    if (suggestions.length >= opts.maxSuggestions) {
      break;
    }
  }

  return suggestions;
}

/**
 * Generate quick suggestions (optimized for speed)
 *
 * @param query - The search query
 * @param limit - Maximum suggestions
 * @returns Array of quick suggestions
 */
export function generateQuickSuggestions(
  query: string,
  limit: number = 6,
): AutocompleteSuggestion[] {
  if (!query) return [];

  const results = quickSearch(query, limit);

  return results.map((result, index) => ({
    id: `quick-${index}-${result.shortcode}`,
    emoji: result.emoji,
    shortcode: `:${result.shortcode}:`,
    isCustom: false,
    displayName: result.name,
    preview: `${result.emoji} :${result.shortcode}:`,
  }));
}

// ============================================================================
// Text Replacement
// ============================================================================

/**
 * Get the replacement text for an autocomplete selection
 *
 * @param text - Original text
 * @param triggerPosition - Position of the : trigger
 * @param cursorPosition - Current cursor position
 * @param emoji - The emoji to insert (character or URL for custom)
 * @param isCustom - Whether this is a custom emoji
 * @returns New text and cursor offset
 */
export function getReplacementText(
  text: string,
  triggerPosition: number,
  cursorPosition: number,
  emoji: string,
  isCustom: boolean = false,
): { text: string; cursorOffset: number } {
  const before = text.slice(0, triggerPosition);
  const after = text.slice(cursorPosition);

  // For custom emojis, we might want to keep the shortcode
  // For now, insert the emoji character
  const newText = `${before}${emoji}${after}`;

  // Position cursor after the inserted emoji
  const cursorOffset = before.length + emoji.length;

  return { text: newText, cursorOffset };
}

/**
 * Apply autocomplete selection to text
 *
 * @param text - Original text
 * @param state - Current autocomplete state
 * @param suggestion - Selected suggestion
 * @returns Updated text and new cursor position
 */
export function applyAutocompleteSuggestion(
  text: string,
  state: AutocompleteState,
  suggestion: AutocompleteSuggestion,
): { text: string; cursorPosition: number } {
  const { triggerPosition, cursorPosition } = state;

  // Use emoji character for standard emojis
  const insertText = suggestion.isCustom
    ? suggestion.shortcode // Keep shortcode for custom emojis
    : suggestion.emoji;

  const result = getReplacementText(
    text,
    triggerPosition,
    cursorPosition,
    insertText,
    suggestion.isCustom,
  );

  return {
    text: result.text,
    cursorPosition: result.cursorOffset,
  };
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Navigate selection up in suggestions
 */
export function navigateUp(state: AutocompleteState): AutocompleteState {
  if (!state.isActive || state.suggestions.length === 0) {
    return state;
  }

  const newIndex =
    state.selectedIndex <= 0
      ? state.suggestions.length - 1
      : state.selectedIndex - 1;

  return { ...state, selectedIndex: newIndex };
}

/**
 * Navigate selection down in suggestions
 */
export function navigateDown(state: AutocompleteState): AutocompleteState {
  if (!state.isActive || state.suggestions.length === 0) {
    return state;
  }

  const newIndex =
    state.selectedIndex >= state.suggestions.length - 1
      ? 0
      : state.selectedIndex + 1;

  return { ...state, selectedIndex: newIndex };
}

/**
 * Get currently selected suggestion
 */
export function getSelectedSuggestion(
  state: AutocompleteState,
): AutocompleteSuggestion | null {
  if (!state.isActive || state.suggestions.length === 0) {
    return null;
  }

  return state.suggestions[state.selectedIndex] ?? null;
}

// ============================================================================
// Autocomplete Controller
// ============================================================================

/**
 * Create an autocomplete controller for managing state
 */
export function createAutocompleteController(
  options: AutocompleteOptions = {},
) {
  const opts = { ...DEFAULT_AUTOCOMPLETE_OPTIONS, ...options };
  let state = { ...INITIAL_AUTOCOMPLETE_STATE };
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    /**
     * Get current state
     */
    getState(): AutocompleteState {
      return state;
    },

    /**
     * Handle text change
     */
    handleTextChange(
      text: string,
      cursorPosition: number,
      customEmojis: CustomEmoji[] = [],
      recentEmojis: string[] = [],
    ): void {
      // Clear existing debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Detect trigger
      const trigger = detectAutocompleteTrigger(text, cursorPosition);

      if (!trigger) {
        state = { ...INITIAL_AUTOCOMPLETE_STATE };
        return;
      }

      // Debounce suggestion generation
      debounceTimer = setTimeout(() => {
        const suggestions = generateSuggestions(
          trigger.query,
          opts,
          customEmojis,
          recentEmojis,
        );

        state = {
          isActive: suggestions.length > 0,
          query: trigger.query,
          suggestions,
          selectedIndex: 0,
          triggerPosition: trigger.triggerPosition,
          cursorPosition,
        };
      }, opts.debounceMs);

      // Immediately update position info
      state = {
        ...state,
        query: trigger.query,
        triggerPosition: trigger.triggerPosition,
        cursorPosition,
      };
    },

    /**
     * Navigate up
     */
    navigateUp(): void {
      state = navigateUp(state);
    },

    /**
     * Navigate down
     */
    navigateDown(): void {
      state = navigateDown(state);
    },

    /**
     * Select current suggestion
     */
    selectCurrent(
      text: string,
    ): { text: string; cursorPosition: number } | null {
      const suggestion = getSelectedSuggestion(state);
      if (!suggestion) return null;

      const result = applyAutocompleteSuggestion(text, state, suggestion);
      state = { ...INITIAL_AUTOCOMPLETE_STATE };
      return result;
    },

    /**
     * Select suggestion at index
     */
    selectAtIndex(
      text: string,
      index: number,
    ): { text: string; cursorPosition: number } | null {
      if (index < 0 || index >= state.suggestions.length) return null;

      const suggestion = state.suggestions[index];
      const result = applyAutocompleteSuggestion(text, state, suggestion);
      state = { ...INITIAL_AUTOCOMPLETE_STATE };
      return result;
    },

    /**
     * Close autocomplete
     */
    close(): void {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      state = { ...INITIAL_AUTOCOMPLETE_STATE };
    },

    /**
     * Reset state
     */
    reset(): void {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      state = { ...INITIAL_AUTOCOMPLETE_STATE };
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if key should trigger autocomplete action
 */
export function isAutocompleteKey(key: string): boolean {
  return ["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(key);
}

/**
 * Handle autocomplete keyboard event
 *
 * @param key - The key pressed
 * @param state - Current autocomplete state
 * @param text - Current text
 * @returns Action result or null
 */
export function handleAutocompleteKey(
  key: string,
  state: AutocompleteState,
  text: string,
):
  | { action: "navigate"; state: AutocompleteState }
  | { action: "select"; text: string; cursorPosition: number }
  | { action: "close" }
  | null {
  if (!state.isActive) return null;

  switch (key) {
    case "ArrowUp":
      return { action: "navigate", state: navigateUp(state) };

    case "ArrowDown":
      return { action: "navigate", state: navigateDown(state) };

    case "Enter":
    case "Tab": {
      const suggestion = getSelectedSuggestion(state);
      if (suggestion) {
        const result = applyAutocompleteSuggestion(text, state, suggestion);
        return { action: "select", ...result };
      }
      return null;
    }

    case "Escape":
      return { action: "close" };

    default:
      return null;
  }
}
