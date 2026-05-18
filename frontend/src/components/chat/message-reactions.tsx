"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reactionBurst, reactionPillHover } from "@/lib/animations";
import type { Reaction, MessageUser } from "@/types/message";

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  onAddReaction?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Message reactions display
 * Shows reaction pills with counts and hover tooltips
 */
export function MessageReactions({
  reactions,
  onReact,
  onRemoveReaction,
  onAddReaction,
  className,
  compact = false,
}: MessageReactionsProps) {
  if (reactions.length === 0 && !onAddReaction) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => (
          <ReactionPill
            key={reaction.emoji}
            reaction={reaction}
            compact={compact}
            onClick={() => {
              if (reaction.hasReacted) {
                onRemoveReaction(reaction.emoji);
              } else {
                onReact(reaction.emoji);
              }
            }}
          />
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      {onAddReaction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddReaction}
          className={cn(
            "h-6 w-6 rounded-full p-0 hover:bg-muted",
            compact && "h-5 w-5",
          )}
        >
          <Plus className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
        </Button>
      )}
    </div>
  );
}

interface ReactionPillProps {
  reaction: Reaction;
  onClick: () => void;
  compact?: boolean;
}

/**
 * Individual reaction pill
 */
function ReactionPill({ reaction, onClick, compact }: ReactionPillProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={isHovering && reaction.users.length > 0}>
        <TooltipTrigger asChild>
          <motion.button
            variants={reactionBurst}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover="hover"
            whileTap="tap"
            onClick={onClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              reaction.hasReacted
                ? "border-primary/50 bg-primary/10 hover:bg-primary/20"
                : "bg-muted/50 border-border hover:bg-muted",
              compact && "px-1.5 py-0",
            )}
          >
            <span className={cn("text-sm", compact && "text-xs")}>
              {emojiFromName(reaction.emoji)}
            </span>
            <span
              className={cn(
                "font-medium",
                reaction.hasReacted ? "text-primary" : "text-muted-foreground",
              )}
            >
              {reaction.count}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <ReactionTooltipContent reaction={reaction} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip content showing who reacted
 */
function ReactionTooltipContent({ reaction }: { reaction: Reaction }) {
  const { users, emoji } = reaction;
  const maxDisplay = 10;
  const displayUsers = users.slice(0, maxDisplay);
  const remaining = users.length - maxDisplay;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 font-medium">
        <span>{emojiFromName(emoji)}</span>
        <span className="capitalize">{emoji.replace(/_/g, " ")}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {displayUsers.map((user, i) => (
          <span key={user.id}>
            {user.displayName}
            {i < displayUsers.length - 1 && ", "}
          </span>
        ))}
        {remaining > 0 && <span> and {remaining} more</span>}
      </div>
    </div>
  );
}

/**
 * Quick reactions bar
 * Shows commonly used reactions for quick access
 */
interface QuickReactionsProps {
  onReact: (emoji: string) => void;
  quickEmojis?: string[];
  className?: string;
}

const DEFAULT_QUICK_EMOJIS = [
  "thumbs_up",
  "heart",
  "smile",
  "tada",
  "thinking",
  "eyes",
];

export function QuickReactions({
  onReact,
  quickEmojis = DEFAULT_QUICK_EMOJIS,
  className,
}: QuickReactionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md",
        className,
      )}
    >
      {quickEmojis.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          onClick={() => onReact(emoji)}
          className="h-8 w-8 rounded-md p-0 text-lg hover:bg-muted"
        >
          {emojiFromName(emoji)}
        </Button>
      ))}
    </div>
  );
}

/**
 * Reaction picker with categories
 */
interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  recentEmojis?: string[];
  className?: string;
}

