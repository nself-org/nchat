/**
 * Reopen Poll API Route
 *
 * POST /api/polls/[pollId]/reopen - Reopen a closed poll
 */

import { NextRequest, NextResponse } from "next/server";
import type { Poll } from "@/types/poll";
import { reopenPoll, canManagePoll } from "@/lib/polls/poll-manager";
import { nhost } from "@/lib/nhost.server";
import { logger } from "@/lib/logger";

// ============================================================================
// POST - Reopen Poll
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  try {
    const { pollId } = await params;
    const body = await request.json();
    const { closesAt } = body;

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

    // Check if poll is not closed
    if (poll.status !== "closed") {
      return NextResponse.json(
        { error: "Poll is not closed" },
        { status: 400 },
      );
    }

    // Check permissions
    if (!canManagePoll(poll, userId, userRole)) {
      return NextResponse.json(
        { error: "You do not have permission to reopen this poll" },
        { status: 403 },
      );
    }

    // Reopen poll
    const newClosesAt = closesAt ? new Date(closesAt) : undefined;
    const reopenedPoll = reopenPoll(poll, newClosesAt);

    return NextResponse.json({
      poll: reopenedPoll,
      message: "Poll reopened successfully",
    });
  } catch (error) {
    logger.error("Failed to reopen poll:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
