/**
 * UserMention Component
 *
 * Renders an inline @user mention with appropriate styling.
 * Supports click to view profile and hover for preview.
 */

"use client";

import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface UserMentionProps {
  /** User ID */
  userId: string;
  /** Username (for display fallback) */
  username: string;
  /** Display name */
  displayName: string;
  /** Whether this mention is of the current user */
  isCurrentUser?: boolean;
  /** Whether the mention is resolved (user exists) */
  isResolved?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Hover handler for popover */
  onHoverStart?: () => void;
  /** Hover end handler */
  onHoverEnd?: () => void;
  /** Render mode */
  mode?: "chip" | "inline" | "link";
  /** Additional CSS class */
  className?: string;
  /** Children override (for custom rendering) */
  children?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export const UserMention = forwardRef<HTMLSpanElement, UserMentionProps>(
  function UserMention(
    {
      userId,
      username,
      displayName,
      isCurrentUser = false,
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

    const baseClasses = cn(
      "mention mention-user",
      mode === "chip" &&
        "inline-flex items-center px-1.5 py-0.5 rounded text-sm",
      mode === "inline" && "inline font-medium",
      mode === "link" && "inline underline",
      isCurrentUser && "mention-self bg-primary/20 text-primary font-semibold",
      !isCurrentUser && isResolved && "bg-primary/10 text-primary",
      !isResolved && "bg-muted/50 text-muted-foreground italic",
      onClick && "cursor-pointer hover:bg-primary/20 transition-colors",
      className,
    );

    return (
      <span
        ref={ref}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={baseClasses}
        data-user-id={userId}
        data-username={username}
        data-mention-type="user"
        onClick={handleClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        aria-label={`User mention: ${displayName}`}
      >
        {children || `@${displayName}`}
      </span>
    );
  },
);

// ============================================================================
// Compact Variant
// ============================================================================

export interface UserMentionCompactProps {
  username: string;
  displayName?: string;
  onClick?: () => void;
  className?: string;
}

export function UserMentionCompact({
  username,
  displayName,
  onClick,
  className,
}: UserMentionCompactProps) {
  return (
    <span
      className={cn(
        "cursor-pointer font-medium text-primary hover:underline",
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
    >
      @{displayName || username}
    </span>
  );
}

// ============================================================================
// Link Variant (for navigation)
// ============================================================================

export interface UserMentionLinkProps {
  userId: string;
  username: string;
  displayName: string;
  href?: string;
  className?: string;
}

export function UserMentionLink({
  userId,
  username,
  displayName,
  href,
  className,
}: UserMentionLinkProps) {
  const linkHref = href || `/users/${username}`;

  return (
    <a
      href={linkHref}
      className={cn(
        "mention mention-user inline font-medium text-primary hover:underline",
        className,
      )}
      data-user-id={userId}
      data-username={username}
    >
      @{displayName}
    </a>
  );
}

export default UserMention;
