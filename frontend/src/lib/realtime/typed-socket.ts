import { io, Socket } from "socket.io-client";
import { SOCKET_CONFIG } from "./config";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "./typed-events";

/**
 * Type-safe Socket.io socket with strongly typed events
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

/**
 * Creates a new typed socket connection or returns existing connected socket
 * @param token - Optional authentication token
 * @returns TypedSocket instance
 */
export function createTypedSocket(token?: string): TypedSocket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_CONFIG.url, {
    ...SOCKET_CONFIG.options,
    auth: token ? { token } : undefined,
  }) as TypedSocket;

  return socket;
}

/**
 * Returns the current socket instance without creating a new one
 * @returns TypedSocket instance or null if not connected
 */
export function getTypedSocket(): TypedSocket | null {
  return socket;
}

/**
 * Disconnects and cleans up the socket connection
 */
export function disconnectTypedSocket(): void {
  socket?.disconnect();
  socket = null;
}
