"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { socketManager, SOCKET_EVENTS } from "@/lib/realtime";
import { useToast } from "@/hooks/use-toast";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

/**
 * Realtime connection state
 */
export type RealtimeConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Realtime context type
 */
interface RealtimeContextType {
  /** Connection state */
  connectionState: RealtimeConnectionState;
  /** Whether connected */
  isConnected: boolean;
  /** Socket ID */
  socketId?: string;
  /** Reconnect attempts count */
  reconnectAttempts: number;
  /** Last error */
  lastError?: Error;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Clear error state */
  clearError: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined,
);

/**
 * Realtime provider props
 */
export interface RealtimeProviderProps {
  children: ReactNode;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Show connection notifications */
  showNotifications?: boolean;
}

/**
 * Realtime provider
 * Manages WebSocket connection lifecycle and provides connection state
 */
export function RealtimeProvider({
  children,
  autoConnect = true,
  showNotifications = true,
}: RealtimeProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | undefined>();
  const [socketId, setSocketId] = useState<string | undefined>();

  const isConnected = connectionState === "connected";

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!user) {
      logger.warn("[Realtime] Cannot connect without user");
      return;
    }

    setConnectionState("connecting");

    try {
      const token = (user as { token?: string })?.token;
      const socket = socketManager.connect(token);

      if (socket.id) {
        setSocketId(socket.id);
      }

      setConnectionState("connected");
      setReconnectAttempts(0);
      setLastError(undefined);

      if (showNotifications) {
        toast({
          title: "Connected",
          description: "Real-time connection established",
        });
      }
    } catch (error) {
      logger.error("[Realtime] Connection error:", error);
      setConnectionState("error");
      setLastError(error as Error);
      captureError(error as Error, {
        tags: { feature: "realtime", action: "connect" },
      });

      if (showNotifications) {
        toast({
          title: "Connection failed",
          description: "Failed to establish real-time connection",
          variant: "destructive",
        });
      }
    }
  }, [user, toast, showNotifications]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    socketManager.disconnect();
    setConnectionState("disconnected");
    setSocketId(undefined);
  }, []);

  /**
   * Reconnect to WebSocket
   */
  const reconnect = useCallback(() => {
    setConnectionState("reconnecting");
    setReconnectAttempts((prev) => prev + 1);
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setLastError(undefined);
    setConnectionState("disconnected");
  }, []);

  /**
   * Auto-connect on mount if user is authenticated
   */
  useEffect(() => {
    if (autoConnect && user && connectionState === "disconnected") {
      connect();
    }
  }, [autoConnect, user, connectionState, connect]);

  /**
   * Set up connection event handlers
   */
  useEffect(() => {
    if (!socketManager.isConnected) return;

    // Handle disconnect
    const handleDisconnect = () => {
      // REMOVED: console.log('[Realtime] Disconnected')
      setConnectionState("disconnected");

      if (showNotifications) {
        toast({
          title: "Disconnected",
          description: "Real-time connection lost",
          variant: "destructive",
        });
      }

      // Auto-reconnect
      if (user) {
        reconnect();
      }
    };

    // Handle reconnect
    const handleReconnect = (attemptNumber: number) => {
      // REMOVED: console.log(`[Realtime] Reconnected after ${attemptNumber} attempts`)
      setConnectionState("connected");
      setReconnectAttempts(0);

      if (showNotifications) {
        toast({
          title: "Reconnected",
          description: "Real-time connection restored",
        });
      }
    };

    // Handle reconnect attempt
    const handleReconnectAttempt = (attemptNumber: number) => {
      // REMOVED: console.log(`[Realtime] Reconnection attempt ${attemptNumber}`)
      setConnectionState("reconnecting");
      setReconnectAttempts(attemptNumber);
    };

    // Handle error
    const handleError = (error: Error) => {
      logger.error("[Realtime] Error:", error);
      setLastError(error);
      setConnectionState("error");
      captureError(error, {
        tags: { feature: "realtime", action: "socket_error" },
      });
    };

    // Subscribe to events
    const unsubscribeDisconnect = socketManager.on(
      SOCKET_EVENTS.DISCONNECT,
      handleDisconnect,
    );
    const unsubscribeError = socketManager.on(SOCKET_EVENTS.ERROR, handleError);

    return () => {
      unsubscribeDisconnect();
      unsubscribeError();
    };
  }, [user, toast, showNotifications, reconnect]);

  /**
   * Disconnect on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  /**
   * Update socket ID when it changes
   */
  useEffect(() => {
    if (socketManager.socketId) {
      setSocketId(socketManager.socketId);
    }
  }, [socketManager.socketId]);

  return (
    <RealtimeContext.Provider
      value={{
        connectionState,
        isConnected,
        socketId,
        reconnectAttempts,
        lastError,
        reconnect,
        disconnect,
        clearError,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to use realtime context
 */
export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }

  return context;
}

/**
 * Hook to check if realtime is connected
 */
export function useRealtimeConnected() {
  const { isConnected } = useRealtime();
  return isConnected;
}

/**
 * Hook to get connection state
 */
export function useConnectionState() {
  const { connectionState } = useRealtime();
  return connectionState;
}
