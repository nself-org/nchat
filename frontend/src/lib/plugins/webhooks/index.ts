/**
 * Webhook Framework
 *
 * Complete webhook system for nChat supporting incoming webhooks
 * (external services -> nChat) and outgoing webhooks (nChat events -> external URLs).
 *
 * Features:
 * - HMAC-SHA256/SHA512 signatures with timing-safe comparison
 * - Replay protection (timestamp validation, nonce tracking, idempotency keys)
 * - Exponential backoff retry with configurable parameters
 * - Circuit breaker pattern for failing endpoints
 * - Dead letter queue for permanently failed deliveries
 * - Incoming webhook rate limiting
 * - SSRF protection for outgoing URLs
 * - Webhook CRUD with event subscription management
 */

// Types
export type {
  WebhookRegistration,
  WebhookEventFilter,
  WebhookRetryOptions,
  WebhookRateLimitConfig,
  WebhookDeliveryRecord,
  DeliveryAttempt,
  DeadLetterEntry,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitBreakerState,
  SignatureAlgorithm,
  SignatureVerificationResult,
  ReplayProtectionResult,
  IncomingWebhookResult,
  IncomingWebhookRequest,
  CreateIncomingWebhookInput,
  CreateOutgoingWebhookInput,
  UpdateWebhookInput,
  WebhookEventPayload,
} from "./types";

export {
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_INCOMING_RATE_LIMIT,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "./types";

// Signature & Replay Protection
export {
  generateSignature,
  generateCompositeSignature,
  generateNonce,
  verifySignature,
  verifyCompositeSignature,
  timingSafeEqual,
  validateTimestamp,
  parseTimestampHeader,
  NonceTracker,
  ReplayProtector,
  createSigningHeaders,
  verifyWebhookRequest,
  SIGNATURE_HEADERS,
  DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
} from "./signature";

// Delivery Engine
export {
  WebhookDeliveryEngine,
  CircuitBreaker,
  DeadLetterQueue,
  generateDeliveryId,
  MAX_PAYLOAD_SIZE,
  WEBHOOK_USER_AGENT,
} from "./delivery";

export type { WebhookFetchFunction, DeliveryEngineConfig } from "./delivery";

// Incoming Webhook Processing
export {
  IncomingWebhookProcessor,
  IncomingRateLimiter,
  validateIncomingPayload,
  MAX_INCOMING_PAYLOAD_SIZE,
  MAX_CONTENT_LENGTH,
  MAX_EMBEDS,
  MAX_ATTACHMENTS,
} from "./incoming";

export type { NormalizedIncomingPayload, MessageCreatorFn } from "./incoming";

// Registry
export {
  WebhookRegistry,
  WebhookStore,
  generateWebhookId,
  generateWebhookSecret,
  generateWebhookToken,
} from "./registry";

export type {
  WebhookRegistryEventType,
  WebhookRegistryListener,
} from "./registry";
