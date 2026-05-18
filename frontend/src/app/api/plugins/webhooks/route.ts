/**
 * Webhook Management API Routes
 *
 * GET  /api/plugins/webhooks - List webhooks
 * POST /api/plugins/webhooks - Create a webhook (incoming or outgoing)
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction") as
      | "incoming"
      | "outgoing"
      | null;
    const status = searchParams.get("status") as
      | "active"
      | "paused"
      | "disabled"
      | "error"
      | null;
    const channelId = searchParams.get("channelId");

    // In a real implementation, this would query the database
    // and check authentication. For now, return a structured response.
    return NextResponse.json({
      webhooks: [],
      total: 0,
      filters: {
        direction: direction || undefined,
        status: status || undefined,
        channelId: channelId || undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list webhooks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!body.direction || !["incoming", "outgoing"].includes(body.direction)) {
      return NextResponse.json(
        { error: 'direction must be "incoming" or "outgoing"' },
        { status: 400 },
      );
    }

    if (body.direction === "incoming" && !body.channelId) {
      return NextResponse.json(
        { error: "channelId is required for incoming webhooks" },
        { status: 400 },
      );
    }

    if (body.direction === "outgoing") {
      if (!body.url) {
        return NextResponse.json(
          { error: "url is required for outgoing webhooks" },
          { status: 400 },
        );
      }
      if (
        !body.events ||
        !Array.isArray(body.events) ||
        body.events.length === 0
      ) {
        return NextResponse.json(
          { error: "events array is required for outgoing webhooks" },
          { status: 400 },
        );
      }
    }

    // In a real implementation, this would use the WebhookService
    // to create the webhook and persist it to the database.
    return NextResponse.json(
      {
        id: `wh_${Date.now()}`,
        ...body,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}
