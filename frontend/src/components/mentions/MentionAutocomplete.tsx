/**
 * MentionAutocomplete Component
 *
 * Main autocomplete component that wraps a text input
 * and provides mention suggestions as user types.
 */

"use client";

import * as React from "react";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";
import {
  MentionSuggestions,
  type MentionSuggestionsRef,
} from "./MentionSuggestions";
import {
  filterMentionSuggestions,
  AUTOCOMPLETE_DEBOUNCE_MS,
} from "@/lib/mentions/mention-autocomplete";
import { parseAutocompleteQuery } from "@/lib/mentions/mention-parser";
import type {
  MentionSuggestion,
  MentionableUser,
  MentionableChannel,
  MentionPermissions,
  MentionAutocompleteState,
} from "@/lib/mentions/mention-types";
import { INITIAL_AUTOCOMPLETE_STATE } from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface MentionAutocompleteProps {
  /** Available users for @mentions */
  users: MentionableUser[];
  /** Available channels for #mentions */
  channels: MentionableChannel[];
  /** Current user's permissions */
  permissions?: MentionPermissions;
  /** Channel member IDs for prioritization */
  channelMemberIds?: Set<string>;
  /** Callback when a mention is selected */
  onSelect: (
    suggestion: MentionSuggestion,
    replacement: { start: number; end: number },
  ) => void;
  /** Current text value */
  value: string;
  /** Current cursor position */
  cursorPosition: number;
  /** Element to position suggestions relative to */
  anchorElement?: HTMLElement | null;
  /** Whether autocomplete is enabled */
  enabled?: boolean;
  /** Additional class for suggestions dropdown */
  suggestionsClassName?: string;
}

export interface MentionAutocompleteRef {
  /** Close the autocomplete dropdown */
  close: () => void;
  /** Open the autocomplete dropdown */
  open: () => void;
  /** Check if autocomplete is open */
  isOpen: () => boolean;
  /** Handle keyboard event (returns true if handled) */
  handleKeyDown: (event: KeyboardEvent) => boolean;
}

// ============================================================================
// Component
// ============================================================================

export const MentionAutocomplete = forwardRef<
  MentionAutocompleteRef,
  MentionAutocompleteProps
