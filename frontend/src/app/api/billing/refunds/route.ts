/**
 * POST /api/billing/refunds
 * GET /api/billing/refunds
 *
 * Create refunds and list refund history.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import type { RefundReason } from "@/lib/billing/stripe-types";
import { logger } from "@/lib/logger";

const createRefundSchema = z
  .object({
    paymentIntentId: z.string().optional(),
    chargeId: z.string().optional(),
    amount: z.number().int().positive().optional(),
    reason: z
      .enum(["duplicate", "fraudulent", "requested_by_customer"])
      .optional(),
    metadata: z.record(z.string()).optional(),
    reverseTransfer: z.boolean().optional(),
    refundApplicationFee: z.boolean().optional(),
    instructionsEmail: z.string().email().optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine((data) => data.paymentIntentId || data.chargeId, {
    message: "Either paymentIntentId or chargeId is required",
  });

const bulkRefundSchema = z.object({
  refunds: z.array(createRefundSchema.innerType()),
  stopOnError: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if bulk refund
    if (body.refunds && Array.isArray(body.refunds)) {
      const validation = bulkRefundSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid request", details: validation.error.errors },
          { status: 400 },
        );
      }

      const paymentService = getStripePaymentService();
      const result = await paymentService.createBulkRefunds({
        refunds: validation.data.refunds.map((r) => ({
          ...r,
          reason: r.reason as RefundReason | undefined,
        })),
        stopOnError: validation.data.stopOnError,
      });

      return NextResponse.json({
        success: true,
        totalSucceeded: result.totalSucceeded,
        totalFailed: result.totalFailed,
        succeeded: result.succeeded.map((r) => ({
          id: r.id,
          amount: r.amount,
          currency: r.currency,
          status: r.status,
          chargeId: r.chargeId,
        })),
        failed: result.failed,
      });
    }

    // Single refund
    const validation = createRefundSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      paymentIntentId,
      chargeId,
      amount,
      reason,
      metadata,
      reverseTransfer,
      refundApplicationFee,
      instructionsEmail,
      idempotencyKey,
    } = validation.data;

    const paymentService = getStripePaymentService();
    const result = await paymentService.createRefund(
      {
        paymentIntentId,
        chargeId,
        amount,
        reason: reason as RefundReason | undefined,
        metadata,
        reverseTransfer,
        refundApplicationFee,
        instructionsEmail,
      },
      idempotencyKey,
    );

    if (!result.success) {
      logger.error("Failed to create refund", { error: result.error });
      return NextResponse.json(
        { error: result.error?.message || "Failed to create refund" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      refund: {
        id: result.data!.id,
        amount: result.data!.amount,
        currency: result.data!.currency,
        status: result.data!.status,
        reason: result.data!.reason,
        chargeId: result.data!.chargeId,
        paymentIntentId: result.data!.paymentIntentId,
        createdAt: result.data!.createdAt.toISOString(),
        failureReason: result.data!.failureReason,
      },
      wasReplay: result.wasReplay,
      idempotencyKey: result.idempotencyKey,
    });
  } catch (error) {
    logger.error("Error creating refund:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
