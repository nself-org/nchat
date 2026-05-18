/**
 * POST /api/billing/upgrade
 *
 * Upgrade or downgrade a subscription plan with proper validation
 * and enforcement of plan transition rules.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeBillingService } from "@/lib/billing/stripe-service";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getTenantId } from "@/lib/tenants/tenant-middleware";
import { comparePlans, PLAN_FEATURES } from "@/lib/billing/plan-config";
import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import type { BillingInterval, BillingPlan } from "@/lib/tenants/types";
import { z } from "zod";

import { logger } from "@/lib/logger";

// Note: PlanTier from subscription.types uses 'starter'/'professional'
// but BillingPlan from tenants/types uses 'pro'
// We accept both and map accordingly
const upgradeSchema = z.object({
  targetPlan: z.enum(["free", "starter", "pro", "professional", "enterprise"]),
  interval: z.enum(["monthly", "yearly"]),
  confirmDowngrade: z.boolean().optional(),
});

// Map external plan names to internal BillingPlan type
function mapToBillingPlan(plan: string): BillingPlan {
  switch (plan) {
    case "free":
      return "free";
    case "starter":
    case "pro":
    case "professional":
      return "pro";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

// Map BillingPlan to PlanTier for feature checks
function mapToPlanTier(plan: string): PlanTier {
  switch (plan) {
    case "free":
      return "free";
    case "pro":
      return "professional";
    case "starter":
      return "starter";
    case "professional":
      return "professional";
    case "enterprise":
      return "enterprise";
    case "custom":
      return "custom";
    default:
      return "free";
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();

    // Validate request
    const validationResult = upgradeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { targetPlan, interval, confirmDowngrade } = validationResult.data;

    // Get tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const currentPlanTier = mapToPlanTier(tenant.billing.plan);
    const targetPlanTier = mapToPlanTier(targetPlan);
    const planComparison = comparePlans(targetPlanTier, currentPlanTier);
    const isDowngrade = planComparison < 0;

    // For downgrades, require explicit confirmation
    if (isDowngrade && !confirmDowngrade) {
      // Calculate what features will be lost
      const currentFeatures = PLAN_FEATURES[currentPlanTier];
      const targetFeatures = PLAN_FEATURES[targetPlanTier];
      const lostFeatures: string[] = [];

      for (const [key, value] of Object.entries(currentFeatures)) {
        if (
          value === true &&
          targetFeatures[key as keyof PlanFeatures] !== true
        ) {
          lostFeatures.push(key);
        }
      }

      return NextResponse.json(
        {
          error: "Downgrade requires confirmation",
          requiresConfirmation: true,
          isDowngrade: true,
          currentPlan: currentPlanTier,
          targetPlan: targetPlanTier,
          lostFeatures,
          message: `Downgrading will remove access to: ${lostFeatures.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate the transition
    const billingService = getStripeBillingService();
    const validation = await billingService.validatePlanTransition(
      tenant,
      targetPlanTier,
      interval as BillingInterval,
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.error,
          isUpgrade: validation.isUpgrade,
          isDowngrade: validation.isDowngrade,
        },
        { status: 400 },
      );
    }

    // Map to billing plan type and execute the plan change
    const billingPlan = mapToBillingPlan(targetPlan);
    const result = await billingService.updateSubscription(
      tenant,
      billingPlan,
      interval as BillingInterval,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          transitionType: result.transitionType,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      transitionType: result.transitionType,
      newPlan: targetPlan,
      newInterval: interval,
      prorationAmount: result.prorationAmount,
      effectiveDate:
        result.transitionType === "downgrade"
          ? "end of billing period"
          : "immediate",
      subscription: result.subscription
        ? {
            id: result.subscription.id,
            status: result.subscription.status,
            // Handle Stripe's current_period_end which is a Unix timestamp
            currentPeriodEnd: (result.subscription as any).current_period_end
              ? new Date(
                  (result.subscription as any).current_period_end * 1000,
                ).toISOString()
              : undefined,
          }
        : undefined,
    });
  } catch (error) {
    logger.error("Error processing plan change:", error);
    return NextResponse.json(
      {
        error: "Failed to process plan change",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // Get tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const billingService = getStripeBillingService();
    const currentPlanTier = mapToPlanTier(tenant.billing.plan);

    // Check what plans the tenant can upgrade/downgrade to
    const availableTransitions: Array<{
      plan: PlanTier;
      interval: BillingInterval;
      type: "upgrade" | "downgrade" | "current";
      validation: Awaited<
        ReturnType<typeof billingService.validatePlanTransition>
      >;
    }> = [];

    const plans: PlanTier[] = ["free", "starter", "professional", "enterprise"];
    const intervals: BillingInterval[] = ["monthly", "yearly"];

    for (const plan of plans) {
      for (const interval of intervals) {
        const validation = await billingService.validatePlanTransition(
          tenant,
          plan,
          interval,
        );
        const comparison = comparePlans(plan, currentPlanTier);

        availableTransitions.push({
          plan,
          interval,
          type:
            plan === currentPlanTier && interval === tenant.billing.interval
              ? "current"
              : comparison > 0
                ? "upgrade"
                : "downgrade",
          validation,
        });
      }
    }

    return NextResponse.json({
      currentPlan: currentPlanTier,
      currentInterval: tenant.billing.interval,
      availableTransitions,
      currentUsage: tenant.billing.usageTracking,
    });
  } catch (error) {
    logger.error("Error fetching plan options:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch plan options",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
