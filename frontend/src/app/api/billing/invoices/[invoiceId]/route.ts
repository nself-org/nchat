/**
 * GET /api/billing/invoices/[invoiceId]
 *
 * Get invoice details.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ invoiceId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { invoiceId } = await context.params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    const paymentService = getStripePaymentService();
    const invoice = await paymentService.getInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        status: invoice.status,
        collectionMethod: invoice.collectionMethod,
        currency: invoice.currency,
        amountDue: invoice.amountDue,
        amountPaid: invoice.amountPaid,
        amountRemaining: invoice.amountRemaining,
        subtotal: invoice.subtotal,
        total: invoice.total,
        tax: invoice.tax,
        dueDate: invoice.dueDate?.toISOString(),
        paidAt: invoice.paidAt?.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        periodStart: invoice.periodStart?.toISOString(),
        periodEnd: invoice.periodEnd?.toISOString(),
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        invoicePdf: invoice.invoicePdf,
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
        metadata: invoice.metadata,
      },
    });
  } catch (error) {
    logger.error("Error getting invoice:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
