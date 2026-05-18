/**
 * Bot Enable/Disable API Route
 *
 * POST /api/bots/[id]/enable - Enable or disable a bot
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createLogger } from "@/lib/logger";

const logger = createLogger("BotAPI");

/**
 * POST /api/bots/[id]/enable
 * Enable or disable a bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "enabled field must be a boolean",
        },
        { status: 400 },
      );
    }

    // In production: UPDATE nchat_bots SET enabled = $1, updated_at = NOW() WHERE id = $2
    // For now, just log
    logger.info(`${enabled ? "Enabled" : "Disabled"} bot`, { botId: id });

    // Log event
    // INSERT INTO nchat_bot_events (bot_id, event_type, success)
    // VALUES ($1, ${enabled ? 'started' : 'stopped'}, true)

    return NextResponse.json({
      success: true,
      data: {
        id,
        enabled,
      },
      message: `Bot ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    logger.error("Failed to toggle bot status", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to toggle bot status",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
