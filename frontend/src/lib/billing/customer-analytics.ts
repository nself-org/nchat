/**
 * Customer Analytics
 *
 * Calculates ARPU, LTV, and customer segmentation metrics.
 * All monetary amounts use integer cents to avoid floating-point precision issues.
 *
 * @module @/lib/billing/customer-analytics
 * @version 1.0.0
 */

import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import type {
  AnalyticsDateRange,
  AnalyticsSubscription,
  AnalyticsPayment,
  ARPUMetrics,
  LTVMetrics,
  CustomerSegment,
  CustomerAnalyticsReport,
  TimePeriodBucket,
} from "./analytics-types";
import { generateTimePeriods } from "./revenue-analytics";

// ============================================================================
// ARPU Calculation
// ============================================================================

const PLAN_TIERS: PlanTier[] = [
  "free",
  "starter",
  "professional",
  "enterprise",
  "custom",
];
const BILLING_INTERVALS: BillingInterval[] = ["monthly", "yearly"];

/**
 * Calculate ARPU metrics for a period.
 */
export function calculateARPU(
  subscriptions: AnalyticsSubscription[],
  period: TimePeriodBucket,
): ARPUMetrics {
  // Filter to active subscriptions in the period
  const activeSubscriptions = subscriptions.filter((sub) => {
    const isActive = sub.state === "active" || sub.state === "trial";
    const createdBefore = sub.createdAt <= period.periodEnd;
    const notCanceled = !sub.canceledAt || sub.canceledAt > period.periodStart;
    return isActive && createdBefore && notCanceled;
  });

  const totalCount = activeSubscriptions.length;
  const totalRevenue = activeSubscriptions.reduce(
    (sum, s) => sum + s.monthlyAmount,
    0,
  );

  // Overall ARPU
  const overallARPU =
    totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

  // ARPU by plan
  const byPlan: Record<PlanTier, number> = {
    free: 0,
    starter: 0,
    professional: 0,
    enterprise: 0,
    custom: 0,
  };

  for (const plan of PLAN_TIERS) {
    const planSubs = activeSubscriptions.filter((s) => s.plan === plan);
    const planRevenue = planSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);
    byPlan[plan] =
      planSubs.length > 0 ? Math.round(planRevenue / planSubs.length) : 0;
  }

  // ARPU by interval
  const byInterval: Record<BillingInterval, number> = {
    monthly: 0,
    yearly: 0,
  };

  for (const interval of BILLING_INTERVALS) {
    const intervalSubs = activeSubscriptions.filter(
      (s) => s.interval === interval,
    );
    const intervalRevenue = intervalSubs.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0,
    );
    byInterval[interval] =
      intervalSubs.length > 0
        ? Math.round(intervalRevenue / intervalSubs.length)
        : 0;
  }

  return {
    overallARPU,
    byPlan,
    byInterval,
    trend: 0, // Will be calculated when comparing periods
    period,
  };
}

/**
 * Calculate ARPU time series with trend.
 */
export function calculateARPUTimeSeries(
  subscriptions: AnalyticsSubscription[],
  dateRange: AnalyticsDateRange,
): ARPUMetrics[] {
  const periods = generateTimePeriods(dateRange);
  const series: ARPUMetrics[] = [];

  for (let i = 0; i < periods.length; i++) {
    const arpu = calculateARPU(subscriptions, periods[i]);

    // Calculate trend relative to previous period
    if (i > 0 && series[i - 1].overallARPU > 0) {
      arpu.trend =
        Math.round(
          ((arpu.overallARPU - series[i - 1].overallARPU) /
            series[i - 1].overallARPU) *
            10000,
        ) / 100;
    }

    series.push(arpu);
  }

  return series;
}

// ============================================================================
// LTV Calculation
// ============================================================================

/**
 * Calculate average customer lifespan in months.
 */
