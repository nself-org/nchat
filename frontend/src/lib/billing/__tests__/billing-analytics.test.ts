/**
 * Billing Analytics Comprehensive Tests
 *
 * Tests for revenue analytics, churn analytics, customer analytics,
 * entitlement drift detection, finance reconciliation, and report generation.
 *
 * Target: 120+ tests covering all billing analytics functionality.
 *
 * @module @/lib/billing/__tests__/billing-analytics.test
 */

import type {
  AnalyticsSubscription,
  AnalyticsPayment,
  AnalyticsUsageRecord,
  AnalyticsDateRange,
  LedgerEntry,
  TimePeriodBucket,
  MRRSnapshot,
  DriftSeverity,
} from "../analytics-types";
import {
  BillingAnalyticsError,
  BillingAnalyticsErrorCode,
} from "../analytics-types";

// Revenue analytics
import {
  generateTimePeriods,
  calculateMRRSnapshot,
  calculateMRRTimeSeries,
  calculateRevenueByPlan,
  calculateRevenueGrowth,
  calculateTotalRevenue,
  generateRevenueReport,
} from "../revenue-analytics";

// Churn analytics
import {
  calculateChurnMetrics,
  calculateChurnTimeSeries,
  calculateRetentionCohorts,
  detectAtRiskSignals,
  calculateRiskScore,
  assessAtRiskCustomers,
  analyzeCancellationReasons,
  generateChurnReport,
  DEFAULT_SIGNAL_WEIGHTS,
} from "../churn-analytics";

// Customer analytics
import {
  calculateARPU,
  calculateARPUTimeSeries,
  calculateAverageLifespan,
  calculateLTV,
  segmentByPlan,
  segmentByTenure,
  generateCustomerReport,
} from "../customer-analytics";

// Entitlement drift
import {
  classifyOverUsageSeverity,
  classifyUnderUsageSeverity,
  getPlanLimitForResource,
  getRecommendedAction,
  detectDrift,
  detectAllDrift,
  estimateRevenueImpact,
  generateDriftAlerts,
  resetAlertCounter,
  generateDriftReport,
  DRIFT_SEVERITY_THRESHOLDS,
  UNDER_USAGE_THRESHOLDS,
} from "../entitlement-drift";

// Finance reconciliation
import {
  matchByExternalId,
  matchByAmountAndTime,
  calculateReconciliationSummary,
  reconcile,
  DEFAULT_TOLERANCE_CENTS,
  MAX_TIMING_DIFFERENCE_MS,
} from "../finance-reconciliation";

// Service layer
import {
  BillingAnalyticsService,
  createBillingAnalyticsService,
  getBillingAnalyticsService,
  resetBillingAnalyticsService,
  toCsv,
} from "@/services/billing/billing-analytics.service";

// ============================================================================
// Test Data Helpers
// ============================================================================

function createDate(offset: number, unit: "days" | "months" = "days"): Date {
  const d = new Date("2026-01-15T00:00:00Z");
  if (unit === "days") {
    d.setDate(d.getDate() + offset);
  } else {
    d.setMonth(d.getMonth() + offset);
  }
  return d;
}

function makeSub(
  overrides: Partial<AnalyticsSubscription> = {},
): AnalyticsSubscription {
  return {
    id: `sub-${Math.random().toString(36).substring(2, 9)}`,
    workspaceId: `ws-${Math.random().toString(36).substring(2, 9)}`,
    organizationId: `org-${Math.random().toString(36).substring(2, 9)}`,
    plan: "professional",
    interval: "monthly",
    state: "active",
    monthlyAmount: 4900, // $49.00
    createdAt: createDate(-90),
    canceledAt: null,
    cancellationReason: null,
    lastActiveAt: createDate(-1),
    cac: null,
    ...overrides,
  };
}

function makePayment(
  overrides: Partial<AnalyticsPayment> = {},
): AnalyticsPayment {
  return {
    id: `pay-${Math.random().toString(36).substring(2, 9)}`,
    subscriptionId: "sub-1",
    workspaceId: "ws-1",
    amount: 4900,
    currency: "USD",
    source: "stripe",
    externalId: `pi_${Math.random().toString(36).substring(2, 12)}`,
    status: "succeeded",
    createdAt: createDate(-5),
    ...overrides,
  };
}

function makeUsageRecord(
  overrides: Partial<AnalyticsUsageRecord> = {},
): AnalyticsUsageRecord {
  return {
    workspaceId: "ws-1",
    organizationId: "org-1",
    plan: "starter",
    resource: "members",
    currentUsage: 15,
    planLimit: 25,
    recordedAt: new Date(),
    ...overrides,
  };
}

function makeLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `entry-${Math.random().toString(36).substring(2, 9)}`,
    source: "stripe",
    externalId: `pi_${Math.random().toString(36).substring(2, 12)}`,
    entityId: "ws-1",
    amount: 4900,
    currency: "USD",
    type: "payment",
    description: "Monthly subscription",
    timestamp: createDate(-5),
    metadata: {},
    ...overrides,
  };
}

const defaultDateRange: AnalyticsDateRange = {
  startDate: createDate(-90),
  endDate: createDate(0),
  granularity: "monthly",
};

const defaultPeriod: TimePeriodBucket = {
  periodStart: createDate(-30),
  periodEnd: createDate(0),
  label: "2026-01",
};

// ============================================================================
// Revenue Analytics Tests
// ============================================================================

