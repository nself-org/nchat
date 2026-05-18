/**
 * Meeting Scheduler - Utilities for scheduling and managing meetings
 *
 * Handles time calculations, recurrence, and scheduling logic
 */

import {
  Meeting,
  MeetingType,
  RecurrenceRule,
  RecurrencePattern,
  CreateMeetingInput,
  MeetingSettings,
  CalendarMonth,
  CalendarWeek,
  CalendarDay,
} from "./meeting-types";

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_MEETING_SETTINGS: MeetingSettings = {
  muteOnJoin: true,
  videoOffOnJoin: false,
  allowScreenShare: true,
  allowRecording: true,
  waitingRoom: false,
  allowGuests: false,
  requiresSignIn: true,
  enableChat: true,
  enableReactions: true,
  enableHandRaise: true,
  enableBreakoutRooms: false,
  autoRecord: false,
  recordingConsent: true,
};

export const DEFAULT_MEETING_DURATION = 60; // minutes
export const MIN_MEETING_DURATION = 15; // minutes
export const MAX_MEETING_DURATION = 480; // 8 hours
export const MAX_PARTICIPANTS = 100;

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Round time to nearest interval (default 15 minutes)
 */
export function roundToInterval(
  date: Date,
  intervalMinutes: number = 15,
): Date {
  const ms = intervalMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/**
 * Get the next available meeting slot from now
 */
export function getNextAvailableSlot(intervalMinutes: number = 15): Date {
  const now = new Date();
  return roundToInterval(
    new Date(now.getTime() + intervalMinutes * 60 * 1000),
    intervalMinutes,
  );
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Calculate duration between two dates in minutes
 */
export function calculateDuration(
  start: Date | string,
  end: Date | string,
): number {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
export function formatTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Format date for display (e.g., "Monday, Jan 15")
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...options,
  });
}

/**
 * Format datetime for display (e.g., "Monday, Jan 15 at 2:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Get relative time string (e.g., "in 5 minutes", "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = d.getTime() - now;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  }
  if (hours < 24) {
    return isFuture ? `in ${hours}h` : `${hours}h ago`;
  }
  return isFuture ? `in ${days}d` : `${days}d ago`;
}

// ============================================================================
// Recurrence Utilities
// ============================================================================

/**
 * Get human readable recurrence description
 */
export function formatRecurrence(rule: RecurrenceRule): string {
  const { pattern, interval, daysOfWeek, dayOfMonth, endDate, occurrences } =
    rule;

  let base = "";
  switch (pattern) {
    case "daily":
      base = interval === 1 ? "Daily" : `Every ${interval} days`;
      break;
    case "weekly":
      base = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
      if (daysOfWeek?.length) {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const days = daysOfWeek.map((d) => dayNames[d]).join(", ");
        base += ` on ${days}`;
      }
      break;
    case "biweekly":
      base = "Every 2 weeks";
      break;
    case "monthly":
      base = interval === 1 ? "Monthly" : `Every ${interval} months`;
      if (dayOfMonth) {
        base += ` on day ${dayOfMonth}`;
      }
      break;
    case "custom":
      base = "Custom schedule";
      break;
  }

  if (endDate) {
    base += ` until ${formatDate(endDate, { month: "short", day: "numeric", year: "numeric" })}`;
  } else if (occurrences) {
    base += `, ${occurrences} times`;
  }

  return base;
}

/**
 * Generate occurrence dates for a recurring meeting
 */
export function generateOccurrences(
  startDate: Date,
  rule: RecurrenceRule,
  count: number = 10,
): Date[] {
  const occurrences: Date[] = [new Date(startDate)];
  const {
    pattern,
    interval,
    daysOfWeek,
    dayOfMonth,
    endDate,
    occurrences: maxOccurrences,
  } = rule;

  const maxCount = maxOccurrences ? Math.min(count, maxOccurrences - 1) : count;
  const endDateObj = endDate ? new Date(endDate) : null;

  let current = new Date(startDate);

  while (occurrences.length <= maxCount) {
    let next: Date;

    switch (pattern) {
      case "daily":
        next = new Date(current);
        next.setDate(next.getDate() + interval);
        break;
      case "weekly":
        next = new Date(current);
        next.setDate(next.getDate() + 7 * interval);
        break;
      case "biweekly":
        next = new Date(current);
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next = new Date(current);
        next.setMonth(next.getMonth() + interval);
        if (dayOfMonth) {
          next.setDate(dayOfMonth);
        }
        break;
      default:
        next = new Date(current);
        next.setDate(next.getDate() + 7);
    }

    if (endDateObj && next > endDateObj) {
      break;
    }

    occurrences.push(next);
    current = next;
  }

  return occurrences;
}

