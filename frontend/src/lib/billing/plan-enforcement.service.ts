/**
 * Plan Enforcement Service
 *
 * Server-side enforcement of subscription plan limits and feature access.
 * Ensures users cannot exceed their plan's resource limits.
 */

import type { PlanTier } from "@/types/subscription.types";
import {
  PLAN_LIMITS,
  PLAN_FEATURES,
  isWithinLimit,
  hasFeature,
  getRemainingQuota,
  getUsagePercentage,
} from "./plan-config";

// ============================================================================
// Types
// ============================================================================

export interface FeatureAccessCheck {
  allowed: boolean;
  reason?: string;
  limit?: number;
  currentUsage?: number;
  upgradeRequired?: PlanTier;
}

export interface LimitCheck {
  withinLimit: boolean;
  limit: number | null; // null = unlimited
  currentUsage: number;
  remaining: number | null;
  usagePercent: number | null;
  warning: "none" | "approaching" | "critical" | "exceeded";
}

export interface PlanEnforcementResult {
  success: boolean;
  error?: string;
  action?: "block" | "warn" | "allow";
  upgradeRequired?: PlanTier;
}

// ============================================================================
// Plan Enforcement Service
// ============================================================================

export class PlanEnforcementService {
  /**
   * Check if a feature is accessible for a plan
   */
  async checkFeatureAccess(
    plan: PlanTier,
    feature: keyof typeof PLAN_FEATURES.free,
  ): Promise<FeatureAccessCheck> {
    const hasAccess = hasFeature(plan, feature);

    if (!hasAccess) {
      // Find minimum required tier
      const requiredTiers: PlanTier[] = [
        "starter",
        "professional",
        "enterprise",
      ];
      let upgradeRequired: PlanTier = "enterprise";

      for (const tier of requiredTiers) {
        if (hasFeature(tier, feature)) {
          upgradeRequired = tier;
          break;
        }
      }

      return {
        allowed: false,
        reason: `This feature requires the ${upgradeRequired} plan or higher`,
        upgradeRequired,
      };
    }

    return {
      allowed: true,
    };
  }

  /**
   * Check if adding resource is within plan limit
   */
  async checkLimit(
    plan: PlanTier,
    limitKey: keyof typeof PLAN_LIMITS.free,
    currentUsage: number,
    increment: number = 1,
  ): Promise<LimitCheck> {
    const limit = PLAN_LIMITS[plan][limitKey];
    const newUsage = currentUsage + increment;

    // Unlimited
    if (limit === null) {
      return {
        withinLimit: true,
        limit: null,
        currentUsage,
        remaining: null,
        usagePercent: null,
        warning: "none",
      };
    }

    const withinLimit = newUsage <= limit;
    const remaining = Math.max(0, limit - newUsage);
    const usagePercent = Math.min(100, (newUsage / limit) * 100);

    // Determine warning level
    let warning: LimitCheck["warning"] = "none";
    if (usagePercent >= 100) {
      warning = "exceeded";
    } else if (usagePercent >= 90) {
      warning = "critical";
    } else if (usagePercent >= 75) {
      warning = "approaching";
    }

    return {
      withinLimit,
      limit,
      currentUsage: newUsage,
      remaining,
      usagePercent,
      warning,
    };
  }

  /**
   * Enforce member limit
   */
  async enforceMaxMembers(
    plan: PlanTier,
    currentMembers: number,
    adding: number = 1,
  ): Promise<PlanEnforcementResult> {
    const check = await this.checkLimit(
      plan,
      "maxMembers",
      currentMembers,
      adding,
    );

    if (!check.withinLimit) {
      return {
        success: false,
        error: `Your ${plan} plan allows a maximum of ${check.limit} members. You currently have ${currentMembers}.`,
        action: "block",
        upgradeRequired: this.getUpgradeSuggestion(plan),
      };
    }

    if (check.warning === "approaching" || check.warning === "critical") {
      return {
        success: true,
        action: "warn",
      };
    }

    return {
      success: true,
      action: "allow",
    };
  }

