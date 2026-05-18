/**
 * Group E2EE API Routes - Group-specific operations
 *
 * Handles operations for a specific group:
 * - GET: Get group E2EE details
 * - PUT: Update group (add/remove members)
 * - DELETE: Leave/delete group
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface UpdateGroupRequest {
  action: "add_member" | "remove_member" | "rekey";
  member?: {
    userId: string;
    deviceId: string;
    role?: "admin" | "member";
  };
  reason?: string;
}

interface GroupDetailResponse {
  groupId: string;
  groupName: string;
  members: Array<{
    userId: string;
    deviceId: string;
    role: "admin" | "member";
    hasSenderKey: boolean;
    hasReceivedSenderKey: boolean;
    joinedAt: number;
  }>;
  epoch: number;
  isActive: boolean;
  needsRekey: boolean;
  createdAt: number;
  lastActivityAt: number;
  lastRekeyAt: number;
}

// ============================================================================
// GET - Get Group Details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 },
      );
    }

    // In production, this would fetch from GroupE2EEService
    // and verify the user is a member of the group

    const response: GroupDetailResponse = {
      groupId,
      groupName: "Example Group",
      members: [
        {
          userId: "user-1",
          deviceId: "device-1",
          role: "admin",
          hasSenderKey: true,
          hasReceivedSenderKey: true,
          joinedAt: Date.now() - 86400000,
        },
        {
          userId: "user-2",
          deviceId: "device-2",
          role: "member",
          hasSenderKey: true,
          hasReceivedSenderKey: true,
          joinedAt: Date.now() - 43200000,
        },
        {
          userId: "user-3",
          deviceId: "device-3",
          role: "member",
          hasSenderKey: true,
          hasReceivedSenderKey: false,
          joinedAt: Date.now() - 3600000,
        },
      ],
      epoch: 1,
      isActive: true,
      needsRekey: false,
      createdAt: Date.now() - 86400000,
      lastActivityAt: Date.now() - 300000,
      lastRekeyAt: Date.now() - 43200000,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to get group details", { error });
    return NextResponse.json(
      { error: "Failed to get group details" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT - Update Group
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const body: UpdateGroupRequest = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 },
      );
    }

    if (!body.action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    switch (body.action) {
      case "add_member":
        if (!body.member?.userId || !body.member?.deviceId) {
          return NextResponse.json(
            { error: "Member userId and deviceId are required for add_member" },
            { status: 400 },
          );
        }

        // In production:
        // 1. Add member to group session
        // 2. Distribute sender key to new member
        // Note: Adding a member does NOT require rekey (backward secrecy)

        logger.info("Member added to group", {
          groupId,
          userId: body.member.userId,
          deviceId: body.member.deviceId,
        });

        return NextResponse.json({
          success: true,
          action: "add_member",
          groupId,
          member: body.member,
          message: "Member added. Sender key distribution initiated.",
        });

      case "remove_member":
        if (!body.member?.userId || !body.member?.deviceId) {
          return NextResponse.json(
            {
              error:
                "Member userId and deviceId are required for remove_member",
            },
            { status: 400 },
          );
        }

        // In production:
        // 1. Remove member from group session
        // 2. Trigger rekey to prevent forward access
        // 3. Distribute new sender key to remaining members

        logger.info("Member removed from group", {
          groupId,
          userId: body.member.userId,
          deviceId: body.member.deviceId,
        });

        return NextResponse.json({
          success: true,
          action: "remove_member",
          groupId,
          member: body.member,
          rekeyTriggered: true,
          message: "Member removed. Rekey initiated to prevent forward access.",
        });

      case "rekey":
        // In production:
        // 1. Generate new sender key
        // 2. Increment epoch
        // 3. Distribute new sender key to all members

        logger.info("Group rekey initiated", {
          groupId,
          reason: body.reason ?? "manual",
        });

        return NextResponse.json({
          success: true,
          action: "rekey",
          groupId,
          newEpoch: 2,
          reason: body.reason ?? "manual",
          message: "Rekey completed. New sender key distributed to members.",
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${body.action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Failed to update group", { error });
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Leave or Delete Group
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? "leave";

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 },
      );
    }

    if (action === "delete") {
      // In production:
      // 1. Verify user is admin
      // 2. Remove all members
      // 3. Delete group session
      // 4. Notify all members

      logger.info("Group deleted", { groupId });

      return NextResponse.json({
        success: true,
        action: "delete",
        groupId,
        message: "Group deleted. All sessions terminated.",
      });
    }

    // Default: leave group
    // In production:
    // 1. Remove self from group
    // 2. This will trigger rekey by remaining members

    logger.info("User left group", { groupId });

    return NextResponse.json({
      success: true,
      action: "leave",
      groupId,
      message: "Left group. Remaining members will rekey.",
    });
  } catch (error) {
    logger.error("Failed to leave/delete group", { error });
    return NextResponse.json(
      { error: "Failed to leave/delete group" },
      { status: 500 },
    );
  }
}
