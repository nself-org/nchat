"use client";

/**
 * Presence Sync Hook
 *
 * Connects the presence store to the WebSocket system, handling:
 * - Broadcasting own presence status changes
 * - Receiving and updating other users' presence
 * - Stale connection detection and recovery
 * - Periodic heartbeat for last seen timestamps
 * - Idle detection for auto-away
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePresenceStore } from "@/stores/presence-store";
import {
  initializePresenceManager,
  destroyPresenceManager,
  getPresenceManager,
} from "@/lib/presence/presence-manager";
import type {
  PresenceStatus,
  UserPresence,
  TypingStatus,
} from "@/lib/presence/presence-types";
import {
  connect,
  disconnect,
  isConnected,
  on,
  off,
  emit,
  subscribeToConnectionState,
  type ConnectionState,
} from "@/lib/socket/client";
import { SocketEvents, type PresenceEvent } from "@/lib/socket/events";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UsePresenceSyncOptions {
  /**
   * Whether to enable presence sync
   * @default true
   */
  enabled?: boolean;

  /**
   * Heartbeat interval for updating last seen (ms)
   * @default 60000 (1 minute)
   */
  heartbeatInterval?: number;

  /**
   * Stale connection timeout (ms) - reconnect if no data received
   * @default 120000 (2 minutes)
   */
  staleConnectionTimeout?: number;

  /**
   * Auto-reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Max reconnect attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
}

export interface UsePresenceSyncReturn {
  /**
   * Whether the presence system is connected
   */
  isConnected: boolean;

  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Whether the presence system is initializing
   */
  isInitializing: boolean;

  /**
   * Set own presence status
   */
  setStatus: (status: PresenceStatus) => void;

  /**
   * Set custom status
   */
  setCustomStatus: (
    status: { emoji?: string; text?: string; expiresAt?: Date | null } | null,
  ) => void;

  /**
   * Broadcast typing start in a channel
   */
  startTyping: (channelId: string, threadId?: string) => void;

  /**
   * Broadcast typing stop
   */
  stopTyping: () => void;

  /**
   * Subscribe to presence updates for specific users
   */
  subscribeToUsers: (userIds: string[]) => void;

  /**
   * Unsubscribe from presence updates
   */
  unsubscribeFromUsers: (userIds: string[]) => void;

  /**
   * Force reconnect
   */
  reconnect: () => void;

  /**
   * Get user presence
   */
  getUserPresence: (userId: string) => UserPresence | undefined;

  /**
   * Last sync timestamp
   */
  lastSyncAt: Date | null;

  /**
   * Number of reconnect attempts
   */
  reconnectAttempts: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute
const DEFAULT_STALE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second base delay
const RECONNECT_DELAY_MAX = 30000; // 30 seconds max delay

// =============================================================================
// Hook
// =============================================================================

