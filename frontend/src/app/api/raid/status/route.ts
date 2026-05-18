/**
 * API Route: Raid Detection and Status
 * GET /api/raid/status - Get raid events and statistics
 * POST /api/raid/status - Record a join event and check for raids
 * PUT /api/raid/status - Update raid status or apply mitigation
 */

import { NextRequest, NextResponse } from "next/server";
import { getRaidProtection } from "@/lib/spam";
import type { RaidStatus, JoinEvent } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const raidId = searchParams.get("raidId");
    const active = searchParams.get("active") === "true";
    const velocity = searchParams.get("velocity") === "true";
    const channelId = searchParams.get("channelId") || undefined;
    const recentJoins = searchParams.get("recentJoins") === "true";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const protection = getRaidProtection();

    // Get specific raid
    if (raidId) {
      const raid = protection.getRaid(raidId);

      if (!raid) {
        return NextResponse.json({ error: "Raid not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        raid,
      });
    }

    // Get join velocity
    if (velocity && workspaceId) {
      const velocityValue = protection.getJoinVelocity(workspaceId, channelId);
      return NextResponse.json({
        success: true,
        workspaceId,
        channelId,
        joinsPerMinute: velocityValue,
      });
    }

    // Get recent joins
    if (recentJoins && workspaceId) {
      const joins = protection.getRecentJoins(workspaceId, channelId, limit);
      return NextResponse.json({
        success: true,
        workspaceId,
        channelId,
        joins,
        count: joins.length,
      });
    }

    // Get active raids
    if (active) {
      const raids = protection.getActiveRaids(workspaceId || undefined);
      return NextResponse.json({
        success: true,
        raids,
        count: raids.length,
      });
    }

    // Get stats
    const stats = protection.getStats();
    const config = protection.getConfig();

    return NextResponse.json({
      success: true,
      stats,
      config,
    });
  } catch (error) {
    logger.error("Failed to get raid status:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "status" },
    });

    return NextResponse.json(
      { error: "Failed to get raid status" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      userId,
      username,
      workspaceId,
      channelId,
      inviteCode,
      sourceIp,
      accountCreatedAt,
      userAgent,
    } = body;

    const protection = getRaidProtection();

    // Record a join event
    if (action === "join" || (userId && workspaceId)) {
      if (!userId || !username || !workspaceId) {
        return NextResponse.json(
          { error: "userId, username, and workspaceId are required" },
          { status: 400 },
        );
      }

      const joinEvent: JoinEvent = {
        userId,
        username,
        workspaceId,
        channelId,
        inviteCode,
        sourceIp,
        accountCreatedAt: accountCreatedAt
          ? new Date(accountCreatedAt)
          : new Date(),
        joinedAt: new Date(),
        userAgent,
      };

      const result = protection.recordJoin(joinEvent);

      return NextResponse.json({
        success: true,
        allowed: result.allowed,
        raidDetected: result.raidDetected,
        ...(result.raid && {
          raid: {
            id: result.raid.id,
            type: result.raid.type,
            severity: result.raid.severity,
            status: result.raid.status,
            participantCount: result.raid.participantCount,
          },
        }),
        ...(result.reason && { reason: result.reason }),
      });
    }

    // Analyze patterns without recording
    if (action === "analyze") {
      if (!workspaceId) {
        return NextResponse.json(
          { error: "workspaceId is required" },
          { status: 400 },
        );
      }

      const analysis = protection.analyzeJoinPatterns(workspaceId, channelId);

      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: join or analyze" },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to process join event:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "status" },
    });

    return NextResponse.json(
      { error: "Failed to process join event" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      raidId,
      action,
      status,
      note,
      mitigationType,
      mitigationDetails,
      appliedBy,
      moderatorId,
    } = body;

    if (!raidId) {
      return NextResponse.json(
        { error: "raidId is required" },
        { status: 400 },
      );
    }

    const protection = getRaidProtection();

    // Update raid status
    if (action === "updateStatus" || status) {
      const validStatuses: RaidStatus[] = [
        "detected",
        "active",
        "mitigated",
        "resolved",
        "escalated",
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Valid statuses: ${validStatuses.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const raid = protection.updateRaidStatus(raidId, status, note);

      if (!raid) {
        return NextResponse.json({ error: "Raid not found" }, { status: 404 });
      }

      logger.info("Raid status updated", { raidId, status });

      return NextResponse.json({
        success: true,
        raid,
      });
    }

    // Apply mitigation
    if (action === "mitigate") {
      const validMitigations = [
        "lockdown",
        "ban_wave",
        "invite_revoke",
        "slowmode",
        "verification_required",
        "dm_restriction",
        "manual_review",
      ];

      if (!validMitigations.includes(mitigationType)) {
        return NextResponse.json(
          {
            error: `Invalid mitigation type. Valid types: ${validMitigations.join(", ")}`,
          },
          { status: 400 },
        );
      }

      if (!appliedBy) {
        return NextResponse.json(
          { error: "appliedBy is required" },
          { status: 400 },
        );
      }

      const raid = protection.applyMitigation(raidId, {
        type: mitigationType,
        appliedBy,
        details: mitigationDetails || `Applied ${mitigationType}`,
      });

      if (!raid) {
        return NextResponse.json({ error: "Raid not found" }, { status: 404 });
      }

      logger.info("Mitigation applied to raid", { raidId, mitigationType });

      return NextResponse.json({
        success: true,
        raid,
      });
    }

    // Ban raid participants
    if (action === "banParticipants") {
      if (!moderatorId) {
        return NextResponse.json(
          { error: "moderatorId is required" },
          { status: 400 },
        );
      }

      const result = protection.banRaidParticipants(raidId, moderatorId);

      logger.info("Raid participants banned", {
        raidId,
        bannedCount: result.banned.length,
      });

      return NextResponse.json({
        success: true,
        banned: result.banned,
        failed: result.failed,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use: updateStatus, mitigate, or banParticipants",
      },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to update raid:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "status" },
    });

    return NextResponse.json(
      { error: "Failed to update raid" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: "config is required" },
        { status: 400 },
      );
    }

    const protection = getRaidProtection();
    protection.updateConfig(config);

    const updatedConfig = protection.getConfig();

    logger.info("Raid protection config updated");

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error) {
    logger.error("Failed to update raid config:", error);
    captureError(error as Error, {
      tags: { feature: "raid", endpoint: "status" },
    });

    return NextResponse.json(
      { error: "Failed to update raid configuration" },
      { status: 500 },
    );
  }
}
