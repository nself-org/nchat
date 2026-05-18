/**
 * API Route: Moderation Actions (v0.7.0)
 * POST /api/moderation/actions - Take moderation action
 * Enhanced with ModerationActions class
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { ModerationQueue } from "@/lib/moderation/moderation-queue";
import { ModerationActions } from "@/lib/moderation/actions";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      itemId,
      action,
      moderatorId,
      reason,
      appealText,
      targetType,
      targetId,
      targetUserId,
      duration, // Duration in minutes for temporary actions
      bulk, // Array of targets for bulk actions
    } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    const apolloClient = getApolloClient();
    const queue = new ModerationQueue(apolloClient);
    const actions = new ModerationActions(apolloClient);

    let result: any;

    // Bulk actions
    if (bulk && Array.isArray(bulk)) {
      if (!moderatorId) {
        return NextResponse.json(
          { error: "Moderator ID is required for bulk actions" },
          { status: 400 },
        );
      }

      result = await actions.bulkAction(
        action,
        bulk,
        moderatorId,
        reason || "Bulk moderation action",
        { duration },
      );

      return NextResponse.json({
        success: result.success,
        stats: {
          total: bulk.length,
          success: result.successCount,
          failure: result.failureCount,
        },
        results: result.results,
        errors: result.errors,
      });
    }

    // Single actions
    switch (action) {
      case "flag":
        if (!targetType || !targetId || !targetUserId) {
          return NextResponse.json(
            { error: "targetType, targetId, and targetUserId are required" },
            { status: 400 },
          );
        }
        result = await actions.flagContent(
          targetType,
          targetId,
          targetUserId,
          moderatorId || "system",
          reason || "Flagged for review",
        );
        break;

      case "hide":
        if (!targetType || !targetId || !targetUserId) {
          return NextResponse.json(
            { error: "targetType, targetId, and targetUserId are required" },
            { status: 400 },
          );
        }
        result = await actions.hideContent(
          targetType,
          targetId,
          targetUserId,
          moderatorId || "system",
          reason || "Content hidden",
        );
        break;

      case "delete":
        if (!targetType || !targetId || !targetUserId) {
          return NextResponse.json(
            { error: "targetType, targetId, and targetUserId are required" },
            { status: 400 },
          );
        }
        result = await actions.deleteContent(
          targetType,
          targetId,
          targetUserId,
          moderatorId || "system",
          reason || "Content deleted",
        );
        break;

      case "warn":
        if (!moderatorId || !targetUserId) {
          return NextResponse.json(
            { error: "Moderator ID and target user ID are required" },
            { status: 400 },
          );
        }
        result = await actions.warnUser(
          targetUserId,
          moderatorId,
          reason || "Policy violation warning",
        );
        break;

      case "mute":
        if (!moderatorId || !targetUserId) {
          return NextResponse.json(
            { error: "Moderator ID and target user ID are required" },
            { status: 400 },
          );
        }
        result = await actions.muteUser(
          targetUserId,
          moderatorId,
          reason || "User muted",
          duration,
        );
        break;

      case "unmute":
        if (!moderatorId || !targetUserId) {
          return NextResponse.json(
            { error: "Moderator ID and target user ID are required" },
            { status: 400 },
          );
        }
        result = await actions.unmuteUser(
          targetUserId,
          moderatorId,
          reason || "User unmuted",
        );
        break;

      case "ban":
        if (!moderatorId || !targetUserId) {
          return NextResponse.json(
            { error: "Moderator ID and target user ID are required" },
            { status: 400 },
          );
        }
        result = await actions.banUser(
          targetUserId,
          moderatorId,
          reason || "User banned",
          duration,
        );
        break;

      case "unban":
        if (!moderatorId || !targetUserId) {
          return NextResponse.json(
            { error: "Moderator ID and target user ID are required" },
            { status: 400 },
          );
        }
        result = await actions.unbanUser(
          targetUserId,
          moderatorId,
          reason || "User unbanned",
        );
        break;

      case "approve":
        if (!moderatorId || !itemId) {
          return NextResponse.json(
            { error: "Moderator ID and item ID are required" },
            { status: 400 },
          );
        }
        // Use queue for approval (maintains existing behavior)
        await queue.approveContent(itemId, moderatorId, reason);
        result = { success: true, message: "Content approved" };
        break;

      case "reject":
        if (!moderatorId || !itemId) {
          return NextResponse.json(
            { error: "Moderator ID and item ID are required" },
            { status: 400 },
          );
        }
        // Use queue for rejection (maintains existing behavior)
        await queue.rejectContent(itemId, moderatorId, reason);
        result = { success: true, message: "Content rejected" };
        break;

      case "appeal":
        if (!itemId || !appealText) {
          return NextResponse.json(
            { error: "Item ID and appeal text are required" },
            { status: 400 },
          );
        }
        await queue.submitAppeal(itemId, appealText);
        result = { success: true, message: "Appeal submitted" };
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: result.success,
      actionId: result.actionId,
      message: result.message,
      affectedItems: result.affectedItems,
      error: result.error,
    });
  } catch (error) {
    logger.error("Moderation action error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "actions", version: "v0.7.0" },
    });

    return NextResponse.json(
      {
        error: "Failed to perform moderation action",
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
 * GET: Get action audit log
 */
export async function GET(request: NextRequest) {
  try {
    const apolloClient = getApolloClient();
    const actions = new ModerationActions(apolloClient);

    const auditLog = actions.getAuditLog();

    return NextResponse.json({
      success: true,
      auditLog,
      count: auditLog.length,
    });
  } catch (error) {
    logger.error("Get audit log error:", error);
    return NextResponse.json(
      {
        error: "Failed to get audit log",
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
