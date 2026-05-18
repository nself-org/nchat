/**
 * Scheduled Messages API Route
 *
 * Handles CRUD operations for scheduled messages with real database integration.
 * Uses rate limiting and authentication middleware.
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import {
  withAuth,
  withRateLimit,
  withErrorHandler,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/api/response";
import { getScheduledMessageService } from "@/services/messages/scheduled.service";
import type { ScheduledMessageStatus } from "@/graphql/messages/scheduled";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit: 20 scheduled messages per minute
const rateLimitMiddleware = withRateLimit({
  limit: 20,
  window: 60,
});

/**
 * GET /api/messages/schedule
 *
 * Get scheduled messages for the authenticated user
 */
export const GET = compose(
  withErrorHandler,
  rateLimitMiddleware,
  withAuth,
)(async (request: AuthenticatedRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get("channelId") || undefined;
  const status = (searchParams.get("status") || undefined) as
    | ScheduledMessageStatus
    | undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const service = getScheduledMessageService();
  const result = await service.getScheduledMessages({
    userId: request.user.id,
    status,
    channelId,
    limit: Math.min(limit, 100), // Max 100 per request
    offset,
  });

  if (!result.success || !result.data) {
    logger.error("Failed to fetch scheduled messages", undefined, {
      userId: request.user.id,
      error: result.error,
    });
    return badRequestResponse(
      result.error?.message || "Failed to fetch scheduled messages",
    );
  }

  const { messages, totalCount, hasMore } = result.data;

  logger.info("Fetched scheduled messages", {
    userId: request.user.id,
    count: messages.length,
    totalCount,
  });

  return successResponse({
    scheduledMessages: messages,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore,
    },
  });
});

/**
 * POST /api/messages/schedule
 *
 * Create a new scheduled message
 */
export const POST = compose(
  withErrorHandler,
  rateLimitMiddleware,
  withAuth,
)(async (request: AuthenticatedRequest) => {
  const body = await request.json();
  const { channelId, content, scheduledAt, threadId, attachments, maxRetries } =
    body;

  // Validate required fields
  if (!channelId) {
    return badRequestResponse("channelId is required", "MISSING_CHANNEL_ID");
  }

  if (!content) {
    return badRequestResponse("content is required", "MISSING_CONTENT");
  }

  if (!scheduledAt) {
    return badRequestResponse(
      "scheduledAt is required",
      "MISSING_SCHEDULED_AT",
    );
  }

  // Parse scheduled time
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return badRequestResponse(
      "Invalid scheduledAt format",
      "INVALID_SCHEDULED_AT",
    );
  }

  const service = getScheduledMessageService();
  const result = await service.scheduleMessage({
    userId: request.user.id,
    channelId,
    content,
    scheduledAt: scheduledDate,
    threadId,
    attachments,
    maxRetries: maxRetries || 3,
  });

  if (!result.success || !result.data) {
    logger.warn("Failed to schedule message", {
      userId: request.user.id,
      channelId,
      error: result.error,
    });

    const status = result.error?.status || 400;
    if (status === 400) {
      return badRequestResponse(
        result.error?.message || "Failed to schedule message",
        result.error?.code,
      );
    }
    return badRequestResponse(
      result.error?.message || "Failed to schedule message",
    );
  }

  const scheduledMessage = result.data;

  logger.info("Scheduled message created", {
    id: scheduledMessage.id,
    userId: request.user.id,
    channelId,
    scheduledAt: scheduledDate.toISOString(),
  });

  return createdResponse({
    scheduledMessage,
    message: "Message scheduled successfully",
  });
});

/**
 * PATCH /api/messages/schedule
 *
 * Update a scheduled message
 */
export const PATCH = compose(
  withErrorHandler,
  rateLimitMiddleware,
  withAuth,
)(async (request: AuthenticatedRequest) => {
  const body = await request.json();
  const { messageId, content, scheduledAt, threadId, attachments } = body;

  if (!messageId) {
    return badRequestResponse("messageId is required", "MISSING_MESSAGE_ID");
  }

  // Validate at least one field to update
  if (
    content === undefined &&
    scheduledAt === undefined &&
    threadId === undefined &&
    attachments === undefined
  ) {
    return badRequestResponse(
      "At least one field (content, scheduledAt, threadId, or attachments) must be provided",
      "NO_UPDATE_FIELDS",
    );
  }

  // Parse scheduled time if provided
  let scheduledDate: Date | undefined;
  if (scheduledAt !== undefined) {
    scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return badRequestResponse(
        "Invalid scheduledAt format",
        "INVALID_SCHEDULED_AT",
      );
    }
  }

  const service = getScheduledMessageService();
  const result = await service.updateScheduledMessage(
    messageId,
    request.user.id,
    {
      content,
      scheduledAt: scheduledDate,
      threadId,
      attachments,
    },
  );

  if (!result.success) {
    logger.warn("Failed to update scheduled message", {
      messageId,
      userId: request.user.id,
      error: result.error,
    });

    if (result.error?.code === "NOT_FOUND") {
      return notFoundResponse("Scheduled message not found");
    }

    if (result.error?.code === "FORBIDDEN") {
      return forbiddenResponse(result.error?.message);
    }

    return badRequestResponse(
      result.error?.message || "Failed to update scheduled message",
      result.error?.code,
    );
  }

  logger.info("Scheduled message updated", {
    id: messageId,
    userId: request.user.id,
    updates: Object.keys(body).filter((k) => k !== "messageId"),
  });

  return successResponse({
    scheduledMessage: result.data,
    message: "Scheduled message updated successfully",
  });
});

/**
 * DELETE /api/messages/schedule
 *
 * Cancel/delete a scheduled message
 */
export const DELETE = compose(
  withErrorHandler,
  rateLimitMiddleware,
  withAuth,
)(async (request: AuthenticatedRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return badRequestResponse("messageId is required", "MISSING_MESSAGE_ID");
  }

  const service = getScheduledMessageService();
  const result = await service.cancelScheduledMessage(
    messageId,
    request.user.id,
  );

  if (!result.success) {
    logger.warn("Failed to cancel scheduled message", {
      messageId,
      userId: request.user.id,
      error: result.error,
    });

    if (result.error?.code === "NOT_FOUND") {
      return notFoundResponse("Scheduled message not found");
    }

    if (result.error?.code === "FORBIDDEN") {
      return forbiddenResponse(result.error?.message);
    }

    return badRequestResponse(
      result.error?.message || "Failed to cancel scheduled message",
      result.error?.code,
    );
  }

  logger.info("Scheduled message cancelled", {
    messageId,
    userId: request.user.id,
  });

  return successResponse({
    message: "Scheduled message cancelled successfully",
    messageId,
  });
});
