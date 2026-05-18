/**
 * Channel Join API Route
 *
 * Handles joining a public channel.
 *
 * POST /api/channels/[id]/join - Join a channel
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";
import {
  createChannelService,
  createMembershipService,
  createPermissionsService,
} from "@/services/channels";
import type { UserRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function getUserRoleFromRequest(request: NextRequest): UserRole {
  return (request.headers.get("x-user-role") as UserRole) || "guest";
}

function validateChannelId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// POST /api/channels/[id]/join - Join a channel
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("POST /api/channels/[id]/join - Join channel request", {
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

    const userRole = getUserRoleFromRequest(request);

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

    // Check if user can join
    const canJoinResult = await permissionsService.canJoinChannel(
      id,
      userId,
      userRole,
    );
    if (!canJoinResult.canJoin) {
      return NextResponse.json(
        {
          success: false,
          error: canJoinResult.reason || "Cannot join this channel",
        },
        { status: 403 },
      );
    }

    // Join the channel
    const membership = await membershipService.joinChannel(id, userId);

    logger.info("POST /api/channels/[id]/join - Joined channel", {
      channelId: id,
      userId,
      role: membership.role,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully joined channel",
      membership: {
        channelId: membership.channelId,
        userId: membership.userId,
        role: membership.role,
        joinedAt: membership.joinedAt,
      },
      channel: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        type: channel.type,
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/channels/[id]/join - Error", error as Error, {
      channelId: id,
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "unique constraint",
        )
      ) {
        return NextResponse.json(
          { success: false, error: "Already a member of this channel" },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to join channel",
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
