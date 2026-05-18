/**
 * GET /api/plugins/ai/health
 *
 * Health check proxy to AI Orchestration plugin service
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:3109";

export async function GET() {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
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
    logger.error("AI health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
