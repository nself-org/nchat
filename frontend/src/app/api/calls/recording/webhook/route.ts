/**
 * LiveKit Recording Webhook Handler
 * POST /api/calls/recording/webhook
 *
 * Receives egress completion events from LiveKit and updates recording status
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecordingStorageService } from "@/services/webrtc/recording-storage.service";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * Verify LiveKit webhook signature
 */
function verifyLiveKitWebhookSignature(
  payload: string,
  signature: string,
  apiKey: string,
  apiSecret: string,
): boolean {
  try {
    const hash = crypto
      .createHmac("sha256", apiSecret)
      .update(payload)
      .digest("base64");

    return hash === signature;
  } catch (error) {
    logger.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * POST /api/calls/recording/webhook
 * Handle LiveKit egress completion webhook
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("X-Livekit-Signature") || "";
    const payload = await request.text();

    // Verify webhook signature if credentials available
    const apiKey = process.env.LIVEKIT_API_KEY || "";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "";

    if (
      apiKey &&
      apiSecret &&
      !verifyLiveKitWebhookSignature(payload, signature, apiKey, apiSecret)
    ) {
      logger.warn("Invalid webhook signature", { signature });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload);

    // Handle egress completed event
    if (
      event.event === "egress_finished" ||
      event.event === "egress_complete"
    ) {
      const storageService = getRecordingStorageService();

      await storageService.processCompletedRecording({
        egressId: event.egressId || event.egress_id,
        roomName: event.roomName || event.room_name,
        status: event.status || "EGRESS_COMPLETE",
        result: event.result,
        error: event.error,
      });

      return NextResponse.json({ success: true, message: "Webhook processed" });
    }

    // Log other event types for debugging
    logger.debug("Received LiveKit webhook event", { event: event.event });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error processing recording webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
