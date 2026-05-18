/**
 * Subscription Management API Routes
 *
 * GET /api/billing/subscriptions - List subscriptions
 * POST /api/billing/subscriptions - Create subscription
 *
 * @module @/app/api/billing/subscriptions/route
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

const createSubscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  organizationId: z.string().uuid(),
  plan: z.enum(["free", "starter", "professional", "enterprise", "custom"]),
  interval: z.enum(["monthly", "yearly"]),
  trialDays: z.number().int().min(0).max(90).optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  stripePriceId: z.string().optional(),
});

const listSubscriptionsSchema = z.object({
  states: z
    .array(
      z.enum(["trial", "active", "grace", "past_due", "paused", "canceled"]),
    )
    .optional(),
  plans: z
    .array(z.enum(["free", "starter", "professional", "enterprise", "custom"]))
    .optional(),
  intervals: z.array(z.enum(["monthly", "yearly"])).optional(),
  workspaceId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  trialEndingBefore: z.string().datetime().optional(),
  renewingBefore: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * List subscriptions with filters.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params: Record<string, unknown> = {};

    // Parse query parameters
    const states = url.searchParams.get("states");
    if (states) params.states = states.split(",");

    const plans = url.searchParams.get("plans");
    if (plans) params.plans = plans.split(",");

    const intervals = url.searchParams.get("intervals");
    if (intervals) params.intervals = intervals.split(",");

    const workspaceId = url.searchParams.get("workspaceId");
    if (workspaceId) params.workspaceId = workspaceId;

    const organizationId = url.searchParams.get("organizationId");
    if (organizationId) params.organizationId = organizationId;

    const trialEndingBefore = url.searchParams.get("trialEndingBefore");
    if (trialEndingBefore) params.trialEndingBefore = trialEndingBefore;

    const renewingBefore = url.searchParams.get("renewingBefore");
    if (renewingBefore) params.renewingBefore = renewingBefore;

    const limit = url.searchParams.get("limit");
    if (limit) params.limit = parseInt(limit, 10);

    const offset = url.searchParams.get("offset");
    if (offset) params.offset = parseInt(offset, 10);

    // Validate parameters
    const validation = listSubscriptionsSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.issues },
        { status: 400 },
      );
    }

    const service = getSubscriptionService();
    const filters = {
      ...validation.data,
      trialEndingBefore: validation.data.trialEndingBefore
        ? new Date(validation.data.trialEndingBefore)
        : undefined,
      renewingBefore: validation.data.renewingBefore
        ? new Date(validation.data.renewingBefore)
        : undefined,
    };

    const subscriptions = await service.listSubscriptions(filters);

    return NextResponse.json({
      subscriptions,
      count: subscriptions.length,
      limit: validation.data.limit ?? 100,
      offset: validation.data.offset ?? 0,
    });
  } catch (error) {
    logger.error("Failed to list subscriptions", { error });
    return NextResponse.json(
      { error: "Failed to list subscriptions" },
      { status: 500 },
    );
  }
}

/**
 * Create a new subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.issues },
        { status: 400 },
      );
    }

    const service = getSubscriptionService();
    const actor = {
      type: "user" as const,
      id: request.headers.get("x-user-id") || "system",
      email: request.headers.get("x-user-email") || undefined,
    };

    const result = await service.createSubscription(
      {
        workspaceId: validation.data.workspaceId,
        organizationId: validation.data.organizationId,
        plan: validation.data.plan as PlanTier,
        interval: validation.data.interval as BillingInterval,
        trialDays: validation.data.trialDays,
        stripeCustomerId: validation.data.stripeCustomerId,
        stripeSubscriptionId: validation.data.stripeSubscriptionId,
        stripePriceId: validation.data.stripePriceId,
      },
      actor,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to create subscription" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        subscription: result.data,
        events: result.events,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create subscription", { error });
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
