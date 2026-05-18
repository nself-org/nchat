/**
 * Remote Wipe Token API Routes
 *
 * Endpoints for managing remote wipe tokens.
 *
 * POST /api/security/wipe/token - Generate a remote wipe token
 * GET /api/security/wipe/token - Get pending tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createWipeService } from "@/services/security/wipe.service";

// ============================================================================
// Types
// ============================================================================

interface TokenRequestBody {
  targetDeviceId: string;
  expiresInMinutes?: number;
}

// ============================================================================
// POST - Generate Token
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TokenRequestBody;

    if (!body.targetDeviceId) {
      return NextResponse.json(
        { error: "Target device ID is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    // Check if remote wipe is enabled
    const state = wipeService.getState();
    if (!state.remoteWipeEnabled) {
      wipeService.destroy();
      return NextResponse.json(
        { error: "Remote wipe is not enabled" },
        { status: 403 },
      );
    }

    const token = await wipeService.generateRemoteWipeToken(
      body.targetDeviceId,
      body.expiresInMinutes || 15,
    );

    wipeService.destroy();

    logger.security("Remote wipe token generated via API", {
      tokenId: token.id,
      targetDeviceId: body.targetDeviceId,
    });

    return NextResponse.json({
      success: true,
      token: {
        id: token.id,
        token: token.token,
        targetDeviceId: token.targetDeviceId,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
    });
  } catch (error) {
    logger.error("Token generation API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Pending Tokens
// ============================================================================

export async function GET() {
  try {
    const wipeService = createWipeService();
    await wipeService.initialize();

    const pendingWipes = wipeService.getPendingWipes();

    wipeService.destroy();

    return NextResponse.json({
      pendingTokens: pendingWipes
        .filter((w) => w.type === "remote")
        .map((w) => ({
          id: w.id,
          targetDeviceId: w.targetId,
          status: w.status,
          requestedAt: w.requestedAt,
          expiresAt: w.expiresAt,
        })),
    });
  } catch (error) {
    logger.error("Get tokens API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
