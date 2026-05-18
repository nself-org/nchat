"use client";

import { useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { EmojiPicker } from "./emoji-picker";
import { cn } from "@/lib/utils";

export interface ReactionUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: ReactionUser;
  createdAt: Date | string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: ReactionUser[];
  hasReacted: boolean;
}

export interface ReactionDisplayProps {
  reactions: Reaction[];
  currentUserId: string;
  onReactionToggle: (emoji: string) => void;
  onAddReaction?: (emoji: string) => void;
  maxDisplayed?: number;
  showAddButton?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

// Group reactions by emoji
function groupReactions(
  reactions: Reaction[],
  currentUserId: string,
): GroupedReaction[] {
  const grouped = reactions.reduce<Record<string, GroupedReaction>>(
    (acc, reaction) => {
      const { emoji, user, userId } = reaction;

      if (!acc[emoji]) {
        acc[emoji] = {
          emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }

      acc[emoji].count++;
      acc[emoji].users.push(user);
      if (userId === currentUserId) {
        acc[emoji].hasReacted = true;
      }

      return acc;
    },
    {},
  );

  return Object.values(grouped).sort((a, b) => b.count - a.count);
}

// Format users list for tooltip
function formatUsersList(users: ReactionUser[], hasReacted: boolean): string {
  const displayNames = users.map((u) => u.displayName || u.username);

  if (displayNames.length === 0) return "";

  if (displayNames.length === 1) {
    return hasReacted && users[0].id ? "You" : displayNames[0];
  }

  if (displayNames.length === 2) {
    if (hasReacted) {
      const other = displayNames.find(
        (_, i) => !users[i].id || displayNames[i] !== "You",
      );
      return `You and ${other}`;
    }
    return `${displayNames[0]} and ${displayNames[1]}`;
  }

  if (hasReacted) {
    return `You and ${displayNames.length - 1} others`;
  }

  return `${displayNames[0]} and ${displayNames.length - 1} others`;
}

const sizeClasses = {
  sm: {
    container: "gap-1",
    button: "h-6 px-1.5 text-xs gap-1",
    emoji: "text-sm",
    count: "text-xs",
    addButton: "h-6 w-6",
  },
  md: {
    container: "gap-1.5",
    button: "h-7 px-2 text-sm gap-1.5",
    emoji: "text-base",
    count: "text-xs",
    addButton: "h-7 w-7",
  },
  lg: {
    container: "gap-2",
    button: "h-8 px-2.5 text-base gap-2",
    emoji: "text-lg",
    count: "text-sm",
    addButton: "h-8 w-8",
  },
};

export function ReactionDisplay({
  reactions,
  currentUserId,
  onReactionToggle,
  onAddReaction,
  maxDisplayed = 10,
  showAddButton = true,
  className,
  size = "md",
  disabled = false,
}: ReactionDisplayProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const classes = sizeClasses[size];

  // Group and memoize reactions
  const groupedReactions = useMemo(
    () => groupReactions(reactions, currentUserId),
    [reactions, currentUserId],
  );

  // Handle reaction click (toggle)
  const handleReactionClick = useCallback(
    (emoji: string) => {
      if (disabled) return;
      onReactionToggle(emoji);
    },
    [onReactionToggle, disabled],
  );

  // Handle add new reaction
  const handleAddReaction = useCallback(
    (emoji: string) => {
      if (disabled) return;
      if (onAddReaction) {
        onAddReaction(emoji);
      } else {
        onReactionToggle(emoji);
      }
      setShowEmojiPicker(false);
    },
    [onAddReaction, onReactionToggle, disabled],
  );

  // Display subset if needed
  const displayedReactions = groupedReactions.slice(0, maxDisplayed);
  const hiddenCount = groupedReactions.length - maxDisplayed;

  if (groupedReactions.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex flex-wrap items-center",
          classes.container,
          className,
        )}
      >
        <AnimatePresence mode="popLayout">
          {displayedReactions.map((reaction) => (
            <ReactionBadge
              key={reaction.emoji}
              reaction={reaction}
              onClick={() => handleReactionClick(reaction.emoji)}
              size={size}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full",
                  "bg-muted text-muted-foreground",
                  classes.button,
                )}
              >
                +{hiddenCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {hiddenCount} more reaction{hiddenCount > 1 ? "s" : ""}
            </TooltipContent>
          </Tooltip>
        )}

        {showAddButton && (
          <EmojiPicker
            onEmojiSelect={handleAddReaction}
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
            disabled={disabled}
            side="top"
            align="start"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Add reaction"
                  className={cn(
                    "inline-flex items-center justify-center rounded-full",
                    "border-muted-foreground/30 border border-dashed",
                    "hover:border-foreground/50 text-muted-foreground hover:text-foreground",
                    "transition-colors hover:bg-accent",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    classes.addButton,
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="sr-only">Add reaction</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Add reaction
              </TooltipContent>
            </Tooltip>
          </EmojiPicker>
        )}
      </div>
    </TooltipProvider>
  );
}

// Individual reaction badge component
interface ReactionBadgeProps {
  reaction: GroupedReaction;
  onClick: () => void;
  size: "sm" | "md" | "lg";
  disabled?: boolean;
}

function ReactionBadge({
  reaction,
  onClick,
  size,
  disabled = false,
}: ReactionBadgeProps) {
  const classes = sizeClasses[size];
  const userList = formatUsersList(reaction.users, reaction.hasReacted);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      layout
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "border transition-all duration-150",
              "hover:scale-105 active:scale-95",
              "disabled:cursor-not-allowed disabled:opacity-50",
              reaction.hasReacted
                ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
                : "border-transparent bg-muted hover:bg-accent",
              classes.button,
            )}
          >
            <span className={classes.emoji}>{reaction.emoji}</span>
            <span
              className={cn(
                classes.count,
                reaction.hasReacted ? "text-primary" : "text-muted-foreground",
              )}
            >
              {reaction.count}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="text-xs">
            <span className="font-medium">{userList}</span>
            <span className="text-muted-foreground">
              {" "}
              reacted with {reaction.emoji}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

// Compact reaction display for message previews
export interface CompactReactionDisplayProps {
  reactions: Reaction[];
  maxDisplayed?: number;
  className?: string;
}

export function CompactReactionDisplay({
  reactions,
  maxDisplayed = 5,
  className,
}: CompactReactionDisplayProps) {
  const uniqueEmojis = useMemo(() => {
    const emojis = [...new Set(reactions.map((r) => r.emoji))];
    return emojis.slice(0, maxDisplayed);
  }, [reactions, maxDisplayed]);

  const totalCount = reactions.length;
  const hiddenCount =
    [...new Set(reactions.map((r) => r.emoji))].length - maxDisplayed;

  if (uniqueEmojis.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-0.5 text-sm", className)}>
      {uniqueEmojis.map((emoji) => (
        <span key={emoji}>{emoji}</span>
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+{hiddenCount}</span>
      )}
      <span className="ml-1 text-xs text-muted-foreground">{totalCount}</span>
    </div>
  );
}

// Animated reaction counter for real-time updates
export interface AnimatedReactionCounterProps {
  count: number;
  className?: string;
}

export function AnimatedReactionCounter({
  count,
  className,
}: AnimatedReactionCounterProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {count}
      </motion.span>
    </AnimatePresence>
  );
}
