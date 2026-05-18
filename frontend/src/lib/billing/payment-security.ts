/**
 * Payment Security Module
 *
 * Comprehensive abuse-resistant payment security checks including:
 * - Anti-replay protection for webhooks and crypto transactions
 * - Anti-double-spend detection for crypto payments
 * - Anti-fraud heuristics (velocity checks, amount anomalies, address blacklists)
 * - Webhook signature validation hardening (timing-safe comparison, replay window)
 * - Payment reconciliation checks (ledger consistency, orphan detection)
 *
 * @module @/lib/billing/payment-security
 * @version 1.0.0
 */

import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a security check.
 */
export interface SecurityCheckResult {
  passed: boolean;
  code: SecurityCheckCode;
  message: string;
  severity: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}

/**
 * Security check codes.
 */
export enum SecurityCheckCode {
  // Anti-replay
  REPLAY_DETECTED = "REPLAY_DETECTED",
  NONCE_REUSED = "NONCE_REUSED",
  STALE_WEBHOOK = "STALE_WEBHOOK",

  // Anti-double-spend
  DOUBLE_SPEND_DETECTED = "DOUBLE_SPEND_DETECTED",
  UNCONFIRMED_TX_REUSE = "UNCONFIRMED_TX_REUSE",
  BLOCK_REORG_DETECTED = "BLOCK_REORG_DETECTED",
  INSUFFICIENT_CONFIRMATIONS = "INSUFFICIENT_CONFIRMATIONS",

  // Anti-fraud
  VELOCITY_LIMIT_EXCEEDED = "VELOCITY_LIMIT_EXCEEDED",
  AMOUNT_ANOMALY = "AMOUNT_ANOMALY",
  BLACKLISTED_ADDRESS = "BLACKLISTED_ADDRESS",
  SUSPICIOUS_PATTERN = "SUSPICIOUS_PATTERN",
  SANCTIONS_MATCH = "SANCTIONS_MATCH",

  // Webhook security
  SIGNATURE_INVALID = "SIGNATURE_INVALID",
  TIMESTAMP_EXPIRED = "TIMESTAMP_EXPIRED",
  TIMING_ATTACK_DETECTED = "TIMING_ATTACK_DETECTED",

  // Reconciliation
  LEDGER_MISMATCH = "LEDGER_MISMATCH",
  ORPHAN_PAYMENT = "ORPHAN_PAYMENT",
  REFUND_INCONSISTENCY = "REFUND_INCONSISTENCY",
  DUPLICATE_CHARGE = "DUPLICATE_CHARGE",

  // Pass
  CHECK_PASSED = "CHECK_PASSED",
}

/**
 * Webhook verification input.
 */
export interface WebhookVerificationInput {
  payload: string;
  signature: string;
  secret: string;
  timestamp?: number;
  maxAgeSeconds?: number;
}

/**
 * Transaction verification input for crypto.
 */
export interface CryptoTransactionInput {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  currency: string;
  network: string;
  blockNumber?: number;
  confirmations?: number;
  timestamp?: number;
}

/**
 * Payment attempt for velocity tracking.
 */
export interface PaymentAttempt {
  id: string;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  method: "stripe" | "crypto";
  ipAddress?: string;
  fingerprint?: string;
  timestamp: number;
}

/**
 * Velocity check configuration.
 */
export interface VelocityConfig {
  maxAttemptsPerHour: number;
  maxAttemptsPerDay: number;
  maxAmountPerHour: number;
  maxAmountPerDay: number;
  maxUniqueCardsPerDay: number;
  cooldownAfterFailureMs: number;
}

/**
 * Fraud detection configuration.
 */
export interface FraudDetectionConfig {
  velocity: VelocityConfig;
  maxSinglePaymentAmount: number;
  minSinglePaymentAmount: number;
  suspiciousAmountPatterns: number[];
  enableSanctionsScreening: boolean;
  enableAddressBlacklist: boolean;
}

/**
 * Reconciliation entry for ledger checks.
 */
export interface LedgerEntry {
  id: string;
  paymentIntentId: string;
  chargeId?: string;
  subscriptionId?: string;
  workspaceId: string;
  amount: number;
  currency: string;
  type: "charge" | "refund" | "adjustment";
  status: "pending" | "settled" | "failed" | "disputed";
  externalAmount?: number;
  createdAt: Date;
  settledAt?: Date;
}

/**
 * Reconciliation report result.
 */
export interface ReconciliationCheckResult {
  isConsistent: boolean;
  totalInternalAmount: number;
  totalExternalAmount: number;
  discrepancy: number;
  orphanPayments: LedgerEntry[];
  duplicateCharges: LedgerEntry[];
  refundInconsistencies: LedgerEntry[];
  issues: SecurityCheckResult[];
}

/**
 * Confirmation requirements by network.
 */
