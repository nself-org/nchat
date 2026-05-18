/**
 * Abuse Prevention Service
 *
 * Orchestrates all abuse detection modules and provides check methods
 * for subscription events and batch scanning for periodic audits.
 *
 * @module @/services/billing/abuse-prevention.service
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";
import type {
  AbuseReport,
  AbuseAppeal,
  AbuseEngineConfig,
  SessionRecord,
  SeatAssignment,
  SeatReassignment,
  PaymentEvent,
  RiskLevel,
  BatchScanResult,
  AppealStatus,
} from "@/lib/billing/abuse/types";
import {
  AbusePreventionEngine,
  type AbusePreventionEngine as AbusePreventionEngineType,
} from "@/lib/billing/abuse/abuse-engine";

// ============================================================================
// Service Types
// ============================================================================

export interface AbusePreventionServiceConfig {
  engineConfig?: Partial<AbuseEngineConfig>;
  /** Whether to log enforcement actions */
  logEnforcement: boolean;
  /** Callback when enforcement is applied */
  onEnforcement?: (report: AbuseReport) => void | Promise<void>;
}

export const DEFAULT_SERVICE_CONFIG: AbusePreventionServiceConfig = {
  logEnforcement: true,
};

// ============================================================================
// Abuse Prevention Service
// ============================================================================

/**
 * Service layer for abuse prevention, wrapping the engine with
 * additional orchestration and event handling.
 */
export class AbusePreventionService {
  private engine: AbusePreventionEngine;
  private config: AbusePreventionServiceConfig;

  constructor(config?: Partial<AbusePreventionServiceConfig>) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    this.engine = new AbusePreventionEngine(this.config.engineConfig);
  }

  // ========================================================================
  // Session Events
  // ========================================================================

  /**
   * Handle a user session start event.
   */
  onSessionStart(session: SessionRecord): void {
    this.engine.registerSession(session);
  }

  /**
   * Handle a user session end event.
   */
  onSessionEnd(subscriptionId: string, sessionId: string): void {
    this.engine.removeSession(subscriptionId, sessionId);
  }

  // ========================================================================
  // Seat Events
  // ========================================================================

  /**
   * Handle a seat assignment event.
   */
  onSeatAssigned(seat: SeatAssignment): void {
    this.engine.registerSeat(seat);
  }

  /**
   * Handle a seat reassignment event.
   */
  onSeatReassigned(reassignment: SeatReassignment): void {
    this.engine.recordSeatReassignment(reassignment);
  }

  // ========================================================================
  // Payment Events
  // ========================================================================

  /**
   * Handle a payment event.
   */
  onPaymentEvent(event: PaymentEvent): void {
    this.engine.recordPayment(event);
  }

  // ========================================================================
  // Abuse Checks
  // ========================================================================

  /**
   * Run a comprehensive abuse check for an account.
   */
  async checkAccount(params: {
    accountId: string;
    subscriptionId: string;
    workspaceId: string;
    userId: string;
    planTier: PlanTier;
  }): Promise<AbuseReport> {
    const report = this.engine.checkAccount(params);

    if (report.actionApplied && this.config.logEnforcement) {
      // Trigger enforcement callback if configured
      if (this.config.onEnforcement) {
        await this.config.onEnforcement(report);
      }
    }

    return report;
  }

  /**
   * Run a quick check on a single category.
   */
  quickCheck(
    category: "sharing" | "seat_abuse" | "payment_abuse",
    params: {
      userId: string;
      subscriptionId: string;
      workspaceId: string;
    },
  ): { riskLevel: RiskLevel; signalCount: number } {
    const result = this.engine.quickCheck(category, params);
    return {
      riskLevel: result.riskLevel,
      signalCount: result.signals.length,
    };
  }

  /**
   * Check if a new session would trigger sharing detection.
   */
  preflightSessionCheck(
    subscriptionId: string,
    userId: string,
  ): { allowed: boolean; currentSessions: number; maxSessions: number } {
    const detector = this.engine.getSharingDetector();
    const activeSessions = detector.getActiveSessions(subscriptionId);
    const config = detector.getConfig();

    return {
      allowed: activeSessions.length < config.maxConcurrentSessions,
      currentSessions: activeSessions.length,
      maxSessions: config.maxConcurrentSessions,
    };
  }

  // ========================================================================
  // Batch Scanning
  // ========================================================================

  /**
   * Run batch abuse scanning across accounts.
   */
  async batchScan(
    accounts: Array<{
      accountId: string;
      subscriptionId: string;
      workspaceId: string;
      userId: string;
      planTier: PlanTier;
    }>,
  ): Promise<BatchScanResult> {
    const result = this.engine.batchScan(accounts);

    // Trigger enforcement callbacks for any actions applied
    if (this.config.onEnforcement) {
      for (const report of result.reportsGenerated) {
        if (report.actionApplied) {
          await this.config.onEnforcement(report);
        }
      }
    }

    return result;
  }

  // ========================================================================
  // Appeals
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
    return this.engine.submitAppeal(reportId, accountId, reason, evidence);
  }

  /**
   * Review an appeal.
   */
  reviewAppeal(
    appealId: string,
    reviewerId: string,
    decision: "approved" | "denied",
    resolution: string,
  ): AbuseAppeal | null {
    return this.engine.reviewAppeal(appealId, reviewerId, decision, resolution);
  }

  // ========================================================================
  // Reports & Appeals Retrieval
  // ========================================================================

  /**
   * Get a report by ID.
   */
  getReport(reportId: string): AbuseReport | null {
    return this.engine.getReport(reportId);
  }

  /**
   * List reports with optional filters.
   */
  listReports(filters?: {
    accountId?: string;
    workspaceId?: string;
    riskLevel?: RiskLevel;
    limit?: number;
  }): AbuseReport[] {
    return this.engine.getReports(filters);
  }

  /**
   * Get an appeal by ID.
   */
  getAppeal(appealId: string): AbuseAppeal | null {
    return this.engine.getAppeal(appealId);
  }

  /**
   * List appeals with optional filters.
   */
  listAppeals(filters?: {
    accountId?: string;
    status?: AppealStatus;
    limit?: number;
  }): AbuseAppeal[] {
    return this.engine.getAppeals(filters);
  }

  // ========================================================================
  // False Positive Management
  // ========================================================================

  /**
   * Mark a signal as false positive.
   */
  markFalsePositive(signalId: string): boolean {
    return this.engine.markFalsePositive(signalId);
  }

  /**
   * Get false positive rate statistics.
   */
  getFalsePositiveStats(): {
    total: number;
    falsePositives: number;
    rate: number;
  } {
    return this.engine.getFalsePositiveRate();
  }

  // ========================================================================
  // Engine Access
  // ========================================================================

  /**
   * Get the underlying engine (for advanced configuration).
   */
  getEngine(): AbusePreventionEngine {
    return this.engine;
  }

  /**
   * Reset all data (for testing).
   */
  reset(): void {
    this.engine.clear();
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

let serviceInstance: AbusePreventionService | null = null;

export function getAbusePreventionService(
  config?: Partial<AbusePreventionServiceConfig>,
): AbusePreventionService {
  if (!serviceInstance) {
    serviceInstance = new AbusePreventionService(config);
  }
  return serviceInstance;
}

export function createAbusePreventionService(
  config?: Partial<AbusePreventionServiceConfig>,
): AbusePreventionService {
  serviceInstance = new AbusePreventionService(config);
  return serviceInstance;
}

export function resetAbusePreventionService(): void {
  if (serviceInstance) {
    serviceInstance.reset();
  }
  serviceInstance = null;
}
