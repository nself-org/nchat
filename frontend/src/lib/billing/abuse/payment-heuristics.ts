/**
 * Suspicious Payment Heuristics Module
 *
 * Detects payment abuse patterns:
 * - Card testing (rapid small charges)
 * - Velocity checks (too many attempts in window)
 * - BIN country mismatch with user location
 * - Disposable/virtual card detection
 * - Refund abuse (excessive refund requests)
 * - Chargeback risk scoring
 * - Amount anomaly detection
 *
 * @module @/lib/billing/abuse/payment-heuristics
 * @version 1.0.0
 */

import type {
  PaymentEvent,
  CardMetadata,
  RefundHistory,
  ChargebackRiskScore,
  ChargebackRiskFactor,
  PaymentAbuseAnalysis,
  PaymentHeuristicsConfig,
  AbuseSignal,
  RiskLevel,
  EnforcementAction,
} from "./types";
import { DEFAULT_PAYMENT_HEURISTICS_CONFIG } from "./types";

// ============================================================================
// Known Disposable/Virtual Card BIN Ranges
// ============================================================================

/**
 * Known BIN prefixes commonly associated with disposable or virtual cards.
 * This is a representative sample; real implementations would use
 * a comprehensive BIN database service.
 */
const DISPOSABLE_CARD_BINS = new Set([
  "404038", // Privacy.com
  "428837", // Revolut virtual
  "531993", // Neteller
  "420620", // Test virtual cards
  "400000", // Generic test
  "426684", // Some virtual providers
  "515735", // Some prepaid
  "559900", // Virtual/disposable
]);

// ============================================================================
// Payment Heuristics Detector
// ============================================================================

/**
 * Detects suspicious payment patterns through multiple heuristic checks.
 */
export class PaymentHeuristicsDetector {
  private config: PaymentHeuristicsConfig;
  /** Payment history indexed by userId */
  private paymentHistory = new Map<string, PaymentEvent[]>();
  private signalCounter = 0;

  constructor(config?: Partial<PaymentHeuristicsConfig>) {
    this.config = { ...DEFAULT_PAYMENT_HEURISTICS_CONFIG, ...config };
  }

  /**
   * Record a payment event.
   */
  recordPayment(event: PaymentEvent): void {
    const existing = this.paymentHistory.get(event.userId) || [];
    existing.push(event);
    // Keep only last 90 days of history
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    this.paymentHistory.set(
      event.userId,
      existing.filter((e) => e.timestamp > cutoff),
    );
  }

  /**
   * Get payment history for a user.
   */
  getPaymentHistory(userId: string): PaymentEvent[] {
    return this.paymentHistory.get(userId) || [];
  }

  /**
   * Detect card testing patterns (rapid small charges, often with failures).
   */
  detectCardTesting(userId: string): AbuseSignal | null {
    const history = this.paymentHistory.get(userId) || [];
    const now = Date.now();
    const windowEvents = history.filter(
      (e) => now - e.timestamp < this.config.cardTestingWindowMs,
    );

    // Check for rapid failed attempts
    const failedInWindow = windowEvents.filter((e) => e.status === "failed");
    if (failedInWindow.length >= this.config.maxFailedAttemptsInWindow) {
      return this.createSignal(
        "card_testing",
        userId,
        windowEvents[0]?.workspaceId || "",
        `${failedInWindow.length} failed payment attempts in ${this.config.cardTestingWindowMs / 60000}min window`,
        Math.min(0.7 + failedInWindow.length * 0.05, 1.0),
        failedInWindow.length >= this.config.maxFailedAttemptsInWindow * 2
          ? "critical"
          : "high",
        {
          failedCount: failedInWindow.length,
          threshold: this.config.maxFailedAttemptsInWindow,
          windowMinutes: this.config.cardTestingWindowMs / 60000,
        },
      );
    }

    // Check for many small charges (probing valid card)
    const smallCharges = windowEvents.filter(
      (e) =>
        e.amount <= this.config.smallChargeThreshold &&
        e.status === "succeeded",
    );
    if (smallCharges.length >= this.config.maxSmallChargesInWindow) {
      return this.createSignal(
        "card_testing",
        userId,
        windowEvents[0]?.workspaceId || "",
        `${smallCharges.length} small charges (under $${(this.config.smallChargeThreshold / 100).toFixed(2)}) in ${this.config.cardTestingWindowMs / 60000}min window`,
        0.8,
        "high",
        {
          smallChargeCount: smallCharges.length,
          threshold: this.config.maxSmallChargesInWindow,
          amounts: smallCharges.map((c) => c.amount),
        },
      );
    }

    return null;
  }

