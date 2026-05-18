/* eslint-disable react-hooks/rules-of-hooks */
"use client";

/**
 * Twitter/X Embed Component
 *
 * Displays Twitter/X content with:
 * - Tweet content
 * - Author info (name, username, avatar)
 * - Media (images, video)
 * - Engagement stats (likes, retweets, replies)
 * - Twitter-style formatting
 *
 * @example
 * ```tsx
 * <TwitterEmbed
 *   url="https://twitter.com/vercel/status/1234567890"
 *   tweetId="1234567890"
 *   username="vercel"
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  parseTwitterUrl,
  type ParsedTwitterUrl,
} from "@/lib/embeds/embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface TwitterEmbedData {
  /**
   * Tweet ID
   */
  tweetId: string;

  /**
   * Author username (without @)
   */
  username: string;

  /**
   * Author display name
   */
  displayName?: string;

  /**
   * Author avatar URL
   */
  avatarUrl?: string;

  /**
   * Whether the author is verified
   */
  verified?: boolean;

  /**
   * Tweet text content
   */
  content?: string;

  /**
   * Media attachments
   */
  media?: Array<{
    type: "image" | "video" | "gif";
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  }>;

  /**
   * Engagement stats
   */
  stats?: {
    replies?: number;
    retweets?: number;
    likes?: number;
    views?: number;
  };

  /**
   * Tweet timestamp
   */
  createdAt?: string;

  /**
   * Whether this is a reply
   */
  isReply?: boolean;

  /**
   * Quote tweet
   */
  quoteTweet?: TwitterEmbedData;
}

export interface TwitterEmbedProps {
  /**
   * The Twitter URL
   */
  url: string;

  /**
   * Parsed URL data
   */
  parsed?: ParsedTwitterUrl;

