/**
 * WebSocket Optimization Layer
 *
 * Provides optimized WebSocket connection management with compression,
 * message batching, connection pooling, and automatic reconnection.
 */

import { io, Socket } from "socket.io-client";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

export interface WebSocketConfig {
  url: string;
  auth?: {
    token?: string;
  };
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  autoConnect?: boolean;
  // Performance optimizations
  enableCompression?: boolean;
  enableBatching?: boolean;
  batchInterval?: number;
  maxBatchSize?: number;
  heartbeatInterval?: number;
  // Connection pooling
  poolSize?: number;
  enablePooling?: boolean;
}

const DEFAULT_CONFIG: Required<Omit<WebSocketConfig, "url" | "auth">> = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: false,
  enableCompression: true,
  enableBatching: true,
  batchInterval: 50, // ms
  maxBatchSize: 10,
  heartbeatInterval: 30000, // 30 seconds
  poolSize: 3,
  enablePooling: false,
};

// ============================================================================
// Message Batching
// ============================================================================

interface QueuedMessage {
  event: string;
  data: any;
  timestamp: number;
}

class MessageBatcher {
  private queue: QueuedMessage[] = [];
  private timer: NodeJS.Timeout | null = null;
  private interval: number;
  private maxSize: number;
  private socket: Socket;

  constructor(socket: Socket, interval: number, maxSize: number) {
    this.socket = socket;
    this.interval = interval;
    this.maxSize = maxSize;
  }

  enqueue(event: string, data: any): void {
    this.queue.push({
      event,
      data,
      timestamp: Date.now(),
    });

    // Flush immediately if batch is full
    if (this.queue.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      // Schedule flush
      this.timer = setTimeout(() => this.flush(), this.interval);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    // Send batched messages
    const batch = this.queue.splice(0, this.queue.length);

    if (batch.length === 1) {
      // Single message, send directly
      this.socket.emit(batch[0].event, batch[0].data);
    } else {
      // Multiple messages, send as batch
      this.socket.emit("batch", batch);
    }
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }

  size(): number {
    return this.queue.length;
  }
}

// ============================================================================
// Connection Pool
// ============================================================================

class WebSocketConnectionPool {
  private connections: OptimizedWebSocket[] = [];
  private currentIndex: number = 0;
  private config: WebSocketConfig;
  private size: number;

  constructor(config: WebSocketConfig, size: number) {
    this.config = config;
    this.size = size;
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.size; i++) {
      const connection = new OptimizedWebSocket({
        ...this.config,
        enablePooling: false, // Prevent nested pools
      });
      await connection.connect();
      this.connections.push(connection);
    }
  }

  getConnection(): OptimizedWebSocket {
    // Round-robin load balancing
    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.size;
    return connection;
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(this.connections.map((conn) => conn.disconnect()));
    this.connections = [];
  }

  getStats(): {
    totalConnections: number;
    connectedCount: number;
    averageLatency: number;
  } {
    const connected = this.connections.filter((c) => c.isConnected());
    const avgLatency =
      connected.reduce((sum, c) => sum + (c.getLatency() || 0), 0) /
      connected.length;

    return {
      totalConnections: this.size,
      connectedCount: connected.length,
      averageLatency: avgLatency || 0,
    };
  }
}

// ============================================================================
// Optimized WebSocket Client
// ============================================================================

export class OptimizedWebSocket {
  private socket: Socket | null = null;
  private config: Required<Omit<WebSocketConfig, "auth">> & {
    auth: NonNullable<WebSocketConfig["auth"]>;
  };
  private batcher: MessageBatcher | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionPool: WebSocketConnectionPool | null = null;
  private latency: number = 0;
  private lastPingTime: number = 0;

