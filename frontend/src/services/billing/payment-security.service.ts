/**
 * Payment Security Service
 *
 * Service layer orchestrating all payment security checks including
 * anti-replay, anti-double-spend, anti-fraud, webhook validation,
 * and reconciliation.
 *
 * @module @/services/billing/payment-security.service
 * @version 1.0.0
 */

import {
  ReplayProtectionStore,
  DoubleSpendDetector,
  FraudDetector,
  WebhookSignatureValidator,
  PaymentReconciler,
  SecurityCheckResult,
  SecurityCheckCode,
  type WebhookVerificationInput,
  type CryptoTransactionInput,
  type PaymentAttempt,
  type LedgerEntry,
  type ReconciliationCheckResult,
  type FraudDetectionConfig,
  type ConfirmationRequirements,
  generateNonce,
  generateChecksum,
  isValidEthAddress,
  isValidBtcAddress,
  isValidTxHash,
} from "@/lib/billing/payment-security";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Full security assessment result for a payment.
 */
export interface PaymentSecurityAssessment {
  allowed: boolean;
  riskScore: number; // 0-100, higher = more risky
  riskLevel: "low" | "medium" | "high" | "critical";
  checks: SecurityCheckResult[];
  failedChecks: SecurityCheckResult[];
  timestamp: number;
  assessmentId: string;
}

/**
 * Service configuration.
 */
export interface PaymentSecurityServiceConfig {
  fraudConfig?: Partial<FraudDetectionConfig>;
  confirmationRequirements?: ConfirmationRequirements;
  blacklistedAddresses?: string[];
  sanctionedAddresses?: string[];
  replayTTLMs?: number;
  enableLogging?: boolean;
}

// ============================================================================
// Payment Security Service
// ============================================================================

export class PaymentSecurityService {
  private replayStore: ReplayProtectionStore;
  private doubleSpendDetector: DoubleSpendDetector;
  private fraudDetector: FraudDetector;
  private webhookValidator: WebhookSignatureValidator;
  private reconciler: PaymentReconciler;
  private enableLogging: boolean;

  constructor(config?: PaymentSecurityServiceConfig) {
    this.replayStore = new ReplayProtectionStore(config?.replayTTLMs);
    this.doubleSpendDetector = new DoubleSpendDetector(
      config?.confirmationRequirements,
    );
    this.fraudDetector = new FraudDetector(
      config?.fraudConfig,
      config?.blacklistedAddresses,
      config?.sanctionedAddresses,
    );
    this.webhookValidator = new WebhookSignatureValidator(this.replayStore);
    this.reconciler = new PaymentReconciler();
    this.enableLogging = config?.enableLogging ?? true;
  }

  // ==========================================================================
  // Webhook Security
  // ==========================================================================

  /**
   * Verify a webhook with full security checks:
   * - Signature verification (timing-safe)
   * - Timestamp freshness
   * - Replay protection
   */
  verifyWebhook(input: WebhookVerificationInput): SecurityCheckResult {
    const result = this.webhookValidator.verify(input);

    if (!result.passed && this.enableLogging) {
      logger.security("Webhook verification failed", {
        code: result.code,
        message: result.message,
      });
    }

    return result;
  }

  /**
   * Parse and verify a Stripe-style webhook header.
   */
  verifyStripeWebhook(
    payload: string,
    signatureHeader: string,
    secret: string,
    maxAgeSeconds?: number,
  ): SecurityCheckResult {
    const parsed = this.webhookValidator.parseSignatureHeader(signatureHeader);
    if (!parsed) {
      return {
        passed: false,
        code: SecurityCheckCode.SIGNATURE_INVALID,
        message: "Invalid webhook signature header format",
        severity: "critical",
      };
    }

    // Try each signature in the header
    for (const signature of parsed.signatures) {
      const result = this.webhookValidator.verify({
        payload,
        signature,
        secret,
        timestamp: parsed.timestamp,
        maxAgeSeconds,
      });

      if (result.passed) {
        return result;
      }
    }

    return {
      passed: false,
      code: SecurityCheckCode.SIGNATURE_INVALID,
      message: "No valid signature found in webhook header",
      severity: "critical",
    };
  }

  // ==========================================================================
  // Stripe Payment Security
  // ==========================================================================

