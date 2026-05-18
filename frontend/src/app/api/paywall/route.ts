/**
 * Paywall API Routes
 *
 * Endpoints for checking paywall restrictions and getting upgrade information.
 *
 * @module @/app/api/paywall
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLANS,
  type PlanLimits,
} from "@/lib/billing/plan-config";
import {
  PaywallContext,
  PaywallCheckResult,
  PaywallConfig,
  PaywallUpgradeInfo,
  PaywallDenialCode,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
  LIMIT_UNITS,
} from "@/lib/billing/paywall-types";
import {
  isFeatureAvailable,
  isWithinLimit,
  getUsagePercentage,
  getRemainingQuota,
  getMinimumTierForFeature,
  getNewFeaturesInTier,
  getLimitImprovements,
  getUpgradeOptions,
} from "@/lib/billing/paywall-utils";
import {
  checkPaywall,
  extractPaywallContext,
  matchRouteToPaywall,
  PAYWALL_ROUTES,
} from "@/middleware/paywall";

// ============================================================================
// GET /api/paywall - Get user's paywall status and available features
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const context = await extractPaywallContext(request);

    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User context required" },
        { status: 401 },
      );
    }

    const planTier = context.planTier;
    const features = PLAN_FEATURES[planTier];
    const limits = PLAN_LIMITS[planTier];
    const plan = PLANS[planTier];

    // Build available features list
    const availableFeatures: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === "boolean") {
        availableFeatures[key] = value;
      }
    }

    // Build limits info
    const limitsInfo: Record<string, { value: number | null; unit: string }> =
      {};
    for (const [key, value] of Object.entries(limits)) {
      const limitKey = key as keyof PlanLimits;
      limitsInfo[key] = {
        value,
        unit: LIMIT_UNITS[limitKey],
      };
    }

    // Get upgrade options
    const upgradeOptions = getUpgradeOptions(planTier);

    return NextResponse.json({
      currentPlan: {
        tier: planTier,
        name: plan.name,
        features: availableFeatures,
        limits: limitsInfo,
      },
      upgradeOptions: upgradeOptions.map((option) => ({
        tier: option.tier,
        name: option.name,
        monthlyPrice: option.monthlyPrice,
        yearlyPrice: option.yearlyPrice,
        newFeatures: option.newFeatures,
        limitImprovements: option.limitImprovements,
        isRecommended: option.isRecommended,
      })),
    });
  } catch (error) {
    console.error("Paywall GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/paywall - Check access for specific features/actions
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const context = await extractPaywallContext(request);

    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User context required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { feature, limit, currentUsage, minimumTier, route } = body as {
      feature?: keyof PlanFeatures;
      limit?: keyof PlanLimits;
      currentUsage?: number;
      minimumTier?: PlanTier;
      route?: string;
    };

    let result: PaywallCheckResult;

    // Check by route
    if (route) {
      const routeConfig = matchRouteToPaywall(route);
      if (!routeConfig) {
        return NextResponse.json({
          allowed: true,
          currentPlan: context.planTier,
          message: "No paywall configured for this route",
        });
      }
      result = await checkPaywall(routeConfig, context);
    }
    // Check by feature
    else if (feature) {
      const hasFeature = isFeatureAvailable(feature, context.planTier);
      if (hasFeature) {
        result = {
          allowed: true,
          currentPlan: context.planTier,
        };
      } else {
        const requiredPlan = getMinimumTierForFeature(feature);
        result = {
          allowed: false,
          type: "feature",
          code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
          reason: `${FEATURE_DISPLAY_NAMES[feature] ?? feature} is not available on your current plan`,
          currentPlan: context.planTier,
          requiredPlan,
          upgrade: buildUpgradeInfo(context.planTier, requiredPlan, feature),
        };
      }
    }
    // Check by limit
    else if (limit) {
      const usage = currentUsage ?? 0;
      const limitValue = PLAN_LIMITS[context.planTier][limit];
      const withinLimit = limitValue === null || usage < limitValue;
      const remaining = getRemainingQuota(limit, context.planTier, usage);
      const percentage = getUsagePercentage(limit, context.planTier, usage);

      if (withinLimit) {
        result = {
          allowed: true,
          currentPlan: context.planTier,
          usage: {
            current: usage,
            limit: limitValue,
            remaining,
            percentage,
            warningLevel: getWarningLevel(percentage),
            unit: LIMIT_UNITS[limit],
          },
        };
      } else {
        result = {
          allowed: false,
          type: "limit",
          code: PaywallDenialCode.LIMIT_EXCEEDED,
          reason: `${LIMIT_DISPLAY_NAMES[limit]} limit exceeded`,
          currentPlan: context.planTier,
          usage: {
            current: usage,
            limit: limitValue,
            remaining: 0,
            percentage: 100,
            warningLevel: "critical",
            unit: LIMIT_UNITS[limit],
          },
        };
      }
    }
    // Check by minimum tier
    else if (minimumTier) {
      const tierOrder: PlanTier[] = [
        "free",
        "starter",
        "professional",
        "enterprise",
        "custom",
      ];
      const currentIndex = tierOrder.indexOf(context.planTier);
      const requiredIndex = tierOrder.indexOf(minimumTier);

      if (currentIndex >= requiredIndex) {
        result = {
          allowed: true,
          currentPlan: context.planTier,
        };
      } else {
        result = {
          allowed: false,
          type: "tier",
          code: PaywallDenialCode.TIER_INSUFFICIENT,
          reason: `This feature requires the ${PLAN_TIER_NAMES[minimumTier]} plan or higher`,
          currentPlan: context.planTier,
          requiredPlan: minimumTier,
          upgrade: buildUpgradeInfo(context.planTier, minimumTier),
        };
      }
    }
    // No check criteria provided
    else {
      return NextResponse.json(
        {
          error: "Bad request",
          message: "Provide feature, limit, minimumTier, or route",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Paywall POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildUpgradeInfo(
  currentTier: PlanTier,
  targetTier: PlanTier,
  feature?: keyof PlanFeatures,
): PaywallUpgradeInfo {
  const targetPlan = PLANS[targetTier];
  const newFeatures = getNewFeaturesInTier(currentTier, targetTier);
  const limitImprovements = getLimitImprovements(currentTier, targetTier);

  return {
    targetPlan: targetTier,
    planName: targetPlan.name,
    monthlyPrice: targetPlan.pricing.monthly,
    yearlyPrice: targetPlan.pricing.yearly,
    featuresGained: newFeatures.map((f) => f.name),
    limitsIncreased: limitImprovements.map((l) => ({
      name: l.name,
      key: l.key,
      currentValue: l.currentValue,
      newValue: l.newValue,
      unit: l.unit,
    })),
    upgradeUrl: `/billing/upgrade?plan=${targetTier}`,
    trialAvailable: targetTier !== "enterprise" && targetTier !== "custom",
    trialDays: 14,
  };
}

function getWarningLevel(
  percentage: number | null,
): "none" | "low" | "medium" | "high" | "critical" {
  if (percentage === null) return "none";
  if (percentage >= 95) return "critical";
  if (percentage >= 90) return "high";
  if (percentage >= 75) return "medium";
  if (percentage >= 50) return "low";
  return "none";
}