  // Event handlers
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      auth: config.auth ?? {},
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      // REMOVED: console.log('[WebSocket] Already connected')
      return;
    }

    // Initialize connection pool if enabled
    if (this.config.enablePooling && !this.connectionPool) {
      this.connectionPool = new WebSocketConnectionPool(
        this.config,
        this.config.poolSize,
      );
      await this.connectionPool.initialize();
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        auth: this.config.auth,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        autoConnect: false,
        transports: ["websocket"], // Force WebSocket only
        // Enable compression - cast to any since socket.io types may not accept false
        ...(this.config.enableCompression
          ? { perMessageDeflate: { threshold: 1024 } }
          : {}),
      });

      // Initialize message batcher
      if (this.config.enableBatching && this.socket) {
        this.batcher = new MessageBatcher(
          this.socket,
          this.config.batchInterval,
          this.config.maxBatchSize,
        );
      }

      // Connection event handlers
      this.socket.on("connect", () => {
        // REMOVED: console.log('[WebSocket] Connected')
        this.startHeartbeat();
        this.triggerEvent("connect", null);
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        logger.error("[WebSocket] Connection error:", error);
        this.triggerEvent("error", error);
        reject(error);
      });

      this.socket.on("disconnect", (reason) => {
        // REMOVED: console.log('[WebSocket] Disconnected:', reason)
        this.stopHeartbeat();
        this.triggerEvent("disconnect", reason);
      });

      this.socket.on("reconnect", (attemptNumber) => {
        // REMOVED: console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`)
        this.startHeartbeat();
        this.triggerEvent("reconnect", attemptNumber);
      });

      this.socket.on("reconnect_attempt", (attemptNumber) => {
        // REMOVED: console.log(`[WebSocket] Reconnection attempt ${attemptNumber}`)
        this.triggerEvent("reconnect_attempt", attemptNumber);
      });

      this.socket.on("reconnect_error", (error) => {
        logger.error("[WebSocket] Reconnection error:", error);
        this.triggerEvent("reconnect_error", error);
      });

      this.socket.on("reconnect_failed", () => {
        logger.error("[WebSocket] Reconnection failed");
        this.triggerEvent("reconnect_failed", null);
      });

      // Pong handler for latency measurement
      this.socket.on("pong", () => {
        this.latency = Date.now() - this.lastPingTime;
      });

      // Connect
      this.socket.connect();
    });
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.connectionPool) {
        this.connectionPool.disconnectAll().then(() => {
          this.connectionPool = null;
          resolve();
        });
        return;
      }

      this.stopHeartbeat();
      this.batcher?.clear();

      if (this.socket) {
        this.socket.disconnect();
        this.socket.removeAllListeners();
        this.socket = null;
      }

      this.eventHandlers.clear();
      resolve();
    });
  }

  isConnected(): boolean {
    if (this.connectionPool) {
      const stats = this.connectionPool.getStats();
      return stats.connectedCount > 0;
    }
    return this.socket?.connected || false;
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  emit(event: string, data: any): void {
    const socket = this.connectionPool
      ? this.connectionPool.getConnection().socket
      : this.socket;

    if (!socket) {
      logger.warn("[WebSocket] Cannot emit - not connected");
      return;
    }

    if (this.config.enableBatching && this.batcher) {
      // Add to batch queue
      this.batcher.enqueue(event, data);
    } else {
      // Send immediately
      socket.emit(event, data);
    }
  }

  emitImmediate(event: string, data: any): void {
    const socket = this.connectionPool
      ? this.connectionPool.getConnection().socket
      : this.socket;

    if (!socket) {
      logger.warn("[WebSocket] Cannot emit - not connected");
      return;
    }

    // Flush any pending batched messages first
    this.batcher?.flush();

    // Send immediately
    socket.emit(event, data);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  on(event: string, handler: Function): void {
    const socket = this.connectionPool
      ? this.connectionPool.getConnection().socket
      : this.socket;

    if (!socket) {
      logger.warn("[WebSocket] Cannot register handler - not connected");
      return;
    }

    // Store handler for later removal
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);

    // Register with socket
    socket.on(event, handler as any);
  }

  off(event: string, handler?: Function): void {
    const socket = this.connectionPool
      ? this.connectionPool.getConnection().socket
      : this.socket;

    if (!socket) return;

    if (handler) {
      // Remove specific handler
      this.eventHandlers.get(event)?.delete(handler);
      socket.off(event, handler as any);
    } else {
      // Remove all handlers for event
      this.eventHandlers.delete(event);
      socket.off(event);
    }
  }

  private triggerEvent(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  // ============================================================================
  // Heartbeat / Ping-Pong
  // ============================================================================

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit("ping");
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getLatency(): number {
    if (this.connectionPool) {
      return this.connectionPool.getStats().averageLatency;
    }
    return this.latency;
  }

  getStats(): {
    connected: boolean;
    latency: number;
    queueSize: number;
    poolStats?: any;
  } {
    return {
      connected: this.isConnected(),
      latency: this.getLatency(),
      queueSize: this.batcher?.size() || 0,
      poolStats: this.connectionPool?.getStats(),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  updateAuth(auth: WebSocketConfig["auth"]): void {
    if (this.socket && auth) {
      this.socket.auth = auth as { [key: string]: any };
      // Reconnect with new auth
      this.socket.disconnect().connect();
    }
  }

  flushBatch(): void {
    this.batcher?.flush();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let wsInstance: OptimizedWebSocket | null = null;

export function getWebSocket(config?: WebSocketConfig): OptimizedWebSocket {
  if (!wsInstance && config) {
    wsInstance = new OptimizedWebSocket(config);
  }
  if (!wsInstance) {
    throw new Error("WebSocket not initialized. Provide config on first call.");
  }
  return wsInstance;
}

export function resetWebSocket(): void {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
}

// ============================================================================
// React Hook for WebSocket
// ============================================================================

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
}

export function useWebSocket(
  config: WebSocketConfig,
  options: UseWebSocketOptions = {},
) {
  const ws = getWebSocket(config);

  // Auto-connect on mount if specified
  if (options.autoConnect && !ws.isConnected()) {
    ws.connect();
  }

  return {
    socket: ws,
    emit: ws.emit.bind(ws),
    on: ws.on.bind(ws),
    off: ws.off.bind(ws),
    connect: ws.connect.bind(ws),
    disconnect: ws.disconnect.bind(ws),
    isConnected: ws.isConnected(),
    stats: ws.getStats(),
  };
}
