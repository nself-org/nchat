/**
 * API Route: Bulk Moderation Actions
 * POST /api/moderation/bulk - Execute bulk moderation actions
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
 * POST: Execute bulk moderation actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      moderatorId,
      moderatorName,
      reason,
      workspaceId,
      channelId,
      duration,
      // Action-specific parameters
      userIds, // For bulk ban/mute
      messageIds, // For bulk delete
      messageCount, // For purge
      beforeDate, // For purge
      fromUserId, // For purge
    } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
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

    const engine = getModerationEngine();

    // Parse duration if provided
    let durationMs: number | undefined;
    if (duration) {
      if (typeof duration === "string") {
        durationMs = parseDuration(duration as TimeoutDuration);
      } else if (typeof duration === "number") {
        durationMs = duration;
      }
    }

    let result: any;

    switch (action) {
      case "bulk_ban":
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json(
            { error: "User IDs array is required" },
            { status: 400 },
          );
        }
        if (!workspaceId) {
          return NextResponse.json(
            { error: "Workspace ID is required" },
            { status: 400 },
          );
        }
        if (userIds.length > 100) {
          return NextResponse.json(
            { error: "Maximum 100 users per bulk action" },
            { status: 400 },
          );
        }
        result = engine.bulkBanUsers({
          userIds,
          moderatorId,
          reason,
          workspaceId,
          duration: durationMs,
        });
        break;

      case "bulk_mute":
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json(
            { error: "User IDs array is required" },
            { status: 400 },
          );
        }
        if (!workspaceId) {
          return NextResponse.json(
            { error: "Workspace ID is required" },
            { status: 400 },
          );
        }
        if (userIds.length > 100) {
          return NextResponse.json(
            { error: "Maximum 100 users per bulk action" },
            { status: 400 },
          );
        }
        result = engine.bulkMuteUsers({
          userIds,
          moderatorId,
          reason,
          workspaceId,
          duration: durationMs,
        });
        break;

      case "bulk_delete":
        if (
          !messageIds ||
          !Array.isArray(messageIds) ||
          messageIds.length === 0
        ) {
          return NextResponse.json(
            { error: "Message IDs array is required" },
            { status: 400 },
          );
        }
        if (!channelId) {
          return NextResponse.json(
            { error: "Channel ID is required" },
            { status: 400 },
          );
        }
        if (messageIds.length > 500) {
          return NextResponse.json(
            { error: "Maximum 500 messages per bulk delete" },
            { status: 400 },
          );
        }
        result = engine.bulkDeleteMessages({
          messageIds,
          moderatorId,
          reason,
          channelId,
        });
        break;

      case "purge":
        if (!channelId) {
          return NextResponse.json(
            { error: "Channel ID is required" },
            { status: 400 },
          );
        }
        result = engine.purgeChannelHistory({
          channelId,
          moderatorId,
          reason,
          messageCount,
          beforeDate: beforeDate ? new Date(beforeDate) : undefined,
          fromUserId,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Invalid bulk action: ${action}` },
          { status: 400 },
        );
    }

    // Build response based on action type
    const response: any = {
      success: result.success,
      message: result.success
        ? `Bulk ${action} completed successfully`
        : `Bulk ${action} completed with errors`,
    };

    // Add action-specific details
    if (action === "bulk_ban") {
      response.stats = {
        total: userIds.length,
        banned: result.bannedCount,
        failed: userIds.length - result.bannedCount,
      };
      if (result.errors?.length > 0) {
        response.errors = result.errors;
      }
    } else if (action === "bulk_mute") {
      response.stats = {
        total: userIds.length,
        muted: result.mutedCount,
        failed: userIds.length - result.mutedCount,
      };
      if (result.errors?.length > 0) {
        response.errors = result.errors;
      }
    } else if (action === "bulk_delete") {
      response.stats = {
        deletedCount: result.deletedCount,
      };
      response.action = result.action;
    } else if (action === "purge") {
      response.action = result.action;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Bulk moderation error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "bulk" },
    });

    return NextResponse.json(
      {
        error: "Failed to execute bulk action",
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
