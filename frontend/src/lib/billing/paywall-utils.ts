/**
 * Paywall Utilities
 *
 * Utility functions for paywall enforcement and UI integration.
 * Provides helpers for checking access, formatting messages, and managing upgrades.
 *
 * @module @/lib/billing/paywall-utils
 * @version 1.0.0
 */

import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLANS,
  formatPrice,
  type PlanLimits,
} from "./plan-config";
import {
  PaywallCheckResult,
  PaywallContext,
  PaywallConfig,
  PaywallUpgradeInfo,
  PaywallUsageInfo,
  PaywallDenialCode,
  PaywallPromptConfig,
  PaywallDisplayMode,
  PaywallType,
  PaywallUIConfig,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
  LIMIT_UNITS,
  USAGE_WARNING_THRESHOLDS,
  DEFAULT_UI_CONFIGS,
} from "./paywall-types";

// ============================================================================
// Access Check Utilities
// ============================================================================

/**
 * Check if a feature is available for a plan tier.
 */
export function isFeatureAvailable(
  feature: keyof PlanFeatures,
  planTier: PlanTier,
): boolean {
  return PLAN_FEATURES[planTier][feature] as boolean;
}

/**
 * Check if usage is within limit for a plan tier.
 */
export function isWithinLimit(
  limitKey: keyof PlanLimits,
  planTier: PlanTier,
  currentUsage: number,
): boolean {
  const limit = PLAN_LIMITS[planTier][limitKey];
  if (limit === null) return true; // Unlimited
  return currentUsage < limit;
}

/**
 * Get remaining quota for a limit.
 */
export function getRemainingQuota(
  limitKey: keyof PlanLimits,
  planTier: PlanTier,
  currentUsage: number,
): number | null {
  const limit = PLAN_LIMITS[planTier][limitKey];
  if (limit === null) return null; // Unlimited
  return Math.max(0, limit - currentUsage);
}

/**
 * Get usage percentage for a limit.
 */
export function getUsagePercentage(
  limitKey: keyof PlanLimits,
  planTier: PlanTier,
  currentUsage: number,
): number | null {
  const limit = PLAN_LIMITS[planTier][limitKey];
  if (limit === null) return null; // Unlimited
  return Math.min(100, (currentUsage / limit) * 100);
}

/**
 * Check if user should see upgrade prompt based on usage.
 */
export function shouldShowUpgradePrompt(
  limitKey: keyof PlanLimits,
  planTier: PlanTier,
  currentUsage: number,
  threshold: number = USAGE_WARNING_THRESHOLDS.medium,
): boolean {
  const percentage = getUsagePercentage(limitKey, planTier, currentUsage);
  if (percentage === null) return false;
  return percentage >= threshold;
}

/**
 * Get the minimum plan tier required for a feature.
 */
export function getMinimumTierForFeature(
  feature: keyof PlanFeatures,
): PlanTier {
  const tiers: PlanTier[] = ["free", "starter", "professional", "enterprise"];
  for (const tier of tiers) {
    if (PLAN_FEATURES[tier][feature] as boolean) {
      return tier;
    }
  }
  return "enterprise";
}

/**
 * Get features available in target tier but not in current tier.
 */
export function getNewFeaturesInTier(
  currentTier: PlanTier,
  targetTier: PlanTier,
): Array<{ key: keyof PlanFeatures; name: string }> {
  const result: Array<{ key: keyof PlanFeatures; name: string }> = [];
  const currentFeatures = PLAN_FEATURES[currentTier];
  const targetFeatures = PLAN_FEATURES[targetTier];

  for (const [key, value] of Object.entries(targetFeatures)) {
    const featureKey = key as keyof PlanFeatures;
    if (value === true && currentFeatures[featureKey] === false) {
      const displayName = FEATURE_DISPLAY_NAMES[featureKey] ?? key;
      result.push({ key: featureKey, name: displayName });
    }
  }

  return result;
}

/**
 * Get limit improvements in target tier compared to current tier.
 */
