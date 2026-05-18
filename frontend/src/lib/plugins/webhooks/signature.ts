/**
 * Webhook Signature & Replay Protection
 *
 * Provides HMAC signature generation and verification with timing-safe
 * comparison, timestamp validation, nonce tracking, and replay protection.
 *
 * Security features:
 * - HMAC-SHA256 and HMAC-SHA512 signatures
 * - Timing-safe comparison (prevents timing attacks)
 * - Timestamp window validation (prevents replay attacks)
 * - Nonce tracking with TTL (prevents duplicate deliveries)
 * - Composite signing (timestamp + payload for Slack-style signatures)
 */

import type {
  SignatureAlgorithm,
  SignatureVerificationResult,
  ReplayProtectionResult,
} from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default timestamp tolerance in seconds */
export const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

/** Default nonce TTL in milliseconds */
export const DEFAULT_NONCE_TTL_MS = 600_000; // 10 minutes

/** Maximum nonce cache size before cleanup */
export const MAX_NONCE_CACHE_SIZE = 10_000;

/** Signature header names */
export const SIGNATURE_HEADERS = {
  SIGNATURE: "x-webhook-signature",
  TIMESTAMP: "x-webhook-timestamp",
  NONCE: "x-webhook-nonce",
  DELIVERY_ID: "x-delivery-id",
  EVENT_TYPE: "x-event-type",
} as const;

// ============================================================================
// SIGNATURE GENERATION
// ============================================================================

/**
 * Generate HMAC signature for a payload using Node.js crypto.
 *
 * @param payload - The raw payload string to sign
 * @param secret - The shared secret key
 * @param algorithm - 'sha256' or 'sha512' (default: 'sha256')
 * @returns Signature string in format "algorithm=hexdigest"
 */
export function generateSignature(
  payload: string,
  secret: string,
  algorithm: SignatureAlgorithm = "sha256",
): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");
  const hmac = nodeCrypto.createHmac(algorithm, secret);
  hmac.update(payload);
  return `${algorithm}=${hmac.digest("hex")}`;
}

/**
 * Generate a composite signature that includes the timestamp.
 * This is similar to Slack's v0 signing approach:
 * signature = HMAC(secret, "v0:{timestamp}:{payload}")
 *
 * @param payload - The raw payload string
 * @param secret - The shared secret key
 * @param timestamp - Unix timestamp in seconds
 * @param algorithm - Signature algorithm
 * @returns Composite signature string
 */
export function generateCompositeSignature(
  payload: string,
  secret: string,
  timestamp: number,
  algorithm: SignatureAlgorithm = "sha256",
): string {
  const sigBase = `v0:${timestamp}:${payload}`;
  return generateSignature(sigBase, secret, algorithm);
}

/**
 * Generate a nonce (unique value for replay protection).
 * Uses crypto.randomUUID when available, falls back to random hex.
 */
export function generateNonce(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return nodeCrypto.randomUUID();
  } catch {
    // Fallback
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify an HMAC signature using timing-safe comparison.
 *
 * @param payload - The raw payload string
 * @param signature - The signature to verify (format: "algorithm=hexdigest")
 * @param secret - The shared secret key
 * @param algorithm - Expected signature algorithm
 * @returns Verification result
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: SignatureAlgorithm = "sha256",
): SignatureVerificationResult {
  if (!signature) {
    return { valid: false, error: "Missing signature" };
  }

  const prefix = `${algorithm}=`;
  if (!signature.startsWith(prefix)) {
    return {
      valid: false,
      error: `Invalid signature format: expected prefix "${prefix}"`,
    };
  }

  const expected = generateSignature(payload, secret, algorithm);

  // Use timing-safe comparison
  const isValid = timingSafeEqual(signature, expected);

  if (!isValid) {
    return { valid: false, error: "Signature mismatch" };
  }

  return { valid: true };
}

/**
 * Verify a composite signature (timestamp-based).
 */
export function verifyCompositeSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  algorithm: SignatureAlgorithm = "sha256",
): SignatureVerificationResult {
  if (!signature) {
    return { valid: false, error: "Missing signature" };
  }

  const expected = generateCompositeSignature(
    payload,
    secret,
    timestamp,
    algorithm,
  );
  const isValid = timingSafeEqual(signature, expected);

  if (!isValid) {
    return { valid: false, error: "Composite signature mismatch" };
  }

  return { valid: true };
}

/**
 * Timing-safe string comparison using Node.js crypto.timingSafeEqual.
 * Falls back to constant-time XOR comparison if Node.js crypto unavailable.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return nodeCrypto.timingSafeEqual(
      Buffer.from(a, "utf-8"),
      Buffer.from(b, "utf-8"),
    );
  } catch {
    // Fallback: constant-time XOR comparison
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

// ============================================================================
// TIMESTAMP VALIDATION
// ============================================================================

/**
 * Validate a webhook timestamp to prevent replay attacks.
 *
 * @param timestamp - Unix timestamp in seconds
 * @param toleranceSeconds - Maximum allowed age/drift in seconds
 * @returns Whether the timestamp is within the acceptable window
 */