export function calculateAverageLifespan(
  subscriptions: AnalyticsSubscription[],
  now: Date = new Date(),
): number {
  if (subscriptions.length === 0) return 0;

  const lifespans = subscriptions.map((sub) => {
    const endDate = sub.canceledAt || now;
    const durationMs = endDate.getTime() - sub.createdAt.getTime();
    return durationMs / (1000 * 60 * 60 * 24 * 30); // Convert to months
  });

  const totalLifespan = lifespans.reduce((sum, l) => sum + l, 0);
  return Math.round((totalLifespan / lifespans.length) * 100) / 100;
}

/**
 * Calculate LTV metrics.
 */
export function calculateLTV(
  subscriptions: AnalyticsSubscription[],
  churnRate: number,
  now: Date = new Date(),
): LTVMetrics {
  // Active subscriptions
  const activeSubs = subscriptions.filter(
    (s) => s.state === "active" || s.state === "trial",
  );

  const totalCount = activeSubs.length;
  const totalRevenue = activeSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const avgMonthlyRevenue =
    totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

  // Average lifespan
  const averageLifespanMonths = calculateAverageLifespan(subscriptions, now);

  // Average LTV = average monthly revenue * average lifespan
  const averageLTV = Math.round(avgMonthlyRevenue * averageLifespanMonths);

  // LTV by plan
  const byPlan: Record<PlanTier, number> = {
    free: 0,
    starter: 0,
    professional: 0,
    enterprise: 0,
    custom: 0,
  };

  for (const plan of PLAN_TIERS) {
    const planSubs = subscriptions.filter((s) => s.plan === plan);
    const planActive = planSubs.filter(
      (s) => s.state === "active" || s.state === "trial",
    );
    const planAvgRevenue =
      planActive.length > 0
        ? Math.round(
            planActive.reduce((sum, s) => sum + s.monthlyAmount, 0) /
              planActive.length,
          )
        : 0;
    const planLifespan = calculateAverageLifespan(planSubs, now);
    byPlan[plan] = Math.round(planAvgRevenue * planLifespan);
  }

  // LTV:CAC ratio
  const subsWithCAC = subscriptions.filter((s) => s.cac !== null && s.cac! > 0);
  let ltvCacRatio: number | null = null;
  if (subsWithCAC.length > 0) {
    const avgCAC = Math.round(
      subsWithCAC.reduce((sum, s) => sum + s.cac!, 0) / subsWithCAC.length,
    );
    if (avgCAC > 0) {
      ltvCacRatio = Math.round((averageLTV / avgCAC) * 100) / 100;
    }
  }

  // Projected LTV using churn rate
  // LTV = ARPU / churn_rate (when churn_rate is monthly percentage)
  const monthlyChurnDecimal = churnRate / 100;
  const projectedLTV =
    monthlyChurnDecimal > 0
      ? Math.round(avgMonthlyRevenue / monthlyChurnDecimal)
      : avgMonthlyRevenue * 120; // Cap at 10 years if no churn

  return {
    averageLTV,
    byPlan,
    averageLifespanMonths,
    ltvCacRatio,
    projectedLTV,
  };
}

// ============================================================================
// Customer Segmentation
// ============================================================================

/**
 * Segment customers by plan tier.
 */
