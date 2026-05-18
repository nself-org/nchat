/**
 * GET /api/plugins/analytics/messages
 *
 * Message analytics endpoint for Analytics plugin
 * Provides message volume, type breakdown, and trends
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const groupBy = searchParams.get("groupBy") || "day";
    const channelId = searchParams.get("channelId"); // Optional: filter by channel

    let url = `${ANALYTICS_SERVICE_URL}/api/analytics/messages?period=${period}&groupBy=${groupBy}`;
    if (channelId) {
      url += `&channelId=${channelId}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics messages error:", error);
      return NextResponse.json(
        { error: "Failed to fetch message analytics" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Analytics messages proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
