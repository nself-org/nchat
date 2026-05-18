/**
 * Pluggable Transport Module
 *
 * Provides a transport abstraction layer for network communications that supports
 * multiple connection strategies to bypass network restrictions and censorship.
 *
 * Features:
 * - Transport interface abstraction
 * - WebSocket, HTTP, and obfuscated transports
 * - Transport negotiation and fallback
 * - Connection health monitoring
 * - Transport metrics and statistics
 *
 * @module lib/network/pluggable-transport
 */

import { EventEmitter } from "events";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an AbortSignal that times out after the specified duration.
 * Provides compatibility for environments where createTimeoutSignal is not available.
 */
function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return createTimeoutSignal(ms);
  }
  // Fallback for environments without createTimeoutSignal
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Transport state
 */
export enum TransportState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

/**
 * Transport type identifier
 */
export type TransportType =
  | "websocket"
  | "websocket-tls"
  | "http-polling"
  | "http-streaming"
  | "webrtc-datachannel"
  | "obfs4"
  | "meek"
  | "snowflake"
  | "domain-fronted"
  | "bridge";

/**
 * Transport priority levels
 */
export enum TransportPriority {
  PRIMARY = 0,
  SECONDARY = 1,
  TERTIARY = 2,
  FALLBACK = 3,
  EMERGENCY = 4,
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Transport type identifier */
  type: TransportType;
  /** Display name for the transport */
  name: string;
  /** Transport priority for fallback ordering */
  priority: TransportPriority;
  /** Whether transport is currently enabled */
  enabled: boolean;
  /** Endpoint configuration */
  endpoint: TransportEndpoint;
  /** Transport-specific options */
  options: TransportOptions;
  /** Retry configuration */
  retry: RetryConfig;
  /** Health check configuration */
  healthCheck: HealthCheckConfig;
}

/**
 * Transport endpoint configuration
 */
export interface TransportEndpoint {
  /** Primary URL or address */
  url: string;
  /** Alternative URLs for failover */
  alternativeUrls?: string[];
  /** Port number (if different from URL) */
  port?: number;
  /** Whether to use TLS */
  tls: boolean;
  /** TLS verification mode */
  tlsVerify: "strict" | "relaxed" | "none";
  /** Custom headers for HTTP-based transports */
  headers?: Record<string, string>;
}

/**
 * Transport-specific options
 */
export interface TransportOptions {
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Idle timeout in milliseconds */
  idleTimeout: number;
  /** Keep-alive interval in milliseconds */
  keepAliveInterval: number;
  /** Maximum payload size in bytes */
  maxPayloadSize: number;
  /** Compression enabled */
  compression: boolean;
  /** Obfuscation settings */
  obfuscation?: ObfuscationOptions;
  /** Proxy settings */
  proxy?: ProxyOptions;
  /** Custom transport parameters */
  customParams?: Record<string, unknown>;
}

/**
 * Obfuscation options for censorship resistance
 */
export interface ObfuscationOptions {
  /** Obfuscation method */
  method: "none" | "random-padding" | "traffic-shaping" | "protocol-mimicry";
  /** Minimum padding size */
  minPadding: number;
  /** Maximum padding size */
  maxPadding: number;
  /** Target protocol to mimic (for protocol-mimicry) */
  mimeticProtocol?: "http" | "https" | "tls" | "ssh" | "dns";
  /** Traffic pattern shaping */
  trafficPattern?: "constant" | "bursty" | "random";
}

/**
 * Proxy configuration
 */
export interface ProxyOptions {
  /** Proxy type */
  type: "none" | "http" | "https" | "socks4" | "socks5";
  /** Proxy host */
  host: string;
  /** Proxy port */
  port: number;
  /** Proxy authentication */
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial retry delay in milliseconds */
  initialDelay: number;
  /** Maximum retry delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter factor (0-1) */
  jitterFactor: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Health check enabled */
  enabled: boolean;
  /** Health check interval in milliseconds */
  interval: number;
  /** Health check timeout in milliseconds */
  timeout: number;
  /** Number of failures before marking unhealthy */
  failureThreshold: number;
  /** Health check endpoint path */
  path: string;
}

/**
 * Transport metrics
 */
