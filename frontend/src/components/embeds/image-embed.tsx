"use client";

/**
 * Image Embed Component
 *
 * Displays direct image links with:
 * - Image preview
 * - Expand to full size
 * - Image dimensions
 * - Download option
 *
 * @example
 * ```tsx
 * <ImageEmbed url="https://example.com/image.jpg" />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ParsedImageUrl } from "@/lib/embeds/embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface ImageEmbedProps {
  /**
   * The image URL
   */
  url: string;

  /**
   * Parsed URL data
   */
  parsed?: ParsedImageUrl;

  /**
   * Alternative text for the image
   */
  alt?: string;

  /**
   * Maximum width for the preview
   * @default 400
   */
  maxWidth?: number;

  /**
   * Maximum height for the preview
   * @default 300
   */
  maxHeight?: number;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Whether to enable fullscreen mode on click
   * @default true
   */
  enableFullscreen?: boolean;

  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;

  /**
   * Callback when image is clicked
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

export function ImageEmbed({
  url,
  parsed,
  alt = "Image",
  maxWidth = 400,
  maxHeight = 300,
  showCloseButton = true,
  enableFullscreen = true,
  onClose,
  onClick,
  className,
}: ImageEmbedProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [dimensions, setDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setLoading(false);
  };

  const handleImageError = () => {
    setError(true);
    setLoading(false);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (enableFullscreen) {
      setIsFullscreen(true);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getFilenameFromUrl(url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(downloadUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // File info
  const extension = parsed?.extension || getExtensionFromUrl(url);
  const filename = getFilenameFromUrl(url);

  if (error) {
    return (
      <ImageEmbedError
        url={url}
        filename={filename}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "bg-muted/30 group relative overflow-hidden rounded-lg border border-border",
          "cursor-pointer transition-all",
          className,
        )}
        style={{
          maxWidth: maxWidth,
          maxHeight: loading ? maxHeight : undefined,
        }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`View ${alt} in fullscreen`}
      >
        {/* Close button */}
        {showCloseButton && onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "absolute right-2 top-2 z-10",
              "rounded-full bg-black/50 p-1 backdrop-blur-sm",
              "opacity-0 transition-opacity group-hover:opacity-100",
              "hover:bg-black/70",
            )}
            aria-label="Remove image"
          >
            <CloseIcon className="h-4 w-4 text-white" />
          </button>
        )}

        {/* Actions overlay */}
        <div
          className={cn(
            "absolute bottom-2 right-2 z-10 flex items-center gap-2",
            "opacity-0 transition-opacity group-hover:opacity-100",
          )}
        >
          {/* Expand button */}
          {enableFullscreen && (
            <button
              onClick={handleClick}
              className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Expand image"
            >
              <ExpandIcon className="h-4 w-4 text-white" />
            </button>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Download image"
          >
            <DownloadIcon className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Image info overlay */}
        {dimensions && (
          <div
            className={cn(
              "absolute bottom-2 left-2 z-10",
              "rounded bg-black/50 px-2 py-1 backdrop-blur-sm",
              "opacity-0 transition-opacity group-hover:opacity-100",
            )}
          >
            <span className="text-xs text-white">
              {dimensions.width} x {dimensions.height} -{" "}
              {extension.toUpperCase()}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            className="flex animate-pulse items-center justify-center bg-muted"
            style={{ width: maxWidth, height: maxHeight }}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Image */}
        <img
          src={url}
          alt={alt}
          className={cn(
            "object-contain transition-opacity",
            loading && "absolute opacity-0",
          )}
          style={{
            maxWidth: maxWidth,
            maxHeight: maxHeight,
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <ImageFullscreen
          url={url}
          alt={alt}
          dimensions={dimensions}
          extension={extension}
          onClose={handleCloseFullscreen}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}

// ============================================================================
// FULLSCREEN MODAL
// ============================================================================

interface ImageFullscreenProps {
  url: string;
  alt: string;
  dimensions: { width: number; height: number } | null;
  extension: string;
  onClose: () => void;
  onDownload: (e: React.MouseEvent) => void;
}

function ImageFullscreen({
  url,
  alt,
  dimensions,
  extension,
  onClose,
  onDownload,
}: ImageFullscreenProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Dialog backdrop click to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image fullscreen view"
      tabIndex={-1}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          "absolute right-4 top-4 z-10",
          "rounded-full bg-white/10 p-2 backdrop-blur-sm",
          "transition-colors hover:bg-white/20",
        )}
        aria-label="Close fullscreen"
      >
        <CloseIcon className="h-6 w-6 text-white" />
      </button>

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-black/50 px-4 py-2 backdrop-blur-sm">
        {dimensions && (
          <span className="text-sm text-white">
            {dimensions.width} x {dimensions.height}
          </span>
        )}
        <span className="text-sm text-white/60">{extension.toUpperCase()}</span>
        <button
          onClick={onDownload}
          className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
        >
          <DownloadIcon className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          Open
        </button>
      </div>

      {/* Image */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Click stops propagation to prevent modal close */}
      <img
        src={url}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface ImageEmbedErrorProps {
  url: string;
  filename: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function ImageEmbedError({
  url,
  filename,
  showCloseButton,
  onClose,
  className,
}: ImageEmbedErrorProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3",
        "hover:bg-muted/50 cursor-pointer transition-colors",
        "max-w-sm",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "absolute right-2 top-2 z-10",
            "bg-background/80 rounded-full p-1",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background",
          )}
          aria-label="Remove"
        >
          <CloseIcon className="h-3 w-3 text-muted-foreground" />
        </button>
      )}

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {filename}
        </p>
        <p className="text-xs text-muted-foreground">Failed to load image</p>
      </div>
      <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export interface ImageEmbedSkeletonProps {
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

export function ImageEmbedSkeleton({
  maxWidth = 400,
  maxHeight = 300,
  className,
}: ImageEmbedSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse overflow-hidden rounded-lg border border-border bg-muted",
        className,
      )}
      style={{
        width: maxWidth,
        height: maxHeight,
      }}
    >
      <div className="flex h-full items-center justify-center">
        <ImageIcon className="text-muted-foreground/50 h-8 w-8" />
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT IMAGE EMBED
// ============================================================================