// ============================================================================
// Calendar Utilities
// ============================================================================

/**
 * Generate calendar month data
 */
export function generateCalendarMonth(
  year: number,
  month: number,
  meetings: Meeting[] = [],
): CalendarMonth {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];
  let weekNumber = getWeekNumber(firstDay);

  // Add days from previous month to fill the first week
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    currentWeek.push(createCalendarDay(date, meetings, today, false));
  }

  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    currentWeek.push(createCalendarDay(date, meetings, today, true));

    if (currentWeek.length === 7) {
      weeks.push({ weekNumber, days: currentWeek });
      currentWeek = [];
      weekNumber++;
    }
  }

  // Add days from next month to fill the last week
  if (currentWeek.length > 0) {
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      const date = new Date(year, month + 1, nextMonthDay);
      currentWeek.push(createCalendarDay(date, meetings, today, false));
      nextMonthDay++;
    }
    weeks.push({ weekNumber, days: currentWeek });
  }

  return { year, month, weeks };
}

function createCalendarDay(
  date: Date,
  meetings: Meeting[],
  today: Date,
  isCurrentMonth: boolean,
): CalendarDay {
  const dateStr = formatDateString(date);
  const dayMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.scheduledStartAt);
    return formatDateString(meetingDate) === dateStr;
  });

  return {
    date: dateStr,
    meetings: dayMeetings,
    isToday: date.getTime() === today.getTime(),
    isCurrentMonth,
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
  };
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ============================================================================
// Validation Utilities
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate meeting input
 */
export function validateMeetingInput(
  input: CreateMeetingInput,
): ValidationResult {
  const errors: Record<string, string> = {};

  // Title validation
  if (!input.title?.trim()) {
    errors.title = "Title is required";
  } else if (input.title.length > 200) {
    errors.title = "Title must be 200 characters or less";
  }

  // Time validation
  const startDate = new Date(input.scheduledStartAt);
  const endDate = new Date(input.scheduledEndAt);

  if (isNaN(startDate.getTime())) {
    errors.scheduledStartAt = "Invalid start time";
  } else if (startDate.getTime() < Date.now() - 5 * 60 * 1000) {
    // Allow 5 minutes in the past for clock drift
    errors.scheduledStartAt = "Start time must be in the future";
  }

  if (isNaN(endDate.getTime())) {
    errors.scheduledEndAt = "Invalid end time";
  } else if (endDate <= startDate) {
    errors.scheduledEndAt = "End time must be after start time";
  }

  const duration = calculateDuration(startDate, endDate);
  if (duration < MIN_MEETING_DURATION) {
    errors.duration = `Meeting must be at least ${MIN_MEETING_DURATION} minutes`;
  } else if (duration > MAX_MEETING_DURATION) {
    errors.duration = `Meeting cannot exceed ${MAX_MEETING_DURATION / 60} hours`;
  }

  // Recurrence validation
  if (input.isRecurring && input.recurrenceRule) {
    if (input.recurrenceRule.interval < 1) {
      errors.recurrence = "Invalid recurrence interval";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Time Slot Utilities
// ============================================================================

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  label: string;
}

/**
 * Generate time slots for a time picker
 */
export function generateTimeSlots(
  intervalMinutes: number = 30,
  startHour: number = 0,
  endHour: number = 24,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotsPerHour = 60 / intervalMinutes;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let slot = 0; slot < slotsPerHour; slot++) {
      const minutes = slot * intervalMinutes;
      const startTime = `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      let endMinutes = minutes + intervalMinutes;
      let endHourVal = hour;
      if (endMinutes >= 60) {
        endMinutes = endMinutes - 60;
        endHourVal++;
      }
      const endTime = `${String(endHourVal).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;

      slots.push({ startTime, endTime, label });
    }
  }

  return slots;
}

/**
 * Generate duration options for meeting scheduling
 */
export function getDurationOptions(): Array<{ value: number; label: string }> {
  return [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
    { value: 180, label: "3 hours" },
    { value: 240, label: "4 hours" },
  ];
}
