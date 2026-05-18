/**
 * Message Version Restore API Route
 *
 * Restores a message to a previous version from its edit history.
 *
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
import { logAuditEvent, logSecurityEvent } from "@/lib/audit";

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
 * Check if user can restore a message version
 * Only the original message author or admins can restore
 */
async function canRestoreMessage(
  messageId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; message?: any; reason?: string }> {
  // Get the message to check ownership
  const messageResult = await messageService.getMessage(messageId);
  if (!messageResult.success || !messageResult.data) {
    return { allowed: false, reason: "Message not found" };
  }

  const message = messageResult.data;

  // Check if message is deleted
  if (message.isDeleted) {
    return { allowed: false, reason: "Cannot restore deleted messages" };
  }

  // Admins and owners can always restore
  if (["owner", "admin"].includes(userRole)) {
    return { allowed: true, message };
  }

  // Moderators can restore if the message author is not an admin
  if (userRole === "moderator") {
    // Allow moderators to restore messages from regular members
    return { allowed: true, message };
  }

  // Only the original author can restore their own messages
  if (message.userId === userId) {
    return { allowed: true, message };
  }

  return {
    allowed: false,
    reason: "You do not have permission to restore this message",
  };
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
    userRole: user.role,
  });

  // Validate message ID format
  if (!validateUUID(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid message ID format" },
      { status: 400 },
    );
  }

  // Check permissions
  const accessCheck = await canRestoreMessage(id, user.id, user.role);
  if (!accessCheck.allowed) {
    // Log security event for unauthorized restore attempt
    await logSecurityEvent("suspicious_activity", user.id, {
      severity: "warning",
      resource: { type: "message", id },
      description: `Unauthorized message restore attempt: ${accessCheck.reason}`,
      metadata: {
        userRole: user.role,
        reason: accessCheck.reason,
        attemptedAction: "message_restore",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          accessCheck.reason ||
          "You do not have permission to restore this message",
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

  // Validate edit ID format
  if (!validateUUID(editId)) {
    return NextResponse.json(
      { success: false, error: "Invalid edit ID format" },
      { status: 400 },
    );
  }

  // Get the edit record first to verify it exists and belongs to this message
  const editResult = await messageService.getEditById(editId);
  if (!editResult.success || !editResult.data) {
    return NextResponse.json(
      { success: false, error: "Edit record not found" },
      { status: 404 },
    );
  }

  // Verify the edit belongs to this message
  if (editResult.data.messageId !== id) {
    await logSecurityEvent("suspicious_activity", user.id, {
      severity: "warning",
      resource: { type: "message", id },
      description: "Attempted to restore message with mismatched edit ID",
      metadata: {
        attemptedAction: "message_restore_mismatch",
        requestedMessageId: id,
        editMessageId: editResult.data.messageId,
        editId,
      },
    });

    return NextResponse.json(
      { success: false, error: "Edit record does not belong to this message" },
      { status: 400 },
    );
  }

  // Perform the restoration
  const result = await messageService.restoreVersion({
    messageId: id,
    editId,
    restoredBy: user.id,
  });

  if (!result.success) {
    logger.error("POST /api/messages/[id]/history/restore - Restore failed", {
      messageId: id,
      editId,
      error: result.error?.message,
    });

    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to restore message version",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info(
    "POST /api/messages/[id]/history/restore - Version restored successfully",
    {
      messageId: id,
      editId,
      userId: user.id,
      restoredFromDate: editResult.data.editedAt.toISOString(),
    },
  );

  return NextResponse.json({
    success: true,
    message: "Message restored to previous version",
    data: {
      message: result.data,
      restoredFrom: {
        editId,
        editedAt: editResult.data.editedAt,
        editor: editResult.data.editor,
      },
    },
  });
}

// ============================================================================
// ROUTE EXPORTS
// ============================================================================

// POST /api/messages/[id]/history/restore - Restore version
export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }), // 10 restores per minute
  withAuth,
)(restoreVersionHandler as any);