const EMOJI_CATEGORIES = {
  smileys: [
    "smile",
    "grin",
    "joy",
    "heart_eyes",
    "kissing_heart",
    "thinking",
    "neutral_face",
    "confused",
    "disappointed",
    "cry",
    "angry",
    "scream",
  ],
  gestures: [
    "thumbs_up",
    "thumbs_down",
    "clap",
    "wave",
    "ok_hand",
    "raised_hands",
    "pray",
    "muscle",
    "point_up",
    "point_down",
  ],
  hearts: [
    "heart",
    "orange_heart",
    "yellow_heart",
    "green_heart",
    "blue_heart",
    "purple_heart",
    "black_heart",
    "broken_heart",
    "sparkling_heart",
  ],
  objects: [
    "tada",
    "fire",
    "rocket",
    "star",
    "sparkles",
    "bulb",
    "trophy",
    "medal",
    "gift",
    "bell",
  ],
  symbols: [
    "check",
    "x",
    "exclamation",
    "question",
    "plus",
    "minus",
    "hundred",
    "zzz",
    "eyes",
    "speech_balloon",
  ],
};

export function ReactionPicker({
  onSelect,
  recentEmojis = [],
  className,
}: ReactionPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("smileys");

  const categories = Object.keys(EMOJI_CATEGORIES) as Array<
    keyof typeof EMOJI_CATEGORIES
  >;

  return (
    <div
      className={cn(
        "w-72 rounded-lg border bg-popover p-2 shadow-lg",
        className,
      )}
    >
      {/* Recent emojis */}
      {recentEmojis.length > 0 && (
        <div className="mb-2 border-b pb-2">
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            Recently used
          </div>
          <div className="flex flex-wrap gap-1">
            {recentEmojis.slice(0, 8).map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => onSelect(emoji)}
                className="h-8 w-8 p-0 text-lg hover:bg-muted"
              >
                {emojiFromName(emoji)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="mb-2 flex gap-1 border-b pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="h-7 flex-1 px-1 text-xs capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map(
          (emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => onSelect(emoji)}
              className="h-8 w-8 p-0 text-lg hover:bg-muted"
            >
              {emojiFromName(emoji)}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Convert emoji name to actual emoji
 * This is a simple mapping - in production you'd use a proper emoji library
 */
export function emojiFromName(name: string): string {
  const emojiMap: Record<string, string> = {
    // Smileys
    smile: "\u{1F642}",
    grin: "\u{1F600}",
    joy: "\u{1F602}",
    heart_eyes: "\u{1F60D}",
    kissing_heart: "\u{1F618}",
    thinking: "\u{1F914}",
    neutral_face: "\u{1F610}",
    confused: "\u{1F615}",
    disappointed: "\u{1F61E}",
    cry: "\u{1F622}",
    angry: "\u{1F620}",
    scream: "\u{1F631}",

    // Gestures
    thumbs_up: "\u{1F44D}",
    thumbs_down: "\u{1F44E}",
    clap: "\u{1F44F}",
    wave: "\u{1F44B}",
    ok_hand: "\u{1F44C}",
    raised_hands: "\u{1F64C}",
    pray: "\u{1F64F}",
    muscle: "\u{1F4AA}",
    point_up: "\u{261D}",
    point_down: "\u{1F447}",

    // Hearts
    heart: "\u{2764}",
    orange_heart: "\u{1F9E1}",
    yellow_heart: "\u{1F49B}",
    green_heart: "\u{1F49A}",
    blue_heart: "\u{1F499}",
    purple_heart: "\u{1F49C}",
    black_heart: "\u{1F5A4}",
    broken_heart: "\u{1F494}",
    sparkling_heart: "\u{1F496}",

    // Objects
    tada: "\u{1F389}",
    fire: "\u{1F525}",
    rocket: "\u{1F680}",
    star: "\u{2B50}",
    sparkles: "\u{2728}",
    bulb: "\u{1F4A1}",
    trophy: "\u{1F3C6}",
    medal: "\u{1F3C5}",
    gift: "\u{1F381}",
    bell: "\u{1F514}",

    // Symbols
    check: "\u{2705}",
    x: "\u{274C}",
    exclamation: "\u{2757}",
    question: "\u{2753}",
    plus: "\u{2795}",
    minus: "\u{2796}",
    hundred: "\u{1F4AF}",
    zzz: "\u{1F4A4}",
    eyes: "\u{1F440}",
    speech_balloon: "\u{1F4AC}",
  };

  return emojiMap[name] || name;
}
