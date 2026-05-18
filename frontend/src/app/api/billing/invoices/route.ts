/**
 * POST /api/billing/invoices
 * GET /api/billing/invoices
 *
 * Create invoices and list invoice history.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { logger } from "@/lib/logger";

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  subscriptionId: z.string().optional(),
  autoAdvance: z.boolean().optional(),
  collectionMethod: z.enum(["charge_automatically", "send_invoice"]).optional(),
  daysUntilDue: z.number().int().min(1).max(365).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  statementDescriptor: z.string().max(22).optional(),
  footer: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const listInvoicesSchema = z.object({
  customerId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: z.string().optional(),
  status: z.enum(["draft", "open", "paid", "uncollectible", "void"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      customerId,
      subscriptionId,
      autoAdvance,
      collectionMethod,
      daysUntilDue,
      description,
      metadata,
      statementDescriptor,
      footer,
      idempotencyKey,
    } = validation.data;

    const paymentService = getStripePaymentService();
    const result = await paymentService.createInvoice(
      {
        customerId,
        subscriptionId,
        autoAdvance,
        collectionMethod,
        daysUntilDue,
        description,
        metadata,
        statementDescriptor,
        footer,
      },
      idempotencyKey,
    );

    if (!result.success) {
      logger.error("Failed to create invoice", { error: result.error });
      return NextResponse.json(
        { error: result.error?.message || "Failed to create invoice" },
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
        currency: result.data!.currency,
        dueDate: result.data!.dueDate?.toISOString(),
        createdAt: result.data!.createdAt.toISOString(),
        hostedInvoiceUrl: result.data!.hostedInvoiceUrl,
        invoicePdf: result.data!.invoicePdf,
      },
      wasReplay: result.wasReplay,
      idempotencyKey: result.idempotencyKey,
    });
  } catch (error) {
    logger.error("Error creating invoice:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      customerId: searchParams.get("customerId") || "",
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
      startingAfter: searchParams.get("startingAfter") || undefined,
      status: searchParams.get("status") || undefined,
    };

    const validation = listInvoicesSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { customerId, limit, startingAfter, status } = validation.data;

    const paymentService = getStripePaymentService();
    const invoices = await paymentService.listInvoices(customerId, {
      limit,
      startingAfter,
      status,
    });

    return NextResponse.json({
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amountDue,
        amountPaid: inv.amountPaid,
        amountRemaining: inv.amountRemaining,
        currency: inv.currency,
        dueDate: inv.dueDate?.toISOString(),
        paidAt: inv.paidAt?.toISOString(),
        createdAt: inv.createdAt.toISOString(),
        hostedInvoiceUrl: inv.hostedInvoiceUrl,
        invoicePdf: inv.invoicePdf,
      })),
      hasMore: invoices.length === (limit || 10),
    });
  } catch (error) {
    logger.error("Error listing invoices:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