export function usePresenceSync(
  options: UsePresenceSyncOptions = {},
): UsePresenceSyncReturn {
  const {
    enabled = true,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    staleConnectionTimeout = DEFAULT_STALE_TIMEOUT,
    autoReconnect = true,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  const { user } = useAuth();

  // Store state
  const presenceStore = usePresenceStore();
  const {
    setMyStatus,
    setMyCustomStatus,
    setUserPresence,
    setUsersPresence,
    setConnected,
    setLastSyncAt,
    setInitializing,
    setOnlineUserIds,
    addOnlineUser,
    removeOnlineUser,
    setUserTyping,
    clearUserTyping,
    myStatus,
    myCustomStatus,
    settings,
  } = presenceStore;

  // Local state
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastSyncAt, setLastSyncAtLocal] = useState<Date | null>(null);

  // Refs
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const staleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataReceivedRef = useRef<number>(Date.now());
  const isInitializedRef = useRef(false);
  const subscribedUsersRef = useRef<Set<string>>(new Set());

  // =============================================================================
  // Heartbeat - Updates last seen timestamp periodically
  // =============================================================================

  const sendHeartbeat = useCallback(() => {
    if (!isConnected() || !user) return;

    // Send presence update to server
    emit(SocketEvents.PRESENCE_UPDATE, {
      status: myStatus === "invisible" ? "offline" : myStatus,
      customStatus: myCustomStatus?.text,
      customEmoji: myCustomStatus?.emoji,
    });

    const now = new Date();
    setLastSyncAt(now);
    setLastSyncAtLocal(now);
  }, [user, myStatus, myCustomStatus, setLastSyncAt]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);
  }, [sendHeartbeat, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // =============================================================================
  // Stale Connection Detection
  // =============================================================================

  const resetStaleTimer = useCallback(() => {
    lastDataReceivedRef.current = Date.now();

    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
    }

    staleTimerRef.current = setTimeout(() => {
      logger.warn("[PresenceSync] Connection appears stale, reconnecting...");

      // Disconnect and reconnect
      disconnect();

      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(
          RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts),
          RECONNECT_DELAY_MAX,
        );

        reconnectTimerRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, delay);
      }
    }, staleConnectionTimeout);
  }, [
    autoReconnect,
    maxReconnectAttempts,
    reconnectAttempts,
    staleConnectionTimeout,
  ]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handlePresenceUpdate = useCallback(
    (event: PresenceEvent) => {
      // Skip own updates
      if (event.userId === user?.id) return;

      // Reset stale timer - we received data
      resetStaleTimer();

      // Update store
      setUserPresence(event.userId, {
        status: event.status,
        customStatus:
          event.customStatus || event.customEmoji
            ? { text: event.customStatus, emoji: event.customEmoji }
            : undefined,
        lastSeenAt: event.lastSeen ? new Date(event.lastSeen) : new Date(),
      });

      // Update online users
      if (
        event.status === "online" ||
        event.status === "away" ||
        event.status === "dnd"
      ) {
        addOnlineUser(event.userId);
      } else {
        removeOnlineUser(event.userId);
      }
    },
    [
      user?.id,
      resetStaleTimer,
      setUserPresence,
      addOnlineUser,
      removeOnlineUser,
    ],
  );

  const handlePresenceBulk = useCallback(
    (event: { presences: PresenceEvent[] }) => {
      // Reset stale timer
      resetStaleTimer();

      const presences = event.presences
        .filter((p) => p.userId !== user?.id)
        .map((p) => ({
          userId: p.userId,
          status: p.status,
          customStatus:
            p.customStatus || p.customEmoji
              ? { text: p.customStatus, emoji: p.customEmoji }
              : undefined,
          lastSeenAt: p.lastSeen ? new Date(p.lastSeen) : undefined,
        }));

      setUsersPresence(presences);

      // Update online user IDs
      const onlineIds = event.presences
        .filter(
          (p) =>
            p.userId !== user?.id &&
            ["online", "away", "dnd"].includes(p.status),
        )
        .map((p) => p.userId);
      setOnlineUserIds(onlineIds);
    },
    [user?.id, resetStaleTimer, setUsersPresence, setOnlineUserIds],
  );

  const handleTypingStart = useCallback(
    (event: {
      userId: string;
      channelId: string;
      threadId?: string;
      user?: { displayName?: string };
    }) => {
      if (event.userId === user?.id) return;

      const contextKey = event.threadId
        ? `thread:${event.threadId}`
        : `channel:${event.channelId}`;

      setUserTyping(contextKey, {
        userId: event.userId,
        userName: event.user?.displayName || "Someone",
        channelId: event.channelId,
        threadId: event.threadId,
        startedAt: new Date(),
      });
    },
    [user?.id, setUserTyping],
  );

  const handleTypingStop = useCallback(
    (event: { userId: string; channelId: string; threadId?: string }) => {
      if (event.userId === user?.id) return;

      const contextKey = event.threadId
        ? `thread:${event.threadId}`
        : `channel:${event.channelId}`;

      clearUserTyping(contextKey, event.userId);
    },
    [user?.id, clearUserTyping],
  );

  // =============================================================================
  // Connection State Handler
  // =============================================================================

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeToConnectionState((state) => {
      setConnectionState(state);
      setConnected(state === "connected");

      if (state === "connected") {
        setReconnectAttempts(0);
        startHeartbeat();
        resetStaleTimer();

        // Re-subscribe to previously subscribed users
        if (subscribedUsersRef.current.size > 0) {
          emit(SocketEvents.PRESENCE_SUBSCRIBE, {
            userIds: Array.from(subscribedUsersRef.current),
          });
        }
      } else if (state === "disconnected") {
        stopHeartbeat();

        if (staleTimerRef.current) {
          clearTimeout(staleTimerRef.current);
          staleTimerRef.current = null;
        }
      }
    });

    return unsubscribe;
  }, [enabled, setConnected, startHeartbeat, stopHeartbeat, resetStaleTimer]);

  // =============================================================================
  // Socket Event Listeners
  // =============================================================================

  useEffect(() => {
    if (!enabled || !user) return;

    // Set up event listeners
    on(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
    on(SocketEvents.PRESENCE_BULK, handlePresenceBulk);
    on(SocketEvents.TYPING_START, handleTypingStart);
    on(SocketEvents.TYPING_STOP, handleTypingStop);

    return () => {
      off(SocketEvents.PRESENCE_UPDATE, handlePresenceUpdate);
      off(SocketEvents.PRESENCE_BULK, handlePresenceBulk);
      off(SocketEvents.TYPING_START, handleTypingStart);
      off(SocketEvents.TYPING_STOP, handleTypingStop);
    };
  }, [
    enabled,
    user,
    handlePresenceUpdate,
    handlePresenceBulk,
    handleTypingStart,
    handleTypingStop,
  ]);

  // =============================================================================
  // Initialize Presence Manager
  // =============================================================================

  useEffect(() => {
    if (!enabled || !user || isInitializedRef.current) return;

    // Initialize the presence manager
    initializePresenceManager({
      userId: user.id,
      initialStatus: myStatus,
      initialCustomStatus: myCustomStatus ?? undefined,
      settings: settings,
      onOwnPresenceChange: (presence) => {
        // This is called when our own presence changes (e.g., from idle detection)
        // The store is already updated by the manager
      },
      onUserPresenceChange: (userId, presence) => {
        // Update store when other users' presence changes
        setUserPresence(userId, presence);
      },
      onTypingChange: (contextKey, users) => {
        // Typing is handled by store directly
      },
    });

    isInitializedRef.current = true;
    setInitializing(false);

    // Connect to socket (token is handled internally by socket client)
    connect();

    return () => {
      destroyPresenceManager();
      isInitializedRef.current = false;
    };
  }, [
    enabled,
    user,
    myStatus,
    myCustomStatus,
    settings,
    setUserPresence,
    setInitializing,
  ]);

  // =============================================================================
  // Cleanup on unmount
  // =============================================================================

  useEffect(() => {
    return () => {
      stopHeartbeat();

      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [stopHeartbeat]);

  // =============================================================================
  // Actions
  // =============================================================================

  const setStatus = useCallback(
    (status: PresenceStatus) => {
      setMyStatus(status);

      if (isConnected()) {
        emit(SocketEvents.PRESENCE_UPDATE, {
          status: status === "invisible" ? "offline" : status,
          customStatus: myCustomStatus?.text,
          customEmoji: myCustomStatus?.emoji,
        });
      }
    },
    [setMyStatus, myCustomStatus],
  );

  const setCustomStatus = useCallback(
    (
      status: { emoji?: string; text?: string; expiresAt?: Date | null } | null,
    ) => {
      setMyCustomStatus(status);

      if (isConnected()) {
        emit(SocketEvents.USER_STATUS, {
          status: myStatus === "invisible" ? "offline" : myStatus,
          customStatus: status?.text,
          customEmoji: status?.emoji,
          expiresAt: status?.expiresAt?.toISOString(),
        });
      }
    },
    [setMyCustomStatus, myStatus],
  );

  const startTyping = useCallback((channelId: string, threadId?: string) => {
    const manager = getPresenceManager();
    manager?.handleTyping(channelId, threadId);
  }, []);

  const stopTypingHandler = useCallback(() => {
    const manager = getPresenceManager();
    manager?.stopTyping();
  }, []);

  const subscribeToUsers = useCallback((userIds: string[]) => {
    // Track subscribed users
    userIds.forEach((id) => subscribedUsersRef.current.add(id));

    if (isConnected()) {
      emit(SocketEvents.PRESENCE_SUBSCRIBE, { userIds });
    }
  }, []);

  const unsubscribeFromUsers = useCallback((userIds: string[]) => {
    // Remove from tracked users
    userIds.forEach((id) => subscribedUsersRef.current.delete(id));

    if (isConnected()) {
      emit(SocketEvents.PRESENCE_UNSUBSCRIBE, { userIds });
    }
  }, []);

  const reconnectHandler = useCallback(() => {
    disconnect();
    setReconnectAttempts(0);
    connect();
  }, []);

  const getUserPresence = useCallback(
    (userId: string): UserPresence | undefined => {
      return presenceStore.presenceMap[userId];
    },
    [presenceStore.presenceMap],
  );

  // =============================================================================
  // Return
  // =============================================================================

  return {
    isConnected: connectionState === "connected",
    connectionState,
    isInitializing: presenceStore.isInitializing,
    setStatus,
    setCustomStatus,
    startTyping,
    stopTyping: stopTypingHandler,
    subscribeToUsers,
    unsubscribeFromUsers,
    reconnect: reconnectHandler,
    getUserPresence,
    lastSyncAt,
    reconnectAttempts,
  };
}

export default usePresenceSync;
