/**
 * POST /api/billing/token-gate/verify
 *
 * Verify token ownership for channel access.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokenGateService } from "@/lib/billing/token-gate.service";
import { z } from "zod";

import { logger } from "@/lib/logger";

const verifySchema = z.object({
  channelId: z.string().uuid(),
  userId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  userRole: z.string().default("member"),
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

    const { channelId, userId, walletAddress, userRole } =
      validationResult.data;

    const tokenGateService = getTokenGateService();
    const result = await tokenGateService.checkAccess(
      channelId,
      userId,
      userRole,
      walletAddress,
    );

    if (!result.hasAccess) {
      return NextResponse.json(
        {
          hasAccess: false,
          reason: result.reason,
          requiresVerification: result.requiresVerification,
          verification: result.verification,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      hasAccess: true,
      bypassedByRole: result.bypassedByRole,
      verification: result.verification,
    });
  } catch (error) {
    logger.error("Error verifying token access:", error);
    return NextResponse.json(
      {
        error: "Failed to verify token access",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