describe("Revenue Analytics", () => {
  describe("generateTimePeriods", () => {
    it("generates monthly periods", () => {
      const range: AnalyticsDateRange = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
        granularity: "monthly",
      };
      const periods = generateTimePeriods(range);
      expect(periods.length).toBeGreaterThanOrEqual(3);
      expect(periods[0].label).toBe("2026-01");
    });

    it("generates daily periods", () => {
      const range: AnalyticsDateRange = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-07"),
        granularity: "daily",
      };
      const periods = generateTimePeriods(range);
      expect(periods.length).toBe(7);
      expect(periods[0].label).toBe("2026-01-01");
    });

    it("generates weekly periods", () => {
      const range: AnalyticsDateRange = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-28"),
        granularity: "weekly",
      };
      const periods = generateTimePeriods(range);
      expect(periods.length).toBe(4);
    });

    it("generates quarterly periods", () => {
      const range: AnalyticsDateRange = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        granularity: "quarterly",
      };
      const periods = generateTimePeriods(range);
      expect(periods.length).toBeGreaterThanOrEqual(4);
      expect(periods[0].label).toContain("Q1");
    });

    it("generates yearly periods", () => {
      const range: AnalyticsDateRange = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2026-12-31"),
        granularity: "yearly",
      };
      const periods = generateTimePeriods(range);
      expect(periods.length).toBeGreaterThanOrEqual(3);
      expect(periods[0].label).toBe("2024");
    });

    it("handles single-day range", () => {
      const range: AnalyticsDateRange = {
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-01-15"),
        granularity: "daily",
      };
      const periods = generateTimePeriods(range);
      expect(periods.length).toBe(1);
    });
  });

  describe("calculateMRRSnapshot", () => {
    it("calculates total MRR from active subscriptions", () => {
      const subs = [
        makeSub({ monthlyAmount: 2900 }),
        makeSub({ monthlyAmount: 4900 }),
        makeSub({ monthlyAmount: 9900 }),
      ];
      const snapshot = calculateMRRSnapshot(subs, createDate(0));
      expect(snapshot.totalMRR).toBe(17700);
    });

    it("excludes canceled subscriptions", () => {
      const subs = [
        makeSub({ monthlyAmount: 4900 }),
        makeSub({
          monthlyAmount: 4900,
          canceledAt: createDate(-10),
          state: "canceled",
        }),
      ];
      const snapshot = calculateMRRSnapshot(subs, createDate(0));
      expect(snapshot.totalMRR).toBe(4900);
    });

    it("breaks down MRR by plan", () => {
      const subs = [
        makeSub({ plan: "starter", monthlyAmount: 2900 }),
        makeSub({ plan: "professional", monthlyAmount: 4900 }),
        makeSub({ plan: "enterprise", monthlyAmount: 19900 }),
      ];
      const snapshot = calculateMRRSnapshot(subs, createDate(0));
      expect(snapshot.byPlan.starter).toBe(2900);
      expect(snapshot.byPlan.professional).toBe(4900);
      expect(snapshot.byPlan.enterprise).toBe(19900);
    });

    it("calculates new MRR", () => {
      const currentSubs = [
        makeSub({ id: "sub-1", monthlyAmount: 4900 }),
        makeSub({ id: "sub-2", monthlyAmount: 2900 }),
      ];
      const prevSubs = [makeSub({ id: "sub-1", monthlyAmount: 4900 })];
      const snapshot = calculateMRRSnapshot(
        currentSubs,
        createDate(0),
        prevSubs,
      );
      expect(snapshot.newMRR).toBe(2900);
    });

    it("calculates expansion MRR from upgrades", () => {
      const currentSubs = [makeSub({ id: "sub-1", monthlyAmount: 9900 })];
      const prevSubs = [makeSub({ id: "sub-1", monthlyAmount: 4900 })];
      const snapshot = calculateMRRSnapshot(
        currentSubs,
        createDate(0),
        prevSubs,
      );
      expect(snapshot.expansionMRR).toBe(5000);
    });

    it("calculates contraction MRR from downgrades", () => {
      const currentSubs = [makeSub({ id: "sub-1", monthlyAmount: 2900 })];
      const prevSubs = [makeSub({ id: "sub-1", monthlyAmount: 4900 })];
      const snapshot = calculateMRRSnapshot(
        currentSubs,
        createDate(0),
        prevSubs,
      );
      expect(snapshot.contractionMRR).toBe(2000);
    });

    it("calculates churned MRR", () => {
      const currentSubs: AnalyticsSubscription[] = [];
      const prevSubs = [makeSub({ id: "sub-1", monthlyAmount: 4900 })];
      const snapshot = calculateMRRSnapshot(
        currentSubs,
        createDate(0),
        prevSubs,
      );
      expect(snapshot.churnedMRR).toBe(4900);
    });

    it("calculates net new MRR correctly", () => {
      const currentSubs = [
        makeSub({ id: "sub-1", monthlyAmount: 9900 }),
        makeSub({ id: "sub-3", monthlyAmount: 2900 }),
      ];
      const prevSubs = [
        makeSub({ id: "sub-1", monthlyAmount: 4900 }),
        makeSub({ id: "sub-2", monthlyAmount: 4900 }),
      ];
      const snapshot = calculateMRRSnapshot(
        currentSubs,
        createDate(0),
        prevSubs,
      );
      // net = new(2900) + expansion(5000) + reactivation(0) - contraction(0) - churned(4900)
      expect(snapshot.netNewMRR).toBe(3000);
    });

    it("returns zero for empty subscriptions", () => {
      const snapshot = calculateMRRSnapshot([], createDate(0));
      expect(snapshot.totalMRR).toBe(0);
      expect(snapshot.netNewMRR).toBe(0);
    });

    it("handles free plan subscriptions with zero MRR", () => {
      const subs = [
        makeSub({ plan: "free", monthlyAmount: 0 }),
        makeSub({ plan: "starter", monthlyAmount: 2900 }),
      ];
      const snapshot = calculateMRRSnapshot(subs, createDate(0));
      expect(snapshot.totalMRR).toBe(2900);
      expect(snapshot.byPlan.free).toBe(0);
    });
  });

  describe("calculateMRRTimeSeries", () => {
    it("returns snapshots for each period", () => {
      const subs = [
        makeSub({ createdAt: createDate(-90), monthlyAmount: 4900 }),
      ];
      const series = calculateMRRTimeSeries(subs, defaultDateRange);
      expect(series.length).toBeGreaterThan(0);
    });

    it("shows MRR growth over time", () => {
      const subs = [
        makeSub({ createdAt: createDate(-90), monthlyAmount: 4900 }),
        makeSub({ createdAt: createDate(-45), monthlyAmount: 2900 }),
        makeSub({ createdAt: createDate(-15), monthlyAmount: 9900 }),
      ];
      const series = calculateMRRTimeSeries(subs, defaultDateRange);
      if (series.length >= 2) {
        const last = series[series.length - 1];
        const first = series[0];
        expect(last.totalMRR).toBeGreaterThanOrEqual(first.totalMRR);
      }
    });
  });

  describe("calculateRevenueByPlan", () => {
    it("breaks down revenue by plan tier", () => {
      const subs = [
        makeSub({ plan: "starter", monthlyAmount: 2900 }),
        makeSub({ plan: "starter", monthlyAmount: 2900 }),
        makeSub({ plan: "professional", monthlyAmount: 4900 }),
        makeSub({ plan: "enterprise", monthlyAmount: 19900 }),
      ];
      const breakdown = calculateRevenueByPlan(subs, defaultDateRange);
      const starter = breakdown.find((b) => b.plan === "starter");
      expect(starter?.revenue).toBe(5800);
      expect(starter?.subscriptionCount).toBe(2);
    });

    it("calculates revenue share percentages", () => {
      const subs = [
        makeSub({ plan: "starter", monthlyAmount: 5000 }),
        makeSub({ plan: "professional", monthlyAmount: 5000 }),
      ];
      const breakdown = calculateRevenueByPlan(subs, defaultDateRange);
      const starter = breakdown.find((b) => b.plan === "starter");
      expect(starter?.revenueShare).toBe(50);
    });

    it("handles empty subscriptions", () => {
      const breakdown = calculateRevenueByPlan([], defaultDateRange);
      expect(breakdown.every((b) => b.revenue === 0)).toBe(true);
    });
  });

  describe("calculateRevenueGrowth", () => {
    it("calculates positive growth", () => {
      const growth = calculateRevenueGrowth(10000, 8000);
      expect(growth.absoluteChange).toBe(2000);
      expect(growth.percentageChange).toBe(25);
    });

    it("calculates negative growth", () => {
      const growth = calculateRevenueGrowth(8000, 10000);
      expect(growth.absoluteChange).toBe(-2000);
      expect(growth.percentageChange).toBe(-20);
    });

    it("handles zero previous revenue", () => {
      const growth = calculateRevenueGrowth(10000, 0);
      expect(growth.percentageChange).toBe(0);
    });

    it("calculates YoY growth when provided", () => {
      const growth = calculateRevenueGrowth(10000, 9000, 5000);
      expect(growth.yoyGrowthRate).toBe(100);
    });

    it("returns null YoY when not provided", () => {
      const growth = calculateRevenueGrowth(10000, 9000);
      expect(growth.yoyGrowthRate).toBeNull();
    });
  });

  describe("calculateTotalRevenue", () => {
    it("sums succeeded payments in range", () => {
      const payments = [
        makePayment({
          amount: 4900,
          status: "succeeded",
          createdAt: createDate(-10),
        }),
        makePayment({
          amount: 4900,
          status: "succeeded",
          createdAt: createDate(-5),
        }),
        makePayment({
          amount: 4900,
          status: "failed",
          createdAt: createDate(-3),
        }),
      ];
      const total = calculateTotalRevenue(payments, defaultDateRange);
      expect(total).toBe(9800);
    });

    it("excludes payments outside range", () => {
      const payments = [
        makePayment({
          amount: 4900,
          status: "succeeded",
          createdAt: createDate(-200),
        }),
        makePayment({
          amount: 4900,
          status: "succeeded",
          createdAt: createDate(-5),
        }),
      ];
      const total = calculateTotalRevenue(payments, defaultDateRange);
      expect(total).toBe(4900);
    });

    it("returns zero for no payments", () => {
      expect(calculateTotalRevenue([], defaultDateRange)).toBe(0);
    });
  });

  describe("generateRevenueReport", () => {
    it("generates a complete revenue report", () => {
      const subs = [makeSub(), makeSub()];
      const payments = [makePayment()];
      const report = generateRevenueReport(subs, payments, defaultDateRange);
      expect(report.currentMRR).toBeDefined();
      expect(report.currentARR).toBe(report.currentMRR.totalMRR * 12);
      expect(report.revenueByPlan.length).toBeGreaterThan(0);
      expect(report.currency).toBe("USD");
    });
  });
});

