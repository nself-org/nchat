"use client";

/**
 * MessageCommand
 *
 * Specialized command item for jumping to messages.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { MessageSquare, Hash, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageCommandData } from "@/lib/command-palette/command-types";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// Types
// ============================================================================

export interface MessageCommandProps {
  /** Message command data */
  command: MessageCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: MessageCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function MessageCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: MessageCommandProps) {
  const timeAgo = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(command.timestamp), {
        addSuffix: true,
      });
    } catch {
      return "";
    }
  }, [command.timestamp]);

  return (
    <CommandPrimitive.Item
      value={command.id}
      onSelect={() => onSelect?.(command)}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm outline-none",
        "aria-selected:text-accent-foreground aria-selected:bg-accent",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "hover:text-accent-foreground hover:bg-accent",
        isSelected && "text-accent-foreground bg-accent",
        className,
      )}
      data-selected={isSelected}
    >
      {/* Message icon */}
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Message info */}
      <div className="flex-1 overflow-hidden">
        {/* Header: author and channel */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {command.authorName}
          </span>
          <span>in</span>
          <span className="flex items-center gap-0.5">
            <Hash className="h-3 w-3" />
            {command.channelName}
          </span>
        </div>

        {/* Message preview */}
        <p className="mt-0.5 truncate text-sm">{command.messagePreview}</p>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {timeAgo}
      </div>
    </CommandPrimitive.Item>
  );
}

export default MessageCommand;
