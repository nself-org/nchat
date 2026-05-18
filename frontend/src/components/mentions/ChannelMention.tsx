/**
 * ChannelMention Component
 *
 * Renders an inline #channel mention with appropriate styling.
 * Supports click to navigate and hover for preview.
 */

"use client";

import * as React from "react";
import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ChannelMentionProps {
  /** Channel ID */
  channelId: string;
  /** Channel slug (for URL) */
  channelSlug: string;
  /** Channel name (for display) */
  channelName: string;
  /** Channel type */
  channelType?: "public" | "private" | "direct" | "group";
  /** Whether the channel exists/is accessible */
  isResolved?: boolean;
  /** Click handler (overrides default navigation) */
  onClick?: () => void;
  /** Hover handler for popover */
  onHoverStart?: () => void;
  /** Hover end handler */
  onHoverEnd?: () => void;
  /** Render mode */
  mode?: "chip" | "inline" | "link";
  /** Additional CSS class */
  className?: string;
  /** Children override */
  children?: React.ReactNode;
}

// ============================================================================
// Icons
// ============================================================================

const HashIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("h-3.5 w-3.5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
    />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("h-3.5 w-3.5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export const ChannelMention = forwardRef<HTMLSpanElement, ChannelMentionProps>(
  function ChannelMention(
    {
      channelId,
      channelSlug,
      channelName,
      channelType = "public",
      isResolved = true,
      onClick,
      onHoverStart,
      onHoverEnd,
      mode = "chip",
      className,
      children,
    },
    ref,
  ) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (onClick) {
        onClick();
      } else if (isResolved) {
        // Default navigation to channel
        router.push(`/chat/${channelSlug}`);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick(e as unknown as React.MouseEvent);
      }
    };

    const Icon = channelType === "private" ? LockIcon : HashIcon;

    const baseClasses = cn(
      "mention mention-channel",
      mode === "chip" &&
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm",
      mode === "inline" && "inline font-medium",
      mode === "link" && "inline underline",
      isResolved && "bg-secondary/15 text-secondary-foreground",
      !isResolved && "bg-muted/50 text-muted-foreground italic",
      "cursor-pointer hover:bg-secondary/25 transition-colors",
      className,
    );

    return (
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        className={baseClasses}
        data-channel-id={channelId}
        data-channel-slug={channelSlug}
        data-mention-type="channel"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        aria-label={`Channel mention: ${channelName}`}
      >
        {children || (
          <>
            {mode === "chip" && <Icon className="mr-0.5" />}
            {mode !== "chip" && "#"}
            {channelName}
          </>
        )}
      </span>
    );
  },
);

// ============================================================================
// Compact Variant
// ============================================================================

export interface ChannelMentionCompactProps {
  channelSlug: string;
  channelName: string;
  channelType?: "public" | "private";
  onClick?: () => void;
  className?: string;
}

export function ChannelMentionCompact({
  channelSlug,
  channelName,
  channelType = "public",
  onClick,
  className,
}: ChannelMentionCompactProps) {
  return (
    <span
      className={cn(
        "text-secondary-foreground cursor-pointer font-medium hover:underline",
        className,
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {channelType === "private" ? (
        <LockIcon className="-mt-0.5 mr-0.5 inline" />
      ) : (
        "#"
      )}
      {channelName}
    </span>
  );
}

// ============================================================================
// Link Variant (for navigation)
// ============================================================================

export interface ChannelMentionLinkProps {
  channelId: string;
  channelSlug: string;
  channelName: string;
  channelType?: "public" | "private";
  href?: string;
  className?: string;
}

export function ChannelMentionLink({
  channelId,
  channelSlug,
  channelName,
  channelType = "public",
  href,
  className,
}: ChannelMentionLinkProps) {
  const linkHref = href || `/chat/${channelSlug}`;
  const Icon = channelType === "private" ? LockIcon : HashIcon;

  return (
    <a
      href={linkHref}
      className={cn(
        "mention mention-channel text-secondary-foreground inline-flex items-center gap-0.5 font-medium hover:underline",
        className,
      )}
      data-channel-id={channelId}
      data-channel-slug={channelSlug}
    >
      <Icon className="-mt-0.5" />
      {channelName}
    </a>
  );
}

export default ChannelMention;
