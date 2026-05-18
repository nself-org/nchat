"use client";

/**
 * LinkPreview - Main link preview component
 *
 * Handles fetching, rendering, and managing link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useLinkPreview } from "@/hooks/useLinkPreview";
import { LinkCard } from "./LinkCard";
import { LinkPreviewSkeleton } from "./LinkPreviewSkeleton";
import { LinkPreviewError } from "./LinkPreviewError";
import { RemovePreviewButton } from "./RemovePreviewButton";
import { TwitterPreview } from "./TwitterPreview";
import { YouTubePreview } from "./YouTubePreview";
import { GitHubPreview } from "./GitHubPreview";
import { SpotifyPreview } from "./SpotifyPreview";
import { CodePreview } from "./CodePreview";
import { ImagePreview } from "./ImagePreview";
import { VideoPreview } from "./VideoPreview";
import {
  isTwitterPreview,
  isYouTubePreview,
  isGitHubRepoPreview,
  isGitHubIssuePreview,
  isSpotifyPreview,
  isCodePreview,
  isImagePreview,
  isVideoPreview,
} from "@/lib/link-preview";
import type { LinkPreviewData } from "@/lib/link-preview";

export interface LinkPreviewProps {
  /** URL to preview */
  url: string;
  /** Message ID for tracking removed previews */
  messageId?: string;
  /** Layout variant */
  variant?: "vertical" | "horizontal" | "compact" | "auto";
  /** Show remove button */
  showRemoveButton?: boolean;
  /** Auto-fetch preview on mount */
  autoFetch?: boolean;
  /** Show image in preview */
  showImage?: boolean;
  /** Show description in preview */
  showDescription?: boolean;
  /** Maximum image height */
  maxImageHeight?: number;
  /** Callback when preview is loaded */
  onLoad?: (data: LinkPreviewData) => void;
  /** Callback when preview fails to load */
  onError?: (error: string) => void;
  /** Callback when preview is removed */
  onRemove?: () => void;
  /** Additional class name */
  className?: string;
}

export function LinkPreview({
  url,
  messageId = "default",
  variant = "auto",
  showRemoveButton = true,
  autoFetch = true,
  showImage = true,
  showDescription = true,
  maxImageHeight = 200,
  onLoad,
  onError,
  onRemove,
  className,
}: LinkPreviewProps) {
  const { preview, isLoading, error, isRemoved, remove, restore, refresh } =
    useLinkPreview(url, {
      autoFetch,
      messageId,
      onLoad,
      onError,
    });

  // Don't render if removed
  if (isRemoved) {
    return null;
  }

  // Handle remove
  const handleRemove = () => {
    remove();
    onRemove?.();
  };

  // Loading state
  if (isLoading && !preview) {
    return (
      <LinkPreviewSkeleton
        variant={variant === "auto" ? "vertical" : variant}
        showImage={showImage}
        className={className}
      />
    );
  }

  // Error state
  if (error && !preview) {
    return (
      <LinkPreviewError
        url={url}
        error={error}
        onRetry={refresh}
        className={className}
      />
    );
  }

  // No preview data
  if (!preview) {
    return null;
  }

  // Determine actual variant
  const actualVariant =
    variant === "auto" ? (preview.image ? "vertical" : "compact") : variant;

  // Render specialized preview components based on type
  const renderSpecializedPreview = () => {
    // Twitter/X
    if (isTwitterPreview(preview)) {
      return (
        <TwitterPreview data={preview} className={className}>
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </TwitterPreview>
      );
    }

    // YouTube
    if (isYouTubePreview(preview)) {
      return (
        <YouTubePreview data={preview} className={className}>
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </YouTubePreview>
      );
    }

    // GitHub
    if (isGitHubRepoPreview(preview) || isGitHubIssuePreview(preview)) {
      return (
        <GitHubPreview data={preview} className={className}>
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </GitHubPreview>
      );
    }

    // Spotify
    if (isSpotifyPreview(preview)) {
      return (
        <SpotifyPreview data={preview} className={className}>
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </SpotifyPreview>
      );
    }

    // Code (Gist, CodePen, etc.)
    if (isCodePreview(preview)) {
      return (
        <CodePreview data={preview} className={className}>
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </CodePreview>
      );
    }

    // Direct image
    if (isImagePreview(preview)) {
      return (
        <ImagePreview
          data={preview}
          maxHeight={maxImageHeight}
          className={className}
        >
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </ImagePreview>
      );
    }

    // Direct video
    if (isVideoPreview(preview)) {
      return (
        <VideoPreview data={preview} className={className}>
          {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
        </VideoPreview>
      );
    }

    // Default card layout
    return null;
  };

  // Try specialized preview first
  const specializedPreview = renderSpecializedPreview();
  if (specializedPreview) {
    return specializedPreview;
  }

  // Default card layout
  return (
    <LinkCard
      data={preview}
      variant={actualVariant}
      showImage={showImage}
      showDescription={showDescription}
      maxImageHeight={maxImageHeight}
      className={className}
    >
      {showRemoveButton && <RemovePreviewButton onClick={handleRemove} />}
    </LinkCard>
  );
}

export default LinkPreview;
