/**
 * UnreadIndicator Component
 *
 * Visual indicators for unread messages in various contexts:
 * - Channel sidebar badges
 * - Unread line in message list
 * - Unread count tooltips
 * - Mention highlights
 *
 * Supports multiple styles and positions.
 */

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, AtSign, Bell, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export interface UnreadIndicatorProps {
  /** Number of unread messages */
  unreadCount: number;
  /** Number of unread mentions */
  mentionCount?: number;
  /** Display variant */
  variant?: "badge" | "dot" | "line" | "inline" | "sidebar";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show count number */
  showCount?: boolean;
  /** Position (for badge/dot) */
  position?: "top-right" | "top-left" | "inline";
  /** Custom className */
  className?: string;
  /** Animate entrance */
  animate?: boolean;
  /** Max count to display (show "99+" after) */
  maxCount?: number;
  /** Click handler */
  onClick?: () => void;
}

// ============================================================================
// Badge Variant - For channel list
// ============================================================================

export function UnreadBadge({
  unreadCount,
  mentionCount = 0,
  size = "sm",
  showCount = true,
  position = "inline",
  maxCount = 99,
  className,
  onClick,
}: UnreadIndicatorProps) {
  if (unreadCount === 0 && mentionCount === 0) return null;

  const isMention = mentionCount > 0;
  const displayCount = isMention ? mentionCount : unreadCount;
  const displayText =
    displayCount > maxCount ? `${maxCount}+` : displayCount.toString();

  const sizeClasses = {
    sm: "h-4 min-w-[16px] text-[10px] px-1",
    md: "h-5 min-w-[20px] text-xs px-1.5",
    lg: "h-6 min-w-[24px] text-sm px-2",
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        position === "inline" ? "inline-flex" : "absolute",
        position === "top-right" &&
          "right-0 top-0 -translate-y-1/2 translate-x-1/2",
        position === "top-left" &&
          "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
        className,
      )}
      onClick={onClick}
    >
      <Badge
        variant={isMention ? "destructive" : "secondary"}
        className={cn(
          "rounded-full font-semibold tabular-nums",
          sizeClasses[size],
          isMention && "bg-red-500 text-white hover:bg-red-600",
          !isMention &&
            "bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground",
          onClick && "cursor-pointer",
        )}
      >
        {showCount ? displayText : null}
      </Badge>
    </motion.div>
  );
}

// ============================================================================
// Dot Variant - Minimal indicator
// ============================================================================

export function UnreadDot({
  unreadCount,
  mentionCount = 0,
  size = "sm",
  position = "inline",
  className,
}: UnreadIndicatorProps) {
  if (unreadCount === 0 && mentionCount === 0) return null;

  const isMention = mentionCount > 0;

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        "rounded-full",
        position === "inline" ? "inline-flex" : "absolute",
        position === "top-right" && "right-0 top-0",
        position === "top-left" && "left-0 top-0",
        sizeClasses[size],
        isMention ? "bg-red-500" : "bg-blue-500",
        className,
      )}
    >
      <span className="sr-only">
        {isMention
          ? `${mentionCount} mention${mentionCount > 1 ? "s" : ""}`
          : `${unreadCount} unread`}
      </span>
    </motion.div>
  );
}

// ============================================================================
// Line Variant - Horizontal divider in message list
// ============================================================================

export interface UnreadLineProps {
  /** Number of unread messages below this line */
  count?: number;
  /** Label text */
  label?: string;
  /** Custom className */
  className?: string;
}

export function UnreadLine({
  count,
  label = "New Messages",
  className,
}: UnreadLineProps) {
  return (
    <div
      className={cn("relative flex items-center py-4", className)}
      role="separator"
      aria-label="Unread messages"
    >
      <div className="flex-1 border-t-2 border-red-500" />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-md"
      >
        <Bell className="h-3 w-3" />
        <span>
          {count !== undefined && count > 0 ? `${count} ${label}` : label}
        </span>
      </motion.div>
      <div className="flex-1 border-t-2 border-red-500" />
    </div>
  );
}

