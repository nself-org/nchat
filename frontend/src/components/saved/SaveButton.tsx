"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, Star, StarOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SaveButtonProps {
  /** Whether the message is currently saved */
  isSaved: boolean;
  /** Whether the message is starred */
  isStarred?: boolean;
  /** Callback when save/unsave is clicked */
  onToggleSave: () => void;
  /** Callback when star/unstar is clicked */
  onToggleStar?: () => void;
  /** Whether the action is in progress */
  isLoading?: boolean;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Button variant */
  variant?: "icon" | "button" | "menu";
  /** Show label */
  showLabel?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Button to save or unsave (bookmark/star) a message.
 */
export function SaveButton({
  isSaved,
  isStarred = false,
  onToggleSave,
  onToggleStar,
  isLoading = false,
  size = "sm",
  variant = "icon",
  showLabel = false,
  className,
}: SaveButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const saveLabel = isSaved ? "Remove from saved" : "Save message";
  const starLabel = isStarred ? "Unstar" : "Star";

  if (variant === "menu") {
    return (
      <div className={cn("space-y-1", className)}>
        <button
          onClick={onToggleSave}
          disabled={isLoading}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-blue-500" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          <span>{saveLabel}</span>
        </button>
        {isSaved && onToggleStar && (
          <button
            onClick={onToggleStar}
            disabled={isLoading}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            {isStarred ? (
              <StarOff className="h-4 w-4" />
            ) : (
              <Star className="h-4 w-4" />
            )}
            <span>{starLabel}</span>
          </button>
        )}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant={isSaved ? "secondary" : "outline"}
          size={size === "sm" ? "sm" : "default"}
          onClick={onToggleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : isSaved ? (
            <BookmarkCheck className={cn(iconSizes[size], "text-blue-500")} />
          ) : (
            <Bookmark className={iconSizes[size]} />
          )}
          {showLabel && <span className="ml-2">{saveLabel}</span>}
        </Button>
        {isSaved && onToggleStar && (
          <Button
            variant="ghost"
            size={size === "sm" ? "sm" : "default"}
            onClick={onToggleStar}
            disabled={isLoading}
          >
            {isStarred ? (
              <Star
                className={cn(
                  iconSizes[size],
                  "fill-yellow-500 text-yellow-500",
                )}
              />
            ) : (
              <Star className={iconSizes[size]} />
            )}
          </Button>
        )}
      </div>
    );
  }

  // Icon variant (default)
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSave}
              disabled={isLoading}
              className={cn(
                sizeClasses[size],
                isSaved && "text-blue-500 hover:text-blue-600",
              )}
            >
              {isLoading ? (
                <Loader2 className={cn(iconSizes[size], "animate-spin")} />
              ) : isSaved ? (
                <BookmarkCheck className={iconSizes[size]} />
              ) : (
                <Bookmark className={iconSizes[size]} />
              )}
              <span className="sr-only">{saveLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{saveLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isSaved && onToggleStar && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleStar}
                disabled={isLoading}
                className={cn(
                  sizeClasses[size],
                  isStarred && "text-yellow-500 hover:text-yellow-600",
                )}
              >
                <Star
                  className={cn(iconSizes[size], isStarred && "fill-current")}
                />
                <span className="sr-only">{starLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{starLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