  /**
   * Enforce channel limit
   */
  async enforceMaxChannels(
    plan: PlanTier,
    currentChannels: number,
    adding: number = 1,
  ): Promise<PlanEnforcementResult> {
    const check = await this.checkLimit(
      plan,
      "maxChannels",
      currentChannels,
      adding,
    );

    if (!check.withinLimit) {
      return {
        success: false,
        error: `Your ${plan} plan allows a maximum of ${check.limit} channels. You currently have ${currentChannels}.`,
        action: "block",
        upgradeRequired: this.getUpgradeSuggestion(plan),
      };
    }

    if (check.warning === "approaching" || check.warning === "critical") {
      return {
        success: true,
        action: "warn",
      };
    }

    return {
      success: true,
      action: "allow",
    };
  }

  /**
   * Enforce storage limit
   */
  async enforceMaxStorage(
    plan: PlanTier,
    currentStorageBytes: number,
    addingBytes: number,
  ): Promise<PlanEnforcementResult> {
    const check = await this.checkLimit(
      plan,
      "maxStorageBytes",
      currentStorageBytes,
      addingBytes,
    );

    if (!check.withinLimit) {
      const limitGB = check.limit
        ? (check.limit / (1024 * 1024 * 1024)).toFixed(1)
        : "unlimited";
      const currentGB = (currentStorageBytes / (1024 * 1024 * 1024)).toFixed(1);

      return {
        success: false,
        error: `Your ${plan} plan allows ${limitGB} GB of storage. You're currently using ${currentGB} GB.`,
        action: "block",
        upgradeRequired: this.getUpgradeSuggestion(plan),
      };
    }

    if (check.warning === "approaching" || check.warning === "critical") {
      return {
        success: true,
        action: "warn",
      };
    }

    return {
      success: true,
      action: "allow",
    };
  }

  /**
   * Enforce file size limit
   */
  async enforceMaxFileSize(
    plan: PlanTier,
    fileSizeBytes: number,
  ): Promise<PlanEnforcementResult> {
    const limit = PLAN_LIMITS[plan].maxFileSizeBytes;

    if (limit === null || fileSizeBytes <= limit) {
      return {
        success: true,
        action: "allow",
      };
    }

    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    const fileMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);

