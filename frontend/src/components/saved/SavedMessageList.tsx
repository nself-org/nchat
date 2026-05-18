"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SavedMessage } from "@/lib/saved";
import { SavedMessageCard } from "./SavedMessageCard";
import { SavedEmpty } from "./SavedEmpty";

export interface SavedMessageListProps {
  /** List of saved messages */
  savedMessages: SavedMessage[];
  /** Callback to navigate to message */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Callback to unsave a message */
  onUnsave?: (saved: SavedMessage) => void;
  /** Callback to toggle star */
  onToggleStar?: (saved: SavedMessage) => void;
  /** Callback to add to collection */
  onAddToCollection?: (saved: SavedMessage) => void;
  /** Callback to edit note */
  onEditNote?: (saved: SavedMessage) => void;
  /** Callback to set reminder */
  onSetReminder?: (saved: SavedMessage) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Max height for scroll area */
  maxHeight?: string;
  /** Show empty state */
  showEmpty?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * List component for displaying saved messages.
 */
export function SavedMessageList({
  savedMessages,
  onJumpToMessage,
  onUnsave,
  onToggleStar,
  onAddToCollection,
  onEditNote,
  onSetReminder,
  isLoading = false,
  compact = false,
  maxHeight,
  showEmpty = true,
  className,
}: SavedMessageListProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-2 pl-10">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (savedMessages.length === 0 && showEmpty) {
    return <SavedEmpty />;
  }

  const content = (
    <div className={cn("space-y-3", compact ? "p-2" : "p-4")}>
      {savedMessages.map((saved) => (
        <SavedMessageCard
          key={saved.id}
          saved={saved}
          onJumpToMessage={onJumpToMessage}
          onUnsave={onUnsave}
          onToggleStar={onToggleStar}
          onAddToCollection={onAddToCollection}
          onEditNote={onEditNote}
          onSetReminder={onSetReminder}
          compact={compact}
        />
      ))}
    </div>
  );

  if (maxHeight) {
    return (
      <ScrollArea className={cn("w-full", className)} style={{ maxHeight }}>
        {content}
      </ScrollArea>
    );
  }

  return <div className={className}>{content}</div>;
}
