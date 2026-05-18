"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PinnedMessage } from "@/lib/pinned";
import { PinnedMessageCard } from "./PinnedMessageCard";
import { PinnedEmpty } from "./PinnedEmpty";

export interface PinnedMessageListProps {
  /** List of pinned messages */
  pins: PinnedMessage[];
  /** Callback to navigate to message */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Callback to unpin a message */
  onUnpin?: (pin: PinnedMessage) => void;
  /** Whether user can unpin messages */
  canUnpin?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Max height for scroll area */
  maxHeight?: string;
  /** Additional className */
  className?: string;
}

/**
 * List component for displaying pinned messages.
 */
export function PinnedMessageList({
  pins,
  onJumpToMessage,
  onUnpin,
  canUnpin = true,
  isLoading = false,
  compact = false,
  maxHeight = "400px",
  className,
}: PinnedMessageListProps) {
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

  if (pins.length === 0) {
    return <PinnedEmpty />;
  }

  return (
    <ScrollArea className={cn("w-full", className)} style={{ maxHeight }}>
      <div className={cn("space-y-3", compact ? "p-2" : "p-4")}>
        {pins.map((pin) => (
          <PinnedMessageCard
            key={pin.id}
            pin={pin}
            onJumpToMessage={onJumpToMessage}
            onUnpin={onUnpin}
            canUnpin={canUnpin}
            compact={compact}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
