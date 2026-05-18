/**
 * Workspace Join API Route
 *
 * Handles joining a workspace via invite code.
 *
 * POST /api/workspaces/join - Join workspace via invite code
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
  conflictResponse,
} from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const JoinWorkspaceSchema = z.object({
  inviteCode: z
    .string()
    .min(1, "Invite code is required")
    .max(20, "Invalid invite code"),
});

// ============================================================================
// POST /api/workspaces/join - Join workspace via invite code
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  try {
    logger.info("POST /api/workspaces/join - Join workspace request", {
      userId: request.user.id,
    });

    const body = await request.json();

    // Validate request body
    const validation = JoinWorkspaceSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { inviteCode } = validation.data;
    const workspaceService = createWorkspaceService(apolloClient);

    // Validate invite code
    const invite = await workspaceService.validateInvite(inviteCode);
    if (!invite) {
      return notFoundResponse(
        "Invalid or expired invite code",
        "INVALID_INVITE",
      );
    }

    // Get workspace to check settings
    const workspace = await workspaceService.getWorkspace(invite.workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    // Check if invites are allowed
    if (workspace.settings?.allowInvites === false) {
      return forbiddenResponse(
        "This workspace is not accepting new members via invites",
        "INVITES_DISABLED",
      );
    }

    // Check if user is already a member
    const existingMembership = await workspaceService.checkMembership(
      invite.workspaceId,
      request.user.id,
    );
    if (existingMembership) {
      return conflictResponse(
        "You are already a member of this workspace",
        "ALREADY_MEMBER",
      );
    }

    // Check verification requirements
    if (workspace.settings?.verificationLevel === "email") {
      // In a real implementation, check if user's email is verified
      // For now, we'll skip this check
    }
    if (workspace.settings?.verificationLevel === "phone") {
      // In a real implementation, check if user's phone is verified
      // For now, we'll skip this check
    }

    // Check 2FA requirement
    if (workspace.settings?.require2FA) {
      // In a real implementation, check if user has 2FA enabled
      // For now, we'll skip this check
    }

    // Join workspace
    const member = await workspaceService.joinWorkspace(
      invite.workspaceId,
      request.user.id,
      inviteCode,
    );

    logger.info("POST /api/workspaces/join - User joined workspace", {
      workspaceId: invite.workspaceId,
      userId: request.user.id,
      inviteCode,
    });

    return successResponse({
      workspace,
      member,
      message: `Successfully joined ${workspace.name}`,
    });
  } catch (error) {
    logger.error("POST /api/workspaces/join - Error", error as Error);

    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "Invalid or expired",
        )
      ) {
        return notFoundResponse(
          "Invalid or expired invite code",
          "INVALID_INVITE",
        );
      }
    }

    return internalErrorResponse(
      "Failed to join workspace",
      "JOIN_WORKSPACE_ERROR",
    );
  }
}

// ============================================================================
// GET /api/workspaces/join - Validate invite code (preview)
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inviteCode = searchParams.get("code");

    if (!inviteCode) {
      return badRequestResponse("Invite code is required", "MISSING_CODE");
    }

    logger.info("GET /api/workspaces/join - Validate invite request", {
      userId: request.user.id,
      inviteCode,
    });

    const workspaceService = createWorkspaceService(apolloClient);

    // Validate invite code
    const invite = await workspaceService.validateInvite(inviteCode);
    if (!invite) {
      return notFoundResponse(
        "Invalid or expired invite code",
        "INVALID_INVITE",
      );
    }

    // Get workspace info (limited details for non-members)
    const workspace = await workspaceService.getWorkspace(invite.workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    // Check if already a member
    const existingMembership = await workspaceService.checkMembership(
      invite.workspaceId,
      request.user.id,
    );

    logger.info("GET /api/workspaces/join - Invite validated", {
      workspaceId: invite.workspaceId,
      isAlreadyMember: !!existingMembership,
    });

    return successResponse({
      invite: {
        id: invite.id,
        code: invite.code,
        expiresAt: invite.expiresAt,
        uses: invite.uses,
        maxUses: invite.maxUses,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        iconUrl: workspace.iconUrl,
        memberCount: workspace.memberCount,
      },
      isAlreadyMember: !!existingMembership,
    });
  } catch (error) {
    logger.error("GET /api/workspaces/join - Error", error as Error);
    return internalErrorResponse(
      "Failed to validate invite",
      "VALIDATE_INVITE_ERROR",
    );
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handleGet as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
)(handlePost as any);
