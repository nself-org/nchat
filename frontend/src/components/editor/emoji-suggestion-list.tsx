/**
 * EmojiSuggestionList Component
 *
 * Autocomplete dropdown for :emoji: shortcodes showing:
 * - Emoji character
 * - Shortcode
 * - Emoji name
 * - Keyboard navigation support
 */

"use client";

import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EmojiSuggestion } from "./editor-extensions";

// ============================================================================
// Types
// ============================================================================

export interface EmojiSuggestionListProps {
  /** List of matching emojis */
  items: EmojiSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when an item is selected */
  onSelect: (item: EmojiSuggestion) => void;
  /** Callback when selection index changes */
  onSelectionChange?: (index: number) => void;
  /** Additional CSS class */
  className?: string;
}

export interface EmojiSuggestionListRef {
  /** Move selection up */
  upHandler: () => void;
  /** Move selection down */
  downHandler: () => void;
  /** Select current item */
  enterHandler: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const EmojiSuggestionList = forwardRef<
  EmojiSuggestionListRef,
  EmojiSuggestionListProps
>(function EmojiSuggestionList(
  { items, selectedIndex, onSelect, onSelectionChange, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Expose handlers to parent
  useImperativeHandle(ref, () => ({
    upHandler: () => {
      const newIndex =
        selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
      onSelectionChange?.(newIndex);
    },
    downHandler: () => {
      const newIndex =
        selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1;
      onSelectionChange?.(newIndex);
    },
    enterHandler: () => {
      const item = items[selectedIndex];
      if (item) {
        onSelect(item);
      }
    },
  }));

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current.get(selectedIndex);
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border bg-popover p-3 text-sm text-muted-foreground shadow-md",
          className,
        )}
      >
        No emojis found
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
        <div className="p-1">
          {items.map((item, index) => (
            <EmojiSuggestionListItem
              key={item.shortcode}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(index, el);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              emoji={item}
              isSelected={index === selectedIndex}
              onClick={() => onSelect(item)}
              onMouseEnter={() => onSelectionChange?.(index)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

// ============================================================================
// EmojiSuggestionListItem Component
// ============================================================================

interface EmojiSuggestionListItemProps {
  emoji: EmojiSuggestion;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const EmojiSuggestionListItem = forwardRef<
  HTMLButtonElement,
  EmojiSuggestionListItemProps
>(function EmojiSuggestionListItem(
  { emoji, isSelected, onClick, onMouseEnter },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
        isSelected ? "text-accent-foreground bg-accent" : "hover:bg-accent/50",
      )}
    >
      {/* Emoji character */}
      <span
        className="text-2xl leading-none"
        role="img"
        aria-label={emoji.name}
      >
        {emoji.emoji}
      </span>

      {/* Emoji info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">:{emoji.shortcode}:</div>
        <div className="truncate text-xs text-muted-foreground">
          {emoji.name}
        </div>
      </div>
    </button>
  );
});

// ============================================================================
// Standalone Emoji Suggestion Popup
// ============================================================================

export interface EmojiSuggestionPopupProps {
  /** Whether the popup is open */
  isOpen: boolean;
  /** List of matching emojis */
  items: EmojiSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when an item is selected */
  onSelect: (item: EmojiSuggestion) => void;
  /** Callback when selection index changes */
  onSelectionChange: (index: number) => void;
  /** Position for the popup */
  position?: { top: number; left: number };
  /** Additional CSS class */
  className?: string;
}

export function EmojiSuggestionPopup({
  isOpen,
  items,
  selectedIndex,
  onSelect,
  onSelectionChange,
  position,
  className,
}: EmojiSuggestionPopupProps) {
  if (!isOpen) return null;

  const style = position
    ? {
        position: "fixed" as const,
        top: position.top,
        left: position.left,
        zIndex: 50,
      }
    : undefined;

  return (
    <div style={style} className={className}>
      <EmojiSuggestionList
        items={items}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
}

// ============================================================================
// Emoji Grid Component (Alternative Layout)
// ============================================================================

export interface EmojiGridProps {
  /** List of emojis */
  items: EmojiSuggestion[];
  /** Callback when an emoji is selected */
  onSelect: (item: EmojiSuggestion) => void;
  /** Number of columns */
  columns?: number;
  /** Additional CSS class */
  className?: string;
}

export function EmojiGrid({
  items,
  onSelect,
  columns = 8,
  className,
}: EmojiGridProps) {
  return (
    <div
      className={cn("grid gap-1 p-2", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {items.map((emoji) => (
        <button
          key={emoji.shortcode}
          type="button"
          onClick={() => onSelect(emoji)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-xl transition-colors",
            "hover:bg-accent focus:bg-accent focus:outline-none",
          )}
          title={`:${emoji.shortcode}: - ${emoji.name}`}
        >
          <span role="img" aria-label={emoji.name}>
            {emoji.emoji}
          </span>
        </button>
      ))}
    </div>
  );
}

export default EmojiSuggestionList;
