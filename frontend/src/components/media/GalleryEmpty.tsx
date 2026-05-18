"use client";

/**
 * GalleryEmpty - Empty state component for media galleries
 *
 * Displays a friendly message when no media items are available.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ImageOff, Upload, Search, Filter, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export type EmptyStateType = "no-media" | "no-results" | "filtered" | "error";

export interface GalleryEmptyProps {
  type?: EmptyStateType;
  message?: string;
  description?: string;
  showUploadAction?: boolean;
  onUpload?: () => void;
  onClearFilters?: () => void;
  className?: string;
}

// ============================================================================
// Empty State Content
// ============================================================================

const emptyStateContent: Record<
  EmptyStateType,
  { icon: React.ElementType; message: string; description: string }
> = {
  "no-media": {
    icon: ImageOff,
    message: "No media yet",
    description: "Files shared in conversations will appear here.",
  },
  "no-results": {
    icon: Search,
    message: "No results found",
    description: "Try adjusting your search query or filters.",
  },
  filtered: {
    icon: Filter,
    message: "No matching media",
    description:
      "No media matches the current filters. Try clearing some filters.",
  },
  error: {
    icon: FolderOpen,
    message: "Could not load media",
    description: "There was a problem loading the media. Please try again.",
  },
};

// ============================================================================
// Component
// ============================================================================

export function GalleryEmpty({
  type = "no-media",
  message,
  description,
  showUploadAction = false,
  onUpload,
  onClearFilters,
  className,
}: GalleryEmptyProps) {
  const content = emptyStateContent[type];
  const Icon = content.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* Message */}
      <h3 className="mb-2 text-lg font-semibold">
        {message || content.message}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {description || content.description}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        {showUploadAction && onUpload && (
          <Button onClick={onUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Media
          </Button>
        )}

        {type === "filtered" && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}

        {type === "no-results" && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Search
          </Button>
        )}
      </div>
    </div>
  );
}

export default GalleryEmpty;
