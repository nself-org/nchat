/**
 * Meetings API - Single Participant Routes
 *
 * Handles individual participant operations.
 *
 * @route PUT /api/meetings/:id/participants/:participantId - Update participant role
 * @route DELETE /api/meetings/:id/participants/:participantId - Remove participant
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService } from "@/services/meetings";
import type { ParticipantRole } from "@/lib/meetings/meeting-types";

interface RouteParams {
  params: Promise<{ id: string; participantId: string }>;
}

// ============================================================================
// PUT /api/meetings/:id/participants/:participantId - Update participant role
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, participantId } = await params;
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    if (!body.role) {
      return NextResponse.json(
        { success: false, error: "Role is required" },
        { status: 400 },
      );
    }

    const meetingService = getMeetingService();

    const result = await meetingService.updateParticipantRole(
      id,
      participantId,
      body.role as ParticipantRole,
      body.userId,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { participant: result.participant },
    });
  } catch (error) {
    console.error("Failed to update participant:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update participant" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/meetings/:id/participants/:participantId - Remove participant
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, participantId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    const meetingService = getMeetingService();

    const result = await meetingService.removeParticipant(
      id,
      participantId,
      userId,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Participant removed successfully",
    });
  } catch (error) {
    console.error("Failed to remove participant:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove participant" },
      { status: 500 },
    );
  }
}
