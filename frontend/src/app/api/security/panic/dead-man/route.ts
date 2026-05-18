/**
 * Dead Man Switch API Routes
 *
 * Endpoints for managing the dead man switch feature.
 *
 * POST /api/security/panic/dead-man - Check in / arm / disarm
 * GET /api/security/panic/dead-man - Get status
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createWipeService } from "@/services/security/wipe.service";

// ============================================================================
// Types
// ============================================================================

interface DeadManActionBody {
  action: "check_in" | "arm" | "disarm";
}

// ============================================================================
// POST - Perform Dead Man Switch Action
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeadManActionBody;

    if (!body.action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    switch (body.action) {
      case "check_in":
        await wipeService.deadManCheckIn();
        logger.info("Dead man switch check-in via API");
        break;

      case "arm":
        await wipeService.armDeadManSwitch();
        logger.security("Dead man switch armed via API");
        break;

      case "disarm":
        await wipeService.disarmDeadManSwitch();
        logger.info("Dead man switch disarmed via API");
        break;

      default:
        wipeService.destroy();
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const status = await wipeService.getPanicStatus();

    wipeService.destroy();

    return NextResponse.json({
      success: true,
      action: body.action,
      status: status.deadManStatus,
    });
  } catch (error) {
    logger.error("Dead man switch API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Dead Man Switch Status
// ============================================================================

export async function GET() {
  try {
    const wipeService = createWipeService();
    await wipeService.initialize();

    const status = await wipeService.getPanicStatus();

    wipeService.destroy();

    if (!status.deadManStatus) {
      return NextResponse.json({
        enabled: false,
        armed: false,
        message: "Dead man switch is not enabled",
      });
    }

    return NextResponse.json({
      enabled: true,
      armed: status.deadManStatus.armed,
      lastCheckIn: status.deadManStatus.lastCheckIn,
      nextCheckInDue: status.deadManStatus.nextCheckInDue,
      warningThreshold: status.deadManStatus.warningThreshold,
      timeRemaining: status.deadManStatus.timeRemaining,
    });
  } catch (error) {
    logger.error("Dead man switch status API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
