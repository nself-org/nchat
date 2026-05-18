"use client";

/**
 * Generic Link Preview Component
 *
 * Displays a rich preview for any URL with:
 * - Site favicon
 * - Site name
 * - Title
 * - Description
 * - Thumbnail image
 *
 * @example
 * ```tsx
 * <LinkPreview
 *   url="https://example.com/article"
 *   data={unfurlData}
 *   onClose={() => setShowPreview(false)}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { UnfurlData } from "@/lib/embeds/unfurl-service";

// ============================================================================
// TYPES
// ============================================================================

export interface LinkPreviewProps {
  /**
   * The URL being previewed
   */
  url: string;

  /**
   * Unfurled data for the URL
   */
  data: UnfurlData;

  /**
   * Whether the preview is compact (inline) or full
   * @default false
   */
  compact?: boolean;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;

  /**
   * Callback when the preview is clicked
   */
  onClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LinkPreview({
  url,
  data,
  compact = false,
  showCloseButton = true,
  onClose,
  onClick,
  className,
}: LinkPreviewProps) {
  const [imageError, setImageError] = React.useState(false);
  const [faviconError, setFaviconError] = React.useState(false);

  // Get display values with fallbacks
  const title = data.title || data.siteName || getDomainFromUrl(url);
  const description = data.description;
  const image = data.image && !imageError ? data.image : null;
  const favicon = data.favicon && !faviconError ? data.favicon : null;
  const siteName = data.siteName || getDomainFromUrl(url);

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on close button
    if ((e.target as HTMLElement).closest("[data-close-button]")) {
      return;
    }

    if (onClick) {
      onClick();
    } else {
      // Open in new tab
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "border-border/50 bg-muted/30 group flex items-center gap-2 rounded-md border px-3 py-2",
          "hover:bg-muted/50 cursor-pointer transition-colors",
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
        aria-label={`Open ${title}`}
      >
        {/* Favicon */}
        {favicon && (
          <img
            src={favicon}
            alt=""
            className="h-4 w-4 flex-shrink-0 rounded-sm"
            onError={() => setFaviconError(true)}
          />
        )}

        {/* Title */}
        <span className="truncate text-sm text-foreground">{title}</span>

        {/* External link icon */}
        <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Close button */}
        {showCloseButton && onClose && (
          <button
            data-close-button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="ml-auto flex-shrink-0 rounded-sm p-0.5 transition-colors hover:bg-muted"
            aria-label="Remove preview"
          >
            <CloseIcon className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-border bg-card",
        "hover:border-border/80 hover:bg-accent/5 cursor-pointer transition-all",
        "max-w-lg",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open ${title}`}
    >
      {/* Close button */}
      {showCloseButton && onClose && (
        <button
          data-close-button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "absolute right-2 top-2 z-10",
            "bg-background/80 rounded-full p-1 backdrop-blur-sm",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background",
          )}
          aria-label="Remove preview"
        >
          <CloseIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        {/* Site info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {favicon && (
            <img
              src={favicon}
              alt=""
              className="h-4 w-4 rounded-sm"
              onError={() => setFaviconError(true)}
            />
          )}
          <span className="truncate">{siteName}</span>
        </div>

        {/* Title */}
        <h4 className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground">
          {title}
        </h4>

        {/* Description */}
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}

        {/* Author/Date */}
        {(data.author || data.publishedDate) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {data.author && <span>{data.author}</span>}
            {data.author && data.publishedDate && <span>-</span>}
            {data.publishedDate && (
              <span>{formatDate(data.publishedDate)}</span>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail */}
      {image && (
        <div className="relative flex-shrink-0">
          <img
            src={image}
            alt=""
            className="h-full w-24 object-cover sm:w-32"
            onError={() => setImageError(true)}
          />
          {/* Gradient overlay for better text contrast */}
          <div className="from-card/20 absolute inset-0 bg-gradient-to-r to-transparent" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export interface LinkPreviewSkeletonProps {
  compact?: boolean;
  className?: string;
}

export function LinkPreviewSkeleton({
  compact = false,
  className,
}: LinkPreviewSkeletonProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "border-border/50 bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2",
          className,
        )}
      >
        <div className="h-4 w-4 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex max-w-lg overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-sm bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-full animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-24 w-24 animate-pulse bg-muted sm:w-32" />
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

// ============================================================================
// ICONS
// ============================================================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export default LinkPreview;
