"use client";

import { forwardRef, useState, useCallback } from "react";
import { Smile } from "lucide-react";
import { EmojiClickData } from "emoji-picker-react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { EmojiPicker } from "./emoji-picker";
import { cn } from "@/lib/utils";

export interface EmojiButtonProps extends Omit<ButtonProps, "onClick"> {
  onEmojiSelect: (emoji: string, emojiData?: EmojiClickData) => void;
  tooltipText?: string;
  showTooltip?: boolean;
  pickerSide?: "top" | "right" | "bottom" | "left";
  pickerAlign?: "start" | "center" | "end";
  iconClassName?: string;
}

export const EmojiButton = forwardRef<HTMLButtonElement, EmojiButtonProps>(
  (
    {
      onEmojiSelect,
      tooltipText = "Add emoji",
      showTooltip = true,
      pickerSide = "top",
      pickerAlign = "start",
      iconClassName,
      className,
      variant = "ghost",
      size = "icon",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);

    const handleEmojiSelect = useCallback(
      (emoji: string, emojiData: EmojiClickData) => {
        onEmojiSelect(emoji, emojiData);
        setOpen(false);
      },
      [onEmojiSelect],
    );

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
        <Smile className={cn("h-5 w-5", iconClassName)} />
        <span className="sr-only">{tooltipText}</span>
      </Button>
    );

    const buttonWithPicker = (
      <EmojiPicker
        onEmojiSelect={handleEmojiSelect}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        side={pickerSide}
        align={pickerAlign}
      >
        {buttonElement}
      </EmojiPicker>
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

EmojiButton.displayName = "EmojiButton";

// Compact emoji button variant for inline use
export interface CompactEmojiButtonProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CompactEmojiButton({
  onEmojiSelect,
  className,
  disabled,
}: CompactEmojiButtonProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onEmojiSelect(emoji);
      setOpen(false);
    },
    [onEmojiSelect],
  );

  return (
    <EmojiPicker
      onEmojiSelect={handleEmojiSelect}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      side="top"
      align="end"
    >
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
        <Smile className="h-4 w-4" />
      </button>
    </EmojiPicker>
  );
}

// Message input emoji button with integrated picker
export interface MessageInputEmojiButtonProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  disabled?: boolean;
}

export function MessageInputEmojiButton({
  onEmojiSelect,
  className,
  disabled,
}: MessageInputEmojiButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            onEmojiSelect(emoji);
            setOpen(false);
          }}
          open={open}
          onOpenChange={setOpen}
          disabled={disabled}
          side="top"
          align="end"
        >
          <TooltipTrigger asChild>
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
              <Smile className="h-5 w-5" />
              <span className="sr-only">Add emoji</span>
            </Button>
          </TooltipTrigger>
        </EmojiPicker>
        <TooltipContent side="top" className="text-xs">
          Emoji
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
