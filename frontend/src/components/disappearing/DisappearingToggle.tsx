"use client";

import { useState, useCallback } from "react";
import { Timer, TimerOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/disappearing";

interface DisappearingToggleProps {
  /** Whether disappearing messages is enabled */
  enabled: boolean;
  /** Current timer duration in seconds */
  duration?: number;
  /** Callback when toggled */
  onToggle: (enabled: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Show the current duration label */
  showDuration?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

/**
 * Toggle component for enabling/disabling disappearing messages.
 */
export function DisappearingToggle({
  enabled,
  duration,
  onToggle,
  disabled = false,
  showDuration = true,
  size = "md",
  className,
}: DisappearingToggleProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = useCallback(
    (checked: boolean) => {
      onToggle(checked);
    },
    [onToggle],
  );

  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 rounded-md transition-colors",
              isHovered && "bg-muted/50",
              className,
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-2">
              {enabled ? (
                <Timer
                  size={iconSize}
                  className={cn(
                    "text-primary transition-colors",
                    disabled && "text-muted-foreground",
                  )}
                />
              ) : (
                <TimerOff
                  size={iconSize}
                  className={cn(
                    "text-muted-foreground transition-colors",
                    disabled && "opacity-50",
                  )}
                />
              )}

              <Label
                htmlFor="disappearing-toggle"
                className={cn(
                  textSize,
                  "cursor-pointer select-none",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                Disappearing messages
                {showDuration && enabled && duration && duration > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({formatDuration(duration)})
                  </span>
                )}
              </Label>
            </div>

            <Switch
              id="disappearing-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={disabled}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {enabled
              ? "Messages will automatically disappear"
              : "Enable disappearing messages"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact toggle for inline use (e.g., in message composer).
 */
export function DisappearingToggleCompact({
  enabled,
  duration,
  onToggle,
  disabled = false,
  className,
}: Omit<DisappearingToggleProps, "showDuration" | "size">) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onToggle(!enabled)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
              enabled
                ? "bg-primary/10 hover:bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            {enabled ? <Timer size={12} /> : <TimerOff size={12} />}
            {enabled && duration && duration > 0 && (
              <span>{formatDuration(duration)}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>
            {enabled
              ? `Disappearing: ${formatDuration(duration || 0)}`
              : "Disappearing messages off"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DisappearingToggle;
