"use client";

/**
 * LinkImage - Displays preview image for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface LinkImageProps {
  /** Image URL */
  src?: string;
  /** Alt text */
  alt?: string;
  /** Image width (from metadata) */
  width?: number;
  /** Image height (from metadata) */
  height?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Layout variant */
  layout?: "cover" | "contain" | "responsive";
  /** Aspect ratio */
  aspectRatio?: "auto" | "16/9" | "4/3" | "1/1" | "2/1";
  /** Show loading state */
  loading?: boolean;
  /** Additional class name */
  className?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

const aspectRatioClasses = {
  auto: "",
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "2/1": "aspect-[2/1]",
};

const layoutClasses = {
  cover: "object-cover",
  contain: "object-contain",
  responsive: "object-contain max-h-full",
};

export function LinkImage({
  src,
  alt,
  width,
  height,
  maxHeight = 300,
  layout = "cover",
  aspectRatio = "16/9",
  loading = false,
  className,
  onLoad,
  onError,
}: LinkImageProps) {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setImageLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageLoading(false);
    setImageError(true);
    onError?.();
  }, [onError]);

  // Reset states when src changes
  React.useEffect(() => {
    if (src) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [src]);

  // Calculate aspect ratio from dimensions if available
  const computedAspectRatio = React.useMemo(() => {
    if (aspectRatio !== "auto") return aspectRatio;
    if (width && height) {
      const ratio = width / height;
      if (ratio >= 1.7) return "16/9";
      if (ratio >= 1.2) return "4/3";
      if (ratio <= 0.8) return "1/1";
      return "16/9";
    }
    return "16/9";
  }, [aspectRatio, width, height]);

  // Show skeleton during loading
  if (loading || (imageLoading && src)) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-t-lg bg-muted",
          aspectRatioClasses[computedAspectRatio],
          className,
        )}
        style={{ maxHeight }}
      >
        <Skeleton className="absolute inset-0" />
        {src && (
          <img
            src={src}
            alt=""
            className="sr-only"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    );
  }

  // Show placeholder on error or no src
  if (!src || imageError) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-t-lg bg-muted",
          aspectRatioClasses[computedAspectRatio],
          className,
        )}
        style={{ maxHeight }}
      >
        <svg
          className="text-muted-foreground/50 h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-t-lg bg-muted",
        aspectRatioClasses[computedAspectRatio],
        className,
      )}
      style={{ maxHeight }}
    >
      <img
        src={src}
        alt={alt || "Preview image"}
        className={cn(
          "h-full w-full transition-opacity duration-200",
          layoutClasses[layout],
        )}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default LinkImage;
