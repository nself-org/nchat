/**
 * Workspace Analytics API Route
 *
 * Handles analytics and usage data for a workspace.
 *
 * GET /api/workspaces/[id]/analytics - Get workspace analytics
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

const AnalyticsQuerySchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).default("month"),
  includeStorage: z.coerce.boolean().default(true),
  includeRetention: z.coerce.boolean().default(false),
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
// GET /api/workspaces/[id]/analytics - Get workspace analytics
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  try {
    const { id: workspaceId } = await context.params;

    logger.info("GET /api/workspaces/[id]/analytics - Get analytics request", {
      workspaceId,
      userId: request.user.id,
    });

    const workspaceService = createWorkspaceService(apolloClient);
    const extendedService = createExtendedWorkspaceService(apolloClient);

    // Check admin permission (only admins can view analytics)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      period: searchParams.get("period") || "month",
      includeStorage: searchParams.get("includeStorage") || "true",
      includeRetention: searchParams.get("includeRetention") || "false",
    };

    const validation = AnalyticsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return badRequestResponse("Invalid query parameters", "INVALID_PARAMS", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const params = validation.data;

    // Get analytics
    const analytics = await extendedService.getAnalytics(
      workspaceId,
      params.period,
    );

    // Get extended stats if requested
    let storage = null;
    let retention = null;

    if (params.includeStorage || params.includeRetention) {
      const extendedStats = await extendedService.getExtendedStats(workspaceId);
      storage = params.includeStorage ? extendedStats.storage : null;
      retention = params.includeRetention ? extendedStats.retention : null;
    }

    logger.info("GET /api/workspaces/[id]/analytics - Success", {
      workspaceId,
      period: params.period,
    });

    return successResponse({
      analytics,
      storage,
      retention,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        memberCount: workspace.memberCount,
        createdAt: workspace.createdAt,
      },
    });
  } catch (error) {
    logger.error("GET /api/workspaces/[id]/analytics - Error", error as Error);
    return internalErrorResponse(
      "Failed to fetch analytics",
      "FETCH_ANALYTICS_ERROR",
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