  /**
   * Full security assessment for a Stripe payment attempt.
   */
  assessStripePayment(attempt: PaymentAttempt): PaymentSecurityAssessment {
    const checks: SecurityCheckResult[] = [];
    const startTime = Date.now();

    // 1. Replay protection (idempotency key check)
    const isReplay = this.replayStore.isDuplicate(attempt.id);
    if (isReplay) {
      checks.push({
        passed: false,
        code: SecurityCheckCode.REPLAY_DETECTED,
        message: `Payment attempt ${attempt.id} is a replay`,
        severity: "critical",
      });
    } else {
      this.replayStore.record(attempt.id);
      checks.push({
        passed: true,
        code: SecurityCheckCode.CHECK_PASSED,
        message: "Replay check passed",
        severity: "info",
      });
    }

    // 2. Fraud detection checks
    const fraudChecks = this.fraudDetector.checkPaymentAttempt(attempt);
    checks.push(...fraudChecks);

    // 3. Suspicious pattern detection
    const patternCheck = this.fraudDetector.detectSuspiciousPatterns(
      attempt.userId,
    );
    checks.push(patternCheck);

    // 4. Record the attempt for future velocity checks
    this.fraudDetector.recordAttempt(attempt);

    return this.buildAssessment(checks, startTime);
  }

  // ==========================================================================
  // Crypto Payment Security
  // ==========================================================================

  /**
   * Full security assessment for a crypto payment.
   */
  assessCryptoPayment(
    tx: CryptoTransactionInput,
    attempt: PaymentAttempt,
  ): PaymentSecurityAssessment {
    const checks: SecurityCheckResult[] = [];
    const startTime = Date.now();

    // 1. Validate transaction hash format
    if (!isValidTxHash(tx.txHash, tx.network)) {
      checks.push({
        passed: false,
        code: SecurityCheckCode.SUSPICIOUS_PATTERN,
        message: `Invalid transaction hash format for ${tx.network}`,
        severity: "critical",
      });
    }

    // 2. Validate addresses
    if (tx.network !== "bitcoin") {
      if (!isValidEthAddress(tx.fromAddress)) {
        checks.push({
          passed: false,
          code: SecurityCheckCode.SUSPICIOUS_PATTERN,
          message: "Invalid sender address format",
          severity: "critical",
        });
      }
      if (!isValidEthAddress(tx.toAddress)) {
        checks.push({
          passed: false,
          code: SecurityCheckCode.SUSPICIOUS_PATTERN,
          message: "Invalid recipient address format",
          severity: "critical",
        });
      }
    }

    // 3. Address blacklist/sanctions check
    const fromCheck = this.fraudDetector.checkAddress(tx.fromAddress);
    checks.push(fromCheck);

    const toCheck = this.fraudDetector.checkAddress(tx.toAddress);
    checks.push(toCheck);

    // 4. Double-spend detection
    const doubleSpendCheck = this.doubleSpendDetector.checkTransaction(tx);
    checks.push(doubleSpendCheck);

    // 5. Fraud detection (velocity, amount)
    const fraudChecks = this.fraudDetector.checkPaymentAttempt(attempt);
    checks.push(...fraudChecks);

    // 6. Record the transaction
    if (!checks.some((c) => !c.passed && c.severity === "critical")) {
      this.doubleSpendDetector.recordTransaction(tx);
      this.fraudDetector.recordAttempt(attempt);
    }

    return this.buildAssessment(checks, startTime);
  }

  /**
   * Check a crypto address against blacklists and sanctions.
   */
  checkCryptoAddress(address: string): SecurityCheckResult {
    return this.fraudDetector.checkAddress(address);
  }

  /**
   * Update transaction confirmation count and detect reorgs.
   */
  updateTransactionConfirmations(
    txHash: string,
    confirmations: number,
    blockNumber?: number,
  ): SecurityCheckResult | null {
    const result = this.doubleSpendDetector.updateConfirmations(
      txHash,
      confirmations,
      blockNumber,
    );

    if (result && !result.passed && this.enableLogging) {
      logger.security("Block reorganization detected", {
        txHash,
        confirmations,
        code: result.code,
      });
    }

    return result;
  }

  /**
   * Check if a transaction is sufficiently confirmed.
   */
  isTransactionConfirmed(txHash: string): boolean {
    return this.doubleSpendDetector.isConfirmed(txHash);
  }

  // ==========================================================================
  // Reconciliation
  // ==========================================================================

  /**
   * Run reconciliation between internal and external ledger entries.
   */
  reconcilePayments(
    internalEntries: LedgerEntry[],
    externalEntries: LedgerEntry[],
  ): ReconciliationCheckResult {
    const result = this.reconciler.reconcile(internalEntries, externalEntries);

    if (!result.isConsistent && this.enableLogging) {
      logger.security("Payment reconciliation inconsistencies found", {
        discrepancy: result.discrepancy,
        orphanCount: result.orphanPayments.length,
        duplicateCount: result.duplicateCharges.length,
        refundIssues: result.refundInconsistencies.length,
      });
    }

    return result;
  }

