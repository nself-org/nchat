/**
 * Quiet Hours / Do Not Disturb Utilities
 *
 * Handles checking and managing quiet hours schedules for notifications.
 */

import type {
  QuietHoursSchedule,
  WeekendQuietHours,
  DayOfWeek,
} from "./notification-types";

// ============================================================================
// Time Parsing Utilities
// ============================================================================

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string (HH:mm)
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Get current time as minutes since midnight in a specific timezone
 */
export function getCurrentTimeMinutes(timezone?: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  return hour * 60 + minute;
}

/**
 * Get current day of week in a specific timezone
 */
export function getCurrentDayOfWeek(timezone?: string): DayOfWeek {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  });

  const dayName = formatter.format(now);
  const days: Record<string, DayOfWeek> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return days[dayName] ?? 0;
}

/**
 * Check if a given day is a weekend (Saturday or Sunday)
 */
export function isWeekend(day: DayOfWeek): boolean {
  return day === 0 || day === 6;
}

// ============================================================================
// Quiet Hours Checking
// ============================================================================

/**
 * Check if current time falls within quiet hours
 */
export function isInQuietHours(
  schedule: QuietHoursSchedule,
  options?: {
    checkDate?: Date;
    ignoreWeekendSettings?: boolean;
  },
): boolean {
  if (!schedule.enabled) {
    return false;
  }

  const currentDay = options?.checkDate
    ? (options.checkDate.getDay() as DayOfWeek)
    : getCurrentDayOfWeek(schedule.timezone);

  // Check if today is in the active days
  if (!schedule.days.includes(currentDay)) {
    return false;
  }

  // Check weekend settings
  if (
    !options?.ignoreWeekendSettings &&
    isWeekend(currentDay) &&
    !schedule.enableOnWeekends
  ) {
    return false;
  }

  const currentMinutes = options?.checkDate
    ? options.checkDate.getHours() * 60 + options.checkDate.getMinutes()
    : getCurrentTimeMinutes(schedule.timezone);

  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const endMinutes = parseTimeToMinutes(schedule.endTime);

  // Handle overnight schedules (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    // Check if we're after start time OR before end time
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Regular schedule (e.g., 09:00 to 17:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if quiet hours will be active at a specific time
 */
export function willBeInQuietHours(
  schedule: QuietHoursSchedule,
  targetDate: Date,
): boolean {
  return isInQuietHours(schedule, { checkDate: targetDate });
}

/**
 * Get time remaining until quiet hours end
 */
export function getTimeUntilQuietHoursEnd(
  schedule: QuietHoursSchedule,
): number | null {
  if (!isInQuietHours(schedule)) {
    return null;
  }

  const currentMinutes = getCurrentTimeMinutes(schedule.timezone);
  const endMinutes = parseTimeToMinutes(schedule.endTime);
  const startMinutes = parseTimeToMinutes(schedule.startTime);

  // Overnight schedule
  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes) {
      // After start, need to wait until tomorrow's end time
      return 24 * 60 - currentMinutes + endMinutes;
    } else {
      // Before end, just wait until end
      return endMinutes - currentMinutes;
    }
  }

  // Regular schedule
  return endMinutes - currentMinutes;
}

/**
 * Get time remaining until quiet hours start
 */
export function getTimeUntilQuietHoursStart(
  schedule: QuietHoursSchedule,
): number | null {
  if (isInQuietHours(schedule) || !schedule.enabled) {
    return null;
  }

  const currentMinutes = getCurrentTimeMinutes(schedule.timezone);
  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const currentDay = getCurrentDayOfWeek(schedule.timezone);

  // Find the next day that quiet hours are active
  let daysToAdd = 0;
  for (let i = 0; i < 7; i++) {
    const checkDay = ((currentDay + i) % 7) as DayOfWeek;
    if (schedule.days.includes(checkDay)) {
      if (i === 0 && currentMinutes < startMinutes) {
        // Today, before start time
        return startMinutes - currentMinutes;
      } else if (i > 0) {
        daysToAdd = i;
        break;
      }
    }
  }

  if (daysToAdd === 0) {
    return null;
  }

  // Calculate minutes until start on the next active day
  const minutesUntilMidnight = 24 * 60 - currentMinutes;
  const fullDays = (daysToAdd - 1) * 24 * 60;
  return minutesUntilMidnight + fullDays + startMinutes;
}

/**
 * Format remaining time as human-readable string
 */
