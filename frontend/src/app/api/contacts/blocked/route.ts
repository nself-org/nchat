/**
 * Blocked Contacts API Route
 *
 * Handles blocking and unblocking users
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

interface BlockedContact {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  blockedAt: Date;
  blockedUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// In-memory store for demo purposes
const blockedStore = new Map<string, BlockedContact[]>();
const blockedByStore = new Map<string, Set<string>>(); // userId -> Set of users who blocked them

// ============================================================================
// GET - List blocked users
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const checkUserId = searchParams.get("check"); // Check if specific user is blocked

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const blocked = blockedStore.get(userId) || [];

    // If checking a specific user
    if (checkUserId) {
      const isBlocked = blocked.some((b) => b.blockedUserId === checkUserId);
      const isBlockedBy = blockedByStore.get(userId)?.has(checkUserId) || false;

      return NextResponse.json({
        isBlocked,
        isBlockedBy,
        mutuallyBlocked: isBlocked && isBlockedBy,
      });
    }

    // Sort by blocked date (newest first)
    const sorted = [...blocked].sort(
      (a, b) =>
        new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime(),
    );

    return NextResponse.json({
      blocked: sorted,
      total: sorted.length,
    });
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocked users" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Block a user
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, blockedUserId, reason, blockedUserInfo } = body;

    if (!userId || !blockedUserId) {
      return NextResponse.json(
        { error: "userId and blockedUserId are required" },
        { status: 400 },
      );
    }

    if (userId === blockedUserId) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 },
      );
    }

    // Get existing blocks
    const userBlocked = blockedStore.get(userId) || [];

    // Check if already blocked
    const existing = userBlocked.find((b) => b.blockedUserId === blockedUserId);
    if (existing) {
      return NextResponse.json(
        { error: "User is already blocked" },
        { status: 409 },
      );
    }

    // Create block entry
    const block: BlockedContact = {
      id: nanoid(),
      userId,
      blockedUserId,
      reason,
      blockedAt: new Date(),
      blockedUser: blockedUserInfo,
    };

    userBlocked.push(block);
    blockedStore.set(userId, userBlocked);

    // Update reverse lookup
    if (!blockedByStore.has(blockedUserId)) {
      blockedByStore.set(blockedUserId, new Set());
    }
    blockedByStore.get(blockedUserId)!.add(userId);

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error("Error blocking user:", error);
    return NextResponse.json(
      { error: "Failed to block user" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Unblock a user
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const blockedUserId = searchParams.get("blockedUserId");

    if (!userId || !blockedUserId) {
      return NextResponse.json(
        { error: "userId and blockedUserId are required" },
        { status: 400 },
      );
    }

    const userBlocked = blockedStore.get(userId) || [];
    const blockIndex = userBlocked.findIndex(
      (b) => b.blockedUserId === blockedUserId,
    );

    if (blockIndex === -1) {
      return NextResponse.json(
        { error: "User is not blocked" },
        { status: 404 },
      );
    }

    userBlocked.splice(blockIndex, 1);
    blockedStore.set(userId, userBlocked);

    // Update reverse lookup
    blockedByStore.get(blockedUserId)?.delete(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return NextResponse.json(
      { error: "Failed to unblock user" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper endpoint for checking block enforcement
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { actorId, targetId, action } = body;

    if (!actorId || !targetId) {
      return NextResponse.json(
        { error: "actorId and targetId are required" },
        { status: 400 },
      );
    }

    // Check if actor blocked target
    const actorBlocked = blockedStore.get(actorId) || [];
    const actorBlockedTarget = actorBlocked.some(
      (b) => b.blockedUserId === targetId,
    );

    // Check if target blocked actor
    const targetBlocked = blockedStore.get(targetId) || [];
    const targetBlockedActor = targetBlocked.some(
      (b) => b.blockedUserId === actorId,
    );

    const blocked = actorBlockedTarget || targetBlockedActor;

    // Define which actions are blocked
    const blockedActions = [
      "send_message",
      "send_dm",
      "call",
      "invite_to_channel",
      "mention",
      "send_contact_invite",
    ];

    let allowed = true;
    let reason: string | undefined;

    if (blocked && blockedActions.includes(action)) {
      allowed = false;
      reason = actorBlockedTarget
        ? "You have blocked this user"
        : "This user has blocked you";
    }

    return NextResponse.json({
      allowed,
      reason,
      actorBlockedTarget,
      targetBlockedActor,
    });
  } catch (error) {
    console.error("Error checking block enforcement:", error);
    return NextResponse.json(
      { error: "Failed to check block enforcement" },
      { status: 500 },
    );
  }
}
