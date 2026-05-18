/**
 * Jira Webhook Endpoint
 *
 * Receives webhook events from Jira (issue updates, comments, transitions)
 * Verifies signature and processes events.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getWebhookHandlerManager } from "@/lib/integrations/webhook-handler";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/jira
 *
 * Receive Jira webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const headersList = await headers();

    // Read raw payload
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Convert headers to object
    const headersObj: Record<string, string> = {};
    headersList.forEach((value, key) => {
      headersObj[key] = value;
    });

    // Process webhook through handler manager
    const manager = getWebhookHandlerManager();
    const result = await manager.processWebhook(rawBody, headersObj);

    if (!result.success) {
      logger.error("Jira webhook processing failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // REMOVED: console.log('Jira webhook processed:', {
    //   webhookEvent: body.webhookEvent,
    //   issueKey: body.issue?.key,
    //   success: true,
    // })

    return NextResponse.json({
      success: true,
      webhookEvent: body.webhookEvent,
      message: result.message,
    });
  } catch (error) {
    logger.error("Jira webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Jira webhook",
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
 * GET /api/webhooks/jira
 *
 * Webhook configuration info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    webhook: {
      url: `${request.nextUrl.origin}/api/webhooks/jira`,
      method: "POST",
      contentType: "application/json",
      events: [
        "jira:issue_created",
        "jira:issue_updated",
        "jira:issue_deleted",
        "comment_created",
        "comment_updated",
        "comment_deleted",
        "worklog_created",
        "worklog_updated",
        "worklog_deleted",
        "project_created",
        "project_updated",
        "project_deleted",
        "sprint_created",
        "sprint_updated",
        "sprint_deleted",
        "sprint_started",
        "sprint_closed",
      ],
    },
    setup: {
      steps: [
        "1. Log in to your Jira instance as an administrator",
        "2. Go to Settings > System > WebHooks",
        '3. Click "Create a WebHook"',
        "4. Set URL to the webhook URL above",
        "5. Select events you want to receive",
        "6. Optionally configure JQL filter",
        "7. Save the webhook",
      ],
    },
  });
}
