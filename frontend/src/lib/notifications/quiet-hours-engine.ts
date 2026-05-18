/**
 * Quiet Hours Engine - Enhanced DND and quiet hours management
 *
 * Extends the base quiet hours with:
 * - DND mode with manual override and optional auto-expire
 * - Exception rules (allow from specific users/channels during DND)
 * - Recurring schedules (weekday vs weekend)
 * - Next transition computation
 * - Comprehensive isInQuietHours() integration
 */

import type { DayOfWeek } from "./notification-types";

// ============================================================================
// Types
// ============================================================================

/**
 * DND mode configuration
 */
export interface DNDMode {
  /** Whether DND is currently active */
  isActive: boolean;
  /** When DND was activated */
  activatedAt: string | null;
  /** When DND should automatically expire (null = manual dismiss only) */
  expiresAt: string | null;
  /** Custom status message during DND */
  statusMessage?: string;
  /** Whether to show a visual indicator in the UI */
  showIndicator: boolean;
}

/**
 * Exception rule for allowing notifications through DND/quiet hours
 */
export interface DNDException {
  /** Unique identifier */
  id: string;
  /** Type of exception */
  type: "user" | "channel" | "priority" | "type";
  /** The value to match (user ID, channel ID, priority level, or notification type) */
  value: string;
  /** Human-readable label */
  label: string;
  /** Whether this exception is currently active */
  enabled: boolean;
}

/**
 * Day schedule for recurring quiet hours
 */
export interface DaySchedule {
  /** Whether quiet hours are active on this day */
  enabled: boolean;
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
}

/**
 * Enhanced quiet hours schedule with per-day granularity
 */
export interface EnhancedQuietHoursSchedule {
  /** Whether the schedule system is enabled */
  enabled: boolean;
  /** Timezone for all time calculations */
  timezone: string;
  /** Weekday schedule (Monday-Friday) */
  weekdaySchedule: DaySchedule;
  /** Weekend schedule (Saturday-Sunday) */
  weekendSchedule: DaySchedule;
  /** Per-day overrides (optional, takes precedence over weekday/weekend) */
  dayOverrides: Partial<Record<DayOfWeek, DaySchedule>>;
  /** Whether mentions can break through quiet hours */
  allowMentionsBreakthrough: boolean;
  /** Whether urgent notifications can break through */
  allowUrgentBreakthrough: boolean;
  /** Automatically set user status to DND during quiet hours */
  autoSetDNDStatus: boolean;
}

/**
 * Complete quiet hours state
 */
export interface QuietHoursState {
  /** The recurring schedule */
  schedule: EnhancedQuietHoursSchedule;
  /** Manual DND mode (overrides schedule when active) */
  dnd: DNDMode;
  /** Exception rules that allow notifications through */
  exceptions: DNDException[];
}

/**
 * Result of checking quiet hours status
 */
export interface QuietHoursCheckResult {
  /** Whether the user is currently in quiet hours or DND */
  isQuiet: boolean;
  /** The source of the quiet state */
  source: "schedule" | "dnd" | "none";
  /** Whether this notification can break through */
  canBreakThrough: boolean;
  /** Reason for the decision */
  reason: string;
  /** When quiet hours will end (if applicable) */
  endsAt: string | null;
}

/**
 * Transition information for quiet hours
 */
export interface QuietHoursTransition {
  /** Type of transition */
  type: "start" | "end";
  /** When the transition occurs */
  at: Date;
  /** Source of the transition */
  source: "schedule" | "dnd";
  /** Human-readable description */
  description: string;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_DND_MODE: DNDMode = {
  isActive: false,
  activatedAt: null,
  expiresAt: null,
  showIndicator: true,
};

export const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: true,
  startTime: "22:00",
  endTime: "08:00",
};

export const DEFAULT_WEEKEND_SCHEDULE: DaySchedule = {
  enabled: true,
  startTime: "23:00",
  endTime: "10:00",
};

