/**
 * Realtime Client Service
 *
 * Socket.io client singleton for connecting to the nself-plugins realtime server.
 * Handles connection management, authentication, reconnection logic, and error handling.
 * Includes offline detection and connection quality monitoring.
 *
 * @module services/realtime/realtime-client
 * @version 1.0.0
 */

import { io, Socket, ManagerOptions, SocketOptions } from "socket.io-client";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Connection state of the realtime client
 */
export type RealtimeConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticated"
  | "reconnecting"
  | "error"
  | "offline";

/**
 * Connection quality levels
 */
export type ConnectionQuality =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "unknown";

/**
 * Offline status change listener
 */
export type OfflineStatusListener = (isOnline: boolean) => void;

/**
 * Reconnection event listener
 */
export type ReconnectionListener = (
  attemptNumber: number,
  wasOffline: boolean,
) => void;

/**
 * Device info for connection metadata
 */
export interface DeviceInfo {
  type: "web" | "ios" | "android" | "desktop" | "unknown";
  os?: string;
  browser?: string;
  version?: string;
}

/**
 * Configuration options for the realtime client
 */
export interface RealtimeClientConfig {
  /** WebSocket server URL */
  url: string;
  /** JWT token for authentication */
  token?: string;
  /** Device information */
  device?: DeviceInfo;
  /** Enable auto-reconnection */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Transports to use */
  transports?: ("websocket" | "polling")[];
}

/**
 * Server handshake data
 */
export interface ServerHandshake {
  socketId: string;
  serverTime: string;
  protocolVersion: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  userId: string;
  sessionId: string;
  rooms: string[];
}

/**
 * Connection state change listener
 */
export type ConnectionStateListener = (state: RealtimeConnectionState) => void;

/**
 * Error listener
 */
export type ErrorListener = (error: RealtimeError) => void;

/**
 * Realtime error structure
 */
export interface RealtimeError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<
  Omit<RealtimeClientConfig, "url" | "token" | "device">
> = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  timeout: 20000,
  debug: false,
  transports: ["websocket", "polling"],
};

// ============================================================================
// Realtime Client Class
// ============================================================================

/**
 * RealtimeClient - Singleton Socket.io client for nself-plugins realtime server
 */
class RealtimeClient {
  private socket: Socket | null = null;
  private config: RealtimeClientConfig;
  private connectionState: RealtimeConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private connectionListeners = new Set<ConnectionStateListener>();
  private errorListeners = new Set<ErrorListener>();
  private offlineListeners = new Set<OfflineStatusListener>();
  private reconnectionListeners = new Set<ReconnectionListener>();
  private eventListeners = new Map<string, Set<Function>>();
  private isInitialized = false;
  private authData: AuthResponse | null = null;
  private _isOnline = true;
  private _wasOffline = false;
  private _connectionQuality: ConnectionQuality = "unknown";
  private latencyHistory: number[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingTime = 0;

  constructor() {
    this.config = {
      url: this.getDefaultUrl(),
      ...DEFAULT_CONFIG,
    };
    // Initialize online status
    if (typeof window !== "undefined") {
      this._isOnline = navigator.onLine;
      this.setupOfflineDetection();
    }
  }

  // ============================================================================
  // Offline Detection
  // ============================================================================

  /**
   * Set up browser offline/online event listeners
   */
  private setupOfflineDetection(): void {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      this._isOnline = true;
      this.log("Browser online");
      this.notifyOfflineListeners(true);

      // Attempt to reconnect if we were connected before
      if (
        this.connectionState === "offline" ||
        (this.connectionState === "disconnected" && this.isInitialized)
      ) {
        this.setConnectionState("reconnecting");
        this.connect(this.config.token).catch((err) => {
          this.log("Reconnection after online failed:", err);
        });
      }
    };

    const handleOffline = () => {
      this._isOnline = false;
      this._wasOffline = true;
      this.log("Browser offline");
      this.setConnectionState("offline");
      this.notifyOfflineListeners(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  /**
   * Notify offline status listeners
   */
  private notifyOfflineListeners(isOnline: boolean): void {
    this.offlineListeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (error) {
        logger.error("[RealtimeClient] Offline listener error:", error);
      }
    });
  }

  /**
   * Subscribe to offline status changes
   */
  onOfflineStatusChange(listener: OfflineStatusListener): () => void {
    this.offlineListeners.add(listener);
    // Immediately notify of current status
    listener(this._isOnline);
    return () => this.offlineListeners.delete(listener);
  }

  /**
   * Subscribe to reconnection events
   */
  onReconnection(listener: ReconnectionListener): () => void {
    this.reconnectionListeners.add(listener);
    return () => this.reconnectionListeners.delete(listener);
  }

  /**
   * Check if browser is online
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Check if was previously offline
   */
  get wasOffline(): boolean {
    return this._wasOffline;
  }

  /**
   * Clear the wasOffline flag (call after sync)
   */
  clearWasOffline(): void {
    this._wasOffline = false;
  }

  // ============================================================================
  // Connection Quality
  // ============================================================================

  /**
   * Start connection quality monitoring
   */
  private startConnectionQualityMonitoring(): void {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      this.measureLatency();
    }, 10000); // Measure every 10 seconds

