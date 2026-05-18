"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TypingUser } from "@/types/message";

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
  maxAvatars?: number;
}

/**
 * Typing indicator component
 * Shows who is currently typing in the channel with animated dots
 */
export function TypingIndicator({
  users,
  className,
  maxAvatars = 3,
}: TypingIndicatorProps) {
  if (users.length === 0) {
    return null;
  }

  const displayedUsers = users.slice(0, maxAvatars);
  const remainingCount = Math.max(0, users.length - maxAvatars);

  const getTypingText = () => {
    if (users.length === 1) {
      return (
        <>
          <strong>{users[0].displayName}</strong> is typing
        </>
      );
    }

    if (users.length === 2) {
      return (
        <>
          <strong>{users[0].displayName}</strong> and{" "}
          <strong>{users[1].displayName}</strong> are typing
        </>
      );
    }

    if (users.length === 3) {
      return (
        <>
          <strong>{users[0].displayName}</strong>,{" "}
          <strong>{users[1].displayName}</strong>, and{" "}
          <strong>{users[2].displayName}</strong> are typing
        </>
      );
    }

    return (
      <>
        <strong>{users[0].displayName}</strong>,{" "}
        <strong>{users[1].displayName}</strong>, and {users.length - 2} others
        are typing
      </>
    );
  };

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
        <div className="flex -space-x-2">
          {displayedUsers.map((user) => (
            <Avatar
              key={user.id}
              className="h-5 w-5 border-2 border-background"
            >
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback className="text-[10px]">
                {user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Typing text */}
        <span>{getTypingText()}</span>

        {/* Animated dots */}
        <TypingDots />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Animated typing dots
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-muted-foreground"
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

/**
 * Inline typing indicator for message list
 * Shows at the bottom of the message list
 */
export function InlineTypingIndicator({
  users,
  className,
}: {
  users: TypingUser[];
  className?: string;
}) {
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
          {/* Avatar or avatars */}
          <div className="flex -space-x-1.5">
            {users.slice(0, 2).map((user) => (
              <Avatar
                key={user.id}
                className="h-8 w-8 border-2 border-background"
              >
                <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                <AvatarFallback className="text-xs">
                  {user.displayName.charAt(0).toUpperCase()}
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

/**
 * Larger animated typing dots for inline indicator
 */
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

/**
 * Hook to manage typing indicator timeout
 * Automatically removes users who haven't typed in a while
 */
export function useTypingTimeout(
  typingUsers: TypingUser[],
  onTimeout: (userId: string) => void,
  timeout = 5000,
) {
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    typingUsers.forEach((user) => {
      const elapsed = Date.now() - new Date(user.startedAt).getTime();
      const remaining = Math.max(0, timeout - elapsed);

      const timer = setTimeout(() => {
        onTimeout(user.id);
      }, remaining);

      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [typingUsers, onTimeout, timeout]);
}
