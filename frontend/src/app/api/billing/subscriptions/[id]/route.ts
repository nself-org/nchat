/**
 * Subscription Instance API Routes
 *
 * GET /api/billing/subscriptions/[id] - Get subscription
 * PATCH /api/billing/subscriptions/[id] - Update subscription (plan change)
 * DELETE /api/billing/subscriptions/[id] - Cancel subscription
 *
 * @module @/app/api/billing/subscriptions/[id]/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import { getSubscriptionService } from "@/services/billing/subscription.service";
import { getSubscriptionSummary } from "@/lib/billing/subscription-state-machine";
import { logger } from "@/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const updateSubscriptionSchema = z.object({
  plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
  interval: z.enum(["monthly", "yearly"]).optional(),
  reason: z.string().max(500).optional(),
});

const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false),
  reasonCategory: z.enum([
    "too_expensive",
    "not_using",
    "missing_features",
    "found_alternative",
    "temporary_pause",
    "company_closed",
    "technical_issues",
    "support_issues",
    "other",
  ]),
  reasonDetails: z.string().max(1000).optional(),
  feedback: z.string().max(2000).optional(),
  competitorName: z.string().max(100).optional(),
  wouldRecommend: z.boolean().nullable().optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Get subscription by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getSubscriptionService();
    const subscription = await service.getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Check if summary is requested
    const url = new URL(request.url);
    const includeSummary = url.searchParams.get("summary") === "true";

    if (includeSummary) {
      return NextResponse.json({
        subscription,
        summary: getSubscriptionSummary(subscription),
      });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    logger.error("Failed to get subscription", { error });
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 },
    );
  }
}

/**
 * Update subscription (plan change).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = updateSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.issues },
        { status: 400 },
      );
    }

    const service = getSubscriptionService();
    const subscription = await service.getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // If no changes requested
    if (!validation.data.plan && !validation.data.interval) {
      return NextResponse.json(
        { error: "No changes specified" },
        { status: 400 },
      );
    }

    const actor = {
      type: "user" as const,
      id: request.headers.get("x-user-id") || "system",
      email: request.headers.get("x-user-email") || undefined,
    };

    // Get current usage from headers or use defaults
    const currentUsage = {
      members: parseInt(request.headers.get("x-usage-members") || "0", 10),
      channels: parseInt(request.headers.get("x-usage-channels") || "0", 10),
      storageBytes: parseInt(request.headers.get("x-usage-storage") || "0", 10),
    };

    // First validate the plan change
    const validateResult = await service.validatePlanChange(
      id,
      (validation.data.plan || subscription.plan) as PlanTier,
      (validation.data.interval || subscription.interval) as BillingInterval,
      currentUsage,
    );

    if (!validateResult.isValid) {
      return NextResponse.json(
        {
          error: "Invalid plan change",
          validation: validateResult,
        },
        { status: 400 },
      );
    }

    // Execute the plan change
    const result = await service.changePlan(
      {
        subscriptionId: id,
        currentPlan: subscription.plan,
        newPlan: (validation.data.plan || subscription.plan) as PlanTier,
        currentInterval: subscription.interval,
        newInterval: validation.data.interval as BillingInterval | undefined,
        effectiveTiming: validateResult.effectiveTiming,
        prorationBehavior: "create_prorations",
        reason: validation.data.reason,
        requestedBy: actor.id,
        requestedAt: new Date(),
      },
      actor,
      currentUsage,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to update subscription" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      subscription: result.data,
      validation: validateResult,
      events: result.events,
    });
  } catch (error) {
    logger.error("Failed to update subscription", { error });
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}

/**
 * Cancel subscription.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = cancelSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.issues },
        { status: 400 },
      );
    }

    const service = getSubscriptionService();
    const subscription = await service.getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    const actor = {
      type: "user" as const,
      id: request.headers.get("x-user-id") || "system",
      email: request.headers.get("x-user-email") || undefined,
    };

    const result = await service.cancelSubscription(
      {
        subscriptionId: id,
        behavior: validation.data.immediately ? "immediate" : "period_end",
        reasonCategory: validation.data.reasonCategory,
        reasonDetails: validation.data.reasonDetails,
        feedback: validation.data.feedback,
        competitorName: validation.data.competitorName,
        wouldRecommend: validation.data.wouldRecommend ?? null,
        requestedBy: actor.id,
        requestedAt: new Date(),
      },
      actor,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to cancel subscription" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      confirmation: result.data,
      events: result.events,
    });
  } catch (error) {
    logger.error("Failed to cancel subscription", { error });
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
