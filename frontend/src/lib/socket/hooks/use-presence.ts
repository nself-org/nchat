/**
 * usePresence Hook
 *
 * Manages user presence tracking including online/away/dnd status,
 * auto-away after idle timeout, and subscribing to other users' presence.
 */

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { emit, on, off, isConnected } from "../client";
import {
  SocketEvents,
  type PresenceStatus,
  type PresenceEvent,
  type PresenceBulkEvent,
} from "../events";

// Default idle timeout in milliseconds (5 minutes)
const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000;

// Throttle presence updates (max once per 30 seconds)
const PRESENCE_UPDATE_THROTTLE = 30 * 1000;

export interface UsePresenceOptions {
  /**
   * Current user ID
   */
  userId?: string;

  /**
   * Initial presence status
   * @default 'online'
   */
  initialStatus?: PresenceStatus;

  /**
   * Enable auto-away when user is idle
   * @default true
   */
  autoAway?: boolean;

  /**
   * Idle timeout in milliseconds before setting away
   * @default 300000 (5 minutes)
   */
  idleTimeout?: number;

  /**
   * Custom status message
   */
  customStatus?: string;

  /**
   * Custom status emoji
   */
  customEmoji?: string;

  /**
   * Callback when presence changes
   */
  onPresenceChange?: (presence: PresenceEvent) => void;
}

export interface UsePresenceReturn {
  /**
   * Current user's presence status
   */
  status: PresenceStatus;

  /**
   * Custom status message
   */
  customStatus?: string;

  /**
   * Custom status emoji
   */
  customEmoji?: string;

  /**
   * Set presence status
   */
  setStatus: (
    status: PresenceStatus,
    options?: { customStatus?: string; customEmoji?: string },
  ) => void;

  /**
   * Set custom status message
   */
  setCustomStatus: (message?: string, emoji?: string) => void;

  /**
   * Clear custom status
   */
  clearCustomStatus: () => void;

  /**
   * Map of user IDs to their presence
   */
  presenceMap: Map<string, PresenceEvent>;

  /**
   * Get presence for a specific user
   */
  getPresence: (userId: string) => PresenceEvent | undefined;

  /**
   * Subscribe to presence updates for specific users
   */
  subscribeToUsers: (userIds: string[]) => void;

  /**
   * Unsubscribe from presence updates for specific users
   */
  unsubscribeFromUsers: (userIds: string[]) => void;

  /**
   * Check if a user is online
   */
  isUserOnline: (userId: string) => boolean;

  /**
   * Whether the user is currently idle
   */
  isIdle: boolean;
}

/**
 * Hook for managing user presence
 */
