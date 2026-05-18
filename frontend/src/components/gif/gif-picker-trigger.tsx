"use client";

/**
 * GIF Picker Trigger Component
 *
 * Button to toggle the GIF picker popover with proper positioning.
 *
 * @example
 * ```tsx
 * <GifPickerTrigger
 *   onSelect={(gif) => sendMessage({ gif })}
 *   tooltip="Add a GIF"
 * />
 * ```
 */

import { useState, useCallback, memo } from "react";
import { Image, ImagePlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeature, FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { GifPicker } from "./gif-picker";
import type { Gif, GifPickerTriggerProps } from "@/types/gif";

// ============================================================================
// Main GIF Picker Trigger Component
// ============================================================================

export interface GifPickerTriggerFullProps extends GifPickerTriggerProps {
  onSelect: (gif: Gif) => void;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export const GifPickerTrigger = memo(function GifPickerTrigger({
  onSelect,
  open: controlledOpen,
  onToggle,
  disabled = false,
  className,
  tooltip = "Add a GIF",
  children,
  side = "top",
  align = "start",
  sideOffset = 8,
}: GifPickerTriggerFullProps) {
  // Feature flag check
  const { enabled: gifPickerEnabled } = useFeature(FEATURES.GIF_PICKER);

  // Internal open state (if not controlled)
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  // Handle open change
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(open);
      }
      if (!open && onToggle) {
        onToggle();
      }
    },
    [controlledOpen, onToggle],
  );

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (controlledOpen === undefined) {
      setInternalOpen((prev) => !prev);
    } else {
      onToggle?.();
    }
  }, [controlledOpen, onToggle]);

  // Handle GIF selection
  const handleSelect = useCallback(
    (gif: Gif) => {
      onSelect(gif);
      handleOpenChange(false);
    },
    [onSelect, handleOpenChange],
  );

  // Don't render if feature is disabled
  if (!gifPickerEnabled) {
    return null;
  }

  const triggerButton = children || (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className={cn(
        "h-8 w-8 rounded-lg",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-accent",
        isOpen && "bg-accent text-foreground",
        className,
      )}
      aria-label={tooltip}
    >
      <GifIcon className="h-5 w-5" />
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <GifPicker
          onSelect={handleSelect}
          onClose={() => handleOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// GIF Icon Component
// ============================================================================

function GifIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="8"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        GIF
      </text>
    </svg>
  );
}

// ============================================================================
// Inline GIF Button (for message input toolbars)
// ============================================================================

export interface GifButtonProps {
  onSelect: (gif: Gif) => void;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export const GifButton = memo(function GifButton({
  onSelect,
  disabled = false,
  className,
  tooltip = "Add a GIF",
  variant = "ghost",
  size = "icon",
}: GifButtonProps) {
  const { enabled: gifPickerEnabled } = useFeature(FEATURES.GIF_PICKER);
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (gif: Gif) => {
      onSelect(gif);
      setOpen(false);
    },
    [onSelect],
  );

  if (!gifPickerEnabled) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={variant}
                size={size}
                disabled={disabled}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  open && "bg-accent text-foreground",
                  className,
                )}
              >
                <GifIcon className="h-5 w-5" />
                <span className="sr-only">{tooltip}</span>
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <GifPicker onSelect={handleSelect} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// Simple GIF Toggle (no popover, just a button)
// ============================================================================

export interface GifToggleProps {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

export const GifToggle = memo(function GifToggle({
  active = false,
  onClick,
  disabled = false,
  className,
  tooltip = "GIFs",
}: GifToggleProps) {
  const { enabled: gifPickerEnabled } = useFeature(FEATURES.GIF_PICKER);

  if (!gifPickerEnabled) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "h-8 w-8 rounded-lg",
              "text-muted-foreground hover:text-foreground",
              active && "bg-accent text-foreground",
              className,
            )}
          >
            <GifIcon className="h-5 w-5" />
            <span className="sr-only">{tooltip}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// Exports
// ============================================================================

export { GifIcon };
export default GifPickerTrigger;
