/**
 * GET /api/billing/crypto/rates
 *
 * Get current cryptocurrency exchange rates for payment calculations.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCryptoPaymentService } from "@/lib/billing/crypto-payment.service";

import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get("currency");

    const cryptoPaymentService = getCryptoPaymentService();

    if (currency) {
      // Get specific currency rate
      const rate = await cryptoPaymentService.getExchangeRate(currency as any);

      if (!rate) {
        return NextResponse.json(
          { error: `No rate available for ${currency}` },
          { status: 404 },
        );
      }

      return NextResponse.json({
        currency: rate.currency,
        usdPrice: rate.usdPrice,
        updatedAt: rate.updatedAt.toISOString(),
      });
    }

    // Get all rates
    const rates = await cryptoPaymentService.getAllExchangeRates();
    const ratesArray = Array.from(rates.values()).map((rate) => ({
      currency: rate.currency,
      usdPrice: rate.usdPrice,
      updatedAt: rate.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      rates: ratesArray,
      acceptedCurrencies: cryptoPaymentService.getAcceptedCurrencies(),
      acceptedNetworks: cryptoPaymentService.getAcceptedNetworks(),
    });
  } catch (error) {
    logger.error("Error fetching crypto rates:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch exchange rates",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