export function usePresence(
  options: UsePresenceOptions = {},
): UsePresenceReturn {
  const {
    userId,
    initialStatus = "online",
    autoAway = true,
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    customStatus: initialCustomStatus,
    customEmoji: initialCustomEmoji,
    onPresenceChange,
  } = options;

  const [status, setStatusState] = useState<PresenceStatus>(initialStatus);
  const [customStatus, setCustomStatusState] = useState<string | undefined>(
    initialCustomStatus,
  );
  const [customEmoji, setCustomEmojiState] = useState<string | undefined>(
    initialCustomEmoji,
  );
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceEvent>>(
    new Map(),
  );
  const [isIdle, setIsIdle] = useState(false);

  // Refs for tracking
  const lastUpdateRef = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<PresenceStatus>(initialStatus);
  const subscribedUsersRef = useRef<Set<string>>(new Set());
  const onPresenceChangeRef = useRef(onPresenceChange);

  // Update callback ref
  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange;
  }, [onPresenceChange]);

  // Emit presence update to server (throttled)
  const emitPresenceUpdate = useCallback(
    (
      newStatus: PresenceStatus,
      newCustomStatus?: string,
      newCustomEmoji?: string,
    ) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < PRESENCE_UPDATE_THROTTLE) {
        return;
      }

      if (isConnected()) {
        emit(SocketEvents.PRESENCE_UPDATE, {
          status: newStatus,
          customStatus: newCustomStatus,
          customEmoji: newCustomEmoji,
        });
        lastUpdateRef.current = now;
      }
    },
    [],
  );

  // Set presence status
  const setStatus = useCallback(
    (
      newStatus: PresenceStatus,
      statusOptions?: { customStatus?: string; customEmoji?: string },
    ) => {
      setStatusState(newStatus);

      if (statusOptions?.customStatus !== undefined) {
        setCustomStatusState(statusOptions.customStatus);
      }
      if (statusOptions?.customEmoji !== undefined) {
        setCustomEmojiState(statusOptions.customEmoji);
      }

      emitPresenceUpdate(
        newStatus,
        statusOptions?.customStatus ?? customStatus,
        statusOptions?.customEmoji ?? customEmoji,
      );

      // Track previous status for auto-away restoration
      if (newStatus !== "away") {
        previousStatusRef.current = newStatus;
      }
    },
    [customStatus, customEmoji, emitPresenceUpdate],
  );

  // Set custom status message
  const setCustomStatusFn = useCallback(
    (message?: string, emoji?: string) => {
      setCustomStatusState(message);
      setCustomEmojiState(emoji);
      emitPresenceUpdate(status, message, emoji);
    },
    [status, emitPresenceUpdate],
  );

  // Clear custom status
  const clearCustomStatus = useCallback(() => {
    setCustomStatusState(undefined);
    setCustomEmojiState(undefined);
    emitPresenceUpdate(status, undefined, undefined);
  }, [status, emitPresenceUpdate]);

  // Get presence for a specific user
  const getPresence = useCallback(
    (targetUserId: string): PresenceEvent | undefined => {
      return presenceMap.get(targetUserId);
    },
    [presenceMap],
  );

  // Check if a user is online
  const isUserOnline = useCallback(
    (targetUserId: string): boolean => {
      const presence = presenceMap.get(targetUserId);
      return presence?.status === "online" || presence?.status === "dnd";
    },
    [presenceMap],
  );

  // Subscribe to presence updates for specific users
  const subscribeToUsers = useCallback((userIds: string[]) => {
    const newUserIds = userIds.filter(
      (id) => !subscribedUsersRef.current.has(id),
    );

    if (newUserIds.length > 0 && isConnected()) {
      emit(SocketEvents.PRESENCE_SUBSCRIBE, { userIds: newUserIds });
      newUserIds.forEach((id) => subscribedUsersRef.current.add(id));
    }
  }, []);

  // Unsubscribe from presence updates for specific users
  const unsubscribeFromUsers = useCallback((userIds: string[]) => {
    const subscribedIds = userIds.filter((id) =>
      subscribedUsersRef.current.has(id),
    );

    if (subscribedIds.length > 0 && isConnected()) {
      emit(SocketEvents.PRESENCE_UNSUBSCRIBE, { userIds: subscribedIds });
      subscribedIds.forEach((id) => subscribedUsersRef.current.delete(id));
    }
  }, []);

  // Handle incoming presence updates
  useEffect(() => {
    const handlePresenceUpdate = (event: PresenceEvent) => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.set(event.userId, event);
        return next;
      });

      onPresenceChangeRef.current?.(event);
    };

    const handlePresenceBulk = (event: PresenceBulkEvent) => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        event.presences.forEach((presence) => {
          next.set(presence.userId, presence);
        });
        return next;
      });
    };

    on(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
    on(SocketEvents.PRESENCE_BULK, handlePresenceBulk);

    return () => {
      off(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
      off(SocketEvents.PRESENCE_BULK, handlePresenceBulk);
    };
  }, []);

  // Set initial presence on connect
  useEffect(() => {
    if (userId && isConnected()) {
      emitPresenceUpdate(status, customStatus, customEmoji);
    }
  }, [userId, status, customStatus, customEmoji, emitPresenceUpdate]);

  // Auto-away idle detection
  useEffect(() => {
    if (!autoAway || typeof window === "undefined") return;

    const resetIdleTimer = () => {
      // Clear existing timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      // If currently idle/away due to idle, restore previous status
      if (isIdle) {
        setIsIdle(false);
        setStatus(previousStatusRef.current);
      }

      // Set new idle timer
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        // Only set away if not already in dnd mode
        if (status !== "dnd") {
          setStatusState("away");
          emitPresenceUpdate("away", customStatus, customEmoji);
        }
      }, idleTimeout);
    };

    // Events that indicate user activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, set away
        setIsIdle(true);
        if (status !== "dnd") {
          setStatusState("away");
          emitPresenceUpdate("away", customStatus, customEmoji);
        }
      } else {
        // Page is visible, reset idle
        resetIdleTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start initial timer
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    autoAway,
    idleTimeout,
    status,
    customStatus,
    customEmoji,
    isIdle,
    setStatus,
    emitPresenceUpdate,
  ]);

  // Cleanup on unmount - set offline
  useEffect(() => {
    return () => {
      if (userId && isConnected()) {
        emit(SocketEvents.PRESENCE_UPDATE, {
          status: "offline",
          customStatus: undefined,
          customEmoji: undefined,
        });
      }
    };
  }, [userId]);

  return {
    status,
    customStatus,
    customEmoji,
    setStatus,
    setCustomStatus: setCustomStatusFn,
    clearCustomStatus,
    presenceMap,
    getPresence,
    subscribeToUsers,
    unsubscribeFromUsers,
    isUserOnline,
    isIdle,
  };
}

