/**
 * Meetings API - Main Routes
 *
 * Handles meeting creation and listing.
 *
 * @route GET /api/meetings - List meetings
 * @route POST /api/meetings - Create a meeting
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService } from "@/services/meetings";
import { getCalendarService } from "@/services/meetings";
import type {
  CreateMeetingInput,
  MeetingStatus,
  MeetingType,
} from "@/lib/meetings/meeting-types";

// ============================================================================
// GET /api/meetings - List meetings
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const channelId = searchParams.get("channelId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const hostId = searchParams.get("hostId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const meetingService = getMeetingService();

    const result = await meetingService.queryMeetings({
      userId: userId || undefined,
      channelId: channelId || undefined,
      status: status ? (status.split(",") as MeetingStatus[]) : undefined,
      type: type ? (type.split(",") as MeetingType[]) : undefined,
      hostId: hostId || undefined,
      dateRange:
        startDate && endDate ? { start: startDate, end: endDate } : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        meetings: result.meetings,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch meetings" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/meetings - Create a meeting
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }

    if (!body.scheduledStartAt || !body.scheduledEndAt) {
      return NextResponse.json(
        { success: false, error: "Start and end times are required" },
        { status: 400 },
      );
    }

    if (!body.hostId) {
      return NextResponse.json(
        { success: false, error: "Host ID is required" },
        { status: 400 },
      );
    }

    const input: CreateMeetingInput = {
      title: body.title,
      description: body.description,
      roomType: body.roomType || "video",
      scheduledStartAt: body.scheduledStartAt,
      scheduledEndAt: body.scheduledEndAt,
      timezone: body.timezone || "UTC",
      channelId: body.channelId,
      isPrivate: body.isPrivate ?? false,
      password: body.password,
      isRecurring: body.isRecurring ?? false,
      recurrenceRule: body.recurrenceRule,
      participantIds: body.participantIds,
      settings: body.settings,
    };

    const meetingService = getMeetingService();
    const result = await meetingService.createMeeting(
      input,
      body.hostId,
      body.hostInfo,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    // Schedule reminders for the host
    if (result.meeting) {
      const calendarService = getCalendarService();
      calendarService.scheduleReminders(result.meeting, body.hostId);
    }

    return NextResponse.json({
      success: true,
      data: { meeting: result.meeting },
    });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create meeting" },
      { status: 500 },
    );
  }
}