export interface ConfirmationRequirements {
  [network: string]: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_VELOCITY_CONFIG: VelocityConfig = {
  maxAttemptsPerHour: 10,
  maxAttemptsPerDay: 30,
  maxAmountPerHour: 500000, // $5,000 in cents
  maxAmountPerDay: 2000000, // $20,000 in cents
  maxUniqueCardsPerDay: 5,
  cooldownAfterFailureMs: 30000, // 30 seconds
};

export const DEFAULT_FRAUD_CONFIG: FraudDetectionConfig = {
  velocity: DEFAULT_VELOCITY_CONFIG,
  maxSinglePaymentAmount: 1000000, // $10,000 in cents
  minSinglePaymentAmount: 50, // $0.50 in cents
  suspiciousAmountPatterns: [9999, 99999, 999999], // Amounts just under round thresholds
  enableSanctionsScreening: true,
  enableAddressBlacklist: true,
};

export const DEFAULT_CONFIRMATION_REQUIREMENTS: ConfirmationRequirements = {
  ethereum: 12,
  bitcoin: 6,
  polygon: 60,
  arbitrum: 12,
  base: 12,
};

// Max age for webhook timestamps: 5 minutes
export const WEBHOOK_MAX_AGE_SECONDS = 300;

// ============================================================================
// Anti-Replay Protection
// ============================================================================

/**
 * In-memory replay protection store.
 * In production, this should be backed by Redis with TTL.
 */
export class ReplayProtectionStore {
  private processedIds = new Map<
    string,
    { timestamp: number; checksum: string }
  >();
  private nonces = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Check if an event/transaction ID has been seen before.
   */
  isDuplicate(id: string): boolean {
    const entry = this.processedIds.get(id);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.processedIds.delete(id);
      return false;
    }

    return true;
  }

  /**
   * Record a processed event/transaction.
   */
  record(id: string, checksum?: string): void {
    this.processedIds.set(id, {
      timestamp: Date.now(),
      checksum: checksum || "",
    });
  }

  /**
   * Check and record atomically (returns true if duplicate).
   */
  checkAndRecord(id: string, checksum?: string): boolean {
    if (this.isDuplicate(id)) {
      return true;
    }
    this.record(id, checksum);
    return false;
  }

  /**
   * Check nonce for replay protection.
   * Nonces must be strictly increasing per scope.
   */
  checkNonce(scope: string, nonce: number): boolean {
    const lastNonce = this.nonces.get(scope);
    if (lastNonce !== undefined && nonce <= lastNonce) {
      return false; // Nonce reused or not increasing
    }
    this.nonces.set(scope, nonce);
    return true;
  }

  /**
   * Get the last recorded nonce for a scope.
   */
  getLastNonce(scope: string): number | undefined {
    return this.nonces.get(scope);
  }

  /**
   * Clean up expired entries.
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, entry] of this.processedIds.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.processedIds.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get the number of tracked entries.
   */
  get size(): number {
    return this.processedIds.size;
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.processedIds.clear();
    this.nonces.clear();
  }
}

// ============================================================================
// Anti-Double-Spend Detection
// ============================================================================

/**
 * Tracks crypto transactions to detect double-spend attempts.
 */
export class DoubleSpendDetector {
  /** Map of txHash -> transaction data */
  private knownTransactions = new Map<
    string,
    {
      fromAddress: string;
      toAddress: string;
      amount: string;
      network: string;
      blockNumber: number | null;
      confirmations: number;
      firstSeen: number;
      lastUpdated: number;
      status: "pending" | "confirming" | "confirmed" | "reorged";
    }
  >();

  /** Map of "fromAddress:nonce" or UTXO identifiers for spend tracking */
  private spentOutputs = new Map<string, string>(); // output -> txHash

  private confirmationRequirements: ConfirmationRequirements;

  constructor(confirmationRequirements?: ConfirmationRequirements) {
    this.confirmationRequirements =
      confirmationRequirements || DEFAULT_CONFIRMATION_REQUIREMENTS;
  }