  /**
   * Detect orphan payments.
   */
  detectOrphanPayments(entries: LedgerEntry[]): LedgerEntry[] {
    return this.reconciler.detectOrphanPayments(entries);
  }

  /**
   * Validate net amount against expected.
   */
  validateNetAmount(
    entries: LedgerEntry[],
    expectedNet: number,
  ): SecurityCheckResult {
    return this.reconciler.validateNetAmount(entries, expectedNet);
  }

  // ==========================================================================
  // Admin Operations
  // ==========================================================================

  /**
   * Add an address to the blacklist.
   */
  blacklistAddress(address: string): void {
    this.fraudDetector.addToBlacklist(address);
    if (this.enableLogging) {
      logger.security("Address added to blacklist", { address });
    }
  }

  /**
   * Remove an address from the blacklist.
   */
  unblacklistAddress(address: string): void {
    this.fraudDetector.removeFromBlacklist(address);
    if (this.enableLogging) {
      logger.security("Address removed from blacklist", { address });
    }
  }

  /**
   * Add an address to the sanctions list.
   */
  addSanctionedAddress(address: string): void {
    this.fraudDetector.addToSanctionsList(address);
    if (this.enableLogging) {
      logger.security("Address added to sanctions list", { address });
    }
  }

  /**
   * Record a payment failure for cooldown enforcement.
   */
  recordPaymentFailure(userId: string): void {
    this.fraudDetector.recordFailure(userId);
  }

  /**
   * Generate a secure nonce for idempotency.
   */
  generateIdempotencyKey(): string {
    return generateNonce();
  }

  /**
   * Generate a checksum for payload integrity.
   */
  generatePayloadChecksum(payload: string): string {
    return generateChecksum(payload);
  }

  /**
   * Clean up expired replay protection entries.
   */
  cleanupExpiredEntries(): number {
    return this.replayStore.cleanup();
  }

  /**
   * Check if an event ID has been processed (for idempotency).
   */
  isEventProcessed(eventId: string): boolean {
    return this.replayStore.isDuplicate(eventId);
  }

  /**
   * Record an event as processed.
   */
  recordProcessedEvent(eventId: string): void {
    this.replayStore.record(eventId);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Build a security assessment from individual check results.
   */
  private buildAssessment(
    checks: SecurityCheckResult[],
    startTime: number,
  ): PaymentSecurityAssessment {
    const failedChecks = checks.filter((c) => !c.passed);
    const criticalFailures = failedChecks.filter(
      (c) => c.severity === "critical",
    );
    const warningFailures = failedChecks.filter(
      (c) => c.severity === "warning",
    );

    // Calculate risk score
    let riskScore = 0;
    riskScore += criticalFailures.length * 40;
    riskScore += warningFailures.length * 15;
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical";
    if (criticalFailures.length > 0) {
      riskLevel = "critical";
    } else if (riskScore >= 50) {
      riskLevel = "high";
    } else if (riskScore >= 25) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }

    // Block if any critical failure OR if risk score is high enough
    // (accumulated warnings like velocity limits should also block)
    const isBlocked = criticalFailures.length > 0 || riskScore >= 50;

    const assessment: PaymentSecurityAssessment = {
      allowed: !isBlocked,
      riskScore,
      riskLevel,
      checks,
      failedChecks,
      timestamp: startTime,
      assessmentId: generateNonce().substring(0, 16),
    };

    if (this.enableLogging && !assessment.allowed) {
      logger.security("Payment blocked by security assessment", {
        assessmentId: assessment.assessmentId,
        riskScore,
        riskLevel,
        failedCheckCodes: failedChecks.map((c) => c.code),
      });
    }

    return assessment;
  }

  /**
   * Reset all internal state (for testing).
   */
  reset(): void {
    this.replayStore.clear();
    this.doubleSpendDetector.clear();
    this.fraudDetector.clear();
    this.webhookValidator.clearReplayStore();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let paymentSecurityService: PaymentSecurityService | null = null;

/**
 * Get the payment security service singleton.
 */
export function getPaymentSecurityService(): PaymentSecurityService {
  if (!paymentSecurityService) {
    paymentSecurityService = new PaymentSecurityService();
  }
  return paymentSecurityService;
}

/**
 * Create a new payment security service with custom config.
 */
export function createPaymentSecurityService(
  config?: PaymentSecurityServiceConfig,
): PaymentSecurityService {
  return new PaymentSecurityService(config);
}

/**
 * Reset the payment security service singleton (for testing).
 */
export function resetPaymentSecurityService(): void {
  paymentSecurityService = null;
}