  /**
   * Check velocity (too many payment attempts in window).
   */
  checkVelocity(userId: string): AbuseSignal | null {
    const history = this.paymentHistory.get(userId) || [];
    const now = Date.now();

    const hourlyEvents = history.filter(
      (e) => now - e.timestamp < 60 * 60 * 1000,
    );
    const dailyEvents = history.filter(
      (e) => now - e.timestamp < 24 * 60 * 60 * 1000,
    );

    if (hourlyEvents.length >= this.config.maxAttemptsPerHour) {
      return this.createSignal(
        "velocity_exceeded",
        userId,
        hourlyEvents[0]?.workspaceId || "",
        `${hourlyEvents.length} payment attempts in the last hour (max: ${this.config.maxAttemptsPerHour})`,
        0.85,
        hourlyEvents.length >= this.config.maxAttemptsPerHour * 2
          ? "critical"
          : "high",
        {
          hourlyCount: hourlyEvents.length,
          hourlyMax: this.config.maxAttemptsPerHour,
        },
      );
    }

    if (dailyEvents.length >= this.config.maxAttemptsPerDay) {
      return this.createSignal(
        "velocity_exceeded",
        userId,
        dailyEvents[0]?.workspaceId || "",
        `${dailyEvents.length} payment attempts in the last 24 hours (max: ${this.config.maxAttemptsPerDay})`,
        0.75,
        "high",
        {
          dailyCount: dailyEvents.length,
          dailyMax: this.config.maxAttemptsPerDay,
        },
      );
    }

    return null;
  }

  /**
   * Check for BIN country mismatch with user's location.
   */
  checkBinCountryMismatch(
    card: CardMetadata,
    userCountry: string,
  ): AbuseSignal | null {
    if (!this.config.flagBinCountryMismatch) return null;

    if (
      card.country &&
      userCountry &&
      card.country.toLowerCase() !== userCountry.toLowerCase()
    ) {
      return this.createSignal(
        "bin_country_mismatch",
        "", // set by caller
        "",
        `Card issued in ${card.country} but user located in ${userCountry}`,
        0.6,
        "medium",
        {
          cardCountry: card.country,
          userCountry,
          cardBin: card.bin,
          last4: card.last4,
        },
      );
    }

    return null;
  }

  /**
   * Detect disposable/virtual card patterns.
   */
  detectDisposableCard(card: CardMetadata): AbuseSignal | null {
    if (!this.config.flagPrepaidCards) return null;

    // Check if card is prepaid
    if (card.fundingType === "prepaid") {
      return this.createSignal(
        "disposable_card",
        "",
        "",
        `Prepaid card detected (${card.brand} ending ${card.last4})`,
        0.5,
        "medium",
        {
          fundingType: card.fundingType,
          brand: card.brand,
          last4: card.last4,
        },
      );
    }

    // Check BIN against known disposable providers
    const bin6 = card.bin.substring(0, 6);
    if (DISPOSABLE_CARD_BINS.has(bin6)) {
      return this.createSignal(
        "disposable_card",
        "",
        "",
        `Card BIN matches known disposable/virtual card provider`,
        0.7,
        "medium",
        {
          bin: bin6,
          brand: card.brand,
          last4: card.last4,
        },
      );
    }

    return null;
  }

  /**
   * Analyze refund history for abuse patterns.
   */
  analyzeRefundAbuse(userId: string): {
    history: RefundHistory;
    signal: AbuseSignal | null;
  } {
    const events = this.paymentHistory.get(userId) || [];
    const refunds = events.filter((e) => e.isRefund || e.status === "refunded");
    const succeeded = events.filter(
      (e) => e.status === "succeeded" && !e.isRefund,
    );

    const totalRefunds = refunds.length;
    const totalRefundAmount = refunds.reduce((sum, e) => sum + e.amount, 0);
    const refundRate =
      succeeded.length > 0 ? totalRefunds / succeeded.length : 0;

    // Build reason breakdown
    const refundReasons: Record<string, number> = {};
    for (const r of refunds) {
      const reason = r.refundReason || "unspecified";
      refundReasons[reason] = (refundReasons[reason] || 0) + 1;
    }

    const history: RefundHistory = {
      userId,
      totalRefunds,
      totalRefundAmount,
      refundRate,
      recentRefunds: refunds.slice(-10),
      refundReasons,
    };

    let signal: AbuseSignal | null = null;

    if (
      totalRefunds >= this.config.minRefundsForRate &&
      refundRate >= this.config.refundRateThreshold
    ) {
      signal = this.createSignal(
        "refund_abuse",
        userId,
        events[0]?.workspaceId || "",
        `Refund rate ${(refundRate * 100).toFixed(0)}% exceeds threshold (${(this.config.refundRateThreshold * 100).toFixed(0)}%)`,
        Math.min(0.6 + (refundRate - this.config.refundRateThreshold) * 2, 1.0),
        refundRate >= 0.5 ? "high" : "medium",
        {
          refundRate,
          totalRefunds,
          totalSucceeded: succeeded.length,
          totalRefundAmount,
        },
      );
    }

    return { history, signal };
  }

