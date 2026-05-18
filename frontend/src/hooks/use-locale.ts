"use client";

/**
 * @fileoverview Locale hook for nself-chat
 *
 * Provides a React hook for accessing and managing the current locale,
 * formatting dates/numbers, and detecting RTL.
 */

import { useCallback, useMemo } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatSmartDate,
  formatMessageTime,
  type FormatDateOptions,
} from "@/lib/i18n/date-formats";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatBytes,
  type NumberFormatOptions,
  type CurrencyFormatOptions,
  type PercentFormatOptions,
} from "@/lib/i18n/number-formats";
import { isRTL, getDirection } from "@/lib/i18n/rtl";
import {
  SUPPORTED_LOCALES,
  type LocaleCode,
  type LocaleConfig,
} from "@/lib/i18n/locales";

/**
 * Use locale hook return type
 */
export interface UseLocaleReturn {
  /** Current locale code */
  locale: LocaleCode;
  /** Current locale configuration */
  localeConfig: LocaleConfig | undefined;
  /** Whether current locale is RTL */
  isRTL: boolean;
  /** Text direction for current locale */
  direction: "ltr" | "rtl";
  /** Whether locale is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  /** Change the current locale */
  setLocale: (locale: LocaleCode) => Promise<void>;

  /** Format a date */
  formatDate: (
    date: Date | number | string,
    options?: FormatDateOptions,
  ) => string;
  /** Format time only */
  formatTime: (
    date: Date | number | string,
    options?: { withSeconds?: boolean },
  ) => string;
  /** Format relative time */
  formatRelativeTime: (
    date: Date | number | string,
    options?: { addSuffix?: boolean },
  ) => string;
  /** Format smart date (contextual) */
  formatSmartDate: (
    date: Date | number | string,
    options?: { showTime?: boolean },
  ) => string;
  /** Format message timestamp */
  formatMessageTime: (date: Date | number | string) => string;

  /** Format a number */
  formatNumber: (value: number, options?: NumberFormatOptions) => string;
  /** Format currency */
  formatCurrency: (value: number, options?: CurrencyFormatOptions) => string;
  /** Format percentage */
  formatPercent: (value: number, options?: PercentFormatOptions) => string;
  /** Format compact number */
  formatCompact: (
    value: number,
    options?: { compactDisplay?: "short" | "long" },
  ) => string;
  /** Format bytes */
  formatBytes: (
    bytes: number,
    options?: { decimals?: number; binary?: boolean },
  ) => string;
}

/**
 * Hook for accessing and managing locale
 *
 * @returns Locale utilities and formatting functions
 *
 * @example
 * ```tsx
 * const { locale, setLocale, formatDate, isRTL } = useLocale();
 *
 * return (
 *   <div dir={isRTL ? 'rtl' : 'ltr'}>
 *     <p>Current locale: {locale}</p>
 *     <p>Date: {formatDate(new Date())}</p>
 *     <button onClick={() => setLocale('es')}>Switch to Spanish</button>
 *   </div>
 * );
 * ```
 */
export function useLocale(): UseLocaleReturn {
  const currentLocale = useLocaleStore((state) => state.currentLocale);
  const isLoading = useLocaleStore((state) => state.isLoading);
  const error = useLocaleStore((state) => state.error);
  const setLocaleAction = useLocaleStore((state) => state.setLocale);

  const localeConfig = SUPPORTED_LOCALES[currentLocale];
  const rtl = isRTL(currentLocale);
  const direction = getDirection(currentLocale);

  // Memoized setLocale
  const setLocale = useCallback(
    async (locale: LocaleCode) => {
      await setLocaleAction(locale);
    },
    [setLocaleAction],
  );

  // Memoized date formatters
  const formatDateFn = useCallback(
    (date: Date | number | string, options?: FormatDateOptions) => {
      return formatDate(date, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatTimeFn = useCallback(
    (date: Date | number | string, options?: { withSeconds?: boolean }) => {
      return formatTime(date, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatRelativeTimeFn = useCallback(
    (date: Date | number | string, options?: { addSuffix?: boolean }) => {
      return formatRelativeTime(date, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatSmartDateFn = useCallback(
    (date: Date | number | string, options?: { showTime?: boolean }) => {
      return formatSmartDate(date, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatMessageTimeFn = useCallback(
    (date: Date | number | string) => {
      return formatMessageTime(date, { locale: currentLocale });
    },
    [currentLocale],
  );

  // Memoized number formatters
  const formatNumberFn = useCallback(
    (value: number, options?: NumberFormatOptions) => {
      return formatNumber(value, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatCurrencyFn = useCallback(
    (value: number, options?: CurrencyFormatOptions) => {
      return formatCurrency(value, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatPercentFn = useCallback(
    (value: number, options?: PercentFormatOptions) => {
      return formatPercent(value, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatCompactFn = useCallback(
    (value: number, options?: { compactDisplay?: "short" | "long" }) => {
      return formatCompact(value, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  const formatBytesFn = useCallback(
    (bytes: number, options?: { decimals?: number; binary?: boolean }) => {
      return formatBytes(bytes, { ...options, locale: currentLocale });
    },
    [currentLocale],
  );

  return useMemo(
    () => ({
      locale: currentLocale,
      localeConfig,
      isRTL: rtl,
      direction,
      isLoading,
      error,
      setLocale,
      formatDate: formatDateFn,
      formatTime: formatTimeFn,
      formatRelativeTime: formatRelativeTimeFn,
      formatSmartDate: formatSmartDateFn,
      formatMessageTime: formatMessageTimeFn,
      formatNumber: formatNumberFn,
      formatCurrency: formatCurrencyFn,
      formatPercent: formatPercentFn,
      formatCompact: formatCompactFn,
      formatBytes: formatBytesFn,
    }),
    [
      currentLocale,
      localeConfig,
      rtl,
      direction,
      isLoading,
      error,
      setLocale,
      formatDateFn,
      formatTimeFn,
      formatRelativeTimeFn,
      formatSmartDateFn,
      formatMessageTimeFn,
      formatNumberFn,
      formatCurrencyFn,
      formatPercentFn,
      formatCompactFn,
      formatBytesFn,
    ],
  );
}

/**
 * Hook to get only the RTL state
 *
 * @returns Whether the current locale is RTL
 */
export function useIsRTL(): boolean {
  const currentLocale = useLocaleStore((state) => state.currentLocale);
  return isRTL(currentLocale);
}

/**
 * Hook to get the text direction
 *
 * @returns Text direction ('ltr' or 'rtl')
 */
export function useDirection(): "ltr" | "rtl" {
  const currentLocale = useLocaleStore((state) => state.currentLocale);
  return getDirection(currentLocale);
}

/**
 * Hook to get locale config
 *
 * @returns Current locale configuration
 */
export function useLocaleConfig(): LocaleConfig | undefined {
  const currentLocale = useLocaleStore((state) => state.currentLocale);
  return SUPPORTED_LOCALES[currentLocale];
}

export default useLocale;
