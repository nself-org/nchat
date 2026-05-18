/**
 * Livechat Visitors API Route
 *
 * Handles visitor management for the live support system.
 *
 * GET /api/livechat/visitors - List visitors
 * POST /api/livechat/visitors - Create a new visitor
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLivechatService } from "@/services/livechat";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  withOptionalAuth,
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

const CreateVisitorSchema = z.object({
  token: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  channel: z.enum([
    "web_widget",
    "email",
    "facebook",
    "twitter",
    "whatsapp",
    "telegram",
    "sms",
    "api",
  ]),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ListVisitorsSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();

/**
 * GET /api/livechat/visitors - List visitors
 */
async function listVisitorsHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    status: searchParams.get("status") || undefined,
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
  };

  const validation = ListVisitorsSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const result = await livechatService.listVisitors(validation.data);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  return successResponse(result.data);
}

/**
 * POST /api/livechat/visitors - Create a new visitor
 */
async function createVisitorHandler(request: NextRequest) {
  const body = await request.json();

  const validation = CreateVisitorSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const result = await livechatService.createVisitor(validation.data);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("Visitor created", { id: result.data?.id });

  return createdResponse({ visitor: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(listVisitorsHandler as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withOptionalAuth,
)(createVisitorHandler as any);
