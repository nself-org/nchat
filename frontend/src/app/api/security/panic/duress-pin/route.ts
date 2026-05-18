/**
 * Duress PIN API Routes
 *
 * Endpoints for managing duress PIN (panic activation PIN).
 *
 * POST /api/security/panic/duress-pin - Set duress PIN
 * GET /api/security/panic/duress-pin - Check if duress PIN is set
 * DELETE /api/security/panic/duress-pin - Remove duress PIN
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createWipeService } from "@/services/security/wipe.service";

// ============================================================================
// Types
// ============================================================================

interface SetDuressPinBody {
  pin: string;
}

interface CheckDuressPinBody {
  pin: string;
}

// ============================================================================
// POST - Set or Check Duress PIN
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as
      | SetDuressPinBody
      | CheckDuressPinBody;

    if (!body.pin) {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(body.pin)) {
      return NextResponse.json(
        { error: "PIN must be 4-8 digits" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const wipeService = createWipeService();
    await wipeService.initialize();

    if (action === "check") {
      // Check if the provided PIN is the duress PIN
      const isDuressPin = await wipeService.checkDuressPin(body.pin);

      wipeService.destroy();

      return NextResponse.json({
        isDuressPin,
      });
    }

    // Set the duress PIN
    await wipeService.setDuressPin(body.pin);

    wipeService.destroy();

    logger.security("Duress PIN set via API");

    return NextResponse.json({
      success: true,
      message: "Duress PIN set successfully",
    });
  } catch (error) {
    logger.error("Duress PIN API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Check if Duress PIN is Set
// ============================================================================

export async function GET() {
  try {
    const wipeService = createWipeService();
    await wipeService.initialize();

    const status = await wipeService.getPanicStatus();

    wipeService.destroy();

    return NextResponse.json({
      enabled: status.config.duressPin.enabled,
      hasPin: status.config.duressPin.pinHash !== null,
    });
  } catch (error) {
    logger.error("Duress PIN status API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Remove Duress PIN
// ============================================================================

export async function DELETE() {
  try {
    const wipeService = createWipeService();
    await wipeService.initialize();

    await wipeService.removeDuressPin();

    wipeService.destroy();

    logger.security("Duress PIN removed via API");

    return NextResponse.json({
      success: true,
      message: "Duress PIN removed",
    });
  } catch (error) {
    logger.error("Duress PIN removal API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
