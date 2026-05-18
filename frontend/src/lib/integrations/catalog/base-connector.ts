/**
 * Base Connector
 *
 * Abstract base class for all integration connectors.
 * Provides connection lifecycle, rate limiting, retry with exponential backoff,
 * error categorization, credential management, event emission, and request logging.
 */

import {
  type ConnectorConfig,
  type ConnectorCredentials,
  type ConnectorRateLimit,
  type RetryConfig,
  type ConnectorStatus,
  type HealthCheckResult,
  type IntegrationEvent,
  type IntegrationMetrics,
  type ConnectorRequestLog,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type CatalogEntry,
  type ConnectorErrorCategory,
  ConnectorError,
} from "./types";

// ============================================================================
// Event Emitter
// ============================================================================

export type ConnectorEventType =
  | "connected"
  | "disconnected"
  | "error"
  | "health_check"
  | "rate_limited"
  | "event_received"
  | "event_sent"
  | "reconnecting"
  | "credentials_refreshed";

export type ConnectorEventListener = (event: {
  type: ConnectorEventType;
  data?: unknown;
  timestamp: string;
}) => void;

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_RATE_LIMIT: ConnectorRateLimit = {
  maxRequests: 100,
  windowMs: 60_000,
  currentCount: 0,
  windowStart: Date.now(),
  queueSize: 0,
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

// ============================================================================
// Base Connector
// ============================================================================

/**
 * Abstract base class that all service connectors extend.
 */
export abstract class BaseConnector {
  protected config: ConnectorConfig | null = null;
  protected credentials: ConnectorCredentials | null = null;
  protected status: ConnectorStatus = "disconnected";
  protected rateLimit: ConnectorRateLimit;
  protected retryConfig: RetryConfig;
  protected metrics: IntegrationMetrics;
  protected requestLogs: ConnectorRequestLog[] = [];
  protected healthHistory: HealthCheckResult[] = [];
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  private listeners: Map<ConnectorEventType, Set<ConnectorEventListener>> =
    new Map();
  private maxLogEntries = 100;

  /** Unique provider ID (e.g., 'google_calendar') */
  abstract readonly providerId: string;
  /** Display name */
  abstract readonly displayName: string;
  /** Description */
  abstract readonly description: string;
  /** Icon */
  abstract readonly icon: string;
  /** Category */
  abstract readonly category: IntegrationCatalogCategory;
  /** Capabilities */
  abstract readonly capabilities: ConnectorCapability[];
  /** Version */
  abstract readonly version: string;

  constructor(
    rateLimit?: Partial<ConnectorRateLimit>,
    retryConfig?: Partial<RetryConfig>,
  ) {
    this.rateLimit = { ...DEFAULT_RATE_LIMIT, ...rateLimit };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.metrics = this.createEmptyMetrics();
  }

  // ==========================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ==========================================================================

  /**
   * Perform the actual connection to the external service.
   */
  protected abstract doConnect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void>;

  /**
   * Perform the actual disconnection from the external service.
   */
  protected abstract doDisconnect(): Promise<void>;

  /**
   * Perform a health check against the external service.
   */
  protected abstract doHealthCheck(): Promise<HealthCheckResult>;

  /**
   * Get the catalog entry for this connector.
   */
  abstract getCatalogEntry(): CatalogEntry;

  // ==========================================================================
  // Connection Lifecycle
  // ==========================================================================

  /**
   * Connect to the external service.
   */
  async connect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    if (this.status === "connected") {
      return;
    }

    this.status = "connecting";
    this.config = config;
    this.credentials = credentials;
    this.reconnectAttempts = 0;

    try {
      await this.doConnect(config, credentials);
      this.status = "connected";
      this.emit("connected", { provider: this.providerId });
    } catch (error) {
      this.status = "error";
      const connError = this.categorizeError(error);
      this.emit("error", { error: connError });
      throw connError;
    }
  }

  /**
   * Disconnect from the external service.
   */
  async disconnect(): Promise<void> {
    if (this.status === "disconnected") {
      return;
    }

    try {
      await this.doDisconnect();
    } finally {
      this.status = "disconnected";
      this.config = null;
      this.credentials = null;
      this.reconnectAttempts = 0;
      this.emit("disconnected", { provider: this.providerId });
    }
  }

  /**
   * Perform a health check.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const result = await this.doHealthCheck();
      this.healthHistory.push(result);
      if (this.healthHistory.length > 10) {
        this.healthHistory.shift();
      }
      this.emit("health_check", { result });
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        responseTimeMs: Date.now() - start,
        message: error instanceof Error ? error.message : "Health check failed",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: this.getConsecutiveFailures() + 1,
      };
      this.healthHistory.push(result);
      if (this.healthHistory.length > 10) {
        this.healthHistory.shift();
      }
      this.emit("health_check", { result });
      return result;
    }
  }

  /**
   * Attempt to reconnect after a failure.
   */
  async reconnect(): Promise<void> {
    if (!this.config || !this.credentials) {
      throw new ConnectorError(
        "Cannot reconnect without config and credentials",
        "config",
        this.providerId,
      );
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.status = "disabled";
      throw new ConnectorError(
        `Max reconnect attempts (${this.maxReconnectAttempts}) exceeded`,
        "network",
        this.providerId,
        { retryable: false },
      );
    }

    this.reconnectAttempts++;
    this.status = "connecting";
    this.emit("reconnecting", { attempt: this.reconnectAttempts });

    const delay = this.calculateBackoffDelay(this.reconnectAttempts);
    await this.sleep(delay);

    try {
      await this.doConnect(this.config, this.credentials);
      this.status = "connected";
      this.reconnectAttempts = 0;
      this.emit("connected", { provider: this.providerId, reconnected: true });
    } catch (error) {
      this.status = "error";
      const connError = this.categorizeError(error);
      this.emit("error", { error: connError });
      throw connError;
    }
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  /**
   * Check if a request is allowed under the rate limit.
   */
  checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.rateLimit.windowStart >= this.rateLimit.windowMs) {
      // Reset window
      this.rateLimit.windowStart = now;
      this.rateLimit.currentCount = 0;
    }
    return this.rateLimit.currentCount < this.rateLimit.maxRequests;
  }

  /**
   * Consume a rate limit token. Returns false if rate limited.
   */
  consumeRateLimit(): boolean {
    if (!this.checkRateLimit()) {
      this.status = "rate_limited";
      this.emit("rate_limited", {
        provider: this.providerId,
        resetIn:
          this.rateLimit.windowMs - (Date.now() - this.rateLimit.windowStart),
      });
      return false;
    }
    this.rateLimit.currentCount++;
    return true;
  }

  /**
   * Get remaining rate limit tokens.
   */
  getRemainingRateLimit(): number {
    if (!this.checkRateLimit()) return 0;
    return this.rateLimit.maxRequests - this.rateLimit.currentCount;
  }

  /**
   * Get time until rate limit resets in milliseconds.
   */
  getRateLimitResetMs(): number {
    return Math.max(
      0,
      this.rateLimit.windowMs - (Date.now() - this.rateLimit.windowStart),
    );
  }

  // ==========================================================================
  // Retry with Exponential Backoff
  // ==========================================================================

  /**
   * Execute a function with retry logic and exponential backoff.
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
        }

        // Check rate limit before each attempt
        if (!this.consumeRateLimit()) {
          throw new ConnectorError(
            "Rate limit exceeded",
            "rate_limit",
            this.providerId,
            { retryable: true },
          );
        }

        const start = Date.now();
        const result = await fn();
        this.recordMetric("success", Date.now() - start);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const connError = this.categorizeError(error);

        this.recordMetric("failure", 0);

        // Don't retry non-retryable errors
        if (!connError.retryable) {
          throw connError;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          throw connError;
        }

        // Log retry attempt
        this.logRequest({
          method: "RETRY",
          url: context || "unknown",
          statusCode: connError.statusCode,
          durationMs: 0,
          success: false,
          error: `Retry ${attempt + 1}/${this.retryConfig.maxAttempts}: ${connError.message}`,
        });
      }
    }

    throw (
      lastError ||
      new ConnectorError(
        "All retry attempts exhausted",
        "unknown",
        this.providerId,
      )
    );
  }

  /**
   * Calculate backoff delay with jitter.
   */
  protected calculateBackoffDelay(attempt: number): number {
    const baseDelay =
      this.retryConfig.initialDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(baseDelay, this.retryConfig.maxDelayMs);
    const jitter = cappedDelay * this.retryConfig.jitterFactor * Math.random();
    return Math.floor(cappedDelay + jitter);
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Categorize an error into a ConnectorError.
   */
  categorizeError(error: unknown): ConnectorError {
    if (error instanceof ConnectorError) {
      return error;
    }

    if (error instanceof Error) {
      // Auth errors
      if (
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("unauthorized") ||
        error.message.includes("forbidden") ||
        error.message.includes("token expired")
      ) {
        return new ConnectorError(error.message, "auth", this.providerId, {
          retryable: false,
          statusCode: error.message.includes("401") ? 401 : 403,
          cause: error,
        });
      }

      // Rate limit errors
      if (
        error.message.includes("429") ||
        error.message.includes("rate limit") ||
        error.message.includes("too many requests")
      ) {
        return new ConnectorError(
          error.message,
          "rate_limit",
          this.providerId,
          {
            retryable: true,
            statusCode: 429,
            cause: error,
          },
        );
      }

      // Network errors
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("502") ||
        error.message.includes("503") ||
        error.message.includes("504")
      ) {
        return new ConnectorError(error.message, "network", this.providerId, {
          retryable: true,
          cause: error,
        });
      }

      // Data errors
      if (
        error.message.includes("400") ||
        error.message.includes("422") ||
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        return new ConnectorError(error.message, "data", this.providerId, {
          retryable: false,
          statusCode: 400,
          cause: error,
        });
      }

      return new ConnectorError(error.message, "unknown", this.providerId, {
        retryable: false,
        cause: error,
      });
    }

    return new ConnectorError(String(error), "unknown", this.providerId, {
      retryable: false,
    });
  }

  // ==========================================================================
  // Event Emission
  // ==========================================================================

  /**
   * Register an event listener.
   */
  on(event: ConnectorEventType, listener: ConnectorEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(event: ConnectorEventType, listener: ConnectorEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Emit an event to all listeners.
   */
  protected emit(type: ConnectorEventType, data?: unknown): void {
    const eventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.listeners.get(type)?.forEach((listener) => {
      try {
        listener(eventPayload);
      } catch {
        // Swallow listener errors to prevent cascading failures
      }
    });
  }

  // ==========================================================================
  // Credential Management
  // ==========================================================================

  /**
   * Update credentials (e.g., after token refresh).
   */
  updateCredentials(credentials: ConnectorCredentials): void {
    this.credentials = credentials;
    this.emit("credentials_refreshed", { provider: this.providerId });
  }

  /**
   * Check if credentials need refresh.
   */
  credentialsNeedRefresh(): boolean {
    if (!this.credentials?.expiresAt) return false;
    const expiresAt = new Date(this.credentials.expiresAt).getTime();
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
    return Date.now() >= expiresAt - bufferMs;
  }

  /**
   * Encrypt credentials at rest using AES-GCM.
   */
  static async encryptCredentials(
    credentials: ConnectorCredentials,
    encryptionKey: string,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(credentials));

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      data,
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt credentials from encrypted storage.
   */
  static async decryptCredentials(
    encryptedData: string,
    encryptionKey: string,
  ): Promise<ConnectorCredentials> {
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0),
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      data,
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  }

  // ==========================================================================
  // Request Logging
  // ==========================================================================

  /**
   * Log a request/response cycle.
   */
  protected logRequest(
    entry: Omit<ConnectorRequestLog, "id" | "integrationId" | "timestamp">,
  ): void {
    const log: ConnectorRequestLog = {
      id: this.generateId(),
      integrationId: this.config?.id || "unknown",
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.requestLogs.push(log);
    if (this.requestLogs.length > this.maxLogEntries) {
      this.requestLogs.shift();
    }
  }

  /**
   * Get recent request logs.
   */
  getRequestLogs(limit = 50): ConnectorRequestLog[] {
    return this.requestLogs.slice(-limit);
  }

  // ==========================================================================
  // Metrics
  // ==========================================================================

  /**
   * Record a metric data point.
   */
  protected recordMetric(
    type: "success" | "failure",
    responseTimeMs: number,
  ): void {
    this.metrics.totalApiCalls++;
    if (type === "success") {
      this.metrics.successfulCalls++;
      // Running average
      this.metrics.avgResponseTimeMs =
        (this.metrics.avgResponseTimeMs * (this.metrics.successfulCalls - 1) +
          responseTimeMs) /
        this.metrics.successfulCalls;
    } else {
      this.metrics.failedCalls++;
    }
    this.metrics.lastActivityAt = new Date().toISOString();
  }

  /**
   * Get current metrics.
   */
  getMetrics(): IntegrationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics.
   */
  resetMetrics(): void {
    this.metrics = this.createEmptyMetrics();
  }

  // ==========================================================================
  // State Accessors
  // ==========================================================================

  getStatus(): ConnectorStatus {
    return this.status;
  }

  getConfig(): ConnectorConfig | null {
    return this.config;
  }

  getHealthHistory(): HealthCheckResult[] {
    return [...this.healthHistory];
  }

  isConnected(): boolean {
    return this.status === "connected";
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private getConsecutiveFailures(): number {
    let count = 0;
    for (let i = this.healthHistory.length - 1; i >= 0; i--) {
      if (!this.healthHistory[i].healthy) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private createEmptyMetrics(): IntegrationMetrics {
    return {
      integrationId: this.config?.id || "",
      totalApiCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      eventsProcessed: 0,
      syncsPerformed: 0,
      avgResponseTimeMs: 0,
      lastActivityAt: new Date().toISOString(),
      dataSyncedBytes: 0,
    };
  }
}
