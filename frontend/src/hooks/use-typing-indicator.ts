"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./use-socket";
import { useSocketEvent } from "./use-socket-event";
import type { TypingPayload } from "@/lib/realtime";

const TYPING_TIMEOUT = 3000; // 3 seconds

/**
 * Hook for managing typing indicators in a channel
 *
 * @param channelId - The channel ID to track typing for
 * @returns Object containing typing users and setTyping function
 *
 * @example
 * ```tsx
 * const { typingUsers, setTyping } = useTypingIndicator(channelId)
 *
 * // In input handler
 * const handleInput = () => {
 *   setTyping(true)
 * }
 *
 * // Display typing users
 * {typingUsers.length > 0 && (
 *   <span>{typingUsers.join(', ')} is typing...</span>
 * )}
 * ```
 */
export function useTypingIndicator(channelId: string) {
  const { emit, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(
    new Map(),
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<boolean>(false);

  // Listen for typing events from other users
  useSocketEvent("message:typing", (payload: TypingPayload) => {
    if (payload.channelId !== channelId) return;

    setTypingUsers((prev) => {
      const next = new Map(prev);
      if (payload.isTyping) {
        next.set(payload.userId, Date.now());
      } else {
        next.delete(payload.userId);
      }
      return next;
    });
  });

  // Clean up stale typing indicators periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const next = new Map(prev);
        let hasChanges = false;

        for (const [userId, timestamp] of next) {
          if (now - timestamp > TYPING_TIMEOUT) {
            next.delete(userId);
            hasChanges = true;
          }
        }

        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset typing users when channel changes
  useEffect(() => {
    setTypingUsers(new Map());
    lastTypingRef.current = false;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [channelId]);

  // Send typing indicator to server
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!isConnected) return;

      // Avoid sending duplicate typing states
      if (lastTypingRef.current === isTyping && isTyping) return;
      lastTypingRef.current = isTyping;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      emit("message:typing" as Parameters<typeof emit>[0], {
        channelId,
        isTyping,
      });

      // Auto-reset typing indicator after timeout
      if (isTyping) {
        timeoutRef.current = setTimeout(() => {
          lastTypingRef.current = false;
          emit("message:typing" as Parameters<typeof emit>[0], {
            channelId,
            isTyping: false,
          });
        }, TYPING_TIMEOUT);
      }
    },
    [channelId, emit, isConnected],
  );

  return {
    typingUsers: Array.from(typingUsers.keys()),
    setTyping,
  };
}
