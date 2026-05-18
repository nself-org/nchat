/**
 * Formatting utilities for nself-chat
 * @module utils/format
 */

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  /** Use relative time (e.g., "5 minutes ago") */
  relative?: boolean;
  /** Include time in the output */
  includeTime?: boolean;
  /** Date format style */
  style?: "short" | "medium" | "long" | "full";
  /** Locale for formatting */
  locale?: string;
}

/**
 * Time units in milliseconds
 */
const TIME_UNITS = {
  year: 31536000000,
  month: 2592000000,
  week: 604800000,
  day: 86400000,
  hour: 3600000,
  minute: 60000,
  second: 1000,
} as const;

/**
 * Format a date with relative or absolute formatting
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string
 * @example
 * formatDate(new Date()) // "Today"
 * formatDate(new Date(), { relative: true }) // "just now"
 * formatDate(new Date('2024-01-15'), { style: 'long' }) // "January 15, 2024"
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {},
): string {
  const {
    relative = false,
    includeTime = false,
    style = "medium",
    locale = "en-US",
  } = options;

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return "Invalid date";
  }

  if (relative) {
    return formatRelativeTime(d, locale);
  }

  const dateStyle =
    style === "short" ? "short" : style === "long" ? "long" : "medium";

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle,
    ...(includeTime && { timeStyle: "short" }),
  };

  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}

/**
 * Format a date as relative time (e.g., "5 minutes ago")
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Relative time string
 */
function formatRelativeTime(date: Date, locale: string = "en-US"): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const absDiff = Math.abs(diff);

  // Just now (within 10 seconds)
  if (absDiff < 10000) {
    return "just now";
  }

  // Find the appropriate unit
  for (const [unit, ms] of Object.entries(TIME_UNITS)) {
    if (absDiff >= ms || unit === "second") {
      const value = Math.round(diff / ms);
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        return rtf.format(-value, unit as Intl.RelativeTimeFormatUnit);
      } catch {
        // Fallback for environments without RelativeTimeFormat
        const absValue = Math.abs(value);
        const unitName = absValue === 1 ? unit : `${unit}s`;
        return value > 0
          ? `${absValue} ${unitName} ago`
          : `in ${absValue} ${unitName}`;
      }
    }
  }

  return "just now";
}

/**
 * Format time from a date
 * @param date - Date to extract time from
 * @param options - Formatting options
 * @returns Formatted time string
 * @example
 * formatTime(new Date()) // "2:30 PM"
 * formatTime(new Date(), { hour12: false }) // "14:30"
 */
export function formatTime(
  date: Date | string | number,
  options: { hour12?: boolean; showSeconds?: boolean; locale?: string } = {},
): string {
  const { hour12 = true, showSeconds = false, locale = "en-US" } = options;

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return "Invalid time";
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(showSeconds && { second: "2-digit" }),
    hour12,
  };

  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}

/**
 * File size units
 */
const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536, 1) // "1.5 KB"
 * formatFileSize(1073741824) // "1 GB"
 */
export function formatFileSize(bytes: number, decimals: number = 0): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "Invalid size";

  const k = 1024;
  const dm = Math.max(0, decimals);
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitIndex = Math.min(i, FILE_SIZE_UNITS.length - 1);

  const size = bytes / Math.pow(k, unitIndex);
  const formatted = size.toFixed(dm);

  // Remove trailing zeros if decimals > 0
  const cleanNumber =
    decimals > 0 ? parseFloat(formatted).toString() : formatted;

  return `${cleanNumber} ${FILE_SIZE_UNITS[unitIndex]}`;
}

/**
 * Format duration in human-readable format
 * @param seconds - Duration in seconds (or milliseconds if isMs is true)
 * @param options - Formatting options
 * @returns Formatted duration string
 * @example
 * formatDuration(90) // "1:30"
 * formatDuration(3661, { verbose: true }) // "1 hour, 1 minute"
 * formatDuration(3661000, { isMs: true }) // "1:01:01"
 */
