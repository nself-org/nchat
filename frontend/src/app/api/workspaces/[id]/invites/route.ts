/**
 * Workspace Invites API Route
 *
 * Handles invite management for a workspace.
 *
 * GET /api/workspaces/[id]/invites - List workspace invites
 * POST /api/workspaces/[id]/invites - Create invite
 * DELETE /api/workspaces/[id]/invites - Delete invite
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

const ListInvitesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  // Shorthand for common expiry times
  expiresIn: z.enum(["30m", "1h", "6h", "12h", "1d", "7d", "never"]).optional(),
});

const DeleteInviteSchema = z.object({
  inviteId: z.string().uuid("Invalid invite ID"),
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
 * Check if user can create invites (moderator or higher)
 */
async function canCreateInvites(
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

/**
 * Calculate expiry date from shorthand
 */
function getExpiryDate(expiresIn: string): string | null {
  const now = new Date();
  switch (expiresIn) {
    case "30m":
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case "6h":
      return new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
    case "12h":
      return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    case "1d":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "never":
    default:
      return null;
  }
}

// ============================================================================
// GET /api/workspaces/[id]/invites - List workspace invites
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("GET /api/workspaces/[id]/invites - List invites request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Check admin permission (only admins can view all invites)
    const hasPermission = await hasAdminPermission(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!hasPermission) {
      return forbiddenResponse("Admin permission required", "ADMIN_REQUIRED");
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    const validation = ListInvitesQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return badRequestResponse("Invalid query parameters", "INVALID_PARAMS", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const params = validation.data;

    // Get invites
    const result = await workspaceService.getInvites(workspaceId, {
      limit: params.limit,
      offset: params.offset,
    });

    logger.info("GET /api/workspaces/[id]/invites - Success", {
      workspaceId,
      total: result.total,
      returned: result.invites.length,
    });

    return successResponse({
      invites: result.invites,
      pagination: {
        total: result.total,
        offset: params.offset,
        limit: params.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    logger.error("GET /api/workspaces/[id]/invites - Error", error as Error);
    return internalErrorResponse(
      "Failed to fetch invites",
      "FETCH_INVITES_ERROR",
    );
  }
}

// ============================================================================
// POST /api/workspaces/[id]/invites - Create invite
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("POST /api/workspaces/[id]/invites - Create invite request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Check if user can create invites
    const canCreate = await canCreateInvites(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!canCreate) {
      return forbiddenResponse(
        "Moderator permission required",
        "MODERATOR_REQUIRED",
      );
    }

    // Check if workspace allows invites
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    if (workspace.settings?.allowInvites === false) {
      return forbiddenResponse(
        "Invites are disabled for this workspace",
        "INVITES_DISABLED",
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = CreateInviteSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Calculate expiry date
    let expiresAt = data.expiresAt || null;
    if (data.expiresIn && !expiresAt) {
      expiresAt = getExpiryDate(data.expiresIn);
    }

    // Create invite
    const invite = await workspaceService.createInvite(
      workspaceId,
      request.user.id,
      {
        maxUses: data.maxUses,
        expiresAt,
      },
    );

    logger.info("POST /api/workspaces/[id]/invites - Invite created", {
      workspaceId,
      inviteId: invite.id,
      code: invite.code,
      createdBy: request.user.id,
    });

    return createdResponse({
      invite,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${invite.code}`,
      message: "Invite created successfully",
    });
  } catch (error) {
    logger.error("POST /api/workspaces/[id]/invites - Error", error as Error);
    return internalErrorResponse(
      "Failed to create invite",
      "CREATE_INVITE_ERROR",
    );
  }
}

// ============================================================================
// DELETE /api/workspaces/[id]/invites - Delete invite
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("DELETE /api/workspaces/[id]/invites - Delete invite request", {
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
    const validation = DeleteInviteSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { inviteId } = validation.data;

    // Delete invite
    await workspaceService.deleteInvite(inviteId);

    logger.info("DELETE /api/workspaces/[id]/invites - Invite deleted", {
      workspaceId,
      inviteId,
      deletedBy: request.user.id,
    });

    return successResponse({
      message: "Invite deleted successfully",
    });
  } catch (error) {
    logger.error("DELETE /api/workspaces/[id]/invites - Error", error as Error);
    return internalErrorResponse(
      "Failed to delete invite",
      "DELETE_INVITE_ERROR",
    );
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(handleGet as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 20, window: 60 }),
  withAuth,
)(handlePost as any);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handleDelete as any);
