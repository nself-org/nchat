/**
 * Message Delivered API Route
 *
 * Marks a message as delivered when it reaches the client.
 *
 * POST /api/messages/[id]/delivered - Mark message as delivered
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getReceiptService } from "@/services/messages/receipt.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const MarkDeliveredSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// ============================================================================
// SERVICES
// ============================================================================

const receiptService = getReceiptService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// POST /api/messages/[id]/delivered - Mark message as delivered
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("POST /api/messages/[id]/delivered - Mark as delivered", {
      messageId,
    });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = MarkDeliveredSchema.safeParse(body);
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

    const { userId } = validation.data;

    const result = await receiptService.markDelivered(messageId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to mark message as delivered",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("POST /api/messages/[id]/delivered - Success", {
      messageId,
      userId,
      status: result.data?.receipt.status,
    });

    return NextResponse.json({
      success: true,
      receipt: result.data?.receipt,
    });
  } catch (error) {
    logger.error("POST /api/messages/[id]/delivered - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to mark message as delivered",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
