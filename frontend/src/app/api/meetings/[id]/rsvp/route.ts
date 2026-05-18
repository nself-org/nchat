/**
 * Meetings API - RSVP Routes
 *
 * Handles meeting RSVP (accept, decline, tentative).
 *
 * @route POST /api/meetings/:id/rsvp - Respond to meeting invitation
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService, getCalendarService } from "@/services/meetings";
import type { ParticipantStatus } from "@/lib/meetings/meeting-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST /api/meetings/:id/rsvp - RSVP to meeting
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    if (!body.response) {
      return NextResponse.json(
        {
          success: false,
          error: "Response is required (accepted, declined, tentative)",
        },
        { status: 400 },
      );
    }

    const validResponses = ["accepted", "declined", "tentative"];
    if (!validResponses.includes(body.response)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid response. Must be one of: ${validResponses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const meetingService = getMeetingService();
    const calendarService = getCalendarService();

    const result = await meetingService.rsvp(
      id,
      body.userId,
      body.response as "accepted" | "declined" | "tentative",
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    // Schedule reminders if accepted
    if (body.response === "accepted") {
      const meeting = await meetingService.getMeeting(id);
      if (meeting) {
        calendarService.scheduleReminders(
          meeting,
          body.userId,
          body.reminderTimings,
        );
      }
    } else {
      // Cancel reminders if declined
      calendarService.cancelUserReminders(body.userId);
    }

    return NextResponse.json({
      success: true,
      data: { participant: result.participant },
      message: `RSVP recorded: ${body.response}`,
    });
  } catch (error) {
    console.error("Failed to record RSVP:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record RSVP" },
      { status: 500 },
    );
  }
}
