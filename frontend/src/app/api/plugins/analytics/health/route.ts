/**
 * GET /api/plugins/analytics/health
 *
 * Health check proxy to Analytics plugin service
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

export async function GET() {
  try {
    const response = await fetch(
      `${ANALYTICS_SERVICE_URL}/api/analytics/health`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { status: "unhealthy", error: "Service not responding" },
        { status: 503 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Analytics health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
