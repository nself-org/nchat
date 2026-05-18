"use client";

/**
 * useEmojiAutocomplete - Hook for emoji autocomplete functionality
 *
 * Provides autocomplete detection, suggestion generation, and selection
 * handling for :shortcode: style emoji input.
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useEmojiStore } from "@/stores/emoji-store";
import {
  detectAutocompleteTrigger,
  generateSuggestions,
  applyAutocompleteSuggestion,
} from "@/lib/emoji/emoji-autocomplete";
import type {
  AutocompleteSuggestion,
  AutocompleteOptions,
  UseEmojiAutocompleteReturn,
} from "@/lib/emoji/emoji-types";

// ============================================================================
// Hook Options
// ============================================================================

interface UseEmojiAutocompleteOptions extends AutocompleteOptions {
  /** Enable/disable autocomplete */
  enabled?: boolean;
  /** Callback when emoji is selected */
  onSelect?: (emoji: string, shortcode: string) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEmojiAutocomplete(
  options: UseEmojiAutocompleteOptions = {},
): UseEmojiAutocompleteReturn {
  const {
    enabled = true,
    minChars = 1,
    maxSuggestions = 8,
    debounceMs = 100,
    fuzzy = true,
    includeCustom = true,
    prioritizeRecent = true,
    onSelect,
  } = options;

  // Store state
  const autocomplete = useEmojiStore((state) => state.autocomplete);
  const customEmojis = useEmojiStore((state) => state.customEmojis);
  const recentEmojis = useEmojiStore((state) => state.recentEmojis);
  const showRecentFirst = useEmojiStore((state) => state.showRecentFirst);

  // Store actions
  const startAutocomplete = useEmojiStore((state) => state.startAutocomplete);
  const updateAutocomplete = useEmojiStore((state) => state.updateAutocomplete);
  const setAutocompleteIndex = useEmojiStore(
    (state) => state.setAutocompleteIndex,
  );
  const closeAutocomplete = useEmojiStore((state) => state.closeAutocomplete);
  const addRecentEmoji = useEmojiStore((state) => state.addRecentEmoji);

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized data
  const customEmojisArray = useMemo(
    () => Array.from(customEmojis.values()).filter((e) => e.enabled),
    [customEmojis],
  );

  const recentEmojisArray = useMemo(
    () => recentEmojis.map((r) => r.emoji),
    [recentEmojis],
  );

  /**
   * Handle text change to detect : trigger
   */
  const handleTextChange = useCallback(
    (text: string, cursorPosition: number) => {
      if (!enabled) {
        closeAutocomplete();
        return;
      }

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Detect trigger
      const trigger = detectAutocompleteTrigger(text, cursorPosition);

      if (!trigger || trigger.query.length < minChars) {
        closeAutocomplete();
        return;
      }

      // Debounce suggestion generation
      debounceRef.current = setTimeout(() => {
        const suggestions = generateSuggestions(
          trigger.query,
          {
            minChars,
            maxSuggestions,
            fuzzy,
            includeCustom,
            prioritizeRecent: prioritizeRecent && showRecentFirst,
          },
          customEmojisArray,
          recentEmojisArray,
        );

        if (suggestions.length > 0) {
          startAutocomplete(
            trigger.query,
            trigger.triggerPosition,
            cursorPosition,
          );
          updateAutocomplete(suggestions);
        } else {
          closeAutocomplete();
        }
      }, debounceMs);
    },
    [
      enabled,
      minChars,
      maxSuggestions,
      debounceMs,
      fuzzy,
      includeCustom,
      prioritizeRecent,
      showRecentFirst,
      customEmojisArray,
      recentEmojisArray,
      startAutocomplete,
      updateAutocomplete,
      closeAutocomplete,
    ],
  );

  /**
   * Select suggestion at specific index
   */
  const selectSuggestion = useCallback(
    (index: number) => {
      const suggestion = autocomplete.suggestions[index];
      if (!suggestion) return;

      // Track usage
      if (!suggestion.isCustom) {
        addRecentEmoji(suggestion.emoji);
      }

      // Notify
      onSelect?.(suggestion.emoji, suggestion.shortcode);

      // Close
      closeAutocomplete();
    },
    [autocomplete.suggestions, addRecentEmoji, onSelect, closeAutocomplete],
  );

  /**
   * Select currently highlighted suggestion
   */
  const selectCurrent = useCallback(() => {
    selectSuggestion(autocomplete.selectedIndex);
  }, [autocomplete.selectedIndex, selectSuggestion]);

  /**
   * Navigate up in suggestions
   */
  const navigateUp = useCallback(() => {
    if (!autocomplete.isActive || autocomplete.suggestions.length === 0) return;

    const newIndex =
      autocomplete.selectedIndex <= 0
        ? autocomplete.suggestions.length - 1
        : autocomplete.selectedIndex - 1;

    setAutocompleteIndex(newIndex);
  }, [
    autocomplete.isActive,
    autocomplete.suggestions.length,
    autocomplete.selectedIndex,
    setAutocompleteIndex,
  ]);

  /**
   * Navigate down in suggestions
   */
  const navigateDown = useCallback(() => {
    if (!autocomplete.isActive || autocomplete.suggestions.length === 0) return;

    const newIndex =
      autocomplete.selectedIndex >= autocomplete.suggestions.length - 1
        ? 0
        : autocomplete.selectedIndex + 1;

    setAutocompleteIndex(newIndex);
  }, [
    autocomplete.isActive,
    autocomplete.suggestions.length,
    autocomplete.selectedIndex,
    setAutocompleteIndex,
  ]);

  /**
   * Close autocomplete
   */
  const close = useCallback(() => {
    closeAutocomplete();
  }, [closeAutocomplete]);

  /**
   * Get replacement text for current selection
   */
  const getReplacementText = useCallback((): {
    text: string;
    cursorOffset: number;
  } | null => {
    const suggestion = autocomplete.suggestions[autocomplete.selectedIndex];
    if (!suggestion || !autocomplete.isActive) return null;

    // The emoji to insert
    const emoji = suggestion.isCustom ? suggestion.shortcode : suggestion.emoji;

    return {
      text: emoji,
      cursorOffset: emoji.length,
    };
  }, [
    autocomplete.isActive,
    autocomplete.selectedIndex,
    autocomplete.suggestions,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    isActive: autocomplete.isActive,
    query: autocomplete.query,
    suggestions: autocomplete.suggestions,
    selectedIndex: autocomplete.selectedIndex,
    handleTextChange,
    selectSuggestion,
    selectCurrent,
    navigateUp,
    navigateDown,
    close,
    getReplacementText,
  };
}

export default useEmojiAutocomplete;
