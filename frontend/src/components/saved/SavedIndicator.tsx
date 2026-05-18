"use client";

import * as React from "react";
import { Bookmark, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SavedIndicatorProps {
  /** Type of indicator */
  type?: "bookmark" | "star";
  /** Show on the message itself */
  variant?: "inline" | "badge" | "icon";
  /** Size of the indicator */
  size?: "sm" | "md" | "lg";
  /** When it was saved */
  savedAt?: Date;
  /** Is starred */
  isStarred?: boolean;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Indicator shown on saved messages.
 */
export function SavedIndicator({
  type = "bookmark",
  variant = "icon",
  size = "sm",
  savedAt,
  isStarred = false,
  className,
  onClick,
}: SavedIndicatorProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const Icon = type === "star" || isStarred ? Star : Bookmark;
  const colorClass = isStarred
    ? "text-yellow-500 dark:text-yellow-400"
    : "text-blue-500 dark:text-blue-400";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const tooltipContent = React.useMemo(() => {
    const label = isStarred ? "Starred" : "Saved";
    if (!savedAt) return label;
    return `${label} on ${formatDate(savedAt)}`;
  }, [savedAt, isStarred]);

  const indicator = React.useMemo(() => {
    switch (variant) {
      case "badge":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isStarred
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
              onClick && "cursor-pointer",
              className,
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
              onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClick();
                    }
                  }
                : undefined
            }
          >
            <Icon className={sizeClasses.sm} fill="currentColor" />
            <span>{isStarred ? "Starred" : "Saved"}</span>
          </span>
        );

      case "inline":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              colorClass,
              onClick && "cursor-pointer",
              className,
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
              onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClick();
                    }
                  }
                : undefined
            }
          >
            <Icon className={sizeClasses.sm} fill="currentColor" />
          </span>
        );

      case "icon":
      default:
        return (
          <span
            className={cn(
              "inline-flex",
              colorClass,
              onClick && "cursor-pointer hover:opacity-80",
              className,
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
              onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClick();
                    }
                  }
                : undefined
            }
          >
            <Icon className={sizeClasses[size]} fill="currentColor" />
          </span>
        );
    }
  }, [variant, size, className, onClick, isStarred, colorClass]);

  if (savedAt) {
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