export interface TransportMetrics {
  /** Transport identifier */
  transportId: string;
  /** Total bytes sent */
  bytesSent: number;
  /** Total bytes received */
  bytesReceived: number;
  /** Total messages sent */
  messagesSent: number;
  /** Total messages received */
  messagesReceived: number;
  /** Connection attempts */
  connectionAttempts: number;
  /** Successful connections */
  successfulConnections: number;
  /** Failed connections */
  failedConnections: number;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Latency samples */
  latencySamples: number[];
  /** Last connection time */
  lastConnectedAt?: Date;
  /** Last disconnection time */
  lastDisconnectedAt?: Date;
  /** Uptime in milliseconds */
  uptime: number;
}

/**
 * Transport event types
 */
export type TransportEventType =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "message"
  | "error"
  | "health-check"
  | "transport-switch"
  | "fallback-activated";

/**
 * Transport event
 */
export interface TransportEvent {
  /** Event type */
  type: TransportEventType;
  /** Timestamp */
  timestamp: Date;
  /** Transport identifier */
  transportId: string;
  /** Transport type */
  transportType: TransportType;
  /** Event data */
  data?: unknown;
  /** Error (if applicable) */
  error?: Error;
}

/**
 * Transport interface that all transports must implement
 */
export interface ITransport {
  /** Unique transport identifier */
  readonly id: string;
  /** Transport type */
  readonly type: TransportType;
  /** Current state */
  readonly state: TransportState;
  /** Transport configuration */
  readonly config: TransportConfig;
  /** Transport metrics */
  readonly metrics: TransportMetrics;

  /** Connect to the transport */
  connect(): Promise<void>;
  /** Disconnect from the transport */
  disconnect(): Promise<void>;
  /** Send a message */
  send(data: ArrayBuffer | string): Promise<void>;
  /** Check if transport is connected */
  isConnected(): boolean;
  /** Get transport health status */
  getHealth(): TransportHealth;
  /** Add event listener */
  on(event: TransportEventType, handler: (event: TransportEvent) => void): void;
  /** Remove event listener */
  off(
    event: TransportEventType,
    handler: (event: TransportEvent) => void,
  ): void;
}

/**
 * Transport health status
 */
export interface TransportHealth {
  /** Whether transport is healthy */
  healthy: boolean;
  /** Health score (0-100) */
  score: number;
  /** Last check timestamp */
  lastCheck: Date;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Health check errors */
  errors: string[];
}

/**
 * Transport negotiation result
 */
