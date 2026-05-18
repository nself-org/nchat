/**
 * Abuse Prevention Engine
 *
 * Combines all abuse detection signals into a unified risk assessment system.
 * - Aggregates signals from sharing, seat abuse, and payment heuristics
 * - Maps composite scores to risk levels
 * - Applies automated enforcement actions
 * - Manages appeal workflows
 * - Tracks false positives for feedback loops
 * - Maintains full audit trail
 *
 * @module @/lib/billing/abuse/abuse-engine
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";
import type {
  AbuseReport,
  AbuseAppeal,
  AbuseAuditEntry,
  AbuseSignal,
  AbuseEngineConfig,
  PlanAbuseConfig,
  RiskLevel,
  EnforcementAction,
  BatchScanResult,
  SessionRecord,
  SeatAssignment,
  SeatReassignment,
  PaymentEvent,
  AppealStatus,
} from "./types";
import {
  DEFAULT_ABUSE_ENGINE_CONFIG,
  DEFAULT_PLAN_ABUSE_CONFIG,
} from "./types";
import { AntiSharingDetector } from "./anti-sharing";
import { SeatAbuseDetector } from "./seat-abuse";
import { PaymentHeuristicsDetector } from "./payment-heuristics";

// ============================================================================
// Abuse Prevention Engine
// ============================================================================

/**
 * Unified abuse prevention engine that orchestrates all detection modules.
 */
export class AbusePreventionEngine {
  private config: AbuseEngineConfig;
  private sharingDetector: AntiSharingDetector;
  private seatDetector: SeatAbuseDetector;
  private paymentDetector: PaymentHeuristicsDetector;

  /** Generated reports indexed by ID */
  private reports = new Map<string, AbuseReport>();
  /** Appeals indexed by ID */
  private appeals = new Map<string, AbuseAppeal>();
  /** False positive signal IDs */
  private falsePositives = new Set<string>();
  /** Enforcement cooldown tracker: accountId -> last enforcement timestamp */
  private enforcementCooldowns = new Map<string, number>();
  /** Counter for generating IDs */
  private idCounter = 0;

  constructor(config?: Partial<AbuseEngineConfig>) {
    this.config = { ...DEFAULT_ABUSE_ENGINE_CONFIG, ...config };

    // Initialize detectors with default plan config
    const defaultPlanConfig = this.config.defaultConfig;
    this.sharingDetector = new AntiSharingDetector(defaultPlanConfig.sharing);
    this.seatDetector = new SeatAbuseDetector(defaultPlanConfig.seatAbuse);
    this.paymentDetector = new PaymentHeuristicsDetector(
      defaultPlanConfig.paymentHeuristics,
    );
  }

  // ========================================================================
  // Data Ingestion
  // ========================================================================

  /**
   * Register a session for sharing detection.
   */
  registerSession(session: SessionRecord): void {
    this.sharingDetector.registerSession(session);
  }

  /**
   * Remove a session.
   */
  removeSession(subscriptionId: string, sessionId: string): void {
    this.sharingDetector.removeSession(subscriptionId, sessionId);
  }

  /**
   * Register a seat assignment.
   */
  registerSeat(seat: SeatAssignment): void {
    this.seatDetector.registerSeat(seat);
  }

  /**
   * Record a seat reassignment.
   */
  recordSeatReassignment(reassignment: SeatReassignment): void {
    this.seatDetector.recordReassignment(reassignment);
  }

  /**
   * Record a payment event.
   */
  recordPayment(event: PaymentEvent): void {
    this.paymentDetector.recordPayment(event);
  }

  // ========================================================================
  // Abuse Checking
  // ========================================================================

