/**
 * Meetings API - Reminders Routes
 *
 * Handles meeting reminder configuration.
 *
 * @route GET /api/meetings/:id/reminders - Get scheduled reminders
 * @route POST /api/meetings/:id/reminders - Schedule reminders
 * @route DELETE /api/meetings/:id/reminders - Cancel reminders
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService, getCalendarService } from "@/services/meetings";
import type { ReminderTiming } from "@/lib/meetings/meeting-types";
import {
  REMINDER_TIMINGS,
  REMINDER_LABELS,
} from "@/lib/meetings/meeting-reminders";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/meetings/:id/reminders - Get scheduled reminders
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    const meetingService = getMeetingService();
    const calendarService = getCalendarService();

    const meeting = await meetingService.getMeeting(id);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    let reminders = calendarService.getMeetingReminders(id);

    // Filter by user if provided
    if (userId) {
      reminders = reminders.filter((r) => r.userId === userId);
    }

    // Get user preferences
    const preferences = userId
      ? calendarService.getUserPreferences(userId)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        preferences,
        availableTimings: REMINDER_TIMINGS.map((timing) => ({
          value: timing,
          label: REMINDER_LABELS[timing],
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch reminders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reminders" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/meetings/:id/reminders - Schedule reminders
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

    const meetingService = getMeetingService();
    const calendarService = getCalendarService();

    const meeting = await meetingService.getMeeting(id);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    // Validate timings if provided
    const timings: ReminderTiming[] = body.timings || ["15min"];
    const invalidTimings = timings.filter(
      (t: string) => !REMINDER_TIMINGS.includes(t as ReminderTiming),
    );

    if (invalidTimings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid reminder timings: ${invalidTimings.join(", ")}. Valid options: ${REMINDER_TIMINGS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Cancel existing reminders for this user
    calendarService.cancelMeetingReminders(id);

    // Schedule new reminders
    const scheduled = calendarService.scheduleReminders(
      meeting,
      body.userId,
      timings,
    );

    // Update preferences if requested
    if (body.saveAsDefault) {
      calendarService.updateUserPreferences(body.userId, {
        defaultTimings: timings,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        reminders: scheduled,
        count: scheduled.length,
      },
    });
  } catch (error) {
    console.error("Failed to schedule reminders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to schedule reminders" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/meetings/:id/reminders - Cancel reminders
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const reminderId = searchParams.get("reminderId");

    const calendarService = getCalendarService();

    let cancelledCount = 0;

    if (reminderId) {
      // Cancel specific reminder
      const cancelled = calendarService.cancelReminder(reminderId);
      cancelledCount = cancelled ? 1 : 0;
    } else if (userId) {
      // Cancel all reminders for this user on this meeting
      const reminders = calendarService.getMeetingReminders(id);
      for (const reminder of reminders) {
        if (reminder.userId === userId) {
          calendarService.cancelReminder(reminder.id);
          cancelledCount++;
        }
      }
    } else {
      // Cancel all reminders for the meeting
      cancelledCount = calendarService.cancelMeetingReminders(id);
    }

    return NextResponse.json({
      success: true,
      data: { cancelledCount },
      message: `${cancelledCount} reminder(s) cancelled`,
    });
  } catch (error) {
    console.error("Failed to cancel reminders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel reminders" },
      { status: 500 },
    );
  }
}
