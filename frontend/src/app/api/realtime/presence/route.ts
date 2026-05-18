import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "http://realtime.localhost:3101";

/**
 * GET /api/realtime/presence?channelId=xxx
 * Get presence information for a channel
 */
export async function GET(request: NextRequest) {
  // Authenticate user
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = request.nextUrl.searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${REALTIME_URL}/presence/${channelId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch presence" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[Realtime API] Presence fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch presence" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/realtime/presence
 * Update user presence in a channel
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, userId, status } = body;

    if (!channelId || !userId || !status) {
      return NextResponse.json(
        { error: "channelId, userId, and status are required" },
        { status: 400 },
      );
    }

    // Validate userId matches authenticated user to prevent spoofing
    if (userId !== authUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await fetch(`${REALTIME_URL}/presence/${channelId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, status }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to update presence" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[Realtime API] Presence update failed:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 },
    );
  }
}
