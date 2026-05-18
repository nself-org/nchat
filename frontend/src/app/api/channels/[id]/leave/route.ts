/**
 * Channel Leave API Route
 *
 * Handles leaving a channel.
 *
 * POST /api/channels/[id]/leave - Leave a channel
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";
import {
  createChannelService,
  createMembershipService,
  createPermissionsService,
} from "@/services/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function validateChannelId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// POST /api/channels/[id]/leave - Leave a channel
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("POST /api/channels/[id]/leave - Leave channel request", {
      channelId: id,
    });

    // Validate channel ID
    if (!validateChannelId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const channelService = createChannelService(apolloClient);
    const membershipService = createMembershipService(apolloClient);
    const permissionsService = createPermissionsService(apolloClient);

    // Check if channel exists
    const channel = await channelService.getChannelById(id);
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    // Check if user can leave
    const canLeaveResult = await permissionsService.canLeaveChannel(id, userId);
    if (!canLeaveResult.canLeave) {
      return NextResponse.json(
        {
          success: false,
          error: canLeaveResult.reason || "Cannot leave this channel",
        },
        { status: 403 },
      );
    }

    // Leave the channel
    const left = await membershipService.leaveChannel(id, userId);

    if (!left) {
      return NextResponse.json(
        { success: false, error: "Not a member of this channel" },
        { status: 404 },
      );
    }

    logger.info("POST /api/channels/[id]/leave - Left channel", {
      channelId: id,
      userId,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully left channel",
      channelId: id,
      channelName: channel.name,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/channels/[id]/leave - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to leave channel",
        message:
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
