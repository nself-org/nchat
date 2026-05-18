/**
 * Poll Voting API Route
 *
 * POST /api/polls/[pollId]/vote - Cast or change vote
 * DELETE /api/polls/[pollId]/vote - Remove vote
 */

import { NextRequest, NextResponse } from "next/server";
import type { Poll, CastVoteInput } from "@/types/poll";
import {
  validateVoteInput,
  processPollVote,
  removePollVote,
} from "@/lib/polls/poll-manager";

import { logger } from "@/lib/logger";

// ============================================================================
// POST - Cast or Change Vote
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  try {
    const { pollId } = await params;
    const body = await request.json();
    const { optionIds } = body;

    if (!pollId) {
      return NextResponse.json(
        { error: "Poll ID is required" },
        { status: 400 },
      );
    }

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { error: "At least one option must be selected" },
        { status: 400 },
      );
    }

    const userId = "user_mock_id";

    const poll: Poll | null = null;

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Validate vote
    const voteInput: CastVoteInput = {
      pollId,
      optionIds,
    };
    const validation = validateVoteInput(poll, voteInput);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          validationErrors: validation.errors,
        },
        { status: 400 },
      );
    }

    const previousVote = undefined;

    // Process vote
    const updatedPoll = processPollVote(poll, userId, optionIds, previousVote);

    return NextResponse.json({
      poll: updatedPoll,
      message: previousVote
        ? "Vote updated successfully"
        : "Vote recorded successfully",
    });
  } catch (error) {
    logger.error("Failed to vote:", error);
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

// ============================================================================
// DELETE - Remove Vote
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  try {
    const { pollId } = await params;

    if (!pollId) {
      return NextResponse.json(
        { error: "Poll ID is required" },
        { status: 400 },
      );
    }

    const userId = "user_mock_id";

    const poll: Poll | null = null;

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const userVote = null;

    if (!userVote) {
      return NextResponse.json(
        { error: "No vote found to remove" },
        { status: 404 },
      );
    }

    // Remove vote
    const updatedPoll = removePollVote(poll, userId, userVote);

    return NextResponse.json({
      poll: updatedPoll,
      message: "Vote removed successfully",
    });
  } catch (error) {
    logger.error("Failed to remove vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
