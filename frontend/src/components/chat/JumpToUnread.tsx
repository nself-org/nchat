/**
 * JumpToUnread Component
 *
 * Floating action button for jumping to unread messages.
 * Features:
 * - Auto-show when scrolled away from unread messages
 * - Smooth scroll to first unread
 * - Shows unread count
 * - Keyboard shortcuts
 * - Auto-hide when at unread position
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronDown,
  Hash,
  MessageCircle,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHotkey } from "@/hooks/use-hotkey";

// ============================================================================
// Types
// ============================================================================

export interface JumpToUnreadProps {
  /** Whether there are unread messages */
  hasUnread: boolean;
  /** Number of unread messages */
  unreadCount?: number;
  /** Number of unread mentions */
  mentionCount?: number;
  /** Callback to jump to first unread */
  onJumpToUnread: () => void;
  /** Callback to jump to latest */
  onJumpToLatest?: () => void;
  /** Whether currently scrolled to bottom */
  isAtBottom?: boolean;
  /** Custom className */
  className?: string;
  /** Show jump to latest button instead */
  showJumpToLatest?: boolean;
  /** Position on screen */
  position?: "bottom-right" | "bottom-center" | "bottom-left";
}

export interface JumpToUnreadButtonProps extends JumpToUnreadProps {
  /** Button variant */
  variant?: "default" | "compact" | "minimal";
}

// ============================================================================
// JumpToUnread Button
// ============================================================================

