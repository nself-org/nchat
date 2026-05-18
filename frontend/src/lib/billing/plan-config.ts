/**
 * Subscription Plan Configuration
 *
 * Defines all subscription plans, pricing, and feature limits for nChat.
 * Used for plan selection, upgrade/downgrade logic, and feature enforcement.
 */

import type {
  PlanTier,
  PlanFeatures,
  Currency,
} from "@/types/subscription.types";

// ============================================================================
// Plan Configuration Types
// ============================================================================

export interface PlanLimits {
  maxMembers: number | null; // null = unlimited
  maxChannels: number | null;
  maxStorageBytes: number | null;
  maxFileSizeBytes: number | null;
  maxApiCallsPerMonth: number | null;
  maxCallParticipants: number | null;
  maxStreamDurationMinutes: number | null;
}

export interface PlanPricing {
  monthly: number; // cents
  yearly: number | null; // cents, null = not available
  currency: Currency;
}

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  description: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: PlanFeatures;
  highlightedFeatures: string[];
  isRecommended: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

// ============================================================================
// Plan Limits Constants
// ============================================================================

export const UNLIMITED = null;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxMembers: 10,
    maxChannels: 5,
    maxStorageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxApiCallsPerMonth: 1000,
    maxCallParticipants: 4,
    maxStreamDurationMinutes: 60,
  },
  starter: {
    maxMembers: 25,
    maxChannels: 20,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
    maxApiCallsPerMonth: 10000,
    maxCallParticipants: 10,
    maxStreamDurationMinutes: 120,
  },
  professional: {
    maxMembers: 100,
    maxChannels: 50,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    maxFileSizeBytes: 100 * 1024 * 1024, // 100 MB
    maxApiCallsPerMonth: 50000,
    maxCallParticipants: 25,
    maxStreamDurationMinutes: 240,
  },
  enterprise: {
    maxMembers: UNLIMITED,
    maxChannels: UNLIMITED,
    maxStorageBytes: UNLIMITED,
    maxFileSizeBytes: 500 * 1024 * 1024, // 500 MB
    maxApiCallsPerMonth: UNLIMITED,
    maxCallParticipants: 100,
    maxStreamDurationMinutes: UNLIMITED,
  },
  custom: {
    maxMembers: UNLIMITED,
    maxChannels: UNLIMITED,
    maxStorageBytes: UNLIMITED,
    maxFileSizeBytes: 1024 * 1024 * 1024, // 1 GB
    maxApiCallsPerMonth: UNLIMITED,
    maxCallParticipants: 500,
    maxStreamDurationMinutes: UNLIMITED,
  },
};

// ============================================================================
// Plan Features Configuration
// ============================================================================

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    groupDMs: true,
    threads: true,
    fileUploads: true,
    voiceMessages: false,
    videoCalls: false,
    screenSharing: false,
    customEmoji: false,
    webhooks: false,
    integrations: false,
    apiAccess: false,
    sso: false,
    auditLogs: false,
    adminDashboard: false,
    prioritySupport: false,
    customBranding: false,
    dataExport: false,
    messageRetentionDays: 90,
    searchHistoryDays: 90,
  },
  starter: {
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    groupDMs: true,
    threads: true,
    fileUploads: true,
    voiceMessages: true,
    videoCalls: true,
    screenSharing: false,
    customEmoji: true,
    webhooks: true,
    integrations: true,
    apiAccess: false,
    sso: false,
    auditLogs: false,
    adminDashboard: true,
    prioritySupport: false,
    customBranding: false,
    dataExport: true,
    messageRetentionDays: -1, // unlimited
    searchHistoryDays: 365,
  },
  professional: {
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    groupDMs: true,
    threads: true,
    fileUploads: true,
    voiceMessages: true,
    videoCalls: true,
    screenSharing: true,
    customEmoji: true,
    webhooks: true,
    integrations: true,
    apiAccess: true,
    sso: false,
    auditLogs: true,
    adminDashboard: true,
    prioritySupport: false,
    customBranding: false,
    dataExport: true,
    messageRetentionDays: -1, // unlimited
    searchHistoryDays: -1, // unlimited
  },
  enterprise: {
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    groupDMs: true,
    threads: true,
    fileUploads: true,
    voiceMessages: true,
    videoCalls: true,
    screenSharing: true,
    customEmoji: true,
    webhooks: true,
    integrations: true,
    apiAccess: true,
    sso: true,
    auditLogs: true,
    adminDashboard: true,
    prioritySupport: true,
    customBranding: true,
    dataExport: true,
    messageRetentionDays: -1, // unlimited
    searchHistoryDays: -1, // unlimited
  },
  custom: {
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    groupDMs: true,
    threads: true,
    fileUploads: true,
    voiceMessages: true,
    videoCalls: true,
    screenSharing: true,
    customEmoji: true,
    webhooks: true,
    integrations: true,
    apiAccess: true,
    sso: true,
    auditLogs: true,
    adminDashboard: true,
    prioritySupport: true,
    customBranding: true,
    dataExport: true,
    messageRetentionDays: -1,
    searchHistoryDays: -1,
  },
};