  /**
   * Calculate chargeback risk score for a user.
   */
  calculateChargebackRisk(userId: string): ChargebackRiskScore {
    const events = this.paymentHistory.get(userId) || [];
    const factors: ChargebackRiskFactor[] = [];

    // Factor 1: Refund rate
    const refunds = events.filter((e) => e.isRefund || e.status === "refunded");
    const succeeded = events.filter(
      (e) => e.status === "succeeded" && !e.isRefund,
    );
    const refundRate =
      succeeded.length > 0 ? refunds.length / succeeded.length : 0;

    factors.push({
      name: "refund_rate",
      weight: 25,
      value: refundRate,
      contribution: Math.min(refundRate * 25, 25),
      description: `Refund rate: ${(refundRate * 100).toFixed(1)}%`,
    });

    // Factor 2: Failed payment rate
    const failed = events.filter((e) => e.status === "failed");
    const failRate = events.length > 0 ? failed.length / events.length : 0;

    factors.push({
      name: "failed_payment_rate",
      weight: 20,
      value: failRate,
      contribution: Math.min(failRate * 40, 20),
      description: `Failed payment rate: ${(failRate * 100).toFixed(1)}%`,
    });

    // Factor 3: Multiple cards used
    const uniqueCards = new Set(events.map((e) => e.card.fingerprint));
    const cardDiversity = uniqueCards.size;

    factors.push({
      name: "card_diversity",
      weight: 15,
      value: cardDiversity,
      contribution: Math.min((cardDiversity - 1) * 5, 15),
      description: `${cardDiversity} different cards used`,
    });

    // Factor 4: Disputed payments
    const disputed = events.filter((e) => e.status === "disputed");
    const disputeRate =
      succeeded.length > 0 ? disputed.length / succeeded.length : 0;

    factors.push({
      name: "dispute_rate",
      weight: 30,
      value: disputeRate,
      contribution: Math.min(disputeRate * 100, 30),
      description: `Dispute rate: ${(disputeRate * 100).toFixed(1)}%`,
    });

    // Factor 5: Prepaid/virtual card usage
    const prepaidCount = events.filter(
      (e) => e.card.fundingType === "prepaid",
    ).length;
    const prepaidRate = events.length > 0 ? prepaidCount / events.length : 0;

    factors.push({
      name: "prepaid_card_usage",
      weight: 10,
      value: prepaidRate,
      contribution: Math.min(prepaidRate * 20, 10),
      description: `Prepaid card usage: ${(prepaidRate * 100).toFixed(1)}%`,
    });

    // Calculate total score (0-100)
    const score = Math.min(
      Math.round(factors.reduce((sum, f) => sum + f.contribution, 0)),
      100,
    );

    let riskLevel: RiskLevel;
    if (score >= 75) riskLevel = "critical";
    else if (score >= 50) riskLevel = "high";
    else if (score >= 25) riskLevel = "medium";
    else riskLevel = "low";

    let recommendation: string;
    switch (riskLevel) {
      case "critical":
        recommendation = "Block future payments and review account immediately";
        break;
      case "high":
        recommendation = "Require additional verification before processing";
        break;
      case "medium":
        recommendation = "Monitor account and flag next payment for review";
        break;
      default:
        recommendation = "No action needed";
    }

    return {
      userId,
      score,
      riskLevel,
      factors,
      recommendation,
    };
  }

  /**
   * Detect amount anomalies for a payment event relative to expected plan ranges.
   */
  detectAmountAnomaly(
    event: PaymentEvent,
    planTier: string,
  ): AbuseSignal | null {
    const range = this.config.expectedAmountRanges[planTier];
    if (!range) return null;

    if (event.amount < range.min && range.min > 0) {
      return this.createSignal(
        "amount_anomaly",
        event.userId,
        event.workspaceId,
        `Payment amount $${(event.amount / 100).toFixed(2)} below expected minimum $${(range.min / 100).toFixed(2)} for ${planTier} plan`,
        0.6,
        "medium",
        {
          amount: event.amount,
          expectedMin: range.min,
          expectedMax: range.max,
          planTier,
        },
      );
    }

    if (event.amount > range.max) {
      return this.createSignal(
        "amount_anomaly",
        event.userId,
        event.workspaceId,
        `Payment amount $${(event.amount / 100).toFixed(2)} exceeds expected maximum $${(range.max / 100).toFixed(2)} for ${planTier} plan`,
        0.7,
        "high",
        {
          amount: event.amount,
          expectedMin: range.min,
          expectedMax: range.max,
          planTier,
        },
      );
    }

    return null;
  }

