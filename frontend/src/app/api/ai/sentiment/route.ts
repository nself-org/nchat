/**
 * AI Sentiment Analysis API Route
 * POST /api/ai/sentiment
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSentimentAnalyzer,
  type Message,
  type SentimentOptions,
} from "@/lib/ai/sentiment-analyzer";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SentimentRequest {
  message?: Message;
  messages?: Message[];
  type?: "single" | "trend" | "morale";
  period?: { start: Date; end: Date };
  options?: SentimentOptions;
}

interface SentimentResponse {
  success: boolean;
  result?: any;
  trend?: any;
  moraleReport?: any;
  error?: string;
  provider?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SentimentRequest;

    // Validate request
    if (!body.message && (!body.messages || !Array.isArray(body.messages))) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: message or messages array required",
        } as SentimentResponse,
        { status: 400 },
      );
    }

    const analyzer = getSentimentAnalyzer();
    const type = body.type || "single";

    let result: SentimentResponse = {
      success: true,
      provider: analyzer.getProvider(),
    };

    // Generate sentiment analysis based on type
    switch (type) {
      case "single": {
        if (!body.message) {
          return NextResponse.json(
            {
              success: false,
              error: "Message required for single sentiment analysis",
            } as SentimentResponse,
            { status: 400 },
          );
        }

        const analysis = await analyzer.analyzeMessage(
          body.message,
          body.options,
        );
        result.result = analysis;
        break;
      }

      case "trend": {
        if (!body.messages || body.messages.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Messages required for trend analysis",
            } as SentimentResponse,
            { status: 400 },
          );
        }

        const trend = await analyzer.analyzeTrends(body.messages, body.options);
        result.trend = trend;
        break;
      }

      case "morale": {
        if (!body.messages || body.messages.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Messages required for morale report",
            } as SentimentResponse,
            { status: 400 },
          );
        }

        if (!body.period) {
          return NextResponse.json(
            {
              success: false,
              error: "Period required for morale report",
            } as SentimentResponse,
            { status: 400 },
          );
        }

        const moraleReport = await analyzer.generateMoraleReport(
          body.messages,
          {
            start: new Date(body.period.start),
            end: new Date(body.period.end),
          },
        );
        result.moraleReport = moraleReport;
        break;
      }

      default: {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid type. Must be: single, trend, or morale",
          } as SentimentResponse,
          { status: 400 },
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Sentiment analysis error:", error);
    captureError(error as Error, {
      tags: { api: "ai-sentiment" },
      extra: { requestBody: request.body },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Sentiment analysis failed",
      } as SentimentResponse,
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