export function JumpToUnreadButton({
  hasUnread,
  unreadCount = 0,
  mentionCount = 0,
  onJumpToUnread,
  onJumpToLatest,
  isAtBottom = false,
  showJumpToLatest = false,
  position = "bottom-center",
  variant = "default",
  className,
}: JumpToUnreadButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when:
  // 1. Has unread and not showing jump to latest, OR
  // 2. Showing jump to latest and not at bottom
  useEffect(() => {
    if (showJumpToLatest) {
      setIsVisible(!isAtBottom);
    } else {
      setIsVisible(hasUnread);
    }
  }, [hasUnread, isAtBottom, showJumpToLatest]);

  // Keyboard shortcut: Alt+Shift+U to jump to unread
  useHotkey("alt+shift+u", () => {
    if (hasUnread) {
      onJumpToUnread();
    }
  });

  const handleClick = useCallback(() => {
    if (showJumpToLatest && onJumpToLatest) {
      onJumpToLatest();
    } else {
      onJumpToUnread();
    }
  }, [showJumpToLatest, onJumpToLatest, onJumpToUnread]);

  const hasMention = mentionCount > 0;

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-4 left-4",
  };

  // Compact variant - just icon + count
  if (variant === "compact") {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn("fixed z-50", positionClasses[position], className)}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleClick}
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-full shadow-lg",
                      hasMention && "bg-red-500 hover:bg-red-600",
                      !hasMention &&
                        !showJumpToLatest &&
                        "bg-blue-500 hover:bg-blue-600",
                    )}
                  >
                    {showJumpToLatest ? (
                      <ArrowDown className="h-5 w-5" />
                    ) : hasMention ? (
                      <Bell className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                    <span className="sr-only">
                      {showJumpToLatest
                        ? "Jump to latest"
                        : `Jump to ${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>
                    {showJumpToLatest
                      ? "Jump to latest messages"
                      : hasMention
                        ? `${mentionCount} mention${mentionCount !== 1 ? "s" : ""}`
                        : `${unreadCount} unread`}
                  </p>
                  <p className="text-xs text-muted-foreground">Alt+Shift+U</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Minimal variant - very subtle
  if (variant === "minimal") {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn("fixed z-50", positionClasses[position], className)}
          >
            <Button
              onClick={handleClick}
              variant="ghost"
              size="sm"
              className="rounded-full shadow-sm backdrop-blur-sm"
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              {showJumpToLatest
                ? "Jump to latest"
                : hasMention
                  ? `${mentionCount} mention${mentionCount !== 1 ? "s" : ""}`
                  : `${unreadCount} unread`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Default variant - full featured
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn("fixed z-50", positionClasses[position], className)}
        >
          <Button
            onClick={handleClick}
            size="default"
            className={cn(
              "rounded-full shadow-lg transition-all hover:shadow-xl",
              hasMention && "bg-red-500 hover:bg-red-600",
              !hasMention &&
                !showJumpToLatest &&
                "bg-blue-500 hover:bg-blue-600",
            )}
          >
            {showJumpToLatest ? (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                <span>Jump to latest</span>
              </>
            ) : hasMention ? (
              <>
                <Bell className="mr-2 h-4 w-4" />
                <span className="font-semibold">
                  {mentionCount} mention{mentionCount !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                <span>
                  {unreadCount} new message{unreadCount !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Jump Between Channels
// ============================================================================

export interface JumpToChannelProps {
  /** Callback to jump to next unread channel */
  onNextUnread: () => void;
  /** Callback to jump to previous unread channel */
  onPrevUnread: () => void;
  /** Whether there are unread channels */
  hasUnreadChannels: boolean;
  /** Number of unread channels */
  unreadChannelCount?: number;
  /** Custom className */
  className?: string;
}

export function JumpToChannel({
  onNextUnread,
  onPrevUnread,
  hasUnreadChannels,
  unreadChannelCount = 0,
  className,
}: JumpToChannelProps) {
  // Keyboard shortcuts
  useHotkey("alt+shift+up", onPrevUnread);
  useHotkey("alt+shift+down", onNextUnread);

  if (!hasUnreadChannels) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onPrevUnread}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Previous unread channel</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Previous unread channel</p>
            <p className="text-xs text-muted-foreground">Alt+Shift+↑</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <span className="text-xs text-muted-foreground">
        {unreadChannelCount} unread channel{unreadChannelCount !== 1 ? "s" : ""}
      </span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onNextUnread}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <ArrowDown className="h-4 w-4" />
              <span className="sr-only">Next unread channel</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Next unread channel</p>
            <p className="text-xs text-muted-foreground">Alt+Shift+↓</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================================================
// Jump to Next Mention
// ============================================================================

export interface JumpToMentionProps {
  /** Whether there are unread mentions */
  hasMentions: boolean;
  /** Number of unread mentions */
  mentionCount?: number;
  /** Callback to jump to next mention */
  onJumpToMention: () => void;
  /** Custom className */
  className?: string;
}

export function JumpToMention({
  hasMentions,
  mentionCount = 0,
  onJumpToMention,
  className,
}: JumpToMentionProps) {
  // Keyboard shortcut: Alt+Shift+M
  useHotkey("alt+shift+m", () => {
    if (hasMentions) {
      onJumpToMention();
    }
  });

  if (!hasMentions) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={className}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onJumpToMention}
              variant="destructive"
              size="sm"
              className="rounded-full"
            >
              <Bell className="mr-2 h-4 w-4" />
              <span>
                {mentionCount} mention{mentionCount !== 1 ? "s" : ""}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Jump to next mention</p>
            <p className="text-xs text-muted-foreground">Alt+Shift+M</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}

// ============================================================================
// Combined Navigation Controls
// ============================================================================

export interface UnreadNavigationProps {
  /** Message-level unread info */
  messageUnread?: {
    hasUnread: boolean;
    unreadCount: number;
    mentionCount: number;
    onJumpToUnread: () => void;
  };
  /** Channel-level unread info */
  channelUnread?: {
    hasUnreadChannels: boolean;
    unreadChannelCount: number;
    onNextUnread: () => void;
    onPrevUnread: () => void;
  };
  /** Whether at bottom of messages */
  isAtBottom?: boolean;
  /** Show jump to latest */
  showJumpToLatest?: boolean;
  /** Jump to latest callback */
  onJumpToLatest?: () => void;
  /** Custom className */
  className?: string;
}

export function UnreadNavigation({
  messageUnread,
  channelUnread,
  isAtBottom,
  showJumpToLatest,
  onJumpToLatest,
  className,
}: UnreadNavigationProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Channel navigation */}
      {channelUnread && channelUnread.hasUnreadChannels && (
        <JumpToChannel
          onNextUnread={channelUnread.onNextUnread}
          onPrevUnread={channelUnread.onPrevUnread}
          hasUnreadChannels={channelUnread.hasUnreadChannels}
          unreadChannelCount={channelUnread.unreadChannelCount}
        />
      )}

      {/* Message jump button */}
      {messageUnread && (
        <JumpToUnreadButton
          hasUnread={messageUnread.hasUnread}
          unreadCount={messageUnread.unreadCount}
          mentionCount={messageUnread.mentionCount}
          onJumpToUnread={messageUnread.onJumpToUnread}
          onJumpToLatest={onJumpToLatest}
          isAtBottom={isAtBottom}
          showJumpToLatest={showJumpToLatest}
        />
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default JumpToUnreadButton;
