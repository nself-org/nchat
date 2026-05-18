/**
 * MentionHighlight Component
 *
 * Wraps a message that contains mentions to the current user,
 * providing visual highlighting and optional notification badge.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MentionType } from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export type HighlightIntensity = "none" | "low" | "medium" | "high";

export interface MentionHighlightProps {
  /** The intensity of the highlight */
  intensity?: HighlightIntensity;
  /** Whether to show the mention indicator bar */
  showIndicator?: boolean;
  /** Position of the indicator */
  indicatorPosition?: "left" | "right";
  /** Additional CSS class */
  className?: string;
  /** Children content */
  children: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function MentionHighlight({
  intensity = "none",
  showIndicator = true,
  indicatorPosition = "left",
  className,
  children,
}: MentionHighlightProps) {
  if (intensity === "none") {
    return <>{children}</>;
  }

  const intensityClasses: Record<HighlightIntensity, string> = {
    none: "",
    low: "bg-primary/5",
    medium: "bg-primary/10",
    high: "bg-primary/15",
  };

  const indicatorClasses: Record<HighlightIntensity, string> = {
    none: "",
    low: "bg-primary/40",
    medium: "bg-primary/60",
    high: "bg-primary",
  };

  return (
    <div
      className={cn(
        "relative",
        intensityClasses[intensity],
        showIndicator && indicatorPosition === "left" && "pl-0.5",
        showIndicator && indicatorPosition === "right" && "pr-0.5",
        className,
      )}
      data-mention-highlight={intensity}
    >
      {showIndicator && (
        <div
          className={cn(
            "absolute bottom-0 top-0 w-0.5 rounded-full",
            indicatorPosition === "left" && "left-0",
            indicatorPosition === "right" && "right-0",
            indicatorClasses[intensity],
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Message Row Highlight Wrapper
// ============================================================================

export interface MentionHighlightRowProps {
  /** Whether the message mentions the current user */
  isMentioned?: boolean;
  /** The types of mentions in the message */
  mentionTypes?: MentionType[];
  /** Additional CSS class */
  className?: string;
  /** Children content */
  children: React.ReactNode;
}

/**
 * Determines highlight intensity based on mention types
 */
function getMentionIntensity(
  isMentioned: boolean,
  mentionTypes: MentionType[],
): HighlightIntensity {
  if (!isMentioned) return "none";

  // Direct user mention = highest priority
  if (mentionTypes.includes("user")) {
    return "high";
  }

  // @everyone = medium
  if (mentionTypes.includes("everyone")) {
    return "medium";
  }

  // @here or @channel = low
  if (mentionTypes.includes("here") || mentionTypes.includes("channel")) {
    return "low";
  }

  // Role mention = low
  if (mentionTypes.includes("role")) {
    return "low";
  }

  return "none";
}

export function MentionHighlightRow({
  isMentioned = false,
  mentionTypes = [],
  className,
  children,
}: MentionHighlightRowProps) {
  const intensity = getMentionIntensity(isMentioned, mentionTypes);

  return (
    <MentionHighlight
      intensity={intensity}
      showIndicator={intensity !== "none"}
      className={className}
    >
      {children}
    </MentionHighlight>
  );
}

// ============================================================================
// Inline Highlight (for text within messages)
// ============================================================================

export interface InlineMentionHighlightProps {
  /** Whether this is a self-mention */
  isSelfMention?: boolean;
  /** The mention type */
  mentionType?: MentionType;
  /** Additional CSS class */
  className?: string;
  /** Children content */
  children: React.ReactNode;
}

export function InlineMentionHighlight({
  isSelfMention = false,
  mentionType,
  className,
  children,
}: InlineMentionHighlightProps) {
  if (!isSelfMention && mentionType !== "everyone" && mentionType !== "here") {
    return <>{children}</>;
  }

  return (
    <span
      className={cn(
        "rounded px-0.5",
        isSelfMention && "bg-primary/20 text-primary",
        mentionType === "everyone" && "bg-warning/15 text-warning",
        mentionType === "here" && "bg-warning/10 text-warning",
        className,
      )}
      data-self-mention={isSelfMention || undefined}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Unread Mention Badge
// ============================================================================

export interface MentionBadgeProps {
  /** Number of unread mentions */
  count: number;
  /** Maximum count to display (shows "9+" for larger) */
  maxCount?: number;
  /** Whether to show when count is 0 */
  showZero?: boolean;
  /** Badge size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS class */
  className?: string;
}

export function MentionBadge({
  count,
  maxCount = 9,
  showZero = false,
  size = "md",
  className,
}: MentionBadgeProps) {
  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const sizeClasses: Record<string, string> = {
    sm: "h-4 min-w-4 text-[10px] px-1",
    md: "h-5 min-w-5 text-xs px-1.5",
    lg: "h-6 min-w-6 text-sm px-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "text-primary-foreground bg-primary font-medium",
        sizeClasses[size],
        className,
      )}
      aria-label={`${count} unread ${count === 1 ? "mention" : "mentions"}`}
    >
      {displayCount}
    </span>
  );
}

// ============================================================================
// Mention Dot Indicator
// ============================================================================

export interface MentionDotProps {
  /** Mention type for color coding */
  type?: "direct" | "group" | "any";
  /** Additional CSS class */
  className?: string;
}

export function MentionDot({ type = "any", className }: MentionDotProps) {
  const colorClasses: Record<string, string> = {
    direct: "bg-primary",
    group: "bg-warning",
    any: "bg-primary",
  };

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        colorClasses[type],
        className,
      )}
      aria-hidden="true"
    />
  );
}

export default MentionHighlight;