export function getLimitImprovements(
  currentTier: PlanTier,
  targetTier: PlanTier,
): Array<{
  key: keyof PlanLimits;
  name: string;
  currentValue: number | null;
  newValue: number | null;
  unit: string;
  improvement: string;
}> {
  const result: Array<{
    key: keyof PlanLimits;
    name: string;
    currentValue: number | null;
    newValue: number | null;
    unit: string;
    improvement: string;
  }> = [];

  const currentLimits = PLAN_LIMITS[currentTier];
  const targetLimits = PLAN_LIMITS[targetTier];

  for (const [key, newValue] of Object.entries(targetLimits)) {
    const limitKey = key as keyof PlanLimits;
    const currentValue = currentLimits[limitKey];

    if (newValue !== currentValue) {
      let improvement: string;
      if (newValue === null) {
        improvement = "Unlimited";
      } else if (currentValue === null) {
        improvement = formatLimitValue(newValue, limitKey);
      } else {
        const increase = ((newValue - currentValue) / currentValue) * 100;
        improvement = `${Math.round(increase)}% more`;
      }

      result.push({
        key: limitKey,
        name: LIMIT_DISPLAY_NAMES[limitKey],
        currentValue,
        newValue,
        unit: LIMIT_UNITS[limitKey],
        improvement,
      });
    }
  }

  return result;
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a limit value for display.
 */
export function formatLimitValue(
  value: number | null,
  limitKey: keyof PlanLimits,
): string {
  if (value === null) return "Unlimited";

  const unit = LIMIT_UNITS[limitKey];

  // Handle byte-based limits
  if (limitKey === "maxStorageBytes" || limitKey === "maxFileSizeBytes") {
    return formatBytes(value);
  }

  return `${value.toLocaleString()} ${unit}`;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Format usage info for display.
 */
export function formatUsageInfo(usage: PaywallUsageInfo): string {
  if (usage.limit === null) {
    return `${usage.current.toLocaleString()} ${usage.unit} (Unlimited)`;
  }

  return `${usage.current.toLocaleString()} / ${usage.limit.toLocaleString()} ${usage.unit} (${Math.round(usage.percentage ?? 0)}%)`;
}

/**
 * Format denial reason for user display.
 */
export function formatDenialReason(result: PaywallCheckResult): string {
  if (result.reason) return result.reason;

  switch (result.code) {
    case PaywallDenialCode.FEATURE_NOT_AVAILABLE:
      return "This feature is not available on your current plan.";
    case PaywallDenialCode.LIMIT_EXCEEDED:
      return "You have reached your plan limit.";
    case PaywallDenialCode.TIER_INSUFFICIENT:
      return `This feature requires the ${PLAN_TIER_NAMES[result.requiredPlan ?? "professional"]} plan.`;
    case PaywallDenialCode.ROLE_REQUIRED:
      return "You do not have the required role to access this feature.";
    case PaywallDenialCode.SUBSCRIPTION_EXPIRED:
      return "Your subscription has expired. Please renew to continue.";
    case PaywallDenialCode.TRIAL_EXPIRED:
      return "Your trial has expired. Upgrade to continue using this feature.";
    default:
      return "Access denied. Upgrade your plan to unlock this feature.";
  }
}

/**
 * Format upgrade message.
 */
export function formatUpgradeMessage(
  result: PaywallCheckResult,
  customMessage?: string,
): string {
  if (customMessage) return customMessage;

  if (!result.upgrade) {
    return "Upgrade your plan to unlock this feature.";
  }

  const { planName, monthlyPrice } = result.upgrade;
  const formattedPrice = formatPrice(monthlyPrice);

  return `Upgrade to ${planName} for ${formattedPrice}/month to unlock this feature.`;
}

// ============================================================================
// Prompt Configuration Builders
// ============================================================================

/**
 * Build upgrade prompt configuration.
 */
export function buildUpgradePrompt(
  result: PaywallCheckResult,
  options: {
    mode?: PaywallDisplayMode;
    showComparison?: boolean;
    showPricing?: boolean;
  } = {},
): PaywallPromptConfig {
  const { mode = "modal", showComparison = true, showPricing = true } = options;

  const upgrade = result.upgrade;
  const planName = upgrade?.planName ?? "a higher plan";

  let title: string;
  let description: string;

  switch (result.code) {
    case PaywallDenialCode.FEATURE_NOT_AVAILABLE:
      title = "Unlock This Feature";
      description = `This feature is available on the ${planName} plan and above.`;
      break;
    case PaywallDenialCode.LIMIT_EXCEEDED:
      title = "Limit Reached";
      description = `You've reached your current plan's limit. Upgrade to ${planName} for more capacity.`;
      break;
    case PaywallDenialCode.TIER_INSUFFICIENT:
      title = "Plan Upgrade Required";
      description = `This feature requires the ${planName} plan.`;
      break;
    default:
      title = "Upgrade Required";
      description = formatDenialReason(result);
  }

  return {
    mode,
    title,
    description,
    primaryCta: {
      text: upgrade?.trialAvailable ? "Start Free Trial" : "Upgrade Now",
      action: upgrade?.trialAvailable ? "trial" : "upgrade",
      url: upgrade?.upgradeUrl ?? "/billing/upgrade",
    },
    secondaryCta: {
      text: "Learn More",
      action: "learn_more",
      url: "/pricing",
    },
    showComparison,
    showPricing,
  };
}

/**
 * Build usage warning prompt.
 */
export function buildUsageWarningPrompt(
  usage: PaywallUsageInfo,
  limitKey: keyof PlanLimits,
  currentTier: PlanTier,
): PaywallPromptConfig {
  const percentage = usage.percentage ?? 0;
  const remaining = usage.remaining ?? 0;

  let title: string;
  let description: string;

  if (percentage >= USAGE_WARNING_THRESHOLDS.critical) {
    title = `${LIMIT_DISPLAY_NAMES[limitKey]} Almost Full`;
    description = `Only ${remaining.toLocaleString()} ${usage.unit} remaining. Upgrade now to avoid interruption.`;
  } else if (percentage >= USAGE_WARNING_THRESHOLDS.high) {
    title = `Running Low on ${LIMIT_DISPLAY_NAMES[limitKey]}`;
    description = `You're using ${Math.round(percentage)}% of your ${LIMIT_DISPLAY_NAMES[limitKey].toLowerCase()} quota.`;
  } else {
    title = `${LIMIT_DISPLAY_NAMES[limitKey]} Usage Update`;
    description = `You're using ${Math.round(percentage)}% of your quota.`;
  }

  return {
    mode: "inline",
    title,
    description,
    primaryCta: {
      text: "Increase Limit",
      action: "upgrade",
      url: "/billing/upgrade",
    },
    secondaryCta: {
      text: "Dismiss",
      action: "dismiss",
    },
    showComparison: false,
    showPricing: true,
  };
}

// ============================================================================
// UI Configuration Utilities
// ============================================================================

/**
 * Get UI configuration for a paywall type.
 */
export function getPaywallUIConfig(type: PaywallType): PaywallUIConfig {
  return DEFAULT_UI_CONFIGS[type] ?? DEFAULT_UI_CONFIGS.feature;
}

/**
 * Merge paywall UI configs.
 */
export function mergeUIConfigs(
  base: PaywallUIConfig,
  override?: Partial<PaywallUIConfig>,
): PaywallUIConfig {
  if (!override) return base;
  return { ...base, ...override };
}

/**
 * Get badge text for paywall type.
 */
export function getPaywallBadgeText(
  type: PaywallType,
  requiredPlan?: PlanTier,
): string {
  switch (type) {
    case "feature":
    case "tier":
      return requiredPlan ? PLAN_TIER_NAMES[requiredPlan] : "Premium";
    case "limit":
      return "Limit";
    case "channel":
      return "Locked";
    case "role":
      return "Restricted";
    default:
      return "Upgrade";
  }
}

/**
 * Get icon name for paywall type.
 */
export function getPaywallIcon(type: PaywallType): string {
  switch (type) {
    case "feature":
      return "sparkles";
    case "limit":
      return "gauge";
    case "tier":
      return "crown";
    case "role":
      return "shield";
    case "channel":
      return "lock";
    case "time":
      return "clock";
    case "custom":
      return "settings";
    default:
      return "lock";
  }
}

// ============================================================================
// Context Utilities
// ============================================================================

/**
 * Create paywall context from user data.
 */
export function createPaywallContext(
  userId: string,
  planTier: PlanTier,
  options: Partial<PaywallContext> = {},
): PaywallContext {
  return {
    userId,
    planTier,
    ...options,
  };
}

/**
 * Validate paywall context.
 */
export function validatePaywallContext(
  context: Partial<PaywallContext>,
): boolean {
  return !!(context.userId && context.planTier);
}

// ============================================================================
// Upgrade Path Utilities
// ============================================================================

/**
 * Get recommended upgrade path for a user.
 */
export function getRecommendedUpgrade(
  currentTier: PlanTier,
  usage: {
    members?: number;
    channels?: number;
    storageBytes?: number;
    apiCalls?: number;
  } = {},
): {
  recommendedTier: PlanTier | null;
  reasons: string[];
  savings?: string;
} {
  const tierOrder: PlanTier[] = [
    "free",
    "starter",
    "professional",
    "enterprise",
  ];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex >= tierOrder.length - 1) {
    return {
      recommendedTier: null,
      reasons: [],
    };
  }

  const nextTier = tierOrder[currentIndex + 1];
  const reasons: string[] = [];

  // Check each usage type
  if (usage.members !== undefined) {
    const currentLimit = PLAN_LIMITS[currentTier].maxMembers;
    if (currentLimit !== null && usage.members >= currentLimit * 0.8) {
      reasons.push(
        `You're at ${Math.round((usage.members / currentLimit) * 100)}% of your member limit`,
      );
    }
  }

  if (usage.channels !== undefined) {
    const currentLimit = PLAN_LIMITS[currentTier].maxChannels;
    if (currentLimit !== null && usage.channels >= currentLimit * 0.8) {
      reasons.push(
        `You're at ${Math.round((usage.channels / currentLimit) * 100)}% of your channel limit`,
      );
    }
  }

  if (usage.storageBytes !== undefined) {
    const currentLimit = PLAN_LIMITS[currentTier].maxStorageBytes;
    if (currentLimit !== null && usage.storageBytes >= currentLimit * 0.8) {
      reasons.push(
        `You're at ${Math.round((usage.storageBytes / currentLimit) * 100)}% of your storage limit`,
      );
    }
  }

  // Calculate yearly savings if applicable
  const currentPricing = PLANS[currentTier].pricing;
  const nextPricing = PLANS[nextTier].pricing;
  let savings: string | undefined;

  if (nextPricing.yearly) {
    const yearlyFromMonthly = nextPricing.monthly * 12;
    const yearlySavings = yearlyFromMonthly - nextPricing.yearly;
    if (yearlySavings > 0) {
      savings = `Save ${formatPrice(yearlySavings)} per year with annual billing`;
    }
  }

  return {
    recommendedTier: reasons.length > 0 ? nextTier : null,
    reasons,
    savings,
  };
}

/**
 * Get all upgrade options with comparison.
 */
export function getUpgradeOptions(currentTier: PlanTier): Array<{
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  newFeatures: string[];
  limitImprovements: string[];
  isRecommended: boolean;
}> {
  const tierOrder: PlanTier[] = [
    "free",
    "starter",
    "professional",
    "enterprise",
  ];
  const currentIndex = tierOrder.indexOf(currentTier);
  const results: Array<{
    tier: PlanTier;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number | null;
    newFeatures: string[];
    limitImprovements: string[];
    isRecommended: boolean;
  }> = [];

  for (let i = currentIndex + 1; i < tierOrder.length; i++) {
    const tier = tierOrder[i];
    const plan = PLANS[tier];
    const newFeatures = getNewFeaturesInTier(currentTier, tier).map(
      (f) => f.name,
    );
    const limitImprovements = getLimitImprovements(currentTier, tier).map(
      (l) => `${l.name}: ${l.improvement}`,
    );

    results.push({
      tier,
      name: plan.name,
      monthlyPrice: plan.pricing.monthly,
      yearlyPrice: plan.pricing.yearly,
      newFeatures,
      limitImprovements,
      isRecommended: plan.isRecommended,
    });
  }

  return results;
}

// ============================================================================
// Analytics Utilities
// ============================================================================

/**
 * Track paywall impression.
 */
export function trackPaywallImpression(
  paywallId: string,
  result: PaywallCheckResult,
  context: PaywallContext,
): void {
  // This would typically send to analytics service
  if (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).analytics
  ) {
    const analytics = (
      window as unknown as Record<
        string,
        { track: (event: string, data: Record<string, unknown>) => void }
      >
    ).analytics;
    analytics.track("Paywall Impression", {
      paywallId,
      allowed: result.allowed,
      denialCode: result.code,
      currentPlan: context.planTier,
      requiredPlan: result.requiredPlan,
      userId: context.userId,
    });
  }
}

