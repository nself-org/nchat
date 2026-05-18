/**
 * GET /api/plugins/analytics/dashboard
 *
 * Proxy to Analytics plugin service (port 3106)
 * Fetches dashboard metrics overview
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    const response = await fetch(
      `${ANALYTICS_SERVICE_URL}/api/analytics/dashboard?period=${period}`,
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
        { error: "Failed to fetch dashboard metrics" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Analytics dashboard proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
