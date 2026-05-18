/**
 * GET /api/billing/invoices/upcoming
 *
 * Get upcoming invoice preview.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

const upcomingInvoiceSchema = z.object({
  customerId: z.string().min(1),
  subscriptionId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      customerId: searchParams.get("customerId") || "",
      subscriptionId: searchParams.get("subscriptionId") || undefined,
    };

    const validation = upcomingInvoiceSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { customerId, subscriptionId } = validation.data;

    const paymentService = getStripePaymentService();
    const invoice = await paymentService.getUpcomingInvoice(
      customerId,
      subscriptionId,
    );

    if (!invoice) {
      return NextResponse.json(
        { error: "No upcoming invoice found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        status: invoice.status,
        currency: invoice.currency,
        amountDue: invoice.amountDue,
        subtotal: invoice.subtotal,
        total: invoice.total,
        tax: invoice.tax,
        periodStart: invoice.periodStart?.toISOString(),
        periodEnd: invoice.periodEnd?.toISOString(),
        lineItems: invoice.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          currency: item.currency,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          periodStart: item.periodStart?.toISOString(),
          periodEnd: item.periodEnd?.toISOString(),
          proration: item.proration,
          type: item.type,
        })),
      },
    });
  } catch (error) {
    logger.error("Error getting upcoming invoice:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
