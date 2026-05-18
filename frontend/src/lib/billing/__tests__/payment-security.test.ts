/**
 * Payment Security - Adversarial Test Suite
 *
 * Comprehensive tests for abuse-resistant payment security checks.
 * Tests cover anti-replay, anti-double-spend, anti-fraud, webhook security,
 * and reconciliation scenarios.
 *
 * @module @/lib/billing/__tests__/payment-security.test
 * @version 1.0.0
 */

import {
  ReplayProtectionStore,
  DoubleSpendDetector,
  FraudDetector,
  WebhookSignatureValidator,
  PaymentReconciler,
  SecurityCheckCode,
  DEFAULT_VELOCITY_CONFIG,
  DEFAULT_FRAUD_CONFIG,
  DEFAULT_CONFIRMATION_REQUIREMENTS,
  WEBHOOK_MAX_AGE_SECONDS,
  generateNonce,
  generateChecksum,
  isValidEthAddress,
  isValidBtcAddress,
  isValidTxHash,
  type SecurityCheckResult,
  type CryptoTransactionInput,
  type PaymentAttempt,
  type LedgerEntry,
  type WebhookVerificationInput,
  type FraudDetectionConfig,
} from "../payment-security";

import {
  PaymentSecurityService,
  createPaymentSecurityService,
  type PaymentSecurityAssessment,
} from "@/services/billing/payment-security.service";

// ============================================================================
// Test Helpers
// ============================================================================

function createPaymentAttempt(
  overrides: Partial<PaymentAttempt> = {},
): PaymentAttempt {
  return {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId: "user-1",
    workspaceId: "ws-1",
    amount: 9900, // $99.00
    currency: "usd",
    method: "stripe",
    timestamp: Date.now(),
    ...overrides,
  };
}

function createCryptoTx(
  overrides: Partial<CryptoTransactionInput> = {},
): CryptoTransactionInput {
  return {
    txHash: "0x" + "a".repeat(64),
    fromAddress: "0x" + "1".repeat(40),
    toAddress: "0x" + "2".repeat(40),
    amount: "0.05",
    currency: "ETH",
    network: "ethereum",
    confirmations: 15,
    blockNumber: 12345678,
    timestamp: Date.now(),
    ...overrides,
  };
}

function createLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `le_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    paymentIntentId: `pi_${Math.random().toString(36).substring(7)}`,
    chargeId: `ch_${Math.random().toString(36).substring(7)}`,
    subscriptionId: `sub_${Math.random().toString(36).substring(7)}`,
    workspaceId: "ws-1",
    amount: 9900,
    currency: "usd",
    type: "charge",
    status: "settled",
    createdAt: new Date(),
    settledAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Anti-Replay Protection Tests
// ============================================================================

describe("ReplayProtectionStore", () => {
  let store: ReplayProtectionStore;

  beforeEach(() => {
    store = new ReplayProtectionStore(60000); // 1 minute TTL
  });

  describe("duplicate detection", () => {
    it("should detect duplicate event IDs", () => {
      store.record("evt_001");
      expect(store.isDuplicate("evt_001")).toBe(true);
    });

    it("should allow unique event IDs", () => {
      store.record("evt_001");
      expect(store.isDuplicate("evt_002")).toBe(false);
    });

    it("should atomically check and record", () => {
      const firstCall = store.checkAndRecord("evt_001");
      const secondCall = store.checkAndRecord("evt_001");

      expect(firstCall).toBe(false); // Not a duplicate on first call
      expect(secondCall).toBe(true); // Duplicate on second call
    });

    it("should handle multiple rapid duplicate checks", () => {
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(store.checkAndRecord("evt_same"));
      }
      expect(results[0]).toBe(false); // First is not duplicate
      expect(results.slice(1).every((r) => r === true)).toBe(true); // All others are
    });

    it("should expire old entries after TTL", () => {
      // Use a very short TTL store
      const shortStore = new ReplayProtectionStore(1); // 1ms TTL
      shortStore.record("evt_old");

      // Wait for expiration
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait 5ms
      }

      expect(shortStore.isDuplicate("evt_old")).toBe(false);
    });

    it("should track store size correctly", () => {
      expect(store.size).toBe(0);
      store.record("evt_1");
      store.record("evt_2");
      store.record("evt_3");
      expect(store.size).toBe(3);
    });
  });

  describe("nonce management", () => {
    it("should accept strictly increasing nonces", () => {
      expect(store.checkNonce("scope-1", 1)).toBe(true);
      expect(store.checkNonce("scope-1", 2)).toBe(true);
      expect(store.checkNonce("scope-1", 5)).toBe(true);
    });

    it("should reject reused nonces", () => {
      store.checkNonce("scope-1", 5);
      expect(store.checkNonce("scope-1", 5)).toBe(false);
    });

    it("should reject decreasing nonces", () => {
      store.checkNonce("scope-1", 10);
      expect(store.checkNonce("scope-1", 5)).toBe(false);
      expect(store.checkNonce("scope-1", 9)).toBe(false);
    });

    it("should track nonces independently per scope", () => {
      store.checkNonce("scope-a", 10);
      store.checkNonce("scope-b", 5);

      expect(store.checkNonce("scope-a", 6)).toBe(false); // 6 < 10
      expect(store.checkNonce("scope-b", 6)).toBe(true); // 6 > 5
    });

    it("should return last nonce for a scope", () => {
      store.checkNonce("scope-1", 42);
      expect(store.getLastNonce("scope-1")).toBe(42);
      expect(store.getLastNonce("scope-unknown")).toBeUndefined();
    });

    it("should reject nonce zero after nonce zero", () => {
      store.checkNonce("scope-1", 0);
      expect(store.checkNonce("scope-1", 0)).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should clean up expired entries", () => {
      const shortStore = new ReplayProtectionStore(1);
      shortStore.record("evt_1");
      shortStore.record("evt_2");

      // Wait for expiration
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }

      const cleaned = shortStore.cleanup();
      expect(cleaned).toBe(2);
      expect(shortStore.size).toBe(0);
    });

    it("should not clean non-expired entries", () => {
      store.record("evt_1");
      store.record("evt_2");
      const cleaned = store.cleanup();
      expect(cleaned).toBe(0);
      expect(store.size).toBe(2);
    });

    it("should clear all data", () => {
      store.record("evt_1");
      store.checkNonce("scope", 1);
      store.clear();
      expect(store.size).toBe(0);
      expect(store.isDuplicate("evt_1")).toBe(false);
    });
  });
});

// ============================================================================
// Anti-Double-Spend Tests
// ============================================================================

describe("DoubleSpendDetector", () => {
  let detector: DoubleSpendDetector;

  beforeEach(() => {
    detector = new DoubleSpendDetector();
  });

  describe("transaction checking", () => {
    it("should pass for new transactions with sufficient confirmations", () => {
      const tx = createCryptoTx({ confirmations: 15 });
      const result = detector.checkTransaction(tx);
      expect(result.passed).toBe(true);
      expect(result.code).toBe(SecurityCheckCode.CHECK_PASSED);
    });

    it("should detect reuse of the same transaction hash", () => {
      const tx = createCryptoTx();
      detector.recordTransaction(tx);

      const result = detector.checkTransaction(tx);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.DOUBLE_SPEND_DETECTED);
    });

    it("should detect insufficient confirmations for ethereum", () => {
      const tx = createCryptoTx({ confirmations: 5, network: "ethereum" });
      const result = detector.checkTransaction(tx);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.INSUFFICIENT_CONFIRMATIONS);
      expect(result.metadata?.required).toBe(12);
    });

    it("should detect insufficient confirmations for bitcoin", () => {
      const tx = createCryptoTx({ confirmations: 3, network: "bitcoin" });
      const result = detector.checkTransaction(tx);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.INSUFFICIENT_CONFIRMATIONS);
      expect(result.metadata?.required).toBe(6);
    });

    it("should detect insufficient confirmations for polygon", () => {
      const tx = createCryptoTx({ confirmations: 30, network: "polygon" });
      const result = detector.checkTransaction(tx);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.INSUFFICIENT_CONFIRMATIONS);
      expect(result.metadata?.required).toBe(60);
    });

    it("should detect unconfirmed tx reuse from same address", () => {
      // Record a pending transaction from address A
      const tx1 = createCryptoTx({
        txHash: "0x" + "a".repeat(64),
        fromAddress: "0x" + "1".repeat(40),
        confirmations: 2, // Under threshold
      });
      detector.recordTransaction(tx1);

      // Try another transaction from the same address
      const tx2 = createCryptoTx({
        txHash: "0x" + "b".repeat(64),
        fromAddress: "0x" + "1".repeat(40),
        confirmations: 15,
      });
      const result = detector.checkTransaction(tx2);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.UNCONFIRMED_TX_REUSE);
    });

    it("should allow transactions from different addresses", () => {
      const tx1 = createCryptoTx({
        txHash: "0x" + "a".repeat(64),
        fromAddress: "0x" + "1".repeat(40),
      });
      detector.recordTransaction(tx1);

      const tx2 = createCryptoTx({
        txHash: "0x" + "b".repeat(64),
        fromAddress: "0x" + "3".repeat(40),
      });
      const result = detector.checkTransaction(tx2);
      expect(result.passed).toBe(true);
    });

    it("should use default 12 confirmations for unknown networks", () => {
      const tx = createCryptoTx({
        confirmations: 10,
        network: "some-new-chain",
      });
      const result = detector.checkTransaction(tx);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.INSUFFICIENT_CONFIRMATIONS);
    });
  });

  describe("block reorganization detection", () => {
    it("should detect when confirmations decrease (reorg)", () => {
      const tx = createCryptoTx({ confirmations: 20 });
      detector.recordTransaction(tx);

      const result = detector.updateConfirmations(tx.txHash, 5, 12345600);
      expect(result).not.toBeNull();
      expect(result!.passed).toBe(false);
      expect(result!.code).toBe(SecurityCheckCode.BLOCK_REORG_DETECTED);
    });

    it("should accept increasing confirmations", () => {
      const tx = createCryptoTx({ confirmations: 5 });
      detector.recordTransaction(tx);

      const result = detector.updateConfirmations(tx.txHash, 15, 12345680);
      expect(result).toBeNull(); // No issue
    });

    it("should return null for unknown transactions", () => {
      const result = detector.updateConfirmations("0x" + "z".repeat(64), 10);
      expect(result).toBeNull();
    });

    it("should mark transaction as confirmed when threshold met", () => {
      const tx = createCryptoTx({ confirmations: 5 });
      detector.recordTransaction(tx);
      expect(detector.isConfirmed(tx.txHash)).toBe(false);

      detector.updateConfirmations(tx.txHash, 15);
      expect(detector.isConfirmed(tx.txHash)).toBe(true);
    });
  });

  describe("transaction status", () => {
    it("should return unknown for unseen transactions", () => {
      expect(detector.getTransactionStatus("0x" + "x".repeat(64))).toBe(
        "unknown",
      );
    });

    it("should track pending status", () => {
      const tx = createCryptoTx({ confirmations: 0 });
      detector.recordTransaction(tx);
      expect(detector.getTransactionStatus(tx.txHash)).toBe("pending");
    });

    it("should track confirming status", () => {
      const tx = createCryptoTx({ confirmations: 5 });
      detector.recordTransaction(tx);
      expect(detector.getTransactionStatus(tx.txHash)).toBe("confirming");
    });

    it("should track confirmed status", () => {
      const tx = createCryptoTx({ confirmations: 20 });
      detector.recordTransaction(tx);
      expect(detector.getTransactionStatus(tx.txHash)).toBe("confirmed");
    });

    it("should track reorged status after reorg", () => {
      const tx = createCryptoTx({ confirmations: 20 });
      detector.recordTransaction(tx);
      detector.updateConfirmations(tx.txHash, 2);
      expect(detector.getTransactionStatus(tx.txHash)).toBe("reorged");
    });
  });

  describe("custom confirmation requirements", () => {
    it("should use custom confirmation counts", () => {
      const customDetector = new DoubleSpendDetector({
        ethereum: 30,
        bitcoin: 3,
      });

      const ethTx = createCryptoTx({
        confirmations: 25,
        network: "ethereum",
      });
      expect(customDetector.checkTransaction(ethTx).passed).toBe(false);

      const btcTx = createCryptoTx({
        confirmations: 4,
        network: "bitcoin",
      });
      expect(customDetector.checkTransaction(btcTx).passed).toBe(true);
    });
  });
});

// ============================================================================
// Anti-Fraud Tests
// ============================================================================

describe("FraudDetector", () => {
  let detector: FraudDetector;

  beforeEach(() => {
    detector = new FraudDetector();
  });

  describe("velocity checks", () => {
    it("should pass within hourly attempt limits", () => {
      const attempt = createPaymentAttempt();
      const results = detector.checkPaymentAttempt(attempt);
      const velocityResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED ||
          (r.code === SecurityCheckCode.CHECK_PASSED &&
            r.message.includes("Velocity")),
      );
      expect(velocityResult?.passed).toBe(true);
    });

    it("should block when hourly attempt limit exceeded", () => {
      // Record max attempts
      for (let i = 0; i < DEFAULT_VELOCITY_CONFIG.maxAttemptsPerHour; i++) {
        const attempt = createPaymentAttempt({
          id: `pay_${i}`,
          timestamp: Date.now() - i * 1000,
        });
        detector.recordAttempt(attempt);
      }

      // Next attempt should be blocked
      const nextAttempt = createPaymentAttempt({ id: "pay_exceed" });
      const results = detector.checkPaymentAttempt(nextAttempt);
      const velocityResult = results.find(
        (r) => r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
      );
      expect(velocityResult).toBeDefined();
      expect(velocityResult?.passed).toBe(false);
      expect(velocityResult?.metadata?.type).toBe("hourly_count");
    });

    it("should block when daily attempt limit exceeded", () => {
      // Record max daily attempts spread within the last 23 hours
      // so all are within the 24-hour window
      for (let i = 0; i < DEFAULT_VELOCITY_CONFIG.maxAttemptsPerDay; i++) {
        const attempt = createPaymentAttempt({
          id: `pay_${i}`,
          // Spread across the last 23 hours (all within 24h window)
          timestamp: Date.now() - i * 2700 * 1000, // 45 min apart
        });
        detector.recordAttempt(attempt);
      }

      const nextAttempt = createPaymentAttempt({ id: "pay_exceed_daily" });
      const results = detector.checkPaymentAttempt(nextAttempt);
      const velocityResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          (r.metadata?.type === "daily_count" ||
            r.metadata?.type === "hourly_count"),
      );
      expect(velocityResult).toBeDefined();
      expect(velocityResult?.passed).toBe(false);
    });

    it("should block when hourly amount limit exceeded", () => {
      // Record a large payment
      const bigAttempt = createPaymentAttempt({
        id: "pay_big",
        amount: DEFAULT_VELOCITY_CONFIG.maxAmountPerHour - 100,
      });
      detector.recordAttempt(bigAttempt);

      // Next payment should push over the limit
      const nextAttempt = createPaymentAttempt({
        id: "pay_over",
        amount: 200,
      });
      const results = detector.checkPaymentAttempt(nextAttempt);
      const amountResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          r.metadata?.type === "hourly_amount",
      );
      expect(amountResult).toBeDefined();
      expect(amountResult?.passed).toBe(false);
    });

    it("should block when daily amount limit exceeded", () => {
      // Record large payments over the day
      const numPayments = 5;
      const amountPerPayment = Math.floor(
        DEFAULT_VELOCITY_CONFIG.maxAmountPerDay / numPayments,
      );
      for (let i = 0; i < numPayments; i++) {
        detector.recordAttempt(
          createPaymentAttempt({
            id: `pay_${i}`,
            amount: amountPerPayment,
            timestamp: Date.now() - i * 3600 * 1000,
          }),
        );
      }

      const nextAttempt = createPaymentAttempt({
        id: "pay_daily_over",
        amount: amountPerPayment,
      });
      const results = detector.checkPaymentAttempt(nextAttempt);
      const hasVelocityBlock = results.some(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          (r.metadata?.type === "daily_amount" ||
            r.metadata?.type === "hourly_amount"),
      );
      expect(hasVelocityBlock).toBe(true);
    });

    it("should track attempts per user independently", () => {
      // Fill up user-1's velocity limit
      for (let i = 0; i < DEFAULT_VELOCITY_CONFIG.maxAttemptsPerHour; i++) {
        detector.recordAttempt(
          createPaymentAttempt({
            id: `pay_u1_${i}`,
            userId: "user-1",
          }),
        );
      }

      // user-2 should still be allowed
      const user2Attempt = createPaymentAttempt({
        id: "pay_u2_1",
        userId: "user-2",
      });
      const results = detector.checkPaymentAttempt(user2Attempt);
      const velocityResult = results.find(
        (r) => r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
      );
      expect(velocityResult).toBeUndefined();
    });
  });

  describe("amount anomaly detection", () => {
    it("should block amounts above maximum", () => {
      const attempt = createPaymentAttempt({
        amount: DEFAULT_FRAUD_CONFIG.maxSinglePaymentAmount + 1,
      });
      const results = detector.checkPaymentAttempt(attempt);
      const amountResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.AMOUNT_ANOMALY &&
          r.metadata?.type === "max_exceeded",
      );
      expect(amountResult).toBeDefined();
      expect(amountResult?.passed).toBe(false);
    });

    it("should block amounts below minimum", () => {
      const attempt = createPaymentAttempt({
        amount: DEFAULT_FRAUD_CONFIG.minSinglePaymentAmount - 1,
      });
      const results = detector.checkPaymentAttempt(attempt);
      const amountResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.AMOUNT_ANOMALY &&
          r.metadata?.type === "min_below",
      );
      expect(amountResult).toBeDefined();
      expect(amountResult?.passed).toBe(false);
    });

    it("should flag suspicious amount patterns", () => {
      for (const amount of DEFAULT_FRAUD_CONFIG.suspiciousAmountPatterns) {
        const attempt = createPaymentAttempt({ amount });
        const results = detector.checkPaymentAttempt(attempt);
        const patternResult = results.find(
          (r) =>
            r.code === SecurityCheckCode.AMOUNT_ANOMALY &&
            r.metadata?.type === "suspicious_pattern",
        );
        expect(patternResult).toBeDefined();
        expect(patternResult?.passed).toBe(false);
      }
    });

    it("should pass for normal amounts", () => {
      const attempt = createPaymentAttempt({ amount: 2999 });
      const results = detector.checkPaymentAttempt(attempt);
      const amountResult = results.find(
        (r) => r.code === SecurityCheckCode.AMOUNT_ANOMALY,
      );
      expect(amountResult).toBeUndefined();
    });
  });

  describe("address blacklist and sanctions", () => {
    it("should block blacklisted addresses", () => {
      const blacklisted = "0x" + "dead".repeat(10);
      const fraudDetector = new FraudDetector(undefined, [blacklisted]);

      const result = fraudDetector.checkAddress(blacklisted);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.BLACKLISTED_ADDRESS);
    });

    it("should block sanctioned addresses (OFAC)", () => {
      const sanctioned = "0x" + "bad0".repeat(10);
      const fraudDetector = new FraudDetector(undefined, undefined, [
        sanctioned,
      ]);

      const result = fraudDetector.checkAddress(sanctioned);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SANCTIONS_MATCH);
    });

    it("should be case-insensitive for address checks", () => {
      const addr = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";
      const fraudDetector = new FraudDetector(undefined, [addr.toLowerCase()]);

      const result = fraudDetector.checkAddress(addr.toUpperCase());
      expect(result.passed).toBe(false);
    });

    it("should pass for non-blacklisted addresses", () => {
      const result = detector.checkAddress("0x" + "1".repeat(40));
      expect(result.passed).toBe(true);
    });

    it("should allow runtime blacklist updates", () => {
      const addr = "0x" + "f".repeat(40);
      expect(detector.isBlacklisted(addr)).toBe(false);

      detector.addToBlacklist(addr);
      expect(detector.isBlacklisted(addr)).toBe(true);

      detector.removeFromBlacklist(addr);
      expect(detector.isBlacklisted(addr)).toBe(false);
    });

    it("should prioritize sanctions over blacklist", () => {
      const addr = "0x" + "e".repeat(40);
      const fraudDetector = new FraudDetector(undefined, [addr], [addr]);

      const result = fraudDetector.checkAddress(addr);
      // Sanctions check should come first and is more severe
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SANCTIONS_MATCH);
    });

    it("should respect enableSanctionsScreening config", () => {
      const addr = "0x" + "e".repeat(40);
      const fraudDetector = new FraudDetector(
        { enableSanctionsScreening: false },
        undefined,
        [addr],
      );

      const result = fraudDetector.checkAddress(addr);
      expect(result.passed).toBe(true); // Sanctions screening disabled
    });

    it("should respect enableAddressBlacklist config", () => {
      const addr = "0x" + "e".repeat(40);
      const fraudDetector = new FraudDetector(
        { enableAddressBlacklist: false },
        [addr],
      );

      const result = fraudDetector.checkAddress(addr);
      expect(result.passed).toBe(true); // Blacklist disabled
    });
  });

  describe("cooldown after failure", () => {
    it("should enforce cooldown after payment failure", () => {
      detector.recordFailure("user-1");

      const attempt = createPaymentAttempt({ userId: "user-1" });
      const results = detector.checkPaymentAttempt(attempt);
      const cooldownResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          r.metadata?.type === "cooldown",
      );
      expect(cooldownResult).toBeDefined();
      expect(cooldownResult?.passed).toBe(false);
    });

    it("should allow after cooldown expires", () => {
      const customDetector = new FraudDetector({
        velocity: { ...DEFAULT_VELOCITY_CONFIG, cooldownAfterFailureMs: 1 },
      });
      customDetector.recordFailure("user-1");

      // Wait for cooldown
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }

      const attempt = createPaymentAttempt({ userId: "user-1" });
      const results = customDetector.checkPaymentAttempt(attempt);
      const cooldownResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          r.metadata?.type === "cooldown",
      );
      expect(cooldownResult).toBeUndefined();
    });

    it("should not affect other users", () => {
      detector.recordFailure("user-1");

      const attempt = createPaymentAttempt({ userId: "user-2" });
      const results = detector.checkPaymentAttempt(attempt);
      const cooldownResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          r.metadata?.type === "cooldown",
      );
      expect(cooldownResult).toBeUndefined();
    });
  });

  describe("card velocity", () => {
    it("should block too many unique cards per day", () => {
      const limit = DEFAULT_VELOCITY_CONFIG.maxUniqueCardsPerDay;
      for (let i = 0; i < limit; i++) {
        detector.recordAttempt(
          createPaymentAttempt({
            id: `pay_card_${i}`,
            fingerprint: `fp_${i}`,
          }),
        );
      }

      const attempt = createPaymentAttempt({
        id: "pay_card_exceed",
        fingerprint: `fp_new`,
      });
      const results = detector.checkPaymentAttempt(attempt);
      const cardResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          r.metadata?.type === "card_velocity",
      );
      expect(cardResult).toBeDefined();
      expect(cardResult?.passed).toBe(false);
    });

    it("should allow reuse of the same card", () => {
      for (let i = 0; i < 3; i++) {
        detector.recordAttempt(
          createPaymentAttempt({
            id: `pay_${i}`,
            fingerprint: "fp_same",
          }),
        );
      }

      const attempt = createPaymentAttempt({
        id: "pay_same_again",
        fingerprint: "fp_same",
      });
      const results = detector.checkPaymentAttempt(attempt);
      const cardResult = results.find(
        (r) =>
          r.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          r.metadata?.type === "card_velocity",
      );
      expect(cardResult).toBeUndefined();
    });
  });

  describe("suspicious pattern detection", () => {
    it("should detect rapidly increasing amounts", () => {
      // Record increasing amounts
      detector.recordAttempt(
        createPaymentAttempt({
          id: "p1",
          amount: 100,
          timestamp: Date.now() - 5000,
        }),
      );
      detector.recordAttempt(
        createPaymentAttempt({
          id: "p2",
          amount: 200,
          timestamp: Date.now() - 4000,
        }),
      );
      detector.recordAttempt(
        createPaymentAttempt({
          id: "p3",
          amount: 400,
          timestamp: Date.now() - 3000,
        }),
      );
      detector.recordAttempt(
        createPaymentAttempt({
          id: "p4",
          amount: 800,
          timestamp: Date.now() - 2000,
        }),
      );
      detector.recordAttempt(
        createPaymentAttempt({
          id: "p5",
          amount: 1600,
          timestamp: Date.now() - 1000,
        }),
      );

      const result = detector.detectSuspiciousPatterns("user-1");
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SUSPICIOUS_PATTERN);
      expect(result.metadata?.pattern).toBe("increasing_amounts");
    });

    it("should detect many small transactions (smurfing)", () => {
      // Record many small transactions within an hour
      for (let i = 0; i < 6; i++) {
        detector.recordAttempt(
          createPaymentAttempt({
            id: `smurph_${i}`,
            amount: 500, // $5.00
            timestamp: Date.now() - i * 60 * 1000, // Last hour
          }),
        );
      }

      const result = detector.detectSuspiciousPatterns("user-1");
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SUSPICIOUS_PATTERN);
      expect(result.metadata?.pattern).toBe("smurfing");
    });

    it("should pass for normal payment patterns", () => {
      detector.recordAttempt(createPaymentAttempt({ id: "p1", amount: 9900 }));
      detector.recordAttempt(createPaymentAttempt({ id: "p2", amount: 9900 }));
      detector.recordAttempt(createPaymentAttempt({ id: "p3", amount: 9900 }));

      const result = detector.detectSuspiciousPatterns("user-1");
      // Same amounts - not "increasing", and > 1000 so not "smurfing"
      expect(result.passed).toBe(true);
    });

    it("should return passed for users with too few attempts", () => {
      detector.recordAttempt(createPaymentAttempt({ id: "p1", amount: 100 }));

      const result = detector.detectSuspiciousPatterns("user-1");
      expect(result.passed).toBe(true);
    });
  });
});

// ============================================================================
// Webhook Signature Validation Tests
// ============================================================================

describe("WebhookSignatureValidator", () => {
  let validator: WebhookSignatureValidator;
  const secret = "whsec_test_secret_key_12345";

  beforeEach(() => {
    validator = new WebhookSignatureValidator();
  });

  describe("signature verification", () => {
    it("should accept valid signatures", () => {
      const payload = JSON.stringify({ type: "checkout.session.completed" });
      const { signature, timestamp } = validator.generateSignature(
        payload,
        secret,
      );

      const result = validator.verify({
        payload,
        signature,
        secret,
        timestamp,
      });
      expect(result.passed).toBe(true);
      expect(result.code).toBe(SecurityCheckCode.CHECK_PASSED);
    });

    it("should reject invalid signatures", () => {
      const payload = JSON.stringify({ type: "invoice.paid" });
      const timestamp = Math.floor(Date.now() / 1000);

      const result = validator.verify({
        payload,
        signature: "invalid_signature_string",
        secret,
        timestamp,
      });
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SIGNATURE_INVALID);
    });

    it("should reject tampered payloads", () => {
      const originalPayload = JSON.stringify({ amount: 1000 });
      const { signature, timestamp } = validator.generateSignature(
        originalPayload,
        secret,
      );

      const tamperedPayload = JSON.stringify({ amount: 100000 });
      const result = validator.verify({
        payload: tamperedPayload,
        signature,
        secret,
        timestamp,
      });
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SIGNATURE_INVALID);
    });

    it("should reject wrong secret", () => {
      const payload = "test payload";
      const { signature, timestamp } = validator.generateSignature(
        payload,
        secret,
      );

      const result = validator.verify({
        payload,
        signature,
        secret: "wrong_secret",
        timestamp,
      });
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.SIGNATURE_INVALID);
    });
  });

  describe("timestamp validation", () => {
    it("should reject expired timestamps", () => {
      const payload = "test";
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const { signature } = validator.generateSignature(
        payload,
        secret,
        oldTimestamp,
      );

      const result = validator.verify({
        payload,
        signature,
        secret,
        timestamp: oldTimestamp,
        maxAgeSeconds: 300,
      });
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.TIMESTAMP_EXPIRED);
    });

    it("should reject future timestamps", () => {
      const payload = "test";
      const futureTimestamp = Math.floor(Date.now() / 1000) + 120; // 2 minutes in future
      const { signature } = validator.generateSignature(
        payload,
        secret,
        futureTimestamp,
      );

      const result = validator.verify({
        payload,
        signature,
        secret,
        timestamp: futureTimestamp,
      });
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.TIMESTAMP_EXPIRED);
    });

    it("should accept recent timestamps within window", () => {
      const payload = "test";
      const recentTimestamp = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago
      const { signature } = validator.generateSignature(
        payload,
        secret,
        recentTimestamp,
      );

      const result = validator.verify({
        payload,
        signature,
        secret,
        timestamp: recentTimestamp,
      });
      expect(result.passed).toBe(true);
    });

    it("should handle custom max age", () => {
      const payload = "test";
      const ts = Math.floor(Date.now() / 1000) - 10;
      const { signature } = validator.generateSignature(payload, secret, ts);

      // Reject with 5 second max
      const result = validator.verify({
        payload,
        signature,
        secret,
        timestamp: ts,
        maxAgeSeconds: 5,
      });
      expect(result.passed).toBe(false);
    });
  });

  describe("replay protection", () => {
    it("should detect replayed webhooks", () => {
      const payload = "webhook body";
      const { signature, timestamp } = validator.generateSignature(
        payload,
        secret,
      );

      // First request should pass
      const first = validator.verify({
        payload,
        signature,
        secret,
        timestamp,
      });
      expect(first.passed).toBe(true);

      // Replay should be detected
      const replay = validator.verify({
        payload,
        signature,
        secret,
        timestamp,
      });
      expect(replay.passed).toBe(false);
      expect(replay.code).toBe(SecurityCheckCode.REPLAY_DETECTED);
    });

    it("should allow different signatures", () => {
      const payload1 = "payload 1";
      const payload2 = "payload 2";
      const sig1 = validator.generateSignature(payload1, secret);
      const sig2 = validator.generateSignature(payload2, secret);

      const result1 = validator.verify({
        payload: payload1,
        signature: sig1.signature,
        secret,
        timestamp: sig1.timestamp,
      });
      const result2 = validator.verify({
        payload: payload2,
        signature: sig2.signature,
        secret,
        timestamp: sig2.timestamp,
      });

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(true);
    });
  });

  describe("timing-safe comparison", () => {
    it("should compare equal strings as equal", () => {
      expect(validator.timingSafeCompare("hello", "hello")).toBe(true);
    });

    it("should compare different strings as not equal", () => {
      expect(validator.timingSafeCompare("hello", "world")).toBe(false);
    });

    it("should handle different lengths", () => {
      expect(validator.timingSafeCompare("short", "longer-string")).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(validator.timingSafeCompare("", "")).toBe(true);
    });

    it("should handle one empty string", () => {
      expect(validator.timingSafeCompare("", "non-empty")).toBe(false);
    });

    it("should reject non-string inputs", () => {
      expect(validator.timingSafeCompare(null as any, "test")).toBe(false);
      expect(validator.timingSafeCompare("test", undefined as any)).toBe(false);
      expect(validator.timingSafeCompare(123 as any, 456 as any)).toBe(false);
    });
  });

  describe("signature header parsing", () => {
    it("should parse valid Stripe-style headers", () => {
      const result = validator.parseSignatureHeader(
        "t=1614000000,v1=abc123def456",
      );
      expect(result).not.toBeNull();
      expect(result!.timestamp).toBe(1614000000);
      expect(result!.signatures).toEqual(["abc123def456"]);
    });

    it("should parse headers with multiple signatures", () => {
      const result = validator.parseSignatureHeader(
        "t=1614000000,v1=sig1,v1=sig2",
      );
      expect(result).not.toBeNull();
      expect(result!.signatures).toEqual(["sig1", "sig2"]);
    });

    it("should return null for invalid headers", () => {
      expect(validator.parseSignatureHeader("")).toBeNull();
      expect(validator.parseSignatureHeader("invalid")).toBeNull();
      expect(validator.parseSignatureHeader("t=0")).toBeNull(); // timestamp 0
      expect(validator.parseSignatureHeader("v1=sig")).toBeNull(); // no timestamp
    });

    it("should generate valid signature headers", () => {
      const { header, timestamp, signature } = validator.generateSignature(
        "test",
        secret,
      );
      expect(header).toBe(`t=${timestamp},v1=${signature}`);

      const parsed = validator.parseSignatureHeader(header);
      expect(parsed).not.toBeNull();
      expect(parsed!.timestamp).toBe(timestamp);
      expect(parsed!.signatures[0]).toBe(signature);
    });
  });
});

// ============================================================================
// Payment Reconciliation Tests
// ============================================================================

describe("PaymentReconciler", () => {
  let reconciler: PaymentReconciler;

  beforeEach(() => {
    reconciler = new PaymentReconciler();
  });

  describe("ledger reconciliation", () => {
    it("should report consistency when ledgers match", () => {
      const piId = "pi_match_1";
      const internal = [
        createLedgerEntry({ paymentIntentId: piId, amount: 9900 }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: piId,
          amount: 9900,
        }),
      ];

      const result = reconciler.reconcile(internal, external);
      expect(result.isConsistent).toBe(true);
      expect(result.discrepancy).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect amount mismatches", () => {
      const piId = "pi_mismatch";
      const internal = [
        createLedgerEntry({ paymentIntentId: piId, amount: 9900 }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: piId,
          amount: 10000,
        }),
      ];

      const result = reconciler.reconcile(internal, external);
      expect(result.isConsistent).toBe(false);
      const mismatch = result.issues.find(
        (i) => i.code === SecurityCheckCode.LEDGER_MISMATCH,
      );
      expect(mismatch).toBeDefined();
      expect(mismatch?.metadata?.discrepancy).toBe(100);
    });

    it("should detect orphan external payments", () => {
      const internal: LedgerEntry[] = [];
      const external = [
        createLedgerEntry({
          id: "ext_orphan",
          paymentIntentId: "pi_orphan",
        }),
      ];

      const result = reconciler.reconcile(internal, external);
      expect(result.isConsistent).toBe(false);
      expect(result.orphanPayments).toHaveLength(1);
      const orphanIssue = result.issues.find(
        (i) => i.code === SecurityCheckCode.ORPHAN_PAYMENT,
      );
      expect(orphanIssue).toBeDefined();
    });

    it("should detect orphan internal records", () => {
      const internal = [
        createLedgerEntry({
          paymentIntentId: "pi_internal_only",
        }),
      ];
      const external: LedgerEntry[] = [];

      const result = reconciler.reconcile(internal, external);
      expect(result.isConsistent).toBe(false);
      expect(result.orphanPayments).toHaveLength(1);
    });

    it("should detect duplicate charges", () => {
      const chargeId = "ch_duplicate";
      const piId = "pi_dup";
      const internal = [
        createLedgerEntry({
          paymentIntentId: piId,
          chargeId,
          amount: 9900,
        }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: piId,
          chargeId,
          amount: 9900,
        }),
      ];

      const result = reconciler.reconcile(internal, external);
      // Same chargeId in both - should detect as duplicate
      expect(result.duplicateCharges.length).toBeGreaterThan(0);
      const dupIssue = result.issues.find(
        (i) => i.code === SecurityCheckCode.DUPLICATE_CHARGE,
      );
      expect(dupIssue).toBeDefined();
    });

    it("should detect refund inconsistencies", () => {
      const piId = "pi_refund";
      const internal = [
        createLedgerEntry({
          paymentIntentId: piId,
          amount: 9900,
          type: "charge",
        }),
        createLedgerEntry({
          paymentIntentId: piId,
          amount: 5000,
          type: "refund",
          chargeId: "ch_refund_internal",
        }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: piId,
          amount: 9900,
          type: "charge",
          chargeId: "ch_charge_ext",
        }),
        createLedgerEntry({
          id: "ext_2",
          paymentIntentId: piId,
          amount: 3000,
          type: "refund",
          chargeId: "ch_refund_ext",
        }),
      ];

      const result = reconciler.reconcile(internal, external);
      expect(result.isConsistent).toBe(false);
      const refundIssue = result.issues.find(
        (i) => i.code === SecurityCheckCode.REFUND_INCONSISTENCY,
      );
      expect(refundIssue).toBeDefined();
    });

    it("should handle multiple payments correctly", () => {
      const internal = [
        createLedgerEntry({
          paymentIntentId: "pi_1",
          amount: 5000,
          chargeId: "ch_i1",
        }),
        createLedgerEntry({
          paymentIntentId: "pi_2",
          amount: 10000,
          chargeId: "ch_i2",
        }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: "pi_1",
          amount: 5000,
          chargeId: "ch_e1",
        }),
        createLedgerEntry({
          id: "ext_2",
          paymentIntentId: "pi_2",
          amount: 10000,
          chargeId: "ch_e2",
        }),
      ];

      const result = reconciler.reconcile(internal, external);
      expect(result.isConsistent).toBe(true);
      expect(result.totalInternalAmount).toBe(15000);
      expect(result.totalExternalAmount).toBe(15000);
    });
  });

  describe("orphan detection", () => {
    it("should detect entries without subscription ID", () => {
      const entries = [
        createLedgerEntry({ subscriptionId: undefined }),
        createLedgerEntry({ subscriptionId: "sub_valid" }),
      ];

      const orphans = reconciler.detectOrphanPayments(entries);
      expect(orphans).toHaveLength(1);
    });

    it("should detect entries without workspace ID", () => {
      const entries = [
        createLedgerEntry({ workspaceId: "" }),
        createLedgerEntry({ workspaceId: "ws_valid" }),
      ];

      const orphans = reconciler.detectOrphanPayments(entries);
      expect(orphans).toHaveLength(1);
    });
  });

  describe("net amount validation", () => {
    it("should pass for correct net amount", () => {
      const entries = [
        createLedgerEntry({ amount: 10000, type: "charge" }),
        createLedgerEntry({ amount: 3000, type: "refund" }),
      ];

      const result = reconciler.validateNetAmount(entries, 7000);
      expect(result.passed).toBe(true);
    });

    it("should fail for incorrect net amount", () => {
      const entries = [
        createLedgerEntry({ amount: 10000, type: "charge" }),
        createLedgerEntry({ amount: 3000, type: "refund" }),
      ];

      const result = reconciler.validateNetAmount(entries, 5000);
      expect(result.passed).toBe(false);
      expect(result.code).toBe(SecurityCheckCode.LEDGER_MISMATCH);
    });

    it("should handle charges only", () => {
      const entries = [
        createLedgerEntry({ amount: 5000, type: "charge" }),
        createLedgerEntry({ amount: 3000, type: "charge" }),
      ];

      const result = reconciler.validateNetAmount(entries, 8000);
      expect(result.passed).toBe(true);
    });

    it("should handle full refunds", () => {
      const entries = [
        createLedgerEntry({ amount: 10000, type: "charge" }),
        createLedgerEntry({ amount: 10000, type: "refund" }),
      ];

      const result = reconciler.validateNetAmount(entries, 0);
      expect(result.passed).toBe(true);
    });
  });
});

// ============================================================================
// Payment Security Service (Integration) Tests
// ============================================================================

describe("PaymentSecurityService", () => {
  let service: PaymentSecurityService;

  beforeEach(() => {
    service = createPaymentSecurityService({ enableLogging: false });
  });

  afterEach(() => {
    service.reset();
  });

  describe("Stripe payment assessment", () => {
    it("should allow legitimate first-time payments", () => {
      const attempt = createPaymentAttempt();
      const assessment = service.assessStripePayment(attempt);

      expect(assessment.allowed).toBe(true);
      expect(assessment.riskLevel).toBe("low");
      expect(assessment.riskScore).toBeLessThan(25);
    });

    it("should block replayed payment attempts", () => {
      const attempt = createPaymentAttempt({ id: "pay_replay" });

      service.assessStripePayment(attempt); // First time
      const replay = service.assessStripePayment(attempt); // Replay

      expect(replay.allowed).toBe(false);
      expect(replay.riskLevel).toBe("critical");
      const replayCheck = replay.failedChecks.find(
        (c) => c.code === SecurityCheckCode.REPLAY_DETECTED,
      );
      expect(replayCheck).toBeDefined();
    });

    it("should detect velocity abuse across multiple payments", () => {
      // Make many rapid payments
      for (let i = 0; i < DEFAULT_VELOCITY_CONFIG.maxAttemptsPerHour; i++) {
        service.assessStripePayment(
          createPaymentAttempt({ id: `pay_vel_${i}` }),
        );
      }

      const nextAttempt = createPaymentAttempt({ id: "pay_vel_over" });
      const assessment = service.assessStripePayment(nextAttempt);
      expect(assessment.allowed).toBe(false); // Should be blocked due to velocity
    });

    it("should include suspicious pattern detection", () => {
      // Record increasing amounts
      for (let i = 1; i <= 5; i++) {
        service.assessStripePayment(
          createPaymentAttempt({
            id: `pay_inc_${i}`,
            amount: i * 1000,
            timestamp: Date.now() - (5 - i) * 1000,
          }),
        );
      }

      // The assessment runs pattern detection
      const assessment = service.assessStripePayment(
        createPaymentAttempt({
          id: "pay_inc_6",
          amount: 6000,
        }),
      );

      // Should have pattern check in results
      const patternCheck = assessment.checks.find(
        (c) => c.code === SecurityCheckCode.SUSPICIOUS_PATTERN,
      );
      expect(patternCheck).toBeDefined();
    });
  });

  describe("crypto payment assessment", () => {
    it("should allow valid crypto payments", () => {
      const tx = createCryptoTx();
      const attempt = createPaymentAttempt({ method: "crypto" });

      const assessment = service.assessCryptoPayment(tx, attempt);
      expect(assessment.allowed).toBe(true);
    });

    it("should block double-spend crypto attempts", () => {
      const tx = createCryptoTx();
      const attempt1 = createPaymentAttempt({
        id: "pay_crypto_1",
        method: "crypto",
      });
      const attempt2 = createPaymentAttempt({
        id: "pay_crypto_2",
        method: "crypto",
      });

      service.assessCryptoPayment(tx, attempt1); // First use
      const replay = service.assessCryptoPayment(tx, attempt2); // Double-spend

      expect(replay.allowed).toBe(false);
      const dsCheck = replay.failedChecks.find(
        (c) => c.code === SecurityCheckCode.DOUBLE_SPEND_DETECTED,
      );
      expect(dsCheck).toBeDefined();
    });

    it("should block blacklisted crypto addresses", () => {
      const badAddr = "0x" + "dead".repeat(10);
      service.blacklistAddress(badAddr);

      const tx = createCryptoTx({ fromAddress: badAddr });
      const attempt = createPaymentAttempt({ method: "crypto" });

      const assessment = service.assessCryptoPayment(tx, attempt);
      expect(assessment.allowed).toBe(false);
      const blacklistCheck = assessment.failedChecks.find(
        (c) => c.code === SecurityCheckCode.BLACKLISTED_ADDRESS,
      );
      expect(blacklistCheck).toBeDefined();
    });

    it("should block sanctioned crypto addresses", () => {
      const sanctionedAddr = "0x" + "bad0".repeat(10);
      service.addSanctionedAddress(sanctionedAddr);

      const tx = createCryptoTx({ fromAddress: sanctionedAddr });
      const attempt = createPaymentAttempt({ method: "crypto" });

      const assessment = service.assessCryptoPayment(tx, attempt);
      expect(assessment.allowed).toBe(false);
    });

    it("should block transactions with insufficient confirmations", () => {
      const tx = createCryptoTx({ confirmations: 2 });
      const attempt = createPaymentAttempt({ method: "crypto" });

      const assessment = service.assessCryptoPayment(tx, attempt);
      expect(assessment.allowed).toBe(false);
    });

    it("should validate transaction hash format", () => {
      const tx = createCryptoTx({ txHash: "invalid-hash" });
      const attempt = createPaymentAttempt({ method: "crypto" });

      const assessment = service.assessCryptoPayment(tx, attempt);
      expect(assessment.allowed).toBe(false);
    });
  });

  describe("webhook verification", () => {
    const webhookSecret = "whsec_test_123";

    it("should verify valid webhooks", () => {
      const validator = new WebhookSignatureValidator();
      const payload = '{"event":"test"}';
      const { signature, timestamp } = validator.generateSignature(
        payload,
        webhookSecret,
      );

      const result = service.verifyWebhook({
        payload,
        signature,
        secret: webhookSecret,
        timestamp,
      });
      expect(result.passed).toBe(true);
    });

    it("should reject invalid webhook signatures", () => {
      const result = service.verifyWebhook({
        payload: '{"event":"test"}',
        signature: "bad_sig",
        secret: webhookSecret,
        timestamp: Math.floor(Date.now() / 1000),
      });
      expect(result.passed).toBe(false);
    });

    it("should verify Stripe-style webhook headers", () => {
      const validator = new WebhookSignatureValidator();
      const payload = '{"type":"invoice.paid"}';
      const { header } = validator.generateSignature(payload, webhookSecret);

      const result = service.verifyStripeWebhook(
        payload,
        header,
        webhookSecret,
      );
      expect(result.passed).toBe(true);
    });

    it("should reject invalid Stripe-style headers", () => {
      const result = service.verifyStripeWebhook(
        '{"type":"test"}',
        "invalid-header-format",
        webhookSecret,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe("reconciliation", () => {
    it("should reconcile matching ledgers", () => {
      const piId = "pi_test";
      const internal = [
        createLedgerEntry({ paymentIntentId: piId, amount: 5000 }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: piId,
          amount: 5000,
        }),
      ];

      const result = service.reconcilePayments(internal, external);
      expect(result.isConsistent).toBe(true);
    });

    it("should detect discrepancies in reconciliation", () => {
      const piId = "pi_test";
      const internal = [
        createLedgerEntry({ paymentIntentId: piId, amount: 5000 }),
      ];
      const external = [
        createLedgerEntry({
          id: "ext_1",
          paymentIntentId: piId,
          amount: 6000,
        }),
      ];

      const result = service.reconcilePayments(internal, external);
      expect(result.isConsistent).toBe(false);
    });

    it("should detect orphan payments", () => {
      const entries = [
        createLedgerEntry({ subscriptionId: undefined, workspaceId: "" }),
      ];
      const orphans = service.detectOrphanPayments(entries);
      expect(orphans).toHaveLength(1);
    });

    it("should validate net amounts", () => {
      const entries = [
        createLedgerEntry({ amount: 10000, type: "charge" }),
        createLedgerEntry({ amount: 2000, type: "refund" }),
      ];

      expect(service.validateNetAmount(entries, 8000).passed).toBe(true);
      expect(service.validateNetAmount(entries, 7000).passed).toBe(false);
    });
  });

  describe("idempotency", () => {
    it("should detect processed events", () => {
      service.recordProcessedEvent("evt_1");
      expect(service.isEventProcessed("evt_1")).toBe(true);
      expect(service.isEventProcessed("evt_2")).toBe(false);
    });

    it("should generate unique idempotency keys", () => {
      const key1 = service.generateIdempotencyKey();
      const key2 = service.generateIdempotencyKey();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(64);
    });

    it("should generate consistent checksums", () => {
      const payload = "test-payload";
      const cs1 = service.generatePayloadChecksum(payload);
      const cs2 = service.generatePayloadChecksum(payload);
      expect(cs1).toBe(cs2);
    });

    it("should generate different checksums for different payloads", () => {
      const cs1 = service.generatePayloadChecksum("payload-1");
      const cs2 = service.generatePayloadChecksum("payload-2");
      expect(cs1).not.toBe(cs2);
    });
  });

  describe("risk scoring", () => {
    it("should assign low risk to clean payments", () => {
      const attempt = createPaymentAttempt();
      const assessment = service.assessStripePayment(attempt);
      expect(assessment.riskLevel).toBe("low");
      expect(assessment.riskScore).toBeLessThan(25);
    });

    it("should assign critical risk to replayed payments", () => {
      const attempt = createPaymentAttempt({ id: "pay_risk" });
      service.assessStripePayment(attempt);
      const replay = service.assessStripePayment(attempt);
      expect(replay.riskLevel).toBe("critical");
      expect(replay.riskScore).toBeGreaterThanOrEqual(40);
    });

    it("should have an assessment ID", () => {
      const attempt = createPaymentAttempt();
      const assessment = service.assessStripePayment(attempt);
      expect(assessment.assessmentId).toBeTruthy();
      expect(assessment.assessmentId.length).toBe(16);
    });

    it("should include timestamp", () => {
      const before = Date.now();
      const attempt = createPaymentAttempt();
      const assessment = service.assessStripePayment(attempt);
      expect(assessment.timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe("admin operations", () => {
    it("should cleanup expired entries", () => {
      const shortService = createPaymentSecurityService({
        replayTTLMs: 1,
        enableLogging: false,
      });
      shortService.recordProcessedEvent("evt_old");

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }

      const cleaned = shortService.cleanupExpiredEntries();
      expect(cleaned).toBeGreaterThanOrEqual(1);
    });

    it("should record payment failures for cooldown", () => {
      service.recordPaymentFailure("user-1");

      const attempt = createPaymentAttempt({ userId: "user-1" });
      const assessment = service.assessStripePayment(attempt);
      const cooldownCheck = assessment.failedChecks.find(
        (c) =>
          c.code === SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED &&
          c.metadata?.type === "cooldown",
      );
      expect(cooldownCheck).toBeDefined();
    });

    it("should update transaction confirmations and detect reorgs", () => {
      const tx = createCryptoTx({ confirmations: 15 });
      const attempt = createPaymentAttempt({ method: "crypto" });
      service.assessCryptoPayment(tx, attempt);

      // Simulate reorg
      const reorgResult = service.updateTransactionConfirmations(
        tx.txHash,
        3,
        12345600,
      );
      expect(reorgResult).not.toBeNull();
      expect(reorgResult!.code).toBe(SecurityCheckCode.BLOCK_REORG_DETECTED);
    });

    it("should check transaction confirmation status", () => {
      const tx = createCryptoTx({ confirmations: 15 });
      const attempt = createPaymentAttempt({ method: "crypto" });
      service.assessCryptoPayment(tx, attempt);

      expect(service.isTransactionConfirmed(tx.txHash)).toBe(true);
    });

    it("should reset all state", () => {
      service.recordProcessedEvent("evt_1");
      service.blacklistAddress("0x" + "1".repeat(40));

      service.reset();

      expect(service.isEventProcessed("evt_1")).toBe(false);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("generateNonce", () => {
    it("should generate 64 character hex strings", () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate unique nonces", () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe("generateChecksum", () => {
    it("should produce consistent checksums", () => {
      const cs1 = generateChecksum("hello");
      const cs2 = generateChecksum("hello");
      expect(cs1).toBe(cs2);
    });

    it("should produce different checksums for different inputs", () => {
      const cs1 = generateChecksum("hello");
      const cs2 = generateChecksum("world");
      expect(cs1).not.toBe(cs2);
    });

    it("should produce hex string checksums", () => {
      const cs = generateChecksum("test");
      expect(cs).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("isValidEthAddress", () => {
    it("should accept valid addresses", () => {
      expect(isValidEthAddress("0x" + "1".repeat(40))).toBe(true);
      expect(
        isValidEthAddress("0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"),
      ).toBe(true);
    });

    it("should reject invalid addresses", () => {
      expect(isValidEthAddress("")).toBe(false);
      expect(isValidEthAddress("0x")).toBe(false);
      expect(isValidEthAddress("0x" + "1".repeat(39))).toBe(false);
      expect(isValidEthAddress("0x" + "1".repeat(41))).toBe(false);
      expect(isValidEthAddress("1".repeat(40))).toBe(false); // Missing 0x prefix
      expect(isValidEthAddress("0x" + "g".repeat(40))).toBe(false); // Invalid hex
    });
  });

  describe("isValidBtcAddress", () => {
    it("should accept bech32 addresses", () => {
      expect(
        isValidBtcAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"),
      ).toBe(true);
    });

    it("should accept legacy addresses", () => {
      expect(isValidBtcAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")).toBe(
        true,
      );
      expect(isValidBtcAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBe(
        true,
      );
    });

    it("should reject invalid addresses", () => {
      expect(isValidBtcAddress("")).toBe(false);
      expect(isValidBtcAddress("invalid")).toBe(false);
      expect(isValidBtcAddress("0x" + "1".repeat(40))).toBe(false); // ETH address
    });
  });

  describe("isValidTxHash", () => {
    it("should accept valid EVM tx hashes", () => {
      expect(isValidTxHash("0x" + "a".repeat(64), "ethereum")).toBe(true);
      expect(isValidTxHash("0x" + "f".repeat(64), "polygon")).toBe(true);
    });

    it("should accept valid Bitcoin tx hashes", () => {
      expect(isValidTxHash("a".repeat(64), "bitcoin")).toBe(true);
    });

    it("should reject invalid tx hashes", () => {
      expect(isValidTxHash("", "ethereum")).toBe(false);
      expect(isValidTxHash("invalid", "ethereum")).toBe(false);
      expect(isValidTxHash("0x" + "a".repeat(63), "ethereum")).toBe(false); // Too short
      expect(isValidTxHash("0x" + "g".repeat(64), "ethereum")).toBe(false); // Invalid hex
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Default Configurations", () => {
  it("should have reasonable velocity defaults", () => {
    expect(DEFAULT_VELOCITY_CONFIG.maxAttemptsPerHour).toBeGreaterThan(0);
    expect(DEFAULT_VELOCITY_CONFIG.maxAttemptsPerDay).toBeGreaterThan(
      DEFAULT_VELOCITY_CONFIG.maxAttemptsPerHour,
    );
    expect(DEFAULT_VELOCITY_CONFIG.maxAmountPerDay).toBeGreaterThan(
      DEFAULT_VELOCITY_CONFIG.maxAmountPerHour,
    );
    expect(DEFAULT_VELOCITY_CONFIG.cooldownAfterFailureMs).toBeGreaterThan(0);
  });

  it("should have reasonable fraud detection defaults", () => {
    expect(DEFAULT_FRAUD_CONFIG.maxSinglePaymentAmount).toBeGreaterThan(
      DEFAULT_FRAUD_CONFIG.minSinglePaymentAmount,
    );
    expect(
      DEFAULT_FRAUD_CONFIG.suspiciousAmountPatterns.length,
    ).toBeGreaterThan(0);
  });

  it("should have confirmation requirements for major networks", () => {
    expect(DEFAULT_CONFIRMATION_REQUIREMENTS.ethereum).toBeDefined();
    expect(DEFAULT_CONFIRMATION_REQUIREMENTS.bitcoin).toBeDefined();
    expect(DEFAULT_CONFIRMATION_REQUIREMENTS.polygon).toBeDefined();
  });

  it("should have a reasonable webhook max age", () => {
    expect(WEBHOOK_MAX_AGE_SECONDS).toBeGreaterThan(0);
    expect(WEBHOOK_MAX_AGE_SECONDS).toBeLessThanOrEqual(600);
  });
});
