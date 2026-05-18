/**
 * Wipe API Routes
 *
 * Endpoints for session and device wipe operations.
 *
 * POST /api/security/wipe - Initiate a wipe operation
 * GET /api/security/wipe - Get wipe status and history
 * DELETE /api/security/wipe - Cancel a pending wipe
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createWipeService,
  type SessionKillRequest,
  type DeviceWipeRequest,
} from "@/services/security/wipe.service";
import {
  createSessionWipeManager,
  type WipeConfig,
} from "@/lib/security/session-wipe";

// ============================================================================
// Types
// ============================================================================

interface WipeRequestBody {
  type: "session" | "device" | "remote";
  sessionId?: string;
  deviceId?: string;
  reason: string;
  config?: Partial<WipeConfig>;
  token?: string;
}

interface CancelWipeBody {
  wipeId: string;
}

// ============================================================================
// POST - Initiate Wipe
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WipeRequestBody;

    // Validate request
    if (!body.type) {
      return NextResponse.json(
        { error: "Wipe type is required" },
        { status: 400 },
      );
    }

    if (!body.reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    let result;

    switch (body.type) {
      case "session":
        if (!body.sessionId) {
          return NextResponse.json(
            { error: "Session ID is required for session wipe" },
            { status: 400 },
          );
        }

        const sessionRequest: SessionKillRequest = {
          sessionId: body.sessionId,
          reason: body.reason,
          preserveEvidence: body.config?.preserveEvidence ?? true,
        };

        result = await wipeService.killSession(sessionRequest);

        logger.security("Session wipe requested via API", {
          sessionId: body.sessionId,
          success: result.success,
        });

        break;

      case "device":
        if (!body.deviceId) {
          return NextResponse.json(
            { error: "Device ID is required for device wipe" },
            { status: 400 },
          );
        }

        const deviceRequest: DeviceWipeRequest = {
          deviceId: body.deviceId,
          reason: body.reason,
          config: body.config,
        };

        result = await wipeService.wipeDevice(deviceRequest);

        logger.security("Device wipe requested via API", {
          deviceId: body.deviceId,
          success: result.success,
        });

        break;

      case "remote":
        if (!body.deviceId) {
          return NextResponse.json(
            { error: "Device ID is required for remote wipe" },
            { status: 400 },
          );
        }

        if (!body.token) {
          return NextResponse.json(
            { error: "Token is required for remote wipe" },
            { status: 400 },
          );
        }

        result = await wipeService.executeRemoteWipe(
          body.deviceId,
          body.token,
          body.config,
        );

        logger.security("Remote wipe executed via API", {
          deviceId: body.deviceId,
          success: result.success,
        });

        break;

      default:
        return NextResponse.json(
          { error: "Invalid wipe type" },
          { status: 400 },
        );
    }

    wipeService.destroy();

    return NextResponse.json({
      success: result.success,
      wipeId: result.wipeId,
      type: result.type,
      state: result.state,
      keysDestroyed: result.keysDestroyed,
      dataWiped: result.dataWiped,
      error: result.error,
      completedAt: result.completedAt,
    });
  } catch (error) {
    logger.error("Wipe API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Wipe Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wipeId = searchParams.get("wipeId");

    const wipeManager = createSessionWipeManager();
    await wipeManager.initialize();

    const wipeService = createWipeService();
    await wipeService.initialize();

    if (wipeId) {
      // Get specific wipe verification
      const verification = await wipeService.verifyWipe(wipeId);

      wipeManager.destroy();
      wipeService.destroy();

      return NextResponse.json({
        wipeId,
        verification,
      });
    }

    // Get general wipe status
    const state = wipeService.getState();
    const evidence = await wipeService.getWipeEvidence();
    const proofs = await wipeService.getKeyDestructionProofs();
    const pendingWipes = wipeService.getPendingWipes();

    wipeManager.destroy();
    wipeService.destroy();

    return NextResponse.json({
      state: {
        initialized: state.initialized,
        remoteWipeEnabled: state.remoteWipeEnabled,
        panicModeEnabled: state.panicModeEnabled,
        lastWipeResult: state.lastWipeResult,
      },
      pendingWipes,
      evidenceCount: evidence.length,
      proofsCount: proofs.length,
      recentEvidence: evidence.slice(-5),
    });
  } catch (error) {
    logger.error("Wipe status API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Cancel Pending Wipe
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as CancelWipeBody;

    if (!body.wipeId) {
      return NextResponse.json(
        { error: "Wipe ID is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    const cancelled = await wipeService.cancelRemoteWipe(body.wipeId);

    wipeService.destroy();

    if (cancelled) {
      logger.info("Pending wipe cancelled via API", { wipeId: body.wipeId });

      return NextResponse.json({
        success: true,
        wipeId: body.wipeId,
        message: "Wipe cancelled successfully",
      });
    }

    return NextResponse.json(
      { error: "Wipe not found or already processed" },
      { status: 404 },
    );
  } catch (error) {
    logger.error("Cancel wipe API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
