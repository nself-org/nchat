/**
 * Format Utilities
 *
 * Locale-aware formatting utilities for dates, times, numbers, currencies,
 * and relative time. Wraps Intl APIs with consistent locale resolution and
 * fallback behavior.
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./locales";

/**
 * Resolved locale for Intl APIs.
 * Converts our short locale codes to BCP 47 tags.
 */
function resolveBcp47(locale: string): string {
  const config = SUPPORTED_LOCALES[locale];
  if (config) return config.bcp47;

  const base = locale.split("-")[0];
  const baseConfig = SUPPORTED_LOCALES[base];
  if (baseConfig) return baseConfig.bcp47;

  return SUPPORTED_LOCALES[DEFAULT_LOCALE].bcp47;
}

// ─── Date Formatting ───────────────────────────────────────────────

/**
 * Date format presets
 */
export type DateFormatPreset = "short" | "medium" | "long" | "full";

/**
 * Time format presets
 */
export type TimeFormatPreset = "short" | "medium" | "long";

/**
 * Format a date using Intl.DateTimeFormat with a named preset.
 */
export function formatLocalDate(
  date: Date | number | string,
  locale: string = DEFAULT_LOCALE,
  preset: DateFormatPreset = "medium",
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const bcp47 = resolveBcp47(locale);

  const presetMap: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
    short: { year: "2-digit", month: "numeric", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    full: { year: "numeric", month: "long", day: "numeric", weekday: "long" },
  };

  try {
    return new Intl.DateTimeFormat(bcp47, presetMap[preset]).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format a time using Intl.DateTimeFormat.
 */
export function formatLocalTime(
  date: Date | number | string,
  locale: string = DEFAULT_LOCALE,
  preset: TimeFormatPreset = "short",
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const bcp47 = resolveBcp47(locale);

  const presetMap: Record<TimeFormatPreset, Intl.DateTimeFormatOptions> = {
    short: { hour: "numeric", minute: "numeric" },
    medium: { hour: "numeric", minute: "numeric", second: "numeric" },
    long: {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    },
  };

  try {
    return new Intl.DateTimeFormat(bcp47, presetMap[preset]).format(dateObj);
  } catch {
    return dateObj.toLocaleTimeString();
  }
}

/**
 * Format a date and time together.
 */
export function formatLocalDateTime(
  date: Date | number | string,
  locale: string = DEFAULT_LOCALE,
  options: {
    datePreset?: DateFormatPreset;
    timePreset?: TimeFormatPreset;
  } = {},
): string {
  const { datePreset = "medium", timePreset = "short" } = options;
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const bcp47 = resolveBcp47(locale);

  const dateOptions: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
    short: { year: "2-digit", month: "numeric", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    full: { year: "numeric", month: "long", day: "numeric", weekday: "long" },
  };

  const timeOptions: Record<TimeFormatPreset, Intl.DateTimeFormatOptions> = {
    short: { hour: "numeric", minute: "numeric" },
    medium: { hour: "numeric", minute: "numeric", second: "numeric" },
    long: {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    },
  };

  try {
    return new Intl.DateTimeFormat(bcp47, {
      ...dateOptions[datePreset],
      ...timeOptions[timePreset],
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleString();
  }
}

// ─── Relative Time Formatting ──────────────────────────────────────

/**
 * Relative time units
 */
export type RelativeTimeUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

/**
 * Relative time thresholds in seconds
 */
const RELATIVE_TIME_THRESHOLDS: Array<{
  unit: RelativeTimeUnit;
  seconds: number;
}> = [
  { unit: "year", seconds: 365.25 * 24 * 60 * 60 },
  { unit: "month", seconds: 30.44 * 24 * 60 * 60 },
  { unit: "week", seconds: 7 * 24 * 60 * 60 },
  { unit: "day", seconds: 24 * 60 * 60 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

/**
 * Format relative time (e.g., "3 days ago", "in 2 hours").
 * Uses Intl.RelativeTimeFormat when available.
 */
export function formatRelativeTimeIntl(
  date: Date | number | string,
  locale: string = DEFAULT_LOCALE,
  options: {
    baseDate?: Date;
    style?: "long" | "short" | "narrow";
    numeric?: "always" | "auto";
  } = {},
): string {
  const { baseDate = new Date(), style = "long", numeric = "auto" } = options;
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const diffSeconds = (dateObj.getTime() - baseDate.getTime()) / 1000;
  const bcp47 = resolveBcp47(locale);

  // Find the appropriate unit
  const absDiff = Math.abs(diffSeconds);
  let unit: RelativeTimeUnit = "second";
  let value = Math.round(diffSeconds);

  for (const threshold of RELATIVE_TIME_THRESHOLDS) {
    if (absDiff >= threshold.seconds) {
      unit = threshold.unit;
      value = Math.round(diffSeconds / threshold.seconds);
      break;
    }
  }

  try {
    const formatter = new Intl.RelativeTimeFormat(bcp47, { style, numeric });
    return formatter.format(value, unit);
  } catch {
    // Fallback
    const absValue = Math.abs(value);
    const unitStr = absValue === 1 ? unit : `${unit}s`;
    if (value < 0) return `${absValue} ${unitStr} ago`;
    if (value > 0) return `in ${absValue} ${unitStr}`;
    return "now";
  }
}

/**
 * Get the most appropriate relative time unit for a diff in seconds.
 */
export function getRelativeTimeUnit(diffSeconds: number): {
  unit: RelativeTimeUnit;
  value: number;
} {
  const absDiff = Math.abs(diffSeconds);

  for (const threshold of RELATIVE_TIME_THRESHOLDS) {
    if (absDiff >= threshold.seconds) {
      return {
        unit: threshold.unit,
        value: Math.round(diffSeconds / threshold.seconds),
      };
    }
  }

  return { unit: "second", value: Math.round(diffSeconds) };
}

// ─── Number Formatting ─────────────────────────────────────────────

/**
 * Format a number with locale-specific separators.
 */
export function formatLocalNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options: Intl.NumberFormatOptions = {},
): string {
  const bcp47 = resolveBcp47(locale);

  try {
    return new Intl.NumberFormat(bcp47, options).format(value);
  } catch {
    return value.toLocaleString();
  }
}

/**
 * Format a currency amount.
 */
export function formatLocalCurrency(
  value: number,
  locale: string = DEFAULT_LOCALE,
  currency: string = "USD",
  options: Omit<Intl.NumberFormatOptions, "style" | "currency"> = {},
): string {
  const bcp47 = resolveBcp47(locale);

  try {
    return new Intl.NumberFormat(bcp47, {
      style: "currency",
      currency,
      ...options,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Format a percentage value.
 * @param value - The value to format (0.5 = 50%)
 */
export function formatLocalPercent(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options: Omit<Intl.NumberFormatOptions, "style"> = {},
): string {
  const bcp47 = resolveBcp47(locale);

  try {
    return new Intl.NumberFormat(bcp47, {
      style: "percent",
      maximumFractionDigits: 1,
      ...options,
    }).format(value);
  } catch {
    return `${(value * 100).toFixed(1)}%`;
  }
}

/**
 * Format a compact number (1K, 2.3M, etc.)
 */
export function formatLocalCompact(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options: { display?: "short" | "long" } = {},
): string {
  const { display = "short" } = options;
  const bcp47 = resolveBcp47(locale);

  try {
    return new Intl.NumberFormat(bcp47, {
      notation: "compact",
      compactDisplay: display,
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    if (Math.abs(value) >= 1_000_000)
      return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  }
}

// ─── List Formatting ───────────────────────────────────────────────

/**
 * Format a list of items with locale-appropriate conjunction/disjunction.
 * E.g., "Alice, Bob, and Charlie" (en) vs "Alice, Bob et Charlie" (fr)
 */
export function formatLocalList(
  items: string[],
  locale: string = DEFAULT_LOCALE,
  options: {
    type?: "conjunction" | "disjunction" | "unit";
    style?: "long" | "short" | "narrow";
  } = {},
): string {
  const { type = "conjunction", style = "long" } = options;
  const bcp47 = resolveBcp47(locale);

  if (items.length === 0) return "";
  if (items.length === 1) return items[0];

  try {
    return new Intl.ListFormat(bcp47, { type, style }).format(items);
  } catch {
    // Fallback
    if (items.length === 2) {
      const joiner = type === "disjunction" ? " or " : " and ";
      return `${items[0]}${joiner}${items[1]}`;
    }
    const last = items[items.length - 1];
    const rest = items.slice(0, -1).join(", ");
    const joiner = type === "disjunction" ? ", or " : ", and ";
    return `${rest}${joiner}${last}`;
  }
}

// ─── Display Names ─────────────────────────────────────────────────

/**
 * Get the display name of a language in a given locale.
 * E.g., getLanguageDisplayName('fr', 'en') => "French"
 * E.g., getLanguageDisplayName('fr', 'fr') => "francais"
 */
export function getLanguageDisplayName(
  targetLocale: string,
  displayLocale: string = DEFAULT_LOCALE,
): string {
  const bcp47 = resolveBcp47(displayLocale);
  const targetBcp47 = resolveBcp47(targetLocale);

  try {
    return (
      new Intl.DisplayNames(bcp47, { type: "language" }).of(targetBcp47) ||
      targetLocale
    );
  } catch {
    // Fallback to our locale config
    const config = SUPPORTED_LOCALES[targetLocale];
    if (config) {
      return displayLocale === targetLocale ? config.name : config.englishName;
    }
    return targetLocale;
  }
}

/**
 * Get the display name of a region/country.
 */
export function getRegionDisplayName(
  regionCode: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const bcp47 = resolveBcp47(locale);

  try {
    return (
      new Intl.DisplayNames(bcp47, { type: "region" }).of(regionCode) ||
      regionCode
    );
  } catch {
    return regionCode;
  }
}

/**
 * Get the display name of a currency.
 */
export function getCurrencyDisplayName(
  currencyCode: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const bcp47 = resolveBcp47(locale);

  try {
    return (
      new Intl.DisplayNames(bcp47, { type: "currency" }).of(currencyCode) ||
      currencyCode
    );
  } catch {
    return currencyCode;
  }
}

// ─── Locale-aware Collation ────────────────────────────────────────

/**
 * Compare two strings using locale-aware collation.
 */
export function localeCompare(
  a: string,
  b: string,
  locale: string = DEFAULT_LOCALE,
  options: Intl.CollatorOptions = {},
): number {
  const bcp47 = resolveBcp47(locale);

  try {
    return new Intl.Collator(bcp47, {
      sensitivity: "base",
      ...options,
    }).compare(a, b);
  } catch {
    return a.localeCompare(b);
  }
}

/**
 * Sort an array of strings using locale-aware collation.
 */
export function localeSort(
  items: string[],
  locale: string = DEFAULT_LOCALE,
  options: Intl.CollatorOptions = {},
): string[] {
  return [...items].sort((a, b) => localeCompare(a, b, locale, options));
}

// ─── Byte/File Size Formatting ─────────────────────────────────────

/**
 * Format byte size with locale-aware number formatting.
 */
export function formatLocalBytes(
  bytes: number,
  locale: string = DEFAULT_LOCALE,
  options: { decimals?: number; binary?: boolean } = {},
): string {
  const { decimals = 1, binary = false } = options;

  if (bytes === 0) return "0 B";

  const k = binary ? 1024 : 1000;
  const sizes = binary
    ? ["B", "KiB", "MiB", "GiB", "TiB"]
    : ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  const formatted = formatLocalNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${formatted} ${sizes[Math.min(i, sizes.length - 1)]}`;
}

// ─── Duration Formatting ───────────────────────────────────────────

/**
 * Format a duration in milliseconds to locale-aware string.
 */
export function formatLocalDuration(
  ms: number,
  locale: string = DEFAULT_LOCALE,
  options: { style?: "long" | "short" | "narrow"; maxUnits?: number } = {},
): string {
  const { style = "long", maxUnits = 2 } = options;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: { value: number; unit: Intl.RelativeTimeFormatUnit }[] = [];

  if (days > 0) parts.push({ value: days, unit: "day" });
  if (hours % 24 > 0) parts.push({ value: hours % 24, unit: "hour" });
  if (minutes % 60 > 0) parts.push({ value: minutes % 60, unit: "minute" });
  if (seconds % 60 > 0 || parts.length === 0)
    parts.push({ value: seconds % 60, unit: "second" });

  const limitedParts = parts.slice(0, maxUnits);
  const bcp47 = resolveBcp47(locale);

  try {
    const items = limitedParts.map(({ value, unit }) => {
      return new Intl.NumberFormat(bcp47, {
        style: "unit",
        unit,
        unitDisplay: style,
      }).format(value);
    });

    return items.join(style === "narrow" ? " " : ", ");
  } catch {
    // Fallback: short format
    return limitedParts
      .map(({ value, unit }) => {
        const abbr: Record<string, string> = {
          day: "d",
          hour: "h",
          minute: "m",
          second: "s",
        };
        return `${value}${abbr[unit] || unit}`;
      })
      .join(" ");
  }
}
