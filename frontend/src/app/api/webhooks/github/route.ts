/**
 * GitHub Webhook Endpoint
 *
 * Receives webhook events from GitHub (push, PR, issues, etc.)
 * Verifies signature and processes events.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getWebhookHandlerManager } from "@/lib/integrations/webhook-handler";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/github
 *
 * Receive GitHub webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const headersList = await headers();
    const signature = headersList.get("x-hub-signature-256") || "";
    const event = headersList.get("x-github-event") || "";
    const delivery = headersList.get("x-github-delivery") || "";

    // Read raw payload (needed for signature verification)
    const rawBody = await request.text();

    // Convert headers to object
    const headersObj: Record<string, string> = {};
    headersList.forEach((value, key) => {
      headersObj[key] = value;
    });

    // Process webhook through handler manager
    const manager = getWebhookHandlerManager();
    const result = await manager.processWebhook(rawBody, headersObj);

    if (!result.success) {
      logger.error("GitHub webhook processing failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // REMOVED: console.log('GitHub webhook processed:', {
    //   event,
    //   delivery,
    //   success: true,
    // })

    return NextResponse.json({
      success: true,
      event,
      delivery,
      message: result.message,
    });
  } catch (error) {
    logger.error("GitHub webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process GitHub webhook",
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
 * GET /api/webhooks/github
 *
 * Webhook configuration info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    webhook: {
      url: `${request.nextUrl.origin}/api/webhooks/github`,
      method: "POST",
      contentType: "application/json",
      events: [
        "push",
        "pull_request",
        "issues",
        "issue_comment",
        "pull_request_review",
        "commit_comment",
        "release",
        "deployment",
        "deployment_status",
        "check_run",
        "check_suite",
      ],
    },
    setup: {
      steps: [
        "1. Go to your GitHub repository settings",
        "2. Navigate to Webhooks section",
        '3. Click "Add webhook"',
        "4. Set Payload URL to the webhook URL above",
        "5. Set Content type to application/json",
        "6. Set Secret (recommended for security)",
        "7. Select events you want to receive",
        "8. Ensure webhook is Active",
      ],
    },
  });
}