export function segmentByPlan(
  subscriptions: AnalyticsSubscription[],
  now: Date = new Date(),
): CustomerSegment[] {
  const activeSubs = subscriptions.filter(
    (s) => s.state === "active" || s.state === "trial",
  );
  const total = activeSubs.length;

  if (total === 0) return [];

  return PLAN_TIERS.map((plan) => {
    const planSubs = activeSubs.filter((s) => s.plan === plan);
    const count = planSubs.length;
    if (count === 0) {
      return null;
    }
    const totalRevenue = planSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);
    const avgTenure =
      planSubs.reduce((sum, s) => {
        return (
          sum +
          (now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
      }, 0) / count;

    const canceledInPlan = subscriptions.filter(
      (s) => s.plan === plan && s.canceledAt !== null,
    );
    const totalInPlan = subscriptions.filter((s) => s.plan === plan).length;
    const churnRate =
      totalInPlan > 0
        ? Math.round((canceledInPlan.length / totalInPlan) * 10000) / 100
        : 0;

    return {
      name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      criteria: `Customers on the ${plan} plan`,
      count,
      percentage: Math.round((count / total) * 10000) / 100,
      totalRevenue,
      averageRevenue: Math.round(totalRevenue / count),
      averageTenure: Math.round(avgTenure * 100) / 100,
      churnRate,
    };
  }).filter((s): s is CustomerSegment => s !== null);
}

/**
 * Segment customers by tenure (new, established, veteran).
 */
export function segmentByTenure(
  subscriptions: AnalyticsSubscription[],
  now: Date = new Date(),
): CustomerSegment[] {
  const activeSubs = subscriptions.filter(
    (s) => s.state === "active" || s.state === "trial",
  );
  const total = activeSubs.length;

  if (total === 0) return [];

  const tenureSegments = [
    {
      name: "New Customers",
      criteria: "Less than 3 months",
      minMonths: 0,
      maxMonths: 3,
    },
    {
      name: "Established Customers",
      criteria: "3-12 months",
      minMonths: 3,
      maxMonths: 12,
    },
    {
      name: "Veteran Customers",
      criteria: "More than 12 months",
      minMonths: 12,
      maxMonths: Infinity,
    },
  ];

  return tenureSegments
    .map((segment) => {
      const segSubs = activeSubs.filter((s) => {
        const months =
          (now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months >= segment.minMonths && months < segment.maxMonths;
      });

      const count = segSubs.length;
      if (count === 0) return null;

      const totalRevenue = segSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);
      const avgTenure =
        segSubs.reduce((sum, s) => {
          return (
            sum +
            (now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
        }, 0) / count;

      return {
        name: segment.name,
        criteria: segment.criteria,
        count,
        percentage: Math.round((count / total) * 10000) / 100,
        totalRevenue,
        averageRevenue: Math.round(totalRevenue / count),
        averageTenure: Math.round(avgTenure * 100) / 100,
        churnRate: 0, // Would need historical data for accurate calculation
      };
    })
    .filter((s): s is CustomerSegment => s !== null);
}

// ============================================================================
// Complete Customer Report
// ============================================================================

/**
 * Generate a complete customer analytics report.
 */
export function generateCustomerReport(
  subscriptions: AnalyticsSubscription[],
  payments: AnalyticsPayment[],
  dateRange: AnalyticsDateRange,
  churnRate: number = 5,
): CustomerAnalyticsReport {
  const periods = generateTimePeriods(dateRange);
  const currentPeriod =
    periods.length > 0
      ? periods[periods.length - 1]
      : {
          periodStart: dateRange.startDate,
          periodEnd: dateRange.endDate,
          label: "current",
        };

  const arpu = calculateARPU(subscriptions, currentPeriod);
  const ltv = calculateLTV(subscriptions, churnRate);
  const planSegments = segmentByPlan(subscriptions);
  const tenureSegments = segmentByTenure(subscriptions);
  const segments = [...planSegments, ...tenureSegments];

  const activeCustomers = subscriptions.filter(
    (s) => s.state === "active" || s.state === "trial",
  ).length;

  const newCustomers = subscriptions.filter(
    (s) =>
      s.createdAt >= dateRange.startDate && s.createdAt <= dateRange.endDate,
  ).length;

  const arpuTimeSeries = calculateARPUTimeSeries(subscriptions, dateRange);

  return {
    dateRange,
    arpu,
    ltv,
    segments,
    totalActiveCustomers: activeCustomers,
    newCustomers,
    arpuTimeSeries,
    generatedAt: new Date(),
  };
}
