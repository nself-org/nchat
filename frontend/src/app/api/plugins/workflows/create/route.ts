/**
 * POST /api/plugins/workflows/create
 *
 * Proxy to Workflows plugin for creating workflows
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const WORKFLOWS_SERVICE_URL =
  process.env.WORKFLOWS_SERVICE_URL || "http://localhost:3110";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${WORKFLOWS_SERVICE_URL}/api/workflows/workflows`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Workflows service error:", error);
      return NextResponse.json(
        { error: "Failed to create workflow" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Workflows create proxy error:", error);
    return NextResponse.json(
      { error: "Workflows service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
