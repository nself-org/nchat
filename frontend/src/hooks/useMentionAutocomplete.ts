/**
 * useMentionAutocomplete Hook
 *
 * Hook for managing mention autocomplete state and behavior.
 * Can be used independently or with TipTap editor.
 *
 * @example
 * ```typescript
 * const {
 *   state,
 *   updateQuery,
 *   selectSuggestion,
 *   handleKeyDown,
 * } = useMentionAutocomplete({
 *   users,
 *   channels,
 *   onSelect: (suggestion) => insertMention(suggestion),
 * })
 * ```
 */

"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  filterMentionSuggestions,
  AUTOCOMPLETE_DEBOUNCE_MS,
  addRecentMention,
} from "@/lib/mentions/mention-autocomplete";
import { parseAutocompleteQuery } from "@/lib/mentions/mention-parser";
import type {
  MentionSuggestion,
  MentionableUser,
  MentionableChannel,
  MentionableRole,
  MentionPermissions,
  MentionAutocompleteState,
} from "@/lib/mentions/mention-types";
import { INITIAL_AUTOCOMPLETE_STATE } from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface UseMentionAutocompleteOptions {
  /** Available users for @mentions */
  users: MentionableUser[];
  /** Available channels for #mentions */
  channels: MentionableChannel[];
  /** Available roles for @role mentions */
  roles?: MentionableRole[];
  /** Current user's permissions */
  permissions?: MentionPermissions;
  /** Channel member IDs for prioritization */
  channelMemberIds?: Set<string>;
  /** Callback when a mention is selected */
  onSelect?: (suggestion: MentionSuggestion) => void;
  /** Whether autocomplete is enabled */
  enabled?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Max suggestions to show */
  maxSuggestions?: number;
}

export interface UseMentionAutocompleteReturn {
  /** Current autocomplete state */
  state: MentionAutocompleteState;
  /** Whether autocomplete is open */
  isOpen: boolean;
  /** Current suggestions */
  suggestions: MentionSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Current query */
  query: string;
  /** Current trigger ('@' or '#') */
  trigger: "@" | "#" | null;

  /** Update query for a given trigger */
  updateQuery: (trigger: "@" | "#", query: string) => void;
  /** Update query from text and cursor position */
  updateFromText: (text: string, cursorPosition: number) => void;
  /** Select a suggestion */
  selectSuggestion: (suggestion: MentionSuggestion) => void;
  /** Select the currently highlighted suggestion */
  confirmSelection: () => void;
  /** Move selection up/down */
  moveSelection: (direction: "up" | "down") => void;
  /** Set selected index directly */
  setSelectedIndex: (index: number) => void;
  /** Close the autocomplete */
  close: () => void;
  /** Open the autocomplete (if there's a valid query) */
  open: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Handle keyboard events (returns true if handled) */
  handleKeyDown: (event: KeyboardEvent | React.KeyboardEvent) => boolean;
}

// ============================================================================
// Default Permissions
// ============================================================================

const DEFAULT_PERMISSIONS: MentionPermissions = {
  canMentionUsers: true,
  canMentionChannels: true,
  canMentionEveryone: false,
  canMentionHere: false,
  canMentionChannel: false,
  canMentionRoles: false,
};

// ============================================================================
// Hook
// ============================================================================

