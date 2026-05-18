"use client";

/**
 * DraftIndicator - Shows that a channel/thread/DM has a draft
 *
 * Small visual indicator (dot or icon) displayed next to channel name
 */

import * as React from "react";
import { FileEdit, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DraftContextType } from "@/lib/drafts/draft-types";
import { useHasDraft } from "@/hooks/useDrafts";
import { createContextKey } from "@/lib/drafts";

// ============================================================================
// Types
// ============================================================================

export interface DraftIndicatorProps {
  /** Context type */
  contextType: DraftContextType;
  /** Context ID */
  contextId: string;
  /** Show as dot (default) or icon */
  variant?: "dot" | "icon";
  /** Size of indicator */
  size?: "sm" | "md" | "lg";
  /** Show tooltip */
  showTooltip?: boolean;
  /** Custom tooltip text */
  tooltipText?: string;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses = {
  dot: {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  },
  icon: {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  },
};

// ============================================================================
// Component
// ============================================================================

export function DraftIndicator({
  contextType,
  contextId,
  variant = "dot",
  size = "sm",
  showTooltip = true,
  tooltipText,
  className,
}: DraftIndicatorProps) {
  const contextKey = createContextKey(contextType, contextId);
  const hasDraft = useHasDraft(contextKey);

  if (!hasDraft) return null;

  const defaultTooltip = `Draft in progress`;

  const indicator =
    variant === "dot" ? (
      <span
        className={cn(
          "inline-block rounded-full bg-amber-500",
          sizeClasses.dot[size],
          className,
        )}
        aria-label="Has draft"
      />
    ) : (
      <Pencil
        className={cn("text-amber-500", sizeClasses.icon[size], className)}
        aria-label="Has draft"
      />
    );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="top">
          {tooltipText || defaultTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Channel draft indicator
 */
export function ChannelDraftIndicator({
  channelId,
  ...props
}: Omit<DraftIndicatorProps, "contextType" | "contextId"> & {
  channelId: string;
}) {
  return (
    <DraftIndicator contextType="channel" contextId={channelId} {...props} />
  );
}

/**
 * Thread draft indicator
 */
export function ThreadDraftIndicator({
  threadId,
  ...props
}: Omit<DraftIndicatorProps, "contextType" | "contextId"> & {
  threadId: string;
}) {
  return (
    <DraftIndicator contextType="thread" contextId={threadId} {...props} />
  );
}

/**
 * DM draft indicator
 */
export function DMDraftIndicator({
  conversationId,
  ...props
}: Omit<DraftIndicatorProps, "contextType" | "contextId"> & {
  conversationId: string;
}) {
  return (
    <DraftIndicator contextType="dm" contextId={conversationId} {...props} />
  );
}

export default DraftIndicator;