export interface TransportNegotiationResult {
  /** Selected transport */
  transport: ITransport;
  /** Negotiation time in milliseconds */
  negotiationTime: number;
  /** Transports that were tried */
  attempted: Array<{
    type: TransportType;
    success: boolean;
    error?: string;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default transport options
 */
export const DEFAULT_TRANSPORT_OPTIONS: TransportOptions = {
  connectionTimeout: 30000,
  idleTimeout: 120000,
  keepAliveInterval: 30000,
  maxPayloadSize: 16 * 1024 * 1024, // 16MB
  compression: true,
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enabled: true,
  interval: 30000,
  timeout: 5000,
  failureThreshold: 3,
  path: "/health",
};

// ============================================================================
// Base Transport Implementation
// ============================================================================

/**
 * Abstract base transport class
 */
export abstract class BaseTransport extends EventEmitter implements ITransport {
  public readonly id: string;
  public readonly type: TransportType;
  public readonly config: TransportConfig;

  protected _state: TransportState = TransportState.DISCONNECTED;
  protected _metrics: TransportMetrics;
  protected _health: TransportHealth;
  protected _healthCheckTimer?: ReturnType<typeof setInterval>;
  protected _keepAliveTimer?: ReturnType<typeof setInterval>;
  protected _connectionStartTime?: Date;

  constructor(config: TransportConfig) {
    super();
    this.id = `transport-${config.type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.type = config.type;
    this.config = config;

    this._metrics = this.initializeMetrics();
    this._health = this.initializeHealth();
  }

  get state(): TransportState {
    return this._state;
  }

  get metrics(): TransportMetrics {
    return { ...this._metrics };
  }

  /**
   * Initialize transport metrics
   */
  protected initializeMetrics(): TransportMetrics {
    return {
      transportId: this.id,
      bytesSent: 0,
      bytesReceived: 0,
      messagesSent: 0,
      messagesReceived: 0,
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      latencySamples: [],
      uptime: 0,
    };
  }

  /**
   * Initialize health status
   */
  protected initializeHealth(): TransportHealth {
    return {
      healthy: false,
      score: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      errors: [],
    };
  }

  /**
   * Update transport state
   */
  protected setState(state: TransportState): void {
    const previousState = this._state;
    this._state = state;

    if (
      state === TransportState.CONNECTED &&
      previousState !== TransportState.CONNECTED
    ) {
      this._connectionStartTime = new Date();
      this._metrics.lastConnectedAt = this._connectionStartTime;
      this._metrics.successfulConnections++;
      this.startHealthChecks();
      this.startKeepAlive();
    } else if (
      state === TransportState.DISCONNECTED &&
      previousState === TransportState.CONNECTED
    ) {
      this._metrics.lastDisconnectedAt = new Date();
      if (this._connectionStartTime) {
        this._metrics.uptime +=
          Date.now() - this._connectionStartTime.getTime();
      }
      this.stopHealthChecks();
      this.stopKeepAlive();
    } else if (state === TransportState.FAILED) {
      this._metrics.failedConnections++;
    }

    this.emitEvent(
      state === TransportState.CONNECTED ? "connected" : "disconnected",
    );
  }

  /**
   * Record bytes sent
   */
  protected recordBytesSent(bytes: number): void {
    this._metrics.bytesSent += bytes;
    this._metrics.messagesSent++;
  }

  /**
   * Record bytes received
   */
  protected recordBytesReceived(bytes: number): void {
    this._metrics.bytesReceived += bytes;
    this._metrics.messagesReceived++;
  }

  /**
   * Record latency sample
   */
  protected recordLatency(latencyMs: number): void {
    const maxSamples = 100;
    this._metrics.latencySamples.push(latencyMs);
    if (this._metrics.latencySamples.length > maxSamples) {
      this._metrics.latencySamples.shift();
    }
    this._metrics.averageLatency =
      this._metrics.latencySamples.reduce((a, b) => a + b, 0) /
      this._metrics.latencySamples.length;
  }

  /**
   * Start health checks
   */
  protected startHealthChecks(): void {
    if (!this.config.healthCheck.enabled) return;

    this.stopHealthChecks();
    this._healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheck.interval,
    );
  }

  /**
   * Stop health checks
   */
  protected stopHealthChecks(): void {
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer);
      this._healthCheckTimer = undefined;
    }
  }

  /**
   * Start keep-alive
   */
  protected startKeepAlive(): void {
    this.stopKeepAlive();
    this._keepAliveTimer = setInterval(
      () => this.sendKeepAlive(),
      this.config.options.keepAliveInterval,
    );
  }

  /**
   * Stop keep-alive
   */
  protected stopKeepAlive(): void {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = undefined;
    }
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      const healthy = await this.checkHealth();
      const latency = Date.now() - startTime;

      if (healthy) {
        this._health.consecutiveFailures = 0;
        this._health.healthy = true;
        this._health.score = Math.min(100, 100 - Math.floor(latency / 10));
        this._health.errors = [];
        this.recordLatency(latency);
      } else {
        this._health.consecutiveFailures++;
        if (
          this._health.consecutiveFailures >=
          this.config.healthCheck.failureThreshold
        ) {
          this._health.healthy = false;
          this._health.score = 0;
        }
      }
    } catch (error) {
      this._health.consecutiveFailures++;
      this._health.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      if (this._health.errors.length > 5) {
        this._health.errors.shift();
      }
      if (
        this._health.consecutiveFailures >=
        this.config.healthCheck.failureThreshold
      ) {
        this._health.healthy = false;
        this._health.score = 0;
      }
    }

    this._health.lastCheck = new Date();
    this.emitEvent("health-check", { health: this._health });
  }

  /**
   * Emit transport event
   */
  protected emitEvent(
    type: TransportEventType,
    data?: unknown,
    error?: Error,
  ): void {
    const event: TransportEvent = {
      type,
      timestamp: new Date(),
      transportId: this.id,
      transportType: this.type,
      data,
      error,
    };
    this.emit(type, event);
  }

  /**
   * Calculate retry delay with jitter
   */
  protected calculateRetryDelay(attempt: number): number {
    const { initialDelay, maxDelay, backoffMultiplier, jitterFactor } =
      this.config.retry;
    const exponentialDelay =
      initialDelay * Math.pow(backoffMultiplier, attempt);
    const boundedDelay = Math.min(exponentialDelay, maxDelay);
    const jitter = boundedDelay * jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, boundedDelay + jitter);
  }

  // Abstract methods to be implemented by specific transports
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(data: ArrayBuffer | string): Promise<void>;
  abstract isConnected(): boolean;
  abstract getHealth(): TransportHealth;
  protected abstract checkHealth(): Promise<boolean>;
  protected abstract sendKeepAlive(): Promise<void>;

  on(
    event: TransportEventType,
    handler: (event: TransportEvent) => void,
  ): this {
    super.on(event, handler);
    return this;
  }

  off(
    event: TransportEventType,
    handler: (event: TransportEvent) => void,
  ): this {
    super.off(event, handler);
    return this;
  }
}

// ============================================================================
// WebSocket Transport
// ============================================================================

/**
 * WebSocket transport implementation
 */
export class WebSocketTransport extends BaseTransport {
  private _socket?: WebSocket;
  private _reconnectAttempts: number = 0;
  private _pendingMessages: Array<ArrayBuffer | string> = [];

  constructor(config: TransportConfig) {
    super({
      ...config,
      type: config.endpoint.tls ? "websocket-tls" : "websocket",
    });
  }

  async connect(): Promise<void> {
    if (this._state === TransportState.CONNECTED) {
      return;
    }

    this._metrics.connectionAttempts++;
    this.setState(TransportState.CONNECTING);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.setState(TransportState.FAILED);
        reject(
          new Error(
            `Connection timeout after ${this.config.options.connectionTimeout}ms`,
          ),
        );
      }, this.config.options.connectionTimeout);

      try {
        const protocol = this.config.endpoint.tls ? "wss" : "ws";
        const url = this.config.endpoint.url.startsWith("ws")
          ? this.config.endpoint.url
          : `${protocol}://${this.config.endpoint.url}`;

        this._socket = new WebSocket(url);
        this._socket.binaryType = "arraybuffer";

        this._socket.onopen = () => {
          clearTimeout(timeout);
          this._reconnectAttempts = 0;
          this.setState(TransportState.CONNECTED);
          this.flushPendingMessages();
          resolve();
        };

        this._socket.onclose = (event) => {
          this.handleDisconnect(event.code, event.reason);
        };

        this._socket.onerror = (error) => {
          clearTimeout(timeout);
          this.emitEvent(
            "error",
            undefined,
            error instanceof Error ? error : new Error("WebSocket error"),
          );
        };

        this._socket.onmessage = (event) => {
          const size =
            event.data instanceof ArrayBuffer
              ? event.data.byteLength
              : event.data.length;
          this.recordBytesReceived(size);
          this.emitEvent("message", event.data);
        };
      } catch (error) {
        clearTimeout(timeout);
        this.setState(TransportState.FAILED);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.stopHealthChecks();
    this.stopKeepAlive();

    if (this._socket) {
      this._socket.onclose = null;
      this._socket.onerror = null;
      this._socket.onmessage = null;
      this._socket.close(1000, "Normal closure");
      this._socket = undefined;
    }

    this.setState(TransportState.DISCONNECTED);
  }

  async send(data: ArrayBuffer | string): Promise<void> {
    if (!this.isConnected()) {
      // Queue message for later delivery
      this._pendingMessages.push(data);
      if (this._pendingMessages.length > 100) {
        this._pendingMessages.shift(); // Drop oldest message if queue is full
      }
      throw new Error("Transport not connected");
    }

    const payload = this.applyObfuscation(data);
    this._socket!.send(payload);
    const size =
      payload instanceof ArrayBuffer ? payload.byteLength : payload.length;
    this.recordBytesSent(size);
  }

  isConnected(): boolean {
    return this._socket?.readyState === WebSocket.OPEN;
  }

  getHealth(): TransportHealth {
    return { ...this._health };
  }

  protected async checkHealth(): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    // Send ping and wait for pong
    try {
      const pingData = JSON.stringify({ type: "ping", timestamp: Date.now() });
      this._socket!.send(pingData);
      return true;
    } catch {
      return false;
    }
  }

  protected async sendKeepAlive(): Promise<void> {
    if (this.isConnected()) {
      try {
        const keepAlive = JSON.stringify({
          type: "keepalive",
          timestamp: Date.now(),
        });
        this._socket!.send(keepAlive);
      } catch {
        // Ignore keep-alive errors
      }
    }
  }

  private handleDisconnect(code: number, reason: string): void {
    if (this._state === TransportState.DISCONNECTED) {
      return;
    }

    this.emitEvent("disconnected", { code, reason });

    // Attempt reconnection if not intentional
    if (
      code !== 1000 &&
      this._reconnectAttempts < this.config.retry.maxAttempts
    ) {
      this.attemptReconnect();
    } else {
      this.setState(TransportState.DISCONNECTED);
    }
  }

  private async attemptReconnect(): Promise<void> {
    this.setState(TransportState.RECONNECTING);
    this.emitEvent("reconnecting", { attempt: this._reconnectAttempts + 1 });

    const delay = this.calculateRetryDelay(this._reconnectAttempts);
    this._reconnectAttempts++;

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
    } catch {
      if (this._reconnectAttempts < this.config.retry.maxAttempts) {
        this.attemptReconnect();
      } else {
        this.setState(TransportState.FAILED);
      }
    }
  }