    return {
      success: false,
      error: `Your ${plan} plan allows files up to ${limitMB} MB. This file is ${fileMB} MB.`,
      action: "block",
      upgradeRequired: this.getUpgradeSuggestion(plan),
    };
  }

  /**
   * Enforce API call limit
   */
  async enforceApiCallLimit(
    plan: PlanTier,
    currentCalls: number,
  ): Promise<PlanEnforcementResult> {
    const check = await this.checkLimit(
      plan,
      "maxApiCallsPerMonth",
      currentCalls,
    );

    if (!check.withinLimit) {
      return {
        success: false,
        error: `You've reached your API call limit for this month (${check.limit} calls).`,
        action: "block",
        upgradeRequired: this.getUpgradeSuggestion(plan),
      };
    }

    if (check.warning === "approaching" || check.warning === "critical") {
      return {
        success: true,
        action: "warn",
      };
    }

    return {
      success: true,
      action: "allow",
    };
  }

  /**
   * Enforce call participant limit
   */
  async enforceCallParticipants(
    plan: PlanTier,
    participants: number,
  ): Promise<PlanEnforcementResult> {
    const limit = PLAN_LIMITS[plan].maxCallParticipants;

    if (limit === null || participants <= limit) {
      return {
        success: true,
        action: "allow",
      };
    }

    return {
      success: false,
      error: `Your ${plan} plan allows up to ${limit} call participants. You're trying to add ${participants}.`,
      action: "block",
      upgradeRequired: this.getUpgradeSuggestion(plan),
    };
  }

  /**
   * Enforce stream duration limit
   */
  async enforceStreamDuration(
    plan: PlanTier,
    durationMinutes: number,
  ): Promise<PlanEnforcementResult> {
    const limit = PLAN_LIMITS[plan].maxStreamDurationMinutes;

    if (limit === null || durationMinutes <= limit) {
      return {
        success: true,
        action: "allow",
      };
    }

    return {
      success: false,
      error: `Your ${plan} plan allows streams up to ${limit} minutes. This stream has been running for ${durationMinutes} minutes.`,
      action: "block",
      upgradeRequired: this.getUpgradeSuggestion(plan),
    };
  }

  /**
   * Get upgrade suggestion for current plan
   */
  private getUpgradeSuggestion(currentPlan: PlanTier): PlanTier {
    const tierOrder: PlanTier[] = [
      "free",
      "starter",
      "professional",
      "enterprise",
    ];
    const currentIndex = tierOrder.indexOf(currentPlan);

    if (currentIndex >= 0 && currentIndex < tierOrder.length - 1) {
      return tierOrder[currentIndex + 1];
    }

    return "enterprise";
  }

  /**
   * Get comprehensive plan status
   */
  async getPlanStatus(
    plan: PlanTier,
    usage: {
      members: number;
      channels: number;
      storageBytes: number;
      apiCalls: number;
    },
  ) {
    const limits = PLAN_LIMITS[plan];

    return {
      plan,
      limits,
      usage,
      checks: {
        members: await this.checkLimit(plan, "maxMembers", usage.members),
        channels: await this.checkLimit(plan, "maxChannels", usage.channels),
        storage: await this.checkLimit(
          plan,
          "maxStorageBytes",
          usage.storageBytes,
        ),
        apiCalls: await this.checkLimit(
          plan,
          "maxApiCallsPerMonth",
          usage.apiCalls,
        ),
      },
    };
  }

  /**
   * Get usage warnings for a plan
   */
  async getUsageWarnings(
    plan: PlanTier,
    usage: {
      members: number;
      channels: number;
      storageBytes: number;
      apiCalls: number;
    },
  ): Promise<
    Array<{
      resource: string;
      level: "warning" | "critical";
      message: string;
      usage: number;
      limit: number;
      percent: number;
    }>
  > {
    const warnings: Array<{
      resource: string;
      level: "warning" | "critical";
      message: string;
      usage: number;
      limit: number;
      percent: number;
    }> = [];

    // Check each resource
    const checks = [
      { key: "maxMembers" as const, resource: "members", value: usage.members },
      {
        key: "maxChannels" as const,
        resource: "channels",
        value: usage.channels,
      },
      {
        key: "maxStorageBytes" as const,
        resource: "storage",
        value: usage.storageBytes,
      },
      {
        key: "maxApiCallsPerMonth" as const,
        resource: "API calls",
        value: usage.apiCalls,
      },
    ];

    for (const check of checks) {
      const limit = PLAN_LIMITS[plan][check.key];
      if (limit === null) continue; // unlimited

      const percent = (check.value / limit) * 100;

      if (percent >= 90) {
        warnings.push({
          resource: check.resource,
          level: "critical",
          message: `You're using ${Math.round(percent)}% of your ${check.resource} limit`,
          usage: check.value,
          limit,
          percent,
        });
      } else if (percent >= 75) {
        warnings.push({
          resource: check.resource,
          level: "warning",
          message: `You're approaching your ${check.resource} limit (${Math.round(percent)}%)`,
          usage: check.value,
          limit,
          percent,
        });
      }
    }

    return warnings;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let planEnforcementService: PlanEnforcementService | null = null;

export function getPlanEnforcementService(): PlanEnforcementService {
  if (!planEnforcementService) {
    planEnforcementService = new PlanEnforcementService();
  }
  return planEnforcementService;
}
