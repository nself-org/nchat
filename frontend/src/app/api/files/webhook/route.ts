/**
 * File Processing Webhook Route
 *
 * POST /api/files/webhook - Receive processing completion webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getProcessingConfig } from "@/services/files/config";
import type {
  ProcessingWebhookPayload,
  ThumbnailRecord,
  FileRecord,
  ProcessingStatus,
} from "@/services/files/types";
import { logger } from "@/lib/logger";

// ============================================================================
// Mock Database (replace with real database queries)
// ============================================================================

// These should be imported from a shared location
const fileStore = new Map<string, FileRecord>();
const thumbnailStore = new Map<string, ThumbnailRecord[]>();

// ============================================================================
// POST - Receive processing webhook
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-signature") || "";
    const body = await request.text();

    // Verify webhook signature
    const processingConfig = getProcessingConfig();

    if (processingConfig.webhookSecret) {
      const isValid = verifySignature(
        body,
        signature,
        processingConfig.webhookSecret,
      );

      if (!isValid) {
        logger.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    // Parse payload
    const payload: ProcessingWebhookPayload = JSON.parse(body);

    // REMOVED: console.log(`Processing webhook: ${payload.event} for file ${payload.fileId}`)

    // Handle different events
    switch (payload.event) {
      case "job.completed":
        await handleJobCompleted(payload);
        break;

      case "job.failed":
        await handleJobFailed(payload);
        break;

      default:
        logger.warn(`Unknown webhook event: ${payload.event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle job completed event
 */
async function handleJobCompleted(
  payload: ProcessingWebhookPayload,
): Promise<void> {
  const { fileId, thumbnails, metadata, scan, optimization, durationMs } =
    payload;

  // Get or create file record
  let file = fileStore.get(fileId);

  if (file) {
    // Update processing status
    file.processingStatus = "completed";

    // Store additional processing results
    const fileWithMetadata = file as FileRecord & {
      fileMetadata?: unknown;
      scanResult?: unknown;
      optimizationResult?: unknown;
      processingDurationMs?: number;
    };

    if (metadata) {
      fileWithMetadata.fileMetadata = metadata;
    }

    if (scan) {
      fileWithMetadata.scanResult = scan;

      // If virus detected, mark file appropriately
      if (!scan.isClean) {
        logger.warn(
          `Virus detected in file ${fileId}: ${scan.threatNames.join(", ")}`,
        );
        // Could quarantine or delete the file here
      }
    }

    if (optimization) {
      fileWithMetadata.optimizationResult = optimization;
      // REMOVED: console.log(
      //   `File ${fileId} optimized: saved ${optimization.savingsBytes} bytes (${optimization.savingsPercent}%)`
      // )
    }

    if (durationMs) {
      fileWithMetadata.processingDurationMs = durationMs;
    }

    fileStore.set(fileId, file);
  }

  // Store thumbnails
  if (thumbnails && thumbnails.length > 0) {
    thumbnailStore.set(fileId, thumbnails);
    // REMOVED: console.log(`Stored ${thumbnails.length} thumbnails for file ${fileId}`)
  }

  // Emit real-time update if using WebSockets
  // This would notify clients that the file is ready
  await emitFileUpdate(fileId, "processing_complete", {
    status: "completed",
    thumbnails: thumbnails?.length || 0,
    hasMetadata: !!metadata,
    hasScan: !!scan,
    isClean: scan?.isClean ?? true,
  });
}

/**
 * Handle job failed event
 */
async function handleJobFailed(
  payload: ProcessingWebhookPayload,
): Promise<void> {
  const { fileId, error } = payload;

  // Update file record
  const file = fileStore.get(fileId);

  if (file) {
    file.processingStatus = "failed";

    const fileWithError = file as FileRecord & { processingError?: string };
    fileWithError.processingError = error;

    fileStore.set(fileId, file);
  }

  logger.error(`Processing failed for file ${fileId}: ${error}`);

  // Emit real-time update
  await emitFileUpdate(fileId, "processing_failed", {
    status: "failed",
    error,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison
  if (signature.length !== computed.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ computed.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Emit real-time file update (placeholder for WebSocket integration)
 */
async function emitFileUpdate(
  fileId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  // This would notify connected clients about file updates
  // For now, just log
  // REMOVED: console.log(`File update: ${event} for ${fileId}`, data)
  // Example integration with a message queue or WebSocket server:
  // await fetch('http://localhost:3001/emit', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     channel: `file:${fileId}`,
  //     event,
  //     data,
  //   }),
  // })
}

// ============================================================================
// GET - Health check for webhook endpoint
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/files/webhook",
    accepts: ["job.completed", "job.failed"],
  });
}
