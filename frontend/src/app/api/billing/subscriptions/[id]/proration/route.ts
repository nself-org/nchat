/**
 * Subscription Proration API Route
 *
 * GET /api/billing/subscriptions/[id]/proration - Calculate proration preview
 *
 * @module @/app/api/billing/subscriptions/[id]/proration/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import { getSubscriptionService } from "@/services/billing/subscription.service";
import { logger } from "@/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const prorationQuerySchema = z.object({
  newPlan: z.enum(["free", "starter", "professional", "enterprise"]),
  newInterval: z.enum(["monthly", "yearly"]).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Calculate proration preview for plan change.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);

    // Parse query parameters
    const queryParams = {
      newPlan: url.searchParams.get("newPlan"),
      newInterval: url.searchParams.get("newInterval") || undefined,
    };

    // Validate parameters
    const validation = prorationQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.issues },
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

    const proration = await service.calculateProration(
      id,
      validation.data.newPlan as PlanTier,
      (validation.data.newInterval || subscription.interval) as BillingInterval,
    );

    if (!proration) {
      return NextResponse.json(
        { error: "Failed to calculate proration" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      proration,
      currentPlan: subscription.plan,
      newPlan: validation.data.newPlan,
      currentInterval: subscription.interval,
      newInterval: validation.data.newInterval || subscription.interval,
    });
  } catch (error) {
    logger.error("Failed to calculate proration", { error });
    return NextResponse.json(
      { error: "Failed to calculate proration" },
      { status: 500 },
    );
  }
}
