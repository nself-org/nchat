/**
 * Webhook Delivery System
 *
 * Handles outgoing webhook delivery with:
 * - Exponential backoff retry logic
 * - Circuit breaker pattern
 * - Dead letter queue for permanently failed deliveries
 * - Concurrent delivery management
 * - Payload size limits
 * - SSRF protection
 */

import type {
  WebhookRegistration,
  WebhookRetryOptions,
  WebhookDeliveryRecord,
  DeliveryAttempt,
  DeadLetterEntry,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitBreakerState,
  WebhookEventPayload,
} from "./types";
import { DEFAULT_RETRY_OPTIONS, DEFAULT_CIRCUIT_BREAKER_CONFIG } from "./types";
import {
  generateSignature,
  generateCompositeSignature,
  generateNonce,
  SIGNATURE_HEADERS,
} from "./signature";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum payload size in bytes (256 KB) */
export const MAX_PAYLOAD_SIZE = 256 * 1024;

/** Maximum concurrent deliveries per webhook */
export const MAX_CONCURRENT_DELIVERIES = 10;

/** Maximum response body size to store (4 KB) */
export const MAX_RESPONSE_BODY_SIZE = 4096;

/** User-Agent header for outgoing webhook requests */
export const WEBHOOK_USER_AGENT = "nchat-webhook/1.0";

/** Default delivery timeout in milliseconds */
export const DEFAULT_DELIVERY_TIMEOUT_MS = 30_000;

// ============================================================================
// FETCH FUNCTION TYPE
// ============================================================================

/**
 * Custom fetch function for dependency injection.
 */
export type WebhookFetchFunction = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}>;

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker for webhook endpoints.
 * Prevents overwhelming a failing endpoint by temporarily halting deliveries.
 */
export class CircuitBreaker {
  private statuses: Map<string, CircuitBreakerStatus> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Get or initialize the status for a webhook.
   */
  getStatus(webhookId: string): CircuitBreakerStatus {
    let status = this.statuses.get(webhookId);
    if (!status) {
      status = {
        state: "closed",
        failureCount: 0,
        successCount: 0,
      };
      this.statuses.set(webhookId, status);
    }
    return status;
  }