export function formatRemainingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hours < 24) {
    if (remainingMins === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMins} minute${remainingMins !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
}

// ============================================================================
// Schedule Validation
// ============================================================================

/**
 * Validate quiet hours schedule
 */
export function validateQuietHoursSchedule(schedule: QuietHoursSchedule): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(schedule.startTime)) {
    errors.push("Invalid start time format. Use HH:mm");
  }
  if (!timeRegex.test(schedule.endTime)) {
    errors.push("Invalid end time format. Use HH:mm");
  }

  // Validate days
  if (schedule.days.length === 0) {
    errors.push("At least one day must be selected");
  }

  for (const day of schedule.days) {
    if (day < 0 || day > 6) {
      errors.push(`Invalid day of week: ${day}`);
    }
  }

  // Validate timezone
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone });
  } catch {
    errors.push(`Invalid timezone: ${schedule.timezone}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get next quiet hours period
 */
export function getNextQuietHoursPeriod(schedule: QuietHoursSchedule): {
  start: Date;
  end: Date;
} | null {
  if (!schedule.enabled || schedule.days.length === 0) {
    return null;
  }

  const now = new Date();
  const currentMinutes = getCurrentTimeMinutes(schedule.timezone);
  const currentDay = getCurrentDayOfWeek(schedule.timezone);
  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const endMinutes = parseTimeToMinutes(schedule.endTime);

  // Check if we're currently in quiet hours
  if (isInQuietHours(schedule)) {
    const start = new Date(now);
    const end = new Date(now);

    if (startMinutes > endMinutes && currentMinutes >= startMinutes) {
      // Overnight, currently after start
      start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    } else {
      // Either regular schedule or overnight before end
      start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    }

    return { start, end };
  }

  // Find next quiet hours period
  for (let i = 0; i < 7; i++) {
    const checkDay = ((currentDay + i) % 7) as DayOfWeek;
    if (schedule.days.includes(checkDay)) {
      const start = new Date(now);
      start.setDate(start.getDate() + i);
      start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      // If today but past start time, skip to next occurrence
      if (
        i === 0 &&
        currentMinutes >= startMinutes &&
        startMinutes <= endMinutes
      ) {
        continue;
      }

      const end = new Date(start);
      if (startMinutes > endMinutes) {
        end.setDate(end.getDate() + 1);
      }
      end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      return { start, end };
    }
  }

  return null;
}

// ============================================================================
// Weekend Quiet Hours
// ============================================================================

/**
 * Check if in weekend quiet hours
 */
export function isInWeekendQuietHours(
  weekendSettings: WeekendQuietHours | undefined,
  mainSchedule: QuietHoursSchedule,
): boolean {
  if (!weekendSettings?.enabled) {
    return false;
  }

  const currentDay = getCurrentDayOfWeek(mainSchedule.timezone);
  if (!isWeekend(currentDay)) {
    return false;
  }

  const currentMinutes = getCurrentTimeMinutes(mainSchedule.timezone);
  const startMinutes = parseTimeToMinutes(weekendSettings.startTime);
  const endMinutes = parseTimeToMinutes(weekendSettings.endTime);

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ============================================================================
// Schedule Helpers
// ============================================================================

/**
 * Create a default quiet hours schedule
 */
export function createDefaultSchedule(timezone?: string): QuietHoursSchedule {
  return {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    days: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
    allowMentionsBreakthrough: true,
    enableOnWeekends: true,
    autoSetStatus: false,
    timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Get display name for day of week
 */
export function getDayDisplayName(
  day: DayOfWeek,
  format: "short" | "long" = "short",
): string {
  const shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const longNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return format === "short" ? shortNames[day] : longNames[day];
}

/**
 * Get all days of week
 */
export function getAllDaysOfWeek(): Array<{
  value: DayOfWeek;
  label: string;
  shortLabel: string;
}> {
  return [
    { value: 0, label: "Sunday", shortLabel: "Sun" },
    { value: 1, label: "Monday", shortLabel: "Mon" },
    { value: 2, label: "Tuesday", shortLabel: "Tue" },
    { value: 3, label: "Wednesday", shortLabel: "Wed" },
    { value: 4, label: "Thursday", shortLabel: "Thu" },
    { value: 5, label: "Friday", shortLabel: "Fri" },
    { value: 6, label: "Saturday", shortLabel: "Sat" },
  ];
}

/**
 * Get weekdays only
 */
export function getWeekdays(): DayOfWeek[] {
  return [1, 2, 3, 4, 5];
}

/**
 * Get weekend days only
 */
export function getWeekendDays(): DayOfWeek[] {
  return [0, 6];
}
