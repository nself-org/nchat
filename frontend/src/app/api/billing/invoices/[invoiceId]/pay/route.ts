/**
 * POST /api/billing/invoices/[invoiceId]/pay
 *
 * Pay an invoice.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ invoiceId: string }>;
}

const payInvoiceSchema = z.object({
  paymentMethodId: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { invoiceId } = await context.params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = payInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { paymentMethodId, source } = validation.data;

    const paymentService = getStripePaymentService();
    const result = await paymentService.payInvoice({
      invoiceId,
      paymentMethodId,
      source,
    });

    if (!result.success) {
      logger.error("Failed to pay invoice", { error: result.error, invoiceId });
      return NextResponse.json(
        { error: result.error?.message || "Failed to pay invoice" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: result.data!.id,
        number: result.data!.number,
        status: result.data!.status,
        amountDue: result.data!.amountDue,
        amountPaid: result.data!.amountPaid,
        paidAt: result.data!.paidAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error paying invoice:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
