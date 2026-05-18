/**
 * Template Instantiation API Route
 *
 * POST /api/bots/templates/[id]/instantiate - Create a bot from template
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { randomUUID } from "crypto";
import { createLogger } from "@/lib/logger";
import { getTemplate } from "@/lib/bots/templates";

const logger = createLogger("BotTemplatesAPI");

/**
 * POST /api/bots/templates/[id]/instantiate
 * Create a new bot instance from a template
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

    const { id: templateId } = await params;
    const body = await request.json();

    // Get template
    const template = getTemplate(templateId);

    if (!template) {
      // Try database for custom templates
      // SELECT * FROM nchat_bot_templates WHERE id = $1

      return NextResponse.json(
        {
          success: false,
          error: "Template not found",
        },
        { status: 404 },
      );
    }

    // Validate custom configuration against schema
    const config = { ...template.defaultConfig, ...(body.config || {}) };

    // Create new bot from template
    const now = new Date();
    const templateWithCode = template as typeof template & { code?: string };
    const bot = {
      id: randomUUID(),
      name: body.name || template.name,
      description: body.description || template.description,
      code:
        templateWithCode.code ||
        `// Bot instantiated from template: ${template.id}`,
      version: "1.0.0",
      template_id: templateId,
      config,
      enabled: body.enabled ?? true,
      created_by: body.created_by || "system",
      created_at: now,
      updated_at: now,
      sandbox_enabled: true,
      rate_limit_per_minute: 60,
      timeout_ms: 5000,
    };

    // In production: INSERT INTO nchat_bots
    // Also create initial version in nchat_bot_versions

    logger.info("Instantiated bot from template", {
      templateId,
      botId: bot.id,
      botName: bot.name,
    });

    return NextResponse.json(
      {
        success: true,
        data: bot,
        message: "Bot created from template successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to instantiate bot from template", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to instantiate bot",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
