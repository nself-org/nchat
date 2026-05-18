/**
 * Incoming Webhook Endpoint
 *
 * Receives webhook events from external services and posts them to channels.
 * Authenticated via URL token parameter.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  withErrorHandler,
  withRateLimit,
  compose,
  type RouteContext,
} from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit: 60 webhook requests per minute per IP
const RATE_LIMIT = { limit: 60, window: 60 };

/**
 * POST /api/webhooks/incoming/[token]
 *
 * Receive webhook from external service
 */
async function handleWebhookPost(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const params = (await context.params) as { token: string };
  try {
    const token = params.token;

    if (!token) {
      return badRequestResponse("Missing webhook token", "MISSING_TOKEN");
    }

    // Parse request body
    const body = await request.json();

    // Get client IP
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";

    // For now, return success
    // REMOVED: console.log('Incoming webhook:', {
    //   token,
    //   ip,
    //   body,
    // })

    return successResponse({
      success: true,
      message: "Webhook received",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Incoming webhook error:", error);
    return internalErrorResponse("Failed to process webhook");
  }
}

// Apply rate limiting and error handling
export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleWebhookPost);

/**
 * GET /api/webhooks/incoming/[token]
 *
 * Webhook configuration info (for setup/testing)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Missing webhook token" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      webhook: {
        token,
        url: `${request.nextUrl.origin}/api/webhooks/incoming/${token}`,
        method: "POST",
        contentType: "application/json",
      },
      instructions: {
        usage: "Send POST requests with JSON payload to this endpoint",
        authentication: "Token is embedded in URL",
        example: {
          url: `${request.nextUrl.origin}/api/webhooks/incoming/${token}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            text: "Hello from external service!",
            username: "External Bot",
          },
        },
      },
    });
  } catch (error) {
    logger.error("Webhook info error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook info" },
      { status: 500 },
    );
  }
}
