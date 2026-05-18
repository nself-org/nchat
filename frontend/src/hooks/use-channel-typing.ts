"use client";

/**
 * useChannelTyping Hook
 *
 * Comprehensive hook for managing typing indicators in a channel.
 * Integrates the typing store with WebSocket events and provides
 * debounced typing broadcasts.
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import {
  useTypingStore,
  getChannelContextKey,
  getThreadContextKey,
  type TypingUser,
} from "@/stores/typing-store";
import { emit, on, off, isConnected } from "@/lib/socket/client";
import {
  SocketEvents,
  type TypingStartEvent,
  type TypingStopEvent,
} from "@/lib/socket/events";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Constants
// ============================================================================

/** Time in ms before typing indicator expires */
const TYPING_TIMEOUT = 5000;

/** Minimum time between sending typing events to server */
const TYPING_THROTTLE_INTERVAL = 2000;

/** Debounce delay for input changes before triggering typing */
const TYPING_DEBOUNCE_DELAY = 300;

// ============================================================================
// Types
// ============================================================================

export interface UseChannelTypingOptions {
  /** Channel ID to track typing for */
  channelId: string;
  /** Thread ID if typing in a thread */
  threadId?: string;
  /** Whether typing tracking is enabled */
  enabled?: boolean;
  /** Callback when typing users change */
  onTypingUsersChange?: (users: TypingUser[]) => void;
}

export interface UseChannelTypingReturn {
  /** List of users currently typing (excluding current user) */
  typingUsers: TypingUser[];
  /** Whether current user is typing */
  isTyping: boolean;
  /** Formatted typing indicator text */
  typingText: string | null;
  /** Call on input change to trigger typing indicator */
  handleInputChange: (value: string) => void;
  /** Manually start typing indicator */
  startTyping: () => void;
  /** Manually stop typing indicator */
  stopTyping: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing typing indicators in a channel or thread
 *
 * @example
 * ```tsx
 * const { typingUsers, typingText, handleInputChange, stopTyping } = useChannelTyping({
 *   channelId: 'channel-123',
 * });
 *
 * // In message input
 * <input onChange={(e) => handleInputChange(e.target.value)} onBlur={stopTyping} />
 *
 * // Display typing indicator
 * {typingText && <div>{typingText}</div>}
 * ```
 */
export function useChannelTyping(
  options: UseChannelTypingOptions,
): UseChannelTypingReturn {
  const { channelId, threadId, enabled = true, onTypingUsersChange } = options;

  const { user } = useAuth();
  const currentUserId = user?.id;

  // Create context key
  const contextKey = useMemo(() => {
    if (threadId) {
      return getThreadContextKey(threadId);
    }
    return getChannelContextKey(channelId);
  }, [channelId, threadId]);

  // Get store actions and state
  const {
    setUserTyping,
    clearUserTyping,
    getTypingUsers,
    startTyping: storeStartTyping,
    stopTyping: storeStopTyping,
    isTyping: storeIsTyping,
    typingInContext,
    cleanupExpired,
  } = useTypingStore();

  // Refs for timing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmitRef = useRef<number>(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const previousValueRef = useRef<string>("");
  const onTypingUsersChangeRef = useRef(onTypingUsersChange);

  // Update callback ref
  useEffect(() => {
    onTypingUsersChangeRef.current = onTypingUsersChange;
  }, [onTypingUsersChange]);

  // Get typing users for this context (excluding current user)
  const typingUsers = useMemo(() => {
    const users = getTypingUsers(contextKey);
    return users.filter((u) => u.userId !== currentUserId);
  }, [getTypingUsers, contextKey, currentUserId]);

  // Check if current user is typing in this context
  const isTyping = storeIsTyping && typingInContext === contextKey;

  // Generate typing text
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return null;

    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }

