/**
 * Discord Webhook Endpoint
 *
 * Receives webhook events from Discord bot
 * Note: Discord uses gateway WebSocket connections for bot events,
 * but this endpoint can receive webhook messages from Discord channels
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/discord
 *
 * Receive Discord webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Discord webhook payload structure
    // REMOVED: console.log('Discord webhook received:', {
    //   content: body.content,
    //   username: body.username,
    //   avatar_url: body.avatar_url,
    //   embeds: body.embeds?.length || 0,
    // })

    return NextResponse.json({
      success: true,
      message: "Discord webhook received",
    });
  } catch (error) {
    logger.error("Discord webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Discord webhook",
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
 * GET /api/webhooks/discord
 *
 * Webhook configuration info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    info: {
      note: "Discord primarily uses Gateway WebSocket for bot events",
      webhookSupport:
        "This endpoint can receive messages from Discord channel webhooks",
    },
    webhook: {
      url: `${request.nextUrl.origin}/api/webhooks/discord`,
      method: "POST",
      contentType: "application/json",
    },
    bot: {
      gatewayIntents: [
        "GUILDS",
        "GUILD_MESSAGES",
        "GUILD_MESSAGE_REACTIONS",
        "DIRECT_MESSAGES",
        "MESSAGE_CONTENT",
      ],
      events: [
        "messageCreate",
        "messageUpdate",
        "messageDelete",
        "messageReactionAdd",
        "messageReactionRemove",
        "channelCreate",
        "channelUpdate",
        "channelDelete",
        "guildMemberAdd",
        "guildMemberRemove",
      ],
    },
  });
}
