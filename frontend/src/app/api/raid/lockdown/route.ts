/**
 * API Route: Raid Protection and Lockdown Management
 * GET /api/raid/lockdown - Get lockdown status
 * POST /api/raid/lockdown - Activate lockdown
 * DELETE /api/raid/lockdown - Deactivate lockdown
 */

import { NextRequest, NextResponse } from "next/server";
import { getRaidProtection, LOCKDOWN_PRESETS } from "@/lib/spam";
import type { LockdownLevel } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_LEVELS: LockdownLevel[] = ["none", "partial", "full", "emergency"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const channelId = searchParams.get("channelId") || undefined;
    const all = searchParams.get("all") === "true";
    const presets = searchParams.get("presets") === "true";

    const protection = getRaidProtection();

    // Get lockdown presets
    if (presets) {
      return NextResponse.json({
        success: true,
        presets: LOCKDOWN_PRESETS,
      });
    }

    // Get all active lockdowns
    if (all) {
      const lockdowns = protection.getActiveLockdowns();
      return NextResponse.json({
        success: true,
        lockdowns,
        count: lockdowns.length,
      });
    }

    // Get specific lockdown status
    if (workspaceId) {
      const lockdown = protection.getLockdown(workspaceId, channelId);
      const isLockedDown = protection.isLockedDown(workspaceId, channelId);

      return NextResponse.json({
        success: true,
        workspaceId,
        channelId,
        isLockedDown,
        lockdown,
      });
    }

    // Get stats
    const stats = protection.getStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Failed to get lockdown info:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "lockdown" },
    });

    return NextResponse.json(
      { error: "Failed to get lockdown information" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      level,
      workspaceId,
      activatedBy,
      channelId,
      reason,
      duration,
      customRestrictions,
    } = body;

    if (!level || !workspaceId || !activatedBy) {
      return NextResponse.json(
        { error: "level, workspaceId, and activatedBy are required" },
        { status: 400 },
      );
    }

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Valid levels: ${VALID_LEVELS.join(", ")}` },
        { status: 400 },
      );
    }

    const protection = getRaidProtection();

    const lockdown = protection.activateLockdown(
      level,
      workspaceId,
      activatedBy,
      {
        channelId,
        reason,
        duration,
        customRestrictions,
      },
    );

    logger.info("Lockdown activated", {
      level,
      workspaceId,
      channelId,
      activatedBy,
    });

    return NextResponse.json({
      success: true,
      lockdown,
    });
  } catch (error) {
    logger.error("Failed to activate lockdown:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "lockdown" },
    });

    return NextResponse.json(
      { error: "Failed to activate lockdown" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const channelId = searchParams.get("channelId") || undefined;
    const deactivatedBy = searchParams.get("deactivatedBy") || undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const protection = getRaidProtection();
    const success = protection.deactivateLockdown(
      workspaceId,
      channelId,
      deactivatedBy,
    );

    if (!success) {
      return NextResponse.json(
        { error: "No active lockdown found" },
        { status: 404 },
      );
    }

    logger.info("Lockdown deactivated", {
      workspaceId,
      channelId,
      deactivatedBy,
    });

    return NextResponse.json({
      success: true,
      message: "Lockdown deactivated",
    });
  } catch (error) {
    logger.error("Failed to deactivate lockdown:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "lockdown" },
    });

    return NextResponse.json(
      { error: "Failed to deactivate lockdown" },
      { status: 500 },
    );
  }
}

/**
 * Check if action is allowed during lockdown
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, workspaceId, userRole, channelId } = body;

    if (!action || !workspaceId) {
      return NextResponse.json(
        { error: "action and workspaceId are required" },
        { status: 400 },
      );
    }

    const validActions = ["join", "message", "invite", "dm"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid actions: ${validActions.join(", ")}` },
        { status: 400 },
      );
    }

    const protection = getRaidProtection();
    const result = protection.isActionAllowed(
      action,
      workspaceId,
      userRole,
      channelId,
    );

    return NextResponse.json({
      success: true,
      action,
      ...result,
    });
  } catch (error) {
    logger.error("Failed to check action permission:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "lockdown" },
    });

    return NextResponse.json(
      { error: "Failed to check action permission" },
      { status: 500 },
    );
  }
}
