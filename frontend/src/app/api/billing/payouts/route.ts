/**
 * POST /api/billing/payouts - Create a new payout request
 * GET /api/billing/payouts - List payouts with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayoutService } from "@/services/billing/payout.service";
import type {
  PayoutCurrency,
  PayoutMethod,
  PayoutCategory,
} from "@/lib/billing/payout-types";
import { logger } from "@/lib/logger";

const createPayoutSchema = z.object({
  workspaceId: z.string().min(1),
  requestedBy: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.enum(["USD", "EUR", "GBP", "BTC", "ETH", "USDC"]),
  method: z.enum([
    "bank_transfer",
    "crypto_withdrawal",
    "stripe_payout",
    "wire_transfer",
    "internal_transfer",
  ]),
  recipientName: z.string().min(1),
  recipientDetails: z.record(z.unknown()),
  description: z.string().min(1),
  category: z.enum([
    "vendor_payment",
    "employee_salary",
    "refund",
    "withdrawal",
    "transfer",
    "dividend",
    "expense",
    "other",
  ]),
  reference: z.string().optional(),
  recipientId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  submitForApproval: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createPayoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const service = getPayoutService();
    const result = service.createPayout({
      workspaceId: validation.data.workspaceId,
      requestedBy: validation.data.requestedBy,
      amount: validation.data.amount,
      currency: validation.data.currency as PayoutCurrency,
      method: validation.data.method as PayoutMethod,
      recipientName: validation.data.recipientName,
      recipientDetails: validation.data.recipientDetails,
      description: validation.data.description,
      category: validation.data.category as PayoutCategory,
      reference: validation.data.reference,
      recipientId: validation.data.recipientId,
      metadata: validation.data.metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          policyResult: result.policyResult,
        },
        { status: 400 },
      );
    }

    // Auto-submit for approval if requested
    if (validation.data.submitForApproval && result.payout) {
      const submitResult = service.submitForApproval(
        result.payout.id,
        validation.data.requestedBy,
      );
      if (submitResult.success) {
        return NextResponse.json(
          {
            success: true,
            payout: submitResult.payout,
            policyResult: result.policyResult,
          },
          { status: 201 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        payout: result.payout,
        policyResult: result.policyResult,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(
      "Error creating payout:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get("workspaceId") || undefined;
    const statusFilter = searchParams.get("status");
    const requestedBy = searchParams.get("requestedBy") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    const service = getPayoutService();
    const payouts = service.queryPayouts({
      workspaceId,
      status: statusFilter ? (statusFilter.split(",") as any[]) : undefined,
      requestedBy,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      payouts,
      count: payouts.length,
    });
  } catch (error) {
    logger.error(
      "Error listing payouts:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
