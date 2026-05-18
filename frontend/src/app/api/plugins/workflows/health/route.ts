/**
 * GET /api/plugins/workflows/health
 *
 * Health check proxy to Workflows plugin service
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const WORKFLOWS_SERVICE_URL =
  process.env.WORKFLOWS_SERVICE_URL || "http://localhost:3110";

export async function GET() {
  try {
    const response = await fetch(
      `${WORKFLOWS_SERVICE_URL}/api/workflows/health`,
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
    logger.error("Workflows health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
