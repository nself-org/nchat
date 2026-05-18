/**
 * Slack Webhook Endpoint
 *
 * Receives webhook events from Slack (messages, reactions, etc.)
 * Handles URL verification challenge and event subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getWebhookHandlerManager } from "@/lib/integrations/webhook-handler";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/slack
 *
 * Receive Slack webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw payload
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Handle URL verification challenge (first-time setup)
    if (body.type === "url_verification") {
      return NextResponse.json({
        challenge: body.challenge,
      });
    }

    // Get webhook headers
    const headersList = await headers();
    const signature = headersList.get("x-slack-signature") || "";
    const timestamp = headersList.get("x-slack-request-timestamp") || "";

    // Convert headers to object
    const headersObj: Record<string, string> = {};
    headersList.forEach((value, key) => {
      headersObj[key] = value;
    });

    // Process webhook through handler manager
    const manager = getWebhookHandlerManager();
    const result = await manager.processWebhook(rawBody, headersObj);

    if (!result.success) {
      logger.error("Slack webhook processing failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // REMOVED: console.log('Slack webhook processed:', {
    //   type: body.type,
    //   event: body.event?.type,
    //   success: true,
    // })

    // Slack expects a 200 OK response quickly
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Slack webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Slack webhook",
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

/**
 * GET /api/webhooks/slack
 *
 * Webhook configuration info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    webhook: {
      url: `${request.nextUrl.origin}/api/webhooks/slack`,
      method: "POST",
      contentType: "application/json",
      events: [
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "channel_created",
        "channel_deleted",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
      ],
    },
    setup: {
      steps: [
        "1. Go to https://api.slack.com/apps",
        "2. Select your app or create a new one",
        '3. Navigate to "Event Subscriptions"',
        "4. Enable Events",
        "5. Set Request URL to the webhook URL above",
        "6. Subscribe to bot events you want to receive",
        "7. Save Changes",
        "8. Reinstall app to workspace",
      ],
    },
  });
}
