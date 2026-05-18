/**
 * AI Channel Digest API Route
 * POST /api/ai/digest
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getChannelDigestGenerator,
  type Message,
  type ChannelDigestOptions,
} from "@/lib/ai/channel-digest";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DigestRequest {
  channelId: string;
  messages: Message[];
  options?: ChannelDigestOptions;
}

interface DigestResponse {
  success: boolean;
  digest?: any;
  error?: string;
  provider?: string;
  rateLimitInfo?: {
    remaining: number;
    resetAt: Date;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DigestRequest;

    // Validate request
    if (!body.channelId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: channelId required",
        } as DigestResponse,
        { status: 400 },
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: messages array required",
        } as DigestResponse,
        { status: 400 },
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No messages provided",
        } as DigestResponse,
        { status: 400 },
      );
    }

    // Limit message count to prevent abuse
    const MAX_MESSAGES = 1000;
    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many messages. Maximum: ${MAX_MESSAGES}`,
        } as DigestResponse,
        { status: 400 },
      );
    }

    const generator = getChannelDigestGenerator();

    // Generate digest
    const digest = await generator.generateDigest(
      body.channelId,
      body.messages,
      body.options || { period: "daily" },
    );

    return NextResponse.json({
      success: true,
      digest,
      provider: generator.getProvider(),
    } as DigestResponse);
  } catch (error) {
    logger.error("Digest generation error:", error);
    captureError(error as Error, {
      tags: { api: "ai-digest" },
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
            : "Digest generation failed",
      } as DigestResponse,
      { status: 500 },
    );
  }
}

// GET for digest schedule info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        {
          success: false,
          error: "channelId parameter required",
        } as DigestResponse,
        { status: 400 },
      );
    }

    // Return digest schedule info
    const generator = getChannelDigestGenerator();

    return NextResponse.json({
      success: true,
      provider: generator.getProvider(),
      available: generator.available(),
      schedule: {
        enabled: true,
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        frequency: "daily",
      },
    });
  } catch (error) {
    logger.error("Digest info error:", error);
    captureError(error as Error, {
      tags: { api: "ai-digest-info" },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get digest info",
      } as DigestResponse,
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
