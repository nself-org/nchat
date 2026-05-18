"use client";

import { Pencil } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatMessageTimeTooltip } from "@/lib/date";

export interface EditedIndicatorProps {
  /** When the message was last edited */
  editedAt: Date;
  /** Number of times edited (optional) */
  editCount?: number;
  /** Whether to show the edit count */
  showCount?: boolean;
  /** Click handler to open edit history */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Edited indicator shown on messages that have been modified.
 * Shows "(edited)" text that can be clicked to view history.
 */
export function EditedIndicator({
  editedAt,
  editCount = 1,
  showCount = false,
  onClick,
  className,
  size = "sm",
}: EditedIndicatorProps) {
  const tooltipText = `Edited ${formatMessageTimeTooltip(editedAt)}${
    showCount && editCount > 1 ? ` (${editCount} edits)` : ""
  }`;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1 text-muted-foreground transition-colors",
              onClick && "cursor-pointer hover:text-foreground hover:underline",
              !onClick && "cursor-default",
              sizeClasses[size],
              className,
            )}
          >
            <span>(edited)</span>
            {showCount && editCount > 1 && (
              <span className="font-medium">{editCount}x</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-center gap-1.5">
            <Pencil className={iconSizes[size]} />
            <span>{tooltipText}</span>
          </div>
          {onClick && (
            <p className="mt-1 text-xs text-muted-foreground">
              Click to view edit history
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact edited badge for use in tight spaces.
 */
export interface EditedBadgeProps {
  /** When the message was last edited */
  editedAt: Date;
  /** Click handler to open edit history */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function EditedBadge({
  editedAt,
  onClick,
  className,
}: EditedBadgeProps) {
  const tooltipText = `Edited ${formatRelativeTime(editedAt)}`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted transition-colors",
              onClick && "hover:bg-muted-foreground/20 cursor-pointer",
              !onClick && "cursor-default",
              className,
            )}
          >
            <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline edited text for message bubbles.
 */
export interface EditedTextProps {
  /** Click handler to open edit history */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function EditedText({ onClick, className }: EditedTextProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs italic text-muted-foreground",
        onClick && "cursor-pointer hover:text-foreground hover:underline",
        !onClick && "cursor-default",
        className,
      )}
    >
      edited
    </button>
  );
}
