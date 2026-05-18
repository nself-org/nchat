"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  type CustomStatus,
  getPresenceLabel,
  getPresenceColor,
  isStatusExpired,
} from "@/lib/presence/presence-types";
import { PresenceIndicator } from "./PresenceIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Variants
// ============================================================================

const presenceBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        subtle: "bg-transparent",
        outline: "border bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

// ============================================================================
// Types
// ============================================================================

export interface PresenceBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof presenceBadgeVariants> {
  /**
   * Presence status
   */
  status: PresenceStatus;

  /**
   * Custom status
   */
  customStatus?: CustomStatus;

  /**
   * Whether to show the indicator dot
   * @default true
   */
  showIndicator?: boolean;

  /**
   * Whether to show the status label
   * @default true
   */
  showLabel?: boolean;

  /**
   * Whether to show custom status emoji/text
   * @default false
   */
  showCustomStatus?: boolean;

  /**
   * Whether to show tooltip
   * @default false
   */
  showTooltip?: boolean;

  /**
   * Maximum length for custom status text
   * @default 20
   */
  maxCustomStatusLength?: number;
}

// ============================================================================
// Component
// ============================================================================

const PresenceBadge = React.forwardRef<HTMLSpanElement, PresenceBadgeProps>(
  (
    {
      className,
      status,
      customStatus,
      variant,
      size,
      showIndicator = true,
      showLabel = true,
      showCustomStatus = false,
      showTooltip = false,
      maxCustomStatusLength = 20,
      ...props
    },
    ref,
  ) => {
    const label = getPresenceLabel(status);
    const hasCustomStatus =
      customStatus &&
      (customStatus.emoji || customStatus.text) &&
      !isStatusExpired(customStatus);

    const indicatorSize = size === "lg" ? "sm" : "xs";

    // Build display content
    const displayText =
      showCustomStatus && hasCustomStatus
        ? customStatus?.text
          ? customStatus.text.length > maxCustomStatusLength
            ? `${customStatus.text.slice(0, maxCustomStatusLength)}...`
            : customStatus.text
          : null
        : showLabel
          ? label
          : null;

    const displayEmoji =
      showCustomStatus && hasCustomStatus ? customStatus?.emoji : null;

    const badge = (
      <span
        ref={ref}
        className={cn(presenceBadgeVariants({ variant, size }), className)}
        {...props}
      >
        {showIndicator && (
          <PresenceIndicator
            status={status}
            size={indicatorSize}
            position="inline"
            animate={false}
          />
        )}
        {displayEmoji && <span>{displayEmoji}</span>}
        {displayText && <span>{displayText}</span>}
      </span>
    );

    if (showTooltip) {
      const tooltipContent = hasCustomStatus
        ? `${label}${customStatus?.text ? ` - ${customStatus.text}` : ""}`
        : label;

      return (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  },
);

PresenceBadge.displayName = "PresenceBadge";

// ============================================================================
// Status Pill (colored background)
// ============================================================================

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PresenceStatus;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ status, className, ...props }, ref) => {
    const label = getPresenceLabel(status);
    const color = getPresenceColor(status);

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
          className,
        )}
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
        {...props}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
    );
  },
);

StatusPill.displayName = "StatusPill";

// ============================================================================
// Mini Badge (just the dot and optionally status text)
// ============================================================================

export interface MiniBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PresenceStatus;
  showText?: boolean;
}

export const MiniBadge = React.forwardRef<HTMLSpanElement, MiniBadgeProps>(
  ({ status, showText = false, className, ...props }, ref) => {
    const label = getPresenceLabel(status);

    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-1", className)}
        {...props}
      >
        <PresenceIndicator
          status={status}
          size="xs"
          position="inline"
          animate={false}
        />
        {showText && (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
      </span>
    );
  },
);

MiniBadge.displayName = "MiniBadge";

// ============================================================================
// Exports
// ============================================================================

export { PresenceBadge, presenceBadgeVariants };