    // Initial measurement
    this.measureLatency();
  }

  /**
   * Stop connection quality monitoring
   */
  private stopConnectionQualityMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.latencyHistory = [];
    this._connectionQuality = "unknown";
  }

  /**
   * Measure current latency
   */
  private measureLatency(): void {
    if (!this.socket?.connected) return;

    this.lastPingTime = Date.now();

    this.socket.emit(
      "ping",
      { timestamp: this.lastPingTime },
      (response: { timestamp: number }) => {
        const latency = Date.now() - response.timestamp;
        this.updateConnectionQuality(latency);
      },
    );
  }

  /**
   * Update connection quality based on latency
   */
  private updateConnectionQuality(latency: number): void {
    // Keep last 5 measurements
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 5) {
      this.latencyHistory.shift();
    }

    // Calculate average latency
    const avgLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) /
      this.latencyHistory.length;

    // Determine quality based on average latency
    if (avgLatency < 100) {
      this._connectionQuality = "excellent";
    } else if (avgLatency < 300) {
      this._connectionQuality = "good";
    } else if (avgLatency < 600) {
      this._connectionQuality = "fair";
    } else {
      this._connectionQuality = "poor";
    }
  }

  /**
   * Get current connection quality
   */
  get connectionQuality(): ConnectionQuality {
    return this._connectionQuality;
  }

  /**
   * Get average latency in ms
   */
  get averageLatency(): number | null {
    if (this.latencyHistory.length === 0) return null;
    return Math.round(
      this.latencyHistory.reduce((a, b) => a + b, 0) /
        this.latencyHistory.length,
    );
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the realtime client with configuration
   */
  initialize(config: Partial<RealtimeClientConfig> = {}): void {
    if (this.isInitialized && this.socket?.connected) {
      this.log("Already initialized and connected");
      return;
    }

    this.config = {
      url: config.url || this.getDefaultUrl(),
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.isInitialized = true;
    this.log("Initialized with config:", this.config.url);
  }

  /**
   * Get default WebSocket URL from environment
   */
  private getDefaultUrl(): string {
    // Check for realtime-specific URL first
    if (typeof window !== "undefined") {
      return (
        process.env.NEXT_PUBLIC_REALTIME_URL ||
        process.env.NEXT_PUBLIC_REALTIME_WS_URL ||
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        "http://localhost:3101"
      );
    }
    return "http://localhost:3101";
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the realtime server
   */
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.log("Already connected");
        resolve();
        return;
      }

      // Update token if provided
      if (token) {
        this.config.token = token;
      }

      this.setConnectionState("connecting");

      // Build socket options
      const socketOptions: Partial<ManagerOptions & SocketOptions> = {
        transports: this.config.transports,
        timeout: this.config.timeout,
        reconnection: this.config.autoReconnect,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectDelay,
        reconnectionDelayMax: this.config.maxReconnectDelay,
        auth: {
          token: this.config.token,
          device: this.config.device || this.getDeviceInfo(),
        },
      };

      this.socket = io(this.config.url, socketOptions);
      this.setupEventListeners();

      // Set up connection promise handlers
      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        this.socket?.off("connect", onConnect);
        this.socket?.off("error", onError);
        this.socket?.off("connect_error", onConnectError);
      };

      this.socket.once("connect", onConnect);
      this.socket.once("error", onError);
      this.socket.once("connect_error", onConnectError);

      // Timeout fallback
      setTimeout(() => {
        if (this.connectionState === "connecting") {
          cleanup();
          reject(new Error("Connection timeout"));
        }
      }, this.config.timeout || DEFAULT_CONFIG.timeout);
    });
  }

  /**
   * Disconnect from the realtime server
   */
  disconnect(): void {
    if (this.socket) {
      this.log("Disconnecting...");
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionState("disconnected");
      this.authData = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Reconnect to the server
   */
  reconnect(): Promise<void> {
    this.disconnect();
    return this.connect(this.config.token);
  }

  /**
   * Update authentication token
   */
  updateToken(token: string): void {
    this.config.token = token;
    if (this.socket?.connected) {
      // Re-authenticate with new token
      this.socket.emit("auth:refresh", { token });
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Set up internal socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", this.handleConnect.bind(this));
    this.socket.on("disconnect", this.handleDisconnect.bind(this));
    this.socket.on("connect_error", this.handleConnectError.bind(this));
    this.socket.on("reconnect", this.handleReconnect.bind(this));
    this.socket.on("reconnect_attempt", this.handleReconnectAttempt.bind(this));
    this.socket.on("reconnect_failed", this.handleReconnectFailed.bind(this));

    // Server events
    this.socket.on("connected", this.handleServerConnected.bind(this));
    this.socket.on("authenticated", this.handleAuthenticated.bind(this));
    this.socket.on("error", this.handleError.bind(this));

    // Propagate registered event listeners
    for (const [event, listeners] of this.eventListeners.entries()) {
      for (const listener of listeners) {
        this.socket.on(event, listener as (...args: unknown[]) => void);
      }
    }
  }

  /**
   * Handle connection established
   */
  private handleConnect(): void {
    this.log("Connected to server");
    this.setConnectionState("connected");

    // Start connection quality monitoring
    this.startConnectionQualityMonitoring();

    // Notify reconnection listeners if this was a reconnection
    if (this.reconnectAttempts > 0 || this._wasOffline) {
      this.reconnectionListeners.forEach((listener) => {
        try {
          listener(this.reconnectAttempts, this._wasOffline);
        } catch (error) {
          logger.error("[RealtimeClient] Reconnection listener error:", error);
        }
      });
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    this.log("Disconnected:", reason);

    // Stop connection quality monitoring
    this.stopConnectionQualityMonitoring();

    // Check if we're offline
    if (!this._isOnline) {
      this.setConnectionState("offline");
    } else {
      this.setConnectionState("disconnected");
    }

    this.authData = null;

    if (reason === "io server disconnect") {
      // Server initiated disconnect, need to manually reconnect
      if (this.config.autoReconnect && this._isOnline) {
        setTimeout(() => {
          this.connect(this.config.token).catch((err) => {
            this.log("Reconnection failed:", err);
          });
        }, this.config.reconnectDelay);
      }
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectError(error: Error): void {
    this.log("Connection error:", error.message);
    this.setConnectionState("error");
    this.notifyError({
      code: "CONNECTION_ERROR",
      message: error.message,
    });
  }

  /**
   * Handle successful reconnection
   */
  private handleReconnect(attemptNumber: number): void {
    this.log(`Reconnected after ${attemptNumber} attempts`);
    this.setConnectionState("connected");
    this.reconnectAttempts = 0;
  }

  /**
   * Handle reconnection attempt
   */
  private handleReconnectAttempt(attemptNumber: number): void {
    this.log(`Reconnection attempt ${attemptNumber}`);
    this.setConnectionState("reconnecting");
    this.reconnectAttempts = attemptNumber;
  }

  /**
   * Handle reconnection failure
   */
  private handleReconnectFailed(): void {
    this.log("Reconnection failed");
    this.setConnectionState("error");
    this.notifyError({
      code: "RECONNECTION_FAILED",
      message: `Failed to reconnect after ${this.config.maxReconnectAttempts} attempts`,
    });
  }

  /**
   * Handle server connected event
   */
  private handleServerConnected(data: ServerHandshake): void {
    this.log("Server confirmed connection:", data.socketId);
  }

  /**
   * Handle authentication success
   */
  private handleAuthenticated(data: AuthResponse): void {
    this.log("Authenticated as user:", data.userId);
    this.setConnectionState("authenticated");
    this.authData = data;
  }

  /**
   * Handle server error
   */
  private handleError(error: RealtimeError): void {
    this.log("Server error:", error);
    this.notifyError(error);
  }

  // ============================================================================
  // Public Event API
  // ============================================================================

  /**
   * Subscribe to a socket event
   */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // If socket is connected, add listener immediately
    if (this.socket) {
      this.socket.on(event, callback as (...args: unknown[]) => void);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from a socket event
   */
  off<T = unknown>(event: string, callback: (data: T) => void): void {
    this.eventListeners.get(event)?.delete(callback);
    this.socket?.off(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Subscribe to an event once
   */
  once<T = unknown>(event: string, callback: (data: T) => void): void {
    const wrappedCallback = (data: T) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * Emit an event to the server
   */
  emit<T = unknown, R = unknown>(
    event: string,
    data?: T,
    callback?: (response: {
      success: boolean;
      data?: R;
      error?: RealtimeError;
    }) => void,
  ): void {
    if (!this.socket?.connected) {
      this.log("Cannot emit, not connected");
      callback?.({
        success: false,
        error: { code: "NOT_CONNECTED", message: "Socket not connected" },
      });
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Emit an event and wait for response
   */
  emitAsync<T = unknown, R = unknown>(
    event: string,
    data?: T,
    timeout = 10000,
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout for event: ${event}`));
      }, timeout);

      this.socket.emit(
        event,
        data,
        (response: { success: boolean; data?: R; error?: RealtimeError }) => {
          clearTimeout(timeoutId);
          if (response.success) {
            resolve(response.data as R);
          } else {
            reject(new Error(response.error?.message || "Unknown error"));
          }
        },
      );
    });
  }

  // ============================================================================
  // Connection State Management
  // ============================================================================

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionListeners.add(listener);
    // Immediately notify of current state
    listener(this.connectionState);
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Subscribe to errors
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: RealtimeConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.connectionListeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          logger.error("[RealtimeClient] Connection listener error:", error);
        }
      });
    }
  }

  /**
   * Notify error listeners
   */
  private notifyError(error: RealtimeError): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        logger.error("[RealtimeClient] Error listener error:", e);
      }
    });
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Check if authenticated
   */
  get isAuthenticated(): boolean {
    return this.connectionState === "authenticated";
  }

  /**
   * Get current connection state
   */
  get state(): RealtimeConnectionState {
    return this.connectionState;
  }

  /**
   * Get socket ID
   */
  get socketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Get authenticated user data
   */
  get auth(): AuthResponse | null {
    return this.authData;
  }

  /**
   * Get reconnection attempt count
   */
  get reconnectAttemptCount(): number {
    return this.reconnectAttempts;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    if (typeof window === "undefined") {
      return { type: "unknown" };
    }

    const ua = navigator.userAgent;
    let type: DeviceInfo["type"] = "web";
    let os = "Unknown";
    let browser = "Unknown";

    // Detect OS
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    else if (/Android/i.test(ua)) {
      os = "Android";
      type = "android";
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = "iOS";
      type = "ios";
    }

    // Detect browser
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Edg/i.test(ua)) browser = "Edge";

    // Check if running in Electron/Tauri
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__TAURI__) {
        type = "desktop";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((window as any).electron) {
        type = "desktop";
      }
    }

    return { type, os, browser };
  }

  /**
   * Log message if debug is enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[RealtimeClient]', ...args)
    }
  }

  /**
   * Cleanup and destroy the client
   */
  destroy(): void {
    this.disconnect();
    this.stopConnectionQualityMonitoring();
    this.connectionListeners.clear();
    this.errorListeners.clear();
    this.offlineListeners.clear();
    this.reconnectionListeners.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const realtimeClient = new RealtimeClient();

export default RealtimeClient;
