/**
 * EveryoneMention Component
 *
 * Renders @everyone, @here, and @channel group mentions.
 * These mentions notify multiple users at once.
 */

"use client";

import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type GroupMentionType = "everyone" | "here" | "channel";

export interface EveryoneMentionProps {
  /** The type of group mention */
  type: GroupMentionType;
  /** Click handler */
  onClick?: () => void;
  /** Hover handler */
  onHoverStart?: () => void;
  /** Hover end handler */
  onHoverEnd?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Children override */
  children?: React.ReactNode;
}

// ============================================================================
// Configuration
// ============================================================================

const GROUP_MENTION_CONFIG: Record<
  GroupMentionType,
  {
    label: string;
    description: string;
    ariaLabel: string;
  }
> = {
  everyone: {
    label: "@everyone",
    description: "Notifies all workspace members",
    ariaLabel: "Mention everyone in the workspace",
  },
  here: {
    label: "@here",
    description: "Notifies online members only",
    ariaLabel: "Mention online members",
  },
  channel: {
    label: "@channel",
    description: "Notifies all channel members",
    ariaLabel: "Mention all channel members",
  },
};

// ============================================================================
// Component
// ============================================================================

export const EveryoneMention = forwardRef<
  HTMLSpanElement,
  EveryoneMentionProps
>(function EveryoneMention(
  { type, onClick, onHoverStart, onHoverEnd, className, children },
  ref,
) {
  const config = GROUP_MENTION_CONFIG[type];

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <span
      ref={ref}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "mention mention-group",
        "inline-flex items-center rounded px-1.5 py-0.5 text-sm",
        "bg-warning/15 text-warning font-semibold",
        onClick && "hover:bg-warning/25 cursor-pointer transition-colors",
        className,
      )}
      data-mention-type={type}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      aria-label={config.ariaLabel}
      title={config.description}
    >
      {children || config.label}
    </span>
  );
});

// ============================================================================
// Specialized Components
// ============================================================================

export interface SpecificGroupMentionProps {
  onClick?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  className?: string;
}

/**
 * @everyone mention - notifies all workspace members
 */
export function EveryoneMentionTag(props: SpecificGroupMentionProps) {
  return <EveryoneMention type="everyone" {...props} />;
}

/**
 * @here mention - notifies online members only
 */
export function HereMentionTag(props: SpecificGroupMentionProps) {
  return <EveryoneMention type="here" {...props} />;
}

/**
 * @channel mention - notifies all channel members
 */
export function ChannelGroupMentionTag(props: SpecificGroupMentionProps) {
  return <EveryoneMention type="channel" {...props} />;
}

// ============================================================================
// Compact Variant
// ============================================================================

export function EveryoneMentionCompact({
  type,
  onClick,
  className,
}: {
  type: GroupMentionType;
  onClick?: () => void;
  className?: string;
}) {
  const config = GROUP_MENTION_CONFIG[type];

  return (
    <span
      className={cn(
        "text-warning cursor-pointer font-semibold hover:underline",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={config.description}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// Info Badge (for explaining group mentions)
// ============================================================================

export function GroupMentionInfoBadge({
  type,
  memberCount,
  onlineCount,
  className,
}: {
  type: GroupMentionType;
  memberCount?: number;
  onlineCount?: number;
  className?: string;
}) {
  const getCountText = () => {
    switch (type) {
      case "everyone":
        return memberCount
          ? `Will notify ${memberCount} ${memberCount === 1 ? "member" : "members"}`
          : "Will notify all members";
      case "here":
        return onlineCount
          ? `Will notify ${onlineCount} online ${onlineCount === 1 ? "member" : "members"}`
          : "Will notify online members";
      case "channel":
        return memberCount
          ? `Will notify ${memberCount} channel ${memberCount === 1 ? "member" : "members"}`
          : "Will notify channel members";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1",
        "bg-warning/10 text-warning text-xs",
        className,
      )}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>{getCountText()}</span>
    </div>
  );
}

export default EveryoneMention;
