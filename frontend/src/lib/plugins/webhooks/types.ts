/**
 * Webhook Framework Types
 *
 * Type definitions for the nChat webhook system supporting both
 * incoming webhooks (external services -> nChat) and outgoing webhooks
 * (nChat events -> external URLs). Includes configuration for retries,
 * signatures, delivery tracking, and dead letter queue.
 */

// Re-export commonly used types from the main webhook types
export type {
  WebhookDirection,
  WebhookStatus,
  WebhookEventType,
  WebhookAuthMethod,
  WebhookFilters,
  WebhookAuth,
  WebhookRateLimit,
  WebhookRetryConfig,
  WebhookDeliveryStatus,
  IncomingWebhookPayload,
  IncomingWebhookAttachment,
  IncomingWebhookEmbed,
} from "@/types/webhook";

export { DefaultWebhookRetryConfig } from "@/types/webhook";

// ============================================================================
// WEBHOOK REGISTRATION
// ============================================================================

/**
 * Registered webhook configuration. Represents a webhook that has been
 * created and is ready to send or receive events.
 */
export interface WebhookRegistration {
  /** Unique webhook ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Webhook direction */
  direction: "incoming" | "outgoing";
  /** Current status */
  status: "active" | "paused" | "disabled" | "error";
  /** Target URL (outgoing) or generated endpoint (incoming) */
  url: string;
  /** Secret for HMAC signature verification */
  secret: string;
  /** Channel ID (required for incoming webhooks) */
  channelId?: string;
  /** Events to subscribe to (outgoing webhooks) */
  events?: string[];
  /** Event filters */
  filters?: WebhookEventFilter;
  /** Custom HTTP headers for outgoing requests */
  headers?: Record<string, string>;
  /** Avatar URL (incoming webhooks) */
  avatarUrl?: string;
  /** Default username (incoming webhooks) */
  defaultUsername?: string;
  /** Token for incoming webhook authentication */
  token?: string;
  /** Who created this webhook */
  createdBy: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Last triggered timestamp (ISO 8601) */
  lastTriggeredAt?: string;
  /** Total delivery count */
  deliveryCount: number;
  /** Failed delivery count */
  failedDeliveryCount: number;
  /** Retry configuration */
  retryConfig: WebhookRetryOptions;
  /** Rate limit configuration */
  rateLimit?: WebhookRateLimitConfig;
}

// ============================================================================
// EVENT FILTERING
// ============================================================================

/**
 * Event filter for outgoing webhooks.
 */
