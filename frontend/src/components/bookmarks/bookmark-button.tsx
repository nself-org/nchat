"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBookmark } from "@/lib/bookmarks/use-bookmarks";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BookmarkButtonProps {
  messageId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

// ============================================================================
// Bookmark Icon Component
// ============================================================================

interface BookmarkIconProps {
  filled?: boolean;
  className?: string;
}

function BookmarkIcon({ filled = false, className }: BookmarkIconProps) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("h-5 w-5", className)}
      >
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-5 w-5", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 animate-spin", className)}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Bookmark Button Component
// ============================================================================

export function BookmarkButton({
  messageId,
  size = "md",
  showLabel = false,
  className,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const { isBookmarked, loading, toggleBookmark } = useBookmark(messageId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await toggleBookmark();
      onBookmarkChange?.(!isBookmarked);
    } catch (error) {
      logger.error("Failed to toggle bookmark:", error);
    }
  };

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const tooltipText = isBookmarked
    ? "Remove from saved items"
    : "Save for later";

  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        sizeClasses[size],
        "transition-colors",
        isBookmarked
          ? "text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={handleClick}
      disabled={loading}
      aria-label={tooltipText}
    >
      {loading ? (
        <LoadingSpinner className={iconSizeClasses[size]} />
      ) : (
        <BookmarkIcon filled={isBookmarked} className={iconSizeClasses[size]} />
      )}
    </Button>
  );

  if (showLabel) {
    return (
      <Button
        variant="ghost"
        className={cn(
          "gap-2",
          isBookmarked
            ? "text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <LoadingSpinner className={iconSizeClasses[size]} />
        ) : (
          <BookmarkIcon
            filled={isBookmarked}
            className={iconSizeClasses[size]}
          />
        )}
        <span>{isBookmarked ? "Saved" : "Save"}</span>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Standalone Bookmark Toggle (for message actions)
// ============================================================================

export interface BookmarkToggleProps {
  messageId: string;
  className?: string;
  onToggle?: (isBookmarked: boolean) => void;
}

export function BookmarkToggle({
  messageId,
  className,
  onToggle,
}: BookmarkToggleProps) {
  const { isBookmarked, loading, toggleBookmark } = useBookmark(messageId);

  const handleToggle = async () => {
    try {
      await toggleBookmark();
      onToggle?.(!isBookmarked);
    } catch (error) {
      logger.error("Failed to toggle bookmark:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:text-accent-foreground hover:bg-accent",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {loading ? (
        <LoadingSpinner className="h-4 w-4" />
      ) : (
        <BookmarkIcon filled={isBookmarked} className="h-4 w-4" />
      )}
      <span>{isBookmarked ? "Remove from saved" : "Save message"}</span>
    </button>
  );
}

export default BookmarkButton;
