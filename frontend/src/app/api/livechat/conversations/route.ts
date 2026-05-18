/**
 * Livechat Conversations API Route
 *
 * Handles conversation management for the live support system.
 *
 * GET /api/livechat/conversations - List conversations
 * POST /api/livechat/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getLivechatService,
  getRoutingService,
  getSLAService,
} from "@/services/livechat";
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

const CreateConversationSchema = z.object({
  visitorId: z.string().uuid(),
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
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  customFields: z.record(z.unknown()).optional(),
  source: z
    .object({
      type: z.enum(["widget", "email", "api", "social"]),
      page: z.string().optional(),
      referrer: z.string().optional(),
    })
    .optional(),
  message: z.string().optional(),
});

const ListConversationsSchema = z.object({
  status: z
    .enum(["queued", "open", "on_hold", "waiting", "resolved", "closed"])
    .optional(),
  agentId: z.string().uuid().optional(),
  department: z.string().optional(),
  channel: z
    .enum([
      "web_widget",
      "email",
      "facebook",
      "twitter",
      "whatsapp",
      "telegram",
      "sms",
      "api",
    ])
    .optional(),
  visitorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();
const routingService = getRoutingService();
const slaService = getSLAService();

/**
 * GET /api/livechat/conversations - List conversations
 */
async function listConversationsHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    status: searchParams.get("status") || undefined,
    agentId: searchParams.get("agentId") || undefined,
    department: searchParams.get("department") || undefined,
    channel: searchParams.get("channel") || undefined,
    visitorId: searchParams.get("visitorId") || undefined,
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
  };

  const validation = ListConversationsSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const result = await livechatService.listConversations(validation.data);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  return successResponse(result.data);
}

/**
 * POST /api/livechat/conversations - Create a new conversation
 */
async function createConversationHandler(request: NextRequest) {
  const body = await request.json();

  const validation = CreateConversationSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Create conversation
  const result = await livechatService.createConversation(validation.data);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  const conversation = result.data!;

  // Start SLA tracking
  await slaService.startTracking(conversation.id);

  // Attempt to route the conversation
  const routingResult = await routingService.routeConversation(conversation);

  logger.info("Conversation created", {
    id: conversation.id,
    routed: routingResult.success && !!routingResult.data?.selectedAgentId,
  });

  return createdResponse({
    conversation,
    routing: routingResult.data,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(listConversationsHandler as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withOptionalAuth,
)(createConversationHandler as any);