  /**
   * Pre-fetched tweet data (optional)
   * If not provided, will render a basic embed
   */
  data?: TwitterEmbedData;

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
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TwitterEmbed({
  url,
  parsed: parsedProp,
  data,
  showCloseButton = true,
  onClose,
  className,
}: TwitterEmbedProps) {
  const [useNativeEmbed, setUseNativeEmbed] = React.useState(true);
  const embedRef = React.useRef<HTMLDivElement>(null);

  // Parse URL if not provided
  const parsed = parsedProp || parseTwitterUrl(url);

  if (!parsed) {
    return (
      <TwitterEmbedFallback
        url={url}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  const { username, tweetId } = parsed;

  // Load Twitter widget script
  React.useEffect(() => {
    if (!useNativeEmbed || !tweetId) return;

    // Load Twitter widget script if not already loaded
    if (!(window as unknown as { twttr?: TwitterWidgets }).twttr) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      document.head.appendChild(script);

      script.onload = () => {
        renderTweet();
      };
    } else {
      renderTweet();
    }

    function renderTweet() {
      const twttr = (window as unknown as { twttr?: TwitterWidgets }).twttr;
      if (twttr && twttr.widgets && embedRef.current) {
        // Clear any existing content
        // sast-ignore: XSS -- assigning empty string to innerHTML is safe; clears content only
        embedRef.current.innerHTML = "";

        twttr.widgets
          .createTweet(tweetId!, embedRef.current, {
            theme: document.documentElement.classList.contains("dark")
              ? "dark"
              : "light",
            dnt: true,
            conversation: "none",
          })
          .catch(() => {
            setUseNativeEmbed(false);
          });
      }
    }
  }, [tweetId, useNativeEmbed]);

  // If no tweet ID, just show user profile link
  if (!tweetId) {
    return (
      <TwitterProfileCard
        url={url}
        username={username}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  // Use native Twitter embed
  if (useNativeEmbed) {
    return (
      <div className={cn("relative max-w-lg", className)}>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className={cn(
              "absolute -right-2 -top-2 z-10",
              "rounded-full border border-border bg-background p-1 shadow-md",
              "transition-colors hover:bg-muted",
            )}
            aria-label="Remove embed"
          >
            <CloseIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <div ref={embedRef} className="min-h-[100px] [&_.twitter-tweet]:!m-0">
          {/* Loading placeholder */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
            <TwitterIcon className="h-5 w-5 text-[#1DA1F2]" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback to custom embed if native fails
  if (data) {
    return (
      <TwitterCustomEmbed
        data={data}
        url={url}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  return (
    <TwitterEmbedFallback
      url={url}
      username={username}
      tweetId={tweetId}
      showCloseButton={showCloseButton}
      onClose={onClose}
      className={className}
    />
  );
}

// ============================================================================
// CUSTOM EMBED (when we have data)
// ============================================================================

interface TwitterCustomEmbedProps {
  data: TwitterEmbedData;
  url: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function TwitterCustomEmbed({
  data,
  url,
  showCloseButton,
  onClose,
  className,
}: TwitterCustomEmbedProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "cursor-pointer transition-colors hover:border-[#1DA1F2]/30",
        "max-w-lg",
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
      {/* Close button */}
      {showCloseButton && onClose && (
        <button
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
          aria-label="Remove embed"
        >
          <CloseIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <span className="text-lg font-medium">
                  {data.displayName?.[0] || data.username[0]}
                </span>
              </div>
            )}

            {/* Author info */}
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">
                  {data.displayName || data.username}
                </span>
                {data.verified && (
                  <VerifiedIcon className="h-4 w-4 text-[#1DA1F2]" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                @{data.username}
              </span>
            </div>
          </div>

          <TwitterIcon className="h-5 w-5 text-[#1DA1F2]" />
        </div>

        {/* Content */}
        {data.content && (
          <p className="mt-3 whitespace-pre-wrap text-foreground">
            {data.content}
          </p>
        )}

        {/* Media */}
        {data.media && data.media.length > 0 && (
          <div className="mt-3 grid gap-1 overflow-hidden rounded-xl">
            {data.media.map((item, index) => (
              <div key={index} className="relative">
                {item.type === "video" || item.type === "gif" ? (
                  <>
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt=""
                      className="w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-[#1DA1F2] p-3">
                        <PlayIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={item.url} alt="" className="w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quote tweet */}
        {data.quoteTweet && (
          <div className="mt-3 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{data.quoteTweet.displayName}</span>
              <span className="text-muted-foreground">
                @{data.quoteTweet.username}
              </span>
            </div>
            <p className="mt-1 line-clamp-3 text-sm text-foreground">
              {data.quoteTweet.content}
            </p>
          </div>
        )}

        {/* Timestamp */}
        {data.createdAt && (
          <p className="mt-3 text-sm text-muted-foreground">
            {formatTwitterDate(data.createdAt)}
          </p>
        )}

        {/* Stats */}
        {data.stats && (
          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
            {data.stats.replies !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ReplyIcon className="h-4 w-4" />
                <span>{formatNumber(data.stats.replies)}</span>
              </div>
            )}
            {data.stats.retweets !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <RetweetIcon className="h-4 w-4" />
                <span>{formatNumber(data.stats.retweets)}</span>
              </div>
            )}
            {data.stats.likes !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <HeartIcon className="h-4 w-4" />
                <span>{formatNumber(data.stats.likes)}</span>
              </div>
            )}
            {data.stats.views !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <EyeIcon className="h-4 w-4" />
                <span>{formatNumber(data.stats.views)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROFILE CARD
// ============================================================================

interface TwitterProfileCardProps {
  url: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followers?: number;
  verified?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function TwitterProfileCard({
  url,
  username,
  displayName,
  avatarUrl,
  bio,
  followers,
  verified,
  showCloseButton,
  onClose,
  className,
}: TwitterProfileCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-4",
        "cursor-pointer transition-colors hover:border-[#1DA1F2]/30",
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
            "bg-background/80 rounded-full p-1 backdrop-blur-sm",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background",
          )}
          aria-label="Remove embed"
        >
          <CloseIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DA1F2]">
            <span className="text-xl font-bold text-white">
              {(displayName || username)[0].toUpperCase()}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-bold text-foreground">
              {displayName || username}
            </span>
            {verified && (
              <VerifiedIcon className="h-4 w-4 flex-shrink-0 text-[#1DA1F2]" />
            )}
          </div>
          <span className="text-sm text-muted-foreground">@{username}</span>
        </div>

        <TwitterIcon className="h-5 w-5 flex-shrink-0 text-[#1DA1F2]" />
      </div>

      {bio && (
        <p className="mt-3 line-clamp-2 text-sm text-foreground">{bio}</p>
      )}

      {followers !== undefined && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {formatNumber(followers)}
          </span>{" "}
          followers
        </p>
      )}
    </div>
  );
}

// ============================================================================
// FALLBACK
// ============================================================================

interface TwitterEmbedFallbackProps {
  url: string;
  username?: string;
  tweetId?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function TwitterEmbedFallback({
  url,
  username,
  tweetId,
  showCloseButton,
  onClose,
  className,
}: TwitterEmbedFallbackProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-4",
        "cursor-pointer transition-colors hover:border-[#1DA1F2]/30",
        "max-w-lg",
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
            "bg-background/80 rounded-full p-1 backdrop-blur-sm",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background",
          )}
          aria-label="Remove embed"
        >
          <CloseIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DA1F2]">
          <TwitterIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {tweetId ? "View on Twitter" : `@${username || "Twitter"}`}
          </p>
          <p className="truncate text-sm text-muted-foreground">{url}</p>
        </div>
        <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTwitterDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateString;
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

// Twitter widget types
interface TwitterWidgets {
  widgets: {
    createTweet: (
      tweetId: string,
      container: HTMLElement,
      options: Record<string, unknown>,
    ) => Promise<HTMLElement>;
  };
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

function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828a.85.85 0 00.12.403.744.744 0 001.034.229c.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67a.75.75 0 00-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z" />
    </svg>
  );
}

function RetweetIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M23.77 15.67a.749.749 0 00-1.06 0l-2.22 2.22V7.65a3.755 3.755 0 00-3.75-3.75h-5.85a.75.75 0 000 1.5h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22a.749.749 0 10-1.06 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5a.747.747 0 000-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22a.752.752 0 001.062 0 .749.749 0 000-1.06l-3.5-3.5a.747.747 0 00-1.06 0l-3.5 3.5a.749.749 0 101.06 1.06l2.22-2.22V16.7a3.755 3.755 0 003.75 3.75h5.85a.75.75 0 000-1.5z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}

export default TwitterEmbed;