  /**
   * Run full payment abuse analysis for a user.
   */
  analyze(
    userId: string,
    workspaceId: string,
    planTier?: string,
  ): PaymentAbuseAnalysis {
    const signals: AbuseSignal[] = [];

    // 1. Card testing detection
    const cardTestingSignal = this.detectCardTesting(userId);
    if (cardTestingSignal) {
      signals.push(cardTestingSignal);
    }

    // 2. Velocity check
    const velocitySignal = this.checkVelocity(userId);
    if (velocitySignal) {
      signals.push(velocitySignal);
    }

    // 3. BIN country mismatch (check most recent payment)
    const history = this.paymentHistory.get(userId) || [];
    const lastPayment = history[history.length - 1];
    let binMismatchDetected = false;
    if (lastPayment) {
      const binSignal = this.checkBinCountryMismatch(
        lastPayment.card,
        lastPayment.userCountry,
      );
      if (binSignal) {
        binSignal.accountId = userId;
        binSignal.workspaceId = workspaceId;
        signals.push(binSignal);
        binMismatchDetected = true;
      }

      // 4. Disposable card detection
      const disposableSignal = this.detectDisposableCard(lastPayment.card);
      if (disposableSignal) {
        disposableSignal.accountId = userId;
        disposableSignal.workspaceId = workspaceId;
        signals.push(disposableSignal);
      }

      // 5. Amount anomaly
      if (planTier) {
        const amountSignal = this.detectAmountAnomaly(lastPayment, planTier);
        if (amountSignal) signals.push(amountSignal);
      }
    }

    // 6. Refund abuse
    const refundResult = this.analyzeRefundAbuse(userId);
    if (refundResult.signal) {
      signals.push(refundResult.signal);
    }

    // 7. Chargeback risk scoring
    const chargebackRisk = this.calculateChargebackRisk(userId);
    if (chargebackRisk.score >= this.config.chargebackRiskThreshold) {
      signals.push(
        this.createSignal(
          "chargeback_risk",
          userId,
          workspaceId,
          `Chargeback risk score ${chargebackRisk.score}/100 exceeds threshold ${this.config.chargebackRiskThreshold}`,
          chargebackRisk.score / 100,
          chargebackRisk.riskLevel,
          { score: chargebackRisk.score, factors: chargebackRisk.factors },
        ),
      );
    }

    // Determine overall risk
    const overallRisk = this.calculateOverallRisk(signals);
    const recommendedAction = this.getRecommendedAction(overallRisk);

    return {
      userId,
      workspaceId,
      signals,
      cardTestingDetected: cardTestingSignal !== null,
      velocityExceeded: velocitySignal !== null,
      binMismatchDetected,
      disposableCardDetected: signals.some(
        (s) => s.indicatorType === "disposable_card",
      ),
      refundAbuseDetected: refundResult.signal !== null,
      chargebackRisk,
      overallRisk,
      recommendedAction,
    };
  }

  /**
   * Get the configuration.
   */
  getConfig(): PaymentHeuristicsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(update: Partial<PaymentHeuristicsConfig>): void {
    this.config = { ...this.config, ...update };
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.paymentHistory.clear();
    this.signalCounter = 0;
  }

  // ---- Private helpers ----

  private createSignal(
    indicatorType: string,
    userId: string,
    workspaceId: string,
    description: string,
    confidence: number,
    riskLevel: RiskLevel,
    evidence: Record<string, unknown>,
  ): AbuseSignal {
    this.signalCounter++;
    return {
      id: `sig_payment_${this.signalCounter}_${Date.now()}`,
      category: "payment_abuse",
      indicatorType,
      riskLevel,
      confidence,
      description,
      accountId: userId,
      workspaceId,
      detectedAt: Date.now(),
      evidence,
      isFalsePositive: false,
    };
  }

  private calculateOverallRisk(signals: AbuseSignal[]): RiskLevel {
    if (signals.length === 0) return "low";

    const hasCritical = signals.some((s) => s.riskLevel === "critical");
    const hasHigh = signals.some((s) => s.riskLevel === "high");
    const mediumCount = signals.filter((s) => s.riskLevel === "medium").length;

    if (hasCritical) return "critical";
    if (hasHigh && signals.length >= 2) return "critical";
    if (hasHigh) return "high";
    if (mediumCount >= 3) return "high";
    if (mediumCount >= 1) return "medium";
    return "low";
  }

  private getRecommendedAction(riskLevel: RiskLevel): EnforcementAction {
    switch (riskLevel) {
      case "low":
        return "none";
      case "medium":
        return "warn";
      case "high":
        return "require_verification";
      case "critical":
        return "block";
    }
  }
}
