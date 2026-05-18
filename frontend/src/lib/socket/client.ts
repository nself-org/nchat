/**
 * Socket.io Client Singleton
 *
 * Creates and manages a single Socket.io client instance for the application.
 * Handles connection, authentication, reconnection, and error management.
 */

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";

import { logger } from "@/lib/logger";

// Connection states
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// Connection state listeners
type ConnectionStateListener = (state: ConnectionState) => void;
const connectionStateListeners = new Set<ConnectionStateListener>();

// Current connection state
let currentConnectionState: ConnectionState = "disconnected";

// Socket instance (lazy initialized)
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// Auth token for socket authentication
let authToken: string | null = null;

/**
 * Socket configuration options
 */
const SOCKET_CONFIG = {
  // Reconnection settings
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,

  // Connection settings
  timeout: 20000,
  transports: ["websocket", "polling"] as ("websocket" | "polling")[],

  // Auto connect disabled - we connect manually after auth
  autoConnect: false,

  // Path for socket.io server
  path: "/socket.io",
};

/**
 * Get the socket URL from environment
 */
function getSocketUrl(): string {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) {
    // Default to same origin in production, localhost in development
    if (typeof window !== "undefined") {
      return process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : window.location.origin;
    }
    return "http://localhost:3001";
  }
  return url;
}

/**
 * Update connection state and notify listeners
 */
function setConnectionState(state: ConnectionState): void {
  if (currentConnectionState !== state) {
    currentConnectionState = state;
    connectionStateListeners.forEach((listener) => listener(state));
  }
}

/**
 * Subscribe to connection state changes
 */
export function subscribeToConnectionState(
  listener: ConnectionStateListener,
): () => void {
  connectionStateListeners.add(listener);
  // Immediately notify with current state
  listener(currentConnectionState);

  return () => {
    connectionStateListeners.delete(listener);
  };
}

/**
 * Get current connection state
 */
export function getConnectionState(): ConnectionState {
  return currentConnectionState;
}

/**
 * Initialize socket event handlers
 */
function initializeSocketHandlers(
  sock: Socket<ServerToClientEvents, ClientToServerEvents>,
): void {
  // Connection events
  sock.on("connect", () => {
    setConnectionState("connected");
  });

  sock.on("disconnect", (reason) => {
    setConnectionState("disconnected");

    // Handle specific disconnect reasons
    if (reason === "io server disconnect") {
      // Server initiated disconnect, may need to reconnect manually
    }
  });

  sock.on("connect_error", (error) => {
    logger.error("[Socket] Connection error:", error.message);
    setConnectionState("error");
  });

  // Reconnection events
  sock.io.on("reconnect_attempt", (attempt) => {
    setConnectionState("reconnecting");
  });

  sock.io.on("reconnect", (attempt) => {
    setConnectionState("connected");
  });

  sock.io.on("reconnect_error", (error) => {
    logger.error("[Socket] Reconnection error:", error.message);
  });

  sock.io.on("reconnect_failed", () => {
    logger.error("[Socket] Reconnection failed after max attempts");
    setConnectionState("error");
  });

  // Error event
  sock.io.on("error", (error) => {
    logger.error("[Socket] Error:", error);
    setConnectionState("error");
  });
}

/**
 * Get or create the socket instance
 */
export function getSocket(): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> | null {
  return socket;
}

/**
 * Create and initialize the socket connection
 */
export function createSocket(
  token?: string,
): Socket<ServerToClientEvents, ClientToServerEvents> {
  // Store token for reconnection
  if (token) {
    authToken = token;
  }

  // If socket already exists and is connected, return it
  if (socket?.connected) {
    return socket;
  }

  // If socket exists but disconnected, clean up first
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  const socketUrl = getSocketUrl();

  // Create new socket instance with auth
  socket = io(socketUrl, {
    ...SOCKET_CONFIG,
    auth: authToken ? { token: authToken } : undefined,
  });

  // Initialize event handlers
  initializeSocketHandlers(socket);

  setConnectionState("connecting");

  return socket;
}

/**
 * Connect to socket server
 */
export function connect(token?: string): void {
  if (token) {
    authToken = token;
  }

  if (!socket) {
    createSocket(token);
  }

  if (socket && !socket.connected) {
    // Update auth if token changed
    if (authToken) {
      socket.auth = { token: authToken };
    }
    setConnectionState("connecting");
    socket.connect();
  }
}

/**
 * Disconnect from socket server
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    setConnectionState("disconnected");
  }
}

/**
 * Update authentication token
 */
export function updateAuthToken(token: string | null): void {
  authToken = token;

  if (socket) {
    socket.auth = token ? { token } : {};

    // If connected, reconnect with new token
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Get socket ID
 */
export function getSocketId(): string | undefined {
  return socket?.id;
}

/**
 * Emit an event with type safety
 */
export function emit<K extends keyof ClientToServerEvents>(
  event: K,
  ...args: Parameters<ClientToServerEvents[K]>
): void {
  if (socket?.connected) {
    socket.emit(event, ...args);
  } else {
    logger.warn("[Socket] Cannot emit, not connected", { event });
  }
}

/**
 * Subscribe to an event with type safety
 */
export function on<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
): void {
  if (socket) {
    socket.on(event, handler as never);
  }
}

/**
 * Unsubscribe from an event
 */
export function off<K extends keyof ServerToClientEvents>(
  event: K,
  handler?: ServerToClientEvents[K],
): void {
  if (socket) {
    if (handler) {
      socket.off(event, handler as never);
    } else {
      socket.off(event);
    }
  }
}

/**
 * Emit and wait for acknowledgment
 * Note: This function bypasses strict typing to support acknowledgment callbacks
 */
export function emitWithAck<K extends keyof ClientToServerEvents>(
  event: K,
  ...args: Parameters<ClientToServerEvents[K]>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("Socket emit timeout"));
    }, 10000);

    // Use type assertion to handle acknowledgment callback
    // Socket.io supports callbacks as the last argument for ack
    const callback = (response: unknown) => {
      clearTimeout(timeout);
      resolve(response);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit(event, ...args, callback);
  });
}

/**
 * Cleanup socket connection
 */
export function cleanup(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  authToken = null;
  connectionStateListeners.clear();
  setConnectionState("disconnected");
}

// Export socket type for use in other modules
export type { Socket };
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
