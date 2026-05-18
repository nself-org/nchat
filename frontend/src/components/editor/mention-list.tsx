/**
 * MentionList Component
 *
 * Autocomplete dropdown for @user mentions showing:
 * - User avatar
 * - Display name
 * - Username
 * - Online status indicator
 * - Keyboard navigation support
 */

"use client";

import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials, getPresenceColor } from "@/stores/user-store";
import type { MentionUser } from "./editor-extensions";

// ============================================================================
// Types
// ============================================================================

export interface MentionListProps {
  /** List of matching users */
  items: MentionUser[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when an item is selected */
  onSelect: (item: MentionUser) => void;
  /** Callback when selection index changes */
  onSelectionChange?: (index: number) => void;
  /** Additional CSS class */
  className?: string;
}

export interface MentionListRef {
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

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList(
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
          No users found
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
              <MentionListItem
                key={item.id}
                ref={(el) => {
                  if (el) {
                    itemRefs.current.set(index, el);
                  } else {
                    itemRefs.current.delete(index);
                  }
                }}
                user={item}
                isSelected={index === selectedIndex}
                onClick={() => onSelect(item)}
                onMouseEnter={() => onSelectionChange?.(index)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  },
);

// ============================================================================
// MentionListItem Component
// ============================================================================

interface MentionListItemProps {
  user: MentionUser;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const MentionListItem = forwardRef<HTMLButtonElement, MentionListItemProps>(
  function MentionListItem({ user, isSelected, onClick, onMouseEnter }, ref) {
    const presenceColor = user.presence
      ? getPresenceColor(user.presence)
      : "#6B7280";

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
          isSelected
            ? "text-accent-foreground bg-accent"
            : "hover:bg-accent/50",
        )}
      >
        {/* Avatar with presence indicator */}
        <div className="relative">
          <Avatar className="h-8 w-8">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          {/* Online status indicator */}
          {user.presence && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-popover"
              style={{ backgroundColor: presenceColor }}
            />
          )}
        </div>

        {/* User info */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.displayName}</div>
          <div className="truncate text-xs text-muted-foreground">
            @{user.username}
          </div>
        </div>

        {/* Presence label for screen readers */}
        {user.presence && (
          <span className="sr-only">
            {user.presence === "online"
              ? "Online"
              : user.presence === "away"
                ? "Away"
                : user.presence === "dnd"
                  ? "Do not disturb"
                  : "Offline"}
          </span>
        )}
      </button>
    );
  },
);

// ============================================================================
// Standalone Mention Popup
// ============================================================================

export interface MentionPopupProps {
  /** Whether the popup is open */
  isOpen: boolean;
  /** List of matching users */
  items: MentionUser[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when an item is selected */
  onSelect: (item: MentionUser) => void;
  /** Callback when selection index changes */
  onSelectionChange: (index: number) => void;
  /** Position for the popup */
  position?: { top: number; left: number };
  /** Additional CSS class */
  className?: string;
}

export function MentionPopup({
  isOpen,
  items,
  selectedIndex,
  onSelect,
  onSelectionChange,
  position,
  className,
}: MentionPopupProps) {
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
      <MentionList
        items={items}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
}

export default MentionList;
