/**
 * Channel Members API Route
 *
 * Handles member management for a specific channel.
 *
 * GET /api/channels/[id]/members - List channel members
 * POST /api/channels/[id]/members - Add/invite member(s)
 * DELETE /api/channels/[id]/members - Remove member(s)
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

const AddMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z
    .enum(["owner", "admin", "moderator", "member", "guest"])
    .default("member"),
});

const AddMembersBulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "At least one user ID required"),
  role: z
    .enum(["owner", "admin", "moderator", "member", "guest"])
    .default("member"),
});

const RemoveMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

const RemoveMembersBulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "At least one user ID required"),
});

const UpdateMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]).optional(),
  nickname: z.string().max(100).optional().nullable(),
  canRead: z.boolean().optional().nullable(),
  canWrite: z.boolean().optional().nullable(),
  canManage: z.boolean().optional().nullable(),
  canInvite: z.boolean().optional().nullable(),
  canPin: z.boolean().optional().nullable(),
  canDeleteMessages: z.boolean().optional().nullable(),
  canMentionEveryone: z.boolean().optional().nullable(),
});

const GetMembersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]).optional(),
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
// GET /api/channels/[id]/members - List channel members
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("GET /api/channels/[id]/members - List members request", {
      channelId: id,
    });

    if (!validateChannelId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);
    const userRole = getUserRoleFromRequest(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = GetMembersQuerySchema.safeParse({
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
      role: searchParams.get("role") || undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: queryValidation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { limit, offset, role: filterRole } = queryValidation.data;

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
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get members
    let result;
    if (filterRole) {
      const members = await membershipService.getChannelMembersByRole(
        id,
        filterRole,
      );
      result = {
        members,
        total: members.length,
        hasMore: false,
      };
    } else {
      result = await membershipService.getChannelMembers(id, limit, offset);
    }

    logger.info("GET /api/channels/[id]/members - Success", {
      channelId: id,
      total: result.total,
      returned: result.members.length,
    });

    return NextResponse.json({
      success: true,
      members: result.members,
      pagination: {
        total: result.total,
        offset,
        limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/channels/[id]/members - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch channel members",
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
// POST /api/channels/[id]/members - Add/invite member(s)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("POST /api/channels/[id]/members - Add member request", {
      channelId: id,
    });

    if (!validateChannelId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const actorUserId = getUserIdFromRequest(request);
    if (!actorUserId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const actorRole = getUserRoleFromRequest(request);
    const body = await request.json();

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

    // Check invite permission
    const canInvite = await permissionsService.canInviteToChannel(
      id,
      actorUserId,
      actorRole,
    );
    if (!canInvite) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions to invite members" },
        { status: 403 },
      );
    }

    // Try bulk add first
    const bulkValidation = AddMembersBulkSchema.safeParse(body);
    if (bulkValidation.success) {
      const { userIds, role } = bulkValidation.data;

      // Check max members
      if (channel.maxMembers) {
        const currentCount = channel.memberCount;
        if (currentCount + userIds.length > channel.maxMembers) {
          return NextResponse.json(
            {
              success: false,
              error: "Channel member limit would be exceeded",
              maxMembers: channel.maxMembers,
              currentCount,
            },
            { status: 400 },
          );
        }
      }

      const addedCount = await membershipService.addMembersBulk(
        id,
        userIds,
        role,
        actorUserId,
      );

      logger.info("POST /api/channels/[id]/members - Members added (bulk)", {
        channelId: id,
        addedBy: actorUserId,
        count: addedCount,
      });

      return NextResponse.json(
        {
          success: true,
          message: `${addedCount} member(s) added successfully`,
          addedCount,
        },
        { status: 201 },
      );
    }

    // Try single add
    const singleValidation = AddMemberSchema.safeParse(body);
    if (!singleValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: singleValidation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { userId, role } = singleValidation.data;

    // Check max members
    if (channel.maxMembers && channel.memberCount >= channel.maxMembers) {
      return NextResponse.json(
        { success: false, error: "Channel has reached member limit" },
        { status: 400 },
      );
    }

    const member = await membershipService.addMember(
      id,
      userId,
      role,
      actorUserId,
    );

    logger.info("POST /api/channels/[id]/members - Member added", {
      channelId: id,
      userId,
      role,
      addedBy: actorUserId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Member added successfully",
        member,
      },
      { status: 201 },
    );
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/channels/[id]/members - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add channel member",
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
// PATCH /api/channels/[id]/members - Update member
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("PATCH /api/channels/[id]/members - Update member request", {
      channelId: id,
    });

    if (!validateChannelId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const actorUserId = getUserIdFromRequest(request);
    if (!actorUserId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const actorRole = getUserRoleFromRequest(request);
    const body = await request.json();

    const validation = UpdateMemberSchema.safeParse(body);
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

    const {
      userId: targetUserId,
      role: newRole,
      nickname,
      ...permissions
    } = validation.data;

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

    // Check if target is a member
    const membership = await membershipService.checkMembership(
      id,
      targetUserId,
    );
    if (!membership.isMember) {
      return NextResponse.json(
        { success: false, error: "User is not a member of this channel" },
        { status: 404 },
      );
    }

    // Handle role update
    if (newRole) {
      const canUpdate = await permissionsService.canUpdateMemberRole(
        id,
        actorUserId,
        actorRole,
        targetUserId,
        newRole,
      );
      if (!canUpdate.canUpdate) {
        return NextResponse.json(
          {
            success: false,
            error: canUpdate.reason || "Cannot update member role",
          },
          { status: 403 },
        );
      }

      await membershipService.updateMemberRole(id, targetUserId, newRole);
    }

    // Handle nickname update
    if (nickname !== undefined) {
      await membershipService.updateMemberNickname(id, targetUserId, nickname);
    }

    // Handle permission updates
    const hasPermissionUpdates = Object.values(permissions).some(
      (v) => v !== undefined,
    );
    if (hasPermissionUpdates) {
      const canManage = await permissionsService.canPerformAction(
        id,
        actorUserId,
        actorRole,
        "canManageRoles",
      );
      if (!canManage) {
        return NextResponse.json(
          { success: false, error: "Cannot update member permissions" },
          { status: 403 },
        );
      }

      await membershipService.updateMemberPermissions(
        id,
        targetUserId,
        permissions,
      );
    }

    // Get updated membership
    const updatedMembership = await membershipService.getUserMembership(
      id,
      targetUserId,
    );

    logger.info("PATCH /api/channels/[id]/members - Member updated", {
      channelId: id,
      targetUserId,
      updatedBy: actorUserId,
    });

    return NextResponse.json({
      success: true,
      message: "Member updated successfully",
      member: updatedMembership,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("PATCH /api/channels/[id]/members - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update channel member",
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
// DELETE /api/channels/[id]/members - Remove member(s)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("DELETE /api/channels/[id]/members - Remove member request", {
      channelId: id,
    });

    if (!validateChannelId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const actorUserId = getUserIdFromRequest(request);
    if (!actorUserId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const actorRole = getUserRoleFromRequest(request);
    const body = await request.json();

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

    // Try bulk remove first
    const bulkValidation = RemoveMembersBulkSchema.safeParse(body);
    if (bulkValidation.success) {
      const { userIds } = bulkValidation.data;

      // Check permission for each user
      for (const targetUserId of userIds) {
        const canRemove = await permissionsService.canRemoveMember(
          id,
          actorUserId,
          actorRole,
          targetUserId,
        );
        if (!canRemove.canRemove) {
          return NextResponse.json(
            {
              success: false,
              error: canRemove.reason || "Cannot remove one or more members",
              failedUserId: targetUserId,
            },
            { status: 403 },
          );
        }
      }

      const removedCount = await membershipService.removeMembersBulk(
        id,
        userIds,
      );

      logger.info(
        "DELETE /api/channels/[id]/members - Members removed (bulk)",
        {
          channelId: id,
          removedBy: actorUserId,
          count: removedCount,
        },
      );

      return NextResponse.json({
        success: true,
        message: `${removedCount} member(s) removed successfully`,
        removedCount,
      });
    }

    // Try single remove
    const singleValidation = RemoveMemberSchema.safeParse(body);
    if (!singleValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: singleValidation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { userId: targetUserId } = singleValidation.data;

    // Check remove permission
    const canRemove = await permissionsService.canRemoveMember(
      id,
      actorUserId,
      actorRole,
      targetUserId,
    );
    if (!canRemove.canRemove) {
      return NextResponse.json(
        { success: false, error: canRemove.reason || "Cannot remove member" },
        { status: 403 },
      );
    }

    const removed = await membershipService.removeMember(id, targetUserId);

    logger.info("DELETE /api/channels/[id]/members - Member removed", {
      channelId: id,
      targetUserId,
      removedBy: actorUserId,
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
      removed,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("DELETE /api/channels/[id]/members - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove channel member",
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
