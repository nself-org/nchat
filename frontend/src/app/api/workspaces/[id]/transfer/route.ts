/**
 * Workspace Ownership Transfer API Route
 *
 * Handles ownership transfer operations for a workspace.
 *
 * POST /api/workspaces/[id]/transfer - Initiate ownership transfer
 * PUT /api/workspaces/[id]/transfer - Confirm pending transfer
 * DELETE /api/workspaces/[id]/transfer - Cancel pending transfer
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import {
  createExtendedWorkspaceService,
  createWorkspaceService,
} from "@/services/workspaces";
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
} from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const InitiateTransferSchema = z.object({
  newOwnerId: z.string().uuid("Invalid user ID"),
  reason: z.string().max(500).optional(),
  requireConfirmation: z.boolean().default(true),
});

const ConfirmTransferSchema = z.object({
  transferId: z.string().min(1),
});

const CancelTransferSchema = z.object({
  transferId: z.string().min(1),
});

// ============================================================================
// POST /api/workspaces/[id]/transfer - Initiate ownership transfer
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info(
      "POST /api/workspaces/[id]/transfer - Initiate transfer request",
      {
        workspaceId,
        userId: request.user.id,
      },
    );

    const workspaceService = createWorkspaceService(apolloClient);
    const extendedService = createExtendedWorkspaceService(apolloClient);

    // Verify user is the owner
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    if (workspace.ownerId !== request.user.id) {
      return forbiddenResponse(
        "Only the workspace owner can transfer ownership",
        "OWNER_REQUIRED",
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = InitiateTransferSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Verify new owner is a member
    const newOwnerMembership = await workspaceService.checkMembership(
      workspaceId,
      data.newOwnerId,
    );
    if (!newOwnerMembership) {
      return badRequestResponse(
        "New owner must be a member of the workspace",
        "NOT_MEMBER",
      );
    }

    // Cannot transfer to self
    if (data.newOwnerId === request.user.id) {
      return badRequestResponse(
        "Cannot transfer ownership to yourself",
        "SAME_USER",
      );
    }

    // Initiate transfer
    const result = await extendedService.initiateOwnershipTransfer({
      workspaceId,
      currentOwnerId: request.user.id,
      newOwnerId: data.newOwnerId,
      reason: data.reason,
      requireConfirmation: data.requireConfirmation,
    });

    logger.info("POST /api/workspaces/[id]/transfer - Transfer initiated", {
      workspaceId,
      newOwnerId: data.newOwnerId,
      pendingConfirmation: result.pendingConfirmation,
    });

    return successResponse({
      ...result,
      message: result.pendingConfirmation
        ? "Ownership transfer initiated. Waiting for confirmation."
        : "Ownership transferred successfully.",
    });
  } catch (error) {
    logger.error("POST /api/workspaces/[id]/transfer - Error", error as Error);
    return internalErrorResponse(
      "Failed to initiate transfer",
      "TRANSFER_ERROR",
    );
  }
}

// ============================================================================
// PUT /api/workspaces/[id]/transfer - Confirm pending transfer
// ============================================================================

async function handlePut(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info(
      "PUT /api/workspaces/[id]/transfer - Confirm transfer request",
      {
        workspaceId,
        userId: request.user.id,
      },
    );

    const body = await request.json();

    // Validate request body
    const validation = ConfirmTransferSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { transferId } = validation.data;

    const extendedService = createExtendedWorkspaceService(apolloClient);

    // Confirm transfer
    const result = await extendedService.confirmOwnershipTransfer(
      transferId,
      request.user.id,
    );

    if (!result.success) {
      return badRequestResponse(
        "Transfer confirmation failed",
        "CONFIRMATION_FAILED",
      );
    }

    logger.info("PUT /api/workspaces/[id]/transfer - Transfer confirmed", {
      workspaceId,
      transferId,
      newOwnerId: request.user.id,
    });

    return successResponse({
      success: true,
      message: "Ownership transfer confirmed.",
    });
  } catch (error) {
    logger.error("PUT /api/workspaces/[id]/transfer - Error", error as Error);
    return internalErrorResponse("Failed to confirm transfer", "CONFIRM_ERROR");
  }
}

// ============================================================================
// DELETE /api/workspaces/[id]/transfer - Cancel pending transfer
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info(
      "DELETE /api/workspaces/[id]/transfer - Cancel transfer request",
      {
        workspaceId,
        userId: request.user.id,
      },
    );

    const body = await request.json();

    // Validate request body
    const validation = CancelTransferSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { transferId } = validation.data;

    const workspaceService = createWorkspaceService(apolloClient);
    const extendedService = createExtendedWorkspaceService(apolloClient);

    // Only owner can cancel transfer
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace || workspace.ownerId !== request.user.id) {
      return forbiddenResponse(
        "Only the workspace owner can cancel transfer",
        "OWNER_REQUIRED",
      );
    }

    // Cancel transfer
    await extendedService.cancelOwnershipTransfer(transferId, request.user.id);

    logger.info("DELETE /api/workspaces/[id]/transfer - Transfer cancelled", {
      workspaceId,
      transferId,
    });

    return successResponse({
      success: true,
      message: "Ownership transfer cancelled.",
    });
  } catch (error) {
    logger.error(
      "DELETE /api/workspaces/[id]/transfer - Error",
      error as Error,
    );
    return internalErrorResponse("Failed to cancel transfer", "CANCEL_ERROR");
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 5, window: 60 }),
  withAuth,
)(handlePost as any);

export const PUT = compose(
  withErrorHandler,
  withRateLimit({ limit: 5, window: 60 }),
  withAuth,
)(handlePut as any);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
)(handleDelete as any);
