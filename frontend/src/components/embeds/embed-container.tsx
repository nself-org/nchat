"use client";

/**
 * Embed Container Component
 *
 * Wrapper component that:
 * - Detects embed type from URL
 * - Renders the appropriate embed component
 * - Handles loading state
 * - Handles error state
 * - Supports collapse/expand
 *
 * @example
 * ```tsx
 * <EmbedContainer url="https://twitter.com/user/status/123" />
 * <EmbedContainer url="https://youtube.com/watch?v=abc" />
 * <EmbedContainer url="https://example.com/image.jpg" />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  detectEmbedType,
  parseUrl,
  type EmbedType,
  type ParsedUrl,
} from "@/lib/embeds/embed-patterns";
import { useUnfurl } from "@/lib/embeds/use-unfurl";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

import { LinkPreview, LinkPreviewSkeleton } from "./link-preview";
import { TwitterEmbed } from "./twitter-embed";
import { YouTubeEmbed, YouTubeEmbedSkeleton } from "./youtube-embed";
import { GitHubEmbed } from "./github-embed";
import { SpotifyEmbed } from "./spotify-embed";
import { ImageEmbed, ImageEmbedSkeleton } from "./image-embed";
import { VideoEmbed, VideoEmbedSkeleton } from "./video-embed";

// ============================================================================
// TYPES
// ============================================================================

export interface EmbedContainerProps {
  /**
   * The URL to embed
   */
  url: string;

  /**
   * Whether to show a compact version
   * @default false
   */
  compact?: boolean;

  /**
   * Whether to start collapsed
   * @default false
   */
  collapsed?: boolean;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Whether to allow collapsing/expanding
   * @default false
   */
  collapsible?: boolean;

  /**
   * Callback when the embed is closed/removed
   */
  onClose?: () => void;

  /**
   * Callback when the embed is clicked
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

export function EmbedContainer({
  url,
  compact = false,
  collapsed: collapsedProp = false,
  showCloseButton = true,
  collapsible = false,
  onClose,
  onClick,
  className,
}: EmbedContainerProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsedProp);

  // Check feature flag
  const linkPreviewsEnabled = useFeatureEnabled(
    FEATURES.MESSAGES_LINK_PREVIEWS,
  );

  // Parse URL to determine type
  const parsedUrl = React.useMemo(() => parseUrl(url), [url]);
  const embedType = parsedUrl.type;

  // Fetch unfurl data for generic links and some embeds
  const shouldUnfurl = embedType === "generic";
  const {
    data: unfurlData,
    loading,
    error,
  } = useUnfurl(shouldUnfurl ? url : null, { respectFeatureFlag: true });

  // Don't render if feature is disabled
  if (!linkPreviewsEnabled) {
    return null;
  }

  // Handle collapse toggle
  const handleToggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <CollapsedEmbed
        url={url}
        embedType={embedType}
        onExpand={handleToggleCollapse}
        onClose={onClose}
        className={className}
      />
    );
  }

  // Loading state
  if (loading && shouldUnfurl) {
    return (
      <EmbedSkeleton
        embedType={embedType}
        compact={compact}
        className={className}
      />
    );
  }

  // Error state for generic links
  if (error && shouldUnfurl) {
    return (
      <EmbedError
        url={url}
        error={error}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  // Render appropriate embed based on type
  return (
    <div className={cn("relative", className)}>
      {/* Collapse button */}
      {collapsible && (
        <button
          onClick={handleToggleCollapse}
          className={cn(
            "absolute -left-6 top-2 z-10",
            "rounded-sm p-0.5 transition-colors hover:bg-muted",
            "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Collapse embed"
        >
          <CollapseIcon className="h-4 w-4" />
        </button>
      )}

      {renderEmbed({
        url,
        parsedUrl,
        embedType,
        unfurlData,
        compact,
        showCloseButton,
        onClose,
        onClick,
      })}
    </div>
  );
}

// ============================================================================
// RENDER EMBED
// ============================================================================

interface RenderEmbedProps {
  url: string;
  parsedUrl: ParsedUrl;
  embedType: EmbedType;
  unfurlData: ReturnType<typeof useUnfurl>["data"];
  compact: boolean;
  showCloseButton: boolean;
  onClose?: () => void;
  onClick?: () => void;
}