>(function MentionAutocomplete(
  {
    users,
    channels,
    permissions = {
      canMentionUsers: true,
      canMentionChannels: true,
      canMentionEveryone: false,
      canMentionHere: false,
      canMentionChannel: false,
      canMentionRoles: false,
    },
    channelMemberIds,
    onSelect,
    value,
    cursorPosition,
    anchorElement,
    enabled = true,
    suggestionsClassName,
  },
  ref,
) {
  const [state, setState] = useState<MentionAutocompleteState>(
    INITIAL_AUTOCOMPLETE_STATE,
  );
  const suggestionsRef = useRef<MentionSuggestionsRef>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Parse query from current cursor position
  useEffect(() => {
    if (!enabled) {
      setState(INITIAL_AUTOCOMPLETE_STATE);
      return;
    }

    // Debounce the query parsing
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const queryInfo = parseAutocompleteQuery(value, cursorPosition);

      if (!queryInfo) {
        setState((prev) => ({
          ...prev,
          isOpen: false,
          query: "",
          trigger: null,
          suggestions: [],
          selectedIndex: 0,
        }));
        return;
      }

      // Get suggestions based on trigger
      // When parseAutocompleteQuery returns non-null, trigger is always '@' or '#'
      const trigger = queryInfo.trigger as "@" | "#";
      const suggestions = filterMentionSuggestions({
        users: trigger === "@" ? users : [],
        channels: trigger === "#" ? channels : [],
        permissions,
        trigger,
        query: queryInfo.query,
        maxSuggestions: 10,
        prioritizeChannelMembers: true,
        channelMemberIds,
      });

      setState((prev) => ({
        ...prev,
        isOpen: suggestions.length > 0 || queryInfo.query.length === 0,
        query: queryInfo.query,
        trigger,
        suggestions,
        selectedIndex: 0,
        position: calculatePosition(anchorElement),
      }));
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    value,
    cursorPosition,
    users,
    channels,
    permissions,
    channelMemberIds,
    enabled,
    anchorElement,
  ]);

  // Handle selection
  const handleSelect = useCallback(
    (suggestion: MentionSuggestion) => {
      const queryInfo = parseAutocompleteQuery(value, cursorPosition);
      if (!queryInfo) return;

      onSelect(suggestion, {
        start: queryInfo.start,
        end: cursorPosition,
      });

      setState((prev) => ({
        ...prev,
        isOpen: false,
        query: "",
        trigger: null,
        suggestions: [],
        selectedIndex: 0,
      }));
    },
    [value, cursorPosition, onSelect],
  );

  // Handle selection index change
  const handleSelectionChange = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: index,
    }));
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (!state.isOpen || state.suggestions.length === 0) {
        return false;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          suggestionsRef.current?.downHandler();
          return true;

        case "ArrowUp":
          event.preventDefault();
          suggestionsRef.current?.upHandler();
          return true;

        case "Tab":
        case "Enter":
          if (state.suggestions[state.selectedIndex]) {
            event.preventDefault();
            suggestionsRef.current?.enterHandler();
            return true;
          }
          return false;

        case "Escape":
          event.preventDefault();
          setState((prev) => ({
            ...prev,
            isOpen: false,
          }));
          return true;

        default:
          return false;
      }
    },
    [state.isOpen, state.suggestions, state.selectedIndex],
  );

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      close: () => {
        setState((prev) => ({
          ...prev,
          isOpen: false,
        }));
      },
      open: () => {
        // Trigger a re-parse by updating state
        const queryInfo = parseAutocompleteQuery(value, cursorPosition);
        if (queryInfo && queryInfo.trigger) {
          const trigger = queryInfo.trigger as "@" | "#";
          const suggestions = filterMentionSuggestions({
            users: trigger === "@" ? users : [],
            channels: trigger === "#" ? channels : [],
            permissions,
            trigger,
            query: queryInfo.query,
            maxSuggestions: 10,
            prioritizeChannelMembers: true,
            channelMemberIds,
          });
          setState((prev) => ({
            ...prev,
            isOpen: true,
            suggestions,
            position: calculatePosition(anchorElement),
          }));
        }
      },
      isOpen: () => state.isOpen,
      handleKeyDown,
    }),
    [
      value,
      cursorPosition,
      users,
      channels,
      permissions,
      channelMemberIds,
      anchorElement,
      state.isOpen,
      handleKeyDown,
    ],
  );

  // Don't render if not open
  if (!state.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed z-50"
      style={{
        top: state.position?.top ?? 0,
        left: state.position?.left ?? 0,
      }}
    >
      <MentionSuggestions
        ref={suggestionsRef}
        suggestions={state.suggestions}
        selectedIndex={state.selectedIndex}
        onSelect={handleSelect}
        onSelectionChange={handleSelectionChange}
        isLoading={state.isLoading}
        error={state.error}
        emptyMessage={
          state.trigger === "@" ? "No users found" : "No channels found"
        }
        className={suggestionsClassName}
      />
    </div>
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate position for the suggestions dropdown
 */
function calculatePosition(
  anchorElement?: HTMLElement | null,
): { top: number; left: number } | null {
  if (!anchorElement) {
    return null;
  }

  const rect = anchorElement.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  // Position above the anchor by default
  return {
    top: rect.top + scrollTop - 8, // 8px gap
    left: rect.left + scrollLeft,
  };
}

// ============================================================================
// Standalone Hook for TipTap Integration
// ============================================================================

export interface UseMentionAutocompleteOptions {
  users: MentionableUser[];
  channels: MentionableChannel[];
  permissions?: MentionPermissions;
  channelMemberIds?: Set<string>;
  onSelect?: (suggestion: MentionSuggestion) => void;
}

export function useMentionAutocomplete({
  users,
  channels,
  permissions = {
    canMentionUsers: true,
    canMentionChannels: true,
    canMentionEveryone: false,
    canMentionHere: false,
    canMentionChannel: false,
    canMentionRoles: false,
  },
  channelMemberIds,
  onSelect,
}: UseMentionAutocompleteOptions) {
  const [state, setState] = useState<MentionAutocompleteState>(
    INITIAL_AUTOCOMPLETE_STATE,
  );

  const updateQuery = useCallback(
    (trigger: "@" | "#", query: string) => {
      const suggestions = filterMentionSuggestions({
        users: trigger === "@" ? users : [],
        channels: trigger === "#" ? channels : [],
        permissions,
        trigger,
        query,
        maxSuggestions: 10,
        prioritizeChannelMembers: true,
        channelMemberIds,
      });

      setState((prev) => ({
        ...prev,
        isOpen: true,
        trigger,
        query,
        suggestions,
        selectedIndex: 0,
      }));
    },
    [users, channels, permissions, channelMemberIds],
  );

  const selectSuggestion = useCallback(
    (suggestion: MentionSuggestion) => {
      onSelect?.(suggestion);
      setState(INITIAL_AUTOCOMPLETE_STATE);
    },
    [onSelect],
  );

  const close = useCallback(() => {
    setState(INITIAL_AUTOCOMPLETE_STATE);
  }, []);

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

  const confirmSelection = useCallback(() => {
    const suggestion = state.suggestions[state.selectedIndex];
    if (suggestion) {
      selectSuggestion(suggestion);
    }
  }, [state.suggestions, state.selectedIndex, selectSuggestion]);

  return {
    state,
    updateQuery,
    selectSuggestion,
    close,
    moveSelection,
    confirmSelection,
    isOpen: state.isOpen,
    suggestions: state.suggestions,
    selectedIndex: state.selectedIndex,
  };
}

export default MentionAutocomplete;
