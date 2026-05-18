/**
 * Plan Restriction Middleware
 * Enforce plan limits on API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import type { PlanTier, PlanFeatures } from "@/types/billing";
import { UsageTracker } from "@/lib/usage-tracker";
import { PLANS } from "@/config/billing-plans";

export interface PlanContext {
  userId: string;
  planTier: PlanTier;
}

/**
 * Require a specific feature to be enabled in the plan
 */
export function requireFeature(feature: keyof PlanFeatures) {
  return (context: PlanContext): NextResponse | null => {
    const isAllowed = UsageTracker.isFeatureAllowed(context.planTier, feature);

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: "Feature not available in your plan",
          feature,
          currentPlan: context.planTier,
          upgradeUrl: "/billing/upgrade",
        },
        { status: 403 },
      );
    }

    return null; // Feature is allowed, continue
  };
}

/**
 * Require a minimum plan tier
 */
export function requireMinimumPlan(minimumTier: PlanTier) {
  const tierOrder: PlanTier[] = [
    "free",
    "starter",
    "pro",
    "business",
    "enterprise",
  ];
  const minIndex = tierOrder.indexOf(minimumTier);

  return (context: PlanContext): NextResponse | null => {
    const currentIndex = tierOrder.indexOf(context.planTier);

    if (currentIndex < minIndex) {
      return NextResponse.json(
        {
          error: "This feature requires a higher plan",
          currentPlan: context.planTier,
          requiredPlan: minimumTier,
          upgradeUrl: "/billing/upgrade",
        },
        { status: 403 },
      );
    }

    return null;
  };
}

/**
 * Check usage limit for a specific metric
 */
export function checkUsageLimit(
  metric: keyof PlanFeatures,
  currentValue: number,
) {
  return (context: PlanContext): NextResponse | null => {
    const { allowed, limit, percentage } = UsageTracker.checkLimit(
      context.planTier,
      metric,
      currentValue,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Usage limit exceeded",
          metric,
          current: currentValue,
          limit,
          percentage,
          currentPlan: context.planTier,
          upgradeUrl: "/billing/upgrade",
        },
        { status: 429 }, // Too Many Requests
      );
    }

    // Warn if approaching limit (90%)
    if (limit !== null && percentage >= 90) {
      // Add warning header
      const response = NextResponse.next();
      response.headers.set("X-Usage-Warning", "true");
      response.headers.set("X-Usage-Percentage", percentage.toString());
      response.headers.set("X-Usage-Limit", limit.toString());
    }

    return null;
  };
}

/**
 * Composite middleware to check multiple restrictions
 */
export function withPlanRestrictions(
  ...checks: Array<(context: PlanContext) => NextResponse | null>
) {
  return (context: PlanContext): NextResponse | null => {
    for (const check of checks) {
      const result = check(context);
      if (result) return result; // Stop at first failure
    }
    return null; // All checks passed
  };
}

/**
 * Get plan context from request
 * Extracts user ID and plan tier from request headers set by auth middleware
 */
export async function getPlanContext(
  request: NextRequest,
): Promise<PlanContext> {
  // Auth middleware sets these headers after validating the session
  const userId = request.headers.get("x-user-id") || "anonymous";
  const planTier = (request.headers.get("x-plan-tier") as PlanTier) || "free";

  return {
    userId,
    planTier,
  };
}

/**
 * Example: Apply plan restrictions to an API endpoint
 */
export async function applyPlanRestrictions(
  request: NextRequest,
  ...checks: Array<(context: PlanContext) => NextResponse | null>
): Promise<NextResponse | null> {
  const context = await getPlanContext(request);
  return withPlanRestrictions(...checks)(context);
}

/**
 * Helper to enforce file upload size limit
 */
export function checkFileUploadSize(fileSize: number) {
  return (context: PlanContext): NextResponse | null => {
    const plan = PLANS[context.planTier];
    const maxSizeMB = plan.features.maxFileUploadMB;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (fileSize > maxSizeBytes) {
      return NextResponse.json(
        {
          error: "File size exceeds plan limit",
          fileSize,
          maxSize: maxSizeBytes,
          maxSizeMB,
          currentPlan: context.planTier,
          upgradeUrl: "/billing/upgrade",
        },
        { status: 413 }, // Payload Too Large
      );
    }

    return null;
  };
}

/**
 * Rate limiting based on plan tier
 */
export function getPlanRateLimit(planTier: PlanTier): {
  requests: number;
  window: number;
} {
  const limits: Record<PlanTier, { requests: number; window: number }> = {
    free: { requests: 100, window: 60 }, // 100 requests per minute
    starter: { requests: 500, window: 60 },
    pro: { requests: 2000, window: 60 },
    business: { requests: 10000, window: 60 },
    enterprise: { requests: 50000, window: 60 },
  };

  return limits[planTier];
}

/**
 * Check API rate limit based on plan
 */
export function checkPlanRateLimit(requestCount: number) {
  return (context: PlanContext): NextResponse | null => {
    const { requests, window } = getPlanRateLimit(context.planTier);

    if (requestCount >= requests) {
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded for your plan",
          limit: requests,
          window,
          currentPlan: context.planTier,
          upgradeUrl: "/billing/upgrade",
        },
        { status: 429 },
      );

      response.headers.set("X-RateLimit-Limit", requests.toString());
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("Retry-After", window.toString());

      return response;
    }

    return null;
  };
}

/**
 * Plan-based feature gates (for client-side)
 */
export class PlanGate {
  static canUseFeature(
    planTier: PlanTier,
    feature: keyof PlanFeatures,
  ): boolean {
    return UsageTracker.isFeatureAllowed(planTier, feature);
  }

  static getFeatureDescription(feature: keyof PlanFeatures): string {
    const descriptions: Partial<Record<keyof PlanFeatures, string>> = {
      customBranding: "Custom branding and logos",
      advancedAnalytics: "Advanced analytics and reporting",
      prioritySupport: "24/7 priority support",
      ssoIntegration: "Single Sign-On (SSO) integration",
      auditLogs: "Detailed audit logs",
      apiAccess: "API access for integrations",
      webhooks: "Webhooks for automation",
      customDomain: "Custom domain support",
      whiteLabel: "White-label branding",
      aiSummarization: "AI-powered message summarization",
      videoConferencing: "Video conferencing",
      screenSharing: "Screen sharing in calls",
      tokenGating: "NFT and token-based access control",
      cryptoPayments: "Cryptocurrency payment support",
    };

    return descriptions[feature] || feature.toString();
  }

  static getUpgradePath(
    currentPlan: PlanTier,
    feature: keyof PlanFeatures,
  ): PlanTier | null {
    const tiers: PlanTier[] = [
      "free",
      "starter",
      "pro",
      "business",
      "enterprise",
    ];
    const currentIndex = tiers.indexOf(currentPlan);

    // Find first plan that has the feature
    for (let i = currentIndex + 1; i < tiers.length; i++) {
      const tier = tiers[i];
      if (UsageTracker.isFeatureAllowed(tier, feature)) {
        return tier;
      }
    }

    return null;
  }
}
