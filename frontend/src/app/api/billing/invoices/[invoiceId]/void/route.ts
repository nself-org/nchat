/**
 * POST /api/billing/invoices/[invoiceId]/void
 *
 * Void an invoice.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ invoiceId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { invoiceId } = await context.params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    const paymentService = getStripePaymentService();
    const result = await paymentService.voidInvoice({ invoiceId });

    if (!result.success) {
      logger.error("Failed to void invoice", {
        error: result.error,
        invoiceId,
      });
      return NextResponse.json(
        { error: result.error?.message || "Failed to void invoice" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: result.data!.id,
        number: result.data!.number,
        status: result.data!.status,
      },
    });
  } catch (error) {
    logger.error("Error voiding invoice:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
