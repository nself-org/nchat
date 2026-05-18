/**
 * Meetings API - Participants Routes
 *
 * Handles participant invitations and management.
 *
 * @route GET /api/meetings/:id/participants - List participants
 * @route POST /api/meetings/:id/participants - Invite participants
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService } from "@/services/meetings";
import type { ParticipantRole } from "@/lib/meetings/meeting-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/meetings/:id/participants - List participants
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const meetingService = getMeetingService();

    const meeting = await meetingService.getMeeting(id);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    // Get stats
    const stats = await meetingService.getMeetingStats(id);

    return NextResponse.json({
      success: true,
      data: {
        participants: meeting.participants,
        total: meeting.participantCount,
        stats,
      },
    });
  } catch (error) {
    console.error("Failed to fetch participants:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch participants" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/meetings/:id/participants - Invite participants
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.inviterId) {
      return NextResponse.json(
        { success: false, error: "Inviter ID is required" },
        { status: 400 },
      );
    }

    if (
      !body.userIds ||
      !Array.isArray(body.userIds) ||
      body.userIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "At least one user ID is required" },
        { status: 400 },
      );
    }

    const meetingService = getMeetingService();

    const result = await meetingService.inviteParticipants(
      id,
      body.userIds,
      (body.role as ParticipantRole) || "participant",
      body.inviterId,
      body.sendEmail ?? true,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        participants: result.participants,
        inviteLink: result.inviteLink,
      },
    });
  } catch (error) {
    console.error("Failed to invite participants:", error);
    return NextResponse.json(
      { success: false, error: "Failed to invite participants" },
      { status: 500 },
    );
  }
}
