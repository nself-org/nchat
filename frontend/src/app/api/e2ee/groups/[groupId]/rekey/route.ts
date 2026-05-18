/**
 * Group E2EE Rekey API Route
 *
 * Handles group sender key rotation (rekey):
 * - POST: Trigger a rekey operation
 * - GET: Get rekey history
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface RekeyRequest {
  reason?:
    | "member_removed"
    | "member_left"
    | "scheduled"
    | "manual"
    | "chain_exhausted";
  force?: boolean;
}

interface RekeyResponse {
  success: boolean;
  groupId: string;
  previousEpoch: number;
  newEpoch: number;
  reason: string;
  membersToDistribute: number;
  distributionStarted: boolean;
  timestamp: number;
}

interface RekeyHistoryEntry {
  epoch: number;
  reason: string;
  triggeredBy: string;
  triggeredAt: number;
  completedAt: number | null;
  membersDistributed: number;
  membersFailed: number;
}

// ============================================================================
// POST - Trigger Rekey
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const body: RekeyRequest = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 },
      );
    }

    // Validate reason
    const validReasons = [
      "member_removed",
      "member_left",
      "scheduled",
      "manual",
      "chain_exhausted",
    ];
    const reason = body.reason ?? "manual";

    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(", ")}` },
        { status: 400 },
      );
    }

    // In production:
    // 1. Verify user has permission to trigger rekey
    // 2. Check if rekey is actually needed (unless force=true)
    // 3. Generate new sender key
    // 4. Increment epoch
    // 5. Queue distribution to all members
    // 6. Log rekey event

    const previousEpoch = 1; // Would come from current session
    const newEpoch = previousEpoch + 1;

    logger.info("Group rekey triggered", {
      groupId,
      reason,
      previousEpoch,
      newEpoch,
      force: body.force ?? false,
    });

    const response: RekeyResponse = {
      success: true,
      groupId,
      previousEpoch,
      newEpoch,
      reason,
      membersToDistribute: 5, // Would come from actual member count
      distributionStarted: true,
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to trigger rekey", { error });
    return NextResponse.json(
      { error: "Failed to trigger rekey" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Rekey History
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 },
      );
    }

    // In production, this would fetch rekey history from storage

    const history: RekeyHistoryEntry[] = [
      {
        epoch: 2,
        reason: "member_removed",
        triggeredBy: "user-1",
        triggeredAt: Date.now() - 3600000,
        completedAt: Date.now() - 3590000,
        membersDistributed: 4,
        membersFailed: 0,
      },
      {
        epoch: 1,
        reason: "manual",
        triggeredBy: "user-1",
        triggeredAt: Date.now() - 86400000,
        completedAt: Date.now() - 86390000,
        membersDistributed: 5,
        membersFailed: 0,
      },
      {
        epoch: 0,
        reason: "initial",
        triggeredBy: "system",
        triggeredAt: Date.now() - 172800000,
        completedAt: Date.now() - 172790000,
        membersDistributed: 3,
        membersFailed: 0,
      },
    ];

    return NextResponse.json({
      groupId,
      currentEpoch: 2,
      history: history.slice(0, limit),
      totalRekeys: history.length,
    });
  } catch (error) {
    logger.error("Failed to get rekey history", { error });
    return NextResponse.json(
      { error: "Failed to get rekey history" },
      { status: 500 },
    );
  }
}
