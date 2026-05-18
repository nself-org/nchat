/**
 * POST /api/billing/checkout/create
 *
 * Create an idempotent checkout session for subscription or one-time payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import { logger } from "@/lib/logger";

const createCheckoutSchema = z.object({
  workspaceId: z.string().min(1),
  plan: z.enum(["free", "starter", "professional", "enterprise", "custom"]),
  interval: z.enum(["monthly", "yearly"]),
  customerEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  trialDays: z.number().int().min(0).max(90).optional(),
  promotionCode: z.string().optional(),
  clientReferenceId: z.string().optional(),
  allowPromotionCodes: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createCheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      workspaceId,
      plan,
      interval,
      customerEmail,
      customerId,
      successUrl,
      cancelUrl,
      trialDays,
      promotionCode,
      clientReferenceId,
      allowPromotionCodes,
      idempotencyKey,
      metadata,
    } = validation.data;

    // Don't allow checkout for free plan
    if (plan === "free") {
      return NextResponse.json(
        { error: "Free plan does not require checkout" },
        { status: 400 },
      );
    }

    // Don't allow checkout for custom plan via API
    if (plan === "custom") {
      return NextResponse.json(
        { error: "Custom plans require sales contact" },
        { status: 400 },
      );
    }

    const paymentService = getStripePaymentService();

    const result = await paymentService.createCheckoutSession(
      {
        workspaceId,
        plan: plan as PlanTier,
        interval: interval as BillingInterval,
        customerEmail,
        customerId,
        successUrl,
        cancelUrl,
        trialDays,
        promotionCode,
        clientReferenceId,
        allowPromotionCodes,
        metadata,
      },
      idempotencyKey,
    );

    if (!result.success) {
      logger.error("Failed to create checkout session", {
        error: result.error,
        workspaceId,
        plan,
      });
      return NextResponse.json(
        { error: result.error?.message || "Failed to create checkout session" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.data!.sessionId,
      url: result.data!.url,
      expiresAt: result.data!.expiresAt.toISOString(),
      wasReplay: result.wasReplay,
      idempotencyKey: result.idempotencyKey,
    });
  } catch (error) {
    logger.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
