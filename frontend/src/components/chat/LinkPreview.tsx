"use client";

/**
 * LinkPreview Component
 *
 * Displays rich link preview cards with Open Graph metadata.
 * Supports:
 * - Auto-detection of URLs in messages
 * - Open Graph and Twitter Card metadata
 * - Platform-specific previews (YouTube, GitHub, Twitter, etc.)
 * - Privacy controls and disable options
 * - Error handling and fallback states
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { extractUrls } from "@/lib/messages/link-preview";
import type {
  LinkPreview as LinkPreviewData,
  LinkPreviewResult,
} from "@/lib/messages/link-preview";

// ============================================================================
// Types
// ============================================================================

export interface LinkPreviewProps {
  /**
   * Message content to extract URLs from
   */
  content: string;
  /**
   * Optional pre-fetched previews
   */
  previews?: LinkPreviewData[];
  /**
   * Whether to auto-fetch previews
   * @default true
   */
  autoFetch?: boolean;
  /**
   * Maximum number of previews to show
   * @default 3
   */
  maxPreviews?: number;
  /**
   * Whether user can dismiss individual previews
   * @default true
   */
  allowDismiss?: boolean;
  /**
   * Callback when a preview is dismissed
   */
  onDismiss?: (url: string) => void;
  /**
   * CSS class name
   */
  className?: string;
}

interface PreviewState {
  url: string;
  status: "loading" | "success" | "error" | "dismissed";
  data?: LinkPreviewData;
  error?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function LinkPreview({
  content,
  previews = [],
  autoFetch = true,
  maxPreviews = 3,
  allowDismiss = true,
  onDismiss,
  className,
}: LinkPreviewProps) {
  const [previewStates, setPreviewStates] = useState<Map<string, PreviewState>>(
    new Map(),
  );
  const [privacyMode, setPrivacyMode] = useState(false);
  const fetchedUrls = useRef<Set<string>>(new Set());

  // Extract URLs from content
  const urls = extractUrls(content).slice(0, maxPreviews);

  // Initialize preview states
  useEffect(() => {
    const newStates = new Map<string, PreviewState>();

    // Initialize from provided previews
    previews.forEach((preview) => {
      newStates.set(preview.url, {
        url: preview.url,
        status: "success",
        data: preview,
      });
    });

    // Initialize remaining URLs
    urls.forEach((url) => {
      if (!newStates.has(url) && !fetchedUrls.current.has(url)) {
        newStates.set(url, {
          url,
          status: "loading",
        });
      }
    });

    setPreviewStates(newStates);
  }, [content, previews]);

  // Fetch previews
  useEffect(() => {
    if (!autoFetch || privacyMode) return;

    const urlsToFetch = urls.filter(
      (url) =>
        !fetchedUrls.current.has(url) && !previews.some((p) => p.url === url),
    );

    if (urlsToFetch.length === 0) return;

    urlsToFetch.forEach((url) => {
      fetchedUrls.current.add(url);
      fetchPreview(url);
    });
  }, [urls, autoFetch, privacyMode, previews]);

  // Fetch a single preview
  const fetchPreview = useCallback(async (url: string) => {
    try {
      const response = await fetch(
        `/api/link-preview?url=${encodeURIComponent(url)}`,
      );
      const result: LinkPreviewResult = await response.json();

      if (result.success && result.preview) {
        setPreviewStates((prev) => {
          const next = new Map(prev);
          next.set(url, {
            url,
            status: "success",
            data: result.preview,
          });
          return next;
        });
      } else {
        setPreviewStates((prev) => {
          const next = new Map(prev);
          next.set(url, {
            url,
            status: "error",
            error: result.error || "Failed to load preview",
          });
          return next;
        });
      }
    } catch (error) {
      setPreviewStates((prev) => {
        const next = new Map(prev);
        next.set(url, {
          url,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return next;
      });
    }
  }, []);

  // Handle dismiss
  const handleDismiss = useCallback(
    (url: string) => {
      setPreviewStates((prev) => {
        const next = new Map(prev);
        next.set(url, {
          url,
          status: "dismissed",
        });
        return next;
      });
      onDismiss?.(url);
    },
    [onDismiss],
  );

  // Toggle privacy mode
  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode((prev) => !prev);
  }, []);

  // Filter valid previews
  const validPreviews = Array.from(previewStates.values()).filter(
    (state) => state.status === "success" && state.data,
  );

  // If privacy mode is enabled and no previews loaded yet, show control
  if (privacyMode && validPreviews.length === 0 && urls.length > 0) {
    return (
      <div className={cn("bg-muted/30 mt-2 rounded-lg border p-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOff className="h-4 w-4" />
            <span>
              {urls.length} link{urls.length > 1 ? "s" : ""} hidden for privacy
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePrivacyMode}
            className="h-8"
          >
            <Eye className="mr-2 h-4 w-4" />
            Show Previews
          </Button>
        </div>
      </div>
    );
  }

  if (validPreviews.length === 0) return null;

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      {/* Privacy control */}
      {urls.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePrivacyMode}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            {privacyMode ? (
              <>
                <Eye className="mr-1 h-3 w-3" />
                Show Previews
              </>
            ) : (
              <>
                <EyeOff className="mr-1 h-3 w-3" />
                Hide Previews
              </>
            )}
          </Button>
        </div>
      )}

