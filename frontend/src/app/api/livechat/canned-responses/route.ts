/**
 * Livechat Canned Responses API Route
 *
 * Handles canned response management for quick replies.
 *
 * GET /api/livechat/canned-responses - List canned responses
 * POST /api/livechat/canned-responses - Create a canned response
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCannedResponsesService } from "@/services/livechat";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateCannedResponseSchema = z.object({
  shortcut: z.string().min(2).max(50),
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(4000),
  scope: z.enum(["global", "department", "personal"]).optional(),
  departmentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const ListCannedResponsesSchema = z.object({
  scope: z.enum(["global", "department", "personal", "all"]).optional(),
  departmentId: z.string().optional(),
  query: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// HANDLERS
// ============================================================================

const cannedResponsesService = getCannedResponsesService();

/**
 * GET /api/livechat/canned-responses - List canned responses
 */
async function listCannedResponsesHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    scope: searchParams.get("scope") || undefined,
    departmentId: searchParams.get("departmentId") || undefined,
    query: searchParams.get("query") || undefined,
    tags: searchParams.get("tags") || undefined,
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
  };

  const validation = ListCannedResponsesSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { tags, ...options } = validation.data;

  const result = await cannedResponsesService.search({
    ...options,
    agentId: request.user.id,
    tags: tags ? tags.split(",") : undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  return successResponse(result.data);
}

/**
 * POST /api/livechat/canned-responses - Create a canned response
 */
async function createCannedResponseHandler(request: AuthenticatedRequest) {
  const body = await request.json();

  const validation = CreateCannedResponseSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Only admins can create global responses
  if (
    validation.data.scope === "global" &&
    !["owner", "admin"].includes(request.user.role)
  ) {
    return badRequestResponse(
      "Only administrators can create global canned responses",
      "FORBIDDEN",
    );
  }

  const result = await cannedResponsesService.create(
    validation.data,
    request.user.id,
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("Canned response created", {
    id: result.data?.id,
    shortcut: validation.data.shortcut,
  });

  return createdResponse({ cannedResponse: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(listCannedResponsesHandler as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(createCannedResponseHandler as any);
