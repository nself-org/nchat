/**
 * Panic Mode API Routes
 *
 * Endpoints for emergency lockout operations.
 *
 * POST /api/security/panic - Activate panic mode
 * GET /api/security/panic - Get panic mode status
 * PUT /api/security/panic - Update panic mode configuration
 * DELETE /api/security/panic - Deactivate panic mode
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createWipeService } from "@/services/security/wipe.service";
import {
  createPanicModeManager,
  type PanicModeConfig,
  type PanicActivationMethod,
} from "@/lib/security/panic-mode";

// ============================================================================
// Types
// ============================================================================

interface ActivatePanicBody {
  method?: PanicActivationMethod;
  reason: string;
  notifyContacts?: boolean;
  preserveEvidence?: boolean;
}

interface UpdatePanicConfigBody {
  config: Partial<PanicModeConfig>;
}

interface DeactivatePanicBody {
  masterPassword: string;
}

// ============================================================================
// POST - Activate Panic Mode
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ActivatePanicBody;

    if (!body.reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    const activation = await wipeService.emergencyLockout({
      reason: body.reason,
      activationMethod: body.method || "manual",
      notifyContacts: body.notifyContacts,
      preserveEvidence: body.preserveEvidence,
    });

    wipeService.destroy();

    logger.security("Panic mode activated via API", {
      activationId: activation.id,
      method: activation.method,
    });

    return NextResponse.json({
      success: true,
      activation: {
        id: activation.id,
        timestamp: activation.timestamp,
        method: activation.method,
        wipeSuccess: activation.wipeResult?.success,
        keysDestroyed: activation.wipeResult?.keysDestroyed,
        lockoutUntil: activation.lockoutUntil,
        decoyActivated: activation.decoyActivated,
        notificationsSent: activation.notificationsSent,
      },
    });
  } catch (error) {
    logger.error("Panic activation API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Panic Mode Status
// ============================================================================

export async function GET() {
  try {
    const wipeService = createWipeService();
    await wipeService.initialize();

    const status = await wipeService.getPanicStatus();

    wipeService.destroy();

    return NextResponse.json({
      state: status.state,
      enabled: status.config.enabled,
      decoyActive: status.decoyActive,
      duressPin: {
        enabled: status.config.duressPin.enabled,
      },
      deadManSwitch: status.deadManStatus,
      lastActivation: status.lastActivation
        ? {
            id: status.lastActivation.id,
            timestamp: status.lastActivation.timestamp,
            method: status.lastActivation.method,
            lockoutUntil: status.lastActivation.lockoutUntil,
          }
        : null,
      config: {
        showDecoy: status.config.showDecoy,
        notifyContacts: status.config.notifyContacts,
        trustedContactCount: status.config.trustedContactIds.length,
        lockoutDuration: status.config.lockoutDuration,
        requireReSetup: status.config.requireReSetup,
      },
    });
  } catch (error) {
    logger.error("Panic status API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT - Update Panic Mode Configuration
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdatePanicConfigBody;

    if (!body.config) {
      return NextResponse.json(
        { error: "Configuration is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    await wipeService.updatePanicConfig(body.config);

    const status = await wipeService.getPanicStatus();

    wipeService.destroy();

    logger.info("Panic mode configuration updated via API");

    return NextResponse.json({
      success: true,
      config: {
        enabled: status.config.enabled,
        showDecoy: status.config.showDecoy,
        notifyContacts: status.config.notifyContacts,
        lockoutDuration: status.config.lockoutDuration,
      },
    });
  } catch (error) {
    logger.error("Panic config update API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Deactivate Panic Mode
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as DeactivatePanicBody;

    if (!body.masterPassword) {
      return NextResponse.json(
        { error: "Master password is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    const success = await wipeService.deactivatePanicMode(body.masterPassword);

    wipeService.destroy();

    if (success) {
      logger.security("Panic mode deactivated via API");

      return NextResponse.json({
        success: true,
        message: "Panic mode deactivated",
      });
    }

    return NextResponse.json(
      {
        error:
          "Failed to deactivate - invalid password or still in lockout period",
      },
      { status: 403 },
    );
  } catch (error) {
    logger.error("Panic deactivation API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
