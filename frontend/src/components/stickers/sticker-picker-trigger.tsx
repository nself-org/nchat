"use client";

import { forwardRef, useState, useCallback } from "react";
import { Sticker as StickerIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
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
import { StickerPicker } from "./sticker-picker";
import type { Sticker } from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerPickerTriggerProps extends Omit<
  ButtonProps,
  "onClick"
> {
  onStickerSelect: (sticker: Sticker) => void;
  onManageClick?: () => void;
  onAddPackClick?: () => void;
  tooltipText?: string;
  showTooltip?: boolean;
  pickerSide?: "top" | "right" | "bottom" | "left";
  pickerAlign?: "start" | "center" | "end";
  iconClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ============================================================================
// STICKER PICKER TRIGGER COMPONENT
// ============================================================================

export const StickerPickerTrigger = forwardRef<
  HTMLButtonElement,
  StickerPickerTriggerProps
>(
  (
    {
      onStickerSelect,
      onManageClick,
      onAddPackClick,
      tooltipText = "Send sticker",
      showTooltip = true,
      pickerSide = "top",
      pickerAlign = "start",
      iconClassName,
      className,
      variant = "ghost",
      size = "icon",
      disabled,
      open: controlledOpen,
      onOpenChange: controlledOnOpenChange,
      ...props
    },
    ref,
  ) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // Support both controlled and uncontrolled modes
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled
      ? (value: boolean) => controlledOnOpenChange?.(value)
      : setInternalOpen;

    const handleStickerSelect = useCallback(
      (sticker: Sticker) => {
        onStickerSelect(sticker);
        setOpen(false);
      },
      [onStickerSelect, setOpen],
    );

    const handleClose = useCallback(() => {
      setOpen(false);
    }, [setOpen]);

    const buttonElement = (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
        disabled={disabled}
        {...props}
      >
        <StickerIcon className={cn("h-5 w-5", iconClassName)} />
        <span className="sr-only">{tooltipText}</span>
      </Button>
    );

    const buttonWithPicker = (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          {buttonElement}
        </PopoverTrigger>
        <PopoverContent
          side={pickerSide}
          align={pickerAlign}
          className="w-auto border-0 p-0 shadow-xl"
          sideOffset={8}
        >
          <StickerPicker
            onStickerSelect={handleStickerSelect}
            onClose={handleClose}
            onManageClick={onManageClick}
            onAddPackClick={onAddPackClick}
          />
        </PopoverContent>
      </Popover>
    );

    if (!showTooltip) {
      return buttonWithPicker;
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonWithPicker}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

StickerPickerTrigger.displayName = "StickerPickerTrigger";

// ============================================================================
// COMPACT STICKER BUTTON (for inline use)
// ============================================================================

export interface CompactStickerButtonProps {
  onStickerSelect: (sticker: Sticker) => void;
  className?: string;
  disabled?: boolean;
}

export function CompactStickerButton({
  onStickerSelect,
  className,
  disabled,
}: CompactStickerButtonProps) {
  const [open, setOpen] = useState(false);

  const handleStickerSelect = useCallback(
    (sticker: Sticker) => {
      onStickerSelect(sticker);
      setOpen(false);
    },
    [onStickerSelect],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground hover:text-foreground",
            "transition-colors hover:bg-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <StickerIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-auto border-0 p-0 shadow-xl"
        sideOffset={8}
      >
        <StickerPicker
          onStickerSelect={handleStickerSelect}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// MESSAGE INPUT STICKER BUTTON
// ============================================================================

export interface MessageInputStickerButtonProps {
  onStickerSelect: (sticker: Sticker) => void;
  onManageClick?: () => void;
  onAddPackClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function MessageInputStickerButton({
  onStickerSelect,
  onManageClick,
  onAddPackClick,
  className,
  disabled,
}: MessageInputStickerButtonProps) {
  const [open, setOpen] = useState(false);

  const handleStickerSelect = useCallback(
    (sticker: Sticker) => {
      onStickerSelect(sticker);
      setOpen(false);
    },
    [onStickerSelect],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                className={cn(
                  "h-8 w-8 p-0 text-muted-foreground hover:text-foreground",
                  className,
                )}
              >
                <StickerIcon className="h-5 w-5" />
                <span className="sr-only">Send sticker</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-auto border-0 p-0 shadow-xl"
            sideOffset={8}
          >
            <StickerPicker
              onStickerSelect={handleStickerSelect}
              onClose={() => setOpen(false)}
              onManageClick={onManageClick}
              onAddPackClick={onAddPackClick}
            />
          </PopoverContent>
        </Popover>
        <TooltipContent side="top" className="text-xs">
          Stickers
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// STICKER QUICK ACCESS (Recent stickers inline)
// ============================================================================

export interface StickerQuickAccessProps {
  onStickerSelect: (sticker: Sticker) => void;
  onMoreClick?: () => void;
  maxStickers?: number;
  className?: string;
}

export function StickerQuickAccess({
  onStickerSelect,
  onMoreClick,
  maxStickers = 6,
  className,
}: StickerQuickAccessProps) {
  // This would use the useStickers hook to get recent stickers
  // For now, we'll show a placeholder

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Recent stickers would be rendered here */}
      <button
        type="button"
        onClick={onMoreClick}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "transition-colors",
        )}
        title="More stickers"
      >
        <StickerIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default StickerPickerTrigger;