export function useMentionAutocomplete({
  users,
  channels,
  roles = [],
  permissions = DEFAULT_PERMISSIONS,
  channelMemberIds,
  onSelect,
  enabled = true,
  debounceMs = AUTOCOMPLETE_DEBOUNCE_MS,
  maxSuggestions = 10,
}: UseMentionAutocompleteOptions): UseMentionAutocompleteReturn {
  const [state, setState] = useState<MentionAutocompleteState>(
    INITIAL_AUTOCOMPLETE_STATE,
  );

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>("");
  const lastCursorRef = useRef<number>(0);

  // Memoize the filter function
  const getFilteredSuggestions = useCallback(
    (trigger: "@" | "#", query: string) => {
      return filterMentionSuggestions({
        users: trigger === "@" ? users : [],
        channels: trigger === "#" ? channels : [],
        roles: trigger === "@" ? roles : [],
        permissions,
        trigger,
        query,
        maxSuggestions,
        prioritizeChannelMembers: true,
        channelMemberIds,
      });
    },
    [users, channels, roles, permissions, maxSuggestions, channelMemberIds],
  );

  // Update query directly
  const updateQuery = useCallback(
    (trigger: "@" | "#", query: string) => {
      if (!enabled) return;

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const suggestions = getFilteredSuggestions(trigger, query);

        setState((prev) => ({
          ...prev,
          isOpen: suggestions.length > 0 || query.length === 0,
          trigger,
          query,
          suggestions,
          selectedIndex: 0,
          isLoading: false,
          error: null,
        }));
      }, debounceMs);

      // Show loading state immediately
      setState((prev) => ({
        ...prev,
        isOpen: true,
        trigger,
        query,
        isLoading: true,
      }));
    },
    [enabled, getFilteredSuggestions, debounceMs],
  );

  // Update from text and cursor position
  const updateFromText = useCallback(
    (text: string, cursorPosition: number) => {
      if (!enabled) {
        setState(INITIAL_AUTOCOMPLETE_STATE);
        return;
      }

      lastTextRef.current = text;
      lastCursorRef.current = cursorPosition;

      const queryInfo = parseAutocompleteQuery(text, cursorPosition);

      if (!queryInfo) {
        setState((prev) => ({
          ...prev,
          isOpen: false,
          trigger: null,
          query: "",
          suggestions: [],
          selectedIndex: 0,
        }));
        return;
      }

      updateQuery(queryInfo.trigger, queryInfo.query);
    },
    [enabled, updateQuery],
  );

  // Select a suggestion
  const selectSuggestion = useCallback(
    (suggestion: MentionSuggestion) => {
      // Track recent mention
      if (suggestion.type === "user") {
        const user = suggestion.data as MentionableUser;
        addRecentMention(user.username);
      }

      onSelect?.(suggestion);

      // Reset state
      setState(INITIAL_AUTOCOMPLETE_STATE);
    },
    [onSelect],
  );

  // Confirm current selection
  const confirmSelection = useCallback(() => {
    const suggestion = state.suggestions[state.selectedIndex];
    if (suggestion) {
      selectSuggestion(suggestion);
    }
  }, [state.suggestions, state.selectedIndex, selectSuggestion]);

  // Move selection
  const moveSelection = useCallback((direction: "up" | "down") => {
    setState((prev) => {
      if (prev.suggestions.length === 0) return prev;

      let newIndex: number;
      if (direction === "up") {
        newIndex =
          prev.selectedIndex <= 0
            ? prev.suggestions.length - 1
            : prev.selectedIndex - 1;
      } else {
        newIndex =
          prev.selectedIndex >= prev.suggestions.length - 1
            ? 0
            : prev.selectedIndex + 1;
      }

      return { ...prev, selectedIndex: newIndex };
    });
  }, []);

  // Set selected index
  const setSelectedIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(0, Math.min(index, prev.suggestions.length - 1)),
    }));
  }, []);

  // Close autocomplete
  const close = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Open autocomplete
  const open = useCallback(() => {
    // Re-parse from last known text/cursor
    if (lastTextRef.current && lastCursorRef.current > 0) {
      updateFromText(lastTextRef.current, lastCursorRef.current);
    }
  }, [updateFromText]);

  // Reset to initial state
  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setState(INITIAL_AUTOCOMPLETE_STATE);
    lastTextRef.current = "";
    lastCursorRef.current = 0;
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent): boolean => {
      if (!state.isOpen || state.suggestions.length === 0) {
        return false;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveSelection("down");
          return true;

        case "ArrowUp":
          event.preventDefault();
          moveSelection("up");
          return true;

        case "Tab":
        case "Enter":
          if (state.suggestions[state.selectedIndex]) {
            event.preventDefault();
            confirmSelection();
            return true;
          }
          return false;

        case "Escape":
          event.preventDefault();
          close();
          return true;

        default:
          return false;
      }
    },
    [
      state.isOpen,
      state.suggestions,
      state.selectedIndex,
      moveSelection,
      confirmSelection,
      close,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    state,
    isOpen: state.isOpen,
    suggestions: state.suggestions,
    selectedIndex: state.selectedIndex,
    query: state.query,
    trigger: state.trigger,

    updateQuery,
    updateFromText,
    selectSuggestion,
    confirmSelection,
    moveSelection,
    setSelectedIndex,
    close,
    open,
    reset,
    handleKeyDown,
  };
}

export default useMentionAutocomplete;
