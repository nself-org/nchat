/**
 * Subscription Resume API Route
 *
 * POST /api/billing/subscriptions/[id]/resume - Resume subscription
 *
 * @module @/app/api/billing/subscriptions/[id]/resume/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSubscriptionService } from "@/services/billing/subscription.service";
import { logger } from "@/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const resumeSubscriptionSchema = z.object({
  resumeImmediately: z.boolean().default(true),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Resume subscription.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = resumeSubscriptionSchema.safeParse(body);
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

    const result = await service.resumeSubscription(
      {
        subscriptionId: id,
        resumeImmediately: validation.data.resumeImmediately,
        requestedBy: actor.id,
        requestedAt: new Date(),
      },
      actor,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to resume subscription" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      subscription: result.data,
      events: result.events,
    });
  } catch (error) {
    logger.error("Failed to resume subscription", { error });
    return NextResponse.json(
      { error: "Failed to resume subscription" },
      { status: 500 },
    );
  }
}
