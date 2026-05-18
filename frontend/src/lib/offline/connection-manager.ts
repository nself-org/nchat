/**
 * Connection Manager - Manages socket and network connection state
 *
 * Integrates with Socket.io client and network detector to provide
 * a unified connection state management system.
 */

import {
  connect as socketConnect,
  disconnect as socketDisconnect,
  getSocket,
  subscribeToConnectionState,
  getConnectionState,
  isConnected as socketIsConnected,
  type ConnectionState as SocketConnectionState,
} from "@/lib/socket/client";
import {
  getNetworkDetector,
  type NetworkChangeListener,
} from "./network-detector";
import type {
  ConnectionState,
  ConnectionInfo,
  SocketConnectionState as SocketState,
  RetryConfig,
  RetryState,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Combined connection state
 */
export interface CombinedConnectionState {
  network: ConnectionInfo;
  socket: SocketState;
  overall: ConnectionState;
  canSendMessages: boolean;
  shouldShowOffline: boolean;
}

/**
 * Connection state listener
 */
export type ConnectionStateListener = (state: CombinedConnectionState) => void;

/**
 * Connection manager options
 */
export interface ConnectionManagerOptions {
  autoConnect: boolean;
  autoReconnect: boolean;
  reconnectOnNetworkRestore: boolean;
  retryConfig: RetryConfig;
  networkCheckInterval: number;
  networkCheckUrl: string;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: ConnectionManagerOptions = {
  autoConnect: true,
  autoReconnect: true,
  reconnectOnNetworkRestore: true,
  retryConfig: {
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    strategy: "exponential",
    factor: 2,
    jitter: true,
    retryOn: [408, 429, 500, 502, 503, 504],
  },
  networkCheckInterval: 10000,
  networkCheckUrl: "/api/health",
};

// =============================================================================
// Connection Manager Class
// =============================================================================

class ConnectionManager {
  private options: ConnectionManagerOptions;
  private listeners: Set<ConnectionStateListener> = new Set();
  private networkUnsubscribe: (() => void) | null = null;
  private socketUnsubscribe: (() => void) | null = null;
  private retryState: RetryState;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private wasOnline: boolean = true;
  private manualDisconnect: boolean = false;

  // Current state
  private networkInfo: ConnectionInfo | null = null;
  private socketState: SocketState = {
    connected: false,
    socketId: null,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    disconnectReason: null,
  };

  constructor(options: Partial<ConnectionManagerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.retryState = {
      attempt: 0,
      nextRetryAt: null,
      lastError: null,
      shouldRetry: true,
    };
  }

  /**
   * Initialize the connection manager
   */
  public initialize(token?: string): void {
    // Initialize network detector
    const networkDetector = getNetworkDetector();
    this.networkUnsubscribe = networkDetector.subscribe(
      this.handleNetworkChange,
    );

    // Start periodic network checks
    networkDetector.startPeriodicCheck(
      this.options.networkCheckInterval,
      this.options.networkCheckUrl,
    );

    // Subscribe to socket connection state
    this.socketUnsubscribe = subscribeToConnectionState(
      this.handleSocketStateChange,
    );

    // Auto-connect if enabled and online
    if (this.options.autoConnect && this.isNetworkOnline()) {
      this.connect(token);
    }
  }

  /**
   * Cleanup the connection manager
   */
  public cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    if (this.socketUnsubscribe) {
      this.socketUnsubscribe();
      this.socketUnsubscribe = null;
    }

    this.clearRetryTimeout();
    this.listeners.clear();

    // Stop network checks
    getNetworkDetector().stopPeriodicCheck();
  }

  /**
   * Handle network state change
   */
  private handleNetworkChange: NetworkChangeListener = (info) => {
    const wasOnline = this.wasOnline;
    this.networkInfo = info;
    this.wasOnline = info.state === "online";

    // Network restored - try to reconnect socket
    if (
      !wasOnline &&
      this.wasOnline &&
      this.options.reconnectOnNetworkRestore
    ) {
      if (!this.manualDisconnect && !socketIsConnected()) {
        this.resetRetryState();
        this.connect();
      }
    }

    // Network lost
    if (wasOnline && !this.wasOnline) {
      this.clearRetryTimeout();
    }

    this.notifyListeners();
  };

  /**
   * Handle socket state change
   */
  private handleSocketStateChange = (state: SocketConnectionState): void => {
    const wasConnected = this.socketState.connected;

    this.socketState = {
      connected: state === "connected",
      socketId: getSocket()?.id ?? null,
      reconnectAttempts:
        state === "reconnecting"
          ? this.socketState.reconnectAttempts + 1
          : this.socketState.reconnectAttempts,
      lastConnectedAt:
        state === "connected" ? new Date() : this.socketState.lastConnectedAt,
      lastDisconnectedAt:
        !wasConnected && state !== "connected"
          ? this.socketState.lastDisconnectedAt
          : wasConnected && state !== "connected"
            ? new Date()
            : this.socketState.lastDisconnectedAt,
      disconnectReason:
        state === "disconnected" || state === "error" ? state : null,
    };

    // Socket connected - reset retry state
    if (state === "connected") {
      this.resetRetryState();
      this.socketState.reconnectAttempts = 0;
    }

    // Socket disconnected unexpectedly - schedule retry
    if (
      wasConnected &&
      state === "disconnected" &&
      !this.manualDisconnect &&
      this.options.autoReconnect &&
      this.isNetworkOnline()
    ) {
      this.scheduleRetry();
    }

    // Socket error - schedule retry
    if (
      state === "error" &&
      this.options.autoReconnect &&
      this.isNetworkOnline()
    ) {
      this.retryState.lastError = "Socket connection error";
      this.scheduleRetry();
    }

    this.notifyListeners();
  };

  /**
   * Connect to socket server
   */
  public connect(token?: string): void {
    if (!this.isNetworkOnline()) {
      return;
    }

    this.manualDisconnect = false;
    socketConnect(token);
  }

  /**
   * Disconnect from socket server
   */
  public disconnect(): void {
    this.manualDisconnect = true;
    this.clearRetryTimeout();
    socketDisconnect();
  }

  /**
   * Force reconnect
   */
  public reconnect(token?: string): void {
    this.resetRetryState();
    this.manualDisconnect = false;
    socketDisconnect();

    // Small delay before reconnecting
    setTimeout(() => {
      this.connect(token);
    }, 100);
  }

  /**
   * Schedule a retry attempt
   */
  private scheduleRetry(): void {
    if (!this.retryState.shouldRetry) return;
    if (this.retryState.attempt >= this.options.retryConfig.maxRetries) {
      this.retryState.shouldRetry = false;
      return;
    }

    this.clearRetryTimeout();

    const delay = this.calculateRetryDelay();
    this.retryState.nextRetryAt = new Date(Date.now() + delay);
    this.retryState.attempt++;

    // REMOVED: console.log(
    //   `[ConnectionManager] Scheduling retry ${this.retryState.attempt}/${this.options.retryConfig.maxRetries} in ${delay}ms`
    // )

    this.retryTimeout = setTimeout(() => {
      if (this.isNetworkOnline() && !this.manualDisconnect) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(): number {
    const { baseDelay, maxDelay, strategy, factor, jitter } =
      this.options.retryConfig;
    let delay: number;

    switch (strategy) {
      case "exponential":
        delay = Math.min(
          baseDelay * Math.pow(factor, this.retryState.attempt),
          maxDelay,
        );
        break;
      case "linear":
        delay = Math.min(baseDelay * (this.retryState.attempt + 1), maxDelay);
        break;
      case "fixed":
      default:
        delay = baseDelay;
    }

    // Add jitter to prevent thundering herd
    if (jitter) {
      const jitterRange = delay * 0.2; // 20% jitter
      delay += Math.random() * jitterRange - jitterRange / 2;
    }

    return Math.round(delay);
  }

  /**
   * Clear retry timeout
   */
  private clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Reset retry state
   */
  private resetRetryState(): void {
    this.clearRetryTimeout();
    this.retryState = {
      attempt: 0,
      nextRetryAt: null,
      lastError: null,
      shouldRetry: true,
    };
  }

  /**
   * Check if network is online
   */
  private isNetworkOnline(): boolean {
    if (this.networkInfo) {
      return this.networkInfo.state === "online";
    }
    return navigator?.onLine ?? true;
  }

  /**
   * Get combined connection state
   */
  public getState(): CombinedConnectionState {
    const network = this.networkInfo ?? getNetworkDetector().getInfo();
    const socket = this.socketState;

    // Determine overall state
    let overall: ConnectionState;
    if (network.state === "offline") {
      overall = "offline";
    } else if (socket.connected) {
      overall = "online";
    } else if (getConnectionState() === "reconnecting") {
      overall = "reconnecting";
    } else if (getConnectionState() === "connecting") {
      overall = "connecting";
    } else if (getConnectionState() === "error") {
      overall = "error";
    } else {
      overall = "offline";
    }

    return {
      network,
      socket,
      overall,
      canSendMessages: socket.connected && network.state === "online",
      shouldShowOffline: overall === "offline" || overall === "error",
    };
  }

  /**
   * Subscribe to connection state changes
   */
  public subscribe(listener: ConnectionStateListener): () => void {
    this.listeners.add(listener);

    // Immediately notify with current state
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        logger.error("[ConnectionManager] Listener error:", error);
      }
    });
  }

  /**
   * Get retry state
   */
  public getRetryState(): RetryState {
    return { ...this.retryState };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socketState.connected && this.isNetworkOnline();
  }

  /**
   * Check if reconnecting
   */
  public isReconnecting(): boolean {
    return (
      getConnectionState() === "reconnecting" ||
      (this.retryState.attempt > 0 && this.retryState.shouldRetry)
    );
  }

  /**
   * Get time until next retry
   */
  public getTimeUntilRetry(): number | null {
    if (!this.retryState.nextRetryAt) return null;
    const remaining = this.retryState.nextRetryAt.getTime() - Date.now();
    return remaining > 0 ? remaining : null;
  }

  /**
   * Cancel automatic reconnection
   */
  public cancelReconnect(): void {
    this.clearRetryTimeout();
    this.retryState.shouldRetry = false;
  }

  /**
   * Resume automatic reconnection
   */
  public resumeReconnect(): void {
    this.retryState.shouldRetry = true;
    if (!this.isConnected() && this.isNetworkOnline()) {
      this.scheduleRetry();
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let connectionManager: ConnectionManager | null = null;

/**
 * Get or create the connection manager singleton
 */
export function getConnectionManager(
  options?: Partial<ConnectionManagerOptions>,
): ConnectionManager {
  if (!connectionManager) {
    connectionManager = new ConnectionManager(options);
  }
  return connectionManager;
}

/**
 * Initialize the connection manager
 */
export function initializeConnectionManager(
  token?: string,
  options?: Partial<ConnectionManagerOptions>,
): ConnectionManager {
  const manager = getConnectionManager(options);
  manager.initialize(token);
  return manager;
}

/**
 * Cleanup the connection manager
 */
export function cleanupConnectionManager(): void {
  if (connectionManager) {
    connectionManager.cleanup();
    connectionManager = null;
  }
}

export { ConnectionManager };
export default getConnectionManager;