// ============================================================================
// Sidebar Variant - For channel list with icon
// ============================================================================

export interface SidebarUnreadProps {
  /** Channel name */
  channelName: string;
  /** Channel type */
  channelType?: "channel" | "dm" | "thread";
  /** Unread count */
  unreadCount: number;
  /** Mention count */
  mentionCount?: number;
  /** Whether channel is muted */
  isMuted?: boolean;
  /** Whether channel is active */
  isActive?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export function SidebarUnread({
  channelName,
  channelType = "channel",
  unreadCount,
  mentionCount = 0,
  isMuted = false,
  isActive = false,
  className,
  onClick,
}: SidebarUnreadProps) {
  const hasUnread = unreadCount > 0 || mentionCount > 0;
  const hasMention = mentionCount > 0;

  const Icon =
    channelType === "dm"
      ? MessageCircle
      : channelType === "thread"
        ? MessageCircle
        : Hash;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive && "text-accent-foreground bg-accent",
        !isActive && hasUnread && !isMuted && "font-semibold text-foreground",
        !isActive &&
          !hasUnread &&
          "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
        isMuted && "opacity-60",
        className,
      )}
    >
      {/* Icon */}
      <Icon className="h-4 w-4 shrink-0" />

      {/* Channel name */}
      <span className="flex-1 truncate text-left">{channelName}</span>

      {/* Unread indicator */}
      {hasUnread && !isMuted && (
        <AnimatePresence>
          {hasMention ? (
            <UnreadBadge
              unreadCount={unreadCount}
              mentionCount={mentionCount}
              size="sm"
              position="inline"
            />
          ) : (
            <UnreadDot unreadCount={unreadCount} size="sm" position="inline" />
          )}
        </AnimatePresence>
      )}

      {/* Muted indicator */}
      {isMuted && hasUnread && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <UnreadDot
                  unreadCount={unreadCount}
                  mentionCount={mentionCount}
                  size="sm"
                  position="inline"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Muted •{" "}
                {mentionCount > 0
                  ? `${mentionCount} mention${mentionCount > 1 ? "s" : ""}`
                  : `${unreadCount} unread`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </button>
  );
}

// ============================================================================
// Inline Variant - Compact inline indicator with tooltip
// ============================================================================

export function InlineUnread({
  unreadCount,
  mentionCount = 0,
  showCount = true,
  className,
}: UnreadIndicatorProps) {
  if (unreadCount === 0 && mentionCount === 0) return null;

  const hasMention = mentionCount > 0;
  const displayCount = hasMention ? mentionCount : unreadCount;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              hasMention ? "bg-red-500 text-white" : "bg-blue-500 text-white",
              className,
            )}
          >
            {hasMention ? (
              <AtSign className="h-3 w-3" />
            ) : (
              <MessageCircle className="h-3 w-3" />
            )}
            {showCount && <span className="tabular-nums">{displayCount}</span>}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {hasMention
              ? `${mentionCount} mention${mentionCount > 1 ? "s" : ""}`
              : `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Main UnreadIndicator Component (Smart variant selector)
// ============================================================================

export function UnreadIndicator(props: UnreadIndicatorProps) {
  const { variant = "badge", ...rest } = props;

  switch (variant) {
    case "badge":
      return <UnreadBadge {...rest} />;
    case "dot":
      return <UnreadDot {...rest} />;
    case "line":
      return <UnreadLine count={rest.unreadCount} className={rest.className} />;
    case "inline":
      return <InlineUnread {...rest} />;
    case "sidebar":
      return null; // Use SidebarUnread directly
    default:
      return <UnreadBadge {...rest} />;
  }
}

// ============================================================================
// Mention Highlight - For highlighting mentioned messages
// ============================================================================

export interface MentionHighlightProps {
  /** Whether this message mentions the current user */
  isMentioned: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export function MentionHighlight({
  isMentioned,
  children,
  className,
}: MentionHighlightProps) {
  if (!isMentioned) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-red-500",
        "bg-red-500/10 dark:bg-red-500/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default UnreadIndicator;
