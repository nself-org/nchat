/**
 * Search Initialization API Route
 *
 * POST /api/search/initialize
 * Initializes MeiliSearch indexes and performs initial indexing
 */

import { NextRequest, NextResponse } from "next/server";
import {
  initializeIndexes,
  healthCheck,
} from "@/lib/search/meilisearch-client";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/search/initialize
 * Initialize MeiliSearch indexes
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check MeiliSearch health
    const health = await healthCheck();

    if (!health.healthy) {
      return NextResponse.json(
        {
          success: false,
          error: "MeiliSearch is not available",
          details: health.error,
        },
        { status: 503 },
      );
    }

    // Initialize indexes
    await initializeIndexes();

    return NextResponse.json({
      success: true,
      message: "MeiliSearch indexes initialized successfully",
      version: health.version,
    });
  } catch (error) {
    logger.error("Error initializing search:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Initialization failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/search/initialize
 * Check MeiliSearch status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const health = await healthCheck();

    return NextResponse.json({
      healthy: health.healthy,
      version: health.version,
      error: health.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Health check failed",
      },
      { status: 500 },
    );
  }
}