function renderEmbed({
  url,
  parsedUrl,
  embedType,
  unfurlData,
  compact,
  showCloseButton,
  onClose,
  onClick,
}: RenderEmbedProps): React.ReactNode {
  switch (embedType) {
    case "twitter":
      return (
        <TwitterEmbed
          url={url}
          parsed={parsedUrl.type === "twitter" ? parsedUrl : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
        />
      );

    case "youtube":
      return (
        <YouTubeEmbed
          url={url}
          parsed={parsedUrl.type === "youtube" ? parsedUrl : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
        />
      );

    case "github":
      return (
        <GitHubEmbed
          url={url}
          parsed={parsedUrl.type === "github" ? parsedUrl : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
        />
      );

    case "spotify":
      return (
        <SpotifyEmbed
          url={url}
          parsed={parsedUrl.type === "spotify" ? parsedUrl : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
        />
      );

    case "image":
      return (
        <ImageEmbed
          url={url}
          parsed={parsedUrl.type === "image" ? parsedUrl : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
          onClick={onClick}
        />
      );

    case "video":
      return (
        <VideoEmbed
          url={url}
          parsed={parsedUrl.type === "video" ? parsedUrl : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
        />
      );

    case "generic":
    default:
      if (unfurlData) {
        return (
          <LinkPreview
            url={url}
            data={unfurlData}
            compact={compact}
            showCloseButton={showCloseButton}
            onClose={onClose}
            onClick={onClick}
          />
        );
      }
      return (
        <GenericLinkEmbed
          url={url}
          showCloseButton={showCloseButton}
          onClose={onClose}
          onClick={onClick}
        />
      );
  }
}

// ============================================================================
// COLLAPSED VIEW
// ============================================================================

interface CollapsedEmbedProps {
  url: string;
  embedType: EmbedType;
  onExpand: () => void;
  onClose?: () => void;
  className?: string;
}

function CollapsedEmbed({
  url,
  embedType,
  onExpand,
  onClose,
  className,
}: CollapsedEmbedProps) {
  const getIcon = () => {
    switch (embedType) {
      case "twitter":
        return <TwitterIcon className="h-4 w-4 text-[#1DA1F2]" />;
      case "youtube":
        return <YouTubeIcon className="h-4 w-4 text-[#FF0000]" />;
      case "github":
        return <GitHubIcon className="h-4 w-4" />;
      case "spotify":
        return <SpotifyIcon className="h-4 w-4 text-[#1DB954]" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
      case "video":
        return <VideoIcon className="h-4 w-4 text-muted-foreground" />;
      default:
        return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDomain = () => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <div
      className={cn(
        "border-border/50 bg-muted/30 group flex items-center gap-2 rounded-md border px-3 py-1.5",
        "hover:bg-muted/50 cursor-pointer transition-colors",
        className,
      )}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
    >
      {getIcon()}
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {getDomain()}
      </span>
      <ExpandIcon className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-sm p-0.5 transition-colors hover:bg-muted"
          aria-label="Remove"
        >
          <CloseIcon className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

interface EmbedSkeletonProps {
  embedType: EmbedType;
  compact?: boolean;
  className?: string;
}

function EmbedSkeleton({ embedType, compact, className }: EmbedSkeletonProps) {
  switch (embedType) {
    case "youtube":
      return <YouTubeEmbedSkeleton className={className} />;
    case "image":
      return <ImageEmbedSkeleton className={className} />;
    case "video":
      return <VideoEmbedSkeleton className={className} />;
    default:
      return <LinkPreviewSkeleton compact={compact} className={className} />;
  }
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface EmbedErrorProps {
  url: string;
  error: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function EmbedError({
  url,
  error,
  showCloseButton,
  onClose,
  className,
}: EmbedErrorProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getDomain = () => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "Link";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3",
        "hover:bg-muted/50 cursor-pointer transition-colors",
        "max-w-md",
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
        <AlertIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {getDomain()}
        </p>
        <p className="text-xs text-muted-foreground">Unable to load preview</p>
      </div>
      <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// GENERIC LINK EMBED
// ============================================================================

interface GenericLinkEmbedProps {
  url: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

function GenericLinkEmbed({
  url,
  showCloseButton,
  onClose,
  onClick,
  className,
}: GenericLinkEmbedProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const getDomain = () => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

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
      <LinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-sm text-foreground">
        {getDomain()}
      </span>
      <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-sm p-0.5 transition-colors hover:bg-muted"
          aria-label="Remove"
        >
          <CloseIcon className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MULTI-EMBED CONTAINER
// ============================================================================

export interface MultiEmbedContainerProps {
  /**
   * Array of URLs to embed
   */
  urls: string[];

  /**
   * Maximum number of embeds to show
   * @default 4
   */
  maxEmbeds?: number;

  /**
   * Whether to show compact versions
   * @default false
   */
  compact?: boolean;

  /**
   * Callback when an embed is closed
   */
  onClose?: (url: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function MultiEmbedContainer({
  urls,
  maxEmbeds = 4,
  compact = false,
  onClose,
  className,
}: MultiEmbedContainerProps) {
  const visibleUrls = urls.slice(0, maxEmbeds);
  const hiddenCount = urls.length - maxEmbeds;

  if (urls.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {visibleUrls.map((url) => (
        <EmbedContainer
          key={url}
          url={url}
          compact={compact}
          showCloseButton={!!onClose}
          onClose={onClose ? () => onClose(url) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="text-xs text-muted-foreground">
          +{hiddenCount} more link{hiddenCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

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

function VideoIcon({ className }: { className?: string }) {
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
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
      />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
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
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
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
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
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

function AlertIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

export default EmbedContainer;
