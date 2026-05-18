/**
 * Message Edit History API Route
 *
 * Provides endpoints for viewing and restoring message edit history.
 *
 * GET /api/messages/[id]/history - Get edit history for a message
 * POST /api/messages/[id]/history/restore - Restore message to a previous version
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";
import { getMessageService } from "@/services/messages/message.service";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const RestoreVersionSchema = z.object({
  editId: z.string().uuid("Invalid edit ID format"),
});

// ============================================================================
// SERVICES
// ============================================================================

const messageService = getMessageService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Check if user can access edit history
 * Only the original message author or admins can view edit history
 */
async function canAccessEditHistory(
  messageId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; message?: any }> {
  // Admins and moderators can always access
  if (["owner", "admin", "moderator"].includes(userRole)) {
    return { allowed: true };
  }

  // Get the message to check ownership
  const messageResult = await messageService.getMessage(messageId);
  if (!messageResult.success || !messageResult.data) {
    return { allowed: false };
  }

  // Only the author can view their own edit history
  if (messageResult.data.userId === userId) {
    return { allowed: true, message: messageResult.data };
  }

  return { allowed: false };
}

// ============================================================================
// GET /api/messages/[id]/history - Get edit history for a message
// ============================================================================

async function getEditHistoryHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const { id } = await context.params;
  const { user } = request;

  logger.info("GET /api/messages/[id]/history - Get edit history", {
    messageId: id,
    userId: user.id,
  });

  // Validate message ID format
  if (!validateUUID(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid message ID format" },
      { status: 400 },
    );
  }

  // Check permissions
  const accessCheck = await canAccessEditHistory(id, user.id, user.role);
  if (!accessCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          "You do not have permission to view edit history for this message",
      },
      { status: 403 },
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Get edit history
  const result = await messageService.getEditHistory({
    messageId: id,
    limit,
    offset,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to fetch edit history",
      },
      { status: result.error?.status || 500 },
    );
  }

  // Log audit event for viewing edit history (using 'preview' as closest action type)
  await logAuditEvent({
    action: "preview",
    actor: user.id,
    category: "message",
    resource: { type: "message", id },
    description: `Viewed edit history for message`,
    metadata: {
      editCount: result.data?.totalCount,
      historyView: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}

// ============================================================================
// POST /api/messages/[id]/history/restore - Restore to previous version
// ============================================================================

async function restoreVersionHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const { id } = await context.params;
  const { user } = request;

  logger.info("POST /api/messages/[id]/history/restore - Restore version", {
    messageId: id,
    userId: user.id,
  });

  // Validate message ID format
  if (!validateUUID(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid message ID format" },
      { status: 400 },
    );
  }

  // Check permissions - only author or admin can restore
  const accessCheck = await canAccessEditHistory(id, user.id, user.role);
  if (!accessCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "You do not have permission to restore this message",
      },
      { status: 403 },
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const validation = RestoreVersionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { editId } = validation.data;

  // Restore the version
  const result = await messageService.restoreVersion({
    messageId: id,
    editId,
    restoredBy: user.id,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to restore message version",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("POST /api/messages/[id]/history/restore - Version restored", {
    messageId: id,
    editId,
    userId: user.id,
  });

  return NextResponse.json({
    success: true,
    message: "Message restored to previous version",
    data: result.data,
  });
}

// ============================================================================
// ROUTE EXPORTS
// ============================================================================

// GET /api/messages/[id]/history - Get edit history
export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }), // 60 requests per minute
  withAuth,
)(getEditHistoryHandler as any);

// POST /api/messages/[id]/history/restore - Restore version
// Note: This is handled by a separate route file at /history/restore/route.ts
// But we include the handler here for direct POST to /history with ?action=restore
export async function POST(
  request: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  // Check if this is a restore request
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "restore") {
    const handler = compose(
      withErrorHandler,
      withRateLimit({ limit: 10, window: 60 }), // 10 restores per minute
      withAuth,
    )(restoreVersionHandler as any);

    return handler(request, context);
  }

  return NextResponse.json(
    {
      success: false,
      error: "Invalid action. Use ?action=restore for restore operations.",
    },
    { status: 400 },
  );
}
