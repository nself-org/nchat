/**
 * GET /api/plugins/workflows/templates
 *
 * Proxy to Workflows plugin for workflow templates
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const WORKFLOWS_SERVICE_URL =
  process.env.WORKFLOWS_SERVICE_URL || "http://localhost:3110";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${WORKFLOWS_SERVICE_URL}/api/workflows/templates`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Workflows service error:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Workflows templates proxy error:", error);
    return NextResponse.json(
      { error: "Workflows service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
