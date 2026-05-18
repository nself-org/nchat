/**
 * Webhook Framework Comprehensive Tests
 *
 * Tests for the complete webhook system covering:
 * - Signature generation and verification (HMAC-SHA256, timing-safe)
 * - Replay protection (nonce, timestamp window, duplicate detection)
 * - Outgoing delivery (success, retry, backoff, circuit breaker, dead letter)
 * - Incoming processing (payload validation, rate limiting, routing)
 * - Webhook management (CRUD, enable/disable, event filtering)
 * - Edge cases (concurrent deliveries, payload size limits)
 * - Security (signature bypass, SSRF prevention)
 *
 * Target: 120+ tests
 */

import {
  // Signature
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
  // Delivery
  WebhookDeliveryEngine,
  CircuitBreaker,
  DeadLetterQueue,
  generateDeliveryId,
  MAX_PAYLOAD_SIZE,
  WEBHOOK_USER_AGENT,
  // Incoming
  IncomingWebhookProcessor,
  IncomingRateLimiter,
  validateIncomingPayload,
  MAX_INCOMING_PAYLOAD_SIZE,
  MAX_CONTENT_LENGTH,
  MAX_EMBEDS,
  MAX_ATTACHMENTS,
  // Registry
  WebhookRegistry,
  WebhookStore,
  generateWebhookId,
  generateWebhookSecret,
  generateWebhookToken,
  // Types
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_INCOMING_RATE_LIMIT,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "../index";

import type {
  WebhookRegistration,
  WebhookEventPayload,
  WebhookFetchFunction,
  WebhookDeliveryRecord,
  SignatureVerificationResult,
  IncomingWebhookRequest,
  MessageCreatorFn,
} from "../index";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockWebhook(
  overrides: Partial<WebhookRegistration> = {},
): WebhookRegistration {
  return {
    id: "wh_test_1",
    name: "Test Webhook",
    direction: "outgoing",
    status: "active",
    url: "https://example.com/webhook",
    secret: "test_secret_key_123",
    events: ["message.created"],
    createdBy: "user_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deliveryCount: 0,
    failedDeliveryCount: 0,
    retryConfig: { ...DEFAULT_RETRY_OPTIONS },
    ...overrides,
  };
}

function createMockEvent(
  overrides: Partial<WebhookEventPayload> = {},
): WebhookEventPayload {
  return {
    id: "evt_test_1",
    event: "message.created",
    webhookId: "wh_test_1",
    timestamp: new Date().toISOString(),
    version: "1.0",
    idempotencyKey: "idem_test_1",
    data: { message: { content: "Hello world" } },
    ...overrides,
  };
}

function createSuccessFetch(): WebhookFetchFunction {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve('{"ok":true}'),
  });
}

function createFailureFetch(status: number = 500): WebhookFetchFunction {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: "Internal Server Error",
    text: () => Promise.resolve('{"error":"fail"}'),
  });
}

function createNetworkErrorFetch(): WebhookFetchFunction {
  return jest.fn().mockRejectedValue(new Error("Network error"));
}

function createTimeoutErrorFetch(): WebhookFetchFunction {
  const error = new Error("Timeout");
  error.name = "AbortError";
  return jest.fn().mockRejectedValue(error);
}

function noOpSleep(): (ms: number) => Promise<void> {
  return () => Promise.resolve();
}

// ============================================================================
// SECTION 1: SIGNATURE GENERATION AND VERIFICATION
// ============================================================================

