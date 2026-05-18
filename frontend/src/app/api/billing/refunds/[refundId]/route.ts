/**
 * GET /api/billing/refunds/[refundId]
 *
 * Get refund details.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ refundId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { refundId } = await context.params;

    if (!refundId) {
      return NextResponse.json(
        { error: "Refund ID is required" },
        { status: 400 },
      );
    }

    const paymentService = getStripePaymentService();
    const refund = await paymentService.getRefund(refundId);

    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        chargeId: refund.chargeId,
        paymentIntentId: refund.paymentIntentId,
        createdAt: refund.createdAt.toISOString(),
        failureReason: refund.failureReason,
        metadata: refund.metadata,
      },
    });
  } catch (error) {
    logger.error("Error getting refund:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
