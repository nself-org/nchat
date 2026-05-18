/**
 * MentionSuggestions Component
 *
 * Dropdown list of mention suggestions for autocomplete.
 * Supports keyboard navigation and mouse interaction.
 */

"use client";

import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MentionItem } from "./MentionItem";
import type { MentionSuggestion } from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface MentionSuggestionsProps {
  /** List of suggestions to display */
  suggestions: MentionSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: MentionSuggestion) => void;
  /** Callback when selection index changes */
  onSelectionChange?: (index: number) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional CSS class */
  className?: string;
}

export interface MentionSuggestionsRef {
  /** Navigate up in the list */
  upHandler: () => void;
  /** Navigate down in the list */
  downHandler: () => void;
  /** Select current item */
  enterHandler: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const MentionSuggestions = forwardRef<
  MentionSuggestionsRef,
  MentionSuggestionsProps
>(function MentionSuggestions(
  {
    suggestions,
    selectedIndex,
    onSelect,
    onSelectionChange,
    isLoading = false,
    error = null,
    emptyMessage = "No results found",
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Expose navigation handlers to parent
  useImperativeHandle(
    ref,
    () => ({
      upHandler: () => {
        const newIndex =
          selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
        onSelectionChange?.(newIndex);
      },
      downHandler: () => {
        const newIndex =
          selectedIndex >= suggestions.length - 1 ? 0 : selectedIndex + 1;
        onSelectionChange?.(newIndex);
      },
      enterHandler: () => {
        const suggestion = suggestions[selectedIndex];
        if (suggestion) {
          onSelect(suggestion);
        }
      },
    }),
    [suggestions, selectedIndex, onSelect, onSelectionChange],
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current.get(selectedIndex);
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn("rounded-lg border bg-popover p-3 shadow-md", className)}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner />
          <span>Loading suggestions...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn("rounded-lg border bg-popover p-3 shadow-md", className)}
      >
        <div className="flex items-center gap-2 text-sm text-destructive">
          <ErrorIcon />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border bg-popover p-3 text-sm text-muted-foreground shadow-md",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-lg border bg-popover shadow-md",
        className,
      )}
    >
      <ScrollArea className="max-h-[300px]">
        <div className="p-1" role="listbox" aria-label="Mention suggestions">
          {suggestions.map((suggestion, index) => (
            <MentionItem
              key={`${suggestion.type}-${suggestion.id}`}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(index, el);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              suggestion={suggestion}
              isSelected={index === selectedIndex}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => onSelectionChange?.(index)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Keyboard hint */}
      <div className="flex items-center gap-3 border-t px-3 py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            Tab
          </kbd>
          <span>select</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            Esc
          </kbd>
          <span>close</span>
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// Loading Spinner
// ============================================================================

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Error Icon
// ============================================================================

function ErrorIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ============================================================================
// Grouped Suggestions Component
// ============================================================================

export interface GroupedMentionSuggestionsProps extends Omit<
  MentionSuggestionsProps,
  "suggestions"
> {
  /** Users to show */
  users?: MentionSuggestion[];
  /** Channels to show */
  channels?: MentionSuggestion[];
  /** Groups to show (@everyone, @here) */
  groups?: MentionSuggestion[];
  /** Roles to show */
  roles?: MentionSuggestion[];
}

export const GroupedMentionSuggestions = forwardRef<
  MentionSuggestionsRef,
  GroupedMentionSuggestionsProps
>(function GroupedMentionSuggestions(
  {
    users = [],
    channels = [],
    groups = [],
    roles = [],
    selectedIndex,
    onSelect,
    onSelectionChange,
    isLoading,
    error,
    emptyMessage,
    className,
  },
  ref,
) {
  // Flatten all suggestions maintaining order
  const allSuggestions = [...groups, ...users, ...channels, ...roles];

  return (
    <MentionSuggestions
      ref={ref}
      suggestions={allSuggestions}
      selectedIndex={selectedIndex}
      onSelect={onSelect}
      onSelectionChange={onSelectionChange}
      isLoading={isLoading}
      error={error}
      emptyMessage={emptyMessage}
      className={className}
    />
  );
});

// ============================================================================
// Floating Suggestions (positioned)
// ============================================================================

export interface FloatingMentionSuggestionsProps extends MentionSuggestionsProps {
  /** Position for the floating container */
  position: { top: number; left: number } | null;
  /** Whether the suggestions are visible */
  isVisible: boolean;
}

export const FloatingMentionSuggestions = forwardRef<
  MentionSuggestionsRef,
  FloatingMentionSuggestionsProps
>(function FloatingMentionSuggestions(
  { position, isVisible, className, ...props },
  ref,
) {
  if (!isVisible || !position) {
    return null;
  }

  return (
    <div
      className="fixed z-50"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <MentionSuggestions ref={ref} className={className} {...props} />
    </div>
  );
});

export default MentionSuggestions;
