/**
 * Call Button Component
 *
 * Initiates voice or video calls with a user or channel.
 */

"use client";

import * as React from "react";
import { Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// =============================================================================
// Variants
// =============================================================================

const callButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 transition-all",
  {
    variants: {
      variant: {
        default: "",
        ghost: "",
        outline: "",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
        icon: "",
      },
      callType: {
        voice:
          "hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400",
        video:
          "hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "icon",
      callType: "voice",
    },
  },
);

// =============================================================================
// Types
// =============================================================================

export interface CallButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof callButtonVariants> {
  callType?: "voice" | "video";
  onInitiateCall?: () => void;
  loading?: boolean;
  showLabel?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CallButton({
  className,
  variant,
  size,
  callType = "voice",
  onInitiateCall,
  loading = false,
  showLabel = false,
  disabled,
  ...props
}: CallButtonProps) {
  const Icon = callType === "voice" ? Phone : Video;
  const label = callType === "voice" ? "Voice Call" : "Video Call";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onInitiateCall?.();
  };

  return (
    <Button
      variant={variant as "default" | "ghost" | "outline"}
      size={size === "md" ? "default" : (size as "sm" | "lg" | "icon")}
      className={cn(callButtonVariants({ variant, size, callType }), className)}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon className={cn("h-4 w-4", loading && "animate-pulse")} />
      {showLabel && <span className="ml-2">{label}</span>}
    </Button>
  );
}

CallButton.displayName = "CallButton";
