"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TypingStatus } from "@/lib/presence/presence-types";
import { getTypingText } from "@/lib/presence/typing-tracker";

// ============================================================================
// Types
// ============================================================================

export interface TypingIndicatorProps {
  /**
   * Users currently typing
   */
  users: TypingStatus[];

  /**
   * Maximum number of avatars to show
   * @default 3
   */
  maxAvatars?: number;

  /**
   * Whether to show avatars
   * @default true
   */
  showAvatars?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TypingIndicator({
  users,
  maxAvatars = 3,
  showAvatars = true,
  className,
}: TypingIndicatorProps) {
  if (users.length === 0) {
    return null;
  }

  const displayedUsers = users.slice(0, maxAvatars);
  const remainingCount = Math.max(0, users.length - maxAvatars);

  const typingText = getTypingText(users);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        {/* Avatars */}
        {showAvatars && (
          <div className="flex -space-x-2">
            {displayedUsers.map((user) => (
              <Avatar
                key={user.userId}
                className="h-5 w-5 border-2 border-background"
              >
                <AvatarImage src={user.userAvatar} alt={user.userName} />
                <AvatarFallback className="text-[10px]">
                  {user.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                +{remainingCount}
              </div>
            )}
          </div>
        )}

        {/* Typing text */}
        <span
          dangerouslySetInnerHTML={{
            __html: typingText.replace(
              /is typing\.\.\.|are typing\.\.\./,
              "<span>$&</span>",
            ),
          }}
        />

        {/* Animated dots */}
        <TypingDots />
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Typing Dots Animation
// ============================================================================

export interface TypingDotsProps {
  /**
   * Size of dots
   * @default 'sm'
   */
  size?: "xs" | "sm" | "md";

  /**
   * Additional class names
   */
  className?: string;
}

export function TypingDots({ size = "sm", className }: TypingDotsProps) {
  const sizeClasses = {
    xs: "h-0.5 w-0.5",
    sm: "h-1 w-1",
    md: "h-1.5 w-1.5",
  };

  const gapClasses = {
    xs: "gap-0.5",
    sm: "gap-0.5",
    md: "gap-1",
  };

  return (
    <span className={cn("inline-flex", gapClasses[size], className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn("rounded-full bg-muted-foreground", sizeClasses[size])}
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

// ============================================================================
// Inline Typing Indicator (for message list)
// ============================================================================

export interface InlineTypingIndicatorProps {
  users: TypingStatus[];
  className?: string;
}

export function InlineTypingIndicator({
  users,
  className,
}: InlineTypingIndicatorProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.15 }}
        className={cn("overflow-hidden", className)}
      >
        <div className="flex items-start gap-3 px-4 py-2">
          {/* Avatars */}
          <div className="flex -space-x-1.5">
            {users.slice(0, 2).map((user) => (
              <Avatar
                key={user.userId}
                className="h-8 w-8 border-2 border-background"
              >
                <AvatarImage src={user.userAvatar} alt={user.userName} />
                <AvatarFallback className="text-xs">
                  {user.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          {/* Typing bubble */}
          <div className="flex items-center rounded-2xl bg-muted px-4 py-2">
            <TypingDotsLarge />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Large Typing Dots (for bubble style)
// ============================================================================

function TypingDotsLarge() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground"
          animate={{
            opacity: [0.3, 1, 0.3],
            y: [0, -4, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

// ============================================================================
// Compact Typing Indicator (text only)
// ============================================================================

export interface CompactTypingIndicatorProps {
  users: TypingStatus[];
  className?: string;
}

export function CompactTypingIndicator({
  users,
  className,
}: CompactTypingIndicatorProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <span className={cn("text-xs italic text-muted-foreground", className)}>
      {getTypingText(users)}
    </span>
  );
}

export default TypingIndicator;
