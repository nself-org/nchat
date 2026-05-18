/**
 * Individual Webhook API Routes
 *
 * GET    /api/plugins/webhooks/[id] - Get webhook details
 * PUT    /api/plugins/webhooks/[id] - Update webhook
 * DELETE /api/plugins/webhooks/[id] - Delete webhook
 */

import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 },
      );
    }

    // In a real implementation, this would look up the webhook by ID
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get webhook" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 },
      );
    }

    // In a real implementation, this would update the webhook
    return NextResponse.json({
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 },
      );
    }

    // In a real implementation, this would delete the webhook
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 },
    );
  }
}
