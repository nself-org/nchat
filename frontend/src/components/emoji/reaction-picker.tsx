"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { EmojiClickData } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { EmojiPicker } from "./emoji-picker";
import { cn } from "@/lib/utils";

// Default quick reactions (can be customized)
export const DEFAULT_QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👀"];

export interface ReactionPickerProps {
  onReactionSelect: (emoji: string) => void;
  quickReactions?: string[];
  showFullPicker?: boolean;
  className?: string;
  disabled?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function ReactionPicker({
  onReactionSelect,
  quickReactions = DEFAULT_QUICK_REACTIONS,
  showFullPicker = true,
  className,
  disabled = false,
  side = "top",
  align = "center",
}: ReactionPickerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  const handleQuickReaction = useCallback(
    (emoji: string) => {
      if (disabled) return;
      onReactionSelect(emoji);
    },
    [onReactionSelect, disabled],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string, _emojiData: EmojiClickData) => {
      onReactionSelect(emoji);
      setShowEmojiPicker(false);
    },
    [onReactionSelect],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "flex items-center gap-0.5 rounded-full border bg-popover p-1 shadow-lg",
          className,
        )}
      >
        {quickReactions.map((emoji) => (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <motion.button
                type="button"
                onClick={() => handleQuickReaction(emoji)}
                onMouseEnter={() => setHoveredEmoji(emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
                disabled={disabled}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  hoveredEmoji === emoji && "bg-accent",
                )}
              >
                <span className="text-lg">{emoji}</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Click to react
            </TooltipContent>
          </Tooltip>
        ))}

        {showFullPicker && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              open={showEmojiPicker}
              onOpenChange={setShowEmojiPicker}
              disabled={disabled}
              side={side}
              align={align}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={disabled}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">More reactions</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  More emojis
                </TooltipContent>
              </Tooltip>
            </EmojiPicker>
          </>
        )}
      </motion.div>
    </TooltipProvider>
  );
}

// Hover-triggered reaction picker for messages
export interface MessageReactionPickerProps extends ReactionPickerProps {
  messageId: string;
  visible?: boolean;
}

export function MessageReactionPicker({
  messageId,
  visible = false,
  ...props
}: MessageReactionPickerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute -top-12 right-0 z-10"
          data-message-id={messageId}
        >
          <ReactionPicker {...props} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline reaction picker
export interface InlineReactionPickerProps {
  onReactionSelect: (emoji: string) => void;
  quickReactions?: string[];
  className?: string;
  disabled?: boolean;
}

export function InlineReactionPicker({
  onReactionSelect,
  quickReactions = DEFAULT_QUICK_REACTIONS.slice(0, 4),
  className,
  disabled = false,
}: InlineReactionPickerProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {quickReactions.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReactionSelect(emoji)}
          disabled={disabled}
          className={cn(
            "rounded p-1 text-lg transition-colors hover:bg-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {emoji}
        </button>
      ))}
      <EmojiPicker
        onEmojiSelect={(emoji) => {
          onReactionSelect(emoji);
          setShowMore(false);
        }}
        open={showMore}
        onOpenChange={setShowMore}
        disabled={disabled}
      >
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </button>
      </EmojiPicker>
    </div>
  );
}
