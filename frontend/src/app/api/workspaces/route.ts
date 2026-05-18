/**
 * Workspaces API Route
 *
 * Handles listing and creating workspaces.
 *
 * GET /api/workspaces - List user's workspaces
 * POST /api/workspaces - Create new workspace
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
  internalErrorResponse,
  conflictResponse,
} from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be 100 characters or less")
    .trim(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only",
    )
    .optional(),
  description: z.string().max(500).optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  settings: z
    .object({
      verificationLevel: z.enum(["none", "email", "phone"]).default("none"),
      defaultNotifications: z.enum(["all", "mentions", "none"]).default("all"),
      explicitContentFilter: z
        .enum(["disabled", "members_without_roles", "all_members"])
        .default("disabled"),
      require2FA: z.boolean().default(false),
      discoverable: z.boolean().default(false),
      allowInvites: z.boolean().default(true),
    })
    .optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// GET /api/workspaces - List user's workspaces
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    logger.info("GET /api/workspaces - List workspaces request", {
      userId: request.user.id,
    });

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    const validation = ListQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return badRequestResponse("Invalid query parameters", "INVALID_PARAMS", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const params = validation.data;
    const workspaceService = createWorkspaceService(apolloClient);

    const result = await workspaceService.getWorkspaces(request.user.id, {
      limit: params.limit,
      offset: params.offset,
    });

    logger.info("GET /api/workspaces - Success", {
      userId: request.user.id,
      total: result.total,
      returned: result.workspaces.length,
    });

    return successResponse({
      workspaces: result.workspaces,
      pagination: {
        total: result.total,
        offset: params.offset,
        limit: params.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    logger.error("GET /api/workspaces - Error", error as Error);
    return internalErrorResponse(
      "Failed to fetch workspaces",
      "FETCH_WORKSPACES_ERROR",
    );
  }
}

// ============================================================================
// POST /api/workspaces - Create new workspace
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  try {
    logger.info("POST /api/workspaces - Create workspace request", {
      userId: request.user.id,
    });

    const body = await request.json();

    // Validate request body
    const validation = CreateWorkspaceSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;
    const workspaceService = createWorkspaceService(apolloClient);

    // Create the workspace
    const workspace = await workspaceService.createWorkspace(
      {
        name: data.name,
        slug: data.slug,
        description: data.description,
        iconUrl: data.iconUrl,
        bannerUrl: data.bannerUrl,
        settings: data.settings,
      },
      request.user.id,
    );

    logger.info("POST /api/workspaces - Workspace created", {
      workspaceId: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ownerId: request.user.id,
    });

    return createdResponse({
      workspace,
      message: "Workspace created successfully",
    });
  } catch (error) {
    logger.error("POST /api/workspaces - Error", error as Error);

    // Handle specific errors
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "unique constraint",
        ) ||
        (error instanceof Error ? error.message : String(error)).includes(
          "duplicate",
        )
      ) {
        return conflictResponse(
          "Workspace with this slug already exists",
          "WORKSPACE_EXISTS",
        );
      }
    }

    return internalErrorResponse(
      "Failed to create workspace",
      "CREATE_WORKSPACE_ERROR",
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
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
)(handlePost as any);
