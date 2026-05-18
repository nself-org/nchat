"use client";

import * as React from "react";
import { Pin, PinOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PinButtonProps {
  /** Whether the message is currently pinned */
  isPinned: boolean;
  /** Callback when pin/unpin is clicked */
  onToggle: () => void;
  /** Whether the action is in progress */
  isLoading?: boolean;
  /** Whether the user has permission to pin */
  canPin?: boolean;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Button variant */
  variant?: "icon" | "button" | "menu";
  /** Show label */
  showLabel?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Button to pin or unpin a message.
 */
export function PinButton({
  isPinned,
  onToggle,
  isLoading = false,
  canPin = true,
  size = "sm",
  variant = "icon",
  showLabel = false,
  className,
}: PinButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const label = isPinned ? "Unpin message" : "Pin message";
  const Icon = isPinned ? PinOff : Pin;

  if (!canPin) {
    return null;
  }

  if (variant === "menu") {
    return (
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        <span>{label}</span>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        variant={isPinned ? "secondary" : "outline"}
        size={size === "sm" ? "sm" : "default"}
        onClick={onToggle}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin")} />
        ) : (
          <Icon className={iconSizes[size]} />
        )}
        {showLabel && <span className="ml-2">{label}</span>}
      </Button>
    );
  }

  // Icon variant (default)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            disabled={isLoading}
            className={cn(
              sizeClasses[size],
              isPinned && "text-amber-500 hover:text-amber-600",
              className,
            )}
          >
            {isLoading ? (
              <Loader2 className={cn(iconSizes[size], "animate-spin")} />
            ) : (
              <Icon className={iconSizes[size]} />
            )}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