export interface WebhookEventFilter {
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Filter by user IDs */
  userIds?: string[];
  /** Filter by content pattern (regex) */
  contentPattern?: string;
  /** Only events with mentions */
  hasMentions?: boolean;
  /** Only events with attachments */
  hasAttachments?: boolean;
  /** Exclude bot-generated events */
  excludeBots?: boolean;
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

/**
 * Retry configuration for webhook delivery.
 */
export interface WebhookRetryOptions {
  /** Whether retries are enabled */
  enabled: boolean;
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier (exponential) */
  backoffMultiplier: number;
  /** HTTP status codes that trigger a retry */
  retryableStatusCodes: number[];
}

/**
 * Default retry options.
 */
export const DEFAULT_RETRY_OPTIONS: WebhookRetryOptions = {
  enabled: true,
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 300_000, // 5 minutes
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limit configuration for webhooks.
 */
export interface WebhookRateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Burst allowance above base rate */
  burstAllowance?: number;
}

/**
 * Default rate limit for incoming webhooks.
 */
export const DEFAULT_INCOMING_RATE_LIMIT: WebhookRateLimitConfig = {
  maxRequests: 60,
  windowSeconds: 60,
  burstAllowance: 10,
};

// ============================================================================
// DELIVERY TRACKING
// ============================================================================

/**
 * A single delivery attempt record.
 */
export interface DeliveryAttempt {
  /** Attempt number (1-based) */
  attemptNumber: number;
  /** When this attempt started (ISO 8601) */
  startedAt: string;
  /** When this attempt completed (ISO 8601) */
  completedAt?: string;
  /** HTTP status code (if a response was received) */
  statusCode?: number;
  /** Response body (truncated if large) */
  responseBody?: string;
  /** Error message (if failed) */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Complete delivery record for a webhook event.
 */
export interface WebhookDeliveryRecord {
  /** Unique delivery ID */
  id: string;
  /** Webhook ID */
  webhookId: string;
  /** Event type */
  event: string;
  /** Current delivery status */
  status:
    | "pending"
    | "delivering"
    | "delivered"
    | "retrying"
    | "failed"
    | "dead_letter";
  /** Payload that was sent */
  payload: string;
  /** Signature sent with the payload */
  signature: string;
  /** Request URL */
  url: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Delivery attempts */
  attempts: DeliveryAttempt[];
  /** Current attempt number */
  currentAttempt: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** When the delivery was created (ISO 8601) */
  createdAt: string;
  /** When the delivery completed or was moved to dead letter (ISO 8601) */
  completedAt?: string;
  /** Next retry time (ISO 8601) */
  nextRetryAt?: string;
  /** Idempotency key for dedup */
  idempotencyKey: string;
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

/**
 * Dead letter queue entry for permanently failed deliveries.
 */
export interface DeadLetterEntry {
  /** Dead letter entry ID */
  id: string;
  /** Original delivery record */
  delivery: WebhookDeliveryRecord;
  /** Reason for dead-lettering */
  reason: string;
  /** When it was dead-lettered (ISO 8601) */
  deadLetteredAt: string;
  /** Whether it has been manually replayed */
  replayed: boolean;
  /** Replay attempt timestamp (ISO 8601) */
  replayedAt?: string;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker state for webhook endpoints.
 */
export type CircuitBreakerState = "closed" | "open" | "half_open";

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before moving from open to half-open */
  resetTimeoutMs: number;
  /** Number of successes in half-open before closing */
  successThreshold: number;
}

/**
 * Default circuit breaker configuration.
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60_000, // 1 minute
  successThreshold: 2,
};

/**
 * Circuit breaker status tracking.
 */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  nextAttemptAt?: string;
}

// ============================================================================
// SIGNATURE TYPES
// ============================================================================

/**
 * Supported signature algorithms.
 */
export type SignatureAlgorithm = "sha256" | "sha512";

/**
 * Signature verification result.
 */
export interface SignatureVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Replay protection result.
 */
export interface ReplayProtectionResult {
  /** Whether the request is allowed (not a replay) */
  allowed: boolean;
  /** Reason if blocked */
  reason?: string;
}

// ============================================================================
// INCOMING WEBHOOK PROCESSING
// ============================================================================

/**
 * Result of processing an incoming webhook request.
 */
export interface IncomingWebhookResult {
  /** Whether the request was accepted */
  accepted: boolean;
  /** Message ID if a message was created */
  messageId?: string;
  /** Error message if rejected */
  error?: string;
  /** HTTP status code to return */
  statusCode: number;
}

/**
 * Incoming webhook request (from external service).
 */
export interface IncomingWebhookRequest {
  /** Webhook token from URL */
  token: string;
  /** Request body */
  body: unknown;
  /** Request headers */
  headers: Record<string, string>;
  /** Source IP address */
  sourceIp?: string;
  /** Request timestamp */
  timestamp: number;
}

// ============================================================================
// WEBHOOK MANAGEMENT INPUT TYPES
// ============================================================================

/**
 * Input for creating an incoming webhook.
 */
export interface CreateIncomingWebhookInput {
  name: string;
  description?: string;
  channelId: string;
  avatarUrl?: string;
  defaultUsername?: string;
}

/**
 * Input for creating an outgoing webhook.
 */
export interface CreateOutgoingWebhookInput {
  name: string;
  description?: string;
  url: string;
  events: string[];
  filters?: WebhookEventFilter;
  headers?: Record<string, string>;
  retryConfig?: Partial<WebhookRetryOptions>;
  rateLimit?: WebhookRateLimitConfig;
}

/**
 * Input for updating a webhook.
 */
export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  status?: "active" | "paused" | "disabled";
  events?: string[];
  filters?: WebhookEventFilter;
  headers?: Record<string, string>;
  avatarUrl?: string;
  defaultUsername?: string;
  retryConfig?: Partial<WebhookRetryOptions>;
  rateLimit?: WebhookRateLimitConfig;
}

// ============================================================================
// WEBHOOK EVENT PAYLOAD
// ============================================================================

/**
 * Outgoing webhook event payload.
 */
export interface WebhookEventPayload {
  /** Unique payload ID */
  id: string;
  /** Event type (e.g., 'message.created') */
  event: string;
  /** Webhook ID */
  webhookId: string;
  /** Timestamp (ISO 8601) */
  timestamp: string;
  /** Payload version */
  version: string;
  /** Idempotency key for dedup */
  idempotencyKey: string;
  /** Event data */
  data: Record<string, unknown>;
}
