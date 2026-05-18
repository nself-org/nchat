/**
 * Workspace Settings API Route
 *
 * Handles advanced workspace settings including retention policies,
 * storage quotas, and onboarding configuration.
 *
 * GET /api/workspaces/[id]/settings - Get workspace settings
 * PATCH /api/workspaces/[id]/settings - Update workspace settings
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

const UpdateSettingsSchema = z.object({
  // Message retention
  retention: z
    .object({
      enabled: z.boolean().optional(),
      retentionDays: z.number().int().min(1).max(3650).optional(),
      excludeChannelIds: z.array(z.string().uuid()).optional(),
      excludePinnedMessages: z.boolean().optional(),
    })
    .optional(),

  // Storage quota
  storage: z
    .object({
      totalBytes: z.number().int().min(0).optional(),
      maxFileSize: z.number().int().min(0).optional(),
      allowedFileTypes: z.array(z.string()).optional(),
      quotaEnforced: z.boolean().optional(),
      warningThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),

  // Onboarding
  onboarding: z
    .object({
      enabled: z.boolean().optional(),
      welcomeMessage: z.string().max(2000).optional().nullable(),
      rulesAgreementRequired: z.boolean().optional(),
      profileCompletionRequired: z.boolean().optional(),
      assignDefaultChannels: z.boolean().optional(),
      defaultChannelIds: z.array(z.string().uuid()).optional(),
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

// ============================================================================
// GET /api/workspaces/[id]/settings - Get workspace settings
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("GET /api/workspaces/[id]/settings - Get settings request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);
    const extendedService = createExtendedWorkspaceService(apolloClient);

    // Check admin permission
    const hasPermission = await hasAdminPermission(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!hasPermission) {
      return forbiddenResponse("Admin permission required", "ADMIN_REQUIRED");
    }

    // Verify workspace exists
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    // Get all settings
    const [retention, storage, onboarding, emergencyAccess] = await Promise.all(
      [
        extendedService.getMessageRetention(workspaceId),
        extendedService.getStorageQuota(workspaceId),
        extendedService.getOnboardingConfig(workspaceId),
        extendedService.getEmergencyAccess(workspaceId),
      ],
    );

    logger.info("GET /api/workspaces/[id]/settings - Success", { workspaceId });

    return successResponse({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        settings: workspace.settings,
      },
      retention: retention || {
        enabled: false,
        retentionDays: 365,
        excludeChannelIds: [],
        excludePinnedMessages: true,
      },
      storage: storage || {
        totalBytes: 10737418240, // 10 GB default
        usedBytes: 0,
        fileCount: 0,
        maxFileSize: 104857600, // 100 MB default
        allowedFileTypes: ["*"],
        quotaEnforced: true,
        warningThreshold: 0.8,
      },
      onboarding: onboarding || {
        enabled: false,
        steps: [],
        welcomeMessage: null,
        rulesAgreementRequired: false,
        profileCompletionRequired: false,
        assignDefaultChannels: true,
        defaultChannelIds: [],
      },
      emergencyAccess,
    });
  } catch (error) {
    logger.error("GET /api/workspaces/[id]/settings - Error", error as Error);
    return internalErrorResponse(
      "Failed to fetch settings",
      "FETCH_SETTINGS_ERROR",
    );
  }
}

// ============================================================================
// PATCH /api/workspaces/[id]/settings - Update workspace settings
// ============================================================================

async function handlePatch(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info(
      "PATCH /api/workspaces/[id]/settings - Update settings request",
      {
        workspaceId,
        userId: request.user.id,
      },
    );

    const workspaceService = createWorkspaceService(apolloClient);
    const extendedService = createExtendedWorkspaceService(apolloClient);

    // Check admin permission
    const hasPermission = await hasAdminPermission(
      workspaceService,
      workspaceId,
      request.user.id,
    );
    if (!hasPermission) {
      return forbiddenResponse("Admin permission required", "ADMIN_REQUIRED");
    }

    // Verify workspace exists
    const workspace = await workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return notFoundResponse("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateSettingsSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Update each settings category
    const updatePromises: Promise<unknown>[] = [];

    if (data.retention) {
      updatePromises.push(
        extendedService.updateMessageRetention(workspaceId, {
          enabled: data.retention.enabled,
          retentionDays: data.retention.retentionDays,
          excludeChannelIds: data.retention.excludeChannelIds,
          excludePinnedMessages: data.retention.excludePinnedMessages,
        }),
      );
    }

    if (data.storage) {
      updatePromises.push(
        extendedService.updateStorageQuota(workspaceId, {
          totalBytes: data.storage.totalBytes,
          maxFileSize: data.storage.maxFileSize,
          allowedFileTypes: data.storage.allowedFileTypes,
          quotaEnforced: data.storage.quotaEnforced,
          warningThreshold: data.storage.warningThreshold,
        }),
      );
    }

    if (data.onboarding) {
      updatePromises.push(
        extendedService.updateOnboardingConfig(workspaceId, {
          enabled: data.onboarding.enabled,
          welcomeMessage: data.onboarding.welcomeMessage,
          rulesAgreementRequired: data.onboarding.rulesAgreementRequired,
          profileCompletionRequired: data.onboarding.profileCompletionRequired,
          assignDefaultChannels: data.onboarding.assignDefaultChannels,
          defaultChannelIds: data.onboarding.defaultChannelIds,
        }),
      );
    }

    await Promise.all(updatePromises);

    logger.info("PATCH /api/workspaces/[id]/settings - Settings updated", {
      workspaceId,
      updatedBy: request.user.id,
    });

    return successResponse({
      message: "Settings updated successfully",
    });
  } catch (error) {
    logger.error("PATCH /api/workspaces/[id]/settings - Error", error as Error);
    return internalErrorResponse(
      "Failed to update settings",
      "UPDATE_SETTINGS_ERROR",
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

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handlePatch as any);
