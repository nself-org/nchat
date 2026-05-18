/**
 * Meeting Links - Utilities for generating and managing meeting links
 *
 * Handles meeting URLs, codes, and deep links
 */

import { Meeting, RoomType } from "./meeting-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const MEETING_CODE_LENGTH = 9; // e.g., "abc-defg-hij"
const MEETING_CODE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const MEETING_CODE_SEGMENT_LENGTH = 3;

// ============================================================================
// Code Generation
// ============================================================================

/**
 * Generate a random meeting code (e.g., "abc-defg-hij")
 */
export function generateMeetingCode(): string {
  const segments: string[] = [];
  const segmentLengths = [3, 4, 3]; // Pattern: xxx-xxxx-xxx

  for (const length of segmentLengths) {
    let segment = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * MEETING_CODE_CHARS.length);
      segment += MEETING_CODE_CHARS[randomIndex];
    }
    segments.push(segment);
  }

  return segments.join("-");
}

/**
 * Validate a meeting code format
 */
export function isValidMeetingCode(code: string): boolean {
  if (!code) return false;

  // Remove hyphens and check
  const cleanCode = code.replace(/-/g, "").toLowerCase();

  // Check length (should be 10 characters without hyphens)
  if (cleanCode.length !== 10) return false;

  // Check that all characters are valid
  return /^[a-z]+$/.test(cleanCode);
}

/**
 * Format a meeting code with hyphens
 */
export function formatMeetingCode(code: string): string {
  const clean = code.replace(/-/g, "").toLowerCase();
  if (clean.length !== 10) return code;

  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
}

/**
 * Parse a meeting code from user input
 */
export function parseMeetingCode(input: string): string | null {
  // Remove whitespace and common URL prefixes
  let code = input.trim().toLowerCase();

  // Try to extract code from URL
  const urlPatterns = [
    /\/meeting\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
    /\/meet\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
    /\/join\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
    /[?&]code=([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
    /^([a-z]{3}-?[a-z]{4}-?[a-z]{3})$/i,
  ];

  for (const pattern of urlPatterns) {
    const match = code.match(pattern);
    if (match) {
      code = match[1];
      break;
    }
  }

  // Format and validate
  const formatted = formatMeetingCode(code);
  return isValidMeetingCode(formatted) ? formatted : null;
}

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Get the base URL for meetings
 */
export function getMeetingBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Generate a meeting link from a meeting code
 */
export function generateMeetingLink(code: string): string {
  const baseUrl = getMeetingBaseUrl();
  return `${baseUrl}/meetings/${code}`;
}

/**
 * Generate a meeting invitation link with optional password
 */
export function generateInviteLink(meeting: Meeting): string {
  const baseUrl = getMeetingBaseUrl();
  let url = `${baseUrl}/meetings/${meeting.meetingCode}`;

  // Add query params for additional info
  const params = new URLSearchParams();

  if (meeting.password) {
    params.set("pwd", encodePassword(meeting.password));
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Generate a direct join link (bypasses lobby)
 */
export function generateDirectJoinLink(
  meeting: Meeting,
  userId: string,
): string {
  const baseUrl = getMeetingBaseUrl();
  const params = new URLSearchParams({
    directJoin: "1",
    uid: userId,
  });

  if (meeting.password) {
    params.set("pwd", encodePassword(meeting.password));
  }

  return `${baseUrl}/meetings/${meeting.meetingCode}/join?${params.toString()}`;
}

/**
 * Encode password for URL (basic obfuscation, not security)
 */
function encodePassword(password: string): string {
  return btoa(password).replace(/=/g, "");
}

/**
 * Decode password from URL
 */
export function decodePassword(encoded: string): string {
  try {
    // Add padding if needed
    const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
    return atob(padded);
  } catch {
    return "";
  }
}

// ============================================================================
// Calendar Integration Links
// ============================================================================

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Generate Google Calendar link
 */
export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    location: event.location,
    dates: formatCalendarDates(event.startTime, event.endTime),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar link
 */
export function generateOutlookCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    body: event.description,
    location: event.location,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
    path: "/calendar/action/compose",
    rru: "addevent",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate ICS file content
 */
export function generateICSContent(
  event: CalendarEvent,
  meeting: Meeting,
): string {
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const uid = `${meeting.id}@${getMeetingBaseUrl().replace(/^https?:\/\//, "")}`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//nchat//Meeting//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(event.startTime)}
DTEND:${formatICSDate(event.endTime)}
SUMMARY:${escapeICS(event.title)}
DESCRIPTION:${escapeICS(event.description)}
LOCATION:${escapeICS(event.location)}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download ICS file
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Create calendar event from meeting
 */
export function meetingToCalendarEvent(meeting: Meeting): CalendarEvent {
  return {
    title: meeting.title,
    description: `${meeting.description || ""}\n\nJoin: ${meeting.meetingLink}`,
    location: meeting.meetingLink,
    startTime: new Date(meeting.scheduledStartAt),
    endTime: new Date(meeting.scheduledEndAt),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCalendarDates(start: Date, end: Date): string {
  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return `${format(start)}/${format(end)}`;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

// ============================================================================
// Share Utilities
// ============================================================================

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

/**
 * Generate share content for a meeting
 */
export function generateShareContent(meeting: Meeting): ShareContent {
  const startDate = new Date(meeting.scheduledStartAt);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    title: meeting.title,
    text: `Join "${meeting.title}" on ${dateStr} at ${timeStr}`,
    url: meeting.meetingLink,
  };
}

/**
 * Share meeting using Web Share API or fallback to clipboard
 */
export async function shareMeeting(meeting: Meeting): Promise<boolean> {
  const content = generateShareContent(meeting);

  // Try Web Share API first
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(content);
      return true;
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== "AbortError") {
        logger.error("Share failed:", error);
      }
    }
  }

  // Fallback to clipboard
  return copyMeetingLink(meeting);
}

/**
 * Copy meeting link to clipboard
 */
export async function copyMeetingLink(meeting: Meeting): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(meeting.meetingLink);
      return true;
    } catch (error) {
      logger.error("Copy failed:", error);
    }
  }

  // Fallback for older browsers
  try {
    const textArea = document.createElement("textarea");
    textArea.value = meeting.meetingLink;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get icon for room type
 */
export function getRoomTypeIcon(roomType: RoomType): string {
  switch (roomType) {
    case "video":
      return "video";
    case "audio":
      return "phone";
    case "screenshare":
      return "monitor";
    default:
      return "video";
  }
}

/**
 * Get label for room type
 */
export function getRoomTypeLabel(roomType: RoomType): string {
  switch (roomType) {
    case "video":
      return "Video Call";
    case "audio":
      return "Audio Call";
    case "screenshare":
      return "Screen Share";
    default:
      return "Meeting";
  }
}
