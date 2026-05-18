/**
 * Date/Time Formatting
 *
 * Locale-aware date and time formatting utilities using date-fns.
 */

import {
  format,
  formatRelative,
  formatDistance,
  formatDistanceToNow,
  formatDistanceStrict,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  type Locale,
} from "date-fns";
import { enUS, es, fr, de, arSA, zhCN, ja, ptBR, ru } from "date-fns/locale";

import { SUPPORTED_LOCALES, type LocaleCode } from "./locales";

/**
 * Map of locale codes to date-fns locale objects
 */
const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  ar: arSA,
  zh: zhCN,
  ja: ja,
  pt: ptBR,
  ru: ru,
};

/**
 * Get date-fns locale object for a locale code
 */
export function getDateFnsLocale(localeCode: string): Locale {
  return dateFnsLocales[localeCode] || enUS;
}

/**
 * Predefined date format patterns for each locale
 */
export interface DateFormatPatterns {
  /** Short date: 1/1/24 or 01.01.24 */
  short: string;
  /** Medium date: Jan 1, 2024 or 1 Jan 2024 */
  medium: string;
  /** Long date: January 1, 2024 or 1 January 2024 */
  long: string;
  /** Full date with weekday */
  full: string;
  /** Time only: 3:30 PM or 15:30 */
  time: string;
  /** Time with seconds */
  timeSeconds: string;
  /** Date and time combined */
  dateTime: string;
  /** Short date and time */
  dateTimeShort: string;
  /** Month and year only */
  monthYear: string;
  /** Month and day only */
  monthDay: string;
  /** Year only */
  year: string;
  /** Weekday name */
  weekday: string;
  /** Short weekday name */
  weekdayShort: string;
}

/**
 * Date format patterns for each locale
 */