export function formatDuration(
  seconds: number,
  options: {
    isMs?: boolean;
    verbose?: boolean;
    showSeconds?: boolean;
    padHours?: boolean;
  } = {},
): string {
  const {
    isMs = false,
    verbose = false,
    showSeconds = true,
    padHours = false,
  } = options;

  let totalSeconds = isMs ? Math.floor(seconds / 1000) : Math.floor(seconds);

  if (totalSeconds < 0) {
    return "Invalid duration";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (verbose) {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    if (minutes > 0)
      parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
    if (showSeconds && secs > 0 && hours === 0) {
      parts.push(`${secs} ${secs === 1 ? "second" : "seconds"}`);
    }
    return parts.length > 0 ? parts.join(", ") : "0 seconds";
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    const hourStr = padHours ? pad(hours) : hours.toString();
    return showSeconds
      ? `${hourStr}:${pad(minutes)}:${pad(secs)}`
      : `${hourStr}:${pad(minutes)}`;
  }

  return showSeconds ? `${minutes}:${pad(secs)}` : `${minutes} min`;
}

/**
 * Format number with abbreviations (K, M, B)
 * @param num - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 * @example
 * formatNumber(1000) // "1K"
 * formatNumber(1500000, { decimals: 1 }) // "1.5M"
 * formatNumber(999) // "999"
 */
export function formatNumber(
  num: number,
  options: {
    decimals?: number;
    abbreviate?: boolean;
    locale?: string;
  } = {},
): string {
  const { decimals = 0, abbreviate = true, locale = "en-US" } = options;

  if (isNaN(num)) return "NaN";
  if (!isFinite(num)) return num > 0 ? "∞" : "-∞";

  if (!abbreviate || Math.abs(num) < 1000) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimals,
    }).format(num);
  }

  const suffixes = [
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" },
  ];

  const absNum = Math.abs(num);
  for (const { value, suffix } of suffixes) {
    if (absNum >= value) {
      const formatted = (num / value).toFixed(decimals);
      // Remove trailing zeros
      const clean = parseFloat(formatted).toString();
      return `${clean}${suffix}`;
    }
  }

  return num.toString();
}

/**
 * Format user name for display
 * @param user - User object or name components
 * @param options - Formatting options
 * @returns Formatted user name
 * @example
 * formatUserName({ firstName: 'John', lastName: 'Doe' }) // "John Doe"
 * formatUserName({ displayName: 'johndoe', email: 'john@example.com' }) // "johndoe"
 * formatUserName({ email: 'john@example.com' }) // "john"
 */
export function formatUserName(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
  },
  options: {
    fallback?: string;
    maxLength?: number;
    showInitials?: boolean;
  } = {},
): string {
  const { fallback = "Anonymous", maxLength, showInitials = false } = options;

  let name = "";

  // Priority: displayName > firstName + lastName > username > email prefix
  if (user.displayName) {
    name = user.displayName;
  } else if (user.firstName || user.lastName) {
    name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  } else if (user.username) {
    name = user.username;
  } else if (user.email) {
    name = user.email.split("@")[0];
  }

  if (!name) {
    return fallback;
  }

  if (showInitials) {
    const parts = name.split(/\s+/);
    return parts
      .map((p) => p[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("");
  }

  if (maxLength && name.length > maxLength) {
    return name.slice(0, maxLength - 1) + "…";
  }

  return name;
}

/**
 * Format a message timestamp for chat display
 * @param date - Message timestamp
 * @returns Formatted timestamp appropriate for chat context
 * @example
 * formatMessageTime(new Date()) // "2:30 PM"
 * formatMessageTime(yesterday) // "Yesterday at 2:30 PM"
 * formatMessageTime(lastWeek) // "Mon at 2:30 PM"
 */
export function formatMessageTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return "Invalid time";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 604800000);

  const time = formatTime(d);

  if (d >= today) {
    return time;
  }

  if (d >= yesterday) {
    return `Yesterday at ${time}`;
  }

  if (d >= weekAgo) {
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    }).format(d);
    return `${dayName} at ${time}`;
  }

  return formatDate(d, { includeTime: true, style: "short" });
}

/**
 * Format percentage
 * @param value - Value (0-1 or 0-100)
 * @param options - Formatting options
 * @returns Formatted percentage string
 * @example
 * formatPercentage(0.75) // "75%"
 * formatPercentage(75, { isWhole: true }) // "75%"
 */
export function formatPercentage(
  value: number,
  options: {
    isWhole?: boolean;
    decimals?: number;
    showSign?: boolean;
  } = {},
): string {
  const { isWhole = false, decimals = 0, showSign = false } = options;

  const percentage = isWhole ? value : value * 100;
  const formatted = percentage.toFixed(decimals);
  const sign = showSign && percentage > 0 ? "+" : "";

  return `${sign}${formatted}%`;
}
