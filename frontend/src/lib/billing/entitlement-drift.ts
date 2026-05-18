/**
 * Entitlement Drift Detection
 *
 * Detects discrepancies between actual usage and plan entitlements.
 * Identifies over-usage (billing leakage) and under-usage (potential downgrade risk).
 *
 * @module @/lib/billing/entitlement-drift
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";
import { PLAN_LIMITS } from "./plan-config";
import type {
  AnalyticsUsageRecord,
  EntitlementDriftEntry,
  DriftSeverity,
  DriftDirection,
  DriftAlert,
  EntitlementDriftReport,
} from "./analytics-types";

// ============================================================================
// Drift Severity Thresholds
// ============================================================================

/**
 * Thresholds for drift severity classification (percentage over limit).
 */
export const DRIFT_SEVERITY_THRESHOLDS = {
  minor: 5, // 5% over limit
  moderate: 15, // 15% over limit
  severe: 30, // 30% over limit
  critical: 50, // 50% over limit
} as const;

/**
 * Thresholds for under-usage severity (percentage of limit used).
 */
export const UNDER_USAGE_THRESHOLDS = {
  minor: 50, // Using less than 50% of limit
  moderate: 25, // Using less than 25% of limit
  severe: 10, // Using less than 10% of limit
  critical: 5, // Using less than 5% of limit
} as const;

// ============================================================================
// Drift Detection
// ============================================================================

/**
 * Classify drift severity for over-usage.
 */
export function classifyOverUsageSeverity(
  driftPercentage: number,
): DriftSeverity {
  if (driftPercentage >= DRIFT_SEVERITY_THRESHOLDS.critical) return "critical";
  if (driftPercentage >= DRIFT_SEVERITY_THRESHOLDS.severe) return "severe";
  if (driftPercentage >= DRIFT_SEVERITY_THRESHOLDS.moderate) return "moderate";
  if (driftPercentage >= DRIFT_SEVERITY_THRESHOLDS.minor) return "minor";
  return "none";
}

/**
 * Classify drift severity for under-usage.
 */
export function classifyUnderUsageSeverity(
  usagePercentage: number,
): DriftSeverity {
  if (usagePercentage <= UNDER_USAGE_THRESHOLDS.critical) return "critical";
  if (usagePercentage <= UNDER_USAGE_THRESHOLDS.severe) return "severe";
  if (usagePercentage <= UNDER_USAGE_THRESHOLDS.moderate) return "moderate";
  if (usagePercentage <= UNDER_USAGE_THRESHOLDS.minor) return "minor";
  return "none";
}

/**
 * Get the plan limit for a specific resource.
 */
export function getPlanLimitForResource(
  plan: PlanTier,
  resource: string,
): number | null {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return null;

  const resourceMap: Record<string, keyof typeof limits> = {
    members: "maxMembers",
    channels: "maxChannels",
    storage: "maxStorageBytes",
    file_size: "maxFileSizeBytes",
    api_calls: "maxApiCallsPerMonth",
    call_participants: "maxCallParticipants",
    stream_duration: "maxStreamDurationMinutes",
  };

  const key = resourceMap[resource];
  if (!key) return null;

  return limits[key];
}

/**
 * Generate a recommended action based on drift.
 */
export function getRecommendedAction(
  direction: DriftDirection,
  severity: DriftSeverity,
  resource: string,
  plan: PlanTier,
): string {
  if (direction === "none" || severity === "none") {
    return "No action required";
  }

  if (direction === "over") {
    switch (severity) {
      case "critical":
        return `Critical: ${resource} usage exceeds ${plan} plan limit by >50%. Immediate upgrade required or enforce hard limits.`;
      case "severe":
        return `Severe: ${resource} usage significantly exceeds ${plan} plan limit. Recommend upgrade or usage review.`;
      case "moderate":
        return `Moderate: ${resource} usage exceeds ${plan} plan limit. Consider upgrading to a higher tier.`;
      case "minor":
        return `Minor: ${resource} usage slightly exceeds ${plan} plan limit. Monitor and consider upgrade.`;
      default:
        return "Monitor usage";
    }
  }

  // Under-usage
  switch (severity) {
    case "critical":
      return `Critical under-usage: Using <5% of ${resource} allocation on ${plan} plan. Customer may be disengaged or on wrong plan.`;
    case "severe":
      return `Severe under-usage: Using <10% of ${resource} allocation. High risk of downgrade or churn.`;
    case "moderate":
      return `Moderate under-usage: Using <25% of ${resource} allocation. May benefit from engagement outreach.`;
    case "minor":
      return `Minor under-usage: Using <50% of ${resource} allocation. Encourage feature adoption.`;
    default:
      return "No action required";
  }
}

/**
 * Detect drift for a single usage record.
 */