  /**
   * Check a transaction for double-spend indicators.
   */
  checkTransaction(tx: CryptoTransactionInput): SecurityCheckResult {
    // Check 1: Has this exact tx hash already been used for a payment?
    const existing = this.knownTransactions.get(tx.txHash);
    if (existing) {
      // Same hash, same payment - this is a replay of a known tx
      if (
        existing.toAddress.toLowerCase() === tx.toAddress.toLowerCase() &&
        existing.amount === tx.amount
      ) {
        return {
          passed: false,
          code: SecurityCheckCode.DOUBLE_SPEND_DETECTED,
          message: `Transaction ${tx.txHash} has already been used for a payment`,
          severity: "critical",
          metadata: {
            txHash: tx.txHash,
            firstSeen: existing.firstSeen,
          },
        };
      }
    }

    // Check 2: Insufficient confirmations - critical because accepting
    // unconfirmed transactions is a double-spend vulnerability
    const requiredConfirmations =
      this.confirmationRequirements[tx.network] || 12;
    if (
      tx.confirmations !== undefined &&
      tx.confirmations < requiredConfirmations
    ) {
      return {
        passed: false,
        code: SecurityCheckCode.INSUFFICIENT_CONFIRMATIONS,
        message: `Transaction has ${tx.confirmations} confirmations, requires ${requiredConfirmations}`,
        severity: "critical",
        metadata: {
          txHash: tx.txHash,
          confirmations: tx.confirmations,
          required: requiredConfirmations,
          network: tx.network,
        },
      };
    }

    // Check 3: If we've seen a spend from the same source, flag potential double-spend
    const spendKey = `${tx.fromAddress.toLowerCase()}:${tx.network}`;
    const previousTx = this.spentOutputs.get(spendKey);
    if (previousTx && previousTx !== tx.txHash) {
      const prevTxData = this.knownTransactions.get(previousTx);
      if (prevTxData && prevTxData.status !== "confirmed") {
        return {
          passed: false,
          code: SecurityCheckCode.UNCONFIRMED_TX_REUSE,
          message: `Address ${tx.fromAddress} has an unconfirmed pending transaction`,
          severity: "critical",
          metadata: {
            currentTx: tx.txHash,
            previousTx,
            fromAddress: tx.fromAddress,
          },
        };
      }
    }

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Double-spend check passed",
      severity: "info",
    };
  }

  /**
   * Record a transaction as known.
   */
  recordTransaction(tx: CryptoTransactionInput): void {
    const confirmations = tx.confirmations || 0;
    const requiredConfirmations =
      this.confirmationRequirements[tx.network] || 12;

    let status: "pending" | "confirming" | "confirmed" = "pending";
    if (confirmations >= requiredConfirmations) {
      status = "confirmed";
    } else if (confirmations > 0) {
      status = "confirming";
    }

    this.knownTransactions.set(tx.txHash, {
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      network: tx.network,
      blockNumber: tx.blockNumber || null,
      confirmations,
      firstSeen: Date.now(),
      lastUpdated: Date.now(),
      status,
    });

    // Track spend from this address
    const spendKey = `${tx.fromAddress.toLowerCase()}:${tx.network}`;
    this.spentOutputs.set(spendKey, tx.txHash);
  }

  /**
   * Update confirmations for a transaction.
   * Returns a reorg detection result if applicable.
   */
  updateConfirmations(
    txHash: string,
    newConfirmations: number,
    newBlockNumber?: number,
  ): SecurityCheckResult | null {
    const existing = this.knownTransactions.get(txHash);
    if (!existing) return null;

    // Detect block reorganization: confirmations decreased
    if (newConfirmations < existing.confirmations) {
      existing.status = "reorged";
      existing.lastUpdated = Date.now();

      return {
        passed: false,
        code: SecurityCheckCode.BLOCK_REORG_DETECTED,
        message: `Block reorganization detected for tx ${txHash}: confirmations dropped from ${existing.confirmations} to ${newConfirmations}`,
        severity: "critical",
        metadata: {
          txHash,
          previousConfirmations: existing.confirmations,
          newConfirmations,
          previousBlock: existing.blockNumber,
          newBlock: newBlockNumber,
        },
      };
    }

    // Update normally
    const requiredConfirmations =
      this.confirmationRequirements[existing.network] || 12;
    existing.confirmations = newConfirmations;
    if (newBlockNumber !== undefined) {
      existing.blockNumber = newBlockNumber;
    }
    existing.lastUpdated = Date.now();

    if (newConfirmations >= requiredConfirmations) {
      existing.status = "confirmed";
    }

    return null;
  }

  /**
   * Check if a transaction is confirmed.
   */
  isConfirmed(txHash: string): boolean {
    const tx = this.knownTransactions.get(txHash);
    return tx?.status === "confirmed";
  }

  /**
   * Get transaction status.
   */
  getTransactionStatus(
    txHash: string,
  ): "unknown" | "pending" | "confirming" | "confirmed" | "reorged" {
    const tx = this.knownTransactions.get(txHash);
    return tx?.status || "unknown";
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.knownTransactions.clear();
    this.spentOutputs.clear();
  }
}

// ============================================================================
// Anti-Fraud Heuristics
// ============================================================================

/**
 * Fraud detection engine with velocity checks, amount anomaly detection,
 * and address blacklist screening.
 */
export class FraudDetector {
  private config: FraudDetectionConfig;
  private paymentAttempts = new Map<string, PaymentAttempt[]>(); // userId -> attempts
  private failedAttempts = new Map<string, number>(); // userId -> last failure timestamp
  private cardFingerprints = new Map<string, Set<string>>(); // userId -> card fingerprints
  private blacklistedAddresses: Set<string>;
  private sanctionedAddresses: Set<string>;