  /**
   * Check if a delivery is allowed for a webhook.
   */
  canDeliver(webhookId: string): boolean {
    const status = this.getStatus(webhookId);

    switch (status.state) {
      case "closed":
        return true;

      case "open": {
        // Check if reset timeout has elapsed
        if (status.nextAttemptAt) {
          const nextAttempt = new Date(status.nextAttemptAt).getTime();
          if (Date.now() >= nextAttempt) {
            // Transition to half-open
            status.state = "half_open";
            status.successCount = 0;
            return true;
          }
        }
        return false;
      }

      case "half_open":
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful delivery.
   */
  recordSuccess(webhookId: string): void {
    const status = this.getStatus(webhookId);
    status.lastSuccessAt = new Date().toISOString();

    switch (status.state) {
      case "half_open":
        status.successCount++;
        if (status.successCount >= this.config.successThreshold) {
          // Transition back to closed
          status.state = "closed";
          status.failureCount = 0;
          status.successCount = 0;
          status.nextAttemptAt = undefined;
        }
        break;

      case "closed":
        // Reset failure count on success
        status.failureCount = 0;
        break;
    }
  }

  /**
   * Record a failed delivery.
   */
  recordFailure(webhookId: string): void {
    const status = this.getStatus(webhookId);
    status.failureCount++;
    status.lastFailureAt = new Date().toISOString();

    switch (status.state) {
      case "closed":
        if (status.failureCount >= this.config.failureThreshold) {
          // Open the circuit
          status.state = "open";
          status.nextAttemptAt = new Date(
            Date.now() + this.config.resetTimeoutMs,
          ).toISOString();
        }
        break;

      case "half_open":
        // Any failure in half-open goes back to open
        status.state = "open";
        status.successCount = 0;
        status.nextAttemptAt = new Date(
          Date.now() + this.config.resetTimeoutMs,
        ).toISOString();
        break;
    }
  }

  /**
   * Reset the circuit breaker for a webhook.
   */
  reset(webhookId: string): void {
    this.statuses.delete(webhookId);
  }

  /**
   * Get the current state for a webhook.
   */
  getState(webhookId: string): CircuitBreakerState {
    return this.getStatus(webhookId).state;
  }

  /**
   * Clear all circuit breaker state.
   */
  clear(): void {
    this.statuses.clear();
  }
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

/**
 * Dead letter queue for permanently failed webhook deliveries.
 * Preserves failed deliveries for debugging and manual replay.
 */
export class DeadLetterQueue {
  private entries: Map<string, DeadLetterEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add a failed delivery to the dead letter queue.
   */
  enqueue(delivery: WebhookDeliveryRecord, reason: string): DeadLetterEntry {
    // Evict oldest if at capacity
    if (this.entries.size >= this.maxSize) {
      const oldest = this.getOldest();
      if (oldest) {
        this.entries.delete(oldest.id);
      }
    }

    const entry: DeadLetterEntry = {
      id: `dlq_${delivery.id}`,
      delivery: { ...delivery, status: "dead_letter" },
      reason,
      deadLetteredAt: new Date().toISOString(),
      replayed: false,
    };

    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * Get a dead letter entry by ID.
   */
  get(id: string): DeadLetterEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * List dead letter entries, optionally filtered by webhook ID.
   */
  list(webhookId?: string): DeadLetterEntry[] {
    const entries = Array.from(this.entries.values());
    if (webhookId) {
      return entries.filter((e) => e.delivery.webhookId === webhookId);
    }
    return entries;
  }

  /**
   * Mark a dead letter entry as replayed.
   */
  markReplayed(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }
    entry.replayed = true;
    entry.replayedAt = new Date().toISOString();
    return true;
  }

  /**
   * Remove a dead letter entry.
   */
  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Get the number of entries in the queue.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Clear the queue.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get the oldest entry.
   */
  private getOldest(): DeadLetterEntry | undefined {
    let oldest: DeadLetterEntry | undefined;
    for (const entry of this.entries.values()) {
      if (!oldest || entry.deadLetteredAt < oldest.deadLetteredAt) {
        oldest = entry;
      }
    }
    return oldest;
  }
}

// ============================================================================
// DELIVERY ENGINE
// ============================================================================

/**
 * Configuration for the delivery engine.
 */
export interface DeliveryEngineConfig {
  /** Default retry options */
  retryOptions: WebhookRetryOptions;
  /** Circuit breaker configuration */
  circuitBreakerConfig: CircuitBreakerConfig;
  /** Maximum payload size in bytes */
  maxPayloadSize: number;
  /** Delivery timeout in milliseconds */
  deliveryTimeoutMs: number;
  /** Maximum concurrent deliveries per webhook */
  maxConcurrentDeliveries: number;
  /** Dead letter queue max size */
  deadLetterMaxSize: number;
  /** Blocked URL patterns (SSRF protection) */
  blockedUrlPatterns: RegExp[];
}

/**
 * Default delivery engine configuration.
 */
export const DEFAULT_DELIVERY_ENGINE_CONFIG: DeliveryEngineConfig = {
  retryOptions: DEFAULT_RETRY_OPTIONS,
  circuitBreakerConfig: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  maxPayloadSize: MAX_PAYLOAD_SIZE,
  deliveryTimeoutMs: DEFAULT_DELIVERY_TIMEOUT_MS,
  maxConcurrentDeliveries: MAX_CONCURRENT_DELIVERIES,
  deadLetterMaxSize: 1000,
  blockedUrlPatterns: [
    /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i,
    /^https?:\/\/(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
    /^https?:\/\/169\.254\.\d+\.\d+/i, // Link-local / cloud metadata
    /^https?:\/\/metadata\.google\.internal/i,
  ],
};

let deliveryIdCounter = 0;

/**
 * Generate a unique delivery ID.
 */
export function generateDeliveryId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return `del_${nodeCrypto.randomUUID()}`;
  } catch {
    deliveryIdCounter++;
    return `del_${Date.now()}_${deliveryIdCounter}`;
  }
}

/**
 * The main webhook delivery engine.
 * Orchestrates outgoing webhook delivery with retries, circuit breaking,
 * and dead letter queue management.
 */
export class WebhookDeliveryEngine {
  private config: DeliveryEngineConfig;
  private circuitBreaker: CircuitBreaker;
  private deadLetterQueue: DeadLetterQueue;
  private fetchFn: WebhookFetchFunction;
  private deliveries: Map<string, WebhookDeliveryRecord> = new Map();
  private activeDeliveries: Map<string, number> = new Map(); // webhookId -> count
  private sleepFn: (ms: number) => Promise<void>;

  constructor(
    fetchFn: WebhookFetchFunction,
    config: Partial<DeliveryEngineConfig> = {},
    sleepFn?: (ms: number) => Promise<void>,
  ) {
    this.config = { ...DEFAULT_DELIVERY_ENGINE_CONFIG, ...config };
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreakerConfig);
    this.deadLetterQueue = new DeadLetterQueue(this.config.deadLetterMaxSize);
    this.fetchFn = fetchFn;
    this.sleepFn =
      sleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  // ==========================================================================
  // DELIVERY
  // ==========================================================================

  /**
   * Deliver a webhook event to a registered webhook endpoint.
   *
   * @param webhook - The webhook registration
   * @param event - The event payload to deliver
   * @returns The delivery record
   */
  async deliver(
    webhook: WebhookRegistration,
    event: WebhookEventPayload,
  ): Promise<WebhookDeliveryRecord> {
    // Pre-delivery validation
    const validationError = this.validateDelivery(webhook, event);
    if (validationError) {
      return this.createFailedDelivery(webhook, event, validationError);
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canDeliver(webhook.id)) {
      const record = this.createFailedDelivery(
        webhook,
        event,
        "Circuit breaker open: endpoint is unavailable",
      );
      this.deadLetterQueue.enqueue(record, "Circuit breaker open");
      return record;
    }

    // Check concurrent delivery limit
    const activeCnt = this.activeDeliveries.get(webhook.id) ?? 0;
    if (activeCnt >= this.config.maxConcurrentDeliveries) {
      const record = this.createFailedDelivery(
        webhook,
        event,
        "Maximum concurrent deliveries reached",
      );
      this.deadLetterQueue.enqueue(
        record,
        "Concurrent delivery limit exceeded",
      );
      return record;
    }

    // Create delivery record
    const payloadString = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = generateNonce();
    const signature = generateCompositeSignature(
      payloadString,
      webhook.secret,
      timestamp,
    );

    const record: WebhookDeliveryRecord = {
      id: generateDeliveryId(),
      webhookId: webhook.id,
      event: event.event,
      status: "pending",
      payload: payloadString,
      signature,
      url: webhook.url,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": WEBHOOK_USER_AGENT,
        [SIGNATURE_HEADERS.SIGNATURE]: signature,
        [SIGNATURE_HEADERS.TIMESTAMP]: String(timestamp),
        [SIGNATURE_HEADERS.NONCE]: nonce,
        [SIGNATURE_HEADERS.DELIVERY_ID]: event.id,
        [SIGNATURE_HEADERS.EVENT_TYPE]: event.event,
        ...(webhook.headers || {}),
      },
      attempts: [],
      currentAttempt: 0,
      maxAttempts: webhook.retryConfig.enabled
        ? webhook.retryConfig.maxAttempts
        : 1,
      createdAt: new Date().toISOString(),
      idempotencyKey: event.idempotencyKey,
    };

    this.deliveries.set(record.id, record);

    // Track active deliveries
    this.activeDeliveries.set(webhook.id, activeCnt + 1);

    try {
      // Execute delivery with retries
      await this.executeDelivery(record, webhook);
    } finally {
      // Decrement active delivery count
      const current = this.activeDeliveries.get(webhook.id) ?? 1;
      if (current <= 1) {
        this.activeDeliveries.delete(webhook.id);
      } else {
        this.activeDeliveries.set(webhook.id, current - 1);
      }
    }

    return record;
  }

  /**
   * Execute delivery with retry logic.
   */
  private async executeDelivery(
    record: WebhookDeliveryRecord,
    webhook: WebhookRegistration,
  ): Promise<void> {
    const retryConfig = webhook.retryConfig;

    for (let attempt = 1; attempt <= record.maxAttempts; attempt++) {
      record.currentAttempt = attempt;
      record.status = attempt === 1 ? "delivering" : "retrying";
      this.deliveries.set(record.id, record);

      const attemptRecord = await this.executeAttempt(record);
      record.attempts.push(attemptRecord);

      if (
        attemptRecord.statusCode &&
        attemptRecord.statusCode >= 200 &&
        attemptRecord.statusCode < 300
      ) {
        // Success
        record.status = "delivered";
        record.completedAt = new Date().toISOString();
        this.deliveries.set(record.id, record);
        this.circuitBreaker.recordSuccess(webhook.id);
        return;
      }

      // Check if the status code is retryable
      const isRetryable = attemptRecord.statusCode
        ? retryConfig.retryableStatusCodes.includes(attemptRecord.statusCode)
        : true; // Network errors are retryable

      if (
        !isRetryable ||
        !retryConfig.enabled ||
        attempt >= record.maxAttempts
      ) {
        // Not retryable or max attempts reached
        record.status = "failed";
        record.completedAt = new Date().toISOString();
        this.deliveries.set(record.id, record);
        this.circuitBreaker.recordFailure(webhook.id);

        // Move to dead letter queue
        this.deadLetterQueue.enqueue(
          record,
          attemptRecord.error || `HTTP ${attemptRecord.statusCode}`,
        );
        return;
      }

      // Calculate backoff delay
      const delay = this.calculateBackoff(attempt, retryConfig);
      record.nextRetryAt = new Date(Date.now() + delay).toISOString();
      record.status = "retrying";
      this.deliveries.set(record.id, record);

      this.circuitBreaker.recordFailure(webhook.id);

      // Wait before retry
      await this.sleepFn(delay);

      // Re-check circuit breaker before retry
      if (!this.circuitBreaker.canDeliver(webhook.id)) {
        record.status = "failed";
        record.completedAt = new Date().toISOString();
        this.deliveries.set(record.id, record);
        this.deadLetterQueue.enqueue(
          record,
          "Circuit breaker opened during retries",
        );
        return;
      }
    }
  }

  /**
   * Execute a single delivery attempt.
   */
  private async executeAttempt(
    record: WebhookDeliveryRecord,
  ): Promise<DeliveryAttempt> {
    const attempt: DeliveryAttempt = {
      attemptNumber: record.currentAttempt,
      startedAt: new Date().toISOString(),
    };

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.deliveryTimeoutMs,
      );

      try {
        const response = await this.fetchFn(record.url, {
          method: "POST",
          headers: record.headers,
          body: record.payload,
          signal: controller.signal,
        });

        attempt.statusCode = response.status;
        attempt.durationMs = Date.now() - startTime;
        attempt.completedAt = new Date().toISOString();

        // Try to capture response body
        try {
          const body = await response.text();
          attempt.responseBody = body.substring(0, MAX_RESPONSE_BODY_SIZE);
        } catch {
          // Ignore response body read errors
        }

        if (!response.ok) {
          attempt.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      attempt.durationMs = Date.now() - startTime;
      attempt.completedAt = new Date().toISOString();

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          attempt.error = `Delivery timeout (${this.config.deliveryTimeoutMs}ms)`;
        } else {
          attempt.error = err.message;
        }
      } else {
        attempt.error = String(err);
      }
    }

