/**
 * Chatbot API Routes
 *
 * GET /api/chatbot - Get chatbot configuration
 * PUT /api/chatbot - Update chatbot configuration
 *
 * @module api/chatbot
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getChatbotService } from "@/services/chatbot";

const logger = createLogger("ChatbotAPI");

/**
 * GET /api/chatbot
 * Get chatbot configuration
 */
export async function GET() {
  try {
    const service = getChatbotService();
    const result = await service.getConfig();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error("Failed to get chatbot config", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get chatbot config",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/chatbot
 * Update chatbot configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const service = getChatbotService();
    const result = await service.updateConfig({
      name: body.name,
      description: body.description,
      avatarUrl: body.avatarUrl,
      status: body.status,
      responseMode: body.responseMode,
      welcomeMessage: body.welcomeMessage,
      fallbackMessage: body.fallbackMessage,
      handoffMessage: body.handoffMessage,
      noAgentsMessage: body.noAgentsMessage,
      confidenceThreshold: body.confidenceThreshold,
      maxBotTurns: body.maxBotTurns,
      handoffKeywords: body.handoffKeywords,
      features: body.features,
      departments: body.departments,
      languages: body.languages,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Updated chatbot config");

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Chatbot configuration updated",
    });
  } catch (error) {
    logger.error("Failed to update chatbot config", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update chatbot config",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
