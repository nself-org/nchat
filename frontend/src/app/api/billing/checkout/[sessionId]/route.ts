/**
 * GET /api/billing/checkout/[sessionId]
 * DELETE /api/billing/checkout/[sessionId]
 *
 * Get checkout session status or expire a session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const paymentService = getStripePaymentService();
    const session = await paymentService.getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        paymentStatus: session.paymentStatus,
        customerId: session.customerId,
        subscriptionId: session.subscriptionId,
        amountTotal: session.amountTotal,
        currency: session.currency,
        expiresAt: session.expiresAt.toISOString(),
        metadata: session.metadata,
      },
    });
  } catch (error) {
    logger.error("Error getting checkout session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const paymentService = getStripePaymentService();
    const success = await paymentService.expireCheckoutSession(sessionId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to expire session" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, expired: true });
  } catch (error) {
    logger.error("Error expiring checkout session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