// ============================================================================
// Plan Pricing Configuration
// ============================================================================

export const PLAN_PRICING: Record<PlanTier, PlanPricing> = {
  free: {
    monthly: 0,
    yearly: 0,
    currency: "USD",
  },
  starter: {
    monthly: 500, // $5/month
    yearly: 5000, // $50/year (16% discount)
    currency: "USD",
  },
  professional: {
    monthly: 1500, // $15/month
    yearly: 15000, // $150/year (16% discount)
    currency: "USD",
  },
  enterprise: {
    monthly: 9900, // $99/month
    yearly: 99000, // $990/year (16% discount)
    currency: "USD",
  },
  custom: {
    monthly: 0, // Custom pricing
    yearly: null,
    currency: "USD",
  },
};

// ============================================================================
// Stripe Price IDs (populate these from your Stripe dashboard)
// ============================================================================

export const STRIPE_PRICE_IDS: Record<
  PlanTier,
  { monthly?: string; yearly?: string }
> = {
  free: {
    monthly: undefined,
    yearly: undefined,
  },
  starter: {
    monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY,
  },
  custom: {
    monthly: undefined,
    yearly: undefined,
  },
};

// ============================================================================
// Complete Plan Configuration
// ============================================================================

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    description: "For small teams getting started",
    pricing: PLAN_PRICING.free,
    limits: PLAN_LIMITS.free,
    features: PLAN_FEATURES.free,
    highlightedFeatures: [
      "10 team members",
      "5 channels",
      "1 GB storage",
      "Basic messaging",
      "90-day history",
    ],
    isRecommended: false,
    stripePriceIdMonthly: STRIPE_PRICE_IDS.free.monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.free.yearly,
  },
  starter: {
    tier: "starter",
    name: "Starter",
    description: "For small teams that need video calls",
    pricing: PLAN_PRICING.starter,
    limits: PLAN_LIMITS.starter,
    features: PLAN_FEATURES.starter,
    highlightedFeatures: [
      "25 team members",
      "20 channels",
      "10 GB storage",
      "Video calls & voice messages",
      "Unlimited history",
      "Basic integrations",
    ],
    isRecommended: false,
    stripePriceIdMonthly: STRIPE_PRICE_IDS.starter.monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.starter.yearly,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    description: "For growing teams that need more",
    pricing: PLAN_PRICING.professional,
    limits: PLAN_LIMITS.professional,
    features: PLAN_FEATURES.professional,
    highlightedFeatures: [
      "100 team members",
      "50 channels",
      "100 GB storage",
      "Screen sharing",
      "API access",
      "Audit logs",
      "Advanced integrations",
    ],
    isRecommended: true,
    stripePriceIdMonthly: STRIPE_PRICE_IDS.professional.monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.professional.yearly,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    pricing: PLAN_PRICING.enterprise,
    limits: PLAN_LIMITS.enterprise,
    features: PLAN_FEATURES.enterprise,
    highlightedFeatures: [
      "Unlimited members",
      "Unlimited channels",
      "Unlimited storage",
      "SSO & SAML",
      "Priority support",
      "Custom branding",
      "Advanced security",
    ],
    isRecommended: false,
    stripePriceIdMonthly: STRIPE_PRICE_IDS.enterprise.monthly,
    stripePriceIdYearly: STRIPE_PRICE_IDS.enterprise.yearly,
  },
  custom: {
    tier: "custom",
    name: "Custom",
    description: "Tailored solution for your needs",
    pricing: PLAN_PRICING.custom,
    limits: PLAN_LIMITS.custom,
    features: PLAN_FEATURES.custom,
    highlightedFeatures: [
      "Everything in Enterprise",
      "Custom contracts",
      "Dedicated support",
      "On-premise deployment",
      "Custom integrations",
    ],
    isRecommended: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get plan configuration by tier
 */
export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLANS[tier];
}

/**
 * Get all available plans (excluding custom)
 */
export function getAvailablePlans(): PlanConfig[] {
  return Object.values(PLANS).filter((plan) => plan.tier !== "custom");
}

/**
 * Check if a feature is available in a plan
 */
export function hasFeature(
  tier: PlanTier,
  feature: keyof PlanFeatures,
): boolean {
  return PLAN_FEATURES[tier][feature] as boolean;
}

