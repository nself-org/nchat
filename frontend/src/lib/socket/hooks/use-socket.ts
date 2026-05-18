/**
 * useSocket Hook
 *
 * Main socket hook that manages connection lifecycle, exposes
 * connection state, and provides emit functionality.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  connect,
  disconnect,
  getSocket,
  isConnected,
  subscribeToConnectionState,
  emit as socketEmit,
  on as socketOn,
  off as socketOff,
  updateAuthToken,
  type ConnectionState,
  type TypedSocket,
} from "../client";
import type { ClientToServerEvents, ServerToClientEvents } from "../events";

import { logger } from "@/lib/logger";

export interface UseSocketOptions {
  /**
   * Authentication token for socket connection
   */
  token?: string | null;

  /**
   * Whether to auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Callback when connected
   */
  onConnect?: () => void;

  /**
   * Callback when disconnected
   */
  onDisconnect?: (reason: string) => void;

  /**
   * Callback on connection error
   */
  onError?: (error: Error) => void;

  /**
   * Callback on reconnecting
   */
  onReconnecting?: (attempt: number) => void;
}

export interface UseSocketReturn {
  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Whether socket is connected
   */
  isConnected: boolean;

  /**
   * Socket instance (if available)
   */
  socket: TypedSocket | null;

  /**
   * Connect to socket server
   */
  connect: (token?: string) => void;

  /**
   * Disconnect from socket server
   */
  disconnect: () => void;

  /**
   * Emit an event
   */
  emit: <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => void;

  /**
   * Subscribe to an event
   */
  on: <K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K],
  ) => void;

  /**
   * Unsubscribe from an event
   */
  off: <K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K],
  ) => void;

  /**
   * Update authentication token
   */
  updateToken: (token: string | null) => void;
}

/**
 * Hook for managing Socket.io connection
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    token,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onReconnecting,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  // Refs for callbacks to avoid effect dependencies
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  const onReconnectingRef = useRef(onReconnecting);

  // Update refs when callbacks change
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
    onReconnectingRef.current = onReconnecting;
  }, [onConnect, onDisconnect, onError, onReconnecting]);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = subscribeToConnectionState((state) => {
      setConnectionState(state);
      setConnected(state === "connected");

      // Trigger callbacks based on state
      switch (state) {
        case "connected":
          onConnectRef.current?.();
          break;
        case "error":
          onErrorRef.current?.(new Error("Socket connection error"));
          break;
        case "reconnecting":
          onReconnectingRef.current?.(1);
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Update socket reference
  useEffect(() => {
    setSocket(getSocket());
  }, [connectionState]);

  // Handle initial connection
  useEffect(() => {
    if (autoConnect && token) {
      connect(token);
    }

    return () => {
      // Don't disconnect on unmount - let the provider handle that
    };
  }, [autoConnect, token]);

  // Handle token changes
  useEffect(() => {
    if (token) {
      updateAuthToken(token);
    }
  }, [token]);

  // Set up disconnect reason handler
  useEffect(() => {
    const currentSocket = getSocket();
    if (!currentSocket) return;

    const handleDisconnect = (reason: string) => {
      onDisconnectRef.current?.(reason);
    };

    currentSocket.on("disconnect", handleDisconnect);

    return () => {
      currentSocket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  // Memoized connect function
  const connectFn = useCallback((connectToken?: string) => {
    connect(connectToken);
    setSocket(getSocket());
  }, []);

  // Memoized disconnect function
  const disconnectFn = useCallback(() => {
    disconnect();
    setSocket(null);
  }, []);

  // Memoized emit function
  const emit = useCallback(
    <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => {
      socketEmit(event, ...args);
    },
    [],
  );

  // Memoized on function
  const on = useCallback(
    <K extends keyof ServerToClientEvents>(
      event: K,
      handler: ServerToClientEvents[K],
    ) => {
      socketOn(event, handler);
    },
    [],
  );

  // Memoized off function
  const off = useCallback(
    <K extends keyof ServerToClientEvents>(
      event: K,
      handler?: ServerToClientEvents[K],
    ) => {
      socketOff(event, handler);
    },
    [],
  );

  // Memoized update token function
  const updateToken = useCallback((newToken: string | null) => {
    updateAuthToken(newToken);
  }, []);

  return {
    connectionState,
    isConnected: connected,
    socket,
    connect: connectFn,
    disconnect: disconnectFn,
    emit,
    on,
    off,
    updateToken,
  };
}

/**
 * Hook for subscribing to a specific socket event
 */
export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
  enabled = true,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const wrappedHandler = ((...args: unknown[]) => {
      (handlerRef.current as (...args: unknown[]) => void)(...args);
    }) as ServerToClientEvents[K];

    socketOn(event, wrappedHandler);

    return () => {
      socketOff(event, wrappedHandler);
    };
  }, [event, enabled]);
}

/**
 * Hook for emitting socket events with automatic connection check
 */
export function useSocketEmit<K extends keyof ClientToServerEvents>(
  event: K,
): (...args: Parameters<ClientToServerEvents[K]>) => boolean {
  return useCallback(
    (...args: Parameters<ClientToServerEvents[K]>) => {
      if (isConnected()) {
        socketEmit(event, ...args);
        return true;
      }
      logger.warn(`[useSocketEmit] Cannot emit ${event}, not connected`);
      return false;
    },
    [event],
  );
}

export default useSocket;
