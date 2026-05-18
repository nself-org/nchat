/**
 * POST /api/billing/crypto/verify
 *
 * Verify a crypto payment by transaction hash.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCryptoPaymentService } from "@/lib/billing/crypto-payment.service";
import { z } from "zod";

import { logger } from "@/lib/logger";

const verifySchema = z.object({
  paymentId: z.string(),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = verifySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { paymentId, transactionHash } = validationResult.data;

    const cryptoPaymentService = getCryptoPaymentService();
    const result = await cryptoPaymentService.verifyPayment(
      paymentId,
      transactionHash,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      payment: result.payment,
      status: result.payment?.status,
      confirmations: result.payment?.confirmations,
      transactionHash: result.payment?.transactionHash,
    });
  } catch (error) {
    logger.error("Error verifying crypto payment:", error);
    return NextResponse.json(
      {
        error: "Failed to verify payment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
