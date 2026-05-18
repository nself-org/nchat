/**
 * Usage Tracker
 * Track and enforce plan limits
 */

import type {
  PlanTier,
  UsageMetrics,
  UsageLimits,
  UsageWarning,
  PlanFeatures,
} from "@/types/billing";
import { PLANS } from "@/config/billing-plans";

export class UsageTracker {
  /**
   * Check if a specific feature is allowed for the current plan
   */
  static isFeatureAllowed(
    planTier: PlanTier,
    feature: keyof PlanFeatures,
  ): boolean {
    const plan = PLANS[planTier];
    return plan.features[feature] === true;
  }

  /**
   * Get the limit for a specific metric
   */
  static getLimit(
    planTier: PlanTier,
    metric: keyof PlanFeatures,
  ): number | null {
    const plan = PLANS[planTier];
    const value = plan.features[metric];
    return typeof value === "number" ? value : null;
  }

  /**
   * Check if usage is within limits
   */
  static checkLimit(
    planTier: PlanTier,
    metric: keyof PlanFeatures,
    currentValue: number,
  ): {
    allowed: boolean;
    limit: number | null;
    percentage: number;
  } {
    const limit = this.getLimit(planTier, metric);

    if (limit === null) {
      // Unlimited
      return { allowed: true, limit: null, percentage: 0 };
    }

    const allowed = currentValue < limit;
    const percentage = (currentValue / limit) * 100;

    return { allowed, limit, percentage };
  }

  /**
   * Calculate usage warnings
   */
  static calculateWarnings(
    planTier: PlanTier,
    usage: UsageMetrics,
  ): UsageWarning[] {
    const warnings: UsageWarning[] = [];
    const plan = PLANS[planTier];

    const checks: Array<{
      feature: string;
      current: number;
      limit: number | null;
    }> = [
      { feature: "Users", current: usage.users, limit: plan.features.maxUsers },
      {
        feature: "Channels",
        current: usage.channels,
        limit: plan.features.maxChannels,
      },
      {
        feature: "Messages",
        current: usage.messages,
        limit: plan.features.maxMessagesPerMonth,
      },
      {
        feature: "Storage",
        current: usage.storageGB,
        limit: plan.features.maxStorageGB,
      },
      {
        feature: "Integrations",
        current: usage.integrations,
        limit: plan.features.maxIntegrations,
      },
      { feature: "Bots", current: usage.bots, limit: plan.features.maxBots },
      {
        feature: "AI Minutes",
        current: usage.aiMinutes,
        limit: plan.features.aiModerationMinutes,
      },
      {
        feature: "AI Queries",
        current: usage.aiQueries,
        limit: plan.features.aiSearchQueries,
      },
    ];

    for (const check of checks) {
      if (check.limit === null) continue; // Unlimited

      const percentage = (check.current / check.limit) * 100;

      if (percentage >= 90) {
        warnings.push({
          feature: check.feature,
          current: check.current,
          limit: check.limit,
          percentage,
          severity: percentage >= 100 ? "critical" : "warning",
        });
      } else if (percentage >= 75) {
        warnings.push({
          feature: check.feature,
          current: check.current,
          limit: check.limit,
          percentage,
          severity: "info",
        });
      }
    }

    return warnings.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Check if any limits are exceeded
   */
  static hasExceededLimits(planTier: PlanTier, usage: UsageMetrics): boolean {
    const plan = PLANS[planTier];

    const checks = [
      { current: usage.users, limit: plan.features.maxUsers },
      { current: usage.channels, limit: plan.features.maxChannels },
      { current: usage.messages, limit: plan.features.maxMessagesPerMonth },
      { current: usage.storageGB, limit: plan.features.maxStorageGB },
      { current: usage.integrations, limit: plan.features.maxIntegrations },
      { current: usage.bots, limit: plan.features.maxBots },
    ];

    return checks.some(
      (check) => check.limit !== null && check.current >= check.limit,
    );
  }

  /**
   * Get usage limits with warnings
   */
  static getUsageLimits(planTier: PlanTier, usage: UsageMetrics): UsageLimits {
    const plan = PLANS[planTier];
    const warnings = this.calculateWarnings(planTier, usage);
    const exceeded = this.hasExceededLimits(planTier, usage);

    return {
      plan: planTier,
      current: usage,
      limits: plan.features,
      warnings,
      exceeded,
    };
  }

  /**
   * Format usage for display
   */
  static formatUsage(
    current: number,
    limit: number | null,
    unit: string = "",
  ): string {
    if (limit === null) {
      return `${current.toLocaleString()}${unit} / Unlimited`;
    }
    return `${current.toLocaleString()}${unit} / ${limit.toLocaleString()}${unit}`;
  }

  /**
   * Get usage percentage for progress bars
   */
  static getUsagePercentage(current: number, limit: number | null): number {
    if (limit === null) return 0;
    return Math.min((current / limit) * 100, 100);
  }

  /**
   * Suggest upgrade if needed
   */
  static suggestUpgrade(
    currentTier: PlanTier,
    usage: UsageMetrics,
  ): PlanTier | null {
    const tiers: PlanTier[] = [
      "free",
      "starter",
      "pro",
      "business",
      "enterprise",
    ];
    const currentIndex = tiers.indexOf(currentTier);

    // Check if current tier has exceeded limits
    if (!this.hasExceededLimits(currentTier, usage)) {
      return null;
    }

    // Find the next tier that can accommodate usage
    for (let i = currentIndex + 1; i < tiers.length; i++) {
      const tier = tiers[i];
      if (!this.hasExceededLimits(tier, usage)) {
        return tier;
      }
    }

    return "enterprise";
  }
}

/**
 * Plan Restriction Middleware
 * Use in API routes to enforce plan limits
 */
export function requirePlanFeature(feature: keyof PlanFeatures) {
  return (planTier: PlanTier): boolean => {
    return UsageTracker.isFeatureAllowed(planTier, feature);
  };
}

export function requirePlanTier(minimumTier: PlanTier) {
  const tierOrder: PlanTier[] = [
    "free",
    "starter",
    "pro",
    "business",
    "enterprise",
  ];
  const minIndex = tierOrder.indexOf(minimumTier);

  return (currentTier: PlanTier): boolean => {
    const currentIndex = tierOrder.indexOf(currentTier);
    return currentIndex >= minIndex;
  };
}

/**
 * Usage calculation helpers
 */
export async function getCurrentUsage(userId: string): Promise<UsageMetrics> {
  // This would connect to your database
  // For now, return mock data
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  return {
    userId,
    period,
    users: 0,
    channels: 0,
    messages: 0,
    storageGB: 0,
    integrations: 0,
    bots: 0,
    aiMinutes: 0,
    aiQueries: 0,
    callMinutes: 0,
    recordingGB: 0,
  };
}

export function incrementUsage(
  usage: UsageMetrics,
  metric: keyof Omit<UsageMetrics, "userId" | "period">,
  amount: number = 1,
): UsageMetrics {
  return {
    ...usage,
    [metric]: usage[metric] + amount,
  };
}
