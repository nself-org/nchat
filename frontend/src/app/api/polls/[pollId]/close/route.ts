/**
 * Close Poll API Route
 *
 * POST /api/polls/[pollId]/close - Close an active poll
 */

import { NextRequest, NextResponse } from "next/server";
import type { Poll } from "@/types/poll";
import { closePoll, canManagePoll } from "@/lib/polls/poll-manager";
import { nhost } from "@/lib/nhost.server";
import { logger } from "@/lib/logger";

// ============================================================================
// POST - Close Poll
// ============================================================================

export async function POST(
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

    // Get authenticated user from session
    const session = await nhost.auth.getSession();
    const userId = session?.user?.id || "anonymous";
    const userRole = (session?.user?.metadata?.role as string) || "member";

    const poll = null as Poll | null;

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Check if poll is already closed
    if (poll.status === "closed") {
      return NextResponse.json(
        { error: "Poll is already closed" },
        { status: 400 },
      );
    }

    // Check permissions
    if (!canManagePoll(poll, userId, userRole)) {
      return NextResponse.json(
        { error: "You do not have permission to close this poll" },
        { status: 403 },
      );
    }

    // Close poll
    const closedPoll = closePoll(poll, userId);

    return NextResponse.json({
      poll: closedPoll,
      message: "Poll closed successfully",
    });
  } catch (error) {
    logger.error("Failed to close poll:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
