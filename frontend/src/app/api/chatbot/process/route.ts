/**
 * Chatbot Process Message API Route
 *
 * POST /api/chatbot/process - Process a visitor message and get bot response
 *
 * @module api/chatbot/process
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getChatbotService, getHandoffService } from "@/services/chatbot";

const logger = createLogger("ChatbotProcessAPI");

/**
 * POST /api/chatbot/process
 * Process a visitor message through the chatbot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.conversationId || !body.visitorId || !body.message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          fields: ["conversationId", "visitorId", "message"].filter(
            (f) => !body[f],
          ),
        },
        { status: 400 },
      );
    }

    const chatbotService = getChatbotService();
    const handoffService = getHandoffService();

    // Process the message
    const result = await chatbotService.processMessage({
      conversationId: body.conversationId,
      visitorId: body.visitorId,
      message: body.message,
      metadata: body.metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    const { response, context, shouldHandoff, handoffReason } = result.data!;

    // If handoff should be triggered, initiate it
    let handoffRequest = null;
    if (shouldHandoff && response.triggerHandoff) {
      const handoffResult = await handoffService.initiateHandoff({
        conversationId: body.conversationId,
        trigger: context.lastIntent?.requestsHuman
          ? "user_request"
          : "low_confidence",
        reason: handoffReason,
        priority:
          context.sentimentHistory.slice(-3).reduce((a, b) => a + b, 0) / 3 <
          -0.3
            ? "high"
            : "medium",
        department: body.department,
      });

      if (handoffResult.success) {
        handoffRequest = handoffResult.data;
      }
    }

    logger.debug("Processed message", {
      conversationId: body.conversationId,
      intent: context.lastIntent?.intent,
      confidence: context.lastIntent?.confidence,
      shouldHandoff,
    });

    return NextResponse.json({
      success: true,
      data: {
        response,
        context: {
          state: context.state,
          botTurns: context.botTurns,
          lastIntent: context.lastIntent,
          sentimentHistory: context.sentimentHistory.slice(-5),
        },
        shouldHandoff,
        handoffReason,
        handoffRequest,
      },
    });
  } catch (error) {
    logger.error("Failed to process message", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process message",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