  constructor(
    config?: Partial<FraudDetectionConfig>,
    blacklistedAddresses?: string[],
    sanctionedAddresses?: string[],
  ) {
    this.config = { ...DEFAULT_FRAUD_CONFIG, ...config };
    this.blacklistedAddresses = new Set(
      (blacklistedAddresses || []).map((a) => a.toLowerCase()),
    );
    this.sanctionedAddresses = new Set(
      (sanctionedAddresses || []).map((a) => a.toLowerCase()),
    );
  }

  /**
   * Run all fraud checks on a payment attempt.
   */
  checkPaymentAttempt(attempt: PaymentAttempt): SecurityCheckResult[] {
    const results: SecurityCheckResult[] = [];

    // 1. Velocity checks
    results.push(this.checkVelocity(attempt));

    // 2. Amount anomaly detection
    results.push(this.checkAmountAnomaly(attempt));

    // 3. Cooldown after failure
    const cooldownResult = this.checkCooldown(attempt);
    if (cooldownResult) {
      results.push(cooldownResult);
    }

    // 4. Card fingerprint velocity
    if (attempt.fingerprint) {
      results.push(this.checkCardVelocity(attempt));
    }

    return results;
  }

  /**
   * Check crypto address against blacklists and sanctions.
   */
  checkAddress(address: string): SecurityCheckResult {
    const normalized = address.toLowerCase();

    // Check OFAC/sanctions list
    if (
      this.config.enableSanctionsScreening &&
      this.sanctionedAddresses.has(normalized)
    ) {
      return {
        passed: false,
        code: SecurityCheckCode.SANCTIONS_MATCH,
        message: `Address ${address} matches a sanctioned entity`,
        severity: "critical",
        metadata: { address },
      };
    }

    // Check blacklist
    if (
      this.config.enableAddressBlacklist &&
      this.blacklistedAddresses.has(normalized)
    ) {
      return {
        passed: false,
        code: SecurityCheckCode.BLACKLISTED_ADDRESS,
        message: `Address ${address} is blacklisted`,
        severity: "critical",
        metadata: { address },
      };
    }

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Address check passed",
      severity: "info",
    };
  }

  /**
   * Record a payment attempt for velocity tracking.
   */
  recordAttempt(attempt: PaymentAttempt): void {
    const key = attempt.userId;
    const attempts = this.paymentAttempts.get(key) || [];
    attempts.push(attempt);

    // Keep only last 24 hours of data
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = attempts.filter((a) => a.timestamp > cutoff);
    this.paymentAttempts.set(key, filtered);

    // Track card fingerprints
    if (attempt.fingerprint) {
      const fingerprints = this.cardFingerprints.get(key) || new Set();
      fingerprints.add(attempt.fingerprint);
      this.cardFingerprints.set(key, fingerprints);
    }
  }

  /**
   * Record a failed payment attempt.
   */
  recordFailure(userId: string): void {
    this.failedAttempts.set(userId, Date.now());
  }

  /**
   * Add address to blacklist.
   */
  addToBlacklist(address: string): void {
    this.blacklistedAddresses.add(address.toLowerCase());
  }

  /**
   * Remove address from blacklist.
   */
  removeFromBlacklist(address: string): void {
    this.blacklistedAddresses.delete(address.toLowerCase());
  }

  /**
   * Check if address is blacklisted.
   */
  isBlacklisted(address: string): boolean {
    return this.blacklistedAddresses.has(address.toLowerCase());
  }

  /**
   * Add address to sanctions list.
   */
  addToSanctionsList(address: string): void {
    this.sanctionedAddresses.add(address.toLowerCase());
  }

  /**
   * Check if address is sanctioned.
   */
  isSanctioned(address: string): boolean {
    return this.sanctionedAddresses.has(address.toLowerCase());
  }

  /**
   * Detect suspicious patterns in payment history.
   */
  detectSuspiciousPatterns(userId: string): SecurityCheckResult {
    const attempts = this.paymentAttempts.get(userId) || [];
    if (attempts.length < 3) {
      return {
        passed: true,
        code: SecurityCheckCode.CHECK_PASSED,
        message: "Insufficient data for pattern detection",
        severity: "info",
      };
    }

    // Pattern 1: Rapidly increasing amounts (testing card limits)
    const recentAttempts = attempts.slice(-5);
    const amounts = recentAttempts.map((a) => a.amount);
    const isIncreasing = amounts.every(
      (val, i) => i === 0 || val > amounts[i - 1],
    );

    if (isIncreasing && recentAttempts.length >= 3) {
      return {
        passed: false,
        code: SecurityCheckCode.SUSPICIOUS_PATTERN,
        message:
          "Suspicious pattern: rapidly increasing payment amounts detected",
        severity: "warning",
        metadata: {
          userId,
          pattern: "increasing_amounts",
          amounts,
        },
      };
    }

    // Pattern 2: Many small transactions (smurfing)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentSmall = attempts.filter(
      (a) => a.timestamp > oneHourAgo && a.amount < 1000,
    );
    if (recentSmall.length >= 5) {
      return {
        passed: false,
        code: SecurityCheckCode.SUSPICIOUS_PATTERN,
        message:
          "Suspicious pattern: many small transactions detected (possible smurfing)",
        severity: "warning",
        metadata: {
          userId,
          pattern: "smurfing",
          count: recentSmall.length,
        },
      };
    }

    // Pattern 3: Round-trip transactions (charge then refund cycles)
    // This would require refund data; keep as placeholder

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "No suspicious patterns detected",
      severity: "info",
    };
  }

  // Private helpers

  private checkVelocity(attempt: PaymentAttempt): SecurityCheckResult {
    const attempts = this.paymentAttempts.get(attempt.userId) || [];
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Count and sum per hour
    const hourlyAttempts = attempts.filter((a) => a.timestamp > oneHourAgo);
    const hourlyCount = hourlyAttempts.length;
    const hourlyAmount = hourlyAttempts.reduce((sum, a) => sum + a.amount, 0);

    // Count and sum per day
    const dailyAttempts = attempts.filter((a) => a.timestamp > oneDayAgo);
    const dailyCount = dailyAttempts.length;
    const dailyAmount = dailyAttempts.reduce((sum, a) => sum + a.amount, 0);

    if (hourlyCount >= this.config.velocity.maxAttemptsPerHour) {
      return {
        passed: false,
        code: SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
        message: `Hourly attempt limit exceeded: ${hourlyCount}/${this.config.velocity.maxAttemptsPerHour}`,
        severity: "critical",
        metadata: {
          userId: attempt.userId,
          hourlyCount,
          limit: this.config.velocity.maxAttemptsPerHour,
          type: "hourly_count",
        },
      };
    }

    if (dailyCount >= this.config.velocity.maxAttemptsPerDay) {
      return {
        passed: false,
        code: SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
        message: `Daily attempt limit exceeded: ${dailyCount}/${this.config.velocity.maxAttemptsPerDay}`,
        severity: "critical",
        metadata: {
          userId: attempt.userId,
          dailyCount,
          limit: this.config.velocity.maxAttemptsPerDay,
          type: "daily_count",
        },
      };
    }

    if (hourlyAmount + attempt.amount > this.config.velocity.maxAmountPerHour) {
      return {
        passed: false,
        code: SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
        message: `Hourly amount limit exceeded`,
        severity: "critical",
        metadata: {
          userId: attempt.userId,
          currentHourlyAmount: hourlyAmount,
          attemptAmount: attempt.amount,
          limit: this.config.velocity.maxAmountPerHour,
          type: "hourly_amount",
        },
      };
    }

    if (dailyAmount + attempt.amount > this.config.velocity.maxAmountPerDay) {
      return {
        passed: false,
        code: SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
        message: `Daily amount limit exceeded`,
        severity: "critical",
        metadata: {
          userId: attempt.userId,
          currentDailyAmount: dailyAmount,
          attemptAmount: attempt.amount,
          limit: this.config.velocity.maxAmountPerDay,
          type: "daily_amount",
        },
      };
    }

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Velocity check passed",
      severity: "info",
    };
  }

  private checkAmountAnomaly(attempt: PaymentAttempt): SecurityCheckResult {
    // Check max single payment
    if (attempt.amount > this.config.maxSinglePaymentAmount) {
      return {
        passed: false,
        code: SecurityCheckCode.AMOUNT_ANOMALY,
        message: `Payment amount ${attempt.amount} exceeds maximum ${this.config.maxSinglePaymentAmount}`,
        severity: "warning",
        metadata: {
          amount: attempt.amount,
          maxAmount: this.config.maxSinglePaymentAmount,
          type: "max_exceeded",
        },
      };
    }

    // Check min single payment
    if (attempt.amount < this.config.minSinglePaymentAmount) {
      return {
        passed: false,
        code: SecurityCheckCode.AMOUNT_ANOMALY,
        message: `Payment amount ${attempt.amount} below minimum ${this.config.minSinglePaymentAmount}`,
        severity: "warning",
        metadata: {
          amount: attempt.amount,
          minAmount: this.config.minSinglePaymentAmount,
          type: "min_below",
        },
      };
    }

    // Check suspicious amount patterns (just under round numbers)
    for (const pattern of this.config.suspiciousAmountPatterns) {
      if (attempt.amount === pattern) {
        return {
          passed: false,
          code: SecurityCheckCode.AMOUNT_ANOMALY,
          message: `Suspicious amount pattern detected: ${attempt.amount}`,
          severity: "warning",
          metadata: {
            amount: attempt.amount,
            pattern,
            type: "suspicious_pattern",
          },
        };
      }
    }

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Amount check passed",
      severity: "info",
    };
  }

  private checkCooldown(attempt: PaymentAttempt): SecurityCheckResult | null {
    const lastFailure = this.failedAttempts.get(attempt.userId);
    if (!lastFailure) return null;

    const timeSinceFailure = Date.now() - lastFailure;
    if (timeSinceFailure < this.config.velocity.cooldownAfterFailureMs) {
      return {
        passed: false,
        code: SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
        message: `Cooldown period active after failed payment. Wait ${Math.ceil((this.config.velocity.cooldownAfterFailureMs - timeSinceFailure) / 1000)} seconds.`,
        severity: "critical",
        metadata: {
          userId: attempt.userId,
          cooldownMs: this.config.velocity.cooldownAfterFailureMs,
          remainingMs:
            this.config.velocity.cooldownAfterFailureMs - timeSinceFailure,
          type: "cooldown",
        },
      };
    }

    return null;
  }

  private checkCardVelocity(attempt: PaymentAttempt): SecurityCheckResult {
    const fingerprints = this.cardFingerprints.get(attempt.userId);
    if (!fingerprints) {
      return {
        passed: true,
        code: SecurityCheckCode.CHECK_PASSED,
        message: "Card velocity check passed",
        severity: "info",
      };
    }

    // Add the current fingerprint to check
    const newSet = new Set(fingerprints);
    if (attempt.fingerprint) {
      newSet.add(attempt.fingerprint);
    }

    if (newSet.size > this.config.velocity.maxUniqueCardsPerDay) {
      return {
        passed: false,
        code: SecurityCheckCode.VELOCITY_LIMIT_EXCEEDED,
        message: `Too many unique cards used: ${newSet.size}/${this.config.velocity.maxUniqueCardsPerDay}`,
        severity: "critical",
        metadata: {
          userId: attempt.userId,
          uniqueCards: newSet.size,
          limit: this.config.velocity.maxUniqueCardsPerDay,
          type: "card_velocity",
        },
      };
    }

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Card velocity check passed",
      severity: "info",
    };
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.paymentAttempts.clear();
    this.failedAttempts.clear();
    this.cardFingerprints.clear();
  }
}

