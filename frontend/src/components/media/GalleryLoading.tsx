"use client";

/**
 * GalleryLoading - Loading state component for media galleries
 *
 * Displays skeleton loading states for different view modes.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { MediaViewMode } from "@/lib/media/media-types";

// ============================================================================
// Types
// ============================================================================

export interface GalleryLoadingProps {
  viewMode?: MediaViewMode;
  variant?: "full" | "inline" | "skeleton";
  itemCount?: number;
  className?: string;
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SkeletonItem({ viewMode }: { viewMode: MediaViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-lg border bg-card p-3">
        <div className="h-12 w-12 rounded bg-muted" />
        <div className="flex-1">
          <div className="mb-2 h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-6 w-6 rounded-full bg-muted" />
      </div>
    );
  }

  // Grid/Masonry view
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border bg-card">
      <div className="aspect-square bg-muted" />
      <div className="p-2">
        <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function GalleryLoading({
  viewMode = "grid",
  variant = "full",
  itemCount = 12,
  className,
}: GalleryLoadingProps) {
  // Inline loading (for load more)
  if (variant === "inline") {
    return (
      <div
        className={cn("flex items-center justify-center gap-2 py-4", className)}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Skeleton loading
  if (variant === "skeleton") {
    const gridStyles: React.CSSProperties =
      viewMode === "grid" || viewMode === "masonry"
        ? {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "8px",
          }
        : {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          };

    return (
      <div style={gridStyles} className={className}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <SkeletonItem key={i} viewMode={viewMode} />
        ))}
      </div>
    );
  }

  // Full loading (default)
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16",
        className,
      )}
    >
      {/* Spinner */}
      <div className="mb-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>

      {/* Text */}
      <p className="text-sm text-muted-foreground">Loading media...</p>

      {/* Skeleton preview */}
      <div className="mt-8 w-full max-w-2xl px-4">
        <div
          className={cn(
            viewMode === "list"
              ? "flex flex-col gap-2"
              : "grid grid-cols-4 gap-2",
          )}
        >
          {Array.from({ length: viewMode === "list" ? 3 : 8 }).map((_, i) => (
            <SkeletonItem key={i} viewMode={viewMode} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default GalleryLoading;
