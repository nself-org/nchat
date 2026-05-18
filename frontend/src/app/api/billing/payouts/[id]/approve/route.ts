/**
 * POST /api/billing/payouts/[id]/approve - Approve or reject a payout
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayoutService } from "@/services/billing/payout.service";
import { logger } from "@/lib/logger";

const approvalSchema = z.object({
  approverId: z.string().min(1),
  approverRole: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: payoutId } = await params;
    const body = await request.json();
    const validation = approvalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const service = getPayoutService();
    const result = service.processApproval(
      payoutId,
      validation.data.approverId,
      validation.data.approverRole,
      validation.data.decision,
      validation.data.reason,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payout: result.payout,
      approvalStatus: result.approvalStatus,
      autoTransitioned: result.autoTransitioned,
    });
  } catch (error) {
    logger.error(
      "Error processing approval:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