export function validateTimestamp(
  timestamp: number,
  toleranceSeconds: number = DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
): boolean {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const drift = Math.abs(nowSeconds - timestamp);
  return drift <= toleranceSeconds;
}

/**
 * Parse a timestamp header value.
 *
 * @param value - Header value (string containing a Unix timestamp in seconds)
 * @returns Parsed timestamp or null if invalid
 */
export function parseTimestampHeader(
  value: string | undefined | null,
): number | null {
  if (!value) {
    return null;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// ============================================================================
// NONCE / REPLAY PROTECTION
// ============================================================================

/**
 * In-memory nonce tracker for replay protection.
 * Tracks seen nonces with TTL-based expiration.
 */
export class NonceTracker {
  private seenNonces: Map<string, number> = new Map();
  private ttlMs: number;
  private maxSize: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    ttlMs: number = DEFAULT_NONCE_TTL_MS,
    maxSize: number = MAX_NONCE_CACHE_SIZE,
  ) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  /**
   * Start periodic cleanup of expired nonces.
   */
  startCleanup(intervalMs: number = 60_000): void {
    this.stopCleanup();
    this.cleanupInterval = setInterval(() => this.cleanup(), intervalMs);
  }

  /**
   * Stop periodic cleanup.
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check if a nonce has been seen. If not, mark it as seen.
   * Returns true if the nonce is new (not a replay), false if it's a duplicate.
   */
  checkAndMark(nonce: string): boolean {
    // Cleanup if we're at capacity
    if (this.seenNonces.size >= this.maxSize) {
      this.cleanup();
    }

    const now = Date.now();
    const seenAt = this.seenNonces.get(nonce);

    if (seenAt !== undefined) {
      // Nonce was seen before - check if it's still within TTL
      if (now - seenAt < this.ttlMs) {
        return false; // Duplicate (replay)
      }
      // Expired nonce, allow reuse
    }

    this.seenNonces.set(nonce, now);
    return true; // New nonce
  }

  /**
   * Check if a nonce has been seen (without marking it).
   */
  hasSeen(nonce: string): boolean {
    const seenAt = this.seenNonces.get(nonce);
    if (seenAt === undefined) {
      return false;
    }
    // Check TTL
    if (Date.now() - seenAt >= this.ttlMs) {
      this.seenNonces.delete(nonce);
      return false;
    }
    return true;
  }

  /**
   * Remove expired nonces from the cache.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [nonce, seenAt] of this.seenNonces.entries()) {
      if (now - seenAt >= this.ttlMs) {
        this.seenNonces.delete(nonce);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get the number of tracked nonces.
   */
  get size(): number {
    return this.seenNonces.size;
  }

  /**
   * Clear all tracked nonces.
   */
  clear(): void {
    this.seenNonces.clear();
  }

  /**
   * Destroy the tracker and clean up resources.
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// ============================================================================
// COMBINED REPLAY PROTECTION
// ============================================================================

/**
 * Configuration for replay protection.
 */
export interface ReplayProtectionConfig {
  /** Whether to validate timestamps */
  validateTimestamps: boolean;
  /** Timestamp tolerance in seconds */
  timestampToleranceSeconds: number;
  /** Whether to track nonces */
  trackNonces: boolean;
  /** Nonce TTL in milliseconds */
  nonceTtlMs: number;
  /** Whether to check idempotency keys */
  checkIdempotencyKeys: boolean;
}

/**
 * Default replay protection configuration.
 */
export const DEFAULT_REPLAY_PROTECTION_CONFIG: ReplayProtectionConfig = {
  validateTimestamps: true,
  timestampToleranceSeconds: DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
  trackNonces: true,
  nonceTtlMs: DEFAULT_NONCE_TTL_MS,
  checkIdempotencyKeys: true,
};

/**
 * Comprehensive replay protection checker.
 * Combines timestamp validation, nonce tracking, and idempotency key checking.
 */
export class ReplayProtector {
  private nonceTracker: NonceTracker;
  private idempotencyKeys: Map<string, number> = new Map();
  private config: ReplayProtectionConfig;

  constructor(config: Partial<ReplayProtectionConfig> = {}) {
    this.config = { ...DEFAULT_REPLAY_PROTECTION_CONFIG, ...config };
    this.nonceTracker = new NonceTracker(this.config.nonceTtlMs);
  }

  /**
   * Check if a request is a replay.
   *
   * @param timestamp - Unix timestamp in seconds (from header)
   * @param nonce - Unique nonce value (from header)
   * @param idempotencyKey - Idempotency key (from payload)
   * @returns Protection result indicating if the request is allowed
   */
  check(
    timestamp?: number,
    nonce?: string,
    idempotencyKey?: string,
  ): ReplayProtectionResult {
    // 1. Timestamp validation
    if (this.config.validateTimestamps && timestamp !== undefined) {
      if (
        !validateTimestamp(timestamp, this.config.timestampToleranceSeconds)
      ) {
        return {
          allowed: false,
          reason: `Timestamp outside acceptable window (${this.config.timestampToleranceSeconds}s tolerance)`,
        };
      }
    }

    // 2. Nonce tracking
    if (this.config.trackNonces && nonce) {
      if (!this.nonceTracker.checkAndMark(nonce)) {
        return {
          allowed: false,
          reason: "Duplicate nonce detected (replay)",
        };
      }
    }

    // 3. Idempotency key check
    if (this.config.checkIdempotencyKeys && idempotencyKey) {
      const now = Date.now();
      const seenAt = this.idempotencyKeys.get(idempotencyKey);
      if (seenAt !== undefined && now - seenAt < this.config.nonceTtlMs) {
        return {
          allowed: false,
          reason: "Duplicate idempotency key detected",
        };
      }
      this.idempotencyKeys.set(idempotencyKey, now);

      // Cleanup old keys
      if (this.idempotencyKeys.size > MAX_NONCE_CACHE_SIZE) {
        this.cleanupIdempotencyKeys();
      }
    }

    return { allowed: true };
  }

  /**
   * Clean up expired idempotency keys.
   */
  private cleanupIdempotencyKeys(): void {
    const now = Date.now();
    for (const [key, seenAt] of this.idempotencyKeys.entries()) {
      if (now - seenAt >= this.config.nonceTtlMs) {
        this.idempotencyKeys.delete(key);
      }
    }
  }

  /**
   * Get statistics about the replay protector.
   */
  getStats(): { trackedNonces: number; trackedIdempotencyKeys: number } {
    return {
      trackedNonces: this.nonceTracker.size,
      trackedIdempotencyKeys: this.idempotencyKeys.size,
    };
  }

  /**
   * Reset all tracked state.
   */
  reset(): void {
    this.nonceTracker.clear();
    this.idempotencyKeys.clear();
  }

  /**
   * Destroy and clean up.
   */
  destroy(): void {
    this.nonceTracker.destroy();
    this.idempotencyKeys.clear();
  }
}

// ============================================================================
// WEBHOOK SIGNING HELPERS
// ============================================================================

/**
 * Create the complete set of signing headers for an outgoing webhook request.
 *
 * @param payload - The payload string
 * @param secret - The webhook secret
 * @param algorithm - Signature algorithm
 * @returns Headers object to include in the request
 */
export function createSigningHeaders(
  payload: string,
  secret: string,
  algorithm: SignatureAlgorithm = "sha256",
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const signature = generateCompositeSignature(
    payload,
    secret,
    timestamp,
    algorithm,
  );

  return {
    [SIGNATURE_HEADERS.SIGNATURE]: signature,
    [SIGNATURE_HEADERS.TIMESTAMP]: String(timestamp),
    [SIGNATURE_HEADERS.NONCE]: nonce,
  };
}

/**
 * Verify a complete webhook request (signature + timestamp + nonce).
 *
 * @param payload - The raw payload string
 * @param headers - Request headers
 * @param secret - The webhook secret
 * @param replayProtector - Optional replay protector instance
 * @param algorithm - Expected signature algorithm
 * @returns Verification result
 */
export function verifyWebhookRequest(
  payload: string,
  headers: Record<string, string>,
  secret: string,
  replayProtector?: ReplayProtector,
  algorithm: SignatureAlgorithm = "sha256",
): SignatureVerificationResult {
  // Extract headers (case-insensitive lookup)
  const getHeader = (name: string): string | undefined => {
    return (
      headers[name] ||
      headers[name.toLowerCase()] ||
      headers[name.toUpperCase()]
    );
  };

  const signature = getHeader(SIGNATURE_HEADERS.SIGNATURE);
  const timestampStr = getHeader(SIGNATURE_HEADERS.TIMESTAMP);
  const nonce = getHeader(SIGNATURE_HEADERS.NONCE);

  // 1. Verify signature
  if (!signature) {
    return { valid: false, error: "Missing signature header" };
  }

  const timestamp = parseTimestampHeader(timestampStr);
  if (timestamp === null) {
    return { valid: false, error: "Missing or invalid timestamp header" };
  }

  // Verify composite signature (includes timestamp)
  const sigResult = verifyCompositeSignature(
    payload,
    signature,
    secret,
    timestamp,
    algorithm,
  );
  if (!sigResult.valid) {
    return sigResult;
  }

  // 2. Replay protection
  if (replayProtector) {
    const replayResult = replayProtector.check(timestamp, nonce || undefined);
    if (!replayResult.allowed) {
      return { valid: false, error: replayResult.reason };
    }
  }

  return { valid: true };
}