// ============================================================================
// Churn Analytics Tests
// ============================================================================

describe("Churn Analytics", () => {
  describe("calculateChurnMetrics", () => {
    it("calculates customer churn rate", () => {
      const subs = [
        makeSub({ id: "s1", createdAt: createDate(-90), monthlyAmount: 4900 }),
        makeSub({ id: "s2", createdAt: createDate(-90), monthlyAmount: 4900 }),
        makeSub({
          id: "s3",
          createdAt: createDate(-90),
          monthlyAmount: 4900,
          canceledAt: createDate(-15),
          state: "canceled",
        }),
        makeSub({
          id: "s4",
          createdAt: createDate(-90),
          monthlyAmount: 4900,
          canceledAt: createDate(-10),
          state: "canceled",
        }),
      ];
      const metrics = calculateChurnMetrics(subs, defaultPeriod);
      expect(metrics.startCount).toBe(4);
      expect(metrics.canceledCount).toBe(2);
      expect(metrics.customerChurnRate).toBe(50);
    });

    it("calculates revenue churn rate", () => {
      const subs = [
        makeSub({ id: "s1", createdAt: createDate(-90), monthlyAmount: 10000 }),
        makeSub({
          id: "s2",
          createdAt: createDate(-90),
          monthlyAmount: 5000,
          canceledAt: createDate(-15),
          state: "canceled",
        }),
      ];
      const metrics = calculateChurnMetrics(subs, defaultPeriod);
      expect(metrics.revenueChurnRate).toBeCloseTo(33.33, 1);
      expect(metrics.churnedMRR).toBe(5000);
    });

    it("handles zero churn", () => {
      const subs = [
        makeSub({ createdAt: createDate(-90), monthlyAmount: 4900 }),
      ];
      const metrics = calculateChurnMetrics(subs, defaultPeriod);
      expect(metrics.customerChurnRate).toBe(0);
      expect(metrics.canceledCount).toBe(0);
    });

    it("handles empty subscriptions", () => {
      const metrics = calculateChurnMetrics([], defaultPeriod);
      expect(metrics.startCount).toBe(0);
      expect(metrics.customerChurnRate).toBe(0);
    });
  });

  describe("calculateChurnTimeSeries", () => {
    it("returns churn metrics for each period", () => {
      const subs = [
        makeSub({ createdAt: createDate(-90) }),
        makeSub({
          createdAt: createDate(-60),
          canceledAt: createDate(-30),
          state: "canceled",
        }),
      ];
      const series = calculateChurnTimeSeries(subs, defaultDateRange);
      expect(series.length).toBeGreaterThan(0);
    });
  });

  describe("calculateRetentionCohorts", () => {
    it("groups customers by signup month", () => {
      const subs = [
        makeSub({ createdAt: new Date("2025-11-15") }),
        makeSub({ createdAt: new Date("2025-11-20") }),
        makeSub({ createdAt: new Date("2025-12-05") }),
      ];
      const range: AnalyticsDateRange = {
        startDate: new Date("2025-11-01"),
        endDate: new Date("2026-02-01"),
        granularity: "monthly",
      };
      const cohorts = calculateRetentionCohorts(subs, range);
      expect(cohorts.length).toBe(2); // Nov + Dec
      const novCohort = cohorts.find((c) => c.cohortLabel === "2025-11");
      expect(novCohort?.cohortSize).toBe(2);
    });

    it("calculates retention percentages", () => {
      const subs = [
        makeSub({ createdAt: new Date("2025-10-05") }),
        makeSub({
          createdAt: new Date("2025-10-10"),
          canceledAt: new Date("2025-12-15"),
          state: "canceled",
        }),
      ];
      const range: AnalyticsDateRange = {
        startDate: new Date("2025-10-01"),
        endDate: new Date("2026-02-01"),
        granularity: "monthly",
      };
      const cohorts = calculateRetentionCohorts(subs, range);
      expect(cohorts.length).toBe(1);
      expect(cohorts[0].retentionByMonth[0]).toBe(100); // Month 0 always 100%
    });

    it("returns empty for out-of-range subscriptions", () => {
      const subs = [makeSub({ createdAt: new Date("2020-01-01") })];
      const range: AnalyticsDateRange = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-01"),
        granularity: "monthly",
      };
      const cohorts = calculateRetentionCohorts(subs, range);
      expect(cohorts.length).toBe(0);
    });
  });

  describe("detectAtRiskSignals", () => {
    it("detects payment failure signal", () => {
      const sub = makeSub({ state: "past_due" });
      const signals = detectAtRiskSignals(sub);
      expect(signals.some((s) => s.type === "payment_failed")).toBe(true);
    });

    it("detects grace period signal", () => {
      const sub = makeSub({ state: "grace" });
      const signals = detectAtRiskSignals(sub);
      expect(signals.some((s) => s.type === "payment_failed")).toBe(true);
    });

    it("detects inactivity signal", () => {
      const sub = makeSub({ lastActiveAt: createDate(-30) });
      const signals = detectAtRiskSignals(sub);
      expect(signals.some((s) => s.type === "no_login")).toBe(true);
    });

    it("does not flag recently active users with no other issues", () => {
      const sub = makeSub({ lastActiveAt: createDate(0), state: "active" });
      const signals = detectAtRiskSignals(sub, createDate(0));
      expect(signals.some((s) => s.type === "no_login")).toBe(false);
    });

    it("detects contract ending for annual subscriptions", () => {
      const sub = makeSub({
        interval: "yearly",
        createdAt: createDate(-330),
      });
      const signals = detectAtRiskSignals(sub, createDate(0));
      expect(signals.some((s) => s.type === "contract_ending")).toBe(true);
    });
  });

  describe("calculateRiskScore", () => {
    it("returns 0 for no signals", () => {
      expect(calculateRiskScore([])).toBe(0);
    });

    it("returns weighted score", () => {
      const signals = [
        {
          type: "payment_failed" as const,
          weight: 0.35,
          description: "test",
          detectedAt: new Date(),
          metadata: {},
        },
      ];
      expect(calculateRiskScore(signals)).toBe(35);
    });

    it("caps at 100", () => {
      const signals = [
        {
          type: "payment_failed" as const,
          weight: 0.6,
          description: "",
          detectedAt: new Date(),
          metadata: {},
        },
        {
          type: "no_login" as const,
          weight: 0.6,
          description: "",
          detectedAt: new Date(),
          metadata: {},
        },
      ];
      expect(calculateRiskScore(signals)).toBe(100);
    });
  });

  describe("assessAtRiskCustomers", () => {
    it("identifies at-risk customers above threshold", () => {
      const subs = [
        makeSub({ state: "past_due", monthlyAmount: 9900 }),
        makeSub({ state: "active", lastActiveAt: createDate(-1) }),
      ];
      const atRisk = assessAtRiskCustomers(subs, 20);
      expect(atRisk.length).toBeGreaterThanOrEqual(1);
      expect(atRisk[0].riskScore).toBeGreaterThanOrEqual(20);
    });

    it("sorts by risk score descending", () => {
      const subs = [
        makeSub({ state: "past_due", lastActiveAt: createDate(-30) }),
        makeSub({ state: "past_due", lastActiveAt: createDate(-1) }),
      ];
      const atRisk = assessAtRiskCustomers(subs, 0);
      if (atRisk.length >= 2) {
        expect(atRisk[0].riskScore).toBeGreaterThanOrEqual(atRisk[1].riskScore);
      }
    });

    it("skips canceled subscriptions", () => {
      const subs = [
        makeSub({ state: "canceled", canceledAt: createDate(-10) }),
      ];
      const atRisk = assessAtRiskCustomers(subs, 0);
      expect(atRisk.length).toBe(0);
    });
  });

  describe("analyzeCancellationReasons", () => {
    it("counts cancellation reasons", () => {
      const subs = [
        makeSub({
          canceledAt: createDate(-10),
          cancellationReason: "too_expensive",
          state: "canceled",
        }),
        makeSub({
          canceledAt: createDate(-5),
          cancellationReason: "too_expensive",
          state: "canceled",
        }),
        makeSub({
          canceledAt: createDate(-3),
          cancellationReason: "missing_features",
          state: "canceled",
        }),
      ];
      const reasons = analyzeCancellationReasons(subs, defaultDateRange);
      expect(reasons.length).toBe(2);
      const expensive = reasons.find((r) => r.reason === "too_expensive");
      expect(expensive?.count).toBe(2);
      expect(expensive?.percentage).toBeCloseTo(66.67, 1);
    });

    it("handles unknown reasons", () => {
      const subs = [
        makeSub({
          canceledAt: createDate(-5),
          cancellationReason: null,
          state: "canceled",
        }),
      ];
      const reasons = analyzeCancellationReasons(subs, defaultDateRange);
      expect(reasons[0].reason).toBe("unknown");
    });

    it("returns empty for no cancellations", () => {
      const reasons = analyzeCancellationReasons([makeSub()], defaultDateRange);
      expect(reasons.length).toBe(0);
    });
  });

  describe("generateChurnReport", () => {
    it("generates a complete churn report", () => {
      const subs = [
        makeSub(),
        makeSub({ canceledAt: createDate(-10), state: "canceled" }),
      ];
      const report = generateChurnReport(subs, defaultDateRange);
      expect(report.currentChurn).toBeDefined();
      expect(report.churnTimeSeries.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Customer Analytics Tests
// ============================================================================

describe("Customer Analytics", () => {
  describe("calculateARPU", () => {
    it("calculates overall ARPU", () => {
      const subs = [
        makeSub({ monthlyAmount: 4900 }),
        makeSub({ monthlyAmount: 2900 }),
      ];
      const arpu = calculateARPU(subs, defaultPeriod);
      expect(arpu.overallARPU).toBe(3900); // (4900 + 2900) / 2
    });

    it("calculates ARPU by plan", () => {
      const subs = [
        makeSub({ plan: "starter", monthlyAmount: 2900 }),
        makeSub({ plan: "starter", monthlyAmount: 2900 }),
        makeSub({ plan: "professional", monthlyAmount: 4900 }),
      ];
      const arpu = calculateARPU(subs, defaultPeriod);
      expect(arpu.byPlan.starter).toBe(2900);
      expect(arpu.byPlan.professional).toBe(4900);
    });

    it("calculates ARPU by interval", () => {
      const subs = [
        makeSub({ interval: "monthly", monthlyAmount: 4900 }),
        makeSub({ interval: "yearly", monthlyAmount: 3900 }),
      ];
      const arpu = calculateARPU(subs, defaultPeriod);
      expect(arpu.byInterval.monthly).toBe(4900);
      expect(arpu.byInterval.yearly).toBe(3900);
    });

    it("returns zero for no subscriptions", () => {
      const arpu = calculateARPU([], defaultPeriod);
      expect(arpu.overallARPU).toBe(0);
    });
  });

  describe("calculateARPUTimeSeries", () => {
    it("calculates ARPU trend", () => {
      const subs = [
        makeSub({ createdAt: createDate(-90), monthlyAmount: 4900 }),
      ];
      const series = calculateARPUTimeSeries(subs, defaultDateRange);
      expect(series.length).toBeGreaterThan(0);
    });
  });

  describe("calculateAverageLifespan", () => {
    it("calculates average lifespan for canceled subscriptions", () => {
      const subs = [
        makeSub({ createdAt: createDate(-60), canceledAt: createDate(0) }),
        makeSub({ createdAt: createDate(-90), canceledAt: createDate(0) }),
      ];
      const lifespan = calculateAverageLifespan(subs, createDate(0));
      expect(lifespan).toBeGreaterThan(0);
    });

    it("uses now for active subscriptions", () => {
      const subs = [makeSub({ createdAt: createDate(-60), canceledAt: null })];
      const lifespan = calculateAverageLifespan(subs, createDate(0));
      expect(lifespan).toBeGreaterThan(0);
    });

    it("returns 0 for empty array", () => {
      expect(calculateAverageLifespan([])).toBe(0);
    });
  });

  describe("calculateLTV", () => {
    it("calculates average LTV", () => {
      const subs = [
        makeSub({ monthlyAmount: 4900, createdAt: createDate(-180) }),
        makeSub({ monthlyAmount: 4900, createdAt: createDate(-90) }),
      ];
      const ltv = calculateLTV(subs, 10, createDate(0));
      expect(ltv.averageLTV).toBeGreaterThan(0);
    });

    it("calculates projected LTV using churn rate", () => {
      const subs = [makeSub({ monthlyAmount: 4900 })];
      const ltv = calculateLTV(subs, 5);
      // Projected: ARPU / churn = 4900 / 0.05 = 98000
      expect(ltv.projectedLTV).toBe(98000);
    });

    it("handles zero churn rate with cap", () => {
      const subs = [makeSub({ monthlyAmount: 4900 })];
      const ltv = calculateLTV(subs, 0);
      // 4900 * 120 (10 year cap)
      expect(ltv.projectedLTV).toBe(588000);
    });

    it("calculates LTV by plan", () => {
      const subs = [
        makeSub({
          plan: "starter",
          monthlyAmount: 2900,
          createdAt: createDate(-60),
        }),
        makeSub({
          plan: "professional",
          monthlyAmount: 4900,
          createdAt: createDate(-60),
        }),
      ];
      const ltv = calculateLTV(subs, 5, createDate(0));
      expect(ltv.byPlan.starter).toBeGreaterThan(0);
      expect(ltv.byPlan.professional).toBeGreaterThan(0);
    });

    it("calculates LTV:CAC ratio when CAC available", () => {
      const subs = [
        makeSub({ monthlyAmount: 4900, cac: 5000, createdAt: createDate(-60) }),
      ];
      const ltv = calculateLTV(subs, 5, createDate(0));
      expect(ltv.ltvCacRatio).not.toBeNull();
      expect(ltv.ltvCacRatio!).toBeGreaterThan(0);
    });

    it("returns null LTV:CAC when no CAC data", () => {
      const subs = [makeSub({ monthlyAmount: 4900, cac: null })];
      const ltv = calculateLTV(subs, 5);
      expect(ltv.ltvCacRatio).toBeNull();
    });
  });

  describe("segmentByPlan", () => {
    it("segments customers by plan tier", () => {
      const subs = [
        makeSub({ plan: "starter" }),
        makeSub({ plan: "starter" }),
        makeSub({ plan: "professional" }),
      ];
      const segments = segmentByPlan(subs);
      expect(segments.length).toBe(2); // starter + professional
      const starter = segments.find((s) => s.name === "Starter Plan");
      expect(starter?.count).toBe(2);
    });

    it("returns empty for no subscriptions", () => {
      expect(segmentByPlan([])).toEqual([]);
    });
  });

  describe("segmentByTenure", () => {
    it("segments by customer tenure", () => {
      const now = createDate(0);
      const subs = [
        makeSub({ createdAt: createDate(-15) }), // New (< 3 months)
        makeSub({ createdAt: createDate(-120) }), // Established (3-12 months)
        makeSub({ createdAt: createDate(-400) }), // Veteran (> 12 months)
      ];
      const segments = segmentByTenure(subs, now);
      expect(segments.length).toBeGreaterThan(0);
    });

    it("returns empty for no subscriptions", () => {
      expect(segmentByTenure([])).toEqual([]);
    });
  });

  describe("generateCustomerReport", () => {
    it("generates a complete customer report", () => {
      const subs = [makeSub(), makeSub()];
      const payments = [makePayment()];
      const report = generateCustomerReport(subs, payments, defaultDateRange);
      expect(report.arpu).toBeDefined();
      expect(report.ltv).toBeDefined();
      expect(report.segments.length).toBeGreaterThan(0);
      expect(report.totalActiveCustomers).toBe(2);
    });
  });
});

// ============================================================================
// Entitlement Drift Tests
// ============================================================================

describe("Entitlement Drift", () => {
  beforeEach(() => {
    resetAlertCounter();
  });

  describe("classifyOverUsageSeverity", () => {
    it("returns none for under threshold", () => {
      expect(classifyOverUsageSeverity(3)).toBe("none");
    });

    it("returns minor for 5-15%", () => {
      expect(classifyOverUsageSeverity(10)).toBe("minor");
    });

    it("returns moderate for 15-30%", () => {
      expect(classifyOverUsageSeverity(20)).toBe("moderate");
    });

    it("returns severe for 30-50%", () => {
      expect(classifyOverUsageSeverity(40)).toBe("severe");
    });

    it("returns critical for 50%+", () => {
      expect(classifyOverUsageSeverity(60)).toBe("critical");
    });
  });

  describe("classifyUnderUsageSeverity", () => {
    it("returns none for normal usage", () => {
      expect(classifyUnderUsageSeverity(60)).toBe("none");
    });

    it("returns minor for <50%", () => {
      expect(classifyUnderUsageSeverity(40)).toBe("minor");
    });

    it("returns moderate for <25%", () => {
      expect(classifyUnderUsageSeverity(20)).toBe("moderate");
    });

    it("returns severe for <10%", () => {
      expect(classifyUnderUsageSeverity(8)).toBe("severe");
    });

    it("returns critical for <5%", () => {
      expect(classifyUnderUsageSeverity(3)).toBe("critical");
    });
  });

  describe("getPlanLimitForResource", () => {
    it("returns limit for known plan and resource", () => {
      const limit = getPlanLimitForResource("starter", "members");
      expect(limit).toBe(25);
    });

    it("returns null for unlimited resource", () => {
      const limit = getPlanLimitForResource("enterprise", "members");
      expect(limit).toBeNull();
    });

    it("returns null for unknown resource", () => {
      const limit = getPlanLimitForResource("starter", "unknown_resource");
      expect(limit).toBeNull();
    });
  });

  describe("getRecommendedAction", () => {
    it("returns no action for no drift", () => {
      expect(getRecommendedAction("none", "none", "members", "starter")).toBe(
        "No action required",
      );
    });

    it("returns upgrade recommendation for over-usage", () => {
      const action = getRecommendedAction(
        "over",
        "moderate",
        "members",
        "starter",
      );
      expect(action.toLowerCase()).toContain("upgrad");
    });

    it("returns engagement recommendation for under-usage", () => {
      const action = getRecommendedAction(
        "under",
        "moderate",
        "members",
        "professional",
      );
      expect(action).toContain("under-usage");
    });
  });

  describe("detectDrift", () => {
    it("detects over-usage", () => {
      const record = makeUsageRecord({ currentUsage: 30, planLimit: 25 });
      const drift = detectDrift(record);
      expect(drift).not.toBeNull();
      expect(drift!.direction).toBe("over");
      expect(drift!.driftAmount).toBe(5);
    });

    it("detects under-usage", () => {
      const record = makeUsageRecord({ currentUsage: 2, planLimit: 25 });
      const drift = detectDrift(record);
      expect(drift).not.toBeNull();
      expect(drift!.direction).toBe("under");
    });

    it("returns null for normal usage", () => {
      const record = makeUsageRecord({ currentUsage: 18, planLimit: 25 });
      const drift = detectDrift(record);
      expect(drift).toBeNull();
    });

    it("returns null for unlimited plan", () => {
      const record = makeUsageRecord({
        plan: "enterprise",
        resource: "members",
        currentUsage: 1000,
        planLimit: null,
      });
      const drift = detectDrift(record);
      expect(drift).toBeNull();
    });

    it("detects critical drift for zero-limit resources", () => {
      const record = makeUsageRecord({ currentUsage: 5, planLimit: 0 });
      const drift = detectDrift(record);
      expect(drift).not.toBeNull();
      expect(drift!.severity).toBe("critical");
    });

    it("calculates drift percentage correctly", () => {
      const record = makeUsageRecord({ currentUsage: 50, planLimit: 25 });
      const drift = detectDrift(record);
      expect(drift!.driftPercentage).toBe(100); // 100% over
    });
  });

  describe("detectAllDrift", () => {
    it("detects drift across multiple records", () => {
      const records = [
        makeUsageRecord({
          workspaceId: "ws-1",
          resource: "members",
          currentUsage: 30,
          planLimit: 25,
        }),
        makeUsageRecord({
          workspaceId: "ws-1",
          resource: "channels",
          currentUsage: 25,
          planLimit: 20,
        }),
        makeUsageRecord({
          workspaceId: "ws-2",
          resource: "members",
          currentUsage: 10,
          planLimit: 25,
        }),
      ];
      const drifts = detectAllDrift(records);
      // ws-1 members over, ws-1 channels over, ws-2 members under (10/25 = 40% < 50%)
      expect(drifts.length).toBe(3);
      expect(drifts.filter((d) => d.direction === "over").length).toBe(2);
      expect(drifts.filter((d) => d.direction === "under").length).toBe(1);
    });

    it("sorts by severity", () => {
      const records = [
        makeUsageRecord({
          resource: "members",
          currentUsage: 27,
          planLimit: 25,
        }), // minor
        makeUsageRecord({
          resource: "channels",
          currentUsage: 50,
          planLimit: 20,
        }), // critical
      ];
      const drifts = detectAllDrift(records);
      expect(drifts.length).toBe(2);
      // Critical should come first
      const severityOrder = {
        critical: 0,
        severe: 1,
        moderate: 2,
        minor: 3,
        none: 4,
      };
      expect(severityOrder[drifts[0].severity]).toBeLessThanOrEqual(
        severityOrder[drifts[1].severity],
      );
    });
  });

  describe("estimateRevenueImpact", () => {
    it("estimates revenue impact from over-usage", () => {
      const entries = [
        {
          workspaceId: "ws-1",
          organizationId: "org-1",
          plan: "starter" as const,
          resource: "members",
          currentUsage: 30,
          planLimit: 25,
          direction: "over" as const,
          driftAmount: 5,
          driftPercentage: 20,
          severity: "moderate" as DriftSeverity,
          detectedAt: new Date(),
          recommendedAction: "upgrade",
        },
      ];
      const impact = estimateRevenueImpact(entries);
      expect(impact).toBeGreaterThan(0); // 5 * 500 = 2500
    });

    it("ignores under-usage entries", () => {
      const entries = [
        {
          workspaceId: "ws-1",
          organizationId: "org-1",
          plan: "starter" as const,
          resource: "members",
          currentUsage: 5,
          planLimit: 25,
          direction: "under" as const,
          driftAmount: 20,
          driftPercentage: -80,
          severity: "severe" as DriftSeverity,
          detectedAt: new Date(),
          recommendedAction: "engagement",
        },
      ];
      const impact = estimateRevenueImpact(entries);
      expect(impact).toBe(0);
    });

    it("uses custom overage pricing", () => {
      const entries = [
        {
          workspaceId: "ws-1",
          organizationId: "org-1",
          plan: "starter" as const,
          resource: "members",
          currentUsage: 30,
          planLimit: 25,
          direction: "over" as const,
          driftAmount: 5,
          driftPercentage: 20,
          severity: "moderate" as DriftSeverity,
          detectedAt: new Date(),
          recommendedAction: "upgrade",
        },
      ];
      const impact = estimateRevenueImpact(entries, { members: 1000 });
      expect(impact).toBe(5000); // 5 * 1000
    });
  });

  describe("generateDriftAlerts", () => {
    it("generates alerts for drift entries", () => {
      const entries = [
        {
          workspaceId: "ws-1",
          organizationId: "org-1",
          plan: "starter" as const,
          resource: "members",
          currentUsage: 30,
          planLimit: 25,
          direction: "over" as const,
          driftAmount: 5,
          driftPercentage: 20,
          severity: "moderate" as DriftSeverity,
          detectedAt: new Date(),
          recommendedAction: "upgrade",
        },
      ];
      const alerts = generateDriftAlerts(entries);
      expect(alerts.length).toBe(1);
      expect(alerts[0].acknowledged).toBe(false);
    });

    it("filters by minimum severity", () => {
      const entries = [
        {
          workspaceId: "ws-1",
          organizationId: "org-1",
          plan: "starter" as const,
          resource: "members",
          currentUsage: 26,
          planLimit: 25,
          direction: "over" as const,
          driftAmount: 1,
          driftPercentage: 4,
          severity: "none" as DriftSeverity,
          detectedAt: new Date(),
          recommendedAction: "monitor",
        },
      ];
      const alerts = generateDriftAlerts(entries, "moderate");
      expect(alerts.length).toBe(0);
    });
  });

  describe("generateDriftReport", () => {
    it("generates a complete drift report", () => {
      const records = [
        makeUsageRecord({
          workspaceId: "ws-1",
          resource: "members",
          currentUsage: 30,
          planLimit: 25,
        }),
        makeUsageRecord({
          workspaceId: "ws-2",
          resource: "channels",
          currentUsage: 8,
          planLimit: 20,
        }),
      ];
      const report = generateDriftReport(records);
      expect(report.totalWorkspacesAnalyzed).toBe(2);
      expect(report.driftEntries.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeDefined();
    });

    it("counts severity correctly", () => {
      const records = [
        makeUsageRecord({
          resource: "members",
          currentUsage: 30,
          planLimit: 25,
        }),
        makeUsageRecord({
          resource: "channels",
          currentUsage: 50,
          planLimit: 20,
        }),
      ];
      const report = generateDriftReport(records);
      const totalBySeverity = Object.values(report.bySeverity).reduce(
        (a, b) => a + b,
        0,
      );
      expect(totalBySeverity).toBe(report.driftEntries.length);
    });
  });
});

// ============================================================================
// Finance Reconciliation Tests
// ============================================================================

describe("Finance Reconciliation", () => {
  describe("matchByExternalId", () => {
    it("matches entries by external ID", () => {
      const extId = "pi_abc123";
      const external = [makeLedgerEntry({ externalId: extId, amount: 4900 })];
      const internal = [makeLedgerEntry({ externalId: extId, amount: 4900 })];
      const matches = matchByExternalId(external, internal);
      expect(matches.length).toBe(1);
      expect(matches[0].status).toBe("matched");
      expect(matches[0].discrepancyAmount).toBe(0);
    });

    it("detects amount mismatch", () => {
      const extId = "pi_abc123";
      const external = [makeLedgerEntry({ externalId: extId, amount: 5000 })];
      const internal = [makeLedgerEntry({ externalId: extId, amount: 4900 })];
      const matches = matchByExternalId(external, internal);
      expect(matches[0].status).toBe("amount_mismatch");
      expect(matches[0].discrepancyAmount).toBe(100);
    });

    it("detects amount mismatch within tolerance as matched", () => {
      const extId = "pi_abc123";
      const external = [makeLedgerEntry({ externalId: extId, amount: 4920 })];
      const internal = [makeLedgerEntry({ externalId: extId, amount: 4900 })];
      const matches = matchByExternalId(external, internal);
      expect(matches[0].status).toBe("matched");
      expect(matches[0].withinTolerance).toBe(true);
    });

    it("detects missing internal entries", () => {
      const external = [
        makeLedgerEntry({ externalId: "pi_nomatch", amount: 4900 }),
      ];
      const internal: LedgerEntry[] = [];
      const matches = matchByExternalId(external, internal);
      expect(matches[0].status).toBe("missing_internal");
    });

    it("detects missing external entries", () => {
      const external: LedgerEntry[] = [];
      const internal = [
        makeLedgerEntry({ externalId: "pi_orphan", amount: 4900 }),
      ];
      const matches = matchByExternalId(external, internal);
      expect(matches[0].status).toBe("missing_external");
    });

    it("detects duplicate internal entries", () => {
      const extId = "pi_dup";
      const external = [makeLedgerEntry({ externalId: extId, amount: 4900 })];
      const internal = [
        makeLedgerEntry({ id: "int-1", externalId: extId, amount: 4900 }),
        makeLedgerEntry({ id: "int-2", externalId: extId, amount: 4900 }),
      ];
      const matches = matchByExternalId(external, internal);
      expect(matches.some((m) => m.status === "duplicate")).toBe(true);
    });

    it("handles empty arrays", () => {
      const matches = matchByExternalId([], []);
      expect(matches.length).toBe(0);
    });
  });

  describe("matchByAmountAndTime", () => {
    it("fuzzy matches by amount and timestamp", () => {
      const ts = createDate(-5);
      const external = [makeLedgerEntry({ amount: 4900, timestamp: ts })];
      const internal = [
        makeLedgerEntry({
          amount: 4900,
          timestamp: new Date(ts.getTime() + 60000),
        }),
      ];
      const matches = matchByAmountAndTime(external, internal);
      expect(matches.length).toBe(1);
      expect(matches[0].status).toBe("matched");
    });

    it("respects tolerance", () => {
      const ts = createDate(-5);
      const external = [makeLedgerEntry({ amount: 4900, timestamp: ts })];
      const internal = [makeLedgerEntry({ amount: 5100, timestamp: ts })];
      const matches = matchByAmountAndTime(external, internal, 50); // 50 cents tolerance
      expect(matches.length).toBe(0); // 200 > 50 tolerance
    });

    it("respects time window", () => {
      const external = [
        makeLedgerEntry({ amount: 4900, timestamp: createDate(-5) }),
      ];
      const internal = [
        makeLedgerEntry({ amount: 4900, timestamp: createDate(-10) }),
      ]; // 5 days apart
      const matches = matchByAmountAndTime(
        external,
        internal,
        50,
        1000 * 60 * 60,
      ); // 1 hour max
      expect(matches.length).toBe(0);
    });

    it("picks best match when multiple candidates exist", () => {
      const ts = createDate(-5);
      const external = [makeLedgerEntry({ amount: 4900, timestamp: ts })];
      const internal = [
        makeLedgerEntry({
          id: "close",
          amount: 4900,
          timestamp: new Date(ts.getTime() + 1000),
        }),
        makeLedgerEntry({
          id: "far",
          amount: 4900,
          timestamp: new Date(ts.getTime() + 10000000),
        }),
      ];
      const matches = matchByAmountAndTime(external, internal);
      expect(matches.length).toBe(1);
      expect(matches[0].internalEntry!.id).toBe("close");
    });
  });

  describe("reconcile", () => {
    it("performs full reconciliation", () => {
      const extId1 = "pi_1";
      const extId2 = "pi_2";
      const external = [
        makeLedgerEntry({
          externalId: extId1,
          amount: 4900,
          timestamp: createDate(-10),
        }),
        makeLedgerEntry({
          externalId: extId2,
          amount: 9900,
          timestamp: createDate(-5),
        }),
      ];
      const internal = [
        makeLedgerEntry({
          externalId: extId1,
          amount: 4900,
          timestamp: createDate(-10),
        }),
        makeLedgerEntry({
          externalId: extId2,
          amount: 9900,
          timestamp: createDate(-5),
        }),
      ];
      const summary = reconcile(external, internal, defaultDateRange, "stripe");
      expect(summary.matchedCount).toBe(2);
      expect(summary.netDiscrepancy).toBe(0);
      expect(summary.reconciliationRate).toBe(100);
      expect(summary.withinTolerance).toBe(true);
    });

    it("detects discrepancies", () => {
      const extId = "pi_1";
      const external = [
        makeLedgerEntry({
          externalId: extId,
          amount: 5000,
          timestamp: createDate(-10),
        }),
      ];
      const internal = [
        makeLedgerEntry({
          externalId: extId,
          amount: 4900,
          timestamp: createDate(-10),
        }),
      ];
      const summary = reconcile(external, internal, defaultDateRange, "stripe");
      expect(summary.netDiscrepancy).toBe(100);
    });

    it("reports within tolerance correctly", () => {
      const extId = "pi_1";
      const external = [
        makeLedgerEntry({
          externalId: extId,
          amount: 4920,
          timestamp: createDate(-10),
        }),
      ];
      const internal = [
        makeLedgerEntry({
          externalId: extId,
          amount: 4900,
          timestamp: createDate(-10),
        }),
      ];
      const summary = reconcile(
        external,
        internal,
        defaultDateRange,
        "stripe",
        {
          toleranceCents: 50,
        },
      );
      expect(summary.withinTolerance).toBe(true);
    });

    it("filters entries by date range", () => {
      const external = [
        makeLedgerEntry({ amount: 4900, timestamp: createDate(-200) }), // Out of range
        makeLedgerEntry({ amount: 4900, timestamp: createDate(-10) }),
      ];
      const internal = [
        makeLedgerEntry({ amount: 4900, timestamp: createDate(-10) }),
      ];
      const summary = reconcile(external, internal, defaultDateRange, "stripe");
      expect(summary.totalExternalEntries).toBe(1); // Only in-range
    });

    it("handles empty ledgers", () => {
      const summary = reconcile([], [], defaultDateRange, "stripe");
      expect(summary.matchedCount).toBe(0);
      expect(summary.reconciliationRate).toBe(100);
      expect(summary.withinTolerance).toBe(true);
    });

    it("supports disabling fuzzy matching", () => {
      const ts = createDate(-5);
      const external = [
        makeLedgerEntry({ externalId: "pi_x", amount: 4900, timestamp: ts }),
      ];
      const internal = [
        makeLedgerEntry({ externalId: "pi_y", amount: 4900, timestamp: ts }),
      ];
      const summary = reconcile(
        external,
        internal,
        defaultDateRange,
        "stripe",
        {
          useFuzzyMatching: false,
        },
      );
      // Without fuzzy matching, these won't match (different external IDs)
      expect(summary.missingInternalCount).toBe(1);
      expect(summary.missingExternalCount).toBe(1);
    });
  });

  describe("calculateReconciliationSummary", () => {
    it("calculates correct totals", () => {
      const external = [
        makeLedgerEntry({ amount: 4900 }),
        makeLedgerEntry({ amount: 9900 }),
      ];
      const internal = [
        makeLedgerEntry({ amount: 4900 }),
        makeLedgerEntry({ amount: 9900 }),
      ];
      const matches = matchByExternalId(external, internal);
      const summary = calculateReconciliationSummary(
        matches,
        external,
        internal,
        defaultDateRange,
        "stripe",
      );
      expect(summary.totalExternalAmount).toBe(14800);
      expect(summary.totalInternalAmount).toBe(14800);
    });
  });
});

// ============================================================================
// Service Layer Tests
// ============================================================================

describe("BillingAnalyticsService", () => {
  let service: BillingAnalyticsService;

  beforeEach(() => {
    resetBillingAnalyticsService();
    resetAlertCounter();
    service = createBillingAnalyticsService();
  });

  describe("constructor and config", () => {
    it("uses default config", () => {
      const s = createBillingAnalyticsService();
      expect(s).toBeDefined();
    });

    it("accepts custom config", () => {
      const s = createBillingAnalyticsService({
        currency: "EUR",
        defaultChurnRate: 10,
      });
      expect(s).toBeDefined();
    });
  });

  describe("singleton management", () => {
    it("returns same instance from getter", () => {
      const s1 = getBillingAnalyticsService();
      const s2 = getBillingAnalyticsService();
      expect(s1).toBe(s2);
    });

    it("resets singleton", () => {
      const s1 = getBillingAnalyticsService();
      resetBillingAnalyticsService();
      const s2 = getBillingAnalyticsService();
      expect(s1).not.toBe(s2);
    });
  });

  describe("generateRevenueReport", () => {
    it("generates revenue report", () => {
      const subs = [makeSub()];
      const payments = [makePayment()];
      const report = service.generateRevenueReport(
        subs,
        payments,
        defaultDateRange,
      );
      expect(report.currentMRR).toBeDefined();
      expect(report.currentARR).toBeDefined();
    });

    it("throws on invalid date range", () => {
      const badRange: AnalyticsDateRange = {
        startDate: createDate(0),
        endDate: createDate(-30),
        granularity: "monthly",
      };
      expect(() => service.generateRevenueReport([], [], badRange)).toThrow(
        BillingAnalyticsError,
      );
    });
  });

  describe("generateChurnReport", () => {
    it("generates churn report", () => {
      const subs = [makeSub()];
      const report = service.generateChurnReport(subs, defaultDateRange);
      expect(report.currentChurn).toBeDefined();
    });
  });

  describe("generateCustomerReport", () => {
    it("generates customer report", () => {
      const subs = [makeSub()];
      const payments = [makePayment()];
      const report = service.generateCustomerReport(
        subs,
        payments,
        defaultDateRange,
      );
      expect(report.arpu).toBeDefined();
      expect(report.ltv).toBeDefined();
    });
  });

  describe("generateDriftReport", () => {
    it("generates drift report", () => {
      const records = [makeUsageRecord()];
      const report = service.generateDriftReport(records);
      expect(report.totalWorkspacesAnalyzed).toBe(1);
    });
  });

  describe("reconcile", () => {
    it("performs reconciliation", () => {
      const extId = "pi_test";
      const external = [
        makeLedgerEntry({
          externalId: extId,
          amount: 4900,
          timestamp: createDate(-5),
        }),
      ];
      const internal = [
        makeLedgerEntry({
          externalId: extId,
          amount: 4900,
          timestamp: createDate(-5),
        }),
      ];
      const result = service.reconcile(
        external,
        internal,
        defaultDateRange,
        "stripe",
      );
      expect(result.matchedCount).toBe(1);
    });
  });

  describe("generateComprehensiveReport", () => {
    it("generates comprehensive report", () => {
      const subs = [makeSub()];
      const payments = [makePayment()];
      const usage = [makeUsageRecord()];
      const extId = "pi_comp";
      const ext = [
        makeLedgerEntry({ externalId: extId, timestamp: createDate(-5) }),
      ];
      const int = [
        makeLedgerEntry({ externalId: extId, timestamp: createDate(-5) }),
      ];

      const report = service.generateComprehensiveReport(
        subs,
        payments,
        usage,
        ext,
        int,
        defaultDateRange,
      );
      expect(report.revenue).toBeDefined();
      expect(report.churn).toBeDefined();
      expect(report.customer).toBeDefined();
      expect(report.entitlementDrift).toBeDefined();
      expect(report.reconciliation).toBeDefined();
    });
  });

  describe("generateReport", () => {
    const baseRequest = {
      dateRange: defaultDateRange,
      format: "json" as const,
      requestedBy: "test-user",
      requestedAt: new Date(),
    };
    const baseData = {
      subscriptions: [makeSub()],
      payments: [makePayment()],
    };

    it("generates revenue report in JSON", () => {
      const result = service.generateReport(
        { ...baseRequest, type: "revenue" },
        baseData,
      );
      expect(result.metadata.type).toBe("revenue");
      expect(result.csv).toBeNull();
    });

    it("generates revenue report in CSV", () => {
      const result = service.generateReport(
        { ...baseRequest, type: "revenue", format: "csv" },
        baseData,
      );
      expect(result.csv).not.toBeNull();
      expect(typeof result.csv).toBe("string");
    });

    it("generates churn report", () => {
      const result = service.generateReport(
        { ...baseRequest, type: "churn" },
        baseData,
      );
      expect(result.metadata.type).toBe("churn");
    });

    it("generates customer report", () => {
      const result = service.generateReport(
        { ...baseRequest, type: "customer" },
        baseData,
      );
      expect(result.metadata.type).toBe("customer");
    });

    it("generates entitlement drift report", () => {
      const result = service.generateReport(
        { ...baseRequest, type: "entitlement_drift" },
        { ...baseData, usageRecords: [makeUsageRecord()] },
      );
      expect(result.metadata.type).toBe("entitlement_drift");
    });

    it("throws when drift report lacks usage records", () => {
      expect(() =>
        service.generateReport(
          { ...baseRequest, type: "entitlement_drift" },
          baseData,
        ),
      ).toThrow(BillingAnalyticsError);
    });

    it("generates reconciliation report", () => {
      const extId = "pi_rec";
      const result = service.generateReport(
        { ...baseRequest, type: "reconciliation" },
        {
          ...baseData,
          externalEntries: [
            makeLedgerEntry({ externalId: extId, timestamp: createDate(-5) }),
          ],
          internalEntries: [
            makeLedgerEntry({ externalId: extId, timestamp: createDate(-5) }),
          ],
        },
      );
      expect(result.metadata.type).toBe("reconciliation");
    });

    it("throws when reconciliation lacks entries", () => {
      expect(() =>
        service.generateReport(
          { ...baseRequest, type: "reconciliation" },
          baseData,
        ),
      ).toThrow(BillingAnalyticsError);
    });

    it("generates comprehensive report", () => {
      const extId = "pi_all";
      const result = service.generateReport(
        { ...baseRequest, type: "comprehensive" },
        {
          ...baseData,
          usageRecords: [makeUsageRecord()],
          externalEntries: [
            makeLedgerEntry({ externalId: extId, timestamp: createDate(-5) }),
          ],
          internalEntries: [
            makeLedgerEntry({ externalId: extId, timestamp: createDate(-5) }),
          ],
        },
      );
      expect(result.metadata.type).toBe("comprehensive");
    });

    it("throws for invalid report type", () => {
      expect(() =>
        service.generateReport(
          { ...baseRequest, type: "invalid" as any },
          baseData,
        ),
      ).toThrow(BillingAnalyticsError);
    });

    it("includes metadata with timing", () => {
      const result = service.generateReport(
        { ...baseRequest, type: "revenue" },
        baseData,
      );
      expect(result.metadata.generationDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.requestedBy).toBe("test-user");
      expect(result.metadata.id).toBeDefined();
    });
  });
});

// ============================================================================
// CSV Export Tests
// ============================================================================

describe("CSV Export", () => {
  describe("toCsv", () => {
    it("converts simple rows to CSV", () => {
      const rows = [
        { name: "Alice", amount: 100 },
        { name: "Bob", amount: 200 },
      ];
      const csv = toCsv(rows);
      expect(csv).toContain("name,amount");
      expect(csv).toContain("Alice,100");
      expect(csv).toContain("Bob,200");
    });

    it("escapes commas in values", () => {
      const rows = [{ name: "Doe, John", amount: 100 }];
      const csv = toCsv(rows);
      expect(csv).toContain('"Doe, John"');
    });

    it("escapes quotes in values", () => {
      const rows = [{ name: 'Say "hello"', amount: 100 }];
      const csv = toCsv(rows);
      expect(csv).toContain('"Say ""hello"""');
    });

    it("handles newlines in values", () => {
      const rows = [{ name: "Line1\nLine2", amount: 100 }];
      const csv = toCsv(rows);
      expect(csv).toContain('"Line1\nLine2"');
    });

    it("returns empty string for empty rows", () => {
      expect(toCsv([])).toBe("");
    });

    it("handles null and undefined values", () => {
      const rows = [{ name: null, amount: undefined }];
      const csv = toCsv(rows as any);
      expect(csv).toContain(",");
    });

    it("uses custom headers", () => {
      const rows = [{ name: "Alice", amount: 100, extra: "ignore" }];
      const csv = toCsv(rows, ["name", "amount"]);
      expect(csv.split("\n")[0]).toBe("name,amount");
      expect(csv).not.toContain("extra");
    });
  });
});

// ============================================================================
// Error Type Tests
// ============================================================================

describe("BillingAnalyticsError", () => {
  it("creates error with code and message", () => {
    const err = new BillingAnalyticsError(
      BillingAnalyticsErrorCode.INVALID_DATE_RANGE,
      "Bad dates",
    );
    expect(err.code).toBe(BillingAnalyticsErrorCode.INVALID_DATE_RANGE);
    expect(err.message).toBe("Bad dates");
    expect(err.name).toBe("BillingAnalyticsError");
  });

  it("includes metadata", () => {
    const err = new BillingAnalyticsError(
      BillingAnalyticsErrorCode.GENERATION_FAILED,
      "Failed",
      { reportType: "revenue" },
    );
    expect(err.metadata).toEqual({ reportType: "revenue" });
  });

  it("is instance of Error", () => {
    const err = new BillingAnalyticsError(
      BillingAnalyticsErrorCode.INSUFFICIENT_DATA,
      "No data",
    );
    expect(err instanceof Error).toBe(true);
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("Edge Cases", () => {
  beforeEach(() => {
    resetAlertCounter();
  });

  it("handles single customer scenario", () => {
    const subs = [makeSub({ monthlyAmount: 4900 })];
    const report = generateRevenueReport(subs, [], defaultDateRange);
    expect(report.currentMRR.totalMRR).toBe(4900);
  });

  it("handles all-free-plan scenario", () => {
    const subs = [
      makeSub({ plan: "free", monthlyAmount: 0 }),
      makeSub({ plan: "free", monthlyAmount: 0 }),
    ];
    const report = generateRevenueReport(subs, [], defaultDateRange);
    expect(report.currentMRR.totalMRR).toBe(0);
    expect(report.currentARR).toBe(0);
  });

  it("handles leap year date boundary", () => {
    const range: AnalyticsDateRange = {
      startDate: new Date("2024-02-28T00:00:00Z"),
      endDate: new Date("2024-03-01T00:00:00Z"),
      granularity: "daily",
    };
    const periods = generateTimePeriods(range);
    // Feb 28, Feb 29 (2024 is a leap year), Mar 1
    expect(periods.length).toBe(3);
    expect(periods[1].label).toBe("2024-02-29");
  });

  it("handles large subscription counts", () => {
    const subs = Array.from({ length: 1000 }, (_, i) =>
      makeSub({
        id: `sub-${i}`,
        monthlyAmount: Math.floor(Math.random() * 10000) + 100,
      }),
    );
    const snapshot = calculateMRRSnapshot(subs, createDate(0));
    expect(snapshot.totalMRR).toBeGreaterThan(0);
  });

  it("handles mixed currency correctly (all cents)", () => {
    // Our system uses cents - verify no floating point issues
    const subs = [
      makeSub({ monthlyAmount: 999 }), // $9.99
      makeSub({ monthlyAmount: 1999 }), // $19.99
      makeSub({ monthlyAmount: 4999 }), // $49.99
    ];
    const snapshot = calculateMRRSnapshot(subs, createDate(0));
    expect(snapshot.totalMRR).toBe(7997); // Exact integer math
  });

  it("reconciliation handles single entry", () => {
    const extId = "pi_single";
    const ext = [
      makeLedgerEntry({
        externalId: extId,
        amount: 100,
        timestamp: createDate(-5),
      }),
    ];
    const int = [
      makeLedgerEntry({
        externalId: extId,
        amount: 100,
        timestamp: createDate(-5),
      }),
    ];
    const summary = reconcile(ext, int, defaultDateRange, "stripe");
    expect(summary.matchedCount).toBe(1);
    expect(summary.reconciliationRate).toBe(100);
  });

  it("drift detection handles exact limit usage", () => {
    const record = makeUsageRecord({ currentUsage: 25, planLimit: 25 });
    const drift = detectDrift(record);
    // Exact limit is not over-usage, but might be flagged as under-usage if threshold not met
    // 100% usage is not under UNDER_USAGE_THRESHOLDS.minor (50%), so no drift
    expect(drift).toBeNull();
  });

  it("handles subscription with same create and cancel date", () => {
    const subs = [
      makeSub({
        createdAt: createDate(-10),
        canceledAt: createDate(-10),
        state: "canceled",
      }),
    ];
    const snapshot = calculateMRRSnapshot(subs, createDate(0));
    expect(snapshot.totalMRR).toBe(0);
  });

  it("ARPU handles single subscription", () => {
    const subs = [makeSub({ monthlyAmount: 4900 })];
    const arpu = calculateARPU(subs, defaultPeriod);
    expect(arpu.overallARPU).toBe(4900);
  });

  it("churn report with no cancellations", () => {
    const subs = [makeSub(), makeSub()];
    const report = generateChurnReport(subs, defaultDateRange);
    expect(report.currentChurn.canceledCount).toBe(0);
    expect(report.cancellationReasons.length).toBe(0);
  });
});