      {/* Preview cards */}
      <AnimatePresence mode="popLayout">
        {Array.from(previewStates.entries()).map(([url, state]) => {
          if (state.status === "loading") {
            return <LinkPreviewSkeleton key={url} />;
          }

          if (state.status === "success" && state.data) {
            return (
              <LinkPreviewCard
                key={url}
                preview={state.data}
                onDismiss={allowDismiss ? () => handleDismiss(url) : undefined}
              />
            );
          }

          if (state.status === "error") {
            return (
              <LinkPreviewError
                key={url}
                url={url}
                error={state.error}
                onDismiss={allowDismiss ? () => handleDismiss(url) : undefined}
              />
            );
          }

          return null;
        })}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Link Preview Card
// ============================================================================

interface LinkPreviewCardProps {
  preview: LinkPreviewData;
  onDismiss?: () => void;
}

function LinkPreviewCard({ preview, onDismiss }: LinkPreviewCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasImage = preview.image && !imageError;

  return (
    <motion.a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "hover:border-primary/50 group relative block overflow-hidden rounded-lg border bg-card transition-colors",
        hasImage ? "" : "p-3",
      )}
      style={{
        borderLeftColor: preview.themeColor,
        borderLeftWidth: preview.themeColor ? "3px" : undefined,
      }}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="bg-background/80 absolute right-2 top-2 z-10 h-6 w-6 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Image */}
      {hasImage && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={preview.image}
            alt={preview.imageAlt || preview.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
          />
          {preview.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60">
                <svg
                  className="h-8 w-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn("space-y-2", hasImage && "p-3")}>
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="h-4 w-4 rounded"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <span className="truncate">{preview.siteName || preview.domain}</span>
          {preview.type !== "website" && (
            <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
              {preview.type}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h4 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
          {preview.title}
        </h4>

        {/* Description */}
        {preview.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {preview.description}
          </p>
        )}

        {/* Author & Date */}
        {(preview.author || preview.publishedDate) && (
          <div className="flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
            {preview.author && (
              <span className="truncate">{preview.author}</span>
            )}
            {preview.author && preview.publishedDate && <span>•</span>}
            {preview.publishedDate && (
              <span>
                {new Date(preview.publishedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{preview.domain}</span>
        </div>
      </div>
    </motion.a>
  );
}

// ============================================================================
// Link Preview Skeleton
// ============================================================================

function LinkPreviewSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="overflow-hidden rounded-lg border bg-card"
    >
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// Link Preview Error
// ============================================================================

interface LinkPreviewErrorProps {
  url: string;
  error?: string;
  onDismiss?: () => void;
}

function LinkPreviewError({ url, error, onDismiss }: LinkPreviewErrorProps) {
  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-lg border bg-card p-3"
    >
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
          >
            {domain}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            {error || "Preview unavailable"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
