"use client";

/**
 * Link Preview Card Component
 *
 * Rich preview cards for URLs with OpenGraph/Twitter Card metadata.
 */

import { useState } from "react";
import {
  ExternalLink,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Globe,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LinkPreview, LinkPreviewType } from "@/lib/messages/link-preview";

interface LinkPreviewCardProps {
  preview: LinkPreview;
  isLoading?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function LinkPreviewCard({
  preview,
  isLoading = false,
  onDismiss,
  className,
}: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getTypeIcon = (type: LinkPreviewType) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: LinkPreviewType) => {
    switch (type) {
      case "video":
        return "Video";
      case "audio":
        return "Audio";
      case "image":
        return "Image";
      case "article":
        return "Article";
      default:
        return "Website";
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn("overflow-hidden rounded-lg border bg-card", className)}
      >
        <Skeleton className="h-48 w-full" />
        <div className="space-y-2 p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }

  const hasImage = preview.image && !imageError;
  const hasVideo = preview.video;
  const themeColor = preview.themeColor;

  return (
    <AnimatePresence>
      <motion.a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "hover:border-primary/50 group relative block overflow-hidden rounded-lg border bg-card transition-colors",
          className,
        )}
        style={{
          borderLeftColor: themeColor,
          borderLeftWidth: themeColor ? "3px" : undefined,
        }}
      >
        {/* Dismiss Button */}
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
            className="bg-background/80 absolute right-2 top-2 z-10 h-6 w-6 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Image/Video Preview */}
        {(hasImage || hasVideo) && (
          <div className="relative w-full bg-muted">
            {hasImage && (
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                {!imageLoaded && <Skeleton className="absolute inset-0" />}
                <img
                  src={preview.image}
                  alt={preview.imageAlt || preview.title}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-opacity",
                    imageLoaded ? "opacity-100" : "opacity-0",
                  )}
                />
                {preview.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-2 p-3">
          {/* Header with Favicon and Site Name */}
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
            <span className="truncate">
              {preview.siteName || preview.domain}
            </span>
            <Badge variant="secondary" className="ml-auto shrink-0">
              <span className="mr-1">{getTypeIcon(preview.type)}</span>
              {getTypeLabel(preview.type)}
            </Badge>
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
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              {preview.author && (
                <span className="truncate">
                  {preview.authorUrl ? (
                    <a
                      href={preview.authorUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {preview.author}
                    </a>
                  ) : (
                    preview.author
                  )}
                </span>
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

          {/* Footer with URL */}
          <div className="flex items-center gap-1 border-t pt-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{preview.domain}</span>
          </div>
        </div>
      </motion.a>
    </AnimatePresence>
  );
}

/**
 * Link Preview Skeleton
 * Loading state for link previews
 */
export function LinkPreviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <Skeleton className="h-48 w-full" />
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Link Preview Error
 * Error state for failed link previews
 */
export function LinkPreviewError({
  url,
  onDismiss,
  className,
}: {
  url: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <div
      className={cn("group relative rounded-lg border bg-card p-3", className)}
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
          <Globe className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-1 text-sm font-medium hover:underline"
          >
            {domain}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            Preview unavailable
          </p>
        </div>
      </div>
    </div>
  );
}