export function detectDrift(
  record: AnalyticsUsageRecord,
  now: Date = new Date(),
): EntitlementDriftEntry | null {
  const planLimit =
    record.planLimit ?? getPlanLimitForResource(record.plan, record.resource);

  // If limit is null (unlimited), no drift possible
  if (planLimit === null) return null;

  // Zero limit means the resource is not available
  if (planLimit === 0 && record.currentUsage > 0) {
    return {
      workspaceId: record.workspaceId,
      organizationId: record.organizationId,
      plan: record.plan,
      resource: record.resource,
      currentUsage: record.currentUsage,
      planLimit,
      direction: "over",
      driftAmount: record.currentUsage,
      driftPercentage: 100,
      severity: "critical",
      detectedAt: now,
      recommendedAction: getRecommendedAction(
        "over",
        "critical",
        record.resource,
        record.plan,
      ),
    };
  }

  if (planLimit <= 0) return null;

  const usagePercentage = (record.currentUsage / planLimit) * 100;

  if (record.currentUsage > planLimit) {
    // Over-usage
    const driftAmount = record.currentUsage - planLimit;
    const driftPercentage =
      Math.round(((record.currentUsage - planLimit) / planLimit) * 10000) / 100;
    const severity = classifyOverUsageSeverity(driftPercentage);

    return {
      workspaceId: record.workspaceId,
      organizationId: record.organizationId,
      plan: record.plan,
      resource: record.resource,
      currentUsage: record.currentUsage,
      planLimit,
      direction: "over",
      driftAmount,
      driftPercentage,
      severity,
      detectedAt: now,
      recommendedAction: getRecommendedAction(
        "over",
        severity,
        record.resource,
        record.plan,
      ),
    };
  }

  if (usagePercentage < UNDER_USAGE_THRESHOLDS.minor) {
    // Under-usage
    const driftAmount = planLimit - record.currentUsage;
    const driftPercentage =
      -Math.round(((planLimit - record.currentUsage) / planLimit) * 10000) /
      100;
    const severity = classifyUnderUsageSeverity(usagePercentage);

    return {
      workspaceId: record.workspaceId,
      organizationId: record.organizationId,
      plan: record.plan,
      resource: record.resource,
      currentUsage: record.currentUsage,
      planLimit,
      direction: "under",
      driftAmount,
      driftPercentage,
      severity,
      detectedAt: now,
      recommendedAction: getRecommendedAction(
        "under",
        severity,
        record.resource,
        record.plan,
      ),
    };
  }

  // Within normal range
  return null;
}

/**
 * Detect drift for multiple usage records.
 */
export function detectAllDrift(
  records: AnalyticsUsageRecord[],
  now: Date = new Date(),
): EntitlementDriftEntry[] {
  const entries: EntitlementDriftEntry[] = [];

  for (const record of records) {
    const drift = detectDrift(record, now);
    if (drift) {
      entries.push(drift);
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<DriftSeverity, number> = {
    critical: 0,
    severe: 1,
    moderate: 2,
    minor: 3,
    none: 4,
  };

  return entries.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

// ============================================================================
// Revenue Impact Estimation
// ============================================================================

/**
 * Estimate revenue impact from over-usage not being billed.
 * This is a simplified estimation based on overage pricing.
 */
export function estimateRevenueImpact(
  driftEntries: EntitlementDriftEntry[],
  overagePricePerUnit: Record<string, number> = {},
): number {
  const defaultPricePerUnit: Record<string, number> = {
    members: 500, // $5.00 per extra member
    channels: 200, // $2.00 per extra channel
    storage: 50, // $0.50 per extra GB
    api_calls: 1, // $0.01 per extra API call
    call_participants: 300, // $3.00 per extra participant
    stream_duration: 10, // $0.10 per extra minute
  };

  let totalImpact = 0;

  for (const entry of driftEntries) {
    if (entry.direction === "over") {
      const pricePerUnit =
        overagePricePerUnit[entry.resource] ??
        defaultPricePerUnit[entry.resource] ??
        0;
      totalImpact += entry.driftAmount * pricePerUnit;
    }
  }

  return totalImpact;
}

// ============================================================================
// Alert Generation
// ============================================================================

let alertCounter = 0;

/**
 * Generate alerts from drift entries.
 */
export function generateDriftAlerts(
  driftEntries: EntitlementDriftEntry[],
  minSeverity: DriftSeverity = "minor",
): DriftAlert[] {
  const severityOrder: Record<DriftSeverity, number> = {
    none: 0,
    minor: 1,
    moderate: 2,
    severe: 3,
    critical: 4,
  };

  const minOrder = severityOrder[minSeverity];

  return driftEntries
    .filter((entry) => severityOrder[entry.severity] >= minOrder)
    .map((entry) => ({
      id: `drift-alert-${++alertCounter}`,
      drift: entry,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      createdAt: entry.detectedAt,
    }));
}

/**
 * Reset alert counter (for testing).
 */
export function resetAlertCounter(): void {
  alertCounter = 0;
}

// ============================================================================
// Complete Drift Report
// ============================================================================

/**
 * Generate a complete entitlement drift report.
 */
export function generateDriftReport(
  usageRecords: AnalyticsUsageRecord[],
  overagePricing?: Record<string, number>,
  minAlertSeverity: DriftSeverity = "minor",
): EntitlementDriftReport {
  const now = new Date();
  const driftEntries = detectAllDrift(usageRecords, now);
  const activeAlerts = generateDriftAlerts(driftEntries, minAlertSeverity);

  // Unique workspaces analyzed
  const uniqueWorkspaces = new Set(usageRecords.map((r) => r.workspaceId));
  const workspacesWithDrift = new Set(driftEntries.map((e) => e.workspaceId));

  // Summary by severity
  const bySeverity: Record<DriftSeverity, number> = {
    none: 0,
    minor: 0,
    moderate: 0,
    severe: 0,
    critical: 0,
  };
  for (const entry of driftEntries) {
    bySeverity[entry.severity]++;
  }

  // Summary by resource
  const byResource: Record<string, number> = {};
  for (const entry of driftEntries) {
    byResource[entry.resource] = (byResource[entry.resource] || 0) + 1;
  }

  const estimatedRevenueImpact = estimateRevenueImpact(
    driftEntries,
    overagePricing,
  );

  return {
    analysisDate: now,
    totalWorkspacesAnalyzed: uniqueWorkspaces.size,
    workspacesWithDrift: workspacesWithDrift.size,
    driftEntries,
    activeAlerts,
    bySeverity,
    byResource,
    estimatedRevenueImpact,
    generatedAt: now,
  };
}
