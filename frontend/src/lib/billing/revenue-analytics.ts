/**
 * Revenue Analytics
 *
 * Calculates MRR, ARR, revenue breakdowns, and growth metrics.
 * All monetary amounts use integer cents to avoid floating-point precision issues.
 *
 * @module @/lib/billing/revenue-analytics
 * @version 1.0.0
 */

import type { PlanTier, Currency } from "@/types/subscription.types";
import type {
  AnalyticsDateRange,
  AnalyticsSubscription,
  AnalyticsPayment,
  MRRSnapshot,
  RevenueByPlan,
  RevenueGrowth,
  RevenueAnalyticsReport,
  TimePeriodBucket,
} from "./analytics-types";

// ============================================================================
// Time Period Helpers
// ============================================================================

/**
 * Generate time period buckets for a date range.
 */
export function generateTimePeriods(
  dateRange: AnalyticsDateRange,
): TimePeriodBucket[] {
  const buckets: TimePeriodBucket[] = [];
  const current = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);

  while (current <= end) {
    const periodStart = new Date(current);
    let periodEnd: Date;
    let label: string;

    switch (dateRange.granularity) {
      case "daily":
        periodEnd = new Date(current);
        periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
        label = current.toISOString().split("T")[0];
        current.setUTCDate(current.getUTCDate() + 1);
        break;
      case "weekly":
        periodEnd = new Date(current);
        periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
        label = `Week of ${current.toISOString().split("T")[0]}`;
        current.setUTCDate(current.getUTCDate() + 7);
        break;
      case "monthly":
        periodEnd = new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1),
        );
        label = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
        current.setUTCMonth(current.getUTCMonth() + 1);
        break;
      case "quarterly":
        periodEnd = new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 3, 1),
        );
        label = `Q${Math.floor(current.getUTCMonth() / 3) + 1} ${current.getUTCFullYear()}`;
        current.setUTCMonth(current.getUTCMonth() + 3);
        break;
      case "yearly":
        periodEnd = new Date(Date.UTC(current.getUTCFullYear() + 1, 0, 1));
        label = `${current.getUTCFullYear()}`;
        current.setUTCFullYear(current.getUTCFullYear() + 1);
        break;
    }

    buckets.push({ periodStart, periodEnd: periodEnd!, label });
  }

  return buckets;
}

// ============================================================================
// MRR Calculation
// ============================================================================

const PLAN_TIERS: PlanTier[] = [
  "free",
  "starter",
  "professional",
  "enterprise",
  "custom",
];

/**
 * Calculate MRR snapshot at a given date.
 */
export function calculateMRRSnapshot(
  subscriptions: AnalyticsSubscription[],
  date: Date,
  previousSubscriptions?: AnalyticsSubscription[],
): MRRSnapshot {
  const byPlan: Record<PlanTier, number> = {
    free: 0,
    starter: 0,
    professional: 0,
    enterprise: 0,
    custom: 0,
  };

  let totalMRR = 0;
  let newMRR = 0;
  let expansionMRR = 0;
  let contractionMRR = 0;
  let churnedMRR = 0;
  let reactivationMRR = 0;

  // Build lookup of previous month subscriptions
  const prevMap = new Map<string, AnalyticsSubscription>();
  if (previousSubscriptions) {
    for (const sub of previousSubscriptions) {
      prevMap.set(sub.id, sub);
    }
  }

  // Active subscriptions at the date
  const activeSubscriptions = subscriptions.filter((sub) => {
    const isCreatedBefore = sub.createdAt <= date;
    const isActive = sub.state === "active" || sub.state === "trial";
    const notCanceled = !sub.canceledAt || sub.canceledAt > date;
    return isCreatedBefore && isActive && notCanceled;
  });

  for (const sub of activeSubscriptions) {
    const monthlyAmount = sub.monthlyAmount;
    totalMRR += monthlyAmount;
    byPlan[sub.plan] += monthlyAmount;

    const prev = prevMap.get(sub.id);
    if (!prev) {
      // Check if this is a reactivation (was previously canceled) or truly new
      const wasEverCanceled = sub.canceledAt !== null && sub.canceledAt < date;
      if (wasEverCanceled) {
        reactivationMRR += monthlyAmount;
      } else {
        newMRR += monthlyAmount;
      }
    } else if (prev.monthlyAmount < monthlyAmount) {
      expansionMRR += monthlyAmount - prev.monthlyAmount;
    } else if (prev.monthlyAmount > monthlyAmount) {
      contractionMRR += prev.monthlyAmount - monthlyAmount;
    }
  }

  // Calculate churn from previous subscriptions that are no longer active
  if (previousSubscriptions) {
    for (const prevSub of previousSubscriptions) {
      const stillActive = activeSubscriptions.find((s) => s.id === prevSub.id);
      if (!stillActive) {
        const wasActive =
          prevSub.state === "active" || prevSub.state === "trial";
        if (wasActive) {
          churnedMRR += prevSub.monthlyAmount;
        }
      }
    }
  }

  const netNewMRR =
    newMRR + expansionMRR + reactivationMRR - contractionMRR - churnedMRR;

  return {
    date,
    totalMRR,
    byPlan,
    newMRR,
    expansionMRR,
    contractionMRR,
    churnedMRR,
    reactivationMRR,
    netNewMRR,
  };
}

/**
 * Calculate MRR time series over a date range.
 */
