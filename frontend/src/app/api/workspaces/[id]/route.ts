/**
 * Single Workspace API Route
 *
 * Handles operations on a single workspace.
 *
 * GET /api/workspaces/[id] - Get workspace details
 * PATCH /api/workspaces/[id] - Update workspace
 * DELETE /api/workspaces/[id] - Delete workspace
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
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
  noContentResponse,
} from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  defaultChannelId: z.string().uuid().optional().nullable(),
  settings: z
    .object({
      verificationLevel: z.enum(["none", "email", "phone"]).optional(),
      defaultNotifications: z.enum(["all", "mentions", "none"]).optional(),
      explicitContentFilter: z
        .enum(["disabled", "members_without_roles", "all_members"])
        .optional(),
      require2FA: z.boolean().optional(),
      discoverable: z.boolean().optional(),
      allowInvites: z.boolean().optional(),
    })
    .optional(),
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
 * Check if user is the workspace owner
 */
async function isOwner(
  workspaceService: ReturnType<typeof createWorkspaceService>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const workspace = await workspaceService.getWorkspace(workspaceId);
  if (!workspace) return false;
  return workspace.ownerId === userId;
}

// ============================================================================
// GET /api/workspaces/[id] - Get workspace details
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("GET /api/workspaces/[id] - Get workspace request", {
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

    // Get workspace details
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    // Get workspace stats
    const stats = await workspaceService.getWorkspaceStats(workspaceId);

    logger.info("GET /api/workspaces/[id] - Success", { workspaceId });

    return successResponse({
      workspace,
      membership,
      stats,
    });
  } catch (error) {
    logger.error("GET /api/workspaces/[id] - Error", error as Error);
    return internalErrorResponse(
      "Failed to fetch workspace",
      "FETCH_WORKSPACE_ERROR",
    );
  }
}

// ============================================================================
// PATCH /api/workspaces/[id] - Update workspace
// ============================================================================

async function handlePatch(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("PATCH /api/workspaces/[id] - Update workspace request", {
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
    const validation = UpdateWorkspaceSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Update workspace
    const workspace = await workspaceService.updateWorkspace(workspaceId, {
      name: data.name,
      description: data.description,
      iconUrl: data.iconUrl,
      bannerUrl: data.bannerUrl,
      defaultChannelId: data.defaultChannelId,
      settings: data.settings,
    });

    logger.info("PATCH /api/workspaces/[id] - Workspace updated", {
      workspaceId,
      updatedBy: request.user.id,
    });

    return successResponse({
      workspace,
      message: "Workspace updated successfully",
    });
  } catch (error) {
    logger.error("PATCH /api/workspaces/[id] - Error", error as Error);
    return internalErrorResponse(
      "Failed to update workspace",
      "UPDATE_WORKSPACE_ERROR",
    );
  }
}

// ============================================================================
// DELETE /api/workspaces/[id] - Delete workspace
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("DELETE /api/workspaces/[id] - Delete workspace request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Only owner can delete workspace
    const ownerCheck = await isOwner(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!ownerCheck) {
      return forbiddenResponse(
        "Only the workspace owner can delete it",
        "OWNER_REQUIRED",
      );
    }

    // Delete workspace
    const deleted = await workspaceService.deleteWorkspace(workspaceId);

    logger.info("DELETE /api/workspaces/[id] - Workspace deleted", {
      workspaceId: deleted.id,
      name: deleted.name,
      deletedBy: request.user.id,
    });

    return successResponse({
      deleted,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    logger.error("DELETE /api/workspaces/[id] - Error", error as Error);
    return internalErrorResponse(
      "Failed to delete workspace",
      "DELETE_WORKSPACE_ERROR",
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

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handlePatch as any);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 5, window: 60 }),
  withAuth,
)(handleDelete as any);
