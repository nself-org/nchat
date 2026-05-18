/**
 * useRealtime Hook
 *
 * Main hook for connecting to the nself-plugins realtime server.
 * Manages connection lifecycle, authentication, and provides access to all realtime features.
 *
 * @module hooks/use-realtime
 * @version 1.0.0
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  realtimeClient,
  RealtimeConnectionState,
  RealtimeClientConfig,
  RealtimeError,
} from "@/services/realtime/realtime-client";
import {
  initializePresenceService,
  resetPresenceService,
  getPresenceService,
} from "@/services/realtime/presence.service";
import {
  initializeTypingService,
  resetTypingService,
  getTypingService,
} from "@/services/realtime/typing.service";
import { logger } from "@/lib/logger";
import {
  initializeRoomsService,
  resetRoomsService,
  getRoomsService,
} from "@/services/realtime/rooms.service";

// ============================================================================
// Types
// ============================================================================

/**
 * Realtime hook options
 */
export interface UseRealtimeOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Enable presence tracking */
  enablePresence?: boolean;
  /** Enable typing indicators */
  enableTyping?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Client configuration overrides */
  config?: Partial<RealtimeClientConfig>;
}

/**
 * Realtime hook return value
 */
export interface UseRealtimeReturn {
  /** Whether connected to the realtime server */
  isConnected: boolean;
  /** Whether authenticated with the server */
  isAuthenticated: boolean;
  /** Current connection state */
  connectionState: RealtimeConnectionState;
  /** Connection error if any */
  error: RealtimeError | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Socket ID */
  socketId: string | undefined;
  /** Connect to the realtime server */
  connect: () => Promise<void>;
  /** Disconnect from the realtime server */
  disconnect: () => void;
  /** Reconnect to the server */
  reconnect: () => Promise<void>;
  /** Subscribe to an event */
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
  /** Emit an event */
  emit: <T = unknown>(event: string, data?: T) => void;
  /** Emit an event and wait for response */
  emitAsync: <T = unknown, R = unknown>(event: string, data?: T) => Promise<R>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Main realtime connection hook
 *
 * @example
 * ```tsx
 * function ChatApp() {
 *   const {
 *     isConnected,
 *     connectionState,
 *     connect,
 *     disconnect,
 *     on,
 *     emit,
 *   } = useRealtime({ autoConnect: true });
 *
 *   useEffect(() => {
 *     if (!isConnected) return;
 *
 *     const unsub = on('message:new', (message) => {
 *       /* console.log 'New message:', message);
 *     });
 *
 *     return unsub;
 *   }, [isConnected, on]);
 *
 *   return (
 *     <div>
 *       Status: {connectionState}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtime(
  options: UseRealtimeOptions = {},
): UseRealtimeReturn {
  const {
    autoConnect = true,
    enablePresence = true,
    enableTyping = true,
    debug = false,
    config,
  } = options;

  const { user } = useAuth();

  // State
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("disconnected");
  const [error, setError] = useState<RealtimeError | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs
  const isInitializedRef = useRef(false);
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the realtime server
   */
  const connect = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error("User must be authenticated to connect");
    }

    try {
      setError(null);

      // Initialize client
      realtimeClient.initialize({
        debug,
        ...config,
      });

      // Connect with token (in dev mode, use a mock token)
      // In production, this would be a JWT from the auth service
      const token = `user:${user.id}`;
      await realtimeClient.connect(token);

      // Initialize services
      if (enablePresence) {
        initializePresenceService({ debug });
      }

      if (enableTyping) {
        initializeTypingService({ debug });
      }

      initializeRoomsService({ debug });

      isInitializedRef.current = true;
    } catch (err) {
      const error: RealtimeError = {
        code: "CONNECTION_FAILED",
        message: err instanceof Error ? err.message : "Failed to connect",
      };
      setError(error);
      throw err;
    }
  }, [user, debug, config, enablePresence, enableTyping]);

  /**
   * Disconnect from the realtime server
   */
  const disconnect = useCallback((): void => {
    // Reset services
    resetPresenceService();
    resetTypingService();
    resetRoomsService();

    // Disconnect client
    realtimeClient.disconnect();

    isInitializedRef.current = false;
  }, []);

  /**
   * Reconnect to the server
   */
  const reconnect = useCallback(async (): Promise<void> => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Subscribe to an event
   */
  const on = useCallback(
    <T = unknown>(event: string, callback: (data: T) => void): (() => void) => {
      return realtimeClient.on<T>(event, callback);
    },
    [],
  );

  /**
   * Emit an event
   */
  const emit = useCallback(<T = unknown>(event: string, data?: T): void => {
    realtimeClient.emit(event, data);
  }, []);

  /**
   * Emit an event and wait for response
   */
  const emitAsync = useCallback(
    <T = unknown, R = unknown>(event: string, data?: T): Promise<R> => {
      return realtimeClient.emitAsync<T, R>(event, data);
    },
    [],
  );

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Subscribe to connection state changes
   */
  useEffect(() => {
    const unsub = realtimeClient.onConnectionStateChange((state) => {
      setConnectionState(state);
    });

    unsubscribersRef.current.push(unsub);

    return () => {
      unsub();
      unsubscribersRef.current = unsubscribersRef.current.filter(
        (u) => u !== unsub,
      );
    };
  }, []);

  /**
   * Subscribe to errors
   */
  useEffect(() => {
    const unsub = realtimeClient.onError((err) => {
      setError(err);
    });

    unsubscribersRef.current.push(unsub);

    return () => {
      unsub();
      unsubscribersRef.current = unsubscribersRef.current.filter(
        (u) => u !== unsub,
      );
    };
  }, []);

  /**
   * Track reconnection attempts
   */
  useEffect(() => {
    setReconnectAttempts(realtimeClient.reconnectAttemptCount);
  }, [connectionState]);

  /**
   * Auto-connect when user is available
   */
  useEffect(() => {
    if (autoConnect && user && !isInitializedRef.current) {
      connect().catch((err) => {
        if (debug) {
          logger.error("[useRealtime] Auto-connect failed:", err);
        }
      });
    }

    return () => {
      // Disconnect on unmount
      if (isInitializedRef.current) {
        disconnect();
      }
    };
  }, [autoConnect, user, connect, disconnect, debug]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isConnected: realtimeClient.isConnected,
    isAuthenticated: realtimeClient.isAuthenticated,
    connectionState,
    error,
    reconnectAttempts,
    socketId: realtimeClient.socketId,
    connect,
    disconnect,
    reconnect,
    on,
    emit,
    emitAsync,
  };
}

export default useRealtime;
