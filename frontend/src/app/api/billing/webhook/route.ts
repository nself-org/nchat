/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint for subscription and payment events.
 * Implements replay protection and idempotent processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWebhookHandler } from "@/lib/billing/webhook-handler";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 },
      );
    }

    // Get raw body
    const rawBody = await request.text();

    // Process webhook event with replay protection
    const webhookHandler = getWebhookHandler();
    const result = await webhookHandler.processEvent(rawBody, signature);

    // Handle different processing outcomes
    if (result.status === "skipped_duplicate") {
      // Duplicate event - acknowledge but don't reprocess
      return NextResponse.json({
        received: true,
        status: "skipped_duplicate",
        message: "Event already processed",
      });
    }

    if (result.status === "skipped_old") {
      // Event too old
      return NextResponse.json({
        received: true,
        status: "skipped_old",
        message: "Event expired",
      });
    }

    if (!result.success) {
      logger.error("Webhook processing failed:", {
        eventId: result.eventId,
        eventType: result.eventType,
        error: result.error,
      });
      return NextResponse.json(
        {
          error: "Webhook processing failed",
          details: result.error,
          eventId: result.eventId,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      received: true,
      status: result.status,
      eventId: result.eventId,
      eventType: result.eventType,
      duration: result.duration,
    });
  } catch (error) {
    logger.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
