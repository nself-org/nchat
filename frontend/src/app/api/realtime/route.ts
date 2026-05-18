import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "http://realtime.localhost:3101";

/**
 * GET /api/realtime
 * Health check for realtime plugin
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${REALTIME_URL}/health`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "unhealthy",
          error: "Realtime service returned non-200 status",
          statusCode: response.status,
        },
        { status: 503 },
      );
    }

    const data = await response.json();
    return NextResponse.json({
      status: "healthy",
      service: "realtime",
      data,
    });
  } catch (error) {
    logger.error("[Realtime API] Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Realtime service unavailable",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 503 },
    );
  }
}