export const dateFormatPatterns: Record<string, DateFormatPatterns> = {
  en: {
    short: "M/d/yy",
    medium: "MMM d, yyyy",
    long: "MMMM d, yyyy",
    full: "EEEE, MMMM d, yyyy",
    time: "h:mm a",
    timeSeconds: "h:mm:ss a",
    dateTime: "MMM d, yyyy h:mm a",
    dateTimeShort: "M/d/yy h:mm a",
    monthYear: "MMMM yyyy",
    monthDay: "MMMM d",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  es: {
    short: "d/M/yy",
    medium: "d MMM yyyy",
    long: "d 'de' MMMM 'de' yyyy",
    full: "EEEE, d 'de' MMMM 'de' yyyy",
    time: "H:mm",
    timeSeconds: "H:mm:ss",
    dateTime: "d MMM yyyy H:mm",
    dateTimeShort: "d/M/yy H:mm",
    monthYear: "MMMM 'de' yyyy",
    monthDay: "d 'de' MMMM",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  fr: {
    short: "dd/MM/yy",
    medium: "d MMM yyyy",
    long: "d MMMM yyyy",
    full: "EEEE d MMMM yyyy",
    time: "HH:mm",
    timeSeconds: "HH:mm:ss",
    dateTime: "d MMM yyyy HH:mm",
    dateTimeShort: "dd/MM/yy HH:mm",
    monthYear: "MMMM yyyy",
    monthDay: "d MMMM",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  de: {
    short: "dd.MM.yy",
    medium: "d. MMM yyyy",
    long: "d. MMMM yyyy",
    full: "EEEE, d. MMMM yyyy",
    time: "HH:mm",
    timeSeconds: "HH:mm:ss",
    dateTime: "d. MMM yyyy HH:mm",
    dateTimeShort: "dd.MM.yy HH:mm",
    monthYear: "MMMM yyyy",
    monthDay: "d. MMMM",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  ar: {
    short: "yy/M/d",
    medium: "d MMM yyyy",
    long: "d MMMM yyyy",
    full: "EEEE, d MMMM yyyy",
    time: "h:mm a",
    timeSeconds: "h:mm:ss a",
    dateTime: "d MMM yyyy h:mm a",
    dateTimeShort: "yy/M/d h:mm a",
    monthYear: "MMMM yyyy",
    monthDay: "d MMMM",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  zh: {
    short: "yy/M/d",
    medium: "yyyy年M月d日",
    long: "yyyy年M月d日",
    full: "yyyy年M月d日EEEE",
    time: "HH:mm",
    timeSeconds: "HH:mm:ss",
    dateTime: "yyyy年M月d日 HH:mm",
    dateTimeShort: "yy/M/d HH:mm",
    monthYear: "yyyy年M月",
    monthDay: "M月d日",
    year: "yyyy年",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  ja: {
    short: "yy/MM/dd",
    medium: "yyyy年M月d日",
    long: "yyyy年M月d日",
    full: "yyyy年M月d日 EEEE",
    time: "H:mm",
    timeSeconds: "H:mm:ss",
    dateTime: "yyyy年M月d日 H:mm",
    dateTimeShort: "yy/MM/dd H:mm",
    monthYear: "yyyy年M月",
    monthDay: "M月d日",
    year: "yyyy年",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  pt: {
    short: "dd/MM/yy",
    medium: "d 'de' MMM 'de' yyyy",
    long: "d 'de' MMMM 'de' yyyy",
    full: "EEEE, d 'de' MMMM 'de' yyyy",
    time: "HH:mm",
    timeSeconds: "HH:mm:ss",
    dateTime: "d 'de' MMM 'de' yyyy HH:mm",
    dateTimeShort: "dd/MM/yy HH:mm",
    monthYear: "MMMM 'de' yyyy",
    monthDay: "d 'de' MMMM",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
  ru: {
    short: "dd.MM.yy",
    medium: "d MMM yyyy",
    long: "d MMMM yyyy",
    full: "EEEE, d MMMM yyyy",
    time: "HH:mm",
    timeSeconds: "HH:mm:ss",
    dateTime: "d MMM yyyy HH:mm",
    dateTimeShort: "dd.MM.yy HH:mm",
    monthYear: "MMMM yyyy",
    monthDay: "d MMMM",
    year: "yyyy",
    weekday: "EEEE",
    weekdayShort: "EEE",
  },
};

/**
 * Get date format pattern for a locale
 */
export function getDatePattern(
  localeCode: string,
  pattern: keyof DateFormatPatterns,
): string {
  const patterns = dateFormatPatterns[localeCode] || dateFormatPatterns.en;
  return patterns[pattern];
}

/**
 * Format options for date formatting
 */
export interface FormatDateOptions {
  /** Format pattern type or custom pattern */
  pattern?: keyof DateFormatPatterns | string;
  /** Locale code */
  locale?: string;
}

/**
 * Format a date according to locale
 */
export function formatDate(
  date: Date | number | string,
  options: FormatDateOptions = {},
): string {
  const { pattern = "medium", locale = "en" } = options;

  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  const dateFnsLocale = getDateFnsLocale(locale);

  // Check if pattern is a predefined pattern name
  const formatPattern =
    pattern in (dateFormatPatterns[locale] || dateFormatPatterns.en)
      ? getDatePattern(locale, pattern as keyof DateFormatPatterns)
      : pattern;

  return format(dateObj, formatPattern, { locale: dateFnsLocale });
}

/**
 * Format time according to locale
 */
export function formatTime(
  date: Date | number | string,
  options: { locale?: string; withSeconds?: boolean } = {},
): string {
  const { locale = "en", withSeconds = false } = options;
  return formatDate(date, {
    pattern: withSeconds ? "timeSeconds" : "time",
    locale,
  });
}

/**
 * Format date relative to now (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(
  date: Date | number | string,
  options: { locale?: string; addSuffix?: boolean } = {},
): string {
  const { locale = "en", addSuffix = true } = options;
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  const dateFnsLocale = getDateFnsLocale(locale);

  return formatDistanceToNow(dateObj, {
    locale: dateFnsLocale,
    addSuffix,
  });
}

/**
 * Format distance between two dates
 */
export function formatDateDistance(
  date: Date | number | string,
  baseDate: Date | number | string,
  options: { locale?: string; addSuffix?: boolean } = {},
): string {
  const { locale = "en", addSuffix = false } = options;
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  const baseDateObj =
    typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate);
  const dateFnsLocale = getDateFnsLocale(locale);

  return formatDistance(dateObj, baseDateObj, {
    locale: dateFnsLocale,
    addSuffix,
  });
}

/**
 * Format strict distance (without "about", "over", etc.)
 */
export function formatStrictDistance(
  date: Date | number | string,
  baseDate: Date | number | string,
  options: {
    locale?: string;
    unit?: "second" | "minute" | "hour" | "day" | "month" | "year";
  } = {},
): string {
  const { locale = "en", unit } = options;
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  const baseDateObj =
    typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate);
  const dateFnsLocale = getDateFnsLocale(locale);

  return formatDistanceStrict(dateObj, baseDateObj, {
    locale: dateFnsLocale,
    unit,
  });
}

/**
 * Format date relative to a base date with context
 * e.g., "last Friday at 4:30 PM" or "yesterday at 2:00 PM"
 */
export function formatRelativeDate(
  date: Date | number | string,
  baseDate: Date | number | string,
  options: { locale?: string } = {},
): string {
  const { locale = "en" } = options;
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  const baseDateObj =
    typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate);
  const dateFnsLocale = getDateFnsLocale(locale);

  return formatRelative(dateObj, baseDateObj, { locale: dateFnsLocale });
}

/**
 * Smart date formatting - shows appropriate format based on how recent the date is
 */
export function formatSmartDate(
  date: Date | number | string,
  options: { locale?: string; showTime?: boolean } = {},
): string {
  const { locale = "en", showTime = true } = options;
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);

  if (isToday(dateObj)) {
    return showTime
      ? formatTime(dateObj, { locale })
      : formatRelativeTime(dateObj, { locale });
  }

  if (isYesterday(dateObj)) {
    const timeStr = showTime ? ` ${formatTime(dateObj, { locale })}` : "";
    // This would need translation
    return `Yesterday${timeStr}`;
  }

  if (isThisWeek(dateObj)) {
    return showTime
      ? `${formatDate(dateObj, { pattern: "weekdayShort", locale })} ${formatTime(dateObj, { locale })}`
      : formatDate(dateObj, { pattern: "weekday", locale });
  }

  if (isThisYear(dateObj)) {
    return showTime
      ? formatDate(dateObj, { pattern: "dateTimeShort", locale })
      : formatDate(dateObj, { pattern: "monthDay", locale });
  }

  return showTime
    ? formatDate(dateObj, { pattern: "dateTime", locale })
    : formatDate(dateObj, { pattern: "medium", locale });
}

/**
 * Format message timestamp for chat
 */
export function formatMessageTime(
  date: Date | number | string,
  options: { locale?: string } = {},
): string {
  const { locale = "en" } = options;
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);

  if (isToday(dateObj)) {
    return formatTime(dateObj, { locale });
  }

  if (isYesterday(dateObj)) {
    return `Yesterday ${formatTime(dateObj, { locale })}`;
  }

  if (isThisWeek(dateObj)) {
    return `${formatDate(dateObj, { pattern: "weekdayShort", locale })} ${formatTime(dateObj, { locale })}`;
  }

  return formatDate(dateObj, { pattern: "dateTimeShort", locale });
}

/**
 * Format date for input fields (ISO format)
 */
export function formatDateForInput(date: Date | number | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  return format(dateObj, "yyyy-MM-dd");
}

/**
 * Format datetime for input fields (ISO format)
 */
export function formatDateTimeForInput(date: Date | number | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : new Date(date);
  return format(dateObj, "yyyy-MM-dd'T'HH:mm");
}
