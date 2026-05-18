/**
 * Bot Templates API Route
 *
 * GET /api/bots/templates - List all bot templates
 * POST /api/bots/templates/[id]/instantiate - Create bot from template
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createLogger } from "@/lib/logger";
import {
  allTemplates,
  getTemplate,
  getTemplatesByCategory,
  getFeaturedTemplates,
} from "@/lib/bots/templates";

const logger = createLogger("BotTemplatesAPI");

/**
 * GET /api/bots/templates
 * List all available bot templates
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
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");

    let templates: readonly (typeof allTemplates)[number][] = allTemplates;

    if (featured === "true") {
      templates = getFeaturedTemplates();
    } else if (category) {
      templates = getTemplatesByCategory(category);
    }

    // In production: Also query custom templates from database
    // SELECT * FROM nchat_bot_templates
    // WHERE ($1::text IS NULL OR category = $1)
    // AND ($2::boolean IS NULL OR is_featured = $2)

    logger.info("Retrieved bot templates", {
      count: templates.length,
      category,
      featured,
    });

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error("Failed to retrieve bot templates", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve bot templates",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/bots/templates
 * Create a new custom template (admin only)
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
    const requiredFields = ["id", "name", "description", "category", "code"];
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

    // In production: INSERT INTO nchat_bot_templates
    const template = {
      id: body.id,
      name: body.name,
      description: body.description,
      category: body.category,
      icon: body.icon,
      code: body.code,
      config_schema: body.config_schema || {},
      default_config: body.default_config || {},
      is_system: false,
      is_featured: body.is_featured || false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    logger.info("Created custom template", {
      templateId: template.id,
      name: template.name,
    });

    return NextResponse.json(
      {
        success: true,
        data: template,
        message: "Template created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create template", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create template",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
