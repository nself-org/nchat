/**
 * Number Formatting
 *
 * Locale-aware number, currency, and percentage formatting utilities.
 */

import { SUPPORTED_LOCALES } from "./locales";

/**
 * Number format options
 */
export interface NumberFormatOptions {
  /** Locale code */
  locale?: string;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Use grouping separators (thousands) */
  useGrouping?: boolean;
  /** Notation style */
  notation?: "standard" | "scientific" | "engineering" | "compact";
  /** Compact display style */
  compactDisplay?: "short" | "long";
}

/**
 * Currency format options
 */
export interface CurrencyFormatOptions extends NumberFormatOptions {
  /** ISO 4217 currency code */
  currency?: string;
  /** Currency display style */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
}

/**
 * Percentage format options
 */
export interface PercentFormatOptions extends NumberFormatOptions {
  /** Whether to multiply by 100 (true for values like 0.5 -> 50%) */
  multiply?: boolean;
}

/**
 * Default currencies for each locale
 */
export const defaultCurrencies: Record<string, string> = {
  en: "USD",
  es: "EUR",
  fr: "EUR",
  de: "EUR",
  ar: "SAR",
  zh: "CNY",
  ja: "JPY",
  pt: "BRL",
  ru: "RUB",
};

/**
 * Get BCP 47 locale tag
 */
function getBcp47Locale(localeCode: string): string {
  const config = SUPPORTED_LOCALES[localeCode];
  return config?.bcp47 || "en-US";
}

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  options: NumberFormatOptions = {},
): string {
  const {
    locale = "en",
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping = true,
    notation = "standard",
    compactDisplay = "short",
  } = options;

  const bcp47 = getBcp47Locale(locale);

  try {
    const formatter = new Intl.NumberFormat(bcp47, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
      notation,
      compactDisplay: notation === "compact" ? compactDisplay : undefined,
    });

    return formatter.format(value);
  } catch {
    // Fallback for unsupported locales
    return value.toLocaleString("en-US", {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
    });
  }
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  options: CurrencyFormatOptions = {},
): string {
  const {
    locale = "en",
    currency,
    currencyDisplay = "symbol",
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping = true,
    notation = "standard",
    compactDisplay = "short",
  } = options;

  const bcp47 = getBcp47Locale(locale);
  const currencyCode = currency || defaultCurrencies[locale] || "USD";

  try {
    const formatter = new Intl.NumberFormat(bcp47, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
      notation,
      compactDisplay: notation === "compact" ? compactDisplay : undefined,
    });

    return formatter.format(value);
  } catch {
    // Fallback
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/**
 * Format a number as percentage
 */
export function formatPercent(
  value: number,
  options: PercentFormatOptions = {},
): string {
  const {
    locale = "en",
    multiply = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    useGrouping = true,
  } = options;

  const bcp47 = getBcp47Locale(locale);
  // If multiply is false, the value is already in percentage form (50 = 50%)
  const normalizedValue = multiply ? value : value / 100;

  try {
    const formatter = new Intl.NumberFormat(bcp47, {
      style: "percent",
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
    });

    return formatter.format(normalizedValue);
  } catch {
    // Fallback
    const percent = multiply ? value * 100 : value;
    return `${percent.toFixed(maximumFractionDigits)}%`;
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(
  bytes: number,
  options: { locale?: string; decimals?: number; binary?: boolean } = {},
): string {
  const { locale = "en", decimals = 1, binary = false } = options;

  if (bytes === 0) return "0 B";

  const k = binary ? 1024 : 1000;
  const sizes = binary
    ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
    : ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  const formattedValue = formatNumber(value, {
    locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${formattedValue} ${sizes[i]}`;
}

/**
 * Format a compact number (1K, 1M, etc.)
 */
export function formatCompact(
  value: number,
  options: { locale?: string; compactDisplay?: "short" | "long" } = {},
): string {
  const { locale = "en", compactDisplay = "short" } = options;

  return formatNumber(value, {
    locale,
    notation: "compact",
    compactDisplay,
    maximumFractionDigits: 1,
  });
}

/**
 * Format a duration in milliseconds to human readable
 */
export function formatDuration(
  ms: number,
  options: { locale?: string; verbose?: boolean } = {},
): string {
  const { verbose = false } = options;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (verbose) {
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}s`);
    return parts.join(" ");
  }

  // Short format
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format a number with sign (e.g., +10, -5)
 */
export function formatWithSign(
  value: number,
  options: NumberFormatOptions = {},
): string {
  const { locale = "en", ...rest } = options;
  const bcp47 = getBcp47Locale(locale);

  try {
    const formatter = new Intl.NumberFormat(bcp47, {
      ...rest,
      signDisplay: "exceptZero",
    });

    return formatter.format(value);
  } catch {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatNumber(value, { locale, ...rest })}`;
  }
}

/**
 * Get decimal and thousand separators for a locale
 */
export function getLocaleSeparators(locale: string = "en"): {
  decimal: string;
  thousand: string;
} {
  const bcp47 = getBcp47Locale(locale);

  try {
    const parts = new Intl.NumberFormat(bcp47).formatToParts(1234.5);
    return {
      decimal: parts.find((p) => p.type === "decimal")?.value || ".",
      thousand: parts.find((p) => p.type === "group")?.value || ",",
    };
  } catch {
    return { decimal: ".", thousand: "," };
  }
}

/**
 * Parse a localized number string back to number
 */
export function parseLocalizedNumber(
  value: string,
  locale: string = "en",
): number | null {
  const separators = getLocaleSeparators(locale);

  // Remove thousand separators and replace decimal separator
  const normalized = value
    .replace(new RegExp(`\\${separators.thousand}`, "g"), "")
    .replace(new RegExp(`\\${separators.decimal}`), ".");

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a number as ordinal (1st, 2nd, etc.)
 * Note: This is basic and English-focused; proper implementation
 * would need locale-specific ordinal rules
 */
export function formatOrdinal(
  value: number,
  options: { locale?: string } = {},
): string {
  const { locale = "en" } = options;

  // English ordinals
  if (locale === "en") {
    const mod10 = value % 10;
    const mod100 = value % 100;

    let suffix: string;
    if (mod10 === 1 && mod100 !== 11) suffix = "st";
    else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
    else if (mod10 === 3 && mod100 !== 13) suffix = "rd";
    else suffix = "th";

    return `${value}${suffix}`;
  }

  // For other locales, just return the number with a period (common convention)
  return `${value}.`;
}

/**
 * Format a range of numbers
 */
export function formatRange(
  start: number,
  end: number,
  options: NumberFormatOptions = {},
): string {
  const { locale = "en", ...rest } = options;
  const bcp47 = getBcp47Locale(locale);

  try {
    const formatter = new Intl.NumberFormat(bcp47, rest);
    if (formatter.formatRange) {
      return formatter.formatRange(start, end);
    }
  } catch {
    // Fallback
  }

  // Fallback: simple dash range
  return `${formatNumber(start, { locale, ...rest })} - ${formatNumber(end, { locale, ...rest })}`;
}
