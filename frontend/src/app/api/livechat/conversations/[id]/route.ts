/**
 * Livechat Conversation by ID API Route
 *
 * Handles single conversation operations.
 *
 * GET /api/livechat/conversations/[id] - Get conversation details
 * PUT /api/livechat/conversations/[id] - Update conversation
 * DELETE /api/livechat/conversations/[id] - Close conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLivechatService, getSLAService } from "@/services/livechat";
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
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateConversationSchema = z.object({
  status: z
    .enum(["queued", "open", "on_hold", "waiting", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  department: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();
const slaService = getSLAService();

/**
 * GET /api/livechat/conversations/[id] - Get conversation details
 */
async function getConversationHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const params = await context.params;
  const id = params.id;

  const result = await livechatService.getConversation(id);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  if (!result.data) {
    return notFoundResponse("Conversation not found");
  }

  // Get SLA status
  const slaResult = await slaService.checkSLA(id);

  // Get messages
  const messagesResult = await livechatService.getMessages(id, { limit: 50 });

  return successResponse({
    conversation: result.data,
    sla: slaResult.data,
    messages: messagesResult.data?.items || [],
  });
}

/**
 * PUT /api/livechat/conversations/[id] - Update conversation
 */
async function updateConversationHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const params = await context.params;
  const id = params.id;

  const body = await request.json();

  const validation = UpdateConversationSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const result = await livechatService.updateConversation(id, validation.data);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("Conversation updated", { id });

  return successResponse({ conversation: result.data });
}

/**
 * DELETE /api/livechat/conversations/[id] - Close conversation
 */
async function closeConversationHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const params = await context.params;
  const id = params.id;

  // Record SLA resolution
  await slaService.recordResolution(id);

  // Stop SLA tracking
  await slaService.stopTracking(id);

  const result = await livechatService.closeConversation(id);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("Conversation closed", { id });

  return successResponse({ conversation: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(getConversationHandler as any);

export const PUT = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(updateConversationHandler as any);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(closeConversationHandler as any);