describe("Webhook Signature System", () => {
  describe("generateSignature", () => {
    it("should generate a valid SHA-256 signature", () => {
      const sig = generateSignature("test payload", "secret");
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("should generate a valid SHA-512 signature", () => {
      const sig = generateSignature("test payload", "secret", "sha512");
      expect(sig).toMatch(/^sha512=[a-f0-9]{128}$/);
    });

    it("should produce deterministic output for the same inputs", () => {
      const sig1 = generateSignature("hello", "key");
      const sig2 = generateSignature("hello", "key");
      expect(sig1).toBe(sig2);
    });

    it("should produce different output for different payloads", () => {
      const sig1 = generateSignature("payload1", "key");
      const sig2 = generateSignature("payload2", "key");
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different output for different secrets", () => {
      const sig1 = generateSignature("payload", "key1");
      const sig2 = generateSignature("payload", "key2");
      expect(sig1).not.toBe(sig2);
    });

    it("should handle empty payload", () => {
      const sig = generateSignature("", "secret");
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("should handle unicode payload", () => {
      const sig = generateSignature('{"text":"Hello! \u{1F600}"}', "secret");
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("should handle large payload", () => {
      const largePay = "x".repeat(100_000);
      const sig = generateSignature(largePay, "secret");
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe("generateCompositeSignature", () => {
    it("should generate a composite signature including the timestamp", () => {
      const sig = generateCompositeSignature("payload", "secret", 1700000000);
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("should produce different signatures for different timestamps", () => {
      const sig1 = generateCompositeSignature("payload", "secret", 1700000000);
      const sig2 = generateCompositeSignature("payload", "secret", 1700000001);
      expect(sig1).not.toBe(sig2);
    });

    it("should produce deterministic results for same inputs", () => {
      const sig1 = generateCompositeSignature("p", "s", 100);
      const sig2 = generateCompositeSignature("p", "s", 100);
      expect(sig1).toBe(sig2);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", () => {
      const payload = "test payload";
      const secret = "my_secret";
      const sig = generateSignature(payload, secret);
      const result = verifySignature(payload, sig, secret);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject a tampered signature", () => {
      const sig = generateSignature("original", "secret");
      const result = verifySignature("tampered", sig, "secret");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Signature mismatch");
    });

    it("should reject a wrong secret", () => {
      const sig = generateSignature("payload", "correct_secret");
      const result = verifySignature("payload", sig, "wrong_secret");
      expect(result.valid).toBe(false);
    });

    it("should reject missing signature", () => {
      const result = verifySignature("payload", "", "secret");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing signature");
    });

    it("should reject wrong prefix format", () => {
      const result = verifySignature("payload", "invalid=abc", "secret");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid signature format");
    });

    it("should verify SHA-512 signatures", () => {
      const sig = generateSignature("payload", "secret", "sha512");
      const result = verifySignature("payload", sig, "secret", "sha512");
      expect(result.valid).toBe(true);
    });

    it("should reject SHA-256 sig when SHA-512 expected", () => {
      const sig = generateSignature("payload", "secret", "sha256");
      const result = verifySignature("payload", sig, "secret", "sha512");
      expect(result.valid).toBe(false);
    });
  });

  describe("verifyCompositeSignature", () => {
    it("should verify a valid composite signature", () => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = generateCompositeSignature("payload", "secret", ts);
      const result = verifyCompositeSignature("payload", sig, "secret", ts);
      expect(result.valid).toBe(true);
    });

    it("should reject composite signature with wrong timestamp", () => {
      const sig = generateCompositeSignature("payload", "secret", 100);
      const result = verifyCompositeSignature("payload", sig, "secret", 200);
      expect(result.valid).toBe(false);
    });

    it("should reject missing composite signature", () => {
      const result = verifyCompositeSignature("payload", "", "secret", 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing signature");
    });
  });

  describe("timingSafeEqual", () => {
    it("should return true for equal strings", () => {
      expect(timingSafeEqual("hello", "hello")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(timingSafeEqual("hello", "world")).toBe(false);
    });

    it("should return false for different length strings", () => {
      expect(timingSafeEqual("short", "longer_string")).toBe(false);
    });

    it("should return true for empty strings", () => {
      expect(timingSafeEqual("", "")).toBe(true);
    });
  });

  describe("generateNonce", () => {
    it("should generate a non-empty string", () => {
      const nonce = generateNonce();
      expect(nonce.length).toBeGreaterThan(0);
    });

    it("should generate unique nonces", () => {
      const nonces = new Set(
        Array.from({ length: 100 }, () => generateNonce()),
      );
      expect(nonces.size).toBe(100);
    });
  });
});

// ============================================================================
// SECTION 2: TIMESTAMP VALIDATION
// ============================================================================

describe("Timestamp Validation", () => {
  describe("validateTimestamp", () => {
    it("should accept current timestamp", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateTimestamp(now)).toBe(true);
    });

    it("should accept timestamp within tolerance", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateTimestamp(now - 100)).toBe(true); // 100s ago
    });

    it("should reject timestamp outside tolerance", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateTimestamp(now - 600)).toBe(false); // 10 min ago (> 5 min default)
    });

    it("should reject future timestamp outside tolerance", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateTimestamp(now + 600)).toBe(false);
    });

    it("should handle custom tolerance", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateTimestamp(now - 50, 60)).toBe(true); // 50s ago, 60s tolerance
      expect(validateTimestamp(now - 70, 60)).toBe(false); // 70s ago, 60s tolerance
    });

    it("should reject zero timestamp", () => {
      expect(validateTimestamp(0)).toBe(false);
    });

    it("should reject negative timestamp", () => {
      expect(validateTimestamp(-1000)).toBe(false);
    });

    it("should reject NaN timestamp", () => {
      expect(validateTimestamp(NaN)).toBe(false);
    });

    it("should reject Infinity", () => {
      expect(validateTimestamp(Infinity)).toBe(false);
    });
  });

  describe("parseTimestampHeader", () => {
    it("should parse valid timestamp string", () => {
      expect(parseTimestampHeader("1700000000")).toBe(1700000000);
    });

    it("should return null for undefined", () => {
      expect(parseTimestampHeader(undefined)).toBeNull();
    });

    it("should return null for null", () => {
      expect(parseTimestampHeader(null)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseTimestampHeader("")).toBeNull();
    });

    it("should return null for non-numeric string", () => {
      expect(parseTimestampHeader("abc")).toBeNull();
    });

    it("should return null for zero", () => {
      expect(parseTimestampHeader("0")).toBeNull();
    });

    it("should return null for negative", () => {
      expect(parseTimestampHeader("-100")).toBeNull();
    });
  });
});

// ============================================================================
// SECTION 3: NONCE TRACKING AND REPLAY PROTECTION
// ============================================================================

describe("Replay Protection", () => {
  describe("NonceTracker", () => {
    let tracker: NonceTracker;

    beforeEach(() => {
      tracker = new NonceTracker(10_000); // 10s TTL for testing
    });

    afterEach(() => {
      tracker.destroy();
    });

    it("should accept new nonce", () => {
      expect(tracker.checkAndMark("nonce1")).toBe(true);
    });

    it("should reject duplicate nonce", () => {
      tracker.checkAndMark("nonce1");
      expect(tracker.checkAndMark("nonce1")).toBe(false);
    });

    it("should track multiple unique nonces", () => {
      expect(tracker.checkAndMark("a")).toBe(true);
      expect(tracker.checkAndMark("b")).toBe(true);
      expect(tracker.checkAndMark("c")).toBe(true);
      expect(tracker.size).toBe(3);
    });

    it("should report hasSeen correctly", () => {
      tracker.checkAndMark("x");
      expect(tracker.hasSeen("x")).toBe(true);
      expect(tracker.hasSeen("y")).toBe(false);
    });

    it("should cleanup expired nonces", () => {
      // Use a very short TTL tracker
      const shortTracker = new NonceTracker(1); // 1ms TTL
      shortTracker.checkAndMark("old1");
      shortTracker.checkAndMark("old2");

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        /* busy wait 5ms */
      }

      const removed = shortTracker.cleanup();
      expect(removed).toBe(2);
      expect(shortTracker.size).toBe(0);
      shortTracker.destroy();
    });

    it("should allow reuse of expired nonce", () => {
      const shortTracker = new NonceTracker(1); // 1ms TTL
      shortTracker.checkAndMark("reuse");

      const start = Date.now();
      while (Date.now() - start < 5) {
        /* busy wait */
      }

      // Should allow because it expired
      expect(shortTracker.checkAndMark("reuse")).toBe(true);
      shortTracker.destroy();
    });

    it("should clear all tracked nonces", () => {
      tracker.checkAndMark("a");
      tracker.checkAndMark("b");
      tracker.clear();
      expect(tracker.size).toBe(0);
      expect(tracker.checkAndMark("a")).toBe(true); // Can reuse after clear
    });

    it("should handle cleanup when at max capacity", () => {
      const smallTracker = new NonceTracker(1, 3); // 1ms TTL, max 3
      smallTracker.checkAndMark("a");
      smallTracker.checkAndMark("b");
      smallTracker.checkAndMark("c");

      const start = Date.now();
      while (Date.now() - start < 5) {
        /* busy wait */
      }

      // Should trigger cleanup and accept new nonce
      expect(smallTracker.checkAndMark("d")).toBe(true);
      smallTracker.destroy();
    });
  });

  describe("ReplayProtector", () => {
    let protector: ReplayProtector;

    beforeEach(() => {
      protector = new ReplayProtector({
        timestampToleranceSeconds: 300,
        nonceTtlMs: 60_000,
      });
    });

    afterEach(() => {
      protector.destroy();
    });

    it("should allow valid request with current timestamp", () => {
      const now = Math.floor(Date.now() / 1000);
      const result = protector.check(now, "nonce1", "key1");
      expect(result.allowed).toBe(true);
    });

    it("should reject expired timestamp", () => {
      const old = Math.floor(Date.now() / 1000) - 600; // 10 min ago
      const result = protector.check(old, "nonce1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Timestamp outside");
    });

    it("should reject duplicate nonce", () => {
      const now = Math.floor(Date.now() / 1000);
      protector.check(now, "dup_nonce");
      const result = protector.check(now, "dup_nonce");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Duplicate nonce");
    });

    it("should reject duplicate idempotency key", () => {
      const now = Math.floor(Date.now() / 1000);
      protector.check(now, "n1", "idem1");
      const result = protector.check(now, "n2", "idem1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Duplicate idempotency key");
    });

    it("should allow different idempotency keys", () => {
      const now = Math.floor(Date.now() / 1000);
      protector.check(now, "n1", "key1");
      const result = protector.check(now, "n2", "key2");
      expect(result.allowed).toBe(true);
    });

    it("should return stats", () => {
      const now = Math.floor(Date.now() / 1000);
      protector.check(now, "n1", "k1");
      protector.check(now, "n2", "k2");
      const stats = protector.getStats();
      expect(stats.trackedNonces).toBe(2);
      expect(stats.trackedIdempotencyKeys).toBe(2);
    });

    it("should reset all state", () => {
      const now = Math.floor(Date.now() / 1000);
      protector.check(now, "n1", "k1");
      protector.reset();
      const stats = protector.getStats();
      expect(stats.trackedNonces).toBe(0);
      expect(stats.trackedIdempotencyKeys).toBe(0);
    });

    it("should allow request without timestamp when validation disabled", () => {
      const noTimestamp = new ReplayProtector({ validateTimestamps: false });
      const result = noTimestamp.check(undefined, "nonce");
      expect(result.allowed).toBe(true);
      noTimestamp.destroy();
    });

    it("should allow request without nonce when tracking disabled", () => {
      const noNonce = new ReplayProtector({ trackNonces: false });
      const now = Math.floor(Date.now() / 1000);
      const result = noNonce.check(now);
      expect(result.allowed).toBe(true);
      noNonce.destroy();
    });
  });

  describe("createSigningHeaders + verifyWebhookRequest", () => {
    it("should create headers that pass verification", () => {
      const payload = '{"msg":"hello"}';
      const secret = "test_secret";
      const headers = createSigningHeaders(payload, secret);

      expect(headers[SIGNATURE_HEADERS.SIGNATURE]).toBeDefined();
      expect(headers[SIGNATURE_HEADERS.TIMESTAMP]).toBeDefined();
      expect(headers[SIGNATURE_HEADERS.NONCE]).toBeDefined();

      const result = verifyWebhookRequest(payload, headers, secret);
      expect(result.valid).toBe(true);
    });

    it("should reject tampered payload", () => {
      const headers = createSigningHeaders("original", "secret");
      const result = verifyWebhookRequest("tampered", headers, "secret");
      expect(result.valid).toBe(false);
    });

    it("should reject missing signature header", () => {
      const result = verifyWebhookRequest("payload", {}, "secret");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Missing signature");
    });

    it("should reject missing timestamp header", () => {
      const sig = generateSignature("payload", "secret");
      const result = verifyWebhookRequest(
        "payload",
        { [SIGNATURE_HEADERS.SIGNATURE]: sig },
        "secret",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("timestamp");
    });

    it("should use replay protector when provided", () => {
      const rp = new ReplayProtector();
      const payload = '{"test":true}';
      const secret = "sec";
      const headers = createSigningHeaders(payload, secret);

      // First request should pass
      const r1 = verifyWebhookRequest(payload, headers, secret, rp);
      expect(r1.valid).toBe(true);

      // Same nonce should be rejected
      const r2 = verifyWebhookRequest(payload, headers, secret, rp);
      expect(r2.valid).toBe(false);

      rp.destroy();
    });
  });
});

// ============================================================================
// SECTION 4: CIRCUIT BREAKER
// ============================================================================

describe("Circuit Breaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 100, // Short for testing
      successThreshold: 2,
    });
  });

  it("should start in closed state", () => {
    expect(cb.getState("wh1")).toBe("closed");
  });

  it("should allow delivery when closed", () => {
    expect(cb.canDeliver("wh1")).toBe(true);
  });

  it("should stay closed until failure threshold", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    expect(cb.getState("wh1")).toBe("closed");
    expect(cb.canDeliver("wh1")).toBe(true);
  });

  it("should open after reaching failure threshold", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    expect(cb.getState("wh1")).toBe("open");
  });

  it("should deny delivery when open", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    expect(cb.canDeliver("wh1")).toBe(false);
  });

  it("should transition to half-open after reset timeout", async () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    expect(cb.getState("wh1")).toBe("open");

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 150));

    // canDeliver should trigger transition to half_open
    expect(cb.canDeliver("wh1")).toBe(true);
    expect(cb.getState("wh1")).toBe("half_open");
  });

  it("should close after enough successes in half-open", async () => {
    // Open the circuit
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");

    // Wait for reset
    await new Promise((r) => setTimeout(r, 150));
    cb.canDeliver("wh1"); // Transition to half_open

    // Record successes
    cb.recordSuccess("wh1");
    cb.recordSuccess("wh1");
    expect(cb.getState("wh1")).toBe("closed");
  });

  it("should re-open on failure in half-open", async () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");

    await new Promise((r) => setTimeout(r, 150));
    cb.canDeliver("wh1"); // half_open

    cb.recordFailure("wh1");
    expect(cb.getState("wh1")).toBe("open");
  });

  it("should reset failure count on success in closed state", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordSuccess("wh1");

    // Should need 3 more failures to open
    const status = cb.getStatus("wh1");
    expect(status.failureCount).toBe(0);
  });

  it("should track independent state per webhook", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");

    expect(cb.getState("wh1")).toBe("open");
    expect(cb.getState("wh2")).toBe("closed");
    expect(cb.canDeliver("wh2")).toBe(true);
  });

  it("should reset a specific webhook", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.recordFailure("wh1");
    cb.reset("wh1");
    expect(cb.getState("wh1")).toBe("closed");
  });

  it("should clear all state", () => {
    cb.recordFailure("wh1");
    cb.recordFailure("wh2");
    cb.clear();
    expect(cb.getState("wh1")).toBe("closed");
    expect(cb.getState("wh2")).toBe("closed");
  });
});

