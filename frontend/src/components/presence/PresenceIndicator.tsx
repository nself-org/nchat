"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  getPresenceColor,
  getPresenceLabel,
} from "@/lib/presence/presence-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Variants
// ============================================================================

const presenceIndicatorVariants = cva(
  "rounded-full border-2 border-background flex-shrink-0 relative",
  {
    variants: {
      size: {
        xs: "h-2 w-2",
        sm: "h-2.5 w-2.5",
        md: "h-3 w-3",
        lg: "h-3.5 w-3.5",
        xl: "h-4 w-4",
      },
      position: {
        "bottom-right": "absolute bottom-0 right-0",
        "bottom-left": "absolute bottom-0 left-0",
        "top-right": "absolute top-0 right-0",
        "top-left": "absolute top-0 left-0",
        inline: "relative",
      },
    },
    defaultVariants: {
      size: "md",
      position: "bottom-right",
    },
  },
);

// ============================================================================
// Types
// ============================================================================

export interface PresenceIndicatorProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof presenceIndicatorVariants> {
  /**
   * The presence status to display
   */
  status: PresenceStatus;

  /**
   * Whether to show a tooltip on hover
   * @default false
   */
  showTooltip?: boolean;

  /**
   * Whether to animate the indicator (pulse for online)
   * @default true
   */
  animate?: boolean;

  /**
   * Custom tooltip content (overrides default label)
   */
  tooltipContent?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

const PresenceIndicator = React.forwardRef<
  HTMLSpanElement,
  PresenceIndicatorProps
>(
  (
    {
      className,
      status,
      size,
      position,
      showTooltip = false,
      animate = true,
      tooltipContent,
      ...props
    },
    ref,
  ) => {
    const color = getPresenceColor(status);
    const label = getPresenceLabel(status);

    // Don't render for invisible status
    if (status === "invisible") {
      return null;
    }

    const indicator = (
      <span
        ref={ref}
        className={cn(presenceIndicatorVariants({ size, position }), className)}
        style={{ backgroundColor: color }}
        role="status"
        aria-label={label}
        {...props}
      >
        {/* Pulse animation for online status */}
        {animate && status === "online" && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-75"
            style={{ backgroundColor: color }}
          />
        )}
        {/* DND minus icon */}
        {status === "dnd" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-[2px] w-[60%] rounded-full bg-background" />
          </span>
        )}
        {/* Away clock icon (simple dot for small sizes) */}
        {status === "away" && size !== "xs" && size !== "sm" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-[40%] w-[40%] rounded-full bg-background" />
          </span>
        )}
      </span>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{indicator}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tooltipContent ?? label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return indicator;
  },
);

PresenceIndicator.displayName = "PresenceIndicator";

export { PresenceIndicator, presenceIndicatorVariants };