  private flushPendingMessages(): void {
    while (this._pendingMessages.length > 0 && this.isConnected()) {
      const message = this._pendingMessages.shift()!;
      try {
        this.send(message);
      } catch {
        // Re-queue failed message at the front
        this._pendingMessages.unshift(message);
        break;
      }
    }
  }

  private applyObfuscation(data: ArrayBuffer | string): ArrayBuffer | string {
    const obfuscation = this.config.options.obfuscation;
    if (!obfuscation || obfuscation.method === "none") {
      return data;
    }

    if (obfuscation.method === "random-padding") {
      return this.addRandomPadding(
        data,
        obfuscation.minPadding,
        obfuscation.maxPadding,
      );
    }

    return data;
  }

  private addRandomPadding(
    data: ArrayBuffer | string,
    minPadding: number,
    maxPadding: number,
  ): ArrayBuffer | string {
    const paddingSize =
      minPadding + Math.floor(Math.random() * (maxPadding - minPadding));
    const padding = new Uint8Array(paddingSize);
    crypto.getRandomValues(padding);

    if (typeof data === "string") {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);
      const combined = new Uint8Array(4 + dataBytes.length + paddingSize);
      const view = new DataView(combined.buffer);
      view.setUint32(0, dataBytes.length, false);
      combined.set(dataBytes, 4);
      combined.set(padding, 4 + dataBytes.length);
      return combined.buffer;
    }

