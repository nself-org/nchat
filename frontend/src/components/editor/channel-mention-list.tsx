/**
 * ChannelMentionList Component
 *
 * Autocomplete dropdown for #channel mentions showing:
 * - Channel icon
 * - Channel name
 * - Channel type indicator
 * - Keyboard navigation support
 */

"use client";

import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Hash, Lock, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MentionChannel } from "./editor-extensions";

// ============================================================================
// Types
// ============================================================================

export interface ChannelMentionListProps {
  /** List of matching channels */
  items: MentionChannel[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when an item is selected */
  onSelect: (item: MentionChannel) => void;
  /** Callback when selection index changes */
  onSelectionChange?: (index: number) => void;
  /** Additional CSS class */
  className?: string;
}

export interface ChannelMentionListRef {
  /** Move selection up */
  upHandler: () => void;
  /** Move selection down */
  downHandler: () => void;
  /** Select current item */
  enterHandler: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getChannelIcon(type: MentionChannel["type"]) {
  switch (type) {
    case "public":
      return Hash;
    case "private":
      return Lock;
    case "direct":
      return MessageSquare;
    case "group":
      return Users;
    default:
      return Hash;
  }
}

function getChannelTypeLabel(type: MentionChannel["type"]) {
  switch (type) {
    case "public":
      return "Public channel";
    case "private":
      return "Private channel";
    case "direct":
      return "Direct message";
    case "group":
      return "Group chat";
    default:
      return "Channel";
  }
}

// ============================================================================
// Component
// ============================================================================

export const ChannelMentionList = forwardRef<
  ChannelMentionListRef,
  ChannelMentionListProps
>(function ChannelMentionList(
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
        No channels found
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
            <ChannelMentionListItem
              key={item.id}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(index, el);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              channel={item}
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
// ChannelMentionListItem Component
// ============================================================================

interface ChannelMentionListItemProps {
  channel: MentionChannel;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const ChannelMentionListItem = forwardRef<
  HTMLButtonElement,
  ChannelMentionListItemProps
>(function ChannelMentionListItem(
  { channel, isSelected, onClick, onMouseEnter },
  ref,
) {
  const Icon = getChannelIcon(channel.type);
  const typeLabel = getChannelTypeLabel(channel.type);

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
      {/* Channel icon */}
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          channel.type === "private"
            ? "bg-amber-500/10 text-amber-500"
            : channel.type === "direct"
              ? "bg-blue-500/10 text-blue-500"
              : channel.type === "group"
                ? "bg-purple-500/10 text-purple-500"
                : "bg-muted text-muted-foreground",
        )}
      >
        {channel.icon ? (
          <span className="text-lg">{channel.icon}</span>
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      {/* Channel info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">#{channel.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {typeLabel}
        </div>
      </div>

      {/* Type indicator for private channels */}
      {channel.type === "private" && (
        <Lock className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
});

// ============================================================================
// Standalone Channel Mention Popup
// ============================================================================

export interface ChannelMentionPopupProps {
  /** Whether the popup is open */
  isOpen: boolean;
  /** List of matching channels */
  items: MentionChannel[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when an item is selected */
  onSelect: (item: MentionChannel) => void;
  /** Callback when selection index changes */
  onSelectionChange: (index: number) => void;
  /** Position for the popup */
  position?: { top: number; left: number };
  /** Additional CSS class */
  className?: string;
}

export function ChannelMentionPopup({
  isOpen,
  items,
  selectedIndex,
  onSelect,
  onSelectionChange,
  position,
  className,
}: ChannelMentionPopupProps) {
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
      <ChannelMentionList
        items={items}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
}

export default ChannelMentionList;
