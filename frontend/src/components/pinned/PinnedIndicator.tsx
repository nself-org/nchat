"use client";

import * as React from "react";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PinnedIndicatorProps {
  /** Show on the message itself */
  variant?: "inline" | "badge" | "icon";
  /** Size of the indicator */
  size?: "sm" | "md" | "lg";
  /** Show tooltip with pinner info */
  pinnedBy?: string;
  /** When it was pinned */
  pinnedAt?: Date;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Indicator shown on pinned messages.
 */
export function PinnedIndicator({
  variant = "icon",
  size = "sm",
  pinnedBy,
  pinnedAt,
  className,
  onClick,
}: PinnedIndicatorProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const tooltipContent = React.useMemo(() => {
    if (!pinnedBy && !pinnedAt) return "Pinned message";

    const parts = ["Pinned"];
    if (pinnedBy) parts.push(`by ${pinnedBy}`);
    if (pinnedAt) parts.push(`on ${formatDate(pinnedAt)}`);

    return parts.join(" ");
  }, [pinnedBy, pinnedAt]);

  const indicator = React.useMemo(() => {
    switch (variant) {
      case "badge":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
              className,
            )}
            onClick={onClick}
            onKeyDown={
              onClick
                ? (e) => (e.key === "Enter" || e.key === " ") && onClick()
                : undefined
            }
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
          >
            <Pin className={sizeClasses.sm} />
            <span>Pinned</span>
          </span>
        );

      case "inline":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400",
              className,
            )}
            onClick={onClick}
            onKeyDown={
              onClick
                ? (e) => (e.key === "Enter" || e.key === " ") && onClick()
                : undefined
            }
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
          >
            <Pin className={sizeClasses.sm} />
          </span>
        );

      case "icon":
      default:
        return (
          <span
            className={cn(
              "inline-flex text-amber-500 dark:text-amber-400",
              onClick && "cursor-pointer hover:text-amber-600",
              className,
            )}
            onClick={onClick}
            onKeyDown={
              onClick
                ? (e) => (e.key === "Enter" || e.key === " ") && onClick()
                : undefined
            }
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
          >
            <Pin className={sizeClasses[size]} />
          </span>
        );
    }
  }, [variant, size, className, onClick]);

  if (pinnedBy || pinnedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{indicator}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}