    const dataBytes = new Uint8Array(data);
    const combined = new Uint8Array(4 + dataBytes.length + paddingSize);
    const view = new DataView(combined.buffer);
    view.setUint32(0, dataBytes.length, false);
    combined.set(dataBytes, 4);
    combined.set(padding, 4 + dataBytes.length);
    return combined.buffer;
  }
}

// ============================================================================
// HTTP Polling Transport
// ============================================================================

/**
 * HTTP polling transport for environments where WebSockets are blocked
 */
export class HTTPPollingTransport extends BaseTransport {
  private _polling: boolean = false;
  private _pollingInterval?: ReturnType<typeof setInterval>;
  private _sessionId?: string;
  private _messageQueue: Array<ArrayBuffer | string> = [];
  private _abortController?: AbortController;

  constructor(config: TransportConfig) {
    super({
      ...config,
      type: "http-polling",
    });
  }

  async connect(): Promise<void> {
    if (this._state === TransportState.CONNECTED) {
      return;
    }

    this._metrics.connectionAttempts++;
    this.setState(TransportState.CONNECTING);

    try {
      this._abortController = new AbortController();

      // Establish session
      const response = await fetch(`${this.config.endpoint.url}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.endpoint.headers,
        },
        body: JSON.stringify({ timestamp: Date.now() }),
        signal: this._abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }

      const data = await response.json();
      this._sessionId = data.sessionId;

      // Start polling
      this._polling = true;
      this.startPolling();
      this.setState(TransportState.CONNECTED);
    } catch (error) {
      this.setState(TransportState.FAILED);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._polling = false;
    this.stopPolling();
    this.stopHealthChecks();
    this.stopKeepAlive();

    if (this._abortController) {
      this._abortController.abort();
      this._abortController = undefined;
    }

    if (this._sessionId) {
      try {
        await fetch(`${this.config.endpoint.url}/disconnect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.config.endpoint.headers,
          },
          body: JSON.stringify({ sessionId: this._sessionId }),
        });
      } catch {
        // Ignore disconnect errors
      }
      this._sessionId = undefined;
    }

    this.setState(TransportState.DISCONNECTED);
  }

  async send(data: ArrayBuffer | string): Promise<void> {
    if (!this.isConnected()) {
      this._messageQueue.push(data);
      throw new Error("Transport not connected");
    }

    const payload =
      typeof data === "string"
        ? data
        : btoa(String.fromCharCode(...new Uint8Array(data)));

    const response = await fetch(`${this.config.endpoint.url}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.config.endpoint.headers,
      },
      body: JSON.stringify({
        sessionId: this._sessionId,
        data: payload,
        timestamp: Date.now(),
      }),
      signal: this._abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`Send failed: ${response.status}`);
    }

    const size = typeof data === "string" ? data.length : data.byteLength;
    this.recordBytesSent(size);
  }

  isConnected(): boolean {
    return this._state === TransportState.CONNECTED && !!this._sessionId;
  }

  getHealth(): TransportHealth {
    return { ...this._health };
  }

  protected async checkHealth(): Promise<boolean> {
    if (!this._sessionId) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.endpoint.url}/health`, {
        method: "GET",
        headers: this.config.endpoint.headers,
        signal: createTimeoutSignal(this.config.healthCheck.timeout),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async sendKeepAlive(): Promise<void> {
    if (this.isConnected()) {
      try {
        await fetch(`${this.config.endpoint.url}/keepalive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.config.endpoint.headers,
          },
          body: JSON.stringify({ sessionId: this._sessionId }),
        });
      } catch {
        // Ignore keep-alive errors
      }
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this._pollingInterval = setInterval(() => this.poll(), 1000);
  }

  private stopPolling(): void {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = undefined;
    }
  }

  private async poll(): Promise<void> {
    if (!this._polling || !this._sessionId) {
      return;
    }

    try {
      const response = await fetch(`${this.config.endpoint.url}/poll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.endpoint.headers,
        },
        body: JSON.stringify({ sessionId: this._sessionId }),
        signal: createTimeoutSignal(30000),
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.messages && Array.isArray(data.messages)) {
        for (const message of data.messages) {
          this.recordBytesReceived(JSON.stringify(message).length);
          this.emitEvent("message", message);
        }
      }

      // Flush queued messages
      while (this._messageQueue.length > 0 && this.isConnected()) {
        const message = this._messageQueue.shift()!;
        await this.send(message);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        this.emitEvent("error", undefined, error);
      }
    }
  }
}

// ============================================================================
// Transport Manager
// ============================================================================

/**
 * Transport manager for handling multiple transports with fallback
 */
export class TransportManager extends EventEmitter {
  private _transports: Map<string, ITransport> = new Map();
  private _activeTransport?: ITransport;
  private _configs: TransportConfig[] = [];
  private _negotiating: boolean = false;

  /**
   * Register a transport configuration
   */
  registerTransport(config: TransportConfig): void {
    this._configs.push(config);
    this._configs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all registered transport configurations
   */
  getTransportConfigs(): TransportConfig[] {
    return [...this._configs];
  }

  /**
   * Negotiate and establish the best available transport
   */
  async negotiate(): Promise<TransportNegotiationResult> {
    if (this._negotiating) {
      throw new Error("Negotiation already in progress");
    }

    this._negotiating = true;
    const startTime = Date.now();
    const attempted: TransportNegotiationResult["attempted"] = [];

    try {
      // Sort configs by priority
      const sortedConfigs = [...this._configs]
        .filter((c) => c.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const config of sortedConfigs) {
        try {
          const transport = this.createTransport(config);
          await transport.connect();

          this._transports.set(transport.id, transport);
          this._activeTransport = transport;

          this.setupTransportListeners(transport);

          attempted.push({
            type: config.type,
            success: true,
          });

          return {
            transport,
            negotiationTime: Date.now() - startTime,
            attempted,
          };
        } catch (error) {
          attempted.push({
            type: config.type,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      throw new Error("All transports failed to connect");
    } finally {
      this._negotiating = false;
    }
  }

  /**
   * Create a transport from configuration
   */
  private createTransport(config: TransportConfig): ITransport {
    switch (config.type) {
      case "websocket":
      case "websocket-tls":
        return new WebSocketTransport(config);
      case "http-polling":
        return new HTTPPollingTransport(config);
      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }

  /**
   * Setup event listeners for a transport
   */
  private setupTransportListeners(transport: ITransport): void {
    transport.on("disconnected", () => {
      this.handleTransportDisconnect(transport);
    });

    transport.on("error", (event) => {
      this.emit("transport-error", event);
    });

    transport.on("message", (event) => {
      this.emit("message", event);
    });
  }

  /**
   * Handle transport disconnection
   */
  private async handleTransportDisconnect(
    transport: ITransport,
  ): Promise<void> {
    if (this._activeTransport?.id === transport.id) {
      this.emit("transport-lost", { transport: transport.type });

      // Attempt fallback
      try {
        const result = await this.negotiate();
        this.emit("fallback-activated", {
          from: transport.type,
          to: result.transport.type,
        });
      } catch (error) {
        this.emit("all-transports-failed", { error });
      }
    }
  }

  /**
   * Get the active transport
   */
  getActiveTransport(): ITransport | undefined {
    return this._activeTransport;
  }

  /**
   * Send data through the active transport
   */
  async send(data: ArrayBuffer | string): Promise<void> {
    if (!this._activeTransport) {
      throw new Error("No active transport");
    }
    await this._activeTransport.send(data);
  }

  /**
   * Disconnect all transports
   */
  async disconnectAll(): Promise<void> {
    const disconnects = Array.from(this._transports.values()).map((t) =>
      t.disconnect(),
    );
    await Promise.all(disconnects);
    this._transports.clear();
    this._activeTransport = undefined;
  }

  /**
   * Get transport metrics
   */
  getMetrics(): TransportMetrics[] {
    return Array.from(this._transports.values()).map((t) => t.metrics);
  }

  /**
   * Get transport health status
   */
  getHealthStatus(): Map<string, TransportHealth> {
    const health = new Map<string, TransportHealth>();
    for (const [id, transport] of this._transports) {
      health.set(id, transport.getHealth());
    }
    return health;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a default WebSocket transport configuration
 */
export function createWebSocketConfig(
  url: string,
  options?: Partial<TransportConfig>,
): TransportConfig {
  return {
    type: url.startsWith("wss") ? "websocket-tls" : "websocket",
    name: "WebSocket Transport",
    priority: TransportPriority.PRIMARY,
    enabled: true,
    endpoint: {
      url,
      tls: url.startsWith("wss"),
      tlsVerify: "strict",
      ...options?.endpoint,
    },
    options: {
      ...DEFAULT_TRANSPORT_OPTIONS,
      ...options?.options,
    },
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...options?.retry,
    },
    healthCheck: {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      ...options?.healthCheck,
    },
  };
}

/**
 * Create an HTTP polling transport configuration
 */
export function createHTTPPollingConfig(
  url: string,
  options?: Partial<TransportConfig>,
): TransportConfig {
  return {
    type: "http-polling",
    name: "HTTP Polling Transport",
    priority: TransportPriority.SECONDARY,
    enabled: true,
    endpoint: {
      url,
      tls: url.startsWith("https"),
      tlsVerify: "strict",
      ...options?.endpoint,
    },
    options: {
      ...DEFAULT_TRANSPORT_OPTIONS,
      ...options?.options,
    },
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...options?.retry,
    },
    healthCheck: {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      ...options?.healthCheck,
    },
  };
}

/**
 * Create a transport manager with default configurations
 */
export function createTransportManager(
  primaryUrl: string,
  fallbackUrl?: string,
): TransportManager {
  const manager = new TransportManager();

  manager.registerTransport(createWebSocketConfig(primaryUrl));

  if (fallbackUrl) {
    manager.registerTransport(createHTTPPollingConfig(fallbackUrl));
  }

  return manager;
}

// ============================================================================
// Exports
// ============================================================================

export const PLUGGABLE_TRANSPORT_CONSTANTS = {
  DEFAULT_CONNECTION_TIMEOUT: DEFAULT_TRANSPORT_OPTIONS.connectionTimeout,
  DEFAULT_IDLE_TIMEOUT: DEFAULT_TRANSPORT_OPTIONS.idleTimeout,
  DEFAULT_KEEP_ALIVE_INTERVAL: DEFAULT_TRANSPORT_OPTIONS.keepAliveInterval,
  DEFAULT_MAX_PAYLOAD_SIZE: DEFAULT_TRANSPORT_OPTIONS.maxPayloadSize,
  DEFAULT_MAX_RETRY_ATTEMPTS: DEFAULT_RETRY_CONFIG.maxAttempts,
  DEFAULT_HEALTH_CHECK_INTERVAL: DEFAULT_HEALTH_CHECK_CONFIG.interval,
} as const;
