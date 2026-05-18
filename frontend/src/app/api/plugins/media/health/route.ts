/**
 * GET /api/plugins/media/health
 *
 * Health check proxy to Media Pipeline plugin service
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://localhost:3108";

export async function GET() {
  try {
    const response = await fetch(`${MEDIA_SERVICE_URL}/api/media/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "unhealthy", error: "Service not responding" },
        { status: 503 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Media health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