// ============================================================================
// Webhook Signature Validation
// ============================================================================

/**
 * Hardened webhook signature validator with timing-safe comparison
 * and replay window enforcement.
 */
export class WebhookSignatureValidator {
  private replayStore: ReplayProtectionStore;

  constructor(replayStore?: ReplayProtectionStore) {
    this.replayStore = replayStore || new ReplayProtectionStore();
  }

  /**
   * Verify a webhook signature using timing-safe comparison.
   *
   * Supports the standard `t=timestamp,v1=signature` format used by
   * Stripe and similar webhook providers.
   */
  verify(input: WebhookVerificationInput): SecurityCheckResult {
    const maxAge = input.maxAgeSeconds || WEBHOOK_MAX_AGE_SECONDS;

    // 1. Check timestamp freshness
    if (input.timestamp !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      const age = now - input.timestamp;

      if (age > maxAge) {
        return {
          passed: false,
          code: SecurityCheckCode.TIMESTAMP_EXPIRED,
          message: `Webhook timestamp expired: age ${age}s exceeds maximum ${maxAge}s`,
          severity: "critical",
          metadata: {
            timestamp: input.timestamp,
            age,
            maxAge,
          },
        };
      }

      // Reject timestamps from the future (clock skew tolerance: 60s)
      if (age < -60) {
        return {
          passed: false,
          code: SecurityCheckCode.TIMESTAMP_EXPIRED,
          message: `Webhook timestamp is in the future`,
          severity: "critical",
          metadata: {
            timestamp: input.timestamp,
            currentTime: now,
          },
        };
      }
    }

    // 2. Compute expected signature
    const signedPayload =
      input.timestamp !== undefined
        ? `${input.timestamp}.${input.payload}`
        : input.payload;

    const expectedSignature = createHmac("sha256", input.secret)
      .update(signedPayload)
      .digest("hex");

    // 3. Timing-safe comparison
    if (!this.timingSafeCompare(input.signature, expectedSignature)) {
      return {
        passed: false,
        code: SecurityCheckCode.SIGNATURE_INVALID,
        message: "Webhook signature verification failed",
        severity: "critical",
      };
    }

    // 4. Check for replay using the signature as unique ID
    const replayKey = `webhook:${input.signature}`;
    if (this.replayStore.isDuplicate(replayKey)) {
      return {
        passed: false,
        code: SecurityCheckCode.REPLAY_DETECTED,
        message:
          "Webhook replay detected: this signature has been processed before",
        severity: "critical",
      };
    }

    // Record as processed
    this.replayStore.record(replayKey);

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Webhook signature verification passed",
      severity: "info",
    };
  }

  /**
   * Parse a Stripe-style webhook signature header.
   * Format: t=timestamp,v1=signature
   */
  parseSignatureHeader(
    header: string,
  ): { timestamp: number; signatures: string[] } | null {
    try {
      const parts = header.split(",");
      let timestamp = 0;
      const signatures: string[] = [];

      for (const part of parts) {
        const [key, value] = part.split("=", 2);
        if (key === "t") {
          timestamp = parseInt(value, 10);
        } else if (key === "v1") {
          signatures.push(value);
        }
      }

      if (timestamp === 0 || signatures.length === 0) {
        return null;
      }

      return { timestamp, signatures };
    } catch {
      return null;
    }
  }

  /**
   * Timing-safe string comparison.
   * Prevents timing attacks by always comparing the full length.
   */
  timingSafeCompare(a: string, b: string): boolean {
    if (typeof a !== "string" || typeof b !== "string") {
      return false;
    }

    // Pad to same length to prevent length-based timing leaks
    const maxLen = Math.max(a.length, b.length);
    const bufA = Buffer.alloc(maxLen, 0);
    const bufB = Buffer.alloc(maxLen, 0);

    Buffer.from(a).copy(bufA);
    Buffer.from(b).copy(bufB);

    // Use constant-time comparison but also check actual lengths match
    return timingSafeEqual(bufA, bufB) && a.length === b.length;
  }

  /**
   * Generate a test webhook signature (for testing only).
   */
  generateSignature(
    payload: string,
    secret: string,
    timestamp?: number,
  ): { signature: string; timestamp: number; header: string } {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const signedPayload = `${ts}.${payload}`;
    const signature = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return {
      signature,
      timestamp: ts,
      header: `t=${ts},v1=${signature}`,
    };
  }

  /**
   * Clear replay store (for testing).
   */
  clearReplayStore(): void {
    this.replayStore.clear();
  }
}

