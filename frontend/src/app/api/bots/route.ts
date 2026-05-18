/**
 * Bot API Routes
 * CRUD operations for bot management
 *
 * GET /api/bots - List all bots
 * POST /api/bots - Create a new bot
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createLogger } from "@/lib/logger";
import {
  type Bot,
  getAllBots,
  getFilteredBots,
  addBot,
} from "@/services/bots/mock-store";

const logger = createLogger("BotAPI");

/**
 * GET /api/bots
 * List all bots (with optional filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const enabledParam = searchParams.get("enabled");
    const template_id = searchParams.get("template_id") || undefined;
    const created_by = searchParams.get("created_by") || undefined;

    // Use filtered query or get all
    const bots =
      enabledParam !== null || template_id || created_by
        ? getFilteredBots({
            enabled:
              enabledParam !== null ? enabledParam === "true" : undefined,
            template_id,
            created_by,
          })
        : getAllBots();

    logger.info("Retrieved bots", { count: bots.length });

    return NextResponse.json({
      success: true,
      data: bots,
      count: bots.length,
    });
  } catch (error) {
    logger.error("Failed to retrieve bots", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve bots",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/bots
 * Create a new bot
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ["name", "description", "code"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          fields: missingFields,
        },
        { status: 400 },
      );
    }

    // Create new bot
    const now = new Date();
    const bot: Bot = {
      id: randomUUID(),
      name: body.name,
      description: body.description,
      code: body.code,
      version: body.version || "1.0.0",
      template_id: body.template_id,
      config: body.config || {},
      enabled: body.enabled ?? true,
      created_by: body.created_by || "system",
      created_at: now,
      updated_at: now,
      sandbox_enabled: body.sandbox_enabled ?? true,
      rate_limit_per_minute: body.rate_limit_per_minute || 60,
      timeout_ms: body.timeout_ms || 5000,
    };

    // In production, insert into database
    addBot(bot);

    // Create initial version
    // In production: INSERT INTO nchat_bot_versions
    // For now, just log
    logger.info("Created bot", {
      botId: bot.id,
      name: bot.name,
      version: bot.version,
    });

    return NextResponse.json(
      {
        success: true,
        data: bot,
        message: "Bot created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create bot", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create bot",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