  /**
   * Run a comprehensive abuse check for an account.
   */
  checkAccount(params: {
    accountId: string;
    subscriptionId: string;
    workspaceId: string;
    userId: string;
    planTier: PlanTier;
  }): AbuseReport {
    if (!this.config.enabled) {
      return this.createEmptyReport(params);
    }

    // Get plan-specific config
    const planConfig = this.getPlanConfig(params.planTier);
    this.applyPlanConfig(planConfig);

    const signals: AbuseSignal[] = [];
    let sharingAnalysis = null;
    let seatAnalysis = null;
    let paymentAnalysis = null;

    // 1. Anti-sharing analysis
    if (this.config.enabledCategories.includes("sharing")) {
      sharingAnalysis = this.sharingDetector.analyze(
        params.subscriptionId,
        params.userId,
      );
      signals.push(...sharingAnalysis.signals);
    }

    // 2. Seat abuse analysis
    if (this.config.enabledCategories.includes("seat_abuse")) {
      seatAnalysis = this.seatDetector.analyze(
        params.subscriptionId,
        params.workspaceId,
      );
      signals.push(...seatAnalysis.signals);
    }

    // 3. Payment heuristics analysis
    if (this.config.enabledCategories.includes("payment_abuse")) {
      paymentAnalysis = this.paymentDetector.analyze(
        params.userId,
        params.workspaceId,
        params.planTier,
      );
      signals.push(...paymentAnalysis.signals);
    }

    // Filter out known false positives
    const activeSignals = signals.filter(
      (s) => !this.falsePositives.has(s.id) && !s.isFalsePositive,
    );

    // Calculate composite risk score
    const riskScore = this.calculateRiskScore(activeSignals);
    const riskLevel = this.scoreToRiskLevel(riskScore);
    const recommendedAction = this.config.enforcementPolicy[riskLevel];

    // Determine if enforcement should be applied
    let actionApplied = false;
    let appliedAction: EnforcementAction | null = null;

    if (
      this.config.autoEnforce &&
      recommendedAction !== "none" &&
      !this.isInCooldown(params.accountId)
    ) {
      appliedAction = recommendedAction;
      actionApplied = true;
      this.enforcementCooldowns.set(params.accountId, Date.now());
    }

    // Build the report
    const report: AbuseReport = {
      id: this.generateId("report"),
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      workspaceId: params.workspaceId,
      planTier: params.planTier,
      generatedAt: Date.now(),
      riskScore,
      riskLevel,
      signals: activeSignals,
      sharingAnalysis,
      seatAnalysis,
      paymentAnalysis,
      recommendedAction,
      actionApplied,
      appliedAction,
      appeal: null,
      auditTrail: [
        this.createAuditEntry(
          this.generateId("audit"),
          "abuse_check_completed",
          "system",
          "system",
          {
            riskScore,
            riskLevel,
            signalCount: activeSignals.length,
            actionApplied,
            appliedAction,
          },
        ),
      ],
    };

    // Store the report
    this.reports.set(report.id, report);

    return report;
  }

  /**
   * Run a quick check on a specific category only.
   */
  quickCheck(
    category: "sharing" | "seat_abuse" | "payment_abuse",
    params: {
      userId: string;
      subscriptionId: string;
      workspaceId: string;
    },
  ): { riskLevel: RiskLevel; signals: AbuseSignal[] } {
    switch (category) {
      case "sharing": {
        const analysis = this.sharingDetector.analyze(
          params.subscriptionId,
          params.userId,
        );
        return {
          riskLevel: analysis.overallRisk,
          signals: analysis.signals,
        };
      }
      case "seat_abuse": {
        const analysis = this.seatDetector.analyze(
          params.subscriptionId,
          params.workspaceId,
        );
        return {
          riskLevel: analysis.overallRisk,
          signals: analysis.signals,
        };
      }
      case "payment_abuse": {
        const analysis = this.paymentDetector.analyze(
          params.userId,
          params.workspaceId,
        );
        return {
          riskLevel: analysis.overallRisk,
          signals: analysis.signals,
        };
      }
    }
  }

  // ========================================================================
  // Batch Scanning
  // ========================================================================

