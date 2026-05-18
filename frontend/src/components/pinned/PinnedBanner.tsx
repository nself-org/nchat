"use client";

import * as React from "react";
import { Pin, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PinnedMessage } from "@/lib/pinned";
import { PinnedMessageList } from "./PinnedMessageList";

export interface PinnedBannerProps {
  /** Number of pinned messages */
  count: number;
  /** Pinned messages to show in expanded view */
  pins?: PinnedMessage[];
  /** Callback when banner is clicked */
  onViewAll?: () => void;
  /** Callback to jump to message */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Callback to unpin a message */
  onUnpin?: (pin: PinnedMessage) => void;
  /** Whether user can unpin */
  canUnpin?: boolean;
  /** Whether to show expanded preview */
  showPreview?: boolean;
  /** Whether banner can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Banner showing the number of pinned messages in a channel.
 */
export function PinnedBanner({
  count,
  pins = [],
  onViewAll,
  onJumpToMessage,
  onUnpin,
  canUnpin = true,
  showPreview = false,
  dismissible = false,
  onDismiss,
  className,
}: PinnedBannerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (count === 0) {
    return null;
  }

  const bannerContent = (
    <div className="flex items-center gap-2">
      <Pin className="h-4 w-4 text-amber-500" />
      <span className="text-sm font-medium">
        {count} pinned message{count !== 1 ? "s" : ""}
      </span>
    </div>
  );

  if (showPreview && pins.length > 0) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn(
          "border-b bg-amber-50/50 dark:bg-amber-950/20",
          className,
        )}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-amber-100/50"
            >
              {bannerContent}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-1">
            {onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAll}
                className="text-xs"
              >
                View all
              </Button>
            )}
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t">
            <PinnedMessageList
              pins={pins.slice(0, 3)}
              onJumpToMessage={onJumpToMessage}
              onUnpin={onUnpin}
              canUnpin={canUnpin}
              compact
              maxHeight="200px"
            />
            {pins.length > 3 && onViewAll && (
              <div className="border-t px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="w-full text-xs"
                >
                  View all {count} pinned messages
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Simple banner without preview
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b bg-amber-50/50 px-4 py-2 dark:bg-amber-950/20",
        className,
      )}
    >
      <button
        onClick={onViewAll}
        className="flex items-center gap-2 hover:underline"
      >
        {bannerContent}
      </button>

      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
    </div>
  );
}