// ============================================================================
// Payment Reconciliation
// ============================================================================

/**
 * Payment reconciliation engine for detecting ledger inconsistencies.
 */
export class PaymentReconciler {
  /**
   * Reconcile internal ledger entries against external (Stripe/crypto) records.
   */
  reconcile(
    internalEntries: LedgerEntry[],
    externalEntries: LedgerEntry[],
  ): ReconciliationCheckResult {
    const issues: SecurityCheckResult[] = [];
    const orphanPayments: LedgerEntry[] = [];
    const duplicateCharges: LedgerEntry[] = [];
    const refundInconsistencies: LedgerEntry[] = [];

    // Build lookup maps
    const internalByPaymentIntent = new Map<string, LedgerEntry[]>();
    for (const entry of internalEntries) {
      const existing = internalByPaymentIntent.get(entry.paymentIntentId) || [];
      existing.push(entry);
      internalByPaymentIntent.set(entry.paymentIntentId, existing);
    }

    const externalByPaymentIntent = new Map<string, LedgerEntry[]>();
    for (const entry of externalEntries) {
      const existing = externalByPaymentIntent.get(entry.paymentIntentId) || [];
      existing.push(entry);
      externalByPaymentIntent.set(entry.paymentIntentId, existing);
    }

    // Check for orphan payments (in external but not in internal)
    for (const [piId, extEntries] of externalByPaymentIntent.entries()) {
      if (!internalByPaymentIntent.has(piId)) {
        orphanPayments.push(...extEntries);
        issues.push({
          passed: false,
          code: SecurityCheckCode.ORPHAN_PAYMENT,
          message: `Orphan payment: external payment ${piId} has no internal record`,
          severity: "warning",
          metadata: { paymentIntentId: piId },
        });
      }
    }

    // Check for orphan internal records (in internal but not in external)
    for (const [piId, intEntries] of internalByPaymentIntent.entries()) {
      if (!externalByPaymentIntent.has(piId)) {
        orphanPayments.push(...intEntries);
        issues.push({
          passed: false,
          code: SecurityCheckCode.ORPHAN_PAYMENT,
          message: `Orphan internal record: internal payment ${piId} has no external record`,
          severity: "warning",
          metadata: { paymentIntentId: piId },
        });
      }
    }

    // Check for amount mismatches
    for (const [piId, intEntries] of internalByPaymentIntent.entries()) {
      const extEntries = externalByPaymentIntent.get(piId);
      if (!extEntries) continue;

      const intTotal = intEntries.reduce(
        (sum, e) => sum + (e.type === "refund" ? -e.amount : e.amount),
        0,
      );
      const extTotal = extEntries.reduce(
        (sum, e) => sum + (e.type === "refund" ? -e.amount : e.amount),
        0,
      );

      if (intTotal !== extTotal) {
        issues.push({
          passed: false,
          code: SecurityCheckCode.LEDGER_MISMATCH,
          message: `Amount mismatch for payment ${piId}: internal=${intTotal}, external=${extTotal}`,
          severity: "critical",
          metadata: {
            paymentIntentId: piId,
            internalAmount: intTotal,
            externalAmount: extTotal,
            discrepancy: extTotal - intTotal,
          },
        });
      }
    }

    // Check for duplicate charges
    const chargeIds = new Set<string>();
    for (const entry of [...internalEntries, ...externalEntries]) {
      if (entry.chargeId && entry.type === "charge") {
        if (chargeIds.has(entry.chargeId)) {
          duplicateCharges.push(entry);
          issues.push({
            passed: false,
            code: SecurityCheckCode.DUPLICATE_CHARGE,
            message: `Duplicate charge detected: ${entry.chargeId}`,
            severity: "critical",
            metadata: { chargeId: entry.chargeId },
          });
        }
        chargeIds.add(entry.chargeId);
      }
    }

    // Check refund consistency
    for (const [piId, intEntries] of internalByPaymentIntent.entries()) {
      const extEntries = externalByPaymentIntent.get(piId) || [];

      const intRefunds = intEntries.filter((e) => e.type === "refund");
      const extRefunds = extEntries.filter((e) => e.type === "refund");

      const intRefundTotal = intRefunds.reduce((sum, e) => sum + e.amount, 0);
      const extRefundTotal = extRefunds.reduce((sum, e) => sum + e.amount, 0);

      if (intRefundTotal !== extRefundTotal) {
        refundInconsistencies.push(...intRefunds, ...extRefunds);
        issues.push({
          passed: false,
          code: SecurityCheckCode.REFUND_INCONSISTENCY,
          message: `Refund inconsistency for payment ${piId}: internal refunds=${intRefundTotal}, external refunds=${extRefundTotal}`,
          severity: "critical",
          metadata: {
            paymentIntentId: piId,
            internalRefundTotal: intRefundTotal,
            externalRefundTotal: extRefundTotal,
          },
        });
      }
    }

    // Calculate totals
    const totalInternalAmount = internalEntries.reduce(
      (sum, e) => sum + (e.type === "refund" ? -e.amount : e.amount),
      0,
    );
    const totalExternalAmount = externalEntries.reduce(
      (sum, e) => sum + (e.type === "refund" ? -e.amount : e.amount),
      0,
    );

    return {
      isConsistent: issues.length === 0,
      totalInternalAmount,
      totalExternalAmount,
      discrepancy: totalExternalAmount - totalInternalAmount,
      orphanPayments,
      duplicateCharges,
      refundInconsistencies,
      issues,
    };
  }

