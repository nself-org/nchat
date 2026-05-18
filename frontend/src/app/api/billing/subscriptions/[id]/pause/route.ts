/**
 * Subscription Pause API Route
 *
 * POST /api/billing/subscriptions/[id]/pause - Pause subscription
 *
 * @module @/app/api/billing/subscriptions/[id]/pause/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSubscriptionService } from "@/services/billing/subscription.service";
import { logger } from "@/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const pauseSubscriptionSchema = z.object({
  behavior: z.enum(["immediate", "period_end"]).default("immediate"),
  durationType: z
    .enum(["indefinite", "fixed", "until_date"])
    .default("indefinite"),
  durationDays: z.number().int().min(1).max(90).optional(),
  resumeDate: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Pause subscription.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = pauseSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.issues },
        { status: 400 },
      );
    }

    const service = getSubscriptionService();

    // Check if pause is allowed
    const canPause = await service.canPause(id);
    if (!canPause.canPause) {
      return NextResponse.json(
        { error: canPause.reason || "Cannot pause subscription" },
        { status: 400 },
      );
    }

    const actor = {
      type: "user" as const,
      id: request.headers.get("x-user-id") || "system",
      email: request.headers.get("x-user-email") || undefined,
    };

    const result = await service.pauseSubscription(
      {
        subscriptionId: id,
        behavior: validation.data.behavior,
        durationType: validation.data.durationType,
        durationDays: validation.data.durationDays,
        resumeDate: validation.data.resumeDate
          ? new Date(validation.data.resumeDate)
          : undefined,
        reason: validation.data.reason,
        requestedBy: actor.id,
        requestedAt: new Date(),
      },
      actor,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to pause subscription" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      subscription: result.data,
      events: result.events,
    });
  } catch (error) {
    logger.error("Failed to pause subscription", { error });
    return NextResponse.json(
      { error: "Failed to pause subscription" },
      { status: 500 },
    );
  }
}

/**
 * Check if subscription can be paused.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getSubscriptionService();
    const canPause = await service.canPause(id);

    return NextResponse.json(canPause);
  } catch (error) {
    logger.error("Failed to check pause status", { error });
    return NextResponse.json(
      { error: "Failed to check pause status" },
      { status: 500 },
    );
  }
}
