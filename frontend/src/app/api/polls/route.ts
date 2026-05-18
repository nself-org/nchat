/**
 * Polls API Route
 *
 * Handles poll creation, fetching, and listing.
 *
 * GET /api/polls - List polls (with pagination)
 * POST /api/polls - Create a new poll
 */

import { NextRequest, NextResponse } from "next/server";
import type { CreatePollInput, Poll } from "@/types/poll";
import { logger } from "@/lib/logger";
import {
  validateCreatePollInput,
  createPollObject,
  ValidationResult,
} from "@/lib/polls/poll-manager";

// ============================================================================
// GET - List Polls
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const _status = searchParams.get("status"); // 'active' | 'closed' | 'all'

    // Validate parameters
    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 },
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }

    // For now, return mock data
    const mockPolls: Poll[] = [];
    const total = 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      polls: mockPolls,
      pagination: {
        limit,
        offset,
        total,
        hasMore,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch polls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Create Poll
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body as CreatePollInput;

    const userId = "user_mock_id";

    // Validate input
    const validation: ValidationResult = validateCreatePollInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          validationErrors: validation.errors,
        },
        { status: 400 },
      );
    }

    // Create poll object
    const poll = createPollObject(input, userId);

    // For now, just return the created poll
    return NextResponse.json(
      {
        poll,
        message: "Poll created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create poll:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
