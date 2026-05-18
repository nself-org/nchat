/**
 * API Route: User Penalties (Mute/Ban/Timeout)
 * GET /api/moderation/penalties - Get penalties with filters
 * POST /api/moderation/penalties - Apply a penalty
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getModerationEngine,
  parseDuration,
} from "@/services/moderation/moderation-engine.service";
import type { TimeoutDuration } from "@/services/moderation/moderation-engine.service";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Fetch penalties with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const workspaceId = searchParams.get("workspaceId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const engine = getModerationEngine();

    // Get user's active penalties
    if (userId && workspaceId) {
      const penalties = engine.getUserActivePenalties(userId, workspaceId);
      return NextResponse.json({
        success: true,
        penalties,
        isMuted: engine.isUserMuted(userId, workspaceId),
        isBanned: engine.isUserBanned(userId, workspaceId),
        isTimedOut: engine.isUserTimedOut(userId, workspaceId),
      });
    }

    // Get user action history
    if (userId) {
      const history = engine.getUserActionHistory(userId);
      const penalties = engine.getUserActivePenalties(userId);
      return NextResponse.json({
        success: true,
        actionHistory: history,
        activePenalties: penalties,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Provide userId and workspaceId to fetch penalties",
    });
  } catch (error) {
    logger.error("Get penalties error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "penalties-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch penalties",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST: Apply a penalty (mute, ban, timeout, warn)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      targetUserId,
      moderatorId,
      moderatorName,
      reason,
      workspaceId,
      channelId,
      duration, // Can be string like '1h' or number in ms
    } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 },
      );
    }

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();
    let result: any;

    // Parse duration
    let durationMs: number | undefined;
    if (duration) {
      if (typeof duration === "string") {
        // Try to parse as TimeoutDuration
        durationMs = parseDuration(duration as TimeoutDuration);
      } else if (typeof duration === "number") {
        durationMs = duration;
      }
    }

    switch (action) {
      case "warn":
        result = engine.warnUser({
          targetUserId,
          moderatorId,
          moderatorName,
          reason,
          channelId,
          workspaceId,
        });
        break;

      case "mute":
        result = engine.muteUser({
          targetUserId,
          moderatorId,
          moderatorName,
          reason,
          workspaceId,
          channelId,
          duration: durationMs,
        });
        break;

      case "unmute":
        result = engine.unmuteUser({
          targetUserId,
          moderatorId,
          reason,
          workspaceId,
          channelId,
        });
        break;

      case "kick":
        if (!channelId) {
          return NextResponse.json(
            { error: "Channel ID is required for kick" },
            { status: 400 },
          );
        }
        result = engine.kickUser({
          targetUserId,
          moderatorId,
          moderatorName,
          reason,
          channelId,
        });
        break;

      case "ban":
        result = engine.banUser({
          targetUserId,
          moderatorId,
          moderatorName,
          reason,
          workspaceId,
          channelId,
          duration: durationMs,
        });
        break;

      case "unban":
        result = engine.unbanUser({
          targetUserId,
          moderatorId,
          reason,
          workspaceId,
          channelId,
        });
        break;

      case "timeout":
        if (!duration) {
          return NextResponse.json(
            { error: "Duration is required for timeout" },
            { status: 400 },
          );
        }
        result = engine.timeoutUser({
          userId: targetUserId,
          moderatorId,
          reason,
          workspaceId,
          channelId,
          duration: duration as TimeoutDuration,
        });
        break;

      case "remove_timeout":
        result = engine.removeTimeout({
          userId: targetUserId,
          moderatorId,
          reason,
          workspaceId,
          channelId,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 },
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action: result.action,
      penalty: result.penalty,
      timeout: result.timeout,
      escalated: result.escalated,
      message: `${action} action applied successfully`,
    });
  } catch (error) {
    logger.error("Apply penalty error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "penalties-post" },
    });

    return NextResponse.json(
      {
        error: "Failed to apply penalty",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