export function createDefaultQuietHoursSchedule(
  timezone?: string,
): EnhancedQuietHoursSchedule {
  return {
    enabled: false,
    timezone: timezone ?? "UTC",
    weekdaySchedule: { ...DEFAULT_DAY_SCHEDULE },
    weekendSchedule: { ...DEFAULT_WEEKEND_SCHEDULE },
    dayOverrides: {},
    allowMentionsBreakthrough: true,
    allowUrgentBreakthrough: true,
    autoSetDNDStatus: false,
  };
}

export function createDefaultQuietHoursState(
  timezone?: string,
): QuietHoursState {
  return {
    schedule: createDefaultQuietHoursSchedule(timezone),
    dnd: { ...DEFAULT_DND_MODE },
    exceptions: [],
  };
}

// ============================================================================
// DND Operations
// ============================================================================

/**
 * Activate DND mode
 */
export function activateDND(
  state: QuietHoursState,
  options?: {
    duration?: number; // duration in milliseconds
    statusMessage?: string;
    showIndicator?: boolean;
  },
): QuietHoursState {
  const now = new Date();
  const expiresAt = options?.duration
    ? new Date(now.getTime() + options.duration).toISOString()
    : null;

  return {
    ...state,
    dnd: {
      isActive: true,
      activatedAt: now.toISOString(),
      expiresAt,
      statusMessage: options?.statusMessage,
      showIndicator: options?.showIndicator ?? true,
    },
  };
}

/**
 * Deactivate DND mode
 */
export function deactivateDND(state: QuietHoursState): QuietHoursState {
  return {
    ...state,
    dnd: { ...DEFAULT_DND_MODE },
  };
}

/**
 * Check if DND is currently active (respects expiration)
 */
export function isDNDActive(state: QuietHoursState, now?: Date): boolean {
  if (!state.dnd.isActive) return false;

  // Check expiration
  if (state.dnd.expiresAt) {
    const currentTime = now ?? new Date();
    if (new Date(state.dnd.expiresAt) <= currentTime) {
      return false;
    }
  }

  return true;
}

/**
 * Get remaining DND time in milliseconds
 */
export function getDNDTimeRemaining(
  state: QuietHoursState,
  now?: Date,
): number | null {
  if (!isDNDActive(state, now)) return null;

  if (!state.dnd.expiresAt) return null; // Indefinite DND

  const currentTime = now ?? new Date();
  const remaining =
    new Date(state.dnd.expiresAt).getTime() - currentTime.getTime();
  return Math.max(0, remaining);
}

// ============================================================================
// Exception Rules
// ============================================================================

/**
 * Create a DND exception rule
 */