/**
 * Hook for subscribing to presence of visible users (bulk subscription)
 */
export function useBulkPresence(userIds: string[]): Map<string, PresenceEvent> {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceEvent>>(
    new Map(),
  );
  const subscribedRef = useRef<Set<string>>(new Set());

  // Memoize user IDs to avoid unnecessary re-subscriptions
  const memoizedUserIds = useMemo(() => userIds, [JSON.stringify(userIds)]);

  useEffect(() => {
    if (!memoizedUserIds.length || !isConnected()) return;

    // Find new users to subscribe
    const newUsers = memoizedUserIds.filter(
      (id) => !subscribedRef.current.has(id),
    );

    // Find users to unsubscribe
    const removedUsers = Array.from(subscribedRef.current).filter(
      (id) => !memoizedUserIds.includes(id),
    );

    // Subscribe to new users
    if (newUsers.length > 0) {
      emit(SocketEvents.PRESENCE_SUBSCRIBE, { userIds: newUsers });
      newUsers.forEach((id) => subscribedRef.current.add(id));
    }

    // Unsubscribe from removed users
    if (removedUsers.length > 0) {
      emit(SocketEvents.PRESENCE_UNSUBSCRIBE, { userIds: removedUsers });
      removedUsers.forEach((id) => {
        subscribedRef.current.delete(id);
        setPresenceMap((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      });
    }
  }, [memoizedUserIds]);

  // Handle presence updates
  useEffect(() => {
    const handlePresenceUpdate = (event: PresenceEvent) => {
      if (subscribedRef.current.has(event.userId)) {
        setPresenceMap((prev) => {
          const next = new Map(prev);
          next.set(event.userId, event);
          return next;
        });
      }
    };

    const handlePresenceBulk = (event: PresenceBulkEvent) => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        event.presences.forEach((presence) => {
          if (subscribedRef.current.has(presence.userId)) {
            next.set(presence.userId, presence);
          }
        });
        return next;
      });
    };

    on(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
    on(SocketEvents.PRESENCE_BULK, handlePresenceBulk);

    return () => {
      off(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
      off(SocketEvents.PRESENCE_BULK, handlePresenceBulk);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0 && isConnected()) {
        emit(SocketEvents.PRESENCE_UNSUBSCRIBE, {
          userIds: Array.from(subscribedRef.current),
        });
      }
      subscribedRef.current.clear();
    };
  }, []);

  return presenceMap;
}

/**
 * Hook for getting a single user's presence
 */
export function useUserPresence(
  userId: string | undefined,
): PresenceEvent | null {
  const [presence, setPresence] = useState<PresenceEvent | null>(null);

  useEffect(() => {
    if (!userId || !isConnected()) {
      setPresence(null);
      return;
    }

    // Subscribe to user's presence
    emit(SocketEvents.PRESENCE_SUBSCRIBE, { userIds: [userId] });

    const handlePresenceUpdate = (event: PresenceEvent) => {
      if (event.userId === userId) {
        setPresence(event);
      }
    };

    on(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);

    return () => {
      off(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
      if (isConnected()) {
        emit(SocketEvents.PRESENCE_UNSUBSCRIBE, { userIds: [userId] });
      }
    };
  }, [userId]);

  return presence;
}

export default usePresence;
