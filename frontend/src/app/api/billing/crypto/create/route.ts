/**
 * POST /api/billing/crypto/create
 *
 * Create a cryptocurrency payment for subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { getCryptoPaymentService } from "@/lib/billing/crypto-payment.service";
import { z } from "zod";

import { logger } from "@/lib/logger";

const createCryptoPaymentSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
  fiatAmount: z.number().int().positive(),
  cryptoCurrency: z.enum(["ETH", "BTC", "USDC", "USDT", "DAI", "MATIC"]),
  cryptoNetwork: z.enum(["ethereum", "bitcoin", "polygon", "arbitrum", "base"]),
  provider: z
    .enum(["coinbase_commerce", "manual"])
    .default("coinbase_commerce"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createCryptoPaymentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const params = validationResult.data;

    // Create crypto payment
    const cryptoPaymentService = getCryptoPaymentService();
    const result = await cryptoPaymentService.createPayment(params);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create payment" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      payment: result.payment,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    logger.error("Error creating crypto payment:", error);
    return NextResponse.json(
      {
        error: "Failed to create crypto payment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
