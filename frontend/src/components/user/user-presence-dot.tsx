"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  getPresenceColor,
  getPresenceLabel,
} from "@/stores/user-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Variants
// ============================================================================

const presenceDotVariants = cva(
  "rounded-full border-2 border-background flex-shrink-0",
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

export interface UserPresenceDotProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof presenceDotVariants> {
  status: PresenceStatus;
  showTooltip?: boolean;
  animate?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const UserPresenceDot = React.forwardRef<HTMLSpanElement, UserPresenceDotProps>(
  (
    {
      className,
      status,
      size,
      position,
      showTooltip = false,
      animate = true,
      ...props
    },
    ref,
  ) => {
    const color = getPresenceColor(status);
    const label = getPresenceLabel(status);

    const dot = (
      <span
        ref={ref}
        className={cn(presenceDotVariants({ size, position }), className)}
        style={{ backgroundColor: color }}
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
        {/* DND icon */}
        {status === "dnd" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-[2px] w-[60%] rounded-full bg-background" />
          </span>
        )}
      </span>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{dot}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return dot;
  },
);
UserPresenceDot.displayName = "UserPresenceDot";

export { UserPresenceDot, presenceDotVariants };