  /**
   * Run batch abuse scanning across multiple accounts.
   */
  batchScan(
    accounts: Array<{
      accountId: string;
      subscriptionId: string;
      workspaceId: string;
      userId: string;
      planTier: PlanTier;
    }>,
  ): BatchScanResult {
    const startTime = Date.now();
    const reports: AbuseReport[] = [];
    const errors: Array<{ accountId: string; error: string }> = [];
    const riskDistribution: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    let actionsApplied = 0;

    for (const account of accounts) {
      try {
        const report = this.checkAccount(account);
        reports.push(report);
        riskDistribution[report.riskLevel]++;
        if (report.actionApplied) actionsApplied++;
      } catch (err) {
        errors.push({
          accountId: account.accountId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      scannedAt: startTime,
      totalAccounts: accounts.length,
      accountsScanned: accounts.length - errors.length,
      reportsGenerated: reports,
      riskDistribution,
      actionsApplied,
      errors,
    };
  }

  // ========================================================================
  // Appeal Workflow
  // ========================================================================

  /**
   * Submit an appeal for a report.
   */
  submitAppeal(
    reportId: string,
    accountId: string,
    reason: string,
    evidence?: string,
  ): AbuseAppeal | null {
    const report = this.reports.get(reportId);
    if (!report) return null;

    if (report.accountId !== accountId) return null;

    const appeal: AbuseAppeal = {
      id: this.generateId("appeal"),
      reportId,
      accountId,
      status: "pending",
      reason,
      evidence,
      submittedAt: Date.now(),
      restoredAccess: false,
    };

    this.appeals.set(appeal.id, appeal);
    report.appeal = appeal;

    // Add audit entry
    report.auditTrail.push(
      this.createAuditEntry(
        this.generateId("audit"),
        "appeal_submitted",
        accountId,
        "user",
        { reason, hasEvidence: !!evidence },
      ),
    );

    return appeal;
  }

  /**
   * Review and decide an appeal.
   */
  reviewAppeal(
    appealId: string,
    reviewerId: string,
    decision: "approved" | "denied",
    resolution: string,
  ): AbuseAppeal | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    appeal.status = decision as AppealStatus;
    appeal.reviewedAt = Date.now();
    appeal.reviewedBy = reviewerId;
    appeal.resolution = resolution;

    if (decision === "approved") {
      appeal.restoredAccess = true;
      // Remove enforcement cooldown
      this.enforcementCooldowns.delete(appeal.accountId);
    }

    // Update report
    const report = this.reports.get(appeal.reportId);
    if (report) {
      report.appeal = appeal;
      report.auditTrail.push(
        this.createAuditEntry(
          this.generateId("audit"),
          `appeal_${decision}`,
          reviewerId,
          "admin",
          { resolution, restoredAccess: appeal.restoredAccess },
        ),
      );

      // If approved, mark signals as false positives
      if (decision === "approved") {
        for (const signal of report.signals) {
          signal.isFalsePositive = true;
          this.falsePositives.add(signal.id);
        }
        report.actionApplied = false;
        report.appliedAction = null;
      }
    }

    return appeal;
  }

  // ========================================================================
  // False Positive Management
  // ========================================================================

  /**
   * Mark a specific signal as a false positive.
   */
  markFalsePositive(signalId: string): boolean {
    this.falsePositives.add(signalId);

    // Update any reports containing this signal
    for (const report of this.reports.values()) {
      const signal = report.signals.find((s) => s.id === signalId);
      if (signal) {
        signal.isFalsePositive = true;
        report.auditTrail.push(
          this.createAuditEntry(
            this.generateId("audit"),
            "signal_marked_false_positive",
            "system",
            "admin",
            { signalId },
          ),
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Get the false positive rate (for calibration).
   */
  getFalsePositiveRate(): {
    total: number;
    falsePositives: number;
    rate: number;
  } {
    let total = 0;
    let fpCount = 0;

    for (const report of this.reports.values()) {
      for (const signal of report.signals) {
        total++;
        if (signal.isFalsePositive) fpCount++;
      }
    }

    return {
      total,
      falsePositives: fpCount,
      rate: total > 0 ? fpCount / total : 0,
    };
  }

  // ========================================================================
  // Report & Appeal Retrieval
  // ========================================================================

  /**
   * Get a report by ID.
   */
  getReport(reportId: string): AbuseReport | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * Get all reports, optionally filtered.
   */
  getReports(filters?: {
    accountId?: string;
    workspaceId?: string;
    riskLevel?: RiskLevel;
    limit?: number;
  }): AbuseReport[] {
    let reports = Array.from(this.reports.values());

    if (filters?.accountId) {
      reports = reports.filter((r) => r.accountId === filters.accountId);
    }
    if (filters?.workspaceId) {
      reports = reports.filter((r) => r.workspaceId === filters.workspaceId);
    }
    if (filters?.riskLevel) {
      reports = reports.filter((r) => r.riskLevel === filters.riskLevel);
    }

    reports.sort((a, b) => b.generatedAt - a.generatedAt);

    if (filters?.limit) {
      reports = reports.slice(0, filters.limit);
    }

    return reports;
  }

  /**
   * Get an appeal by ID.
   */
  getAppeal(appealId: string): AbuseAppeal | null {
    return this.appeals.get(appealId) || null;
  }

  /**
   * Get all appeals, optionally filtered.
   */
  getAppeals(filters?: {
    accountId?: string;
    status?: AppealStatus;
    limit?: number;
  }): AbuseAppeal[] {
    let appeals = Array.from(this.appeals.values());

    if (filters?.accountId) {
      appeals = appeals.filter((a) => a.accountId === filters.accountId);
    }
    if (filters?.status) {
      appeals = appeals.filter((a) => a.status === filters.status);
    }

    appeals.sort((a, b) => b.submittedAt - a.submittedAt);

    if (filters?.limit) {
      appeals = appeals.slice(0, filters.limit);
    }

    return appeals;
  }

  // ========================================================================
  // Configuration
  // ========================================================================

  /**
   * Get the engine configuration.
   */
  getConfig(): AbuseEngineConfig {
    return { ...this.config };
  }

  /**
   * Update the engine configuration.
   */
  updateConfig(update: Partial<AbuseEngineConfig>): void {
    this.config = { ...this.config, ...update };
  }

  /**
   * Get plan-specific abuse config.
   */
  getPlanConfig(planTier: PlanTier): PlanAbuseConfig {
    return this.config.planConfigs[planTier] || this.config.defaultConfig;
  }

  /**
   * Get the sharing detector instance (for advanced use).
   */
  getSharingDetector(): AntiSharingDetector {
    return this.sharingDetector;
  }

  /**
   * Get the seat detector instance (for advanced use).
   */
  getSeatDetector(): SeatAbuseDetector {
    return this.seatDetector;
  }

  /**
   * Get the payment detector instance (for advanced use).
   */
  getPaymentDetector(): PaymentHeuristicsDetector {
    return this.paymentDetector;
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.reports.clear();
    this.appeals.clear();
    this.falsePositives.clear();
    this.enforcementCooldowns.clear();
    this.sharingDetector.clear();
    this.seatDetector.clear();
    this.paymentDetector.clear();
    this.idCounter = 0;
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Calculate a composite risk score from a set of signals (0-100).
   */
  private calculateRiskScore(signals: AbuseSignal[]): number {
    if (signals.length === 0) return 0;

    // Weight by risk level
    const levelWeights: Record<RiskLevel, number> = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    };

    let totalWeight = 0;
    for (const signal of signals) {
      totalWeight += levelWeights[signal.riskLevel] * signal.confidence;
    }

    // Cap at 100
    return Math.min(Math.round(totalWeight), 100);
  }

  /**
   * Convert a numeric risk score to a risk level using configured thresholds.
   */
  private scoreToRiskLevel(score: number): RiskLevel {
    if (score <= this.config.riskThresholds.low) return "low";
    if (score <= this.config.riskThresholds.medium) return "medium";
    if (score <= this.config.riskThresholds.high) return "high";
    return "critical";
  }

  /**
   * Check if an account is in enforcement cooldown.
   */
  private isInCooldown(accountId: string): boolean {
    const lastEnforcement = this.enforcementCooldowns.get(accountId);
    if (!lastEnforcement) return false;
    return Date.now() - lastEnforcement < this.config.enforcementCooldownMs;
  }

  /**
   * Apply plan-specific config to detectors.
   */
  private applyPlanConfig(config: PlanAbuseConfig): void {
    this.sharingDetector.updateConfig(config.sharing);
    this.seatDetector.updateConfig(config.seatAbuse);
    this.paymentDetector.updateConfig(config.paymentHeuristics);
  }

  /**
   * Create an empty report (when engine is disabled).
   */
  private createEmptyReport(params: {
    accountId: string;
    subscriptionId: string;
    workspaceId: string;
    planTier: PlanTier;
  }): AbuseReport {
    return {
      id: this.generateId("report"),
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      workspaceId: params.workspaceId,
      planTier: params.planTier,
      generatedAt: Date.now(),
      riskScore: 0,
      riskLevel: "low",
      signals: [],
      sharingAnalysis: null,
      seatAnalysis: null,
      paymentAnalysis: null,
      recommendedAction: "none",
      actionApplied: false,
      appliedAction: null,
      appeal: null,
      auditTrail: [],
    };
  }

  /**
   * Generate a unique ID.
   */
  private generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${this.idCounter}_${Date.now()}`;
  }

  /**
   * Create an audit trail entry.
   */
  private createAuditEntry(
    id: string,
    action: string,
    actor: string,
    actorType: "system" | "admin" | "user",
    details: Record<string, unknown>,
  ): AbuseAuditEntry {
    return {
      id,
      reportId: "",
      action,
      actor,
      actorType,
      timestamp: Date.now(),
      details,
    };
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

let instance: AbusePreventionEngine | null = null;

/**
 * Get the singleton AbusePreventionEngine instance.
 */
export function getAbusePreventionEngine(
  config?: Partial<AbuseEngineConfig>,
): AbusePreventionEngine {
  if (!instance) {
    instance = new AbusePreventionEngine(config);
  }
  return instance;
}

/**
 * Create a new AbusePreventionEngine instance (replaces singleton).
 */
export function createAbusePreventionEngine(
  config?: Partial<AbuseEngineConfig>,
): AbusePreventionEngine {
  instance = new AbusePreventionEngine(config);
  return instance;
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetAbusePreventionEngine(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}