    return attempt;
  }

  /**
   * Calculate exponential backoff delay.
   */
  calculateBackoff(attempt: number, config: WebhookRetryOptions): number {
    const delay =
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    // Add jitter (up to 10% of delay)
    const jitter = Math.random() * delay * 0.1;
    return Math.min(delay + jitter, config.maxDelayMs);
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate delivery prerequisites.
   */
  private validateDelivery(
    webhook: WebhookRegistration,
    event: WebhookEventPayload,
  ): string | null {
    // Check webhook status
    if (webhook.status !== "active") {
      return `Webhook is ${webhook.status}`;
    }

    // Check URL
    if (!webhook.url) {
      return "Webhook URL is empty";
    }

    // SSRF protection
    if (this.isBlockedUrl(webhook.url)) {
      return "Webhook URL is blocked (SSRF protection)";
    }

    // Payload size check
    const payloadSize = JSON.stringify(event).length;
    if (payloadSize > this.config.maxPayloadSize) {
      return `Payload size (${payloadSize} bytes) exceeds maximum (${this.config.maxPayloadSize} bytes)`;
    }

    // Event filter check
    if (webhook.events && webhook.events.length > 0) {
      if (!webhook.events.includes(event.event)) {
        return `Event type "${event.event}" not in webhook subscription list`;
      }
    }

    return null;
  }

  /**
   * Check if a URL is blocked by SSRF protection patterns.
   */
  isBlockedUrl(url: string): boolean {
    return this.config.blockedUrlPatterns.some((pattern) => pattern.test(url));
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Create a failed delivery record without attempting delivery.
   */
  private createFailedDelivery(
    webhook: WebhookRegistration,
    event: WebhookEventPayload,
    error: string,
  ): WebhookDeliveryRecord {
    const record: WebhookDeliveryRecord = {
      id: generateDeliveryId(),
      webhookId: webhook.id,
      event: event.event,
      status: "failed",
      payload: JSON.stringify(event),
      signature: "",
      url: webhook.url,
      headers: {},
      attempts: [
        {
          attemptNumber: 1,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error,
          durationMs: 0,
        },
      ],
      currentAttempt: 1,
      maxAttempts: 1,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      idempotencyKey: event.idempotencyKey,
    };

    this.deliveries.set(record.id, record);
    return record;
  }

  // ==========================================================================
  // DELIVERY QUERIES
  // ==========================================================================

  /**
   * Get a delivery record by ID.
   */
  getDelivery(id: string): WebhookDeliveryRecord | undefined {
    return this.deliveries.get(id);
  }

  /**
   * List delivery records for a webhook.
   */
  listDeliveries(webhookId?: string): WebhookDeliveryRecord[] {
    const all = Array.from(this.deliveries.values());
    if (webhookId) {
      return all.filter((d) => d.webhookId === webhookId);
    }
    return all;
  }

  /**
   * Get the circuit breaker instance.
   */
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Get the dead letter queue instance.
   */
  getDeadLetterQueue(): DeadLetterQueue {
    return this.deadLetterQueue;
  }

  /**
   * Replay a dead letter entry.
   */
  async replayDeadLetter(
    entryId: string,
    webhook: WebhookRegistration,
  ): Promise<WebhookDeliveryRecord | null> {
    const entry = this.deadLetterQueue.get(entryId);
    if (!entry) {
      return null;
    }

    // Parse the original payload
    const event: WebhookEventPayload = JSON.parse(entry.delivery.payload);

    // Generate new idempotency key for replay
    event.idempotencyKey = `replay_${entry.id}_${Date.now()}`;

    // Deliver with fresh state
    const result = await this.deliver(webhook, event);

    if (result.status === "delivered") {
      this.deadLetterQueue.markReplayed(entryId);
    }

    return result;
  }

  /**
   * Clear all delivery records.
   */
  clear(): void {
    this.deliveries.clear();
    this.activeDeliveries.clear();
    this.circuitBreaker.clear();
    this.deadLetterQueue.clear();
  }
}