export interface ImageEmbedCompactProps {
  url: string;
  alt?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ImageEmbedCompact({
  url,
  alt = "Image",
  showCloseButton,
  onClose,
  onClick,
  className,
}: ImageEmbedCompactProps) {
  const [error, setError] = React.useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const filename = getFilenameFromUrl(url);

  if (error) {
    return (
      <div
        className={cn(
          "border-border/50 bg-muted/30 group flex items-center gap-2 rounded-md border px-3 py-2",
          "hover:bg-muted/50 cursor-pointer transition-colors",
          className,
        )}
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm text-foreground">{filename}</span>
        {showCloseButton && onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="ml-auto rounded-sm p-0.5 transition-colors hover:bg-muted"
            aria-label="Remove"
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
        "group relative inline-block overflow-hidden rounded-md border border-border",
        "hover:border-primary/50 cursor-pointer transition-all",
        className,
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "absolute right-1 top-1 z-10",
            "rounded-full bg-black/50 p-0.5",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-black/70",
          )}
          aria-label="Remove"
        >
          <CloseIcon className="h-3 w-3 text-white" />
        </button>
      )}
      <img
        src={url}
        alt={alt}
        className="h-16 w-auto max-w-32 object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || "image";
    return decodeURIComponent(filename);
  } catch {
    return "image";
  }
}

function getExtensionFromUrl(url: string): string {
  const filename = getFilenameFromUrl(url);
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase() || "";
  }
  return "";
}

// ============================================================================
// ICONS
// ============================================================================

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

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

function ExpandIcon({ className }: { className?: string }) {
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
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
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

export default ImageEmbed;