export function createException(
  type: DNDException["type"],
  value: string,
  label: string,
  enabled?: boolean,
): DNDException {
  return {
    id: `exc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    type,
    value,
    label,
    enabled: enabled ?? true,
  };
}

/**
 * Add an exception to the quiet hours state
 */
export function addException(
  state: QuietHoursState,
  exception: DNDException,
): QuietHoursState {
  return {
    ...state,
    exceptions: [...state.exceptions, exception],
  };
}

/**
 * Remove an exception from the quiet hours state
 */
export function removeException(
  state: QuietHoursState,
  exceptionId: string,
): QuietHoursState {
  return {
    ...state,
    exceptions: state.exceptions.filter((e) => e.id !== exceptionId),
  };
}

/**
 * Toggle an exception's enabled state
 */
export function toggleException(
  state: QuietHoursState,
  exceptionId: string,
): QuietHoursState {
  return {
    ...state,
    exceptions: state.exceptions.map((e) =>
      e.id === exceptionId ? { ...e, enabled: !e.enabled } : e,
    ),
  };
}

/**
 * Check if a notification matches any active exception rule
 */
export function matchesException(
  state: QuietHoursState,
  notification: {
    senderId?: string;
    channelId?: string;
    priority?: string;
    type?: string;
  },
): { matches: boolean; matchedException?: DNDException } {
  for (const exception of state.exceptions) {
    if (!exception.enabled) continue;

    switch (exception.type) {
      case "user":
        if (notification.senderId === exception.value) {
          return { matches: true, matchedException: exception };
        }
        break;
      case "channel":
        if (notification.channelId === exception.value) {
          return { matches: true, matchedException: exception };
        }
        break;
      case "priority":
        if (notification.priority === exception.value) {
          return { matches: true, matchedException: exception };
        }
        break;
      case "type":
        if (notification.type === exception.value) {
          return { matches: true, matchedException: exception };
        }
        break;
    }
  }

  return { matches: false };
}

// ============================================================================
// Schedule Checking
// ============================================================================

/**
 * Parse HH:mm time string to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Get the day schedule for a specific day
 */
export function getDaySchedule(
  schedule: EnhancedQuietHoursSchedule,
  day: DayOfWeek,
): DaySchedule {
  // Check for day-specific override first
  if (schedule.dayOverrides[day]) {
    return schedule.dayOverrides[day]!;
  }

  // Check if it's a weekend
  if (day === 0 || day === 6) {
    return schedule.weekendSchedule;
  }

  // Weekday
  return schedule.weekdaySchedule;
}

/**
 * Check if a specific time is within the quiet hours for a given day schedule
 */
export function isTimeInSchedule(
  currentMinutes: number,
  daySchedule: DaySchedule,
): boolean {
  if (!daySchedule.enabled) return false;

  const startMinutes = parseTimeToMinutes(daySchedule.startTime);
  const endMinutes = parseTimeToMinutes(daySchedule.endTime);

  // Handle overnight schedules (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Regular schedule (e.g., 09:00 to 17:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get the current time in minutes since midnight for a given timezone
 */
export function getCurrentTimeInTimezone(
  timezone: string,
  now?: Date,
): {
  minutes: number;
  dayOfWeek: DayOfWeek;
} {
  const currentTime = now ?? new Date();

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: false,
      timeZone: timezone,
    });

    const parts = formatter.formatToParts(currentTime);
    const hour = parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    );
    const dayName = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

    const dayMap: Record<string, DayOfWeek> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return {
      minutes: hour * 60 + minute,
      dayOfWeek: dayMap[dayName] ?? 1,
    };
  } catch {
    // Fallback for invalid timezone
    return {
      minutes: currentTime.getHours() * 60 + currentTime.getMinutes(),
      dayOfWeek: currentTime.getDay() as DayOfWeek,
    };
  }
}

/**
 * Check if quiet hours schedule is currently active
 */
export function isScheduleActive(
  schedule: EnhancedQuietHoursSchedule,
  now?: Date,
): boolean {
  if (!schedule.enabled) return false;

  const { minutes, dayOfWeek } = getCurrentTimeInTimezone(
    schedule.timezone,
    now,
  );
  const daySchedule = getDaySchedule(schedule, dayOfWeek);

  // Also check if we're in an overnight period from the previous day
  const prevDay = ((dayOfWeek + 6) % 7) as DayOfWeek;
  const prevDaySchedule = getDaySchedule(schedule, prevDay);

  // Check current day's schedule
  if (isTimeInSchedule(minutes, daySchedule)) {
    return true;
  }

  // Check if we're in the overnight portion of the previous day's schedule
  if (prevDaySchedule.enabled) {
    const prevStartMinutes = parseTimeToMinutes(prevDaySchedule.startTime);
    const prevEndMinutes = parseTimeToMinutes(prevDaySchedule.endTime);

    if (prevStartMinutes > prevEndMinutes && minutes < prevEndMinutes) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Comprehensive Check
// ============================================================================

/**
 * Comprehensive check: is the user currently in quiet hours or DND?
 *
 * This is the primary function to determine if notifications should be suppressed.
 * It checks DND first (manual override), then the schedule.
 */
export function checkQuietHours(
  state: QuietHoursState,
  notification?: {
    type?: string;
    priority?: string;
    senderId?: string;
    channelId?: string;
  },
  now?: Date,
): QuietHoursCheckResult {
  // 1. Check DND mode first (manual override takes priority)
  if (isDNDActive(state, now)) {
    // Check exceptions
    if (notification) {
      const exceptionResult = matchesException(state, notification);
      if (exceptionResult.matches) {
        return {
          isQuiet: true,
          source: "dnd",
          canBreakThrough: true,
          reason: `Exception: ${exceptionResult.matchedException!.label}`,
          endsAt: state.dnd.expiresAt,
        };
      }
    }

    // Check if urgent can break through
    if (
      notification?.priority === "urgent" &&
      state.schedule.allowUrgentBreakthrough
    ) {
      return {
        isQuiet: true,
        source: "dnd",
        canBreakThrough: true,
        reason: "Urgent notification breaks through DND",
        endsAt: state.dnd.expiresAt,
      };
    }

    return {
      isQuiet: true,
      source: "dnd",
      canBreakThrough: false,
      reason: "Do Not Disturb is active",
      endsAt: state.dnd.expiresAt,
    };
  }

  // 2. Check schedule
  if (isScheduleActive(state.schedule, now)) {
    // Check exceptions
    if (notification) {
      const exceptionResult = matchesException(state, notification);
      if (exceptionResult.matches) {
        return {
          isQuiet: true,
          source: "schedule",
          canBreakThrough: true,
          reason: `Exception: ${exceptionResult.matchedException!.label}`,
          endsAt: null,
        };
      }
    }

    // Check mention breakthrough
    if (
      notification?.type === "mention" &&
      state.schedule.allowMentionsBreakthrough
    ) {
      return {
        isQuiet: true,
        source: "schedule",
        canBreakThrough: true,
        reason: "Mention breaks through quiet hours",
        endsAt: null,
      };
    }

    // Check urgent breakthrough
    if (
      notification?.priority === "urgent" &&
      state.schedule.allowUrgentBreakthrough
    ) {
      return {
        isQuiet: true,
        source: "schedule",
        canBreakThrough: true,
        reason: "Urgent notification breaks through quiet hours",
        endsAt: null,
      };
    }

    return {
      isQuiet: true,
      source: "schedule",
      canBreakThrough: false,
      reason: "In quiet hours",
      endsAt: null,
    };
  }

  // 3. Not in quiet hours
  return {
    isQuiet: false,
    source: "none",
    canBreakThrough: false,
    reason: "Not in quiet hours",
    endsAt: null,
  };
}

// ============================================================================
// Transition Calculation
// ============================================================================

/**
 * Get the next quiet hours transition (start or end)
 */
export function getNextQuietHoursTransition(
  state: QuietHoursState,
  now?: Date,
): QuietHoursTransition | null {
  const currentTime = now ?? new Date();

  // If DND is active with an expiry, that's the next transition
  if (isDNDActive(state, currentTime) && state.dnd.expiresAt) {
    const expiresAt = new Date(state.dnd.expiresAt);
    return {
      type: "end",
      at: expiresAt,
      source: "dnd",
      description: `DND ends at ${formatTime(expiresAt)}`,
    };
  }

  // Check schedule transitions
  if (!state.schedule.enabled) return null;

  const { minutes, dayOfWeek } = getCurrentTimeInTimezone(
    state.schedule.timezone,
    currentTime,
  );
  const isCurrentlyQuiet = isScheduleActive(state.schedule, currentTime);

  if (isCurrentlyQuiet) {
    // Find when quiet hours end
    const endTime = findNextScheduleEnd(
      state.schedule,
      dayOfWeek,
      minutes,
      currentTime,
    );
    if (endTime) {
      return {
        type: "end",
        at: endTime,
        source: "schedule",
        description: `Quiet hours end at ${formatTime(endTime)}`,
      };
    }
  } else {
    // Find when quiet hours start next
    const startTime = findNextScheduleStart(
      state.schedule,
      dayOfWeek,
      minutes,
      currentTime,
    );
    if (startTime) {
      return {
        type: "start",
        at: startTime,
        source: "schedule",
        description: `Quiet hours start at ${formatTime(startTime)}`,
      };
    }
  }

  return null;
}

/**
 * Find the next time quiet hours end
 */
function findNextScheduleEnd(
  schedule: EnhancedQuietHoursSchedule,
  currentDay: DayOfWeek,
  currentMinutes: number,
  baseDate: Date,
): Date | null {
  const daySchedule = getDaySchedule(schedule, currentDay);
  const endMinutes = parseTimeToMinutes(daySchedule.endTime);
  const startMinutes = parseTimeToMinutes(daySchedule.startTime);

  // Overnight schedule: end is on the next day
  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes) {
      // We're after start, end is tomorrow
      const endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      return endDate;
    } else if (currentMinutes < endMinutes) {
      // We're before end (early morning)
      const endDate = new Date(baseDate);
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      return endDate;
    }
  } else {
    // Regular schedule
    if (currentMinutes < endMinutes) {
      const endDate = new Date(baseDate);
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      return endDate;
    }
  }

  return null;
}

/**
 * Find the next time quiet hours start
 */
function findNextScheduleStart(
  schedule: EnhancedQuietHoursSchedule,
  currentDay: DayOfWeek,
  currentMinutes: number,
  baseDate: Date,
): Date | null {
  // Check remaining days of the week (up to 7 days out)
  for (let i = 0; i < 7; i++) {
    const checkDay = ((currentDay + i) % 7) as DayOfWeek;
    const daySchedule = getDaySchedule(schedule, checkDay);

    if (!daySchedule.enabled) continue;

    const startMinutes = parseTimeToMinutes(daySchedule.startTime);

    if (i === 0 && startMinutes > currentMinutes) {
      // Today, and start time is still ahead
      const startDate = new Date(baseDate);
      startDate.setHours(
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        0,
        0,
      );
      return startDate;
    }

    if (i > 0) {
      // Future day
      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + i);
      startDate.setHours(
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        0,
        0,
      );
      return startDate;
    }
  }

  return null;
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Format a Date to a short time string
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format remaining time as human-readable string
 */
export function formatDNDTimeRemaining(ms: number): string {
  if (ms <= 0) return "expired";

  const minutes = Math.ceil(ms / (60 * 1000));

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hours < 24) {
    if (remainingMins === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${hours}h ${remainingMins}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  return `${days}d ${remainingHours}h`;
}

/**
 * Validate a quiet hours schedule
 */
export function validateEnhancedSchedule(
  schedule: EnhancedQuietHoursSchedule,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  // Validate weekday schedule
  if (!timeRegex.test(schedule.weekdaySchedule.startTime)) {
    errors.push("Invalid weekday start time format");
  }
  if (!timeRegex.test(schedule.weekdaySchedule.endTime)) {
    errors.push("Invalid weekday end time format");
  }

  // Validate weekend schedule
  if (!timeRegex.test(schedule.weekendSchedule.startTime)) {
    errors.push("Invalid weekend start time format");
  }
  if (!timeRegex.test(schedule.weekendSchedule.endTime)) {
    errors.push("Invalid weekend end time format");
  }

  // Validate day overrides
  for (const [day, sched] of Object.entries(schedule.dayOverrides)) {
    if (sched) {
      if (!timeRegex.test(sched.startTime)) {
        errors.push(`Invalid start time for day ${day}`);
      }
      if (!timeRegex.test(sched.endTime)) {
        errors.push(`Invalid end time for day ${day}`);
      }
    }
  }

  // Validate timezone
  try {
    Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone });
  } catch {
    errors.push(`Invalid timezone: ${schedule.timezone}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
