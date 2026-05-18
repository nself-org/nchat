/**
 * Date Formatting Utilities
 *
 * Utilities for formatting dates and times in chat messages
 */

// ============================================================================
// Constants
// ============================================================================

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// ============================================================================
// Date Checks
// ============================================================================

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if a date is within this week
 */
export function isThisWeek(date: Date | string | number): boolean {
  const d = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  return diffTime < WEEK && diffTime >= 0;
}

/**
 * Check if a date is within this year
 */
export function isThisYear(date: Date | string | number): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear();
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(
  date1: Date | string | number,
  date2: Date | string | number,
): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

// ============================================================================
// Message Time Formatting
// ============================================================================

/**
 * Format a date for message timestamps
 * Returns time only for today, date for older messages
 *
 * Examples:
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday at 2:30 PM"
 * - This week: "Monday at 2:30 PM"
 * - This year: "Jan 15 at 2:30 PM"
 * - Older: "Jan 15, 2023 at 2:30 PM"
 */
export function formatMessageTime(date: Date | string | number): string {
  const d = new Date(date);
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday(d)) {
    return timeStr;
  }

  if (isYesterday(d)) {
    return `Yesterday at ${timeStr}`;
  }

  if (isThisWeek(d)) {
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    return `${dayName} at ${timeStr}`;
  }

  if (isThisYear(d)) {
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${dateStr} at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Format a date for message hover tooltip (full date and time)
 *
 * Example: "Saturday, January 15, 2024 at 2:30:45 PM"
 */
export function formatMessageTimeTooltip(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ============================================================================
// Relative Time Formatting
// ============================================================================

/**
 * Format a date as relative time from now
 *
 * Examples:
 * - "just now"
 * - "2 minutes ago"
 * - "1 hour ago"
 * - "3 days ago"
 * - "2 weeks ago"
 * - "Jan 15" (older than 2 weeks)
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // Future dates
  if (diffMs < 0) {
    return formatMessageTime(d);
  }

  // Less than a minute
  if (diffMs < MINUTE) {
    return "just now";
  }

  // Less than an hour
  if (diffMs < HOUR) {
    const minutes = Math.floor(diffMs / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  // Less than a day
  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  // Less than 2 weeks
  if (diffMs < 2 * WEEK) {
    const days = Math.floor(diffMs / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  // Older than 2 weeks - show date
  return formatMessageTime(d);
}

/**
 * Format a date as a short relative time (for notifications, etc.)
 *
 * Examples:
 * - "now"
 * - "2m"
 * - "1h"
 * - "3d"
 * - "2w"
 * - "Jan 15"
 */
export function formatRelativeTimeShort(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0) {
    return "now";
  }

  if (diffMs < MINUTE) {
    return "now";
  }

  if (diffMs < HOUR) {
    const minutes = Math.floor(diffMs / MINUTE);
    return `${minutes}m`;
  }

  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return `${hours}h`;
  }

  if (diffMs < WEEK) {
    const days = Math.floor(diffMs / DAY);
    return `${days}d`;
  }

  if (diffMs < 4 * WEEK) {
    const weeks = Math.floor(diffMs / WEEK);
    return `${weeks}w`;
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================================================
// Date Separator Formatting
// ============================================================================

/**
 * Format a date for message date separators in chat
 *
 * Examples:
 * - "Today"
 * - "Yesterday"
 * - "Monday, January 15"
 * - "Monday, January 15, 2023" (different year)
 */
export function formatDateSeparator(date: Date | string | number): string {
  const d = new Date(date);

  if (isToday(d)) {
    return "Today";
  }

  if (isYesterday(d)) {
    return "Yesterday";
  }

  if (isThisYear(d)) {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format a duration in milliseconds to human readable string
 *
 * Examples:
 * - "0:05" (5 seconds)
 * - "1:30" (1 minute 30 seconds)
 * - "1:05:30" (1 hour 5 minutes 30 seconds)
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ============================================================================
// Parsing Utilities
// ============================================================================

/**
 * Parse a date from various formats
 * Returns a Date object or null if invalid
 */
export function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Get the start of day for a given date
 */
export function startOfDay(date: Date | string | number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of day for a given date
 */
export function endOfDay(date: Date | string | number): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