/**
 * Check if usage is within plan limit
 */
export function isWithinLimit(
  tier: PlanTier,
  limitKey: keyof PlanLimits,
  currentUsage: number,
): boolean {
  const limit = PLAN_LIMITS[tier][limitKey];
  if (limit === null) return true; // unlimited
  return currentUsage < limit;
}

/**
 * Get remaining quota for a limit
 */
export function getRemainingQuota(
  tier: PlanTier,
  limitKey: keyof PlanLimits,
  currentUsage: number,
): number | null {
  const limit = PLAN_LIMITS[tier][limitKey];
  if (limit === null) return null; // unlimited
  return Math.max(0, limit - currentUsage);
}

/**
 * Get usage percentage for a limit
 */
export function getUsagePercentage(
  tier: PlanTier,
  limitKey: keyof PlanLimits,
  currentUsage: number,
): number | null {
  const limit = PLAN_LIMITS[tier][limitKey];
  if (limit === null) return null; // unlimited
  return Math.min(100, (currentUsage / limit) * 100);
}

/**
 * Compare two plans (returns 1 if a > b, -1 if a < b, 0 if equal)
 */
export function comparePlans(a: PlanTier, b: PlanTier): number {
  const order: PlanTier[] = [
    "free",
    "starter",
    "professional",
    "enterprise",
    "custom",
  ];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Check if upgrade is needed for a feature
 */
export function needsUpgradeForFeature(
  currentTier: PlanTier,
  feature: keyof PlanFeatures,
): PlanTier | null {
  if (hasFeature(currentTier, feature)) return null;

  // Find minimum tier that has this feature
  for (const tier of ["starter", "professional", "enterprise"] as PlanTier[]) {
    if (hasFeature(tier, feature)) {
      return tier;
    }
  }

  return "enterprise";
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(tier: PlanTier): number | null {
  const pricing = PLAN_PRICING[tier];
  if (!pricing.yearly) return null;

  const yearlyFromMonthly = pricing.monthly * 12;
  const savings =
    ((yearlyFromMonthly - pricing.yearly) / yearlyFromMonthly) * 100;

  return Math.round(savings);
}

/**
 * Format price for display
 */
export function formatPrice(
  cents: number,
  currency: Currency = "USD",
  showCurrency: boolean = true,
): string {
  const amount = cents / 100;
  const formatter = new Intl.NumberFormat("en-US", {
    style: showCurrency ? "currency" : "decimal",
    currency: showCurrency ? currency : undefined,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Get upgrade suggestion based on current usage
 */
export function getUpgradeSuggestion(
  currentTier: PlanTier,
  usage: {
    members?: number;
    channels?: number;
    storageBytes?: number;
  },
): {
  shouldUpgrade: boolean;
  suggestedTier: PlanTier | null;
  reasons: string[];
} {
  const currentLimits = PLAN_LIMITS[currentTier];
  const reasons: string[] = [];

  // Check each limit
  if (usage.members && currentLimits.maxMembers !== null) {
    const percentage = (usage.members / currentLimits.maxMembers) * 100;
    if (percentage >= 80) {
      reasons.push(
        `You're using ${Math.round(percentage)}% of your member limit (${usage.members}/${currentLimits.maxMembers})`,
      );
    }
  }

  if (usage.channels && currentLimits.maxChannels !== null) {
    const percentage = (usage.channels / currentLimits.maxChannels) * 100;
    if (percentage >= 80) {
      reasons.push(
        `You're using ${Math.round(percentage)}% of your channel limit (${usage.channels}/${currentLimits.maxChannels})`,
      );
    }
  }

  if (usage.storageBytes && currentLimits.maxStorageBytes !== null) {
    const percentage =
      (usage.storageBytes / currentLimits.maxStorageBytes) * 100;
    if (percentage >= 80) {
      const usageGB = (usage.storageBytes / (1024 * 1024 * 1024)).toFixed(1);
      const limitGB = (
        currentLimits.maxStorageBytes /
        (1024 * 1024 * 1024)
      ).toFixed(1);
      reasons.push(
        `You're using ${Math.round(percentage)}% of your storage (${usageGB} GB / ${limitGB} GB)`,
      );
    }
  }

  if (reasons.length === 0) {
    return {
      shouldUpgrade: false,
      suggestedTier: null,
      reasons: [],
    };
  }

  // Suggest next tier
  const tierOrder: PlanTier[] = [
    "free",
    "starter",
    "professional",
    "enterprise",
  ];
  const currentIndex = tierOrder.indexOf(currentTier);
  const suggestedTier =
    currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

  return {
    shouldUpgrade: true,
    suggestedTier,
    reasons,
  };
}
