/**
 * Incoming Webhook Endpoint
 *
 * POST /api/plugins/webhooks/incoming/[token] - Receive incoming webhook payload
 *
 * This endpoint receives messages from external services that want to
 * post content into nChat channels.
 */

import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Webhook token is required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate minimal payload
    if (!body.content && !body.text && !body.embeds && !body.attachments) {
      return NextResponse.json(
        { error: "Request must include content, text, embeds, or attachments" },
        { status: 400 },
      );
    }

    // In a real implementation, this would:
    // 1. Look up the webhook by token
    // 2. Verify the webhook is active and incoming
    // 3. Check rate limits
    // 4. Validate and process the payload
    // 5. Create the message in the target channel

    return NextResponse.json({
      ok: true,
      message: "Webhook received",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
