/**
 * Single Channel API Route
 *
 * Handles operations on a specific channel.
 *
 * GET /api/channels/[id] - Get channel details
 * PATCH /api/channels/[id] - Update channel
 * DELETE /api/channels/[id] - Delete/archive channel
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
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
// VALIDATION SCHEMAS
// ============================================================================

const UpdateChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(
      /^[a-z0-9-]+$/,
      "Name must be lowercase letters, numbers, and hyphens only",
    )
    .optional(),
  description: z.string().max(500).optional().nullable(),
  topic: z.string().max(250).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
  isReadonly: z.boolean().optional(),
  maxMembers: z.number().int().positive().optional().nullable(),
  slowmodeSeconds: z.number().int().min(0).max(21600).optional(),
});

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
// GET /api/channels/[id] - Get channel details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("GET /api/channels/[id] - Get channel request", {
      channelId: id,
    });

    // Validate channel ID
    if (!validateChannelId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);
    const userRole = getUserRoleFromRequest(request);

    const channelService = createChannelService(apolloClient);
    const permissionsService = createPermissionsService(apolloClient);

    // Get channel
    const channel = await channelService.getChannelById(id);

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    // Check view permission
    if (userId) {
      const canView = await permissionsService.canViewChannel(
        id,
        userId,
        userRole,
      );
      if (!canView) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 },
        );
      }
    } else if (channel.type !== "public") {
      // Anonymous users can only view public channels
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get channel stats
    const stats = await channelService.getChannelStats(id);

    logger.info("GET /api/channels/[id] - Success", { channelId: id });

    return NextResponse.json({
      success: true,
      channel: {
        ...channel,
        stats,
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/channels/[id] - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch channel",
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

// ============================================================================
// PATCH /api/channels/[id] - Update channel
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("PATCH /api/channels/[id] - Update channel request", {
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

    const body = await request.json();

    // Validate request body
    const validation = UpdateChannelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updates = validation.data;

    const channelService = createChannelService(apolloClient);
    const permissionsService = createPermissionsService(apolloClient);

    // Check if channel exists
    const existingChannel = await channelService.getChannelById(id);
    if (!existingChannel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    // Check update permission
    const canUpdate = await permissionsService.canPerformAction(
      id,
      userId,
      userRole,
      "canUpdateSettings",
    );
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions to update channel" },
        { status: 403 },
      );
    }

    // Update the channel
    const channel = await channelService.updateChannel(id, updates);

    logger.info("PATCH /api/channels/[id] - Channel updated", {
      channelId: id,
      updatedBy: userId,
      updates: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      channel,
      message: "Channel updated successfully",
    });
  } catch (error) {
    const { id } = await params;
    logger.error("PATCH /api/channels/[id] - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update channel",
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

// ============================================================================
// DELETE /api/channels/[id] - Delete/archive channel
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("DELETE /api/channels/[id] - Delete channel request", {
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

    // Check for hard delete flag
    const searchParams = request.nextUrl.searchParams;
    const hardDelete = searchParams.get("hardDelete") === "true";

    const channelService = createChannelService(apolloClient);
    const permissionsService = createPermissionsService(apolloClient);

    // Check if channel exists
    const existingChannel = await channelService.getChannelById(id);
    if (!existingChannel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    // Prevent deletion of default channels
    if (existingChannel.isDefault && hardDelete) {
      return NextResponse.json(
        { success: false, error: "Cannot delete default channel" },
        { status: 403 },
      );
    }

    if (hardDelete) {
      // Check delete permission
      const canDelete = await permissionsService.canPerformAction(
        id,
        userId,
        userRole,
        "canDelete",
      );
      if (!canDelete) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient permissions to delete channel",
          },
          { status: 403 },
        );
      }

      // Hard delete
      const deleted = await channelService.deleteChannel(id);
      logger.warn("DELETE /api/channels/[id] - Channel hard deleted", {
        channelId: id,
        channelName: deleted.name,
        deletedBy: userId,
      });

      return NextResponse.json({
        success: true,
        message: "Channel deleted permanently",
        channelId: deleted.id,
        channelName: deleted.name,
      });
    } else {
      // Check archive permission
      const canArchive = await permissionsService.canPerformAction(
        id,
        userId,
        userRole,
        "canArchive",
      );
      if (!canArchive) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient permissions to archive channel",
          },
          { status: 403 },
        );
      }

      // Soft delete (archive)
      const archivedChannel = await channelService.archiveChannel(id);
      logger.info("DELETE /api/channels/[id] - Channel archived", {
        channelId: id,
        archivedBy: userId,
      });

      return NextResponse.json({
        success: true,
        message: "Channel archived successfully",
        channel: archivedChannel,
      });
    }
  } catch (error) {
    const { id } = await params;
    logger.error("DELETE /api/channels/[id] - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete channel",
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
