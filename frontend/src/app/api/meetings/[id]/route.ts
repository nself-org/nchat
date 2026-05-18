/**
 * Meetings API - Single Meeting Routes
 *
 * Handles individual meeting operations.
 *
 * @route GET /api/meetings/:id - Get meeting details
 * @route PUT /api/meetings/:id - Update meeting
 * @route DELETE /api/meetings/:id - Delete meeting
 * @route PATCH /api/meetings/:id - Partial update / actions
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService, getCalendarService } from "@/services/meetings";
import type { UpdateMeetingInput } from "@/lib/meetings/meeting-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/meetings/:id - Get meeting details
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const meetingService = getMeetingService();

    // Check if id looks like a meeting code (xxx-xxxx-xxx format)
    const isCode = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(id);

    const meeting = isCode
      ? await meetingService.getMeetingByCode(id)
      : await meetingService.getMeeting(id);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    // Get meeting stats
    const stats = await meetingService.getMeetingStats(meeting.id);

    return NextResponse.json({
      success: true,
      data: {
        meeting,
        stats,
      },
    });
  } catch (error) {
    console.error("Failed to fetch meeting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch meeting" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/meetings/:id - Update meeting
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    const updates: UpdateMeetingInput = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.scheduledStartAt !== undefined)
      updates.scheduledStartAt = body.scheduledStartAt;
    if (body.scheduledEndAt !== undefined)
      updates.scheduledEndAt = body.scheduledEndAt;
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.isPrivate !== undefined) updates.isPrivate = body.isPrivate;
    if (body.password !== undefined) updates.password = body.password;
    if (body.settings !== undefined) updates.settings = body.settings;

    const meetingService = getMeetingService();
    const result = await meetingService.updateMeeting(id, updates, body.userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    // Reschedule reminders if time changed
    if (result.changedFields?.includes("scheduledStartAt") && result.meeting) {
      const calendarService = getCalendarService();
      calendarService.rescheduleReminders(result.meeting);
    }

    return NextResponse.json({
      success: true,
      data: {
        meeting: result.meeting,
        changedFields: result.changedFields,
      },
    });
  } catch (error) {
    console.error("Failed to update meeting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update meeting" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/meetings/:id - Delete meeting
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    const meetingService = getMeetingService();
    const calendarService = getCalendarService();

    // Cancel reminders first
    calendarService.cancelMeetingReminders(id);

    const result = await meetingService.deleteMeeting(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete meeting" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/meetings/:id - Actions (start, end, cancel, reschedule, clone)
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 },
      );
    }

    const meetingService = getMeetingService();
    const calendarService = getCalendarService();

    switch (action) {
      case "start": {
        const result = await meetingService.startMeeting(id, userId);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }
        return NextResponse.json({
          success: true,
          data: { meeting: result.meeting },
        });
      }

      case "end": {
        const result = await meetingService.endMeeting(id, userId);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }

        // Cancel any remaining reminders
        calendarService.cancelMeetingReminders(id);

        return NextResponse.json({
          success: true,
          data: { meeting: result.meeting },
        });
      }

      case "cancel": {
        const result = await meetingService.cancelMeeting(id, userId, {
          reason: body.reason,
          notifyParticipants: body.notifyParticipants ?? true,
        });
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }

        // Cancel reminders
        calendarService.cancelMeetingReminders(id);

        return NextResponse.json({
          success: true,
          message: "Meeting cancelled successfully",
        });
      }

      case "reschedule": {
        if (!body.newStartTime || !body.newEndTime) {
          return NextResponse.json(
            { success: false, error: "New start and end times are required" },
            { status: 400 },
          );
        }

        const result = await meetingService.rescheduleMeeting(
          id,
          {
            newStartTime: body.newStartTime,
            newEndTime: body.newEndTime,
            reason: body.reason,
            notifyParticipants: body.notifyParticipants ?? true,
          },
          userId,
        );

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }

        // Reschedule reminders
        if (result.meeting) {
          calendarService.rescheduleReminders(result.meeting);
        }

        return NextResponse.json({
          success: true,
          data: { meeting: result.meeting },
        });
      }

      case "clone": {
        const result = await meetingService.cloneMeeting(
          id,
          userId,
          body.overrides,
        );
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }
        return NextResponse.json({
          success: true,
          data: { meeting: result.meeting },
        });
      }

      case "join": {
        const result = await meetingService.joinMeeting(
          id,
          userId,
          body.password,
        );
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }
        return NextResponse.json({
          success: true,
          data: { meeting: result.meeting },
        });
      }

      case "leave": {
        const result = await meetingService.leaveMeeting(id, userId);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }
        return NextResponse.json({
          success: true,
          message: "Left meeting successfully",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Failed to perform meeting action:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform action" },
      { status: 500 },
    );
  }
}