/**
 * Track upgrade click.
 */
export function trackUpgradeClick(
  paywallId: string,
  targetPlan: PlanTier,
  source: string,
): void {
  if (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).analytics
  ) {
    const analytics = (
      window as unknown as Record<
        string,
        { track: (event: string, data: Record<string, unknown>) => void }
      >
    ).analytics;
    analytics.track("Upgrade Click", {
      paywallId,
      targetPlan,
      source,
    });
  }
}

// ============================================================================
// Cache Utilities
// ============================================================================

const paywallCache = new Map<
  string,
  { result: PaywallCheckResult; expires: number }
>();

/**
 * Get cached paywall result.
 */
export function getCachedPaywallResult(
  cacheKey: string,
): PaywallCheckResult | null {
  const cached = paywallCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expires) {
    paywallCache.delete(cacheKey);
    return null;
  }
  return cached.result;
}

/**
 * Set cached paywall result.
 */
export function setCachedPaywallResult(
  cacheKey: string,
  result: PaywallCheckResult,
  ttlMs: number = 60000,
): void {
  paywallCache.set(cacheKey, {
    result,
    expires: Date.now() + ttlMs,
  });
}

/**
 * Create cache key for paywall check.
 */
export function createPaywallCacheKey(
  paywallId: string,
  context: PaywallContext,
): string {
  return `paywall:${paywallId}:${context.userId}:${context.planTier}:${context.workspaceId ?? ""}:${context.channelId ?? ""}`;
}