  /**
   * Detect orphan payments that have no associated subscription or workspace.
   */
  detectOrphanPayments(entries: LedgerEntry[]): LedgerEntry[] {
    return entries.filter(
      (entry) => !entry.subscriptionId || !entry.workspaceId,
    );
  }

  /**
   * Validate that total charges minus refunds matches expected net.
   */
  validateNetAmount(
    entries: LedgerEntry[],
    expectedNet: number,
  ): SecurityCheckResult {
    const actualNet = entries.reduce((sum, entry) => {
      if (entry.type === "charge") return sum + entry.amount;
      if (entry.type === "refund") return sum - entry.amount;
      return sum;
    }, 0);

    if (actualNet !== expectedNet) {
      return {
        passed: false,
        code: SecurityCheckCode.LEDGER_MISMATCH,
        message: `Net amount mismatch: expected ${expectedNet}, got ${actualNet}`,
        severity: "critical",
        metadata: {
          expectedNet,
          actualNet,
          discrepancy: actualNet - expectedNet,
        },
      };
    }

    return {
      passed: true,
      code: SecurityCheckCode.CHECK_PASSED,
      message: "Net amount validation passed",
      severity: "info",
    };
  }
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Generate a cryptographically secure nonce.
 */
export function generateNonce(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a checksum for a payload.
 */
export function generateChecksum(payload: string): string {
  return createHmac("sha256", "nchat-payment-integrity")
    .update(payload)
    .digest("hex");
}

/**
 * Validate an Ethereum-style address format.
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Validate a Bitcoin address format (basic check).
 */
export function isValidBtcAddress(address: string): boolean {
  // Bech32 (bc1) or legacy (1/3) format
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
}

/**
 * Validate a transaction hash format.
 */
export function isValidTxHash(hash: string, network: string): boolean {
  if (network === "bitcoin") {
    return /^[0-9a-fA-F]{64}$/.test(hash);
  }
  // EVM networks
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}
