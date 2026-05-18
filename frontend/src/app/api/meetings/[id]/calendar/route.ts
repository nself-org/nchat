/**
 * Meetings API - Calendar Export Routes
 *
 * Handles calendar exports (ICS, Google Calendar, Outlook).
 *
 * @route GET /api/meetings/:id/calendar - Get calendar export
 */

import { NextRequest, NextResponse } from "next/server";
import { getMeetingService, getCalendarService } from "@/services/meetings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/meetings/:id/calendar - Get calendar export
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "all";
    const download = searchParams.get("download") === "true";

    const meetingService = getMeetingService();
    const calendarService = getCalendarService();

    const meeting = await meetingService.getMeeting(id);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    // Handle specific format with download
    if (format === "ics" && download) {
      const exportData = calendarService.generateCalendarExport(meeting, "ics");

      return new NextResponse(exportData.content, {
        headers: {
          "Content-Type": "text/calendar;charset=utf-8",
          "Content-Disposition": `attachment; filename="${exportData.filename}"`,
        },
      });
    }

    // Generate export based on format
    if (format === "all") {
      const links = calendarService.getAllCalendarLinks(meeting);

      return NextResponse.json({
        success: true,
        data: {
          googleCalendarUrl: links.google,
          outlookUrl: links.outlook,
          icsContent: links.ics,
          icsFilename: `${meeting.title.replace(/[^a-z0-9]/gi, "-")}.ics`,
        },
      });
    }

    // Single format export
    const validFormats = ["ics", "google", "outlook", "apple"];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const exportData = calendarService.generateCalendarExport(
      meeting,
      format as "ics" | "google" | "outlook" | "apple",
    );

    return NextResponse.json({
      success: true,
      data: {
        type: exportData.type,
        content: exportData.content,
        filename: exportData.filename,
      },
    });
  } catch (error) {
    console.error("Failed to generate calendar export:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate calendar export" },
      { status: 500 },
    );
  }
}
