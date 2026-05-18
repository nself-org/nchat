/**
 * Workspace Members API Route
 *
 * Handles member management for a workspace.
 *
 * GET /api/workspaces/[id]/members - List workspace members
 * POST /api/workspaces/[id]/members - Add member (admin)
 * DELETE /api/workspaces/[id]/members - Remove member (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { createWorkspaceService } from "@/services/workspaces";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
} from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ListMembersQuerySchema = z.object({
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const AddMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["admin", "moderator", "member", "guest"]).default("member"),
  nickname: z.string().max(32).optional().nullable(),
});

const RemoveMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

const UpdateMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["admin", "moderator", "member", "guest"]).optional(),
  nickname: z.string().max(32).optional().nullable(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has admin permissions in workspace
 */
async function hasAdminPermission(
  workspaceService: ReturnType<typeof createWorkspaceService>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const membership = await workspaceService.checkMembership(
    workspaceId,
    userId,
  );
  if (!membership) return false;
  return ["owner", "admin"].includes(membership.role);
}

/**
 * Check if user has moderator or higher permissions
 */
async function hasModeratorPermission(
  workspaceService: ReturnType<typeof createWorkspaceService>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const membership = await workspaceService.checkMembership(
    workspaceId,
    userId,
  );
  if (!membership) return false;
  return ["owner", "admin", "moderator"].includes(membership.role);
}

// ============================================================================
// GET /api/workspaces/[id]/members - List workspace members
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("GET /api/workspaces/[id]/members - List members request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Check membership
    const membership = await workspaceService.checkMembership(
      workspaceId,
      request.user.id,
    );
    if (!membership) {
      return forbiddenResponse(
        "You are not a member of this workspace",
        "NOT_MEMBER",
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      role: searchParams.get("role") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    const validation = ListMembersQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return badRequestResponse("Invalid query parameters", "INVALID_PARAMS", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const params = validation.data;

    let result;
    if (params.search) {
      // Search members
      const members = await workspaceService.searchMembers(
        workspaceId,
        params.search,
        params.limit,
      );
      result = {
        members,
        total: members.length,
        hasMore: false,
      };
    } else {
      // List members with optional role filter
      result = await workspaceService.getWorkspaceMembers(workspaceId, {
        role: params.role,
        limit: params.limit,
        offset: params.offset,
      });
    }

    logger.info("GET /api/workspaces/[id]/members - Success", {
      workspaceId,
      total: result.total,
      returned: result.members.length,
    });

    return successResponse({
      members: result.members,
      pagination: {
        total: result.total,
        offset: params.offset,
        limit: params.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    logger.error("GET /api/workspaces/[id]/members - Error", error as Error);
    return internalErrorResponse(
      "Failed to fetch members",
      "FETCH_MEMBERS_ERROR",
    );
  }
}

// ============================================================================
// POST /api/workspaces/[id]/members - Add member (admin)
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("POST /api/workspaces/[id]/members - Add member request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Check admin permission
    const hasPermission = await hasAdminPermission(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!hasPermission) {
      return forbiddenResponse("Admin permission required", "ADMIN_REQUIRED");
    }

    const body = await request.json();

    // Validate request body
    const validation = AddMemberSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Check if user is already a member
    const existingMembership = await workspaceService.checkMembership(
      workspaceId,
      data.userId,
    );
    if (existingMembership) {
      return badRequestResponse(
        "User is already a member of this workspace",
        "ALREADY_MEMBER",
      );
    }

    // Add member
    const member = await workspaceService.addMember(
      workspaceId,
      data.userId,
      data.role,
      data.nickname ?? undefined,
    );

    logger.info("POST /api/workspaces/[id]/members - Member added", {
      workspaceId,
      memberId: data.userId,
      role: data.role,
      addedBy: request.user.id,
    });

    return createdResponse({
      member,
      message: "Member added successfully",
    });
  } catch (error) {
    logger.error("POST /api/workspaces/[id]/members - Error", error as Error);
    return internalErrorResponse("Failed to add member", "ADD_MEMBER_ERROR");
  }
}

// ============================================================================
// DELETE /api/workspaces/[id]/members - Remove member (admin)
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("DELETE /api/workspaces/[id]/members - Remove member request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Check admin permission
    const hasPermission = await hasAdminPermission(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!hasPermission) {
      return forbiddenResponse("Admin permission required", "ADMIN_REQUIRED");
    }

    const body = await request.json();

    // Validate request body
    const validation = RemoveMemberSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Check if trying to remove owner
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    if (workspace.ownerId === data.userId) {
      return badRequestResponse(
        "Cannot remove workspace owner",
        "CANNOT_REMOVE_OWNER",
      );
    }

    // Check if member exists
    const membership = await workspaceService.checkMembership(
      workspaceId,
      data.userId,
    );
    if (!membership) {
      return notFoundResponse("Member not found", "MEMBER_NOT_FOUND");
    }

    // Remove member
    await workspaceService.removeMember(workspaceId, data.userId);

    logger.info("DELETE /api/workspaces/[id]/members - Member removed", {
      workspaceId,
      memberId: data.userId,
      removedBy: request.user.id,
    });

    return successResponse({
      message: "Member removed successfully",
    });
  } catch (error) {
    logger.error("DELETE /api/workspaces/[id]/members - Error", error as Error);
    return internalErrorResponse(
      "Failed to remove member",
      "REMOVE_MEMBER_ERROR",
    );
  }
}

// ============================================================================
// PATCH /api/workspaces/[id]/members - Update member (admin)
// ============================================================================

async function handlePatch(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("PATCH /api/workspaces/[id]/members - Update member request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Check admin permission
    const hasPermission = await hasAdminPermission(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!hasPermission) {
      return forbiddenResponse("Admin permission required", "ADMIN_REQUIRED");
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateMemberSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Check if member exists
    const membership = await workspaceService.checkMembership(
      workspaceId,
      data.userId,
    );
    if (!membership) {
      return notFoundResponse("Member not found", "MEMBER_NOT_FOUND");
    }

    // Cannot change owner role
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (workspace?.ownerId === data.userId && data.role) {
      return badRequestResponse(
        "Cannot change owner role",
        "CANNOT_CHANGE_OWNER_ROLE",
      );
    }

    // Update member
    let updatedMember = membership;
    if (data.role) {
      updatedMember = await workspaceService.updateMemberRole(
        workspaceId,
        data.userId,
        data.role,
      );
    }
    if (data.nickname !== undefined) {
      await workspaceService.updateMemberNickname(
        workspaceId,
        data.userId,
        data.nickname,
      );
      updatedMember.nickname = data.nickname;
    }

    logger.info("PATCH /api/workspaces/[id]/members - Member updated", {
      workspaceId,
      memberId: data.userId,
      updatedBy: request.user.id,
    });

    return successResponse({
      member: updatedMember,
      message: "Member updated successfully",
    });
  } catch (error) {
    logger.error("PATCH /api/workspaces/[id]/members - Error", error as Error);
    return internalErrorResponse(
      "Failed to update member",
      "UPDATE_MEMBER_ERROR",
    );
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(handleGet as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handlePost as any);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handleDelete as any);

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handlePatch as any);
