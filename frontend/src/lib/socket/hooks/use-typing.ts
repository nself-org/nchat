/**
 * useTyping Hook
 *
 * Manages typing indicators including start/stop with debounce,
 * subscribing to typing in current channel, auto-stop after timeout,
 * and returning typing users list.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { emit, on, off, isConnected } from "../client";
import {
  SocketEvents,
  type TypingStartEvent,
  type TypingStopEvent,
  type TypingChannelEvent,
} from "../events";

// Default typing timeout in milliseconds (5 seconds)
const DEFAULT_TYPING_TIMEOUT = 5000;

// Debounce delay for typing start (300ms)
const TYPING_DEBOUNCE_DELAY = 300;

// Minimum interval between typing start emissions (2 seconds)
const TYPING_EMIT_INTERVAL = 2000;

export interface TypingUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  startedAt: string;
}

export interface UseTypingOptions {
  /**
   * Channel ID to track typing in
   */
  channelId: string;

  /**
   * Thread ID if typing in a thread
   */
  threadId?: string;

  /**
   * Current user ID
   */
  userId?: string;

  /**
   * Typing timeout in milliseconds
   * @default 5000
   */
  typingTimeout?: number;

  /**
   * Callback when typing users change
   */
  onTypingChange?: (users: TypingUser[]) => void;
}

export interface UseTypingReturn {
  /**
   * List of users currently typing
   */
  typingUsers: TypingUser[];

  /**
   * Whether the current user is typing
   */
  isTyping: boolean;

  /**
   * Start typing indicator
   */
  startTyping: () => void;

  /**
   * Stop typing indicator
   */
  stopTyping: () => void;

  /**
   * Handle input change (auto start/stop typing)
   */
  handleInputChange: (value: string) => void;

  /**
   * Formatted typing indicator text
   */
  typingText: string | null;
}

/**
 * Format typing indicator text
 */
function formatTypingText(users: TypingUser[]): string | null {
  if (users.length === 0) {
    return null;
  }

  if (users.length === 1) {
    return `${users[0].displayName} is typing...`;
  }

  if (users.length === 2) {
    return `${users[0].displayName} and ${users[1].displayName} are typing...`;
  }

  if (users.length === 3) {
    return `${users[0].displayName}, ${users[1].displayName}, and ${users[2].displayName} are typing...`;
  }

  return `${users[0].displayName}, ${users[1].displayName}, and ${users.length - 2} others are typing...`;
}

/**
 * Hook for managing typing indicators
 */
