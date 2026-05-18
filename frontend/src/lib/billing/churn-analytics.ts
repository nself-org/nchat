/**
 * Churn Analytics
 *
 * Calculates churn rates, retention cohorts, and at-risk customer detection.
 * Provides tools for understanding customer attrition patterns.
 *
 * @module @/lib/billing/churn-analytics
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";
import type {
  AnalyticsDateRange,
  AnalyticsSubscription,
  ChurnMetrics,
  RetentionCohort,
  AtRiskCustomer,
  AtRiskSignal,
  AtRiskSignalType,
  ChurnAnalyticsReport,
  CancellationReasonBreakdown,
  TimePeriodBucket,
} from "./analytics-types";
import { generateTimePeriods } from "./revenue-analytics";

// ============================================================================
// Churn Rate Calculation
// ============================================================================

/**
 * Calculate churn metrics for a single period.
 */
export function calculateChurnMetrics(
  subscriptions: AnalyticsSubscription[],
  period: TimePeriodBucket,
): ChurnMetrics {
  // Active subscriptions at start of period
  const activeAtStart = subscriptions.filter((sub) => {
    const createdBefore = sub.createdAt <= period.periodStart;
    const isActive = sub.state === "active" || sub.state === "trial";
    const notCanceledBeforeStart =
      !sub.canceledAt || sub.canceledAt > period.periodStart;
    return createdBefore && (isActive || notCanceledBeforeStart);
  });

  // Subscriptions canceled during the period
  const canceledDuringPeriod = subscriptions.filter((sub) => {
    return (
      sub.canceledAt !== null &&
      sub.canceledAt >= period.periodStart &&
      sub.canceledAt <= period.periodEnd &&
      sub.createdAt <= period.periodStart
    );
  });

  const startCount = activeAtStart.length;
  const canceledCount = canceledDuringPeriod.length;

  // Customer churn rate
  const customerChurnRate =
    startCount > 0 ? Math.round((canceledCount / startCount) * 10000) / 100 : 0;

  // Revenue churn
  const startMRR = activeAtStart.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const churnedMRR = canceledDuringPeriod.reduce(
    (sum, s) => sum + s.monthlyAmount,
    0,
  );
  const revenueChurnRate =
    startMRR > 0 ? Math.round((churnedMRR / startMRR) * 10000) / 100 : 0;

  // Expansion revenue during period (upgrades)
  const expansionMRR = subscriptions
    .filter((sub) => {
      const wasActive = activeAtStart.find((a) => a.id === sub.id);
      return wasActive && sub.monthlyAmount > wasActive.monthlyAmount;
    })
    .reduce((sum, sub) => {
      const prev = activeAtStart.find((a) => a.id === sub.id);
      return sum + (sub.monthlyAmount - (prev?.monthlyAmount ?? 0));
    }, 0);

  // Net revenue churn = (churned - expansion) / start MRR
  const netRevenueChurnRate =
    startMRR > 0
      ? Math.round(((churnedMRR - expansionMRR) / startMRR) * 10000) / 100
      : 0;

  return {
    startCount,
    canceledCount,
    customerChurnRate,
    revenueChurnRate,
    netRevenueChurnRate,
    churnedMRR,
    period,
  };
}

/**
 * Calculate churn time series over a date range.
 */
export function calculateChurnTimeSeries(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
): ChurnMetrics[] {
  const periods = generateTimePeriods(dateRange);
  return periods.map((period) => calculateChurnMetrics(subscriptions, period));
}

// ============================================================================
// Retention Cohorts
// ============================================================================

/**
 * Calculate retention cohorts.
 * Groups customers by their signup month and tracks retention over subsequent months.
 */
