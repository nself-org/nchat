/**
 * Paywall Check API Route
 *
 * Quick endpoint for checking if a user can access a specific resource.
 *
 * @module @/app/api/paywall/check
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  type PlanLimits,
} from "@/lib/billing/plan-config";
import {
  PaywallDenialCode,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
} from "@/lib/billing/paywall-types";
import {
  isFeatureAvailable,
  isWithinLimit,
  getMinimumTierForFeature,
} from "@/lib/billing/paywall-utils";
import { extractPaywallContext, checkRoutePaywall } from "@/middleware/paywall";

// ============================================================================
// GET /api/paywall/check - Quick access check via query params
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const context = await extractPaywallContext(request);

    if (!context) {
      return NextResponse.json(
        { allowed: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { searchParams } = request.nextUrl;
    const feature = searchParams.get("feature") as keyof PlanFeatures | null;
    const limit = searchParams.get("limit") as keyof PlanLimits | null;
    const usage = searchParams.get("usage");
    const tier = searchParams.get("tier") as PlanTier | null;
    const route = searchParams.get("route");

    // Check by route
    if (route) {
      const result = await checkRoutePaywall(
        new NextRequest(new URL(route, request.url), {
          headers: request.headers,
        }),
      );
      return NextResponse.json({
        allowed: result.allowed,
        currentPlan: result.currentPlan,
        requiredPlan: result.requiredPlan,
        reason: result.reason,
        code: result.code,
      });
    }

    // Check by feature
    if (feature) {
      const hasFeature = isFeatureAvailable(feature, context.planTier);
      if (hasFeature) {
        return NextResponse.json({
          allowed: true,
          currentPlan: context.planTier,
        });
      } else {
        const requiredPlan = getMinimumTierForFeature(feature);
        return NextResponse.json({
          allowed: false,
          currentPlan: context.planTier,
          requiredPlan,
          reason: `${FEATURE_DISPLAY_NAMES[feature] ?? feature} requires ${PLAN_TIER_NAMES[requiredPlan]} plan`,
          code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
        });
      }
    }

    // Check by limit
    if (limit) {
      const currentUsage = usage ? parseInt(usage, 10) : 0;
      const limitValue = PLAN_LIMITS[context.planTier][limit];
      const withinLimit = limitValue === null || currentUsage < limitValue;

      if (withinLimit) {
        return NextResponse.json({
          allowed: true,
          currentPlan: context.planTier,
          limit: limitValue,
          usage: currentUsage,
          remaining: limitValue === null ? null : limitValue - currentUsage,
        });
      } else {
        return NextResponse.json({
          allowed: false,
          currentPlan: context.planTier,
          limit: limitValue,
          usage: currentUsage,
          remaining: 0,
          reason: `${LIMIT_DISPLAY_NAMES[limit]} limit exceeded`,
          code: PaywallDenialCode.LIMIT_EXCEEDED,
        });
      }
    }

    // Check by tier
    if (tier) {
      const tierOrder: PlanTier[] = [
        "free",
        "starter",
        "professional",
        "enterprise",
        "custom",
      ];
      const currentIndex = tierOrder.indexOf(context.planTier);
      const requiredIndex = tierOrder.indexOf(tier);

      if (currentIndex >= requiredIndex) {
        return NextResponse.json({
          allowed: true,
          currentPlan: context.planTier,
        });
      } else {
        return NextResponse.json({
          allowed: false,
          currentPlan: context.planTier,
          requiredPlan: tier,
          reason: `Requires ${PLAN_TIER_NAMES[tier]} plan`,
          code: PaywallDenialCode.TIER_INSUFFICIENT,
        });
      }
    }

    // No check criteria
    return NextResponse.json({
      allowed: true,
      currentPlan: context.planTier,
      message: "No check criteria provided",
    });
  } catch (error) {
    console.error("Paywall check error:", error);
    return NextResponse.json(
      { allowed: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/paywall/check - Batch check multiple resources
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const context = await extractPaywallContext(request);

    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized", results: {} },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { checks } = body as {
      checks: Array<{
        id: string;
        feature?: keyof PlanFeatures;
        limit?: keyof PlanLimits;
        usage?: number;
        tier?: PlanTier;
      }>;
    };

    if (!checks || !Array.isArray(checks)) {
      return NextResponse.json(
        { error: "Invalid request body", message: "Expected checks array" },
        { status: 400 },
      );
    }

    const results: Record<
      string,
      {
        allowed: boolean;
        reason?: string;
        code?: string;
        requiredPlan?: PlanTier;
      }
    > = {};

    for (const check of checks) {
      const { id, feature, limit, usage = 0, tier } = check;

      if (feature) {
        const hasFeature = isFeatureAvailable(feature, context.planTier);
        results[id] = {
          allowed: hasFeature,
          reason: hasFeature
            ? undefined
            : `${FEATURE_DISPLAY_NAMES[feature] ?? feature} not available`,
          code: hasFeature
            ? undefined
            : PaywallDenialCode.FEATURE_NOT_AVAILABLE,
          requiredPlan: hasFeature
            ? undefined
            : getMinimumTierForFeature(feature),
        };
      } else if (limit) {
        const withinLimit = isWithinLimit(limit, context.planTier, usage);
        results[id] = {
          allowed: withinLimit,
          reason: withinLimit
            ? undefined
            : `${LIMIT_DISPLAY_NAMES[limit]} limit exceeded`,
          code: withinLimit ? undefined : PaywallDenialCode.LIMIT_EXCEEDED,
        };
      } else if (tier) {
        const tierOrder: PlanTier[] = [
          "free",
          "starter",
          "professional",
          "enterprise",
          "custom",
        ];
        const allowed =
          tierOrder.indexOf(context.planTier) >= tierOrder.indexOf(tier);
        results[id] = {
          allowed,
          reason: allowed
            ? undefined
            : `Requires ${PLAN_TIER_NAMES[tier]} plan`,
          code: allowed ? undefined : PaywallDenialCode.TIER_INSUFFICIENT,
          requiredPlan: allowed ? undefined : tier,
        };
      } else {
        results[id] = { allowed: true };
      }
    }

    return NextResponse.json({
      currentPlan: context.planTier,
      results,
    });
  } catch (error) {
    console.error("Paywall batch check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