export function useTyping(options: UseTypingOptions): UseTypingReturn {
  const {
    channelId,
    threadId,
    userId,
    typingTimeout = DEFAULT_TYPING_TIMEOUT,
    onTypingChange,
  } = options;

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Refs for timing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmitRef = useRef<number>(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const previousValueRef = useRef<string>("");
  const onTypingChangeRef = useRef(onTypingChange);

  // Update callback ref
  useEffect(() => {
    onTypingChangeRef.current = onTypingChange;
  }, [onTypingChange]);

  // Clean up typing users based on timeout
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const filtered = prev.filter((user) => {
          const startTime = new Date(user.startedAt).getTime();
          return now - startTime < typingTimeout;
        });

        if (filtered.length !== prev.length) {
          onTypingChangeRef.current?.(filtered);
        }

        return filtered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [typingTimeout]);

  // Emit typing start to server
  const emitTypingStart = useCallback(() => {
    const now = Date.now();

    // Throttle emissions
    if (now - lastEmitRef.current < TYPING_EMIT_INTERVAL) {
      return;
    }

    if (isConnected()) {
      emit(SocketEvents.TYPING_START, {
        channelId,
        threadId,
      });
      lastEmitRef.current = now;
    }
  }, [channelId, threadId]);

  // Emit typing stop to server
  const emitTypingStop = useCallback(() => {
    if (isConnected()) {
      emit(SocketEvents.TYPING_STOP, {
        channelId,
        threadId,
      });
    }
  }, [channelId, threadId]);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (isTyping) {
      // Reset timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } else {
      setIsTyping(true);
    }

    emitTypingStart();

    // Set auto-stop timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emitTypingStop();
    }, typingTimeout);
  }, [isTyping, emitTypingStart, emitTypingStop, typingTimeout]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (isTyping) {
      setIsTyping(false);
      emitTypingStop();
    }
  }, [isTyping, emitTypingStop]);

  // Handle input change (auto start/stop typing)
  const handleInputChange = useCallback(
    (value: string) => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const previousValue = previousValueRef.current;
      previousValueRef.current = value;

      // If input is empty, stop typing
      if (!value.trim()) {
        stopTyping();
        return;
      }

      // If content changed, debounce start typing
      if (value !== previousValue) {
        debounceRef.current = setTimeout(() => {
          startTyping();
        }, TYPING_DEBOUNCE_DELAY);
      }
    },
    [startTyping, stopTyping],
  );

  // Handle incoming typing events
  useEffect(() => {
    const handleTypingStart = (event: TypingStartEvent) => {
      // Ignore own typing events
      if (event.userId === userId) return;

      // Check if this is for our channel/thread
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      setTypingUsers((prev) => {
        // Check if user is already typing
        const existingIndex = prev.findIndex((u) => u.userId === event.userId);

        const newUser: TypingUser = {
          userId: event.userId,
          displayName: event.user?.displayName ?? "Unknown",
          avatarUrl: event.user?.avatarUrl,
          startedAt: event.startedAt,
        };

        let next: TypingUser[];
        if (existingIndex >= 0) {
          // Update existing entry
          next = [...prev];
          next[existingIndex] = newUser;
        } else {
          // Add new entry
          next = [...prev, newUser];
        }

        onTypingChangeRef.current?.(next);
        return next;
      });
    };

    const handleTypingStop = (event: TypingStopEvent) => {
      // Ignore own typing events
      if (event.userId === userId) return;

      // Check if this is for our channel/thread
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      setTypingUsers((prev) => {
        const next = prev.filter((u) => u.userId !== event.userId);
        if (next.length !== prev.length) {
          onTypingChangeRef.current?.(next);
        }
        return next;
      });
    };

    const handleTypingChannel = (event: TypingChannelEvent) => {
      // Check if this is for our channel/thread
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      // Filter out own user
      const users: TypingUser[] = event.users
        .filter((u) => u.userId !== userId)
        .map((u) => ({
          userId: u.userId,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          startedAt: u.startedAt,
        }));

      setTypingUsers(users);
      onTypingChangeRef.current?.(users);
    };

    on(SocketEvents.TYPING_START, handleTypingStart);
    on(SocketEvents.TYPING_STOP, handleTypingStop);
    on(SocketEvents.TYPING_CHANNEL, handleTypingChannel);

    return () => {
      off(SocketEvents.TYPING_START, handleTypingStart);
      off(SocketEvents.TYPING_STOP, handleTypingStop);
      off(SocketEvents.TYPING_CHANNEL, handleTypingChannel);
    };
  }, [channelId, threadId, userId]);

  // Reset typing when channel changes
  useEffect(() => {
    setTypingUsers([]);
    stopTyping();
  }, [channelId, threadId, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Send stop typing on unmount if currently typing
      if (isTyping && isConnected()) {
        emit(SocketEvents.TYPING_STOP, { channelId, threadId });
      }
    };
  }, [channelId, threadId, isTyping]);

  // Format typing text
  const typingText = formatTypingText(typingUsers);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
    handleInputChange,
    typingText,
  };
}

/**
 * Hook for just watching typing indicators (without emitting)
 */
export function useTypingWatch(
  channelId: string,
  threadId?: string,
  currentUserId?: string,
): TypingUser[] {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Clean up expired typing users
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) =>
        prev.filter((user) => {
          const startTime = new Date(user.startedAt).getTime();
          return now - startTime < DEFAULT_TYPING_TIMEOUT;
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle typing events
  useEffect(() => {
    const handleTypingStart = (event: TypingStartEvent) => {
      if (event.userId === currentUserId) return;
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      setTypingUsers((prev) => {
        const existingIndex = prev.findIndex((u) => u.userId === event.userId);
        const newUser: TypingUser = {
          userId: event.userId,
          displayName: event.user?.displayName ?? "Unknown",
          avatarUrl: event.user?.avatarUrl,
          startedAt: event.startedAt,
        };

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = newUser;
          return next;
        }

        return [...prev, newUser];
      });
    };

    const handleTypingStop = (event: TypingStopEvent) => {
      if (event.userId === currentUserId) return;
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;

      setTypingUsers((prev) => prev.filter((u) => u.userId !== event.userId));
    };

    on(SocketEvents.TYPING_START, handleTypingStart);
    on(SocketEvents.TYPING_STOP, handleTypingStop);

    return () => {
      off(SocketEvents.TYPING_START, handleTypingStart);
      off(SocketEvents.TYPING_STOP, handleTypingStop);
    };
  }, [channelId, threadId, currentUserId]);

  // Reset on channel change
  useEffect(() => {
    setTypingUsers([]);
  }, [channelId, threadId]);

  return typingUsers;
}

export default useTyping;
