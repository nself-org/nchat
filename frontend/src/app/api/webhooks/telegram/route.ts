/**
 * Telegram Webhook Endpoint
 *
 * Receives webhook updates from Telegram Bot API
 * Processes messages, callbacks, and other update types
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyTelegramWebhook } from "@/lib/integrations/telegram/telegram-client";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/telegram
 *
 * Receive Telegram webhook updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify secret token if configured
    const headersList = await headers();
    const secretToken = headersList.get("x-telegram-bot-api-secret-token");

    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (configuredSecret && secretToken) {
      const isValid = verifyTelegramWebhook(configuredSecret, secretToken);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid secret token" },
          { status: 403 },
        );
      }
    }

    // Process update
    // REMOVED: console.log('Telegram webhook received:', {
    //   update_id: body.update_id,
    //   has_message: !!body.message,
    //   has_edited_message: !!body.edited_message,
    //   has_callback_query: !!body.callback_query,
    // })

    // Telegram expects 200 OK
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Telegram webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Telegram webhook",
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
 * GET /api/webhooks/telegram
 *
 * Webhook configuration info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    webhook: {
      url: `${request.nextUrl.origin}/api/webhooks/telegram`,
      method: "POST",
      contentType: "application/json",
    },
    setup: {
      method: "Use Telegram Bot API setWebhook method",
      example: `curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" -d "url=${request.nextUrl.origin}/api/webhooks/telegram&secret_token=<YOUR_SECRET>"`,
      steps: [
        "1. Get your bot token from @BotFather",
        "2. Generate a secure secret token",
        "3. Call setWebhook API with URL and secret",
        "4. Telegram will send updates to this endpoint",
      ],
    },
    updateTypes: [
      "message",
      "edited_message",
      "channel_post",
      "edited_channel_post",
      "callback_query",
      "inline_query",
      "chosen_inline_result",
      "poll",
      "poll_answer",
    ],
  });
}