// ============================================================================
// SECTION 5: DEAD LETTER QUEUE
// ============================================================================

describe("Dead Letter Queue", () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue(5); // Small max for testing
  });

  it("should enqueue a failed delivery", () => {
    const delivery: WebhookDeliveryRecord = {
      id: "del_1",
      webhookId: "wh_1",
      event: "message.created",
      status: "failed",
      payload: "{}",
      signature: "sig",
      url: "https://example.com",
      headers: {},
      attempts: [],
      currentAttempt: 3,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      idempotencyKey: "k1",
    };

    const entry = dlq.enqueue(delivery, "Max retries exceeded");
    expect(entry.id).toBe("dlq_del_1");
    expect(entry.reason).toBe("Max retries exceeded");
    expect(entry.replayed).toBe(false);
    expect(dlq.size).toBe(1);
  });

  it("should retrieve entry by ID", () => {
    const delivery = {
      id: "del_2",
      webhookId: "wh_1",
      event: "test",
      status: "failed" as const,
      payload: "{}",
      signature: "",
      url: "",
      headers: {},
      attempts: [],
      currentAttempt: 1,
      maxAttempts: 1,
      createdAt: new Date().toISOString(),
      idempotencyKey: "k",
    };
    dlq.enqueue(delivery, "test");
    const entry = dlq.get("dlq_del_2");
    expect(entry).toBeDefined();
    expect(entry!.delivery.webhookId).toBe("wh_1");
  });

  it("should return undefined for non-existent ID", () => {
    expect(dlq.get("nonexistent")).toBeUndefined();
  });

  it("should list entries filtered by webhookId", () => {
    const makeDelivery = (id: string, whId: string) => ({
      id,
      webhookId: whId,
      event: "test",
      status: "failed" as const,
      payload: "{}",
      signature: "",
      url: "",
      headers: {},
      attempts: [],
      currentAttempt: 1,
      maxAttempts: 1,
      createdAt: new Date().toISOString(),
      idempotencyKey: "k",
    });

    dlq.enqueue(makeDelivery("d1", "wh_1"), "fail");
    dlq.enqueue(makeDelivery("d2", "wh_2"), "fail");
    dlq.enqueue(makeDelivery("d3", "wh_1"), "fail");

    expect(dlq.list("wh_1")).toHaveLength(2);
    expect(dlq.list("wh_2")).toHaveLength(1);
    expect(dlq.list()).toHaveLength(3);
  });

  it("should mark entry as replayed", () => {
    const delivery = {
      id: "del_r",
      webhookId: "wh_1",
      event: "test",
      status: "failed" as const,
      payload: "{}",
      signature: "",
      url: "",
      headers: {},
      attempts: [],
      currentAttempt: 1,
      maxAttempts: 1,
      createdAt: new Date().toISOString(),
      idempotencyKey: "k",
    };
    dlq.enqueue(delivery, "fail");
    expect(dlq.markReplayed("dlq_del_r")).toBe(true);

    const entry = dlq.get("dlq_del_r");
    expect(entry!.replayed).toBe(true);
    expect(entry!.replayedAt).toBeDefined();
  });

  it("should return false when marking non-existent entry", () => {
    expect(dlq.markReplayed("nonexistent")).toBe(false);
  });

  it("should evict oldest when at capacity", () => {
    for (let i = 0; i < 6; i++) {
      const delivery = {
        id: `del_${i}`,
        webhookId: "wh_1",
        event: "test",
        status: "failed" as const,
        payload: "{}",
        signature: "",
        url: "",
        headers: {},
        attempts: [],
        currentAttempt: 1,
        maxAttempts: 1,
        createdAt: new Date(Date.now() + i).toISOString(),
        idempotencyKey: `k${i}`,
      };
      dlq.enqueue(delivery, "fail");
    }

    // Max size is 5, so oldest should be evicted
    expect(dlq.size).toBe(5);
    expect(dlq.get("dlq_del_0")).toBeUndefined(); // Oldest evicted
    expect(dlq.get("dlq_del_5")).toBeDefined(); // Newest preserved
  });

  it("should remove entry", () => {
    const delivery = {
      id: "del_rm",
      webhookId: "wh_1",
      event: "test",
      status: "failed" as const,
      payload: "{}",
      signature: "",
      url: "",
      headers: {},
      attempts: [],
      currentAttempt: 1,
      maxAttempts: 1,
      createdAt: new Date().toISOString(),
      idempotencyKey: "k",
    };
    dlq.enqueue(delivery, "fail");
    expect(dlq.remove("dlq_del_rm")).toBe(true);
    expect(dlq.size).toBe(0);
  });

  it("should clear the queue", () => {
    const delivery = {
      id: "del_c",
      webhookId: "wh_1",
      event: "test",
      status: "failed" as const,
      payload: "{}",
      signature: "",
      url: "",
      headers: {},
      attempts: [],
      currentAttempt: 1,
      maxAttempts: 1,
      createdAt: new Date().toISOString(),
      idempotencyKey: "k",
    };
    dlq.enqueue(delivery, "fail");
    dlq.clear();
    expect(dlq.size).toBe(0);
  });
});

