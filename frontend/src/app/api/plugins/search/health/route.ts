/**
 * GET /api/plugins/search/health
 *
 * Health check proxy to Advanced Search plugin service
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3107";

export async function GET() {
  try {
    const response = await fetch(`${SEARCH_SERVICE_URL}/api/search/health`, {
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
    logger.error("Search health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
