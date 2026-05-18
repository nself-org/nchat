"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "./use-socket";
import { SOCKET_EVENTS, type TypingPayload } from "@/lib/realtime";
import { useAuth } from "@/contexts/auth-context";
import { useUserStore } from "@/stores/user-store";

/**
 * User typing information
 */
export interface TypingUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  startedAt: string;
}

/**
 * Typing indicator configuration
 */
export interface TypingConfig {
  /** Debounce time before sending typing event (ms) */
  debounceMs?: number;
  /** Timeout before removing typing indicator (ms) */
  timeoutMs?: number;
  /** Throttle time between typing events (ms) */
  throttleMs?: number;
}

const DEFAULT_CONFIG: Required<TypingConfig> = {
  debounceMs: 300,
  timeoutMs: 5000,
  throttleMs: 2000,
};

/**
 * Hook to manage typing indicators for a channel
 *
 * @param channelId - Channel ID to track typing in
 * @param config - Configuration options
 * @returns Typing state and control functions
 */
export function useTyping(channelId: string, config: TypingConfig = {}) {
  const { subscribe, emit, isConnected } = useSocket();
  const { user } = useAuth();
  const getUser = useUserStore((state) => state.getUser);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Refs for timing control
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmitTimeRef = useRef(0);
  const timeoutTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Remove a user from the typing list
   */
  const removeTypingUser = useCallback((userId: string) => {
    setTypingUsers((prev) => prev.filter((u) => u.id !== userId));

    // Clear timeout timer
    const timer = timeoutTimersRef.current.get(userId);
    if (timer) {
      clearTimeout(timer);
      timeoutTimersRef.current.delete(userId);
    }
  }, []);

  /**
   * Add or update a user in the typing list
   */
  const addTypingUser = useCallback(
    (typingUser: TypingUser) => {
      setTypingUsers((prev) => {
        // Remove if already exists
        const filtered = prev.filter((u) => u.id !== typingUser.id);
        // Add with current timestamp
        return [
          ...filtered,
          { ...typingUser, startedAt: new Date().toISOString() },
        ];
      });

      // Clear existing timeout for this user
      const existingTimer = timeoutTimersRef.current.get(typingUser.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timeout to remove user after timeout period
      const timer = setTimeout(() => {
        removeTypingUser(typingUser.id);
      }, fullConfig.timeoutMs);

      timeoutTimersRef.current.set(typingUser.id, timer);
    },
    [fullConfig.timeoutMs, removeTypingUser],
  );

  /**
   * Emit typing event to server
   */
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!isConnected || !channelId) return;

      emit<TypingPayload>(SOCKET_EVENTS.MESSAGE_TYPING, {
        channelId,
        userId: user?.id || "",
        isTyping,
      });
    },
    [isConnected, channelId, user?.id, emit],
  );

  /**
   * Start typing indicator
   * Called when user starts typing
   */
  const startTyping = useCallback(() => {
    if (!isConnected || !user || isTypingRef.current) return;

    // Check throttle
    const now = Date.now();
    const timeSinceLastEmit = now - lastEmitTimeRef.current;

    if (timeSinceLastEmit < fullConfig.throttleMs) {
      // Still in throttle period, don't emit
      return;
    }

    isTypingRef.current = true;
    lastEmitTimeRef.current = now;
    emitTyping(true);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [isConnected, user, fullConfig.throttleMs, emitTyping]);

  /**
   * Stop typing indicator
   * Called when user stops typing (debounced)
   */
  const stopTyping = useCallback(() => {
    if (!isConnected || !user || !isTypingRef.current) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the stop event
    debounceTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
      debounceTimerRef.current = null;
    }, fullConfig.debounceMs);
  }, [isConnected, user, fullConfig.debounceMs, emitTyping]);

  /**
   * Handle typing input
   * Call this on every keystroke in the message input
   */
  const handleTyping = useCallback(() => {
    if (!isConnected || !user) return;

    // Start typing if not already
    if (!isTypingRef.current) {
      startTyping();
    }

    // Reset stop typing debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      stopTyping();
    }, fullConfig.debounceMs);
  }, [isConnected, user, fullConfig.debounceMs, startTyping, stopTyping]);

  /**
   * Force stop typing
   * Call this when message is sent or input is cleared
   */
  const forceStopTyping = useCallback(() => {
    if (!isConnected || !user) return;

    // Clear all timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }

    // Immediately emit stop typing
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(false);
    }
  }, [isConnected, user, emitTyping]);

  /**
   * Subscribe to typing events from other users
   */
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const unsubscribe = subscribe<TypingPayload>(
      SOCKET_EVENTS.MESSAGE_TYPING,
      (data) => {
        // Ignore own typing events
        if (data.userId === user?.id) return;

        // Only process events for current channel
        if (data.channelId !== channelId) return;

        if (data.isTyping) {
          // Add user to typing list - fetch user info from store
          const cachedUser = getUser(data.userId);
          const typingUser: TypingUser = {
            id: data.userId,
            username: cachedUser?.username || data.userId,
            displayName: cachedUser?.displayName || data.userId,
            avatarUrl: cachedUser?.avatarUrl,
            startedAt: new Date().toISOString(),
          };
          addTypingUser(typingUser);
        } else {
          // Remove user from typing list
          removeTypingUser(data.userId);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [
    isConnected,
    channelId,
    user?.id,
    subscribe,
    addTypingUser,
    removeTypingUser,
  ]);

  /**
   * Cleanup on unmount or channel change
   */
  useEffect(() => {
    return () => {
      // Stop typing on unmount
      forceStopTyping();

      // Clear all timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      timeoutTimersRef.current.forEach((timer) => clearTimeout(timer));
      timeoutTimersRef.current.clear();
    };
  }, [forceStopTyping]);

  /**
   * Auto-cleanup stale typing indicators
   * Remove users who haven't sent typing event in timeout period
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) =>
        prev.filter((user) => {
          const elapsed = now - new Date(user.startedAt).getTime();
          return elapsed < fullConfig.timeoutMs;
        }),
      );
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [fullConfig.timeoutMs]);

  return {
    /** List of users currently typing (excluding self) */
    typingUsers,
    /** Whether user is currently marked as typing */
    isTyping: isTypingRef.current,
    /** Call this on every keystroke */
    handleTyping,
    /** Start typing indicator */
    startTyping,
    /** Stop typing indicator (debounced) */
    stopTyping,
    /** Force stop typing immediately (e.g., on message send) */
    forceStopTyping,
  };
}

/**
 * Simpler hook for just displaying typing indicators
 * Use this in components that only need to show who's typing
 */
export function useTypingIndicator(channelId: string) {
  const { typingUsers } = useTyping(channelId);
  return typingUsers;
}
