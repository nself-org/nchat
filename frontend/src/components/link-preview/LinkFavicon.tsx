"use client";

/**
 * LinkFavicon - Displays site favicon for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LinkFaviconProps {
  /** Favicon URL */
  src?: string;
  /** Site name for alt text */
  siteName?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class name */
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function LinkFavicon({
  src,
  siteName,
  size = "md",
  className,
}: LinkFaviconProps) {
  const [error, setError] = React.useState(false);

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-sm bg-muted",
          sizeClasses[size],
          className,
        )}
        aria-hidden="true"
      >
        <svg
          className="h-3 w-3 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={siteName ? `${siteName} favicon` : "Site favicon"}
      className={cn("rounded-sm object-contain", sizeClasses[size], className)}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export default LinkFavicon;