/**
 * Clear all cached paywall results.
 */
export function clearPaywallCache(): void {
  paywallCache.clear();
}

/**
 * Clear cached results for a specific user.
 */
export function clearUserPaywallCache(userId: string): void {
  for (const [key] of paywallCache) {
    if (key.includes(`:${userId}:`)) {
      paywallCache.delete(key);
    }
  }
}

// ============================================================================
// Bypass Detection Utilities
// ============================================================================

/**
 * Detect potential bypass attempts.
 */
export function detectBypassAttempt(
  request: {
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  },
  context: PaywallContext,
): {
  detected: boolean;
  type?: "header_manipulation" | "body_injection" | "query_injection";
  details?: string;
} {
  // Check for plan tier header manipulation
  if (request.headers) {
    const headerPlan = request.headers["x-plan-tier"];
    if (headerPlan && headerPlan !== context.planTier) {
      return {
        detected: true,
        type: "header_manipulation",
        details: `Mismatched plan tier: header=${headerPlan}, context=${context.planTier}`,
      };
    }
  }

  // Check for suspicious query parameters
  if (request.query) {
    const suspiciousParams = ["admin", "bypass", "override", "plan", "tier"];
    for (const param of suspiciousParams) {
      if (request.query[param]) {
        return {
          detected: true,
          type: "query_injection",
          details: `Suspicious query parameter: ${param}=${request.query[param]}`,
        };
      }
    }
  }

  // Check for body injection (plan/tier fields that shouldn't be user-controlled)
  if (request.body && typeof request.body === "object") {
    const body = request.body as Record<string, unknown>;
    const suspiciousFields = ["planTier", "plan", "tier", "isAdmin", "bypass"];
    for (const field of suspiciousFields) {
      if (field in body) {
        return {
          detected: true,
          type: "body_injection",
          details: `Suspicious body field: ${field}`,
        };
      }
    }
  }

  return { detected: false };
}

/**
 * Validate paywall context integrity.
 */
export function validateContextIntegrity(
  context: PaywallContext,
  trustedSource: {
    userId: string;
    planTier: PlanTier;
    workspaceId?: string;
  },
): boolean {
  // Verify user ID matches
  if (context.userId !== trustedSource.userId) {
    return false;
  }

  // Verify plan tier matches
  if (context.planTier !== trustedSource.planTier) {
    return false;
  }

  // Verify workspace if provided
  if (
    trustedSource.workspaceId &&
    context.workspaceId !== trustedSource.workspaceId
  ) {
    return false;
  }

  return true;
}
