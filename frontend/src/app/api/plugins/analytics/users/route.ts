/**
 * GET /api/plugins/analytics/users
 *
 * Proxy to Analytics plugin service
 * Fetches user analytics data
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const limit = searchParams.get("limit") || "100";

    const response = await fetch(
      `${ANALYTICS_SERVICE_URL}/api/analytics/users?period=${period}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics service error:", error);
      return NextResponse.json(
        { error: "Failed to fetch user analytics" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Analytics users proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
