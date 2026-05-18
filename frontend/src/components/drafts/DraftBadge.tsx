"use client";

/**
 * DraftBadge - Badge showing draft count
 *
 * Displays total number of drafts, typically in sidebar
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDraftCount } from "@/hooks/useDrafts";

// ============================================================================
// Types
// ============================================================================

export interface DraftBadgeProps {
  /** Override the count (otherwise uses store) */
  count?: number;
  /** Maximum count to display (e.g., 99+) */
  maxCount?: number;
  /** Show badge when count is 0 */
  showZero?: boolean;
  /** Badge variant */
  variant?: "default" | "secondary" | "outline" | "destructive";
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Show tooltip */
  showTooltip?: boolean;
  /** Animate on count change */
  animate?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses = {
  sm: "h-4 min-w-[16px] px-1 text-[10px]",
  default: "h-5 min-w-[20px] px-1.5 text-xs",
  lg: "h-6 min-w-[24px] px-2 text-sm",
};

// ============================================================================
// Component
// ============================================================================

export function DraftBadge({
  count: countProp,
  maxCount = 99,
  showZero = false,
  variant = "secondary",
  size = "default",
  showTooltip = true,
  animate = true,
  className,
}: DraftBadgeProps) {
  const storeCount = useDraftCount();
  const count = countProp ?? storeCount;

  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format count
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Tooltip text
  const tooltipText =
    count === 0 ? "No drafts" : count === 1 ? "1 draft" : `${count} drafts`;

  const badge = (
    <Badge
      variant={variant}
      className={cn(
        "font-medium tabular-nums",
        sizeClasses[size],
        animate && "transition-all duration-200",
        count > 0 && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
        className,
      )}
    >
      {displayCount}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Inline Draft Badge
// ============================================================================

export interface DraftBadgeInlineProps {
  count?: number;
  className?: string;
}

/**
 * Inline text badge for draft count
 */
export function DraftBadgeInline({
  count: countProp,
  className,
}: DraftBadgeInlineProps) {
  const storeCount = useDraftCount();
  const count = countProp ?? storeCount;

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-amber-600",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {count} draft{count !== 1 ? "s" : ""}
    </span>
  );
}

// ============================================================================
// Dot Badge
// ============================================================================

export interface DraftDotBadgeProps {
  count?: number;
  showCount?: boolean;
  className?: string;
}

/**
 * Simple dot badge that indicates drafts exist
 */
export function DraftDotBadge({
  count: countProp,
  showCount = false,
  className,
}: DraftDotBadgeProps) {
  const storeCount = useDraftCount();
  const count = countProp ?? storeCount;

  if (count === 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      {showCount && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </span>
  );
}

export default DraftBadge;