export function calculateMRRTimeSeries(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
): MRRSnapshot[] {
  const periods = generateTimePeriods(dateRange);
  const snapshots: MRRSnapshot[] = [];

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const prevPeriod = i > 0 ? periods[i - 1] : null;

    // Get subscriptions active at this period's end
    const activeSubs = subscriptions.filter((sub) => {
      const createdBefore = sub.createdAt <= period.periodEnd;
      const active = sub.state === "active" || sub.state === "trial";
      const notCanceled = !sub.canceledAt || sub.canceledAt > period.periodEnd;
      return createdBefore && (active || notCanceled);
    });

    // Get previous period subscriptions for delta calculation
    let prevSubs: AnalyticsSubscription[] | undefined;
    if (prevPeriod) {
      prevSubs = subscriptions.filter((sub) => {
        const createdBefore = sub.createdAt <= prevPeriod.periodEnd;
        const active = sub.state === "active" || sub.state === "trial";
        const notCanceled =
          !sub.canceledAt || sub.canceledAt > prevPeriod.periodEnd;
        return createdBefore && (active || notCanceled);
      });
    }

    snapshots.push(
      calculateMRRSnapshot(activeSubs, period.periodEnd, prevSubs),
    );
  }

  return snapshots;
}

// ============================================================================
// Revenue Breakdown
// ============================================================================

/**
 * Calculate revenue breakdown by plan tier.
 */
export function calculateRevenueByPlan(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
): RevenueByPlan[] {
  const activeSubscriptions = subscriptions.filter((sub) => {
    const isActive = sub.state === "active" || sub.state === "trial";
    const inRange = sub.createdAt <= dateRange.endDate;
    const notCanceled = !sub.canceledAt || sub.canceledAt > dateRange.startDate;
    return isActive && inRange && notCanceled;
  });

  let totalRevenue = 0;
  const planData: Record<PlanTier, { revenue: number; count: number }> = {
    free: { revenue: 0, count: 0 },
    starter: { revenue: 0, count: 0 },
    professional: { revenue: 0, count: 0 },
    enterprise: { revenue: 0, count: 0 },
    custom: { revenue: 0, count: 0 },
  };

  for (const sub of activeSubscriptions) {
    const revenue = sub.monthlyAmount;
    planData[sub.plan].revenue += revenue;
    planData[sub.plan].count += 1;
    totalRevenue += revenue;
  }

  return PLAN_TIERS.map((plan) => ({
    plan,
    revenue: planData[plan].revenue,
    subscriptionCount: planData[plan].count,
    revenueShare:
      totalRevenue > 0
        ? Math.round((planData[plan].revenue / totalRevenue) * 10000) / 100
        : 0,
  }));
}

// ============================================================================
// Revenue Growth
// ============================================================================

/**
 * Calculate revenue growth metrics.
 */
export function calculateRevenueGrowth(
  currentMRR: number,
  previousMRR: number,
  yearAgMRR?: number,
): RevenueGrowth {
  const absoluteChange = currentMRR - previousMRR;
  const percentageChange =
    previousMRR > 0
      ? Math.round((absoluteChange / previousMRR) * 10000) / 100
      : 0;
  const momGrowthRate = percentageChange;

  let yoyGrowthRate: number | null = null;
  if (yearAgMRR !== undefined && yearAgMRR > 0) {
    yoyGrowthRate =
      Math.round(((currentMRR - yearAgMRR) / yearAgMRR) * 10000) / 100;
  }

  return {
    currentRevenue: currentMRR,
    previousRevenue: previousMRR,
    absoluteChange,
    percentageChange,
    momGrowthRate,
    yoyGrowthRate,
  };
}

// ============================================================================
// Total Revenue Calculation
// ============================================================================

/**
 * Calculate total revenue from payments in a period.
 */
export function calculateTotalRevenue(
  payments: AnalyticsPayment[],
  dateRange: AnalyticsDateRange,
): number {
  return payments
    .filter(
      (p) =>
        p.status === "succeeded" &&
        p.createdAt >= dateRange.startDate &&
        p.createdAt <= dateRange.endDate,
    )
    .reduce((sum, p) => sum + p.amount, 0);
}

// ============================================================================
// Complete Revenue Report
// ============================================================================

/**
 * Generate a complete revenue analytics report.
 */
export function generateRevenueReport(
  subscriptions: AnalyticsSubscription[],
  payments: AnalyticsPayment[],
  dateRange: AnalyticsDateRange,
  currency: Currency = "USD",
): RevenueAnalyticsReport {
  const mrrTimeSeries = calculateMRRTimeSeries(subscriptions, dateRange);
  const currentMRR =
    mrrTimeSeries.length > 0
      ? mrrTimeSeries[mrrTimeSeries.length - 1]
      : calculateMRRSnapshot(subscriptions, dateRange.endDate);

  const previousMRR =
    mrrTimeSeries.length > 1
      ? mrrTimeSeries[mrrTimeSeries.length - 2].totalMRR
      : 0;

  const revenueByPlan = calculateRevenueByPlan(subscriptions, dateRange);
  const totalRevenue = calculateTotalRevenue(payments, dateRange);
  const growth = calculateRevenueGrowth(currentMRR.totalMRR, previousMRR);

  return {
    dateRange,
    currentMRR,
    currentARR: currentMRR.totalMRR * 12,
    mrrTimeSeries,
    revenueByPlan,
    growth,
    totalRevenue,
    currency,
    generatedAt: new Date(),
  };
}
