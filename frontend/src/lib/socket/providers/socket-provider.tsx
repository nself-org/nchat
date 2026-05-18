/**
 * SocketProvider
 *
 * React context provider that wraps the app with socket connection,
 * provides socket instance to children, handles auth token updates,
 * and exposes connection status.
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  createSocket,
  connect,
  disconnect,
  cleanup,
  getSocket,
  updateAuthToken,
  subscribeToConnectionState,
  emit as socketEmit,
  on as socketOn,
  off as socketOff,
  isConnected as checkIsConnected,
  type ConnectionState,
  type TypedSocket,
} from "../client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PresenceStatus,
} from "../events";
import { SocketEvents } from "../events";

// =============================================================================
// Context Types
// =============================================================================

export interface SocketContextValue {
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
   * Update authentication token
   */
  updateToken: (token: string | null) => void;

  /**
   * Emit an event with type safety
   */
  emit: <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => void;

  /**
   * Subscribe to an event with type safety
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
   * Current user ID (if authenticated)
   */
  userId: string | null;

  /**
   * Set current user ID
   */
  setUserId: (userId: string | null) => void;
}

// =============================================================================
// Context
// =============================================================================

const SocketContext = createContext<SocketContextValue | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

export interface SocketProviderProps {
  children: React.ReactNode;

  /**
   * Authentication token for socket connection
   */
  token?: string | null;

  /**
   * Current user ID
   */
  userId?: string | null;

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
   * Initial presence status to set on connect
   * @default 'online'
   */
  initialPresence?: PresenceStatus;
}

// =============================================================================
// Provider Component
// =============================================================================

export function SocketProvider({
  children,
  token,
  userId: initialUserId,
  autoConnect = true,
  onConnect,
  onDisconnect,
  onError,
  initialPresence = "online",
}: SocketProviderProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);

  // Refs for callbacks
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onConnect, onDisconnect, onError]);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = subscribeToConnectionState((state) => {
      setConnectionState(state);
      setSocket(getSocket());

      // Trigger callbacks
      if (state === "connected") {
        onConnectRef.current?.();

        // Set initial presence
        if (checkIsConnected()) {
          socketEmit(SocketEvents.PRESENCE_UPDATE, {
            status: initialPresence,
          });
        }
      } else if (state === "error") {
        onErrorRef.current?.(new Error("Socket connection error"));
      }
    });

    return unsubscribe;
  }, [initialPresence]);

  // Handle initial connection
  useEffect(() => {
    if (autoConnect && token) {
      createSocket(token);
      connect(token);
    }

    return () => {
      // Set offline presence before disconnecting
      if (checkIsConnected()) {
        socketEmit(SocketEvents.PRESENCE_UPDATE, {
          status: "offline",
        });
      }
      cleanup();
    };
  }, []);

  // Handle token changes
  useEffect(() => {
    if (token) {
      updateAuthToken(token);
      if (autoConnect && !checkIsConnected()) {
        connect(token);
      }
    } else if (checkIsConnected()) {
      disconnect();
    }
  }, [token, autoConnect]);

  // Handle user ID changes
  useEffect(() => {
    if (initialUserId !== undefined) {
      setUserId(initialUserId);
    }
  }, [initialUserId]);

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

  // Memoized context value
  const contextValue = useMemo<SocketContextValue>(() => {
    const connectFn = (connectToken?: string) => {
      connect(connectToken ?? token ?? undefined);
      setSocket(getSocket());
    };

    const disconnectFn = () => {
      // Set offline presence before disconnecting
      if (checkIsConnected()) {
        socketEmit(SocketEvents.PRESENCE_UPDATE, {
          status: "offline",
        });
      }
      disconnect();
      setSocket(null);
    };

    const emit = <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => {
      socketEmit(event, ...args);
    };

    const on = <K extends keyof ServerToClientEvents>(
      event: K,
      handler: ServerToClientEvents[K],
    ) => {
      socketOn(event, handler);
    };

    const off = <K extends keyof ServerToClientEvents>(
      event: K,
      handler?: ServerToClientEvents[K],
    ) => {
      socketOff(event, handler);
    };

    const updateToken = (newToken: string | null) => {
      updateAuthToken(newToken);
    };

    return {
      connectionState,
      isConnected: connectionState === "connected",
      socket,
      connect: connectFn,
      disconnect: disconnectFn,
      updateToken,
      emit,
      on,
      off,
      userId,
      setUserId,
    };
  }, [connectionState, socket, token, userId]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access socket context
 */
export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }

  return context;
}

/**
 * Hook to check if socket is connected (doesn't throw if outside provider)
 */
export function useSocketConnected(): boolean {
  const context = useContext(SocketContext);
  return context?.isConnected ?? false;
}

/**
 * Hook to get connection state (doesn't throw if outside provider)
 */
export function useConnectionState(): ConnectionState {
  const context = useContext(SocketContext);
  return context?.connectionState ?? "disconnected";
}

// =============================================================================
// Connection Status Component
// =============================================================================

export interface ConnectionStatusProps {
  /**
   * Show status indicator
   * @default true
   */
  showIndicator?: boolean;

  /**
   * Show status text
   * @default false
   */
  showText?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Component to display connection status
 */
export function ConnectionStatus({
  showIndicator = true,
  showText = false,
  className = "",
}: ConnectionStatusProps) {
  const { connectionState } = useSocketContext();

  const statusConfig = {
    connected: { color: "bg-green-500", text: "Connected" },
    connecting: { color: "bg-yellow-500", text: "Connecting..." },
    disconnected: { color: "bg-gray-400", text: "Disconnected" },
    reconnecting: { color: "bg-yellow-500", text: "Reconnecting..." },
    error: { color: "bg-red-500", text: "Connection Error" },
  };

  const config = statusConfig[connectionState];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIndicator && (
        <span
          className={`inline-block h-2 w-2 rounded-full ${config.color} ${
            connectionState === "connecting" ||
            connectionState === "reconnecting"
              ? "animate-pulse"
              : ""
          }`}
        />
      )}
      {showText && <span className="text-sm text-gray-600">{config.text}</span>}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default SocketProvider;
