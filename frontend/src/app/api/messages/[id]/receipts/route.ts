/**
 * Message Receipts API Route
 *
 * Retrieves delivery receipts for a specific message.
 *
 * GET /api/messages/[id]/receipts - Get all receipts for a message
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";
import { getReceiptService } from "@/services/messages/receipt.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
// GET /api/messages/[id]/receipts - Get message receipts
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("GET /api/messages/[id]/receipts - Get receipts", {
      messageId,
    });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const result = await receiptService.getReceiptsForMessage(messageId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to fetch receipts",
        },
        { status: result.error?.status || 500 },
      );
    }

    const { receipts, summary } = result.data!;

    logger.info("GET /api/messages/[id]/receipts - Success", {
      messageId,
      totalRecipients: summary.totalRecipients,
      deliveredCount: summary.deliveredCount,
      readCount: summary.readCount,
    });

    return NextResponse.json({
      success: true,
      receipts,
      summary: {
        messageId: summary.messageId,
        totalRecipients: summary.totalRecipients,
        deliveredCount: summary.deliveredCount,
        readCount: summary.readCount,
      },
    });
  } catch (error) {
    logger.error("GET /api/messages/[id]/receipts - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch receipts",
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
