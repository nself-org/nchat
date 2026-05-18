"use client";

/**
 * GIF Preview Component
 *
 * Single GIF preview with static thumbnail, hover animation, and click to select.
 *
 * @example
 * ```tsx
 * <GifPreview
 *   gif={gif}
 *   onClick={(gif) => handleSelect(gif)}
 *   showTitle
 * />
 * ```
 */

import { useState, useCallback, memo } from "react";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { Gif, GifPreviewProps } from "@/types/gif";

export const GifPreview = memo(function GifPreview({
  gif,
  onClick,
  className,
  showTitle = true,
  size = "md",
}: GifPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle click
  const handleClick = useCallback(() => {
    onClick?.(gif);
  }, [gif, onClick]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(gif);
      }
    },
    [gif, onClick],
  );

  // Get size classes
  const sizeClasses = {
    sm: "min-h-[60px]",
    md: "min-h-[80px]",
    lg: "min-h-[100px]",
  };

  // Decide which URL to show based on hover state
  const imageUrl = isHovered
    ? gif.previewGifUrl || gif.url
    : gif.previewUrl || gif.url;

  const content = (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={cn(
        "relative w-full overflow-hidden rounded-lg",
        "bg-muted/30 border border-transparent",
        "hover:border-primary/50 focus:border-primary",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        "cursor-pointer transition-all duration-200",
        "group",
        sizeClasses[size],
        className,
      )}
      style={{
        aspectRatio: gif.aspectRatio > 0 ? gif.aspectRatio : 1,
      }}
      aria-label={gif.title || "Select GIF"}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}

      {/* GIF Image */}
      {!hasError && (
        <img
          src={imageUrl}
          alt={gif.title || "GIF"}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "h-full w-full object-cover",
            "transition-transform duration-200",
            "group-hover:scale-105",
            !isLoaded && "opacity-0",
            isLoaded && "opacity-100",
          )}
        />
      )}

      {/* Hover overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200",
        )}
      />

      {/* Play indicator (shows on hover for static previews) */}
      {!isHovered && gif.previewUrl !== gif.previewGifUrl && (
        <div
          className={cn(
            "absolute bottom-1 right-1",
            "text-[10px] font-medium text-white/80",
            "rounded bg-black/40 px-1 py-0.5",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200",
          )}
        >
          GIF
        </div>
      )}
    </button>
  );

  // Wrap in tooltip if showTitle is true
  if (showTitle && gif.title) {
    return (
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-center">
            <p className="truncate text-xs">{gif.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

// ============================================================================
// GIF Preview with Actions (favorite, etc.)
// ============================================================================

export interface GifPreviewWithActionsProps extends GifPreviewProps {
  isFavorite?: boolean;
  onFavoriteToggle?: (gif: Gif) => void;
}

export const GifPreviewWithActions = memo(function GifPreviewWithActions({
  gif,
  onClick,
  className,
  showTitle = true,
  size = "md",
  isFavorite = false,
  onFavoriteToggle,
}: GifPreviewWithActionsProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleClick = useCallback(() => {
    onClick?.(gif);
  }, [gif, onClick]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFavoriteToggle?.(gif);
    },
    [gif, onFavoriteToggle],
  );

  const sizeClasses = {
    sm: "min-h-[60px]",
    md: "min-h-[80px]",
    lg: "min-h-[100px]",
  };

  const imageUrl = isHovered
    ? gif.previewGifUrl || gif.url
    : gif.previewUrl || gif.url;

  return (
    <div
      className={cn("group relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative w-full overflow-hidden rounded-lg",
          "bg-muted/30 border border-transparent",
          "hover:border-primary/50 focus:border-primary",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          "cursor-pointer transition-all duration-200",
          sizeClasses[size],
        )}
        style={{
          aspectRatio: gif.aspectRatio > 0 ? gif.aspectRatio : 1,
        }}
        aria-label={gif.title || "Select GIF"}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">
              Failed to load
            </span>
          </div>
        )}

        {!hasError && (
          <img
            src={imageUrl}
            alt={gif.title || "GIF"}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              "h-full w-full object-cover",
              "transition-transform duration-200",
              "group-hover:scale-105",
              !isLoaded && "opacity-0",
              isLoaded && "opacity-100",
            )}
          />
        )}

        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200",
          )}
        />
      </button>

      {/* Favorite button */}
      {onFavoriteToggle && (
        <button
          type="button"
          onClick={handleFavoriteClick}
          className={cn(
            "absolute right-1 top-1 rounded-full p-1.5",
            "bg-black/40 backdrop-blur-sm",
            "opacity-0 group-hover:opacity-100",
            "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
            "transition-all duration-200",
            "hover:bg-black/60",
            isFavorite && "opacity-100",
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              isFavorite ? "fill-red-500 text-red-500" : "text-white",
            )}
          />
        </button>
      )}

      {/* Title tooltip */}
      {showTitle && gif.title && isHovered && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 p-1.5",
            "bg-gradient-to-t from-black/80 to-transparent",
          )}
        >
          <p className="truncate text-[10px] text-white">{gif.title}</p>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// GIF Preview Skeleton (Loading State)
// ============================================================================

export interface GifPreviewSkeletonProps {
  className?: string;
  aspectRatio?: number;
}

export function GifPreviewSkeleton({
  className,
  aspectRatio = 1,
}: GifPreviewSkeletonProps) {
  return (
    <div
      className={cn("w-full animate-pulse rounded-lg bg-muted", className)}
      style={{ aspectRatio }}
    />
  );
}

export default GifPreview;