// ============================================================================
// SECTION 6: DELIVERY ENGINE
// ============================================================================

describe("WebhookDeliveryEngine", () => {
  describe("successful delivery", () => {
    it("should deliver successfully on first attempt", async () => {
      const fetchFn = createSuccessFetch();
      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());

      const webhook = createMockWebhook();
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);

      expect(result.status).toBe("delivered");
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].statusCode).toBe(200);
      expect(result.completedAt).toBeDefined();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("should include correct headers in request", async () => {
      const fetchFn = createSuccessFetch();
      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());

      const webhook = createMockWebhook({
        headers: { "X-Custom": "value" },
      });
      const event = createMockEvent();

      await engine.deliver(webhook, event);

      const callArgs = (fetchFn as jest.Mock).mock.calls[0];
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].headers["User-Agent"]).toBe(WEBHOOK_USER_AGENT);
      expect(callArgs[1].headers["X-Custom"]).toBe("value");
      expect(callArgs[1].headers[SIGNATURE_HEADERS.SIGNATURE]).toBeDefined();
      expect(callArgs[1].headers[SIGNATURE_HEADERS.TIMESTAMP]).toBeDefined();
    });
  });

  describe("retry logic", () => {
    it("should retry on retryable HTTP status", async () => {
      let callCount = 0;
      const fetchFn: WebhookFetchFunction = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Error",
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        });
      });

      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());
      const webhook = createMockWebhook();
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);

      expect(result.status).toBe("delivered");
      expect(result.attempts).toHaveLength(3);
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable status (e.g. 400)", async () => {
      const fetchFn = createFailureFetch(400);
      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());

      const webhook = createMockWebhook();
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);

      expect(result.status).toBe("failed");
      expect(result.attempts).toHaveLength(1);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on network error", async () => {
      let callCount = 0;
      const fetchFn: WebhookFetchFunction = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("ECONNREFUSED"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve(""),
        });
      });

      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());
      const webhook = createMockWebhook();
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);

      expect(result.status).toBe("delivered");
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].error).toBe("ECONNREFUSED");
    });

    it("should stop after max attempts and dead letter", async () => {
      const fetchFn = createFailureFetch(503);
      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());

      const webhook = createMockWebhook({
        retryConfig: { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 3 },
      });
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);

      expect(result.status).toBe("failed");
      expect(result.attempts).toHaveLength(3);
      expect(engine.getDeadLetterQueue().size).toBe(1);
    });

    it("should not retry when retries disabled", async () => {
      const fetchFn = createFailureFetch(500);
      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());

      const webhook = createMockWebhook({
        retryConfig: { ...DEFAULT_RETRY_OPTIONS, enabled: false },
      });
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);

      expect(result.status).toBe("failed");
      expect(result.attempts).toHaveLength(1);
    });
  });

  describe("backoff calculation", () => {
    it("should calculate exponential backoff", () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );
      const config = DEFAULT_RETRY_OPTIONS;

      // Attempt 1: 1000ms base
      const d1 = engine.calculateBackoff(1, config);
      expect(d1).toBeGreaterThanOrEqual(1000);
      expect(d1).toBeLessThanOrEqual(1100); // 10% jitter max

      // Attempt 2: 2000ms
      const d2 = engine.calculateBackoff(2, config);
      expect(d2).toBeGreaterThanOrEqual(2000);
      expect(d2).toBeLessThanOrEqual(2200);

      // Attempt 3: 4000ms
      const d3 = engine.calculateBackoff(3, config);
      expect(d3).toBeGreaterThanOrEqual(4000);
      expect(d3).toBeLessThanOrEqual(4400);
    });

    it("should cap at maxDelayMs", () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );
      const config = { ...DEFAULT_RETRY_OPTIONS, maxDelayMs: 5000 };

      const d = engine.calculateBackoff(10, config); // Would be 512000ms without cap
      expect(d).toBeLessThanOrEqual(5500); // 5000 + 10% jitter
    });
  });

  describe("circuit breaker integration", () => {
    it("should deny delivery when circuit is open", async () => {
      const fetchFn = createFailureFetch(500);
      const engine = new WebhookDeliveryEngine(
        fetchFn,
        {
          circuitBreakerConfig: {
            failureThreshold: 1,
            resetTimeoutMs: 60_000,
            successThreshold: 1,
          },
        },
        noOpSleep(),
      );

      const webhook = createMockWebhook({
        retryConfig: { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 1 },
      });

      // First delivery fails, opens circuit
      await engine.deliver(webhook, createMockEvent({ idempotencyKey: "k1" }));

      // Second delivery should be blocked by circuit breaker
      const result = await engine.deliver(
        webhook,
        createMockEvent({ idempotencyKey: "k2", id: "evt2" }),
      );
      expect(result.status).toBe("failed");
      expect(result.attempts[0].error).toContain("Circuit breaker open");
    });
  });

  describe("SSRF protection", () => {
    it("should block localhost URLs", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({ url: "http://localhost:8080/hook" });
      const event = createMockEvent();

      const result = await engine.deliver(webhook, event);
      expect(result.status).toBe("failed");
      expect(result.attempts[0].error).toContain("SSRF");
    });

    it("should block 127.0.0.1", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({ url: "http://127.0.0.1/hook" });
      const result = await engine.deliver(webhook, createMockEvent());
      expect(result.status).toBe("failed");
    });

    it("should block private IPs (10.x)", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({ url: "http://10.0.0.1/hook" });
      const result = await engine.deliver(webhook, createMockEvent());
      expect(result.status).toBe("failed");
    });

    it("should block metadata service IPs (169.254.x)", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({
        url: "http://169.254.169.254/latest/meta-data",
      });
      const result = await engine.deliver(webhook, createMockEvent());
      expect(result.status).toBe("failed");
    });

    it("should allow legitimate external URLs", () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );
      expect(engine.isBlockedUrl("https://hooks.example.com/webhook")).toBe(
        false,
      );
    });
  });

  describe("payload size limits", () => {
    it("should reject oversized payloads", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {
          maxPayloadSize: 100,
        },
        noOpSleep(),
      );

      const webhook = createMockWebhook();
      const event = createMockEvent({
        data: { content: "x".repeat(200) },
      });

      const result = await engine.deliver(webhook, event);
      expect(result.status).toBe("failed");
      expect(result.attempts[0].error).toContain("Payload size");
    });
  });

  describe("webhook status validation", () => {
    it("should reject delivery to disabled webhook", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({ status: "disabled" });
      const result = await engine.deliver(webhook, createMockEvent());
      expect(result.status).toBe("failed");
      expect(result.attempts[0].error).toContain("disabled");
    });

    it("should reject delivery to paused webhook", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({ status: "paused" });
      const result = await engine.deliver(webhook, createMockEvent());
      expect(result.status).toBe("failed");
    });
  });

  describe("event filtering", () => {
    it("should reject event not in webhook subscription list", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const webhook = createMockWebhook({ events: ["message.created"] });
      const event = createMockEvent({ event: "channel.deleted" });

      const result = await engine.deliver(webhook, event);
      expect(result.status).toBe("failed");
      expect(result.attempts[0].error).toContain("not in webhook subscription");
    });
  });

  describe("concurrent delivery limit", () => {
    it("should reject when max concurrent deliveries reached", async () => {
      const slowFetch: WebhookFetchFunction = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  statusText: "OK",
                  text: () => Promise.resolve(""),
                }),
              100,
            ),
          ),
      );

      const engine = new WebhookDeliveryEngine(
        slowFetch,
        {
          maxConcurrentDeliveries: 1,
        },
        noOpSleep(),
      );

      const webhook = createMockWebhook();

      // Start first delivery (will be slow)
      const p1 = engine.deliver(
        webhook,
        createMockEvent({ id: "e1", idempotencyKey: "k1" }),
      );

      // Second delivery should be rejected (concurrent limit = 1)
      const p2 = engine.deliver(
        webhook,
        createMockEvent({ id: "e2", idempotencyKey: "k2" }),
      );

      const [r1, r2] = await Promise.all([p1, p2]);

      // One should succeed, one should fail due to concurrency
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toContain("failed");
    });
  });

  describe("delivery queries", () => {
    it("should list deliveries by webhookId", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );

      const wh1 = createMockWebhook({ id: "wh_1" });
      const wh2 = createMockWebhook({ id: "wh_2" });

      await engine.deliver(
        wh1,
        createMockEvent({ webhookId: "wh_1", idempotencyKey: "k1" }),
      );
      await engine.deliver(
        wh2,
        createMockEvent({ webhookId: "wh_2", idempotencyKey: "k2" }),
      );

      expect(engine.listDeliveries("wh_1")).toHaveLength(1);
      expect(engine.listDeliveries("wh_2")).toHaveLength(1);
      expect(engine.listDeliveries()).toHaveLength(2);
    });

    it("should get delivery by ID", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );
      const webhook = createMockWebhook();

      const result = await engine.deliver(webhook, createMockEvent());
      const found = engine.getDelivery(result.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(result.id);
    });
  });

  describe("dead letter replay", () => {
    it("should replay a dead letter entry successfully", async () => {
      let callCount = 0;
      const fetchFn: WebhookFetchFunction = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Error",
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        });
      });

      const engine = new WebhookDeliveryEngine(fetchFn, {}, noOpSleep());
      const webhook = createMockWebhook({
        retryConfig: { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 1 },
      });

      // First delivery fails and goes to DLQ
      await engine.deliver(webhook, createMockEvent());
      expect(engine.getDeadLetterQueue().size).toBe(1);

      const entries = engine.getDeadLetterQueue().list();
      const entry = entries[0];

      // Replay should succeed
      const result = await engine.replayDeadLetter(entry.id, webhook);
      expect(result).not.toBeNull();
      expect(result!.status).toBe("delivered");
    });

    it("should return null for non-existent DLQ entry", async () => {
      const engine = new WebhookDeliveryEngine(
        createSuccessFetch(),
        {},
        noOpSleep(),
      );
      const result = await engine.replayDeadLetter(
        "nonexistent",
        createMockWebhook(),
      );
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// SECTION 7: INCOMING WEBHOOK PROCESSING
// ============================================================================

describe("Incoming Webhook Processing", () => {
  describe("validateIncomingPayload", () => {
    it("should accept valid payload with content", () => {
      const result = validateIncomingPayload({ content: "Hello!" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.content).toBe("Hello!");
      }
    });

    it('should accept "text" field as alias for content', () => {
      const result = validateIncomingPayload({ text: "Hello!" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.content).toBe("Hello!");
      }
    });

    it("should accept payload with embeds only", () => {
      const result = validateIncomingPayload({
        embeds: [{ title: "Test", description: "A test embed" }],
      });
      expect(result.valid).toBe(true);
    });

    it("should accept payload with attachments only", () => {
      const result = validateIncomingPayload({
        attachments: [{ url: "https://example.com/file.png" }],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject null body", () => {
      const result = validateIncomingPayload(null);
      expect(result.valid).toBe(false);
    });

    it("should reject non-object body", () => {
      const result = validateIncomingPayload("string body");
      expect(result.valid).toBe(false);
    });

    it("should reject empty object", () => {
      const result = validateIncomingPayload({});
      expect(result.valid).toBe(false);
    });

    it("should reject content exceeding max length", () => {
      const result = validateIncomingPayload({
        content: "x".repeat(MAX_CONTENT_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("maximum length");
      }
    });

    it("should reject non-string content", () => {
      const result = validateIncomingPayload({ content: 123 });
      expect(result.valid).toBe(false);
    });

    it("should validate username length", () => {
      const result = validateIncomingPayload({
        content: "test",
        username: "x".repeat(81),
      });
      expect(result.valid).toBe(false);
    });

    it("should validate avatar URL", () => {
      const result = validateIncomingPayload({
        content: "test",
        avatarUrl: "not-a-url",
      });
      expect(result.valid).toBe(false);
    });

    it("should accept avatar_url alias", () => {
      const result = validateIncomingPayload({
        content: "test",
        avatar_url: "https://example.com/avatar.png",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.avatarUrl).toBe("https://example.com/avatar.png");
      }
    });

    it("should reject too many attachments", () => {
      const attachments = Array.from(
        { length: MAX_ATTACHMENTS + 1 },
        (_, i) => ({
          url: `https://example.com/file${i}.png`,
        }),
      );
      const result = validateIncomingPayload({ attachments });
      expect(result.valid).toBe(false);
    });

    it("should reject attachments without url", () => {
      const result = validateIncomingPayload({
        attachments: [{ filename: "test.txt" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject too many embeds", () => {
      const embeds = Array.from({ length: MAX_EMBEDS + 1 }, () => ({
        title: "Test",
      }));
      const result = validateIncomingPayload({ embeds });
      expect(result.valid).toBe(false);
    });

    it("should validate embed fields", () => {
      const result = validateIncomingPayload({
        embeds: [
          {
            fields: [{ name: "Field", value: 123 }],
          },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject embed field name exceeding max length", () => {
      const result = validateIncomingPayload({
        embeds: [
          {
            fields: [{ name: "x".repeat(257), value: "test" }],
          },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should accept thread_id alias", () => {
      const result = validateIncomingPayload({
        content: "reply",
        thread_id: "thread_123",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.threadId).toBe("thread_123");
      }
    });
  });

  describe("IncomingRateLimiter", () => {
    it("should allow requests within limit", () => {
      const limiter = new IncomingRateLimiter({
        maxRequests: 5,
        windowSeconds: 60,
      });

      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit("token1");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it("should deny requests exceeding limit", () => {
      const limiter = new IncomingRateLimiter({
        maxRequests: 2,
        windowSeconds: 60,
      });

      limiter.checkLimit("token1");
      limiter.checkLimit("token1");
      const result = limiter.checkLimit("token1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should track independent limits per token", () => {
      const limiter = new IncomingRateLimiter({
        maxRequests: 1,
        windowSeconds: 60,
      });

      const r1 = limiter.checkLimit("token1");
      const r2 = limiter.checkLimit("token2");
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
    });

    it("should include burst allowance", () => {
      const limiter = new IncomingRateLimiter({
        maxRequests: 2,
        windowSeconds: 60,
        burstAllowance: 1,
      });

      limiter.checkLimit("t");
      limiter.checkLimit("t");
      const result = limiter.checkLimit("t"); // Burst allowance
      expect(result.allowed).toBe(true);
    });

    it("should reset token state", () => {
      const limiter = new IncomingRateLimiter({
        maxRequests: 1,
        windowSeconds: 60,
      });

      limiter.checkLimit("token1");
      limiter.reset("token1");
      const result = limiter.checkLimit("token1");
      expect(result.allowed).toBe(true);
    });

    it("should clear all state", () => {
      const limiter = new IncomingRateLimiter({
        maxRequests: 1,
        windowSeconds: 60,
      });

      limiter.checkLimit("t1");
      limiter.checkLimit("t2");
      limiter.clear();

      expect(limiter.checkLimit("t1").allowed).toBe(true);
      expect(limiter.checkLimit("t2").allowed).toBe(true);
    });
  });

  describe("IncomingWebhookProcessor", () => {
    let processor: IncomingWebhookProcessor;
    let messageCreator: jest.Mock;

    beforeEach(() => {
      messageCreator = jest.fn().mockResolvedValue({ messageId: "msg_1" });
      processor = new IncomingWebhookProcessor(
        messageCreator as MessageCreatorFn,
      );
    });

    afterEach(() => {
      processor.clear();
    });

    it("should reject request with invalid token", async () => {
      const result = await processor.process({
        token: "invalid_token",
        body: { content: "Hello" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("should accept valid request and create message", async () => {
      const webhook = createMockWebhook({
        direction: "incoming",
        token: "valid_token",
        channelId: "ch_1",
        defaultUsername: "Bot",
      });
      processor.registerWebhook(webhook);

      const result = await processor.process({
        token: "valid_token",
        body: { content: "Hello from webhook!" },
        headers: {},
        timestamp: Date.now(),
      });

      expect(result.accepted).toBe(true);
      expect(result.messageId).toBe("msg_1");
      expect(result.statusCode).toBe(200);
      expect(messageCreator).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "ch_1",
          content: "Hello from webhook!",
          username: "Bot",
        }),
      );
    });

    it("should reject request for disabled webhook", async () => {
      const webhook = createMockWebhook({
        direction: "incoming",
        token: "disabled_token",
        channelId: "ch_1",
        status: "disabled",
      });
      processor.registerWebhook(webhook);

      const result = await processor.process({
        token: "disabled_token",
        body: { content: "Hello" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it("should reject request for outgoing webhook token", async () => {
      const webhook = createMockWebhook({
        direction: "outgoing",
        token: "outgoing_token",
      });
      processor.registerWebhook(webhook);

      const result = await processor.process({
        token: "outgoing_token",
        body: { content: "Hello" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it("should enforce rate limits", async () => {
      const webhook = createMockWebhook({
        direction: "incoming",
        token: "rate_token",
        channelId: "ch_1",
      });

      const limitedProcessor = new IncomingWebhookProcessor(
        messageCreator as MessageCreatorFn,
        { maxRequests: 1, windowSeconds: 60 },
      );
      limitedProcessor.registerWebhook(webhook);

      // First request should pass
      const r1 = await limitedProcessor.process({
        token: "rate_token",
        body: { content: "Hello 1" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(r1.accepted).toBe(true);

      // Second request should be rate limited
      const r2 = await limitedProcessor.process({
        token: "rate_token",
        body: { content: "Hello 2" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(r2.accepted).toBe(false);
      expect(r2.statusCode).toBe(429);
    });

    it("should reject invalid payload", async () => {
      const webhook = createMockWebhook({
        direction: "incoming",
        token: "valid_token",
        channelId: "ch_1",
      });
      processor.registerWebhook(webhook);

      const result = await processor.process({
        token: "valid_token",
        body: {}, // Empty body
        headers: {},
        timestamp: Date.now(),
      });
      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it("should handle message creation failure", async () => {
      messageCreator.mockRejectedValueOnce(new Error("DB error"));

      const webhook = createMockWebhook({
        direction: "incoming",
        token: "err_token",
        channelId: "ch_1",
      });
      processor.registerWebhook(webhook);

      const result = await processor.process({
        token: "err_token",
        body: { content: "Hello" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it("should unregister webhook", async () => {
      const webhook = createMockWebhook({
        direction: "incoming",
        token: "unreg_token",
        channelId: "ch_1",
      });
      processor.registerWebhook(webhook);
      processor.unregisterWebhook("unreg_token");

      const result = await processor.process({
        token: "unreg_token",
        body: { content: "Hello" },
        headers: {},
        timestamp: Date.now(),
      });
      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("should use default username when not provided", async () => {
      const webhook = createMockWebhook({
        direction: "incoming",
        token: "default_user_token",
        channelId: "ch_1",
        defaultUsername: undefined,
      });
      processor.registerWebhook(webhook);

      await processor.process({
        token: "default_user_token",
        body: { content: "Hello" },
        headers: {},
        timestamp: Date.now(),
      });

      expect(messageCreator).toHaveBeenCalledWith(
        expect.objectContaining({ username: "Webhook" }),
      );
    });
  });
});

// ============================================================================
// SECTION 8: WEBHOOK REGISTRY
// ============================================================================

describe("Webhook Registry", () => {
  let registry: WebhookRegistry;

  beforeEach(() => {
    registry = new WebhookRegistry(undefined, "https://app.nchat.dev");
  });

  afterEach(() => {
    registry.clear();
  });

  describe("createIncoming", () => {
    it("should create an incoming webhook", () => {
      const wh = registry.createIncoming(
        { name: "Test Hook", channelId: "ch_1" },
        "user_1",
      );

      expect(wh.id).toMatch(/^wh_/);
      expect(wh.direction).toBe("incoming");
      expect(wh.status).toBe("active");
      expect(wh.channelId).toBe("ch_1");
      expect(wh.token).toBeDefined();
      expect(wh.secret).toMatch(/^whsec_/);
      expect(wh.url).toContain("/api/plugins/webhooks/incoming/");
      expect(wh.createdBy).toBe("user_1");
    });

    it("should reject empty name", () => {
      expect(() => {
        registry.createIncoming({ name: "", channelId: "ch_1" }, "user_1");
      }).toThrow("name is required");
    });

    it("should reject missing channelId", () => {
      expect(() => {
        registry.createIncoming({ name: "Hook", channelId: "" }, "user_1");
      }).toThrow("Channel ID is required");
    });
  });

  describe("createOutgoing", () => {
    it("should create an outgoing webhook", () => {
      const wh = registry.createOutgoing(
        {
          name: "External Hook",
          url: "https://api.example.com/webhook",
          events: ["message.created", "channel.created"],
        },
        "user_1",
      );

      expect(wh.direction).toBe("outgoing");
      expect(wh.url).toBe("https://api.example.com/webhook");
      expect(wh.events).toEqual(["message.created", "channel.created"]);
      expect(wh.secret).toBeDefined();
    });

    it("should reject missing URL", () => {
      expect(() => {
        registry.createOutgoing(
          { name: "Hook", url: "", events: ["message.created"] },
          "user_1",
        );
      }).toThrow("URL is required");
    });

    it("should reject missing events", () => {
      expect(() => {
        registry.createOutgoing(
          { name: "Hook", url: "https://example.com", events: [] },
          "user_1",
        );
      }).toThrow("At least one event type");
    });

    it("should reject invalid URL", () => {
      expect(() => {
        registry.createOutgoing(
          { name: "Hook", url: "not-a-url", events: ["message.created"] },
          "user_1",
        );
      }).toThrow("Invalid webhook URL");
    });

    it("should reject non-http URL", () => {
      expect(() => {
        registry.createOutgoing(
          {
            name: "Hook",
            url: "ftp://example.com/hook",
            events: ["message.created"],
          },
          "user_1",
        );
      }).toThrow("protocol");
    });

    it("should apply custom retry config", () => {
      const wh = registry.createOutgoing(
        {
          name: "Hook",
          url: "https://example.com",
          events: ["message.created"],
          retryConfig: { maxAttempts: 10 },
        },
        "user_1",
      );
      expect(wh.retryConfig.maxAttempts).toBe(10);
    });
  });

  describe("CRUD operations", () => {
    it("should get webhook by ID", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      const found = registry.getById(wh.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(wh.id);
    });

    it("should get webhook by token", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      const found = registry.getByToken(wh.token!);
      expect(found).toBeDefined();
      expect(found!.id).toBe(wh.id);
    });

    it("should return undefined for non-existent ID", () => {
      expect(registry.getById("nonexistent")).toBeUndefined();
    });

    it("should list all webhooks", () => {
      registry.createIncoming({ name: "In", channelId: "ch_1" }, "u");
      registry.createOutgoing(
        { name: "Out", url: "https://x.com", events: ["message.created"] },
        "u",
      );
      expect(registry.list()).toHaveLength(2);
    });

    it("should filter by direction", () => {
      registry.createIncoming({ name: "In", channelId: "ch_1" }, "u");
      registry.createOutgoing(
        { name: "Out", url: "https://x.com", events: ["message.created"] },
        "u",
      );
      expect(registry.list({ direction: "incoming" })).toHaveLength(1);
      expect(registry.list({ direction: "outgoing" })).toHaveLength(1);
    });

    it("should filter by status", () => {
      const wh = registry.createIncoming(
        { name: "In", channelId: "ch_1" },
        "u",
      );
      registry.disable(wh.id);
      expect(registry.list({ status: "disabled" })).toHaveLength(1);
      expect(registry.list({ status: "active" })).toHaveLength(0);
    });

    it("should update webhook", () => {
      const wh = registry.createIncoming(
        { name: "Old", channelId: "ch_1" },
        "u",
      );
      const updated = registry.update(wh.id, {
        name: "New Name",
        description: "Updated",
      });
      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("Updated");
    });

    it("should reject update for non-existent webhook", () => {
      expect(() => registry.update("nope", { name: "X" })).toThrow("not found");
    });

    it("should reject empty name on update", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      expect(() => registry.update(wh.id, { name: "  " })).toThrow(
        "cannot be empty",
      );
    });

    it("should delete webhook", () => {
      const wh = registry.createIncoming(
        { name: "Del", channelId: "ch_1" },
        "u",
      );
      expect(registry.delete(wh.id)).toBe(true);
      expect(registry.getById(wh.id)).toBeUndefined();
    });

    it("should return false for deleting non-existent webhook", () => {
      expect(registry.delete("nonexistent")).toBe(false);
    });
  });

  describe("status management", () => {
    it("should enable a webhook", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      registry.disable(wh.id);
      const enabled = registry.enable(wh.id);
      expect(enabled.status).toBe("active");
    });

    it("should disable a webhook", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      const disabled = registry.disable(wh.id);
      expect(disabled.status).toBe("disabled");
    });

    it("should pause a webhook", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      const paused = registry.pause(wh.id);
      expect(paused.status).toBe("paused");
    });

    it("should throw for enabling non-existent webhook", () => {
      expect(() => registry.enable("nope")).toThrow("not found");
    });
  });

  describe("secret rotation", () => {
    it("should rotate webhook secret", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      const oldSecret = wh.secret;
      const newSecret = registry.rotateSecret(wh.id);
      expect(newSecret).not.toBe(oldSecret);
      expect(newSecret).toMatch(/^whsec_/);
    });

    it("should throw for non-existent webhook", () => {
      expect(() => registry.rotateSecret("nope")).toThrow("not found");
    });
  });

  describe("event subscription management", () => {
    it("should add events to outgoing webhook", () => {
      const wh = registry.createOutgoing(
        { name: "Hook", url: "https://x.com", events: ["message.created"] },
        "u",
      );
      const updated = registry.addEvents(wh.id, [
        "channel.created",
        "member.joined",
      ]);
      expect(updated.events).toEqual(
        expect.arrayContaining([
          "message.created",
          "channel.created",
          "member.joined",
        ]),
      );
    });

    it("should not duplicate events when adding", () => {
      const wh = registry.createOutgoing(
        { name: "Hook", url: "https://x.com", events: ["message.created"] },
        "u",
      );
      const updated = registry.addEvents(wh.id, ["message.created"]);
      expect(updated.events).toHaveLength(1);
    });

    it("should remove events from outgoing webhook", () => {
      const wh = registry.createOutgoing(
        {
          name: "Hook",
          url: "https://x.com",
          events: ["message.created", "channel.created"],
        },
        "u",
      );
      const updated = registry.removeEvents(wh.id, ["channel.created"]);
      expect(updated.events).toEqual(["message.created"]);
    });

    it("should throw when adding events to incoming webhook", () => {
      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      expect(() => registry.addEvents(wh.id, ["message.created"])).toThrow(
        "outgoing",
      );
    });

    it("should get webhooks for a specific event", () => {
      registry.createOutgoing(
        { name: "Hook1", url: "https://a.com", events: ["message.created"] },
        "u",
      );
      registry.createOutgoing(
        { name: "Hook2", url: "https://b.com", events: ["channel.created"] },
        "u",
      );
      registry.createOutgoing(
        {
          name: "Hook3",
          url: "https://c.com",
          events: ["message.created", "channel.created"],
        },
        "u",
      );

      expect(registry.getWebhooksForEvent("message.created")).toHaveLength(2);
      expect(registry.getWebhooksForEvent("channel.created")).toHaveLength(2);
      expect(registry.getWebhooksForEvent("user.created")).toHaveLength(0);
    });
  });

  describe("delivery recording", () => {
    it("should record successful delivery", () => {
      const wh = registry.createOutgoing(
        { name: "Hook", url: "https://x.com", events: ["message.created"] },
        "u",
      );
      registry.recordDelivery(wh.id, true);
      const updated = registry.getById(wh.id)!;
      expect(updated.deliveryCount).toBe(1);
      expect(updated.failedDeliveryCount).toBe(0);
      expect(updated.lastTriggeredAt).toBeDefined();
    });

    it("should record failed delivery", () => {
      const wh = registry.createOutgoing(
        { name: "Hook", url: "https://x.com", events: ["message.created"] },
        "u",
      );
      registry.recordDelivery(wh.id, false);
      const updated = registry.getById(wh.id)!;
      expect(updated.deliveryCount).toBe(1);
      expect(updated.failedDeliveryCount).toBe(1);
    });
  });

  describe("event listeners", () => {
    it("should notify on webhook creation", () => {
      const listener = jest.fn();
      registry.onEvent(listener);

      registry.createIncoming({ name: "Hook", channelId: "ch_1" }, "u");
      expect(listener).toHaveBeenCalledWith(
        "webhook.created",
        expect.objectContaining({ name: "Hook" }),
      );
    });

    it("should notify on webhook deletion", () => {
      const listener = jest.fn();
      registry.onEvent(listener);

      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      registry.delete(wh.id);
      expect(listener).toHaveBeenCalledWith(
        "webhook.deleted",
        expect.anything(),
      );
    });

    it("should notify on secret rotation", () => {
      const listener = jest.fn();
      registry.onEvent(listener);

      const wh = registry.createIncoming(
        { name: "Hook", channelId: "ch_1" },
        "u",
      );
      registry.rotateSecret(wh.id);
      expect(listener).toHaveBeenCalledWith(
        "webhook.secret_rotated",
        expect.anything(),
      );
    });

    it("should unsubscribe listener", () => {
      const listener = jest.fn();
      const unsub = registry.onEvent(listener);

      unsub();
      registry.createIncoming({ name: "Hook", channelId: "ch_1" }, "u");
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SECTION 9: ID AND TOKEN GENERATION
// ============================================================================

describe("ID and Token Generation", () => {
  it("should generate unique webhook IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateWebhookId()));
    expect(ids.size).toBe(50);
  });

  it("should generate webhook IDs with prefix", () => {
    const id = generateWebhookId();
    expect(id).toMatch(/^wh_/);
  });

  it("should generate unique secrets", () => {
    const secrets = new Set(
      Array.from({ length: 50 }, () => generateWebhookSecret()),
    );
    expect(secrets.size).toBe(50);
  });

  it("should generate secrets with prefix", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_/);
  });

  it("should generate unique tokens", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateWebhookToken()),
    );
    expect(tokens.size).toBe(50);
  });

  it("should generate tokens with prefix", () => {
    const token = generateWebhookToken();
    expect(token).toMatch(/^wht_/);
  });

  it("should generate unique delivery IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateDeliveryId()));
    expect(ids.size).toBe(50);
  });
});

// ============================================================================
// SECTION 10: WEBHOOK STORE
// ============================================================================

describe("WebhookStore", () => {
  let store: WebhookStore;

  beforeEach(() => {
    store = new WebhookStore();
  });

  it("should save and retrieve webhook", () => {
    const webhook = createMockWebhook({ id: "wh_store_1" });
    store.save(webhook);
    expect(store.get("wh_store_1")).toBe(webhook);
  });

  it("should delete webhook and clean up token index", () => {
    const webhook = createMockWebhook({ id: "wh_store_2", token: "tok_2" });
    store.save(webhook);
    store.delete("wh_store_2");
    expect(store.get("wh_store_2")).toBeUndefined();
    expect(store.getByToken("tok_2")).toBeUndefined();
  });

  it("should return false for deleting non-existent webhook", () => {
    expect(store.delete("nope")).toBe(false);
  });

  it("should filter by channelId", () => {
    store.save(createMockWebhook({ id: "w1", channelId: "ch_1" }));
    store.save(createMockWebhook({ id: "w2", channelId: "ch_2" }));
    expect(store.list({ channelId: "ch_1" })).toHaveLength(1);
  });

  it("should filter by createdBy", () => {
    store.save(createMockWebhook({ id: "w1", createdBy: "alice" }));
    store.save(createMockWebhook({ id: "w2", createdBy: "bob" }));
    expect(store.list({ createdBy: "alice" })).toHaveLength(1);
  });

  it("should list by event type", () => {
    store.save(
      createMockWebhook({
        id: "w1",
        direction: "outgoing",
        status: "active",
        events: ["message.created"],
      }),
    );
    store.save(
      createMockWebhook({
        id: "w2",
        direction: "outgoing",
        status: "active",
        events: ["channel.created"],
      }),
    );
    expect(store.listByEvent("message.created")).toHaveLength(1);
  });

  it("should only list active outgoing webhooks by event", () => {
    store.save(
      createMockWebhook({
        id: "w1",
        direction: "outgoing",
        status: "disabled",
        events: ["message.created"],
      }),
    );
    expect(store.listByEvent("message.created")).toHaveLength(0);
  });

  it("should report size", () => {
    expect(store.size).toBe(0);
    store.save(createMockWebhook({ id: "w1" }));
    expect(store.size).toBe(1);
  });

  it("should clear all data", () => {
    store.save(createMockWebhook({ id: "w1", token: "t1" }));
    store.clear();
    expect(store.size).toBe(0);
    expect(store.getByToken("t1")).toBeUndefined();
  });
});

// ============================================================================
// SECTION 11: CONSTANTS AND DEFAULTS
// ============================================================================

describe("Constants and Defaults", () => {
  it("should have valid default retry options", () => {
    expect(DEFAULT_RETRY_OPTIONS.enabled).toBe(true);
    expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBeGreaterThan(0);
    expect(DEFAULT_RETRY_OPTIONS.initialDelayMs).toBeGreaterThan(0);
    expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBeGreaterThan(
      DEFAULT_RETRY_OPTIONS.initialDelayMs,
    );
    expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBeGreaterThan(1);
    expect(DEFAULT_RETRY_OPTIONS.retryableStatusCodes).toContain(500);
    expect(DEFAULT_RETRY_OPTIONS.retryableStatusCodes).toContain(502);
    expect(DEFAULT_RETRY_OPTIONS.retryableStatusCodes).toContain(503);
    expect(DEFAULT_RETRY_OPTIONS.retryableStatusCodes).toContain(429);
  });

  it("should have valid default incoming rate limit", () => {
    expect(DEFAULT_INCOMING_RATE_LIMIT.maxRequests).toBeGreaterThan(0);
    expect(DEFAULT_INCOMING_RATE_LIMIT.windowSeconds).toBeGreaterThan(0);
  });

  it("should have valid default circuit breaker config", () => {
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.successThreshold).toBeGreaterThan(0);
  });

  it("should have valid signature headers", () => {
    expect(SIGNATURE_HEADERS.SIGNATURE).toBe("x-webhook-signature");
    expect(SIGNATURE_HEADERS.TIMESTAMP).toBe("x-webhook-timestamp");
    expect(SIGNATURE_HEADERS.NONCE).toBe("x-webhook-nonce");
    expect(SIGNATURE_HEADERS.DELIVERY_ID).toBe("x-delivery-id");
    expect(SIGNATURE_HEADERS.EVENT_TYPE).toBe("x-event-type");
  });

  it("should have valid default timestamp tolerance", () => {
    expect(DEFAULT_TIMESTAMP_TOLERANCE_SECONDS).toBe(300);
  });

  it("should have valid max payload size", () => {
    expect(MAX_PAYLOAD_SIZE).toBe(256 * 1024);
  });

  it("should have valid max incoming payload size", () => {
    expect(MAX_INCOMING_PAYLOAD_SIZE).toBe(64 * 1024);
  });

  it("should have valid max content length", () => {
    expect(MAX_CONTENT_LENGTH).toBe(4000);
  });

  it("should have valid user agent", () => {
    expect(WEBHOOK_USER_AGENT).toBe("nchat-webhook/1.0");
  });
});
