import { io, Socket } from "socket.io-client";
import { SOCKET_CONFIG } from "./config";
import type { SocketEvent } from "./events";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

interface SocketPoolOptions {
  maxConnections?: number;
  idleTimeout?: number;
  reconnectDelay?: number;
}

interface SocketStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  failedConnections: number;
  reconnections: number;
  totalDataSent: number;
  totalDataReceived: number;
}

// =============================================================================
// Socket Manager with Connection Pooling
// =============================================================================

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private pool: Map<string, Socket> = new Map();
  private poolTimestamps: Map<string, number> = new Map();
  private poolOptions: Required<SocketPoolOptions>;
  private stats: SocketStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    failedConnections: 0,
    reconnections: 0,
    totalDataSent: 0,
    totalDataReceived: 0,
  };
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: SocketPoolOptions = {}) {
    this.poolOptions = {
      maxConnections: options.maxConnections || 5,
      idleTimeout: options.idleTimeout || 300000, // 5 minutes
      reconnectDelay: options.reconnectDelay || 1000,
    };

    // Start background maintenance
    this.startMaintenance();
  }

  /**
   * Connect to socket (reuses existing connection if available)
   */
  connect(token?: string): Socket {
    // Return existing connection if active
    if (this.socket?.connected) return this.socket;

    // Try to get from pool
    const pooled = this.getFromPool();
    if (pooled?.connected) {
      this.socket = pooled;
      this.stats.activeConnections++;
      return pooled;
    }

    // Create new connection
    this.socket = this.createSocket(token);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    return this.socket;
  }

  /**
   * Create a new socket connection
   */
  private createSocket(token?: string): Socket {
    const socket = io(SOCKET_CONFIG.url, {
      ...SOCKET_CONFIG.options,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: this.poolOptions.reconnectDelay,
      reconnectionAttempts: 5,
    });

    // Track connection events
    socket.on("connect", () => {
      this.stats.activeConnections++;
    });

    socket.on("disconnect", (reason) => {
      this.stats.activeConnections--;

      // Attempt reconnect for unexpected disconnects
      if (reason === "io server disconnect") {
        socket.connect();
        this.stats.reconnections++;
      }
    });

    socket.on("error", (error) => {
      logger.error("[Socket] Error:", error);
      this.stats.failedConnections++;
    });

    socket.on("reconnect", (attemptNumber) => {
      this.stats.reconnections++;
    });

    // Track data transfer
    socket.onAny(() => {
      this.stats.totalDataReceived++;
    });

    socket.onAnyOutgoing(() => {
      this.stats.totalDataSent++;
    });

    return socket;
  }

  /**
   * Disconnect current socket
   */
  disconnect(): void {
    if (this.socket) {
      // Return to pool if below max connections
      if (
        this.pool.size < this.poolOptions.maxConnections &&
        this.socket.connected
      ) {
        this.returnToPool(this.socket);
      } else {
        this.socket.disconnect();
      }
      this.socket = null;
      this.stats.activeConnections--;
    }
  }

  /**
   * Force disconnect and clear pool
   */
  disconnectAll(): void {
    this.socket?.disconnect();
    this.socket = null;

    for (const socket of this.pool.values()) {
      socket.disconnect();
    }
    this.pool.clear();

    this.stats.activeConnections = 0;
    this.stats.idleConnections = 0;
  }

  /**
   * Emit event on socket
   */
  emit<T>(event: SocketEvent, data: T): void {
    this.socket?.emit(event, data);
    this.stats.totalDataSent++;
  }

  /**
   * Listen to socket event
   */
  on<T>(event: SocketEvent, callback: (data: T) => void): () => void {
    this.socket?.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off<T>(event: SocketEvent, callback: (data: T) => void): void {
    this.socket?.off(event, callback);
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Get statistics
   */
  getStats(): SocketStats {
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  get socketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Get current pool size
   */
  get poolSize(): number {
    return this.pool.size;
  }

  // -------------------------------------------------------------------------
  // Pool Management (Private)
  // -------------------------------------------------------------------------

  /**
   * Get socket from pool
   */
  private getFromPool(): Socket | null {
    for (const [id, socket] of this.pool.entries()) {
      if (socket.connected) {
        this.pool.delete(id);
        this.poolTimestamps.delete(id);
        this.stats.idleConnections--;
        return socket;
      }
    }
    return null;
  }

  /**
   * Return socket to pool
   */
  private returnToPool(socket: Socket): void {
    if (socket.id && !this.pool.has(socket.id)) {
      this.pool.set(socket.id, socket);
      this.poolTimestamps.set(socket.id, Date.now());
      this.stats.idleConnections++;
    }
  }

  /**
   * Start background maintenance tasks
   */
  private startMaintenance(): void {
    // Heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      for (const socket of this.pool.values()) {
        if (socket.connected) {
          socket.emit("ping");
        }
      }
    }, 30000); // Every 30 seconds

    // Cleanup idle connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Every minute
  }

  /**
   * Clean up idle connections past timeout
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();

    for (const [id, socket] of this.pool.entries()) {
      // Check if socket hasn't been used recently
      const lastUsed = this.poolTimestamps.get(id) || now;
      const idleTime = now - lastUsed;

      if (idleTime > this.poolOptions.idleTimeout) {
        socket.disconnect();
        this.pool.delete(id);
        this.poolTimestamps.delete(id);
        this.stats.idleConnections--;
      }
    }
  }

  /**
   * Stop maintenance and cleanup
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.disconnectAll();
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const socketManager = new SocketManager();