    if (typingUsers.length === 3) {
      return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers[2].userName} are typing...`;
    }

    return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers.length - 2} others are typing...`;
  }, [typingUsers]);

  // ============================================================================
  // Emit Functions
  // ============================================================================

  /** Emit typing start to server (throttled) */
  const emitTypingStart = useCallback(() => {
    if (!enabled || !isConnected()) return;

    const now = Date.now();
    if (now - lastEmitRef.current < TYPING_THROTTLE_INTERVAL) {
      return;
    }

    emit(SocketEvents.TYPING_START, {
      channelId,
      threadId,
    });
    lastEmitRef.current = now;
  }, [channelId, threadId, enabled]);

  /** Emit typing stop to server */
  const emitTypingStop = useCallback(() => {
    if (!enabled || !isConnected()) return;

    emit(SocketEvents.TYPING_STOP, {
      channelId,
      threadId,
    });
  }, [channelId, threadId, enabled]);

  // ============================================================================
  // Public Functions
  // ============================================================================

  /** Start typing indicator */
  const startTyping = useCallback(() => {
    if (!enabled) return;

    // Update store
    storeStartTyping(contextKey);

    // Emit to server
    emitTypingStart();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set auto-stop timeout
    typingTimeoutRef.current = setTimeout(() => {
      storeStopTyping();
      emitTypingStop();
    }, TYPING_TIMEOUT);
  }, [
    contextKey,
    enabled,
    storeStartTyping,
    storeStopTyping,
    emitTypingStart,
    emitTypingStop,
  ]);

  /** Stop typing indicator */
  const stopTyping = useCallback(() => {
    if (!enabled) return;

    // Clear timers
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Update store
    if (storeIsTyping && typingInContext === contextKey) {
      storeStopTyping();
      emitTypingStop();
    }
  }, [
    contextKey,
    enabled,
    storeIsTyping,
    typingInContext,
    storeStopTyping,
    emitTypingStop,
  ]);

  /** Handle input change with debounce */
  const handleInputChange = useCallback(
    (value: string) => {
      if (!enabled) return;

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
    [enabled, startTyping, stopTyping],
  );

  // ============================================================================
  // WebSocket Event Handlers
  // ============================================================================

  useEffect(() => {
    if (!enabled) return;

    /** Handle typing start event from other users */
    const handleTypingStart = (event: TypingStartEvent) => {
      // Ignore own events
      if (event.userId === currentUserId) return;

      // Check if this is for our context
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      // Add user to typing store
      setUserTyping(contextKey, {
        userId: event.userId,
        userName: event.user?.displayName ?? "Unknown",
        userAvatar: event.user?.avatarUrl,
        startedAt: Date.now(),
      });
    };

    /** Handle typing stop event from other users */
    const handleTypingStop = (event: TypingStopEvent) => {
      // Ignore own events
      if (event.userId === currentUserId) return;

      // Check if this is for our context
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      // Remove user from typing store
      clearUserTyping(contextKey, event.userId);
    };

    // Subscribe to events
    on(SocketEvents.TYPING_START, handleTypingStart);
    on(SocketEvents.TYPING_STOP, handleTypingStop);

    return () => {
      off(SocketEvents.TYPING_START, handleTypingStart);
      off(SocketEvents.TYPING_STOP, handleTypingStop);
    };
  }, [
    channelId,
    threadId,
    contextKey,
    currentUserId,
    enabled,
    setUserTyping,
    clearUserTyping,
  ]);

  // ============================================================================
  // Cleanup Effects
  // ============================================================================

  // Periodic cleanup of expired typing indicators
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      cleanupExpired();
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, cleanupExpired]);

  // Notify parent of typing users changes
  useEffect(() => {
    onTypingUsersChangeRef.current?.(typingUsers);
  }, [typingUsers]);

  // Reset when channel changes
  useEffect(() => {
    previousValueRef.current = "";

    return () => {
      // Stop typing when unmounting or changing channels
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Emit stop if currently typing
      if (storeIsTyping && typingInContext === contextKey && isConnected()) {
        emit(SocketEvents.TYPING_STOP, { channelId, threadId });
      }
    };
  }, [channelId, threadId, contextKey, storeIsTyping, typingInContext]);

  return {
    typingUsers,
    isTyping,
    typingText,
    handleInputChange,
    startTyping,
    stopTyping,
  };
}

export default useChannelTyping;