export function calculateRetentionCohorts(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
  maxMonths: number = 12,
): RetentionCohort[] {
  const cohorts: RetentionCohort[] = [];

  // Group subscriptions by signup month
  const cohortMap = new Map<string, AnalyticsSubscription[]>();
  for (const sub of subscriptions) {
    if (
      sub.createdAt < dateRange.startDate ||
      sub.createdAt > dateRange.endDate
    ) {
      continue;
    }
    const key = `${sub.createdAt.getFullYear()}-${String(sub.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!cohortMap.has(key)) {
      cohortMap.set(key, []);
    }
    cohortMap.get(key)!.push(sub);
  }

  // Sort cohort keys chronologically
  const sortedKeys = Array.from(cohortMap.keys()).sort();

  for (const key of sortedKeys) {
    const cohortSubs = cohortMap.get(key)!;
    const cohortDate = new Date(`${key}-01T00:00:00Z`);
    const cohortSize = cohortSubs.length;

    if (cohortSize === 0) continue;

    const retentionByMonth: number[] = [];
    const revenueRetentionByMonth: number[] = [];
    const initialMRR = cohortSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);

    for (let month = 0; month <= maxMonths; month++) {
      const checkDate = new Date(cohortDate);
      checkDate.setMonth(checkDate.getMonth() + month);

      // Don't go beyond the end date
      if (checkDate > dateRange.endDate) break;

      const retained = cohortSubs.filter((sub) => {
        const notCanceled = !sub.canceledAt || sub.canceledAt > checkDate;
        return notCanceled;
      });

      const retainedCount = retained.length;
      const retainedMRR = retained.reduce((sum, s) => sum + s.monthlyAmount, 0);

      retentionByMonth.push(
        Math.round((retainedCount / cohortSize) * 10000) / 100,
      );
      revenueRetentionByMonth.push(
        initialMRR > 0
          ? Math.round((retainedMRR / initialMRR) * 10000) / 100
          : 0,
      );
    }

    cohorts.push({
      cohortDate,
      cohortLabel: key,
      cohortSize,
      retentionByMonth,
      revenueRetentionByMonth,
    });
  }

  return cohorts;
}

// ============================================================================
// At-Risk Detection
// ============================================================================

/**
 * Default signal weights for risk scoring.
 */
export const DEFAULT_SIGNAL_WEIGHTS: Record<AtRiskSignalType, number> = {
  payment_failed: 0.35,
  downgrade: 0.25,
  usage_decline: 0.15,
  support_tickets: 0.1,
  no_login: 0.2,
  feature_disengagement: 0.1,
  contract_ending: 0.15,
  competitor_mention: 0.2,
};

/**
 * Detect at-risk signals for a subscription.
 */
export function detectAtRiskSignals(
  subscription: AnalyticsSubscription,
  now: Date = new Date(),
): AtRiskSignal[] {
  const signals: AtRiskSignal[] = [];

  // Payment failure signal
  if (subscription.state === "past_due" || subscription.state === "grace") {
    signals.push({
      type: "payment_failed",
      weight: DEFAULT_SIGNAL_WEIGHTS.payment_failed,
      description: `Subscription is in ${subscription.state} state`,
      detectedAt: now,
      metadata: { state: subscription.state },
    });
  }

  // Inactivity signal
  const daysSinceActive = Math.floor(
    (now.getTime() - subscription.lastActiveAt.getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (daysSinceActive > 14) {
    const weight = Math.min(
      DEFAULT_SIGNAL_WEIGHTS.no_login * (daysSinceActive / 14),
      0.5,
    );
    signals.push({
      type: "no_login",
      weight,
      description: `No login for ${daysSinceActive} days`,
      detectedAt: now,
      metadata: { daysSinceActive },
    });
  }

  // Contract ending signal (for annual subscriptions nearing renewal)
  if (subscription.interval === "yearly") {
    const tenureMonths = Math.floor(
      (now.getTime() - subscription.createdAt.getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    );
    const monthsUntilRenewal = 12 - (tenureMonths % 12);
    if (monthsUntilRenewal <= 2) {
      signals.push({
        type: "contract_ending",
        weight: DEFAULT_SIGNAL_WEIGHTS.contract_ending,
        description: `Annual contract renews in ${monthsUntilRenewal} month(s)`,
        detectedAt: now,
        metadata: { monthsUntilRenewal, tenureMonths },
      });
    }
  }

  return signals;
}

/**
 * Calculate risk score from signals (0-100).
 */
export function calculateRiskScore(signals: AtRiskSignal[]): number {
  if (signals.length === 0) return 0;

  // Sum weighted signals, capped at 100
  const rawScore = signals.reduce(
    (sum, signal) => sum + signal.weight * 100,
    0,
  );
  return Math.min(100, Math.round(rawScore));
}

/**
 * Assess at-risk customers from a set of subscriptions.
 */
export function assessAtRiskCustomers(
  subscriptions: AnalyticsSubscription[],
  riskThreshold: number = 20,
  now: Date = new Date(),
): AtRiskCustomer[] {
  const atRisk: AtRiskCustomer[] = [];

  for (const sub of subscriptions) {
    // Only assess active subscriptions
    if (
      sub.state !== "active" &&
      sub.state !== "trial" &&
      sub.state !== "grace" &&
      sub.state !== "past_due"
    ) {
      continue;
    }

    const signals = detectAtRiskSignals(sub, now);
    const riskScore = calculateRiskScore(signals);

    if (riskScore >= riskThreshold) {
      const daysSinceActive = Math.floor(
        (now.getTime() - sub.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const tenureMonths = Math.floor(
        (now.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );

      atRisk.push({
        workspaceId: sub.workspaceId,
        organizationId: sub.organizationId,
        plan: sub.plan,
        monthlyRevenue: sub.monthlyAmount,
        riskScore,
        signals,
        daysSinceActive,
        tenureMonths,
        assessedAt: now,
      });
    }
  }

  // Sort by risk score descending
  return atRisk.sort((a, b) => b.riskScore - a.riskScore);
}

// ============================================================================
// Cancellation Reason Analysis
// ============================================================================

/**
 * Analyze cancellation reasons.
 */
export function analyzeCancellationReasons(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
): CancellationReasonBreakdown[] {
  const canceled = subscriptions.filter(
    (sub) =>
      sub.canceledAt !== null &&
      sub.canceledAt >= dateRange.startDate &&
      sub.canceledAt <= dateRange.endDate,
  );

  if (canceled.length === 0) return [];

  const reasonMap = new Map<string, { count: number; mrrLost: number }>();

  for (const sub of canceled) {
    const reason = sub.cancellationReason || "unknown";
    const existing = reasonMap.get(reason) || { count: 0, mrrLost: 0 };
    existing.count += 1;
    existing.mrrLost += sub.monthlyAmount;
    reasonMap.set(reason, existing);
  }

  const total = canceled.length;
  return Array.from(reasonMap.entries())
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: Math.round((data.count / total) * 10000) / 100,
      mrrLost: data.mrrLost,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// Complete Churn Report
// ============================================================================

/**
 * Generate a complete churn analytics report.
 */
export function generateChurnReport(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
  riskThreshold: number = 20,
): ChurnAnalyticsReport {
  const churnTimeSeries = calculateChurnTimeSeries(subscriptions, dateRange);
  const currentChurn =
    churnTimeSeries.length > 0
      ? churnTimeSeries[churnTimeSeries.length - 1]
      : calculateChurnMetrics(subscriptions, {
          periodStart: dateRange.startDate,
          periodEnd: dateRange.endDate,
          label: "current",
        });

  const retentionCohorts = calculateRetentionCohorts(subscriptions, dateRange);
  const atRiskCustomers = assessAtRiskCustomers(subscriptions, riskThreshold);
  const cancellationReasons = analyzeCancellationReasons(
    subscriptions,
    dateRange,
  );

  return {
    dateRange,
    currentChurn,
    churnTimeSeries,
    retentionCohorts,
    atRiskCustomers,
    cancellationReasons,
    generatedAt: new Date(),
  };
}
