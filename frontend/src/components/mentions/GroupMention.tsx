/**
 * GroupMention Component
 *
 * Renders @role mentions for role-based notifications (like Discord).
 * Also re-exports EveryoneMention for consistency.
 */

"use client";

import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { MentionableRole } from "@/lib/mentions/mention-types";

// Re-export group mentions from EveryoneMention
export {
  EveryoneMention,
  EveryoneMentionTag,
  HereMentionTag,
  ChannelGroupMentionTag,
  EveryoneMentionCompact,
  GroupMentionInfoBadge,
} from "./EveryoneMention";
export type { GroupMentionType, EveryoneMentionProps } from "./EveryoneMention";

// ============================================================================
// Types
// ============================================================================

export interface RoleMentionProps {
  /** Role data */
  role: MentionableRole;
  /** Whether the role exists/is accessible */
  isResolved?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Hover handler */
  onHoverStart?: () => void;
  /** Hover end handler */
  onHoverEnd?: () => void;
  /** Render mode */
  mode?: "chip" | "inline";
  /** Additional CSS class */
  className?: string;
  /** Children override */
  children?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export const RoleMention = forwardRef<HTMLSpanElement, RoleMentionProps>(
  function RoleMention(
    {
      role,
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

    // Use role color or default
    const roleColor = role.color || "hsl(var(--primary))";
    const bgColor = role.color
      ? `${role.color}20`
      : "hsl(var(--primary) / 0.1)";

    return (
      <span
        ref={ref}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn(
          "mention mention-role",
          mode === "chip" &&
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-sm",
          mode === "inline" && "inline font-medium",
          !isResolved && "italic opacity-50",
          onClick && "cursor-pointer transition-opacity hover:opacity-80",
          className,
        )}
        style={{
          backgroundColor: bgColor,
          color: roleColor,
        }}
        data-role-id={role.id}
        data-role-name={role.name}
        data-mention-type="role"
        onClick={handleClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        aria-label={`Role mention: ${role.name} (${role.memberCount} members)`}
      >
        {children || `@${role.name}`}
      </span>
    );
  },
);

// ============================================================================
// Role Badge (shows member count)
// ============================================================================

export interface RoleBadgeProps {
  role: MentionableRole;
  onClick?: () => void;
  className?: string;
}

export function RoleBadge({ role, onClick, className }: RoleBadgeProps) {
  const roleColor = role.color || "hsl(var(--muted-foreground))";
  const bgColor = role.color ? `${role.color}15` : "hsl(var(--muted))";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        onClick && "cursor-pointer transition-opacity hover:opacity-80",
        className,
      )}
      style={{
        backgroundColor: bgColor,
        color: roleColor,
      }}
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
      <svg
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <span>{role.name}</span>
      <span className="opacity-60">({role.memberCount})</span>
    </span>
  );
}

// ============================================================================
// Role Info Tooltip Content
// ============================================================================

export interface RoleMentionInfoProps {
  role: MentionableRole;
  className?: string;
}

export function RoleMentionInfo({ role, className }: RoleMentionInfoProps) {
  return (
    <div className={cn("space-y-2 p-2", className)}>
      <div className="flex items-center gap-2">
        <RoleBadge role={role} />
      </div>
      <div className="text-sm text-muted-foreground">
        <p>
          Mentioning this role will notify{" "}
          <strong>
            {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
          </strong>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// All Group Mentions Wrapper
// ============================================================================

export type GroupMentionVariant = "everyone" | "here" | "channel" | "role";

export interface GroupMentionProps {
  /** The variant of group mention */
  variant: GroupMentionVariant;
  /** Role data (required for 'role' variant) */
  role?: MentionableRole;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Unified GroupMention component that handles all group mention types
 */
export function GroupMention({
  variant,
  role,
  onClick,
  className,
}: GroupMentionProps) {
  if (variant === "role") {
    if (!role) {
      return (
        <span className={cn("italic text-muted-foreground", className)}>
          @unknown-role
        </span>
      );
    }
    return <RoleMention role={role} onClick={onClick} className={className} />;
  }

  // Everyone, here, or channel mention
  const { EveryoneMention } = require("./EveryoneMention");
  return (
    <EveryoneMention
      type={variant as "everyone" | "here" | "channel"}
      onClick={onClick}
      className={className}
    />
  );
}

export default RoleMention;
